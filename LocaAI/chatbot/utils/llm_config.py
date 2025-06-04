# LocaAI/chatbot/utils/llm_config.py

from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from django.conf import settings
import os


def get_llm(streaming: bool = False) -> BaseChatModel:
    """RAG_SETTINGS에 지정된 LLM 모델을 로드하여 반환"""
    model_name = settings.RAG_SETTINGS.get("LLM_MODEL", "gpt-4o-mini")
    api_key = os.getenv("OPENAI_API_KEY")

    if model_name.startswith("gpt-"):
        return ChatOpenAI(
            model=model_name,
            temperature=0.7,
            streaming=streaming,
            openai_api_key=api_key
        )
    
    # 💡 Claude, Gemini 등 다른 모델 확장 대비 구조
    raise ValueError(f"LLM model `{model_name}` is not supported yet.")
