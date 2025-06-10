# 🔑 API 키 설정 가이드

## 📋 **프로젝트에서 사용하는 API 키들**

이 프로젝트는 **`.env` 파일**을 통해 API 키를 관리합니다.

### **필요한 API 키들**:
1. **Kakao API** (지도 및 주소 검색)
2. **OpenAI API** (챗봇 기능)
3. **Qdrant API** (벡터 데이터베이스)
4. **공공데이터 API** (데이터 수집)

## 🚀 **빠른 설정 방법**

### **1. .env 파일 생성**
프로젝트 루트 디렉토리(`LocaAI/`)에 `.env` 파일을 생성하세요:

```bash
# LocaAI/.env 파일 내용

# Django 기본 설정
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Kakao API (필수 - 지도 및 주소 검색)
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_JS_API_KEY=your-kakao-js-api-key

# OpenAI API (챗봇 기능용)
OPENAI_API_KEY=your-openai-api-key

# Qdrant API (벡터 데이터베이스용)
QDRANT_API_KEY=your-qdrant-api-key

# 공공데이터 API (데이터 수집용)
DATA_API_KEY=your-data-api-key
```

### **2. 서버 시작하여 확인**
```bash
python manage.py runserver
```

서버 시작 시 다음과 같은 메시지가 표시됩니다:
```
✅ .env 파일 로딩 완료: C:\path\to\LocaAI\.env
🔑 API 키 로딩 상태:
   KAKAO_REST_API_KEY: ✅ 로딩됨
   KAKAO_JS_API_KEY: ✅ 로딩됨
   OPENAI_API_KEY: ✅ 로딩됨
   QDRANT_API_KEY: ✅ 로딩됨
   DATA_API_KEY: ✅ 로딩됨
```

## 🔍 **API 키 발급 방법**

### **Kakao Developers**
1. https://developers.kakao.com 접속
2. 내 애플리케이션 → 앱 생성
3. 앱 설정 → 플랫폼 설정 → Web 플랫폼 추가
4. 앱 키 → REST API 키, JavaScript 키 복사

### **OpenAI**
1. https://platform.openai.com 접속
2. API Keys → Create new secret key
3. 생성된 키 복사 (한 번만 표시됨)

### **공공데이터포털**
1. https://www.data.go.kr 접속
2. 회원가입 → 원하는 API 신청
3. 인증키 발급 받기

## ⚠️ **보안 주의사항**

1. **`.env` 파일은 Git에 커밋되지 않습니다** (`.gitignore`에 포함)
2. **실제 API 키는 팀 채널을 통해 안전하게 공유**
3. **개발/운영 환경별로 다른 키 사용 권장**

## 🛠️ **문제 해결**

### **"API 키가 누락되었습니다" 에러**
1. `.env` 파일이 `LocaAI/` 디렉토리에 있는지 확인
2. 파일 이름이 정확히 `.env`인지 확인 (`.env.txt` 아님)
3. API 키 값에 따옴표가 없는지 확인

### **서버 시작 시 경고 메시지**
```
⚠️  누락된 API 키: KAKAO_REST_API_KEY, OPENAI_API_KEY
```
해당 키들을 `.env` 파일에 추가하고 서버를 재시작하세요.

## 💡 **팁**

- **최소 필수**: `KAKAO_REST_API_KEY`, `KAKAO_JS_API_KEY` (지도 기능용)
- **챗봇 사용시**: `OPENAI_API_KEY`, `QDRANT_API_KEY` 추가 필요
- **데이터 수집시**: `DATA_API_KEY` 추가 필요 