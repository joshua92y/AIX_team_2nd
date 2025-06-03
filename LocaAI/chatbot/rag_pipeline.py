# apps/chatbot/rag_pipeline.py
import os
import json
import hashlib
import asyncio
import logging
from typing import List, Dict, Any

from dotenv import load_dotenv
from django.conf import settings
from django.core.cache import cache
from functools import partial, lru_cache

from langchain_qdrant import Qdrant
from langchain_openai import ChatOpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain_core.runnables import RunnableParallel, RunnableLambda
from langchain_huggingface import HuggingFaceEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http import models
from langchain_core.prompts import PromptTemplate
from .memory import DjangoConversationMemory
from langchain.schema import BaseRetriever, Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from pydantic import Field

logger = logging.getLogger(__name__)

# ✅ 환경변수 로딩
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ✅ 설정
llm = ChatOpenAI(streaming=True, model="gpt-4o-mini")
embedding_model = HuggingFaceEmbeddings(
    model_name=settings.RAG_SETTINGS["EMBEDDING_MODEL"],
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

# 전역 변수로 체인과 메모리 정의
final_chain = None
summary_memory = None  # 초기화는 나중에 수행


class CustomQdrantRetriever(BaseRetriever):
    client: Any
    collection_name: str
    embed_model: Any

    def get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None
    ) -> list[Document]:
        vector = self.embed_model.embed_query(query)
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=5,
            with_payload=True,
            with_vectors=False,
        )
        docs = []
        for r in results:
            payload = r.payload
            content = payload.get("text") or payload.get("page_content", "")
            metadata = {
                k: v for k, v in payload.items() if k not in ["text", "page_content"]
            }
            docs.append(Document(page_content=content, metadata=metadata))
        return docs


# ✅ RAG 응답 DB 저장
def make_rag_saver(user_id, session_id):
    from .models import ConversationLog

    def save_rag_outputs(rag_outputs):
        zone_answers = {
            "rag_zone_1_answer": rag_outputs.get("rag_1", {}).get("answer", ""),
            # "rag_zone_2_answer": rag_outputs.get("rag_2", {}).get("answer", ""),
            # "rag_zone_3_answer": rag_outputs.get("rag_3", {}).get("answer", ""),
        }
        # 로그 저장
        ConversationLog.objects.create(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=format_all_rag_answers(rag_outputs),
            **zone_answers,
        )
        return rag_outputs

    return save_rag_outputs


# ✅ RAG 응답 포맷터
def format_all_rag_answers(results_dict: dict) -> str:
    return "\n\n".join(f"[{k}]\n{v['answer']}" for k, v in results_dict.items())


# ✅ 캐싱 유틸
async def get_cache_key(input_data: dict) -> str:
    data_str = json.dumps(input_data, sort_keys=True)
    return f"rag_cache_{hashlib.md5(data_str.encode()).hexdigest()}"


async def cached_rag_call(chain, input_data: dict, cache_timeout: int = 3600):
    logger.debug("▶️ cached_rag_call 시작")
    cache_key = await get_cache_key(input_data)
    logger.debug(f"🔑 캐시 키: {cache_key}")

    cached_result = await asyncio.to_thread(cache.get, cache_key)
    if cached_result:
        logger.debug("✅ 캐시된 결과 반환")
        return cached_result

    logger.debug("🚀 캐시 미존재 → chain.invoke 수행")
    result = await asyncio.to_thread(chain.invoke, input_data)
    await asyncio.to_thread(cache.set, cache_key, result, cache_timeout)
    logger.debug("📦 결과 캐시에 저장 완료")
    return result


