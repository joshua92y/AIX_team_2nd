# LocaAI 프로젝트 기술 사전

## 📋 문서 개요
이 문서는 LocaAI 프로젝트의 각 앱, 모델, 뷰, 함수에 대한 상세한 기술 참조 사전입니다. 팀 협업과 코드 이해를 위한 완전한 가이드를 제공합니다.

**작성일**: 2025-06-11  
**버전**: 1.0  
**프로젝트**: AI 상권분석 시스템

---

## 🏗️ 프로젝트 구조

### 주요 앱 구성
```
LocaAI/
├── AI_Analyzer/     # AI 상권분석 핵심 앱
├── chatbot/         # RAG 기반 AI 챗봇
├── GeoDB/           # 공간정보 데이터베이스 관리
├── custom_auth/     # 커스텀 사용자 인증
├── border/          # 게시판 기능
├── main/            # 메인 웹사이트
└── config/          # Django 설정
```

---

## 🎯 AI_Analyzer 앱

### 📄 models.py

#### 클래스: `BusinessType`
**목적**: 업종 마스터 데이터 관리

**필드**:
- `id` (IntegerField, PK): 업종 고유 ID
- `name` (CharField, 50자): 업종명

**관계**:
- `AnalysisRequest`와 1:N 관계 (ForeignKey)

**주요 용도**:
- XGBoost 모델의 피쳐로 사용
- 업종별 특성 반영의 기준 데이터

```python
def __str__(self):
    return self.name
```

---

#### 클래스: `AnalysisRequest`
**목적**: 사용자의 상권 분석 요청 데이터 저장

**필드**:
- `address` (CharField, 200자): 분석 대상 주소
- `area` (FloatField): 사업장 면적(㎡)
- `business_type` (ForeignKey → BusinessType): 업종
- `service_type` (IntegerField): 서비스 유형 (0: 휴게음식점, 1: 일반음식점)
- `longitude`, `latitude` (FloatField): WGS84 좌표
- `x_coord`, `y_coord` (FloatField): EPSG:5186 좌표
- `created_at` (DateTimeField): 분석 요청 일시

**관계**:
- `BusinessType`와 N:1 관계
- `AnalysisResult`와 1:1 관계

**좌표계 정보**:
- **WGS84**: 웹 지도 표시용 (GPS 좌표)
- **EPSG:5186**: 공간 분석용 (한국 중부원점 TM 좌표)

```python
def __str__(self):
    return f"{self.address} - {self.business_type.name}"
```

---

#### 클래스: `AnalysisResult`
**목적**: 공간 분석 및 AI 예측 결과 저장

**주요 필드 그룹**:

**생활인구 관련**:
- `life_pop_300m` (IntegerField): 300m 반경 내 총 생활인구
- `life_pop_*_300m` (FloatField): 300m 반경 내 연령대별 비율(%)
- `life_pop_*_1000m` (FloatField): 1000m 반경 내 연령대별 비율(%)

**외국인 관련**:
- `temp_foreign_1000m` (IntegerField): 1000m 반경 내 단기체류 외국인 수
- `temp_foreign_cn_*m` (FloatField): 단기체류 중국인 비율(%)
- `long_foreign_*m` (IntegerField): 장기체류 외국인 수
- `long_foreign_cn_*m` (FloatField): 장기체류 중국인 비율(%)

**주변 시설**:
- `working_pop_300m` (IntegerField): 300m 반경 내 직장인구
- `public_building_250m` (IntegerField): 250m 반경 내 공공건물 수
- `school_250m` (IntegerField): 250m 반경 내 학교 수

**상권 분석**:
- `competitor_300m` (IntegerField): 300m 반경 내 동일업종 경쟁업체 수
- `adjacent_biz_300m` (IntegerField): 300m 반경 내 전체 요식업체 수
- `competitor_ratio_300m` (FloatField): 경쟁업체 비율(%)
- `business_diversity_300m` (IntegerField): 업종 다양성

**AI 예측 결과**:
- `survival_probability` (FloatField): 생존 확률 (0-1)
- `survival_percentage` (FloatField): 생존 확률 (%)

**관계**:
- `AnalysisRequest`와 1:1 관계 (OneToOneField)

---

### 📄 views.py

#### 함수: `load_xgboost_model()`
**목적**: XGBoost 모델 로드 및 캐싱

**매개변수**: 없음  
**반환값**: `object` | `None` - 로드된 XGBoost 모델 객체

