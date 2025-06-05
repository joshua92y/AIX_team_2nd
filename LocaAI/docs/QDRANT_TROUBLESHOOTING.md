# Qdrant 검색 문제 해결 가이드

## 🚨 **인덱스 오류 해결**

### **오류 메시지**
```
Bad request: Index required but not found for "ADSTRD_NM" of one of the following types: [text]. 
Help: Create an index for this key or use a different filter.
```

이 오류는 Qdrant에서 메타데이터 필터링을 할 때 해당 필드에 인덱스가 없어서 발생합니다.

### **해결 방법**

#### **1. 자동 인덱스 생성 (권장)**
```python
# 검색기 생성 시 자동으로 인덱스 생성
retriever = get_collection_retriever(
    collection_name="your_collection",
    enhanced=True,
    auto_create_indexes=True  # 기본값: True
)
```

#### **2. Django 관리 명령어 사용**
```bash
# 모든 컬렉션에 인덱스 생성
python manage.py setup_qdrant_indexes

# 특정 컬렉션만 처리
python manage.py setup_qdrant_indexes collection_name

# 인덱스 상태만 확인
python manage.py setup_qdrant_indexes --check-only

# 컬렉션 목록 확인
python manage.py setup_qdrant_indexes --list-collections
```

#### **3. 수동 인덱스 생성**
```python
from chatbot.utils.qdrant import ensure_collection_indexes, create_payload_indexes

# 필요한 인덱스 자동 생성
ensure_collection_indexes("your_collection")

# 특정 필드만 인덱스 생성
create_payload_indexes("your_collection", ["ADSTRD_NM", "기준_년분기_코드"])
```

## 🔧 **향상된 검색 기능**

### **안전 모드 검색**
인덱스 오류를 방지하고 안정적인 검색을 제공합니다.

```python
# 안전 모드로 검색 (기본 설정)
retriever = get_collection_retriever(
    collection_name="your_collection",
    enhanced=True,
    safe_filtering=True  # 안전한 필터링 활성화
)

# 안전 모드 비활성화 (고급 사용자)
retriever = get_collection_retriever(
    collection_name="your_collection",
    enhanced=True,
    safe_filtering=False
)
```

### **기능별 활성화/비활성화**
```python
retriever = get_collection_retriever(
    collection_name="your_collection",
    enhanced=True,
    use_hybrid_search=True,      # 하이브리드 검색
    use_metadata_filtering=True, # 메타데이터 필터링
    rerank_results=True,         # 결과 리랭킹
    safe_filtering=True          # 안전한 필터링
)
```

## 📊 **검색 품질 최적화**

### **필터를 사용한 정확한 검색**
```python
from chatbot.utils.qdrant import search_with_filters

# 지역, 연도, 인구수 조건으로 검색
results = search_with_filters(
    collection_name="commercial_area_data",
    query="상권 분석",
    region="신사동",           # 지역 필터
    year_quarter=20244,        # 2024년 4분기
    min_population=2000,       # 최소 인구수
    top_k=5
)
```

### **검색 결과 분석**
```python
from chatbot.utils.qdrant import get_search_analytics

analytics = get_search_analytics(results)
print(f"평균 점수: {analytics['average_score']:.3f}")
print(f"포함된 지역: {analytics['regions_covered']}")
```

## 🛠️ **문제 진단 및 해결**

### **1. 컬렉션 상태 확인**
```python
from chatbot.utils.qdrant import list_all_collections, get_qdrant_client

# 사용 가능한 컬렉션 목록
collections = list_all_collections()
print(f"컬렉션: {collections}")

# 컬렉션 정보 상세 확인
client = get_qdrant_client()
info = client.get_collection("your_collection")
print(f"인덱스: {info.config.params.payload_schema}")
```

### **2. 검색 폴백 테스트**
```python
# 기본 검색으로 폴백 테스트
retriever = get_collection_retriever(
    collection_name="your_collection",
    enhanced=False  # 기본 검색기 사용
)

results = retriever.get_relevant_documents("테스트 쿼리")
print(f"기본 검색 결과: {len(results)}개")
```

### **3. 로그 확인**
```python
import logging

# 디버그 로그 활성화
logging.getLogger('chatbot.utils.qdrant').setLevel(logging.DEBUG)

# 검색 실행하여 상세 로그 확인
retriever = get_collection_retriever("your_collection")
results = retriever.get_relevant_documents("테스트")
```

## 🚀 **성능 최적화 팁**

### **1. 인덱스 최적화**
- 자주 사용하는 필터 필드에만 인덱스 생성
- 텍스트 검색: `ADSTRD_NM` (지역명)
- 범위 검색: `기준_년분기_코드`, `총_직장_인구_수`

### **2. 검색 매개변수 조정**
```python
retriever = get_collection_retriever(
    collection_name="your_collection",
    top_k=5,                     # 결과 수 조정
    enhanced=True,
    use_hybrid_search=True,      # 정확도 우선
    rerank_results=True          # 품질 우선
)
```

### **3. 캐싱 활용**
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_search(query, collection_name):
    retriever = get_collection_retriever(collection_name)
    return retriever.get_relevant_documents(query)
```

## ⚠️ **주의사항**

1. **인덱스 생성 시간**: 대용량 컬렉션의 경우 인덱스 생성에 시간이 걸릴 수 있습니다.
2. **메모리 사용량**: 인덱스는 추가 메모리를 사용합니다.
3. **동시성**: 인덱스 생성 중에는 해당 컬렉션의 성능이 저하될 수 있습니다.

## 🔍 **추가 지원**

문제가 지속되면 다음을 확인하세요:

- Qdrant 서버 버전 호환성
- 네트워크 연결 상태
- 메모리 및 디스크 용량
- 로그 파일의 상세 오류 메시지 