# LocaAI/chatbot/views.py

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from chatbot.models import ChatSession, ChatLog, ChatMemory
from asgiref.sync import sync_to_async
from rest_framework.decorators import api_view
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.crypto import get_random_string


@login_required
def chatbot_view(request):
    user = request.user

    # 사용자에게 가장 최근 세션 또는 새 세션 할당
    session, created = ChatSession.objects.get_or_create(
        user=user,
        defaults={"session_id": get_random_string(12)}
    )

    user_info = {
        "user_id": user.id,
        "initial_session_id": session.session_id,
        "username": user.username,
    }

    return render(request, "chatbot/chat.html", {
        "user_info": user_info
    })

@api_view(['DELETE'])
async def delete_session(request, user_id, session_id):
    try:
        session = await sync_to_async(ChatSession.objects.get)(user_id=user_id, session_id=session_id)
        await sync_to_async(session.delete)()
        return Response({"status": "ok"})
    except ChatSession.DoesNotExist:
        return Response({"status": "error", "message": "세션을 찾을 수 없습니다"}, status=status.HTTP_404_NOT_FOUND)

class AsyncChatLogView(APIView):
    async def get(self, request, user_id, session_id):
        try:
            session = await sync_to_async(ChatSession.objects.select_related("log").get)(
                user__id=user_id, session_id=session_id
            )

            try:
                chatlog = session.log
                return Response({
                    "status": "ok",
                    "session_id": session.session_id,
                    "title": session.title,
                    "log": chatlog.log,
                    "created_at": session.created_at,
                })
            except ChatLog.DoesNotExist:
                return Response({
                    "status": "ok",
                    "log": [],
                    "message": "아직 대화 로그가 없습니다."
                }, status=status.HTTP_204_NO_CONTENT)

        except ChatSession.DoesNotExist:
            return Response({
                "status": "error",
                "message": "세션을 찾을 수 없습니다."
            }, status=status.HTTP_404_NOT_FOUND)
        
class AsyncSessionListView(APIView):
    async def get(self, request, user_id):
        try:
            # 비동기 DB 쿼리
            sessions = await sync_to_async(list)(
                ChatSession.objects.filter(user__id=user_id).order_by("-created_at")
            )

            # 각 세션에 대해 summary 가져오기
            result = []
            for session in sessions:
                summary = await sync_to_async(
                    lambda: ChatMemory.objects.filter(
                        session=session, memory_type="summary"
                    ).order_by("-created_at").first()
                )()

                result.append({
                    "session_id": session.session_id,
                    "title": session.title or "untitled",
                    "created_at": session.created_at.isoformat(),
                    "lastload_at": session.lastload_at.isoformat(),
                    "latest_summary": summary.content["text"] if summary else None
                })

            return Response({
                "status": "ok",
                "count": len(result),
                "sessions": result
            })

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)