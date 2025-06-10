# 🔑 API 키 설정 가이드

## 📋 **필요한 API 키들**

### 1. **Kakao API** (지도 및 주소 검색)
```bash
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_JS_API_KEY=your-kakao-js-api-key
```

### 2. **OpenAI API** (챗봇 기능)
```bash
OPENAI_API_KEY=your-openai-api-key
```

### 3. **Qdrant API** (벡터 데이터베이스)
```bash
QDRANT_API_KEY=your-qdrant-api-key
```

### 4. **공공데이터 API** (데이터 수집)
```bash
DATA_API_KEY=your-data-api-key
```

## 🛠️ **설정 방법**

### **Windows**
1. 시스템 환경변수 설정:
   ```cmd
   setx KAKAO_REST_API_KEY "your-key-here"
   setx KAKAO_JS_API_KEY "your-key-here"
   setx OPENAI_API_KEY "your-key-here"
   setx QDRANT_API_KEY "your-key-here"
   ```

2. 또는 `.env` 파일 생성 (프로젝트 루트):
   ```bash
   # LocaAI/.env
   KAKAO_REST_API_KEY=your-kakao-rest-api-key
   KAKAO_JS_API_KEY=your-kakao-js-api-key
   OPENAI_API_KEY=your-openai-api-key
   QDRANT_API_KEY=your-qdrant-api-key
   ```

### **Linux/Mac**
```bash
export KAKAO_REST_API_KEY="your-key-here"
export KAKAO_JS_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"
export QDRANT_API_KEY="your-key-here"
```

## ⚠️ **보안 주의사항**

1. **API 키는 절대 Git에 커밋하지 마세요**
2. **`.env` 파일은 `.gitignore`에 추가되어 있습니다**
3. **실제 키는 팀 채널을 통해 별도 공유합니다**

## 🔍 **API 키 발급 방법**

### **Kakao Developers**
1. https://developers.kakao.com 접속
2. 앱 생성 → 플랫폼 설정 → 키 발급

### **OpenAI**
1. https://platform.openai.com 접속
2. API Keys → Create new secret key

### **공공데이터포털**
1. https://www.data.go.kr 접속
2. 회원가입 → API 신청

## 🚀 **확인 방법**

서버 시작 시 다음과 같은 경고가 나타나지 않으면 정상:
```
⚠️  WARNING: KAKAO_REST_API_KEY가 환경변수에 설정되지 않았습니다.
``` 