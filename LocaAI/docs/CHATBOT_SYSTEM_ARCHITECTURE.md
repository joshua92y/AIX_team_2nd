# LocaAI 챗봇 시스템 아키텍처

## 📋 시스템 개요

LocaAI 챗봇 시스템은 **상권 분석 및 창업 상담 전문 AI**로, 두 가지 모드로 동작합니다:

- **🧠 LLM 모드**: 순수 언어모델 기반 상담
- **🗄️ RAG 모드**: 벡터 데이터베이스 기반 정보 검색 + 생성

## 🏗️ 전체 아키텍처

```mermaid
graph TB
    subgraph "Frontend"
        UI[웹 인터페이스]
        Toggle[LLM/RAG 토글]
        Chat[채팅 UI]
    end

    subgraph "Backend"
        WS[WebSocket Consumer]
        Router{모드 분기}
        
        subgraph "LLM Pipeline"
            LLM_Load[프롬프트 로드]
            LLM_History[히스토리 처리]
            LLM_Chain[LLM 체인 실행]
            LLM_Stream[실시간 스트리밍]
        end
        
        subgraph "RAG Pipeline"
            RAG_Load[프롬프트 로드]
            RAG_Search[벡터 검색]
            RAG_Multi[다중 컬렉션 처리]
            RAG_Combine[응답 조합]
            RAG_Stream[실시간 스트리밍]
        end
        
        subgraph "Storage"
            DB[(PostgreSQL)]
            Vector[(Qdrant)]
        end
    end

    UI --> WS
    Toggle --> WS
    WS --> Router
    
    Router -->|mode="llm"| LLM_Load
    Router -->|mode="rag"| RAG_Load
    
    LLM_Load --> LLM_History --> LLM_Chain --> LLM_Stream
    RAG_Load --> RAG_Search --> RAG_Multi --> RAG_Combine --> RAG_Stream
    
    LLM_Stream --> Chat
    RAG_Stream --> Chat
    
    LLM_Chain -.-> DB
    RAG_Search -.-> Vector
    RAG_Multi -.-> DB
```

## 🔀 모드 분기 시스템

### 1. 프론트엔드 모드 선택

**위치**: `static/js/chat_main.js`, `static/js/ai_analyzer/analyze-chatbot.js`

```javascript
function getCurrentMode() {
  const llmMode = document.getElementById("llmMode");
  const ragMode = document.getElementById("ragMode");
  return llmMode && llmMode.checked ? "llm" : 
         (ragMode && ragMode.checked ? "rag" : "llm");
}

// WebSocket 메시지 전송 시 모드 포함
const payload = { 
  user_id: userId, 
  session_id: currentSessionId, 
  question: msg,
  mode: selectedMode,  // 🔑 핵심: 모드 파라미터
  language: "ko"
};
```

### 2. 백엔드 모드 처리

**위치**: `chatbot/consumers.py`

```python
async def receive(self, text_data):
    data = json.loads(text_data)
    mode = data.get("mode", "llm")  # 기본값: LLM
    language = data.get("language", "ko")  # 기본값: 한국어
    
    # 🚦 모드에 따른 분기
    if mode == "rag":
        logger.info("🗄️ RAG 모드로 처리 시작")
        async for chunk in run_rag_pipeline(
            self.user_id, self.session_id, question, language
        ):
            await self.send(text_data=json.dumps({"chunk": chunk}))
    else:  # llm
        logger.info("🧠 LLM 모드로 처리 시작")
        async for chunk in run_llm_pipeline(
            self.user_id, self.session_id, question, language
        ):
            await self.send(text_data=json.dumps({"chunk": chunk}))
```

## 🧠 LLM 모드 파이프라인

### 처리 흐름

**위치**: `chatbot/core/rag_builder.py:run_llm_pipeline()`

