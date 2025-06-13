"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

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
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