**로직**:
1. 전역 변수 `XGBOOST_MODEL` 확인
2. 모델이 로드되지 않은 경우 `model/best_xgb_model.pkl` 파일 로드
3. 성공 시 전역 변수에 캐시
4. 실패 시 None 반환 및 오류 로깅

**전역 변수**:
- `XGBOOST_MODEL`: 로드된 모델 캐시

**예외 처리**:
- `FileNotFoundError`: 모델 파일 없음
- `Exception`: 일반적인 로드 오류

---

#### 함수: `predict_survival_probability(features_dict)`
**목적**: AI 모델을 사용한 장기 생존 확률 예측

**매개변수**:
- `features_dict` (dict): 분석 결과에서 추출한 피쳐 딕셔너리

**반환값**: `float` - 생존 확률 (0.0 ~ 1.0)

**피쳐 순서 (28개 - 업종 ID 포함)**:
1. `Area` - 면적
2. `Adjacent_BIZ` - 주변 요식업체 수
3. `1A_Total` - 300m 총 생활인구
4. `Total_LV` - 총 공시지가
5. `Business_D` - 업종 다양성
6. `Working_Pop` - 직장인구
7. `2A_20` ~ `2A_60` - 300m 연령대별 비율
8. `1A_20` ~ `1A_60` - 1000m 연령대별 비율
9. `1A_Long_Total`, `2A_Long_Total` - 장기체류외국인
10. `1A_Temp_CN`, `2A_Temp_CN` - 단기체류 중국인
11. `2A_Temp_Total` - 단기체류외국인 총수
12. `2A_Long_CN` - 장기체류 중국인
13. `Competitor_C` - 경쟁업체 수
14. `Competitor_R` - 경쟁업체 비율
15. `Service` - 서비스 유형
16. `School` - 학교 수
17. `PubBuilding` - 공공건물 수
18. `UPTAENM_ID` - 업종 ID

**로직**:
1. XGBoost 모델 로드 확인
2. 28개 피쳐로 예측 시도
3. 실패 시 27개 피쳐(업종 ID 제외)로 재시도
4. NumPy 배열로 변환 후 predict_proba() 호출
5. 생존(1) 클래스의 확률 반환

---

#### 함수: `index(request)`
**목적**: 메인 분석 페이지 렌더링

**매개변수**:
- `request`: HTTP 요청 객체

**반환값**: `HttpResponse` - 렌더링된 분석 페이지

**로직**:
1. `BusinessType.objects.all().order_by('id')` - 업종 목록 조회
2. `AI_Analyzer/analyze.html` 템플릿에 업종 목록 전달

**템플릿 컨텍스트**:
- `business_types`: 업종 목록 QuerySet

---

#### 함수: `get_coordinates(request)` 
**목적**: 주소를 좌표로 변환 (카카오 Geocoding API 사용)

**데코레이터**: `@csrf_exempt`, `@require_http_methods(["POST"])`

**매개변수**:
- `request`: POST 요청 (JSON body에 address 포함)

**반환값**: `JsonResponse`
- 성공: `{'success': True, 'longitude': float, 'latitude': float}`
- 실패: `{'success': False, 'error': str}`

**로직**:
1. JSON body에서 주소 추출
2. 카카오 Geocoding API 호출
3. WGS84 좌표 반환
4. 예외 처리 및 오류 메시지 반환

**API 정보**:
- URL: `https://dapi.kakao.com/v2/local/search/address.json`
- 헤더: `Authorization: KakaoAK {KAKAO_REST_API_KEY}`

---

#### 함수: `analyze_location(request)`
**목적**: 상권 분석 요청 처리 및 결과 반환

**데코레이터**: `@csrf_exempt`, `@require_http_methods(["POST"])`

**매개변수**:
- `request`: POST 요청 (JSON body에 분석 정보 포함)

**반환값**: `JsonResponse`
- 성공: `{'success': True, 'request_id': int}`
- 실패: `{'success': False, 'error': str}`

**요청 데이터**:
```json
{
    "address": "서울시 강남구...",
    "area": 50.5,
    "business_type": 1,
    "service_type": 0,
    "longitude": 127.123,
    "latitude": 37.456
}
```

**로직**:
1. 요청 데이터 검증
2. WGS84 → EPSG:5186 좌표 변환
3. `AnalysisRequest` 객체 생성
4. `perform_spatial_analysis()` 호출하여 공간 분석 수행
5. `AnalysisResult` 객체 생성 및 AI 예측 결과 저장
6. 요청 ID 반환