1. **언어별 프롬프트 로드**: DB에서 `llm_consultation_ko/en/es` 조회
2. **대화 히스토리 로드**: 기존 대화 및 요약 불러오기
3. **요약+질문 결합**: 유사도 기반으로 이전 요약 포함 여부 결정
4. **LLM 체인 실행**: GPT-4o-mini로 실시간 스트리밍 응답
5. **결과 저장**: 대화, 응답, 요약을 DB에 저장

### 언어별 프롬프트 분기

```python
# 언어에 따른 프롬프트 선택
if language == "ko":
    prompt_name = "llm_consultation"
elif language == "en":
    prompt_name = "llm_consultation_en"  
elif language == "es":
    prompt_name = "llm_consultation_es"
else:
    prompt_name = "llm_consultation"  # 기본값

# DB에서 프롬프트 로드
prompt_obj = await sync_to_async(Prompt.objects.get)(name=prompt_name)
llm_prompt = PromptTemplate.from_template(prompt_obj.content)
```

## 🗄️ RAG 모드 파이프라인

### 처리 흐름

**위치**: `chatbot/core/rag_builder.py:run_rag_pipeline()`

1. **요약+질문 결합**: 이전 대화 요약과 현재 질문 결합
2. **다중 컬렉션 검색**: 허용된 컬렉션들에서 병렬 벡터 검색
3. **컬렉션별 응답 생성**: 각 컬렉션마다 독립적인 LLM 응답
4. **응답 조합**: 언어별 조합 프롬프트로 최종 답변 생성
5. **실시간 스트리밍**: 조합된 응답을 청크 단위로 전송
6. **결과 저장**: 검색 문서, 응답, 요약 등 모든 데이터 저장

### 다중 컬렉션 처리

**설정**: `chatbot/rag_settings.py`

```python
RAG_SETTINGS = {
    "COLLECTIONS": [
        "workpeople_zones",                    # 직장인구 데이터
        "analysis_result_consultation",       # 상권분석 상담 (한국어)
        "analysis_result_consultation_en",    # 상권분석 상담 (영어)  
        "analysis_result_consultation_es"     # 상권분석 상담 (스페인어)
    ],
    "EMBEDDING_MODEL": "upskyy/bge-m3-korean",
    "LLM_MODEL": "gpt-4o-mini",
    "RETRIEVER_K": 3  # 컬렉션별 검색 문서 수
}
```

## 🌍 다국어 처리 시스템

### 1. 언어 감지 및 전송

**프론트엔드**:
```javascript
// AI_Analyzer에서 언어 감지
function getCurrentLanguage() {
    const korBtn = document.querySelector('.lang-btn[data-lang="KOR"]');
    const engBtn = document.querySelector('.lang-btn[data-lang="ENG"]'); 
    const espBtn = document.querySelector('.lang-btn[data-lang="ESP"]');
    
    if (korBtn && korBtn.classList.contains('active')) return 'ko';
    if (engBtn && engBtn.classList.contains('active')) return 'en';  
    if (espBtn && espBtn.classList.contains('active')) return 'es';
    return 'ko'; // 기본값
}

// 컬렉션 이름 매핑
function getCollectionNameByLanguage(language) {
    const mapping = {
        'ko': 'analysis_result_consultation',
        'en': 'analysis_result_consultation_en', 
        'es': 'analysis_result_consultation_es'
    };
    return mapping[language] || mapping['ko'];
}
```

### 2. 백엔드 언어 처리

**RAG 모드 - 응답 조합 프롬프트**:
```python
async def build_combine_answers_chain(language: str = "ko"):
    prompt_name = {
        "ko": "rag_combine_answers_ko",
        "en": "rag_combine_answers_en", 
        "es": "rag_combine_answers_es"
    }.get(language, "rag_combine_answers_ko")
    
    # DB에서 언어별 프롬프트 로드
    prompt_obj = await sync_to_async(Prompt.objects.get)(name=prompt_name)
    prompt = PromptTemplate.from_template(prompt_obj.content)
```

