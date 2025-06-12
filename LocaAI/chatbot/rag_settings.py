# LocaAI/chatbot/rag_settings.py
# ✅ RAG 전반 설정
RAG_SETTINGS = {
    "COLLECTIONS": ["workpeople_zones"],  # 필요시 "zone_rent" 등 추가
    "EMBEDDING_MODEL": "upskyy/bge-m3-korean",
    "LLM_MODEL": "gpt-4o-mini",  # LLM 모델명도 설정으로 관리
    "MEMORY_K": 5,
    "RETRIEVER_K": 3,  # Qdrant 검색 시 기본 k 값 (ConversationalRetrievalChain과는 별개)
    "CHAIN_RETRIEVER_K": 5,  # ConversationalRetrievalChain의 retriever에 적용할 k 값
    "CACHE_TIMEOUT": 3600,  # 캐시 타임아웃 (초)
}