**좌표 변환**:
```python
transformer = Transformer.from_crs('EPSG:4326', 'EPSG:5186')
x_coord, y_coord = transformer.transform(latitude, longitude)
```

---

#### 함수: `perform_spatial_analysis(analysis_request)`
**목적**: 실제 공간 분석 수행 (데이터베이스 쿼리 집약)

**데코레이터**: `@transaction.atomic`

**매개변수**:
- `analysis_request` (AnalysisRequest): 분석 요청 객체

**반환값**: `dict` - 분석 결과 데이터

**분석 단계 (6단계)**:

1. **생활인구 분석**
   - 300m/1000m 반경 내 연령대별 생활인구 집계
   - 테이블: `life_pop_grid_10m_5186`
   - 공간 함수: `ST_Intersects(geom, ST_Buffer(point, radius))`

2. **직장인구 분석**
   - 300m 반경 내 직장인구 집계
   - 테이블: `workgrid_10m_5186`

3. **외국인 분석**
   - 단기체류외국인: `temp_25m_5186` 등 여러 테이블 시도
   - 장기체류외국인: `long_25m_5186` 등 여러 테이블 시도
   - 중국인 비율 계산

4. **시설 분석**
   - 학교: `school_5186` (250m 반경)
   - 공공건물: `public_5186` (250m 반경)

5. **상권 분석**
   - 경쟁업체: `store_point_5186`에서 동일 업종 검색
   - 업종 다양성: 주변 업종 종류 계산
   - 경쟁업체 비율 계산

6. **공시지가 분석**
   - 테이블: `ltv_5186`
   - 100m 반경 내 평균 공시지가 계산

**재시도 로직**:
- 최대 3회 재시도
- 데이터베이스 락 발생 시 자동 재시도
- 각 쿼리 간 0.1초 지연

**성능 최적화**:
- 각 단계별 소요 시간 측정
- 상세한 로깅으로 병목 지점 파악

---

#### 함수: `result_detail(request, request_id)`
**목적**: 분석 결과 상세 페이지 렌더링

**매개변수**:
- `request`: HTTP 요청 객체
- `request_id` (int): 분석 요청 ID

**반환값**: `HttpResponse` - 결과 상세 페이지

**로직**:
1. `AnalysisRequest` 및 `AnalysisResult` 조회
2. 결과 데이터를 템플릿에 전달
3. `AI_Analyzer/result_detail.html` 렌더링

**예외 처리**:
- 존재하지 않는 요청 ID: 404 에러

---

#### 함수: `get_analysis_result_api(request, request_id)`
**목적**: 분석 결과 API 제공 (JSON 형태)

**데코레이터**: `@csrf_exempt`

**매개변수**:
- `request`: HTTP 요청 객체
- `request_id` (int): 분석 요청 ID

**반환값**: `JsonResponse` - 분석 결과 JSON 데이터

**응답 구조**:
```json
{
    "request": {
        "address": "...",
        "business_type": "...",
        "area": 50.5
    },
    "result": {
        "life_pop_300m": 1500,
        "survival_percentage": 75.8,
        ...
    }
}
```

---

#### 함수: `database_info(request)`
**목적**: 데이터베이스 정보 관리자 페이지

**데코레이터**: `@staff_member_required`

**매개변수**:
- `request`: HTTP 요청 객체

**반환값**: `HttpResponse` - 데이터베이스 정보 페이지

**기능**:
- 각 테이블별 레코드 수 조회
- 공간 데이터 상태 확인
- 관리자 전용 디버깅 정보 제공

---

#### 함수: `get_pdf_data(request, request_id)`
**목적**: PDF 생성용 데이터 제공

**데코레이터**: `@csrf_exempt`

**매개변수**:
- `request`: HTTP 요청 객체
- `request_id` (int): 분석 요청 ID

**반환값**: `JsonResponse` - PDF 생성용 포맷된 데이터

**데이터 가공**:
- 숫자 포맷팅 (3자리 콤마, 소수점 처리)
- 퍼센트 변환
- PDF 템플릿에 최적화된 구조

---

#### 함수: `format_currency(value)`
**목적**: 통화 형식 포맷팅 유틸리티

**매개변수**:
- `value` (float): 포맷할 숫자

**반환값**: `str` - 포맷된 문자열 (예: "1,234,567원")

