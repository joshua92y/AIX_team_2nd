# LocaAI/chatbot/utils/qdrant.py
from typing import Any, List

from qdrant_client import QdrantClient
from langchain_community.vectorstores import Qdrant
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.retrievers import BaseRetriever
from langchain_core.documents import Document
from django.conf import settings
from functools import lru_cache
from pydantic import Field

class CustomQdrantRetriever(BaseRetriever):
    client: Any = Field()
    collection_name: str = Field()
    embed_model: Any = Field()
    top_k: int = 5

    def get_relevant_documents(self, query: str, *, run_manager=None) -> List[Document]:
        vector = self.embed_model.embed_query(query)
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=self.top_k,
            with_payload=True,
            with_vectors=False,
        )

        docs = []
        for r in results:
            payload = r.payload or {}
            content = payload.get("page_content", "")
            metadata = {k: v for k, v in payload.items() if k != "page_content"}
            docs.append(Document(page_content=content, metadata=metadata))
        return docs


def get_qdrant_client() -> QdrantClient:
    """QdrantClient 인스턴스 생성"""
    return QdrantClient(
        url=settings.RAG_SETTINGS["QDRANT_URL"],
        api_key=settings.RAG_SETTINGS.get("QDRANT_API_KEY")
    )


@lru_cache
def get_embedding_model() -> HuggingFaceEmbeddings:
    """HuggingFace 기반 임베딩 모델 로딩"""
    return HuggingFaceEmbeddings(
        model_name=settings.RAG_SETTINGS["EMBEDDING_MODEL"],
        model_kwargs={
            "device": "cuda" if getattr(settings, "USE_CUDA", False) else "cpu"
        }
    )


def list_all_collections() -> List[str]:
    """Qdrant 서버에 존재하는 모든 컬렉션 이름을 반환"""
    client = get_qdrant_client()
    collections_info = client.get_collections()
    return [c.name for c in collections_info.collections]


def get_collection_retriever(collection_name: str, top_k: int = None) -> BaseRetriever:
    """Qdrant 컬렉션에서 커스텀 문서 검색기 생성 (모든 메타데이터 포함)"""
    client = get_qdrant_client()
    embedding = get_embedding_model()
    k = top_k or settings.RAG_SETTINGS.get("RETRIEVER_K", 3)

    return CustomQdrantRetriever(
        client=client,
        collection_name=collection_name,
        embed_model=embedding,
        top_k=k
    )
