# apps/chatbot/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import ConversationLog, ConversationSummary
from django.shortcuts import render
from langchain_core.messages import HumanMessage
from datetime import datetime
import uuid
import logging
import asyncio
import json
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

logger = logging.getLogger(__name__)

# final_chain은 이미 langchain 구성 완료된 체인이라고 가정
from .rag_pipeline import build_final_chain
from .memory import DjangoConversationMemory


def chat_view(request):
    return render(request, "chatbot/chat.html")


class ChatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    async def post(self, request):
        try:
            user_id = request.data.get("user_id") or str(request.user.id)
            session_id = request.data.get("session_id") or str(uuid.uuid4())
            question = request.data.get("question")

            if not question:
                return Response({"error": "질문이 필요합니다."}, status=400)

            logger.info(f"[Chat] User: {user_id}, Session: {session_id}, Q: {question}")
            input_data = {"question": question}

            # ✅ 세션별 RAG 체인 빌드
            chain_func = await build_final_chain(user_id, session_id)
            response = await chain_func(input_data)
            answer = response.content if hasattr(response, "content") else str(response)

            # ✅ user 질문 로그만 저장
            ConversationLog.objects.create(
                user_id=user_id,
                session_id=session_id,
                role="user",
                content=question,
            )

            # ✅ 요약 저장 (응답은 rag_pipeline에서 이미 저장됨)
            summary_memory = DjangoConversationMemory(user_id, session_id, summary=True)
            summary_memory.save_context({"input": question}, {"output": answer})

            return Response({"session_id": session_id, "answer": answer})

        except Exception as e:
            logger.exception("❌ ChatAPIView error")
            return Response(
                {"error": "RAG 처리 중 오류가 발생했습니다."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConversationSummaryAPIView(APIView):
    def get(self, request, session_id):
        try:
            summary = ConversationSummary.objects.get(session_id=session_id)
            return Response({"session_id": session_id, "summary": summary.summary})
        except ConversationSummary.DoesNotExist:
            return Response({"error": "Summary not found"}, status=404)

    def put(self, request, session_id):
        summary_text = request.data.get("summary", "")
        user_id = request.data.get("user_id", "unknown")

        summary_obj, created = ConversationSummary.objects.update_or_create(
            session_id=session_id,
            defaults={"summary": summary_text, "user_id": user_id},
        )

        return Response(
            {
                "session_id": summary_obj.session_id,
                "updated": not created,
                "summary": summary_obj.summary,
            }
        )


@csrf_exempt
def rag_api_view(request):
    logger.debug("🌐 [POST] /rag-api 요청 수신")
    if request.method != "POST":
        logger.warning("⚠️ 허용되지 않은 HTTP 메서드")
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        data = json.loads(request.body)
        question = data.get("question")
        user_id = data.get("user_id", "default_user")
        session_id = data.get("session_id", "default_session")

        logger.debug(f"📩 요청 데이터: user_id={user_id}, question={question}")

        if not question:
            logger.warning("⚠️ 질문 필드 누락")
            return JsonResponse({"error": "Question is required"}, status=400)

        # 비동기 함수 동기 호출: asyncio.run() 또는 background task로 대체 가능
        from .rag_pipeline import build_final_chain
        import asyncio

        chain_func = asyncio.run(build_final_chain(user_id, session_id))
        result = asyncio.run(chain_func({"question": question}))

        logger.debug(f"✅ RAG 응답 완료: {result[:80]}...")  # 일부만 출력
        return JsonResponse({"answer": result})

    except json.JSONDecodeError:
        logger.error("❌ JSON 디코딩 실패", exc_info=True)
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        logger.error("❌ 내부 서버 오류 발생", exc_info=True)
        return JsonResponse({"error": "Internal server error"}, status=500)