**로직**:
- 3자리마다 콤마 삽입
- "원" 단위 추가
- 0 값 처리

---

## 🤖 chatbot 앱

### 📄 models.py

#### 클래스: `ChatSession`
**목적**: 사용자별 채팅 세션 관리

**필드**:
- `user` (ForeignKey → User): 세션 소유자
- `session_id` (CharField, 100자, unique): 고유 세션 ID
- `title` (SlugField, 200자): 세션 제목
- `created_at` (DateTimeField): 생성 일시
- `lastload_at` (DateTimeField): 마지막 접근 일시

**자동 생성 로직**:
```python
def save(self, *args, **kwargs):
    is_new = self.pk is None
    super().save(*args, **kwargs)
    
    # 세션 ID 자동 생성: YYYYMMDD-{PK}
    if is_new and not self.session_id:
        self.session_id = f"{now().strftime('%Y%m%d')}-{self.pk}"
        super().save(update_fields=["session_id"])
    
    # 제목 자동 생성
    if not self.title:
        self.title = slugify(f"session-{self.session_id}")
        super().save(update_fields=["title"])
```

---

#### 클래스: `ChatMemory`
**목적**: RAG 시스템의 대화 메모리 관리

**필드**:
- `session` (ForeignKey → ChatSession): 세션 참조
- `memory_type` (CharField): 메모리 타입 (`question`, `answer`, `summary`)
- `role` (CharField): 역할 (`user`, `assistant`)
- `content` (JSONField): 메모리 내용
- `created_at` (DateTimeField): 생성 일시

**메모리 관리**:
```python
def save(self, *args, **kwargs):
    super().save(*args, **kwargs)
    
    # 윈도우 방식: 같은 세션+타입별 30개 초과 시 자동 삭제
    max_history = 30
    memories = ChatMemory.objects.filter(
        session=self.session,
        memory_type=self.memory_type
    ).order_by('-created_at')
    
    if memories.count() > max_history:
        to_delete = memories[max_history:]
        ChatMemory.objects.filter(id__in=[m.id for m in to_delete]).delete()
```

**메모리 타입별 용도**:
- `question`: 사용자 질문 저장
- `answer`: AI 답변 저장  
- `summary`: 대화 요약 저장

---

#### 클래스: `Prompt`
**목적**: RAG 시스템의 프롬프트 템플릿 관리

**필드**:
- `name` (CharField, 100자): 프롬프트 이름
- `scope` (CharField): 적용 범위 (`collection`, `user`)
- `content` (TextField): 프롬프트 내용
- `tag` (CharField, 100자): 태그

**scope 구분**:
- `collection`: 컬렉션별 특화 프롬프트
- `user`: 사용자별 개인화 프롬프트

---

#### 클래스: `CollectionMemory`
**목적**: RAG 검색 결과 및 LLM 응답 캐싱

**필드**:
- `session` (ForeignKey → ChatSession): 세션 참조
- `collection_name` (CharField, 100자): 벡터 DB 컬렉션명
- `retrieved_documents_content` (JSONField): 검색된 문서 내용
- `retrieved_documents_meta` (JSONField): 문서 메타데이터
- `llm_response` (TextField): LLM 응답
- `prompt` (ForeignKey → Prompt): 사용된 프롬프트
- `created_at` (DateTimeField): 생성 일시

**용도**:
- RAG 검색 결과 캐싱으로 성능 향상
- 동일 질문 반복 시 빠른 응답 제공
- 검색 품질 분석을 위한 로그 데이터

---

#### 클래스: `ChatLog`
**목적**: 전체 대화 내역 JSON 형태 저장

**필드**:
- `session` (OneToOneField → ChatSession): 세션 1:1 관계
- `log` (JSONField): 대화 로그 배열
- `updated_at` (DateTimeField): 업데이트 일시

**로그 구조**:
```json
[
    {"role": "user", "content": "사용자 메시지"},
    {"role": "assistant", "content": "AI 응답"},
    ...
]
```

---

## 🗺️ GeoDB 앱

### 📄 models.py

#### 클래스: `LifePopGrid`
**목적**: 생활인구 그리드 데이터 (10m 해상도)

**필드**:
- `ogc_fid` (AutoField, PK): OGC 표준 ID
- `총생활인구수` (FloatField): 총 생활인구 수
- `age_20` ~ `age_60` (FloatField): 연령대별 인구 수
- `geom` (PointField, SRID=5186): 지리적 위치

