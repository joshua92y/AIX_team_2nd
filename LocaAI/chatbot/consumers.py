# apps/chatbot/consumers.py
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .rag_pipeline import final_chain, summary_memory, build_final_chain
from .memory import DjangoConversationMemory
from .models import ConversationLog
import asyncio

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        logger.info("WebSocket connection established")

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")

    async def receive(self, text_data):
        logger.debug(f"📨 WebSocket 메시지 수신: {text_data}")
        try:
            data = json.loads(text_data)
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            question = data.get("question")

            if not user_id or not question:
                logger.warning("⚠️ 필수 필드 누락 (user_id 또는 question)")
                await self.send(
                    text_data=json.dumps({"error": "user_id and question required"})
                )
                return

            logger.debug(f"👤 사용자: {user_id}, 세션: {session_id}")
            chain_func = await build_final_chain(user_id, session_id)
            logger.debug("🔧 RAG 체인 생성 완료")

            response = await chain_func({"question": question})
            logger.debug("✅ RAG 체인 응답 수신")

            # 스트리밍 여부 판단
            if hasattr(response, "content"):
                content = response.content
                chunk_size = 50
                logger.debug("📤 응답 스트리밍 시작")

                for i in range(0, len(content), chunk_size):
                    chunk = content[i : i + chunk_size]
                    await self.send(text_data=json.dumps({"chunk": chunk}))
                    await asyncio.sleep(0.1)

                await self.send(text_data=json.dumps({"done": True}))
                logger.debug("🏁 응답 스트리밍 완료")
            else:
                await self.send(text_data=json.dumps({"answer": str(response)}))
                logger.debug("📤 단일 응답 전송 완료")

        except Exception as e:
            logger.error("❌ WebSocket 처리 중 오류 발생", exc_info=True)
            await self.send(
                text_data=json.dumps({"error": "Error processing your request"})
            )
