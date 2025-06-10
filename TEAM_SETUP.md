# 🚀 LocaAI 팀원용 빠른 설정 가이드

## ⚡ 1분 설정 (자동)

```bash
# 1. 프로젝트 클론
git clone https://github.com/joshua92y/AIX_team_2nd.git
cd AIX_team_2nd

# 2. ssh 브랜치로 이동 
git checkout ssh

# 3. 자동 설정 스크립트 실행
python setup_team_env.py
```

## 🔧 수동 설정 (문제 발생 시)

### 1. Python 환경 준비
```bash
# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate  # Windows

# NumPy 호환성 문제 해결
pip install "numpy<2.0" --force-reinstall
```

### 2. 의존성 설치
```bash
cd LocaAI
pip install -r requirements.txt
```

### 3. GDAL 문제 해결

#### 방법 1: 프로젝트 내장 GDAL 사용 (권장)
- `LocaAI/gdal_libs/` 폴더가 있는지 확인
- 없다면 다른 팀원에게 요청

#### 방법 2: Conda 설치 (Anaconda 사용자)
```bash
conda install gdal
```

#### 방법 3: OSGeo4W 설치
1. [OSGeo4W](https://trac.osgeo.org/osgeo4w/) 다운로드
2. 설치 후 환경변수 설정

### 4. 환경변수 설정
`.env` 파일이 `LocaAI/` 폴더에 있는지 확인 (자동 생성됨)

### 5. 서버 실행
```bash
cd LocaAI
python manage.py runserver
```

## 🌐 접속 주소

- **메인 사이트**: http://localhost:8000
- **챗봇**: http://localhost:8000/chatbot/
- **관리자**: http://localhost:8000/admin/
- **AI 분석기**: http://localhost:8000/ai_analyzer/
- **GeoDB**: http://localhost:8000/geodb/

## ❗ 자주 발생하는 문제

### 1. "지정된 프로시저를 찾을 수 없습니다" 에러
```
해결방법:
1. conda install gdal (Anaconda 사용자)
2. 또는 python setup_team_env.py 실행
3. 팀 채널에 문의
```

### 2. NumPy 호환성 오류
```bash
pip install "numpy<2.0" --force-reinstall
```

### 3. 챗봇 WebSocket 연결 안됨
```bash
# runserver 대신 daphne 사용
pip install daphne
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### 4. 포트 충돌
```bash
# 다른 포트 사용
python manage.py runserver 8001
```

## 🆘 도움이 필요할 때

1. **자동 설정 실행**: `python setup_team_env.py`
2. **진단 스크립트**: `python diagnosis.py` (있는 경우)
3. **문제 해결 가이드**: `TROUBLESHOOTING.md` 참고
4. **팀 채널에 문의**: 오류 메시지 전체를 공유

## 📁 프로젝트 구조

```
AIX_team_2nd/
├── LocaAI/                 # 메인 Django 프로젝트
│   ├── manage.py          # Django 관리 명령
│   ├── .env               # 환경변수 (자동 생성)
│   ├── gdal_libs/         # GDAL 라이브러리 (중요!)
│   ├── main/              # 메인 앱 (프론트엔드)
│   ├── chatbot/           # 챗봇 앱
│   ├── GeoDB/             # GIS 데이터베이스
│   ├── AI_Analyzer/       # AI 분석 엔진
│   └── config/            # Django 설정
├── setup_team_env.py      # 자동 설정 스크립트
├── TEAM_SETUP.md          # 이 파일
└── README.md              # 프로젝트 전체 문서
```

## 🎯 개발 팁

- **메인 페이지 수정**: `LocaAI/templates/index.html`
- **챗봇 기능**: `LocaAI/chatbot/` 디렉토리
- **API 테스트**: `/geodb/` 또는 `/ai_analyzer/` 경로
- **정적 파일**: `LocaAI/static/` 디렉토리

**설정 완료 후 팀 채널에 "✅ 환경 설정 완료"라고 알려주세요!** 