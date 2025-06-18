#LocaAI/config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from GeoDB.admin import transform_coordinates

# Django Admin 타이틀 설정
admin.site.site_header = "LocaAI 관리자"
admin.site.site_title = "LocaAI 관리자"
admin.site.index_title = "LocaAI 관리자 홈"

urlpatterns = [
    path("", include("main.urls")),  # 루트 URL을 main 앱으로 설정
    path("admin/", admin.site.urls),
    path("admin/geodb/transform-coordinates/", transform_coordinates, name='admin_transform_coordinates'),  # 좌표 변환 API
    path("border/", include("border.urls")),
    path("chatbot/", include("chatbot.urls")),
    path("auth/", include("custom_auth.urls", namespace="custom_auth")),
    path("geodb/", include("GeoDB.urls")),  # GeoDB 대시보드
    path("ai_analyzer/", include("AI_Analyzer.urls")),  # AI 상권분석
    path("shopdash/", include("shopdash.urls")),  # ShopDash 대시보드
    path('api/smtp/', include('smtp.urls', namespace='smtp')),  # SMTP 이메일 API
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    # 개발 환경에서 static 파일 서빙
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()
