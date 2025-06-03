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
        """대화 컨텍스트 저장"""
        try:
            if self.summary:
                # 요약 모드에서는 마지막 응답만 저장
                self._buffer = [
                    {"role": "assistant", "content": outputs.get("answer", "")}
                ]
            else:
                # 일반 모드에서는 전체 대화 저장
                self._buffer.append(
                    {"role": "user", "content": inputs.get("question", "")}
                )
                self._buffer.append(
                    {"role": "assistant", "content": outputs.get("answer", "")}
                )
                # k개만 유지
                if len(self._buffer) > self.k * 2:
                    self._buffer = self._buffer[-(self.k * 2) :]

            self._save_to_cache()
            logger.info("대화 컨텍스트 저장 성공")
        except Exception as e:
            logger.error(f"대화 컨텍스트 저장 실패: {str(e)}")

    def clear(self):
        """메모리 초기화"""
        try:
            self._buffer = []
            self._save_to_cache()
            logger.info("메모리 초기화 성공")
        except Exception as e:
            logger.error(f"메모리 초기화 실패: {str(e)}")
