# LocaAI/chatbot/rag_settings.py
import os
from dotenv import load_dotenv
from langchain_core.prompts import PromptTemplate # langchain.prompts -> langchain_core.prompts

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env")) # .env 경로 수정

# ✅ 프롬프트 매핑
COLLECTION_PROMPTS = {
    "workpeople_zones": PromptTemplate(
        input_variables=["context", "chat_history", "question"],
        template="""
당신은 직장인 인구 상권 분석 전문가입니다.
아래 문서를 기반으로, 직장인 수 및 특성에 대한 질문에 응답하세요.

[컨텍스트]
{context}

[이전 대화]
{chat_history}

[질문]
{question}

[답변]
""",
    ),
    "zone_rent": PromptTemplate(
        input_variables=["context", "chat_history", "question"],
        template="""
당신은 상권 내 상가 임대료 분석 전문가입니다.
임대료, 비용, 면적 등과 관련된 질문에 성실히 응답하세요.

[컨텍스트]
{context}

[이전 대화]
{chat_history}

[질문]
{question}

[답변]
""",
    ),
    "default": PromptTemplate(
        input_variables=["context", "chat_history", "question"],
        template="""
당신은 한국 상권 정보를 전문으로 제공하는 AI입니다.
사용자의 질문에 대해 아래 정보를 활용해 정확하고 정중하게 응답하세요.

[컨텍스트]
{context}

[이전 대화]
{chat_history}

[질문]
{question}

[답변]
""",
    ),
}

# ✅ RAG 전반 설정
RAG_SETTINGS = {
    "QDRANT_URL": os.getenv("QDRANT_URL"),
    "QDRANT_API_KEY": os.getenv("QDRANT_API_KEY"),
    "COLLECTIONS": ["workpeople_zones"], # 필요시 "zone_rent" 등 추가
    "EMBEDDING_MODEL": "upskyy/bge-m3-korean",
    "LLM_MODEL": "gpt-4o-mini", # LLM 모델명도 설정으로 관리
    "MEMORY_K": 5,
    "RETRIEVER_K": 3, # Qdrant 검색 시 기본 k 값 (ConversationalRetrievalChain과는 별개)
    "CHAIN_RETRIEVER_K": 5, # ConversationalRetrievalChain의 retriever에 적용할 k 값
    "PROMPT_TEMPLATES": COLLECTION_PROMPTS,# 프롬프트매핑 DB에서
    "CACHE_TIMEOUT": 3600, # 캐시 타임아웃 (초)
}