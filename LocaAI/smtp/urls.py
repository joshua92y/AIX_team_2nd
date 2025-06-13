# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailTemplateViewSet, EmailMessageViewSet
from . import views

app_name = 'smtp'

# DefaultRouter를 사용하여 ViewSet의 URL 패턴 자동 생성
router = DefaultRouter()
router.register(r'templates', EmailTemplateViewSet, basename='template')
router.register(r'messages', EmailMessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
    # API 엔드포인트
    path('api/templates/', views.EmailTemplateListCreateView.as_view(), name='template_list_create'),
    path('api/templates/<uuid:pk>/', views.EmailTemplateDetailView.as_view(), name='template_detail'),
    path('api/messages/', views.EmailMessageListCreateView.as_view(), name='message_list_create'),
    path('api/messages/<uuid:pk>/', views.EmailMessageDetailView.as_view(), name='message_detail'),
    path('api/messages/<uuid:pk>/retry/', views.EmailMessageRetryView.as_view(), name='message_retry'),
    path('api/messages/<uuid:pk>/decrypt/', views.EmailMessageDecryptView.as_view(), name='message_decrypt'),
    
    # 템플릿 뷰
    path('emails/', views.EmailListView.as_view(), name='email_list'),
    path('emails/create/', views.EmailCreateView.as_view(), name='email_create'),
    path('emails/<uuid:pk>/', views.EmailDetailView.as_view(), name='email_detail'),
]