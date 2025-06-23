# LocaAI/config/settings.py
"""
LocaAI Django Settings

이 파일은 LocaAI 프로젝트의 Django 설정을 포함합니다.
- AI 상권분석 시스템
- GeoDjango 공간정보 처리
- 챗봇 RAG 시스템
- 사용자 인증 및 권한 관리

환경별 설정:
- 개발환경: DEBUG=True, 로컬 데이터베이스
- 프로덕션: DEBUG=False, 보안 강화
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from chatbot.rag_settings import RAG_SETTINGS
import platform

# ============================================================================
# 기본 Django 설정
# ============================================================================

# 프로젝트 루트 디렉토리
BASE_DIR = Path(__file__).resolve().parent.parent
print(f"[INFO] 프로젝트 루트 디렉토리: {BASE_DIR}")

# 환경변수 로드
load_dotenv(dotenv_path=BASE_DIR / ".env")

# ============================================================================
# 보안 설정
# ============================================================================

# 비밀 키 (환경변수에서 로드, 프로덕션에서는 반드시 설정)
SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-your-secret-key")
FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise ValueError("FERNET_KEY 환경변수가 설정되지 않았습니다. .env 파일에 FERNET_KEY를 추가해주세요.")

# 디버그 모드 (프로덕션에서는 반드시 False)
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes", "on")

# 허용된 호스트 (프로덕션에서는 실제 도메인 설정)
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# ============================================================================
# 애플리케이션 및 미들웨어 설정
# ============================================================================

# Django 기본 앱들
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",  # GeoDjango 지원
]

# 서드파티 앱들
THIRD_PARTY_APPS = [
    "rest_framework",  # Django REST Framework
    "channels",  # WebSocket 지원
    "taggit",  # 태그 기능
]

# 프로젝트 로컬 앱들
LOCAL_APPS = [  # 메인 웹사이트
    "custom_auth",
    "main",  # 커스텀 사용자 인증
    "border",  # 게시판 기능
    "chatbot",  # AI 챗봇
    "GeoDB",  # 지오메트리 데이터베이스 관리
    "AI_Analyzer",  # AI 상권분석 시스템
    "shopdash",  # ShopDash 대시보드
    "smtp",  # SMTP 이메일 기능
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# 미들웨어 설정
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# URL 설정
ROOT_URLCONF = "config.urls"

# WSGI/ASGI 애플리케이션
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ============================================================================
# 템플릿 설정
# ============================================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "AI_Analyzer.context_processors.api_keys",  # 카카오 API 키
            ],
        },
    },
]

# ============================================================================
# 데이터베이스 설정
# ============================================================================

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "aidata",
        "USER": "postgres",
        "PASSWORD": "aix25bestgmail",
        "HOST": "aix25team.c3ky46o8wi2s.ap-northeast-3.rds.amazonaws.com",
        "PORT": "5432",
        "OPTIONS": {
            "sslmode": "require",
            "connect_timeout": 60,  # 대용량 공간정보 DB를 위한 타임아웃 설정
        },
    }
}

# 커스텀 사용자 모델
AUTH_USER_MODEL = "custom_auth.User"

# 패스워드 검증
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# ============================================================================
# GeoDjango 및 공간정보 설정
# ============================================================================

# 프로젝트 내장 GDAL 라이브러리 설정
GDAL_LIBS_ROOT = BASE_DIR / "gdal_libs"

# GDAL 라이브러리 자동 감지 및 설정
if GDAL_LIBS_ROOT.exists():
    # PATH 환경변수에 추가
    if str(GDAL_LIBS_ROOT) not in os.environ.get("PATH", ""):
        os.environ["PATH"] = f"{GDAL_LIBS_ROOT};{os.environ.get('PATH', '')}"

    # PROJ 설정 (오류 방지 최적화)
    os.environ.update(
        {
            "PROJ_LIB": str(GDAL_LIBS_ROOT),
            "PROJ_NETWORK": "OFF",
            "PROJ_SKIP_READ_USER_WRITABLE_DIRECTORY": "YES",
            "PROJ_CURL_ENABLED": "NO",
            "PROJ_DEBUG": "0",
        }
    )

    print(f"[OK] 프로젝트 내장 GDAL 라이브러리 사용: {GDAL_LIBS_ROOT}")
else:
    print(f"[WARNING] GDAL 라이브러리 폴더 없음: {GDAL_LIBS_ROOT}")
    print("[INFO] 시스템 설치 GDAL 사용")

# GDAL 라이브러리 경로 (시스템 설치 버전)
if platform.system() == "Windows":
    GEOS_LIBRARY_PATH = os.path.join(
        BASE_DIR, "venv", "Lib", "site-packages", "osgeo", "geos_c.dll"
    )
    GDAL_LIBRARY_PATH = os.path.join(
        BASE_DIR, "venv", "Lib", "site-packages", "osgeo", "gdal.dll"
    )
elif platform.system() == "Darwin":  # macOS
    GEOS_LIBRARY_PATH = "/opt/homebrew/lib/libgeos_c.dylib"  # brew로 설치한 기본 위치
    GDAL_LIBRARY_PATH = "/opt/homebrew/lib/libgdal.dylib"    # brew 설치 경로 (gdal 3.x 기준)

# 지도 설정 (Leaflet.js 직접 사용)

# ============================================================================
# 정적 파일 및 미디어 설정
# ============================================================================

STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]

# S3 미디어 스토리지 설정
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "aix-701-14")
AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "ap-northeast-3")
AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"

MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/media/"

STORAGES = {
    "default": {
        "BACKEND": "config.storage_backends.MediaStorage",
        "OPTIONS": {
            "access_key": AWS_ACCESS_KEY_ID,
            "secret_key": AWS_SECRET_ACCESS_KEY,
            "bucket_name": AWS_STORAGE_BUCKET_NAME,
            "region_name": AWS_S3_REGION_NAME,
            "default_acl": None,
            "file_overwrite": False,
            "querystring_auth": False,
            "location": "media",  # 버킷 내 media/ 하위로 저장됨
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

print("S3 KEY:", AWS_ACCESS_KEY_ID)
print("S3 BUCKET:", AWS_STORAGE_BUCKET_NAME)
# ============================================================================
# 국제화 및 현지화 설정
# ============================================================================

LANGUAGE_CODE = "ko-kr"

# 지원 언어 설정
LANGUAGES = [
    ('ko', 'Korean'),
    ('en', 'English'),
    ('es', 'Spanish'),
]

LOCALE_PATHS = [
    os.path.join(BASE_DIR, 'locale'),
]

TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

# ============================================================================
# 인증 및 세션 설정
# ============================================================================

LOGIN_URL = "custom_auth:login"
LOGIN_REDIRECT_URL = "border:inquiry_list"
LOGOUT_REDIRECT_URL = "border:inquiry_list"

# CSRF 설정
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
]

# 세션 설정
SESSION_COOKIE_AGE = 86400  # 24시간
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# ============================================================================
# 외부 서비스 API 설정
# ============================================================================

# 카카오 API 설정 (환경변수 우선, 기본값 제공)
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")
KAKAO_JS_API_KEY = os.getenv("KAKAO_JS_API_KEY")

# ============================================================================
# 챗봇 및 RAG 시스템 설정
# ============================================================================
# RAG 모델설정: LocaAI/chatbot/rag_settings.py
# Qdrant 설정
QDRANT_URL = os.getenv("QDRANT_URL")
print(f"[INFO] Qdrant URL: {QDRANT_URL}")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
print(f"[INFO] Qdrant API Key: {'설정됨' if QDRANT_API_KEY else '없음'}")

# Channels (WebSocket) 설정
CHANNEL_LAYERS = {"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}}

# ============================================================================
# SMTP 메일 서버 설정
# ============================================================================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'aix25best@gmail.com'
EMAIL_HOST_PASSWORD = 'ozfz nosx hhtm lqpe'  # 구글 앱 비밀번호
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# ============================================================================
# 로깅 설정
# ============================================================================

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name}:{lineno} - {message}",
            "style": "{",
        },
        "simple": {
            "format": "[{levelname}] {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose" if DEBUG else "simple",
        },
        "file": (
            {
                "class": "logging.FileHandler",
                "filename": BASE_DIR / "logs" / "django.log",
                "formatter": "verbose",
            }
            if not DEBUG
            else {
                "class": "logging.NullHandler",
            }
        ),
    },
    "loggers": {
        # Django GIS GDAL 오류 로그 레벨 조정
        "django.contrib.gis": {
            "handlers": ["console"],
            "level": "WARNING",  # GDAL 관련 경고 억제
            "propagate": False,
        },
        # 프로젝트 앱별 로깅
        "AI_Analyzer": {
            "handlers": ["console", "file"] if not DEBUG else ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "chatbot": {
            "handlers": ["console", "file"] if not DEBUG else ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "WARNING",
    },
}

# ============================================================================
# 기본 설정
# ============================================================================

# 기본 자동 필드 타입
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ============================================================================
# 개발/프로덕션 환경별 추가 설정
# ============================================================================

if DEBUG:
    # 개발 환경 설정
    print("[DEBUG] 개발 모드로 실행 중")

    # 개발용 추가 미들웨어 (필요시)
    # MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']

else:
    # 프로덕션 환경 설정
    print("[PROD] 프로덕션 모드로 실행 중")

    # 보안 강화 설정
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True

    # 세션 보안
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
