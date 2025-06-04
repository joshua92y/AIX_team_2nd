# LocaAI/chatbot/consumers.py

import json
import logging
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils.timezone import now

from .models import ChatSession
from .core.rag_builder import run_rag_pipeline
from django.contrib.auth import get_user_model
User = get_user_model()
logger = logging.getLogger(__name__)


def clean_uuid(raw_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(raw_id.split("_")[-1])
    except ValueError:
        raise ValueError(f"Invalid UUID format: {raw_id}")


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
                user_id = clean_uuid(raw_user_id)
                logger.debug(f"✅ 받은 user_id: {user_id}")
                user = await sync_to_async(User.objects.get)(id=user_id)
            except (ValueError, User.DoesNotExist):
                await self.send(text_data=json.dumps({"error": "유효하지 않거나 존재하지 않는 사용자입니다."}))
                return


            # 세션이 없으면 생성
            if not session_id:
                session = await sync_to_async(ChatSession.objects.create)(user_id=user_id)
                session_id = f"{now().strftime('%Y%m%d')}-{session.pk}"
                session.session_id = session_id
                await sync_to_async(session.save)()
                logger.info(f"🆕 세션 자동 생성: {session_id}")
            else:
                await sync_to_async(ChatSession.objects.get_or_create)(
                    user_id=user_id, session_id=session_id
                )

            logger.info(f"💬 질문 수신 | user_id={user_id}, session_id={session_id}")

            # RAG 체인 실행 및 스트리밍 전송
            async for chunk in run_rag_pipeline(user_id, session_id, question):
                await self.send(text_data=json.dumps({"chunk": chunk}))

            # 응답 완료 전송
            await self.send(text_data=json.dumps({
                "done": True,
                "session_id": session_id
            }))
            logger.info("✅ 응답 스트리밍 완료")

        except Exception as e:
            logger.exception("❌ WebSocket 처리 중 오류 발생")
            await self.send(text_data=json.dumps({"error": str(e)}))
