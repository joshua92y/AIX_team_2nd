# apps/chatbot/memory.py
from langchain.memory.chat_memory import BaseChatMemory
from chatbot.models import ConversationLog, ConversationSummary
from langchain_core.messages import HumanMessage, AIMessage
from typing import List, Optional, Dict, Any
from langchain.memory import ConversationBufferMemory
from langchain.schema import BaseMessage
from pydantic import BaseModel, Field
from django.core.cache import cache
import json
import logging
from langchain_openai import ChatOpenAI
from langchain_huggingface import HuggingFaceEmbeddings
from config.settings import RAG_SETTINGS
from chatbot.models import ConversationSession

logger = logging.getLogger(__name__)


class DjangoConversationMemory(BaseChatMemory):
    """Django 기반 대화 메모리"""

    user_id: str = Field(..., description="사용자 ID")
    session_id: str = Field(..., description="세션 ID")
    k: int = Field(default=5, description="저장할 대화 수")
    summary: bool = Field(default=False, description="요약 모드 여부")
    memory_key: str = Field(default="chat_history", description="메모리 키")
    return_messages: bool = Field(default=True, description="메시지 반환 여부")
    output_key: Optional[str] = Field(default=None, description="출력 키")
    input_key: Optional[str] = Field(default=None, description="입력 키")

    def __init__(self, **data):
        super().__init__(**data)
        self._buffer = []
        self._load_from_cache()

    @property
    def memory_variables(self) -> List[str]:
        """LangChain이 사용할 메모리 키"""
        return [self.memory_key]

    def _get_cache_key(self) -> str:
        """캐시 키 생성"""
        prefix = "summary" if self.summary else "chat"
        return f"{prefix}_memory_{self.user_id}_{self.session_id}"

    async def async_load_from_db(self):
        try:
            session = await sync_to_async(ConversationSession.objects.get)(
                user_id=self.user_id, session_id=self.session_id
            )
            messages = await sync_to_async(list)(session.messages.order_by("timestamp"))
            self._buffer = [
                {"role": msg.role, "content": msg.content} for msg in messages
            ]
        except ConversationSession.DoesNotExist:
            self._buffer = []

    def _load_from_cache(self):
        """캐시에서 메모리 로드"""
        try:
            cached_data = cache.get(self._get_cache_key())
            if cached_data:
                self._buffer = json.loads(cached_data)
                logger.info(f"메모리 로드 성공: {len(self._buffer)}개 메시지")
        except Exception as e:
            logger.error(f"메모리 로드 실패: {str(e)}")
            self._buffer = []

    def _save_to_cache(self):
        """메모리를 캐시에 저장"""
        try:
            cache.set(
                self._get_cache_key(), json.dumps(self._buffer), timeout=3600  # 1시간
            )
            logger.info(f"메모리 저장 성공: {len(self._buffer)}개 메시지")
        except Exception as e:
            logger.error(f"메모리 저장 실패: {str(e)}")

    def get_summary(self) -> str:
        """대화 요약 반환"""
        if not self.summary:
            return ""
        try:
            return "\n".join(msg.get("content", "") for msg in self._buffer)
        except Exception as e:
            logger.error(f"요약 생성 실패: {str(e)}")
            return ""

    def load_memory_variables(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """메모리 변수 로드"""
        if self.summary:
            return {self.memory_key: self.get_summary()}
        return {self.memory_key: self.get_chat_history()}

    def get_chat_history(self) -> List[Any]:
        """대화 기록 반환"""
        try:
            messages = []
            for msg in self._buffer[-self.k :]:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    messages.append(AIMessage(content=msg["content"]))
            return messages
        except Exception as e:
            logger.error(f"대화 기록 조회 실패: {str(e)}")
            return []

    def save_context(self, inputs: Dict[str, Any], outputs: Dict[str, str]):
        """대화 컨텍스트를 캐시 + DB에 저장"""
        try:
            # ✅ 세션 가져오기 또는 생성
            session, _ = ConversationSession.objects.get_or_create(
                user_id=self.user_id,
                session_id=self.session_id,
            )

            if self.summary:
                # ✅ 요약 모드: 대화 요약 생성
                chat_history = self.get_chat_history()
                history_text = "\n".join(
                    [
                        (
                            f"사용자: {m.content}"
                            if isinstance(m, HumanMessage)
                            else f"AI: {m.content}"
                        )
                        for m in chat_history
                    ]
                )
                llm = ChatOpenAI(streaming=False, model="gpt-4o-mini")
                summary = llm.invoke(f"다음 대화를 요약해줘:\n\n{history_text}")

                summary_text = summary.content
                self._buffer = [{"role": "assistant", "content": summary_text}]

                # ✅ DB에 저장
                from chatbot.models import ConversationMessage

                ConversationMessage.objects.create(
                    session=session,
                    role="assistant",
                    content=summary_text,
                )
            else:
                # ✅ 일반 모드: 사용자 질문과 AI 응답을 버퍼에 저장
                user_msg = inputs.get("question", "")
                ai_msg = outputs.get("answer", "")

                self._buffer.append({"role": "user", "content": user_msg})
                self._buffer.append({"role": "assistant", "content": ai_msg})

                # ✅ 버퍼 길이 제한
                if len(self._buffer) > self.k * 5:
                    self._buffer = self._buffer[-(self.k * 5) :]

                # ✅ DB에 저장
                from chatbot.models import ConversationMessage

                ConversationMessage.objects.create(
                    session=session, role="user", content=user_msg
                )
                ConversationMessage.objects.create(
                    session=session, role="assistant", content=ai_msg
                )

            # ✅ 캐시에도 저장
            self._save_to_cache()
            logger.info("대화 컨텍스트 저장 성공")

        except Exception as e:
            logger.error(f"대화 컨텍스트 저장 실패: {str(e)}", exc_info=True)

    def clear(self):
        """메모리 초기화"""
        try:
            self._buffer = []
            self._save_to_cache()
            logger.info("메모리 초기화 성공")
        except Exception as e:
            logger.error(f"메모리 초기화 실패: {str(e)}")