**테이블**: `life_pop_grid_10m_5186`  
**관리 상태**: `managed = False` (외부 데이터)

**용도**:
- AI_Analyzer에서 반경별 생활인구 집계
- 연령대별 상권 특성 분석

---

#### 클래스: `WorkGrid`
**목적**: 직장인구 그리드 데이터 (10m 해상도)

**필드**:
- `ogc_fid` (AutoField, PK): OGC 표준 ID
- `총_직장_인구_수` (IntegerField): 총 직장인구 수
- `남성_직장_인구_수`, `여성_직장_인구_수` (IntegerField): 성별 직장인구
- `geom` (GeometryField, SRID=5186): 지리적 위치

**테이블**: `workgrid_10m_5186`  
**관리 상태**: `managed = False`

---

#### 클래스: `TempForeign`
**목적**: 단기체류외국인 데이터 (25m 해상도)

**필드**:
- `ogc_fid` (AutoField, PK): OGC 표준 ID
- `총생활인구수` (IntegerField): 총 단기체류외국인 수
- `중국인체류인구수` (IntegerField): 중국인 체류인구 수
- `geom` (GeometryField, SRID=5186): 지리적 위치

**테이블**: `temp_foreign_25m_5186`  
**관리 상태**: `managed = False`

---

#### 클래스: `LongForeign`
**목적**: 장기체류외국인 데이터 (25m 해상도)

**구조**: `TempForeign`과 동일  
**테이블**: `long_foreign_25m_5186`

---

#### 클래스: `StorePoint`
**목적**: 상점 포인트 데이터

**필드**:
- `ogc_fid` (AutoField, PK): OGC 표준 ID
- `uptaenm` (CharField, 255자): 업태명
- `service` (CharField, 255자): 서비스 구분
- `area` (CharField, 255자): 면적 정보
- `x`, `y` (CharField, 255자): 좌표 (문자열)
- `geom` (PointField, SRID=5186): 지리적 위치

**테이블**: `store_point_5186`  
**관리 상태**: `managed = False`

**용도**:
- 경쟁업체 분석
- 업종 다양성 계산
- 상권 밀도 분석

---

#### 클래스: `School`
**목적**: 학교 데이터

**주요 필드**:
- `school_type` (CharField): 학교 종류
- `school_name` (CharField): 학교명
- `road_address` (CharField): 도로명 주소
- `phone_number` (CharField): 전화번호
- `homepage` (CharField): 홈페이지
- `geom` (PointField, SRID=5186): 지리적 위치

**테이블**: `school_5186`  
**관리 상태**: `managed = False`

---

#### 클래스: `PublicBuilding`
**목적**: 공공건물 데이터

**필드**:
- `dgm_nm` (CharField): 건물명
- `lclas_cl` (CharField): 대분류
- `mlsfc_cl` (CharField): 중분류
- `dgm_ar` (FloatField): 건물 면적
- `geom` (GeometryField, SRID=5186): 지리적 위치

**테이블**: `public_5186`  
**관리 상태**: `managed = False`

---

#### 클래스: `LandValue`
**목적**: 공시지가 데이터

**필드**:
- `a1`, `a2`, `a3`, `a6` (CharField): 분류 코드
- `a9` (FloatField): 공시지가 (원/㎡)
- `geom` (GeometryField, SRID=5186): 지리적 위치

**테이블**: `ltv_5186`  
**관리 상태**: `managed = False`

---

#### 관리형 모델들

##### 클래스: `EditableStorePoint`
**목적**: 편집 가능한 상점 데이터

**필드**:
- `storename` (CharField, 200자): 상호명
- `uptaenm` (CharField, 100자): 업종명
- `address` (CharField, 500자): 주소
- `phone` (CharField, 20자): 전화번호
- `geom` (PointField, SRID=5186): 위치
- `created_at`, `updated_at` (DateTimeField): 생성/수정 일시

**테이블**: `editable_store_point`  
**관리 상태**: `managed = True`

**용도**:
- 새로운 상점 데이터 추가
- 기존 데이터 보완
- 사용자 제보 데이터 관리

---

##### 클래스: `EditablePublicBuilding`
**목적**: 편집 가능한 공공건물 데이터

**구조**: `EditableStorePoint`와 유사  
**테이블**: `editable_public_building`

---

## 👤 custom_auth 앱

### 📄 models.py

#### 클래스: `User`
**목적**: 커스텀 사용자 모델 (AbstractUser 확장)

