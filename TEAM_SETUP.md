# 🚀 LocaAI 팀 환경 설정 가이드 (2025.06.10 업데이트)

## 🎯 핵심 개선사항
- **✅ 윈도우 환경변수 조작 완전 제거**
- **✅ OSGeo4W 의존성 완전 제거**
- **✅ 프로젝트 내부 `gdal_libs`만 사용**
- **✅ 완전 독립적인 GDAL 라이브러리 설정**

## 📦 필수 요구사항
1. **Python 3.12.x** (권장)
2. **가상환경 (virtualenv/conda)**
3. **프로젝트 내 `gdal_libs` 폴더** (필수 DLL 파일들 포함)

## 🔧 빠른 설정 (3단계)

### 1단계: 프로젝트 클론 & 이동
```bash
git clone [저장소 URL]
cd LocaAI
```

### 2단계: 가상환경 & 의존성 설치
```bash
# 가상환경 생성 및 활성화
python -m venv locaai_env
locaai_env\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
```

### 3단계: 서버 실행
```bash
# Django 확인
python manage.py check

# 서버 시작
python manage.py runserver
# 또는
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

## 📁 필수 파일 구조
```
LocaAI/
├── gdal_libs/              # 🔥 필수! GDAL 라이브러리
│   ├── gdal310.dll         # GDAL 메인 라이브러리
│   ├── geos_c.dll          # GEOS 지리정보 라이브러리  
│   └── mod_spatialite.dll  # SpatiaLite 공간DB
├── config/
│   └── settings.py         # 독립적인 GDAL 설정
├── manage.py
└── requirements.txt
```

## 🛠️ 문제 해결

### ❌ "GDAL 라이브러리 폴더가 없습니다" 에러
```bash
# gdal_libs 폴더 확인
ls gdal_libs/
# 또는
dir gdal_libs\

# 필수 파일들이 있는지 확인
gdal310.dll
geos_c.dll  
mod_spatialite.dll
```

### ❌ "필수 DLL 파일이 없습니다" 에러
```bash
# 누락된 DLL 파일들을 프로젝트 관리자에게 요청
# 보통 다음 파일들이 필요:
# - gdal310.dll (약 37MB)
# - geos_c.dll (약 2MB)
# - mod_spatialite.dll (약 5MB)
```

### ❌ "[WinError 127] 지정된 프로시저를 찾을 수 없습니다" 에러
이제 이 에러는 발생하지 않아야 합니다! 완전히 독립적인 설정으로 변경했기 때문입니다.

만약 여전히 발생한다면:
1. `gdal_libs` 폴더가 프로젝트 루트에 있는지 확인
2. 3개의 필수 DLL 파일이 모두 있는지 확인
3. 다른 GDAL이 시스템에 설치되어 충돌하는지 확인

## 🎉 성공 확인 메시지
서버 시작 시 다음 메시지가 보이면 성공:
```
[OK] 독립 GDAL 라이브러리 설정 완료: C:\...\LocaAI\gdal_libs
     └─ GDAL: gdal310.dll
     └─ GEOS: geos_c.dll
     └─ SpatiaLite: mod_spatialite.dll
[OK] 챗봇 시스템 초기화 완료
```

## 📞 지원
문제가 발생하면 다음 정보와 함께 연락:
1. 에러 메시지 전체
2. Python 버전 (`python --version`)
3. 프로젝트 경로
4. `gdal_libs` 폴더 내용 (`dir gdal_libs\`)

---
**🔄 마지막 업데이트**: 2025.06.10 - 완전 독립적인 GDAL 설정으로 변경 