## 🔧 핵심 컴포넌트

### 1. 벡터 데이터베이스 연결

**위치**: `chatbot/utils/qdrant.py`

```python
@lru_cache
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)

@lru_cache
def get_embedding_model() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(
        model_name="upskyy/bge-m3-korean",  # 다국어 지원 임베딩
        model_kwargs={"device": "cuda" if settings.USE_CUDA else "cpu"}
    )
```

### 2. LLM 설정

**위치**: `chatbot/utils/llm_config.py`

```python
def get_llm(streaming: bool = False) -> BaseChatModel:
    model_name = settings.RAG_SETTINGS.get("LLM_MODEL", "gpt-4o-mini")
    
    if model_name.startswith("gpt-"):
        return ChatOpenAI(
            model=model_name,
            temperature=0.7,
            streaming=streaming,  # 실시간 스트리밍 지원
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )
```

## 📊 데이터베이스 구조

### 프롬프트 템플릿 구조

**테이블**: `chatbot_prompt`

| name | scope | content | tag | 용도 |
|------|-------|---------|-----|-----|
| llm_consultation | collection | 한국어 상담 프롬프트 | ko | LLM 모드 |
| llm_consultation_en | collection | 영어 상담 프롬프트 | en | LLM 모드 |
| llm_consultation_es | collection | 스페인어 상담 프롬프트 | es | LLM 모드 |
| rag_combine_answers_ko | collection | 한국어 RAG 조합 프롬프트 | ko | RAG 모드 |
| workpeople_zones | collection | 직장인구 검색 프롬프트 | - | RAG 모드 |

### 대화 저장 구조

```python
# ChatMemory: 대화 히스토리
memory_type: 'question' | 'answer' | 'summary'
role: 'user' | 'assistant'
content: {"text": "실제 대화 내용"}

# CollectionMemory: RAG 검색 결과
collection_name: "workpeople_zones"
retrieved_documents_content: ["문서1", "문서2", "문서3"]
retrieved_documents_meta: [{"source": "..."}, ...]
llm_response: "컬렉션별 응답"
```

## 🚀 실시간 스트리밍

### WebSocket 데이터 흐름

```python
# RAG 파이프라인 스트리밍
async for chunk in combine_answers_chain.astream(collection_answers):
    await self.send(text_data=json.dumps({"chunk": chunk}))

# LLM 파이프라인 스트리밍  
async for chunk in llm_chain.astream({
    "question": question_with_summary,
    "chat_history": history_str
}):
    await self.send(text_data=json.dumps({"chunk": chunk}))

# 완료 신호
await self.send(text_data=json.dumps({
    "done": True,
    "session_id": self.session_id
}))
```

## ⚙️ 설정 및 환경

### 환경변수

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# Qdrant 벡터 DB
QDRANT_URL=https://your-qdrant-url
QDRANT_API_KEY=your-api-key

# Django 기본
SECRET_KEY=your-secret-key
DEBUG=True
```

---

## 📝 요약

LocaAI 챗봇 시스템은 **모드 기반 분기**, **다국어 지원**, **실시간 스트리밍**을 핵심으로 하는 현대적인 RAG 아키텍처입니다.

**주요 특징**:
- 🔀 **동적 모드 전환**: LLM ↔ RAG 실시간 토글
- 🌍 **다국어 지원**: 한국어/영어/스페인어 프롬프트
- 📚 **다중 컬렉션**: 병렬 검색 및 응답 조합
- ⚡ **실시간 스트리밍**: 청크 단위 응답 전송
- 🧠 **컨텍스트 관리**: 대화 히스토리 및 요약 활용
- 🔧 **확장 가능**: 새로운 언어/컬렉션 쉽게 추가

이 아키텍처를 통해 사용자는 상권 분석 상담에 최적화된 AI 서비스를 다양한 언어와 모드로 이용할 수 있습니다. 