**필드**:
- `id` (UUIDField, PK): UUID 기반 고유 ID
- `role` (CharField): 사용자 역할 (`ADMIN`, `USER`)
- `session_token` (UUIDField): 세션 토큰
- `last_login_ip` (GenericIPAddressField): 마지막 로그인 IP
- `created_at`, `updated_at` (DateTimeField): 생성/수정 일시

**역할 선택지**:
```python
class Role(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    USER = 'USER', 'User'
```

**유틸리티 메서드**:
```python
def is_admin(self):
    return self.role == self.Role.ADMIN
```

**보안 특징**:
- UUID 기반 ID로 예측 불가능성 향상
- 세션 토큰을 통한 추가 보안
- IP 추적을 통한 접근 로그

---

## 🔧 주요 기술 스택

### 백엔드
- **Django 5.2**: 웹 프레임워워크
- **GeoDjango**: 공간정보 처리
- **SpatiaLite**: 공간 데이터베이스
- **XGBoost**: 머신러닝 모델
- **PyProj**: 좌표계 변환

### 프론트엔드
- **Leaflet**: 지도 라이브러리
- **jsPDF**: PDF 생성
- **Bootstrap**: UI 프레임워크

### AI/ML
- **LangChain**: RAG 시스템
- **Qdrant**: 벡터 데이터베이스
- **HuggingFace**: 임베딩 모델

### 공간정보
- **EPSG:5186**: 한국 중부원점 TM 좌표계
- **WGS84**: 세계 측지계 (GPS)
- **GDAL/GEOS**: 공간정보 라이브러리

---

## 📊 데이터 플로우

### 상권 분석 프로세스
```
1. 사용자 입력 (주소, 면적, 업종)
   ↓
2. 주소 → 좌표 변환 (카카오 API)
   ↓
3. 좌표계 변환 (WGS84 → EPSG:5186)
   ↓
4. 공간 분석 수행 (6단계)
   - 생활인구 분석
   - 직장인구 분석
   - 외국인 분석
   - 시설 분석
   - 상권 분석
   - 공시지가 분석
   ↓
5. AI 모델 예측 (XGBoost)
   ↓
6. 결과 저장 및 반환
```

### RAG 챗봇 프로세스
```
1. 사용자 질문 입력
   ↓
2. 임베딩 생성 (HuggingFace)
   ↓
3. 벡터 검색 (Qdrant)
   ↓
4. 컨텍스트 구성
   ↓
5. LLM 응답 생성
   ↓
6. 메모리 저장 및 관리
```

---

## 🔒 보안 고려사항

### 인증 및 권한
- UUID 기반 사용자 ID
- 역할 기반 접근 제어 (RBAC)
- IP 기반 접근 로그

### 데이터 보호
- CSRF 토큰 검증
- SQL 인젝션 방지 (ORM 사용)
- 환경변수를 통한 민감 정보 관리

### API 보안
- 카카오 API 키 환경변수 관리
- 요청 검증 및 예외 처리

---

## 🚀 성능 최적화

### 데이터베이스
- 공간 인덱스 활용
- 트랜잭션 최적화
- 연결 풀링

### 모델 로딩
- XGBoost 모델 전역 캐싱
- 지연 로딩 (Lazy Loading)

### 메모리 관리
- RAG 메모리 윈도우 방식 (30개 제한)
- 자동 정리 시스템

---

## 📝 개발 가이드라인

### 코딩 스타일
- PEP 8 준수
- 한국어 주석 및 docstring
- 이모지를 활용한 로깅

### 오류 처리
- 구체적인 예외 타입 사용
- 상세한 오류 메시지
- 로깅을 통한 디버깅 지원

### 테스트
- 단위 테스트 작성 권장
- 공간 분석 결과 검증
- API 응답 형식 검증

---

## 📚 참고 자료

### 공간정보
- [GeoDjango 공식 문서](https://docs.djangoproject.com/en/stable/ref/contrib/gis/)
- [EPSG:5186 좌표계 정보](https://epsg.io/5186)

### AI/ML
- [XGBoost 문서](https://xgboost.readthedocs.io/)
- [LangChain 문서](https://python.langchain.com/)

### 지도 API
- [카카오맵 API](https://apis.map.kakao.com/)
- [Leaflet 문서](https://leafletjs.com/)

---

**문서 끝** - 추가 질문이나 수정사항이 있으면 개발팀에 문의해주세요. 