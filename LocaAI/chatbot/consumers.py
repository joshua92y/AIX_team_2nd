# LocaAI/chatbot/consumers.py

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils.timezone import now

from .models import ChatSession
from .core.rag_builder import run_rag_pipeline, run_llm_pipeline
from django.contrib.auth import get_user_model
User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        logger.info("✅ WebSocket 연결됨")
        # 연결 시 user_id, session_id 필수
        self.user_id = None
        self.session_id = None

    async def disconnect(self, close_code):
        logger.info(f"❎ WebSocket 연결 종료: {close_code}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            user_id = data.get("user_id")
            session_id = data.get("session_id")
            question = data.get("question")
            mode = data.get("mode", "llm")  # 기본값을 llm으로 설정
            
            # 프론트엔드에서 직접 전송된 언어 설정 사용, 기본값은 'ko'
            language = data.get("language", "ko")
            
            logger.info(f"📨 수신된 데이터: user_id={user_id}, session_id={session_id}, mode={mode}, language={language}")

            # 최초 연결 시 user_id, session_id 설정
            if self.user_id is None and self.session_id is None:
                if not user_id or not session_id:
                    await self.send(text_data=json.dumps({"error": "user_id와 session_id는 필수입니다."}))
                    await self.close()
                    return
                self.user_id = user_id
                self.session_id = session_id
                logger.info(f"✅ 최초 연결: user_id={user_id}, session_id={session_id}")
                # 최초 연결시 question 없어도 됨
                if not question:
                    logger.info("✅ 초기 연결 완료 - question 대기 중")
                    return

            # 이후 메시지에서는 question 필수
            if not question:
                await self.send(text_data=json.dumps({"error": "question은 필수입니다."}))
                return

            try:
                user = await sync_to_async(User.objects.get)(id=self.user_id)
            except User.DoesNotExist:
                await self.send(text_data=json.dumps({"error": "존재하지 않는 사용자입니다."}))
                return
            except Exception as e:
                await self.send(text_data=json.dumps({"error": f"사용자 확인 중 오류: {str(e)}"}))
                return

            # 세션 처리 - 기존 세션 조회 또는 새 세션 생성
            session = None
            if self.session_id:
                try:
                    session = await sync_to_async(ChatSession.objects.get)(
                        user_id=self.user_id, session_id=self.session_id
                    )
                    # 세션 마지막 접근 시간 업데이트
                    session.lastload_at = now()
                    await sync_to_async(session.save)(update_fields=['lastload_at'])
                    logger.info(f"📝 기존 세션 사용: {self.session_id}")
                except ChatSession.DoesNotExist:
                    logger.warning(f"⚠️  요청된 세션을 찾을 수 없음: {self.session_id}")

            # 세션이 없으면 새로 생성
            if not session:
                session = await sync_to_async(ChatSession.objects.create)(user_id=self.user_id)
                self.session_id = session.session_id
                logger.info(f"🆕 새 세션 생성: {self.session_id}")

            logger.info(f"💬 질문 수신 | user_id={self.user_id}, session_id={self.session_id}, mode={mode}")

            # mode에 따라 분기
            if mode == "rag":
                logger.info("🗄️ RAG 모드로 처리 시작")
                # RAG 체인 실행 및 스트리밍 전송
                async for chunk in run_rag_pipeline(self.user_id, self.session_id, question, language):
                    await self.send(text_data=json.dumps({"chunk": chunk}))
            else:  # llm
                logger.info("🧠 LLM 모드로 처리 시작")
                # LLM 체인 실행 및 스트리밍 전송
                async for chunk in run_llm_pipeline(self.user_id, self.session_id, question, language):
                    await self.send(text_data=json.dumps({"chunk": chunk}))

            # 응답 완료 전송 (세션 정보 포함)
            await self.send(text_data=json.dumps({
                "done": True,
                "session_id": self.session_id,
                "session_title": session.title
            }))
            logger.info("✅ 응답 스트리밍 완료")

        except Exception as e:
            logger.exception("❌ WebSocket 처리 중 오류 발생")
            await self.send(text_data=json.dumps({"error": str(e)}))
