# LocaAI/chatbot/core/rag_builder.py
import logging
from langchain_core.runnables import RunnableLambda, RunnableMap
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from chatbot.core.memory import DjangoChatHistory
from langchain.memory import ConversationBufferWindowMemory
from chatbot.models import ChatSession, ChatMemory, CollectionMemory, Prompt, ChatLog
from chatbot.utils.qdrant import get_collection_retriever, list_all_collections, get_embedding_model
from chatbot.utils.llm_config import get_llm
from django.conf import settings
from django.utils.timezone import now
from asgiref.sync import sync_to_async
from dataclasses import dataclass
from langchain_core.retrievers import BaseRetriever
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


import json


logger = logging.getLogger(__name__)
async def load_all_prompts(collection_names: list[str]) -> dict[str, PromptTemplate]:
    prompt_objs = await sync_to_async(
        lambda: {p.name: p for p in Prompt.objects.filter(name__in=collection_names)}
    )()
    return {
        name: PromptTemplate.from_template(prompt_objs[name].content)
        for name in collection_names if name in prompt_objs
    }
@dataclass
class CollectionChainComponent:
    retriever: BaseRetriever
    prompt: PromptTemplate

def is_similar(summary, question, threshold=0.7):
    if not summary:
        return False
    embedding_model = get_embedding_model()
    summary_vec = [embedding_model.embed_query(summary)]
    question_vec = [embedding_model.embed_query(question)]
    sim = cosine_similarity(summary_vec, question_vec)[0][0]
    return sim >= threshold

# 1️⃣ 요약 삽입 체인
load_summary_chain = RunnableLambda(lambda inputs: {
    "question": (
        f"이전 대화 참조: {inputs['summary']} , 질문: {inputs['question']}"
        if is_similar(inputs.get("summary", ""), inputs['question'])
        else inputs['question']
    )
})
streaming_llm = get_llm(streaming=True)

# 2️⃣ Qdrant 컬렉션별 검색 + 프롬프트 적용
async def build_multi_collection_chain(
    collection_input_dict: dict[str, dict]
) -> RunnableMap:
    collection_names = list(collection_input_dict.keys())
    logger.debug(f"🔍 build_multi_collection_chain: {collection_names}")

    # ✅ 비동기 프롬프트 로딩
    prompts = await load_all_prompts(collection_names)
    # ✅ 동기 Retriever 생성
    retrievers = {name: get_collection_retriever(name) for name in collection_names}
    llm = get_llm()

    return RunnableMap({
        name: (
            RunnableLambda(lambda all_inputs, name=name: all_inputs[name]["question"])  # 1. 질문만 추출
            .pipe(retrievers[name])  # 2. Vector 검색 (→ List[Document])

            # 3. 검색된 문서와 질문 결합 (→ PromptTemplate 입력용 dict + docs 보존)
            .pipe(RunnableLambda(lambda docs, name=name: {
                "question": collection_input_dict[name]["question"],
                "context": docs,
                "retrieved_docs": docs  # ✅ DB 저장용 문서 따로 보존
            }))

            # 4. PromptTemplate 처리
            .pipe(RunnableLambda(lambda inputs: {
                "formatted_prompt": prompts[name].invoke({
                    "question": inputs["question"],
                    "context": inputs["context"]
                }),
                "retrieved_docs": inputs["retrieved_docs"]
            }))

            # 5. LLM 실행
            .pipe(RunnableLambda(lambda inputs: {
                "llm_response": llm.invoke(inputs["formatted_prompt"]),
                "retrieved_docs": inputs["retrieved_docs"]
            }))

            # 6. 최종 출력 텍스트 파싱
            .pipe(RunnableLambda(lambda result: {
                "llm_response": StrOutputParser().invoke(result["llm_response"]),
                "retrieved_docs": result["retrieved_docs"]
            }))
        )
        for name in collection_names
    })

# 3️⃣ 응답 조합 체인
combine_answers_chain = (
    RunnableLambda(lambda answers_dict: "\n\n".join(f"[{k}]\n{v}" for k, v in answers_dict.items()))
    | PromptTemplate.from_template("다음은 여러 출처의 답변입니다:\n\n{answers}\n\n최종 요약된 답변을 작성해 주세요.")
    | streaming_llm
    | StrOutputParser()
)

# 4️⃣ 요약 체인
summarize_chain = (
    RunnableLambda(lambda inputs: f"질문: {inputs['question']}\n답변: {inputs['answer']}\n출처 요약: {inputs['collection_summary']}")
    | PromptTemplate.from_template("다음 대화 내용을 요약해 주세요:\n{input}")
    | get_llm()
    | StrOutputParser()
)