# ✅ 최종 RAG 체인 생성기
async def build_final_chain(user_id=None, session_id=None):
    logger.debug("▶️ build_final_chain 시작")
    if user_id is None:
        user_id = "default_user"
    if session_id is None:
        session_id = "default_session"

    logger.debug(f"👤 user_id: {user_id}, session_id: {session_id}")

    buffer_memory = DjangoConversationMemory(
        user_id=user_id, session_id=session_id, k=settings.RAG_SETTINGS["MEMORY_K"]
    )
    summary_memory = DjangoConversationMemory(
        user_id=user_id, session_id=session_id, summary=True
    )
    logger.debug("🧠 메모리 객체 생성 완료")

    async def build_rag_chain(collection_name: str):
        logger.debug(f"🔗 build_rag_chain: {collection_name} 시작")
        try:
            client = QdrantClient(
                url=settings.RAG_SETTINGS["QDRANT_URL"],
                api_key=settings.RAG_SETTINGS["QDRANT_API_KEY"],
            )

            retriever = CustomQdrantRetriever(
                client=client,
                collection_name=collection_name,
                embed_model=embedding_model,
            )
            logger.debug(f"✅ {collection_name} custom retriever 생성 완료")

            try:
                test_docs = retriever.get_relevant_documents("총인구")
                logger.debug(f"📚 Qdrant {collection_name} 문서 검색 결과 (샘플):")
                for i, doc in enumerate(test_docs[:3]):
                    logger.debug(f"  - [{i+1}] 메타데이터: {doc.metadata}")
                    logger.debug(f"  - [{i+1}] 내용: {repr(doc.page_content)[:120]}...")
            except Exception as doc_e:
                logger.warning(f"⚠️ {collection_name}에서 문서 미리 조회 실패: {doc_e}")

            return ConversationalRetrievalChain.from_llm(
                llm=llm,
                retriever=retriever,
                memory=buffer_memory,
                return_source_documents=False,
            )

        except Exception as e:
            logger.error(f"❌ {collection_name} RAG 체인 생성 실패", exc_info=True)
            return None

    rag_chains = {}
    for i, name in enumerate(settings.RAG_SETTINGS["COLLECTIONS"]):
        chain = await build_rag_chain(name)
        if chain:
            key = f"rag_{i+1}"
            rag_chains[key] = chain
            logger.debug(f"✅ 병렬 체인 추가: {key}")
        else:
            logger.warning(f"⚠️ {name} 체인 생성 실패 → 병렬 구성에서 제외")

    parallel_rag = RunnableParallel(rag_chains)
    logger.debug("🔀 병렬 체인 구성 완료")

    def insert_summary_prompt(input_dict):
        question = input_dict["question"]
        summary = summary_memory.get_summary() or "(요약 없음)"
        logger.debug(f"📋 요약 삽입: {summary}")
        return {"question": f"[대화 요약]\n{summary}\n\n[사용자 질문]\n{question}"}

    saver = make_rag_saver(user_id, session_id)
    logger.debug("💾 저장 로직 생성 완료")

    chain = (
        RunnableLambda(insert_summary_prompt)
        .pipe(parallel_rag)
        .pipe(RunnableLambda(saver))
        .pipe(RunnableLambda(format_all_rag_answers))
        .pipe(llm)
    )

    logger.debug("✅ 최종 RAG 체인 생성 완료")
    return lambda x: cached_rag_call(chain, x)


async def initialize_chains():
    logger.debug("▶️ initialize_chains 시작")
    global final_chain, summary_memory

    try:
        embeddings = HuggingFaceEmbeddings(
            model_name=settings.RAG_SETTINGS["EMBEDDING_MODEL"],
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        logger.debug("🔧 임베딩 모델 초기화 완료")

        client = QdrantClient(
            url=settings.RAG_SETTINGS["QDRANT_URL"],
            api_key=settings.RAG_SETTINGS["QDRANT_API_KEY"],
        )
        logger.debug("🔗 Qdrant 클라이언트 초기화 완료")

        vectorstore = Qdrant(
            client=client,
            collection_name=settings.RAG_SETTINGS["COLLECTIONS"][0],
            embeddings=embeddings,
        )
        logger.debug("📦 Qdrant 벡터스토어 연결 완료")

        memory = DjangoConversationMemory(
            user_id="default_user",
            session_id="default_session",
            k=settings.RAG_SETTINGS["MEMORY_K"],
        )
        logger.debug("🧠 기본 메모리 구성 완료")

        template = """당신은 한국의 상권과 관련된 질문에 답변하는 전문가입니다.
        주어진 컨텍스트를 사용하여 질문에 답변하되, 컨텍스트에 없는 정보는 제공하지 마세요.
        답변은 한국어로 제공해주세요.

        컨텍스트: {context}

        이전 대화:
        {chat_history}

        질문: {question}

        답변:"""

        QA_CHAIN_PROMPT = PromptTemplate(
            input_variables=["context", "chat_history", "question"],
            template=template,
        )
        logger.debug("📝 프롬프트 템플릿 설정 완료")

        final_chain = ConversationalRetrievalChain.from_llm(
            llm=ChatOpenAI(
                model_name="gpt-4o-mini",
                temperature=0,
                streaming=True,
            ),
            retriever=vectorstore.as_retriever(
                search_kwargs={"k": settings.RAG_SETTINGS["RETRIEVER_K"]}
            ),
            memory=memory,
            combine_docs_chain_kwargs={"prompt": QA_CHAIN_PROMPT},
            return_source_documents=True,
            return_generated_question=True,
        )
        logger.info("✅ 체인 초기화 완료")
        return True

    except Exception as e:
        logger.error("❌ initialize_chains 실패", exc_info=True)
        return False


# 초기화는 Django 앱이 시작될 때 수행됨
