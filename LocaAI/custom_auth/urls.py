from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from . import views
from .views import PasswordResetRequestView

app_name = 'custom_auth'

urlpatterns = [
    # 로그인/로그아웃
    path('login/', auth_views.LoginView.as_view(
        template_name='custom_auth/login.html',
    ), name='login'),
    path('logout/', views.logout_view, name='logout'),
    
    # 회원가입
    path('register/', views.register, name='register'),
    
    # 비밀번호 변경
    path('password_change/', auth_views.PasswordChangeView.as_view(
        template_name='custom_auth/password_change.html',
        success_url='/auth/password_change/done/'
    ), name='password_change'),
    path('password_change/done/', auth_views.PasswordChangeDoneView.as_view(
        template_name='custom_auth/password_change_done.html'
    ), name='password_change_done'),
    
    # 비밀번호 재설정 요청
    path('password-reset/', PasswordResetRequestView.as_view(), name='custom_password_reset'),
    
    # 비밀번호 재설정 확인 (token 입력)
    path(
        'password-reset-confirm/<uidb64>/<token>/',
        auth_views.PasswordResetConfirmView.as_view(
            template_name='custom_auth/password_reset_confirm.html',
            success_url=reverse_lazy('custom_auth:password_reset_complete')  # ★ 핵심 수정
        ),
        name='password_reset_confirm'
    ),
    
    # 비밀번호 재설정 완료
    path(
        'password-reset-complete/',
        auth_views.PasswordResetCompleteView.as_view(
            template_name='custom_auth/password_reset_complete.html'
        ),
        name='password_reset_complete'
    ),
]