# 5️⃣ DB 저장 체인
async def save_to_db_chain(user_id, session_id, question, answer, summary, collection_results):
    logger.debug("💾 save_to_db_chain 시작")

    # ✅ 세션 로드
    session = await sync_to_async(ChatSession.objects.get)(user__id=user_id, session_id=session_id)

    # ✅ 대화 히스토리 저장
    await sync_to_async(ChatMemory.objects.create)(session=session, memory_type='question', role='user', content={"text": question})
    await sync_to_async(ChatMemory.objects.create)(session=session, memory_type='answer', role='assistant', content={"text": answer})
    await sync_to_async(ChatMemory.objects.create)(session=session, memory_type='summary', role='assistant', content={"text": summary})
    logger.debug("✅ ChatMemory 저장 완료")

    # ✅ 컬렉션별 문서 및 응답 저장
    for cname, result in collection_results.items():
        llm_response = result.get("llm_response")
        retrieved_docs = result.get("retrieved_docs", [])

        content_list = [doc.page_content for doc in retrieved_docs]
        meta_list = [doc.metadata for doc in retrieved_docs]

        prompt_obj = await sync_to_async(Prompt.objects.filter(name=cname).first)()

        await sync_to_async(CollectionMemory.objects.create)(
            session=session,
            collection_name=cname,
            retrieved_documents_content=content_list,
            retrieved_documents_meta=meta_list,
            llm_response=llm_response,
            prompt=prompt_obj
        )
        logger.debug(f"✅ CollectionMemory 저장 완료: {cname}")

    # ✅ 대화 로그 저장 (get_or_create 이후 log 초기화 확인)
    chatlog, _ = await sync_to_async(ChatLog.objects.get_or_create)(session=session)
    if not chatlog.log:
        chatlog.log = []
    chatlog.log += [
        {"role": "user", "content": question},
        {"role": "assistant", "content": answer}
    ]
    await sync_to_async(chatlog.save)()
    logger.debug("✅ ChatLog 저장 완료")

# ✅ 전체 파이프라인
async def run_rag_pipeline(user_id: int, session_id: str, question: str):
    logger.debug(f"🚀 run_rag_pipeline 시작 | user_id={user_id}, session_id={session_id}, question={question[:30]}...")
    
    history = await DjangoChatHistory(user_id, session_id).load()
    memory = ConversationBufferWindowMemory(chat_memory=history, return_messages=True)

    recent_summary = await sync_to_async(lambda: ChatMemory.objects.filter(
        session__session_id=session_id, memory_type='summary'
    ).order_by('-created_at').first())()
    summary_text = recent_summary.content["text"] if recent_summary else ""
    logger.debug(f"📌 불러온 요약: {summary_text[:100]}...")

    # 1️⃣ 요약 삽입
    question_with_summary = load_summary_chain.invoke({
        "summary": summary_text,
        "question": question
    })
    logger.debug(f"🔍 요약이 포함된 질문: {question_with_summary['question'][:100]}...")

    # 2️⃣ 컬렉션별 응답
    allowed = set(settings.RAG_SETTINGS["COLLECTIONS"])
    collection_names = [name for name in list_all_collections() if name in allowed]
    logger.debug(f"📚 대상 컬렉션: {collection_names}")

    # ✅ PromptTemplate는 dict input 필요
    collection_input_dict = {
        name: {
            "context": "",  # 추후 확장 가능
            "chat_history": "",  # 필요 시 history.get_messages()
            "question": question_with_summary["question"]
        } for name in collection_names
    }
    logger.debug(f"🧪 multi_chain 입력값: {json.dumps(collection_input_dict, indent=2, ensure_ascii=False)}")
    multi_chain = await build_multi_collection_chain(collection_input_dict)
    collection_answers = await multi_chain.ainvoke(collection_input_dict)
    logger.debug(f"📥 컬렉션별 응답 완료")

    # 3️⃣ 응답 조합
    final_answer_chunks = []
    async for chunk in combine_answers_chain.astream(collection_answers):
        final_answer_chunks.append(chunk)
        yield chunk

    final_answer = "".join(final_answer_chunks)
    logger.debug(f"✅ 최종 응답 생성 완료: {final_answer[:200]}...")
    history.add_ai_message(final_answer)

    # 4️⃣ 요약: collection_summary는 llm_response만 추출
    collection_summary = "\n".join(
        result["llm_response"] for result in collection_answers.values()
    )

    summary = await summarize_chain.ainvoke({
        "question": question,
        "answer": final_answer,
        "collection_summary": collection_summary
    })
    logger.debug(f"📝 요약 생성 완료: {summary[:200]}...")

    # 5️⃣ DB 저장
    await save_to_db_chain(
        user_id=user_id,
        session_id=session_id,
        question=question,
        answer=final_answer,
        summary=summary,
        collection_results=collection_answers  # dict[str, dict] 구조 유지
    )

    logger.debug("🎯 run_rag_pipeline 완료")
