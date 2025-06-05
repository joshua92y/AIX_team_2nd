# LocaAI/chatbot/consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils.timezone import now

from .models import ChatSession
from .core.rag_builder import run_rag_pipeline
from django.contrib.auth import get_user_model
User = get_user_model()
logger = logging.getLogger(__name__)


def safe_get_user_id(raw_id: str) -> str:
    """안전하게 사용자 ID 추출"""
    try:
        # UUID 형태의 문자열을 그대로 반환
        if len(raw_id) > 32:  # UUID 길이보다 긴 경우 마지막 부분만 추출
            return raw_id.split("_")[-1]
        return raw_id
    except Exception:
        return raw_id


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        logger.info("✅ WebSocket 연결됨")

    async def disconnect(self, close_code):
        logger.info(f"❎ WebSocket 연결 종료: {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            raw_user_id = data.get("user_id")
            session_id = data.get("session_id")
            question = data.get("question")

            if not raw_user_id or not question:
                await self.send(text_data=json.dumps({"error": "user_id와 question은 필수입니다."}))
                return

            try:
                user_id = safe_get_user_id(raw_user_id)
                logger.debug(f"✅ 받은 user_id: {user_id}")
                user = await sync_to_async(User.objects.get)(id=user_id)
            except User.DoesNotExist:
                await self.send(text_data=json.dumps({"error": "존재하지 않는 사용자입니다."}))
                return
            except Exception as e:
                await self.send(text_data=json.dumps({"error": f"사용자 확인 중 오류: {str(e)}"}))
                return

            # 세션 처리 - 기존 세션 조회 또는 새 세션 생성
            session = None
            if session_id:
                try:
                    session = await sync_to_async(ChatSession.objects.get)(
                        user_id=user_id, session_id=session_id
                    )
                    # 세션 마지막 접근 시간 업데이트
                    session.lastload_at = now()
                    await sync_to_async(session.save)(update_fields=['lastload_at'])
                    logger.info(f"📝 기존 세션 사용: {session_id}")
                except ChatSession.DoesNotExist:
                    logger.warning(f"⚠️  요청된 세션을 찾을 수 없음: {session_id}")
            
            # 세션이 없으면 새로 생성
            if not session:
                session = await sync_to_async(ChatSession.objects.create)(user_id=user_id)
                session_id = session.session_id
                logger.info(f"🆕 새 세션 생성: {session_id}")

            logger.info(f"💬 질문 수신 | user_id={user_id}, session_id={session_id}")

            # RAG 체인 실행 및 스트리밍 전송
            async for chunk in run_rag_pipeline(user_id, session_id, question):
                await self.send(text_data=json.dumps({"chunk": chunk}))

            # 응답 완료 전송 (세션 정보 포함)
            await self.send(text_data=json.dumps({
                "done": True,
                "session_id": session_id,
                "session_title": session.title
            }))
            logger.info("✅ 응답 스트리밍 완료")

        except Exception as e:
            logger.exception("❌ WebSocket 처리 중 오류 발생")
            await self.send(text_data=json.dumps({"error": str(e)}))
