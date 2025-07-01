# LocaAI/chatbot/core/memory.py
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from chatbot.models import ChatMemory, ChatSession
from django.conf import settings
from asgiref.sync import sync_to_async
from langchain_core.chat_history import BaseChatMessageHistory

class DjangoChatHistory(BaseChatMessageHistory):
    """
    LangChain에서 사용 가능한 ChatMessageHistory 인터페이스를 흉내 낸 커스텀 클래스
    (ConversationBufferWindowMemory에 chat_memory로 주입 가능)
    """
    def __init__(self, user_id: int, session_id: str, k: int = None):
        self.user_id = user_id
        self.session_id = session_id
        self.k = k or settings.RAG_SETTINGS.get("MEMORY_K", 5)
        self._messages: list[BaseMessage] = []

    async def load(self):
        try:
            session = await sync_to_async(ChatSession.objects.get)(
                user__id=self.user_id,
                session_id=self.session_id
            )
        except ChatSession.DoesNotExist:
            self._messages = []
            return self

        memories = await sync_to_async(list)(ChatMemory.objects.filter(
            session=session,
            memory_type__in=["question", "answer"]
        ).order_by("-created_at")[: self.k * 2])

        sorted_memories = sorted(memories, key=lambda m: m.created_at)

        self._messages = []
        for m in sorted_memories:
            text = m.content.get("text", "")
            if m.role == "user":
                self._messages.append(HumanMessage(content=text))
            elif m.role == "assistant":
                self._messages.append(AIMessage(content=text))

        return self

    def add_user_message(self, content: str):
        self._messages.append(HumanMessage(content=content))

    def add_ai_message(self, content: str):
        self._messages.append(AIMessage(content=content))

    def get_messages(self) -> list[BaseMessage]:
        return self._messages
    
    @property
    def messages(self) -> list[BaseMessage]:
        """LangChain 호환성을 위한 messages 프로퍼티"""
        return self._messages
    
    def clear(self):  # ✅ 추상 메서드 구현 필수
        self._messages.clear()