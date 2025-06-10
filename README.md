# LocaAI - 지리정보 기반 AI 상권분석 플랫폼

## 📋 프로젝트 개요

LocaAI는 지리정보시스템(GIS)과 인공지능(AI)을 결합한 혁신적인 상권분석 플랫폼입니다. 카카오맵 API를 활용한 직관적인 지도 인터페이스와 머신러닝 기반의 상권분석 알고리즘을 통해 사업 아이템의 생존 가능성을 예측하고 최적의 입지를 제안합니다.

## 🚀 주요 기능

### 1. 지리정보 데이터베이스 (GeoDB)
- **다양한 공간데이터 관리**: 생활인구, 직장인구, 외국인 체류 현황, 상점 정보, 학교, 공공건물, 공시지가 등
- **카카오맵 위젯**: 직관적인 지도 기반 데이터 입력 및 편집
- **EPSG:5186 좌표계**: 한국 표준 좌표계 지원으로 정확한 공간분석
- **SpatiaLite 데이터베이스**: 대용량 공간데이터 효율적 처리

### 2. AI 상권분석 (AI_Analyzer)
- **머신러닝 기반 생존률 예측**: 입지 조건을 종합적으로 분석하여 사업 성공 확률 예측
- **다차원 분석 요소**:
  - 반경별 생활인구 분석 (300m, 1km)
  - 연령대별 인구 구성 (20대~60대)
  - 외국인 체류 현황 (단기/장기 체류 외국인)
  - 직장인구 밀도
  - 주변 시설 현황 (공공건물, 학교)
  - 경쟁업체 분석 및 업종 다양성
  - 공시지가 기반 임대료 추정

### 3. 지능형 챗봇 (Chatbot)
- **RAG(Retrieval-Augmented Generation) 시스템**
- **실시간 상권 정보 질의응답**
- **개인화된 상담 세션 관리**
- **벡터 데이터베이스 기반 정보 검색**

### 4. 사용자 인증 시스템 (Custom Auth)
- **커스텀 사용자 모델**
- **세션 기반 인증**
- **사용자별 분석 이력 관리**

### 5. 관리자 대시보드
- **Django Admin 커스터마이징**
- **GIS 데이터 시각화**
- **실시간 모니터링**
- **데이터 품질 관리**

## 🛠️ 기술 스택

### Backend
- **Framework**: Django 5.2.1
- **GIS Framework**: GeoDjango
- **Database**: SpatiaLite (SQLite + 공간확장)
- **Async Support**: Django Channels (WebSocket)
- **API Framework**: Django REST Framework

### Frontend
- **Map API**: 카카오맵 JavaScript API
- **CSS Framework**: Bootstrap
- **JavaScript**: Vanilla JS + jQuery
- **Charts**: Chart.js

### AI/ML
- **LLM**: OpenAI GPT, Hugging Face Transformers
- **Vector Database**: Qdrant
- **Embeddings**: Sentence Transformers
- **ML Libraries**: scikit-learn, pandas, numpy

### GIS Libraries
- **GDAL**: 지리정보 변환 및 처리
- **GEOS**: 공간 기하학 연산
- **PROJ**: 좌표계 변환
- **SpatiaLite**: 공간 데이터베이스

### Deployment
- **Container**: Docker
- **ASGI Server**: Uvicorn
- **Static Files**: Django Staticfiles

## 📁 프로젝트 구조

```
LocaAI/
├── config/                    # Django 프로젝트 설정
│   ├── settings.py           # 메인 설정 파일
│   ├── urls.py              # URL 라우팅
│   ├── asgi.py              # ASGI 설정
│   └── wsgi.py              # WSGI 설정
├── GeoDB/                    # 지리정보 데이터베이스 앱
│   ├── models.py            # GIS 데이터 모델
│   ├── admin.py             # 관리자 인터페이스
│   ├── views.py             # 뷰 로직
│   ├── forms.py             # 카카오맵 위젯 폼
│   ├── widgets.py           # 커스텀 위젯
│   └── management/          # 데이터 관리 명령어
├── AI_Analyzer/             # AI 상권분석 앱
│   ├── models.py            # 분석 요청 및 결과 모델
│   ├── views.py             # 분석 로직
│   ├── templates/           # 분석 화면 템플릿
│   └── static/              # 분석 관련 정적 파일
├── chatbot/                 # 챗봇 앱
│   ├── models.py            # 채팅 세션 및 메모리 모델
│   ├── views.py             # 챗봇 API
│   ├── consumers.py         # WebSocket 핸들러
│   ├── core/                # RAG 시스템 핵심 로직
│   └── utils/               # 챗봇 유틸리티
├── custom_auth/             # 사용자 인증 앱
├── main/                    # 메인 웹사이트 앱
├── border/                  # 경계 데이터 앱
├── templates/               # 공통 템플릿
├── static/                  # 정적 파일
├── gdal_libs/              # GDAL 라이브러리
├── docs/                   # 문서
├── requirements.txt        # Python 의존성
├── dockerfile              # Docker 설정
└── manage.py               # Django 관리 명령어
```

## 🗄️ 데이터 모델

### GeoDB 앱 주요 모델
- **LifePopGrid**: 생활인구 그리드 데이터 (10m 단위)
- **WorkGrid**: 직장인구 그리드 데이터 (10m 단위)
- **TempForeign**: 단기체류외국인 데이터 (25m 단위)
- **LongForeign**: 장기체류외국인 데이터 (25m 단위)
- **StorePoint**: 상점 포인트 데이터
- **School**: 학교 데이터
- **PublicBuilding**: 공공건물 데이터
- **LandValue**: 공시지가 데이터

### AI_Analyzer 앱 주요 모델
- **BusinessType**: 업종 마스터 데이터
- **AnalysisRequest**: 분석 요청 데이터
- **AnalysisResult**: AI 분석 결과 데이터

### Chatbot 앱 주요 모델
- **ChatSession**: 채팅 세션 관리
- **ChatMemory**: 대화 기록 및 메모리
- **CollectionMemory**: RAG 검색 결과 저장

## 🚀 설치 및 실행

### 환경 요구사항
- Python 3.11+
- GDAL/GEOS/PROJ 라이브러리
- Docker (선택사항)

### 로컬 설치

```bash
# 1. 프로젝트 클론
git clone https://github.com/your-repo/LocaAI.git
cd LocaAI

# 2. 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 환경변수 설정
cp .env.example .env
# .env 파일에서 API 키 및 설정 값 입력

# 5. 데이터베이스 마이그레이션
python manage.py makemigrations
python manage.py migrate

# 6. 관리자 계정 생성
python manage.py createsuperuser

# 7. 개발 서버 실행
python manage.py runserver
```

### Docker를 이용한 실행

```bash
# 1. Docker 이미지 빌드
docker build -t locaai .

# 2. 컨테이너 실행
docker run -p 8000:8000 -v "$(pwd):/app" locaai

# 3. 또는 기존 이미지 사용
docker pull joshua92y/aix2nd
docker run -it --rm -v "${PWD}:/app" aix2nd bash
```

### 프로덕션 배포

```bash
# ASGI 서버로 실행
uvicorn config.asgi:application --host 0.0.0.0 --port 8000
```

## 📊 사용법

### 1. 상권분석 수행
1. 메인 페이지에서 "AI 상권분석" 메뉴 선택
2. 카카오맵에서 분석하고자 하는 위치 클릭
3. 업종 및 매장 정보 입력
4. "분석 시작" 버튼 클릭
5. AI 분석 결과 확인

### 2. 챗봇 상담
1. 채팅 아이콘 클릭하여 챗봇 창 열기
2. 상권 관련 질문 입력
3. RAG 시스템 기반 맞춤형 답변 확인

### 3. 데이터 관리
1. `/admin/` 경로로 관리자 페이지 접속
2. 각종 GIS 데이터 조회 및 편집
3. 카카오맵 위젯을 통한 직관적 위치 편집

## ⚙️ 설정

### 환경변수 (.env)
```env
# Django 설정
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 데이터베이스
DATABASE_URL=sqlite:///db.sqlite3

# API 키
KAKAO_MAP_API_KEY=your-kakao-api-key
OPENAI_API_KEY=your-openai-api-key

# RAG 설정
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key
```

### GDAL 라이브러리 설정
프로젝트는 내장된 GDAL 라이브러리(`gdal_libs/`)를 우선 사용하며, 없을 경우 OSGeo4W를 폴백으로 사용합니다.

## 🧪 테스트

```bash
# 단위 테스트 실행
python manage.py test

# 특정 앱 테스트
python manage.py test GeoDB
python manage.py test AI_Analyzer
python manage.py test chatbot
```

## 📈 성능 최적화

### 데이터베이스 최적화
- WAL 모드 활성화로 동시성 향상
- 공간 인덱스 활용
- 쿼리 최적화

### 메모리 관리
- 채팅 메모리 윈도우 방식 (최대 30개)
- 벡터 캐싱
- 배치 처리

### 캐싱 전략
- Django 캐시 프레임워크
- Redis 캐싱 (선택사항)
- 정적 파일 캐싱

## 🔧 API 엔드포인트

### GeoDB API
- `GET /geodb/`: 지리정보 대시보드
- `POST /admin/geodb/transform-coordinates/`: 좌표 변환

### AI Analyzer API
- `POST /ai_analyzer/analyze/`: 상권분석 요청
- `GET /ai_analyzer/results/{id}/`: 분석 결과 조회

### Chatbot API
- `GET /chatbot/`: 채팅 인터페이스
- `POST /chatbot/chat/`: 채팅 메시지 전송
- WebSocket: `/ws/chat/{session_id}/`

## 🚨 트러블슈팅

### 공통 문제

1. **GDAL 라이브러리 오류**
   ```bash
   # OSGeo4W 설치 또는 프로젝트 내장 라이브러리 사용
   ```

2. **카카오맵 API 오류**
   ```bash
   # API 키 확인 및 도메인 등록 확인
   ```

3. **메모리 부족**
   ```bash
   # 대용량 데이터 처리 시 배치 사이즈 조정
   ```

## 🤝 기여 방법

1. 프로젝트 포크
2. 기능 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시 (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 👥 팀 정보

- **팀명**: AIX Team 2nd
- **프로젝트 리더**: AI First Leader

## 📞 문의

프로젝트에 대한 문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

## 🔄 업데이트 로그

### v1.0.0 (2024)
- 초기 릴리즈
- 기본 GIS 기능 구현
- AI 상권분석 기능 추가
- 챗봇 시스템 구현
- 카카오맵 통합

---

**LocaAI**와 함께 데이터 기반의 스마트한 상권분석을 경험해보세요! 🚀 