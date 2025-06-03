from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

app_name = 'custom_auth'

urlpatterns = [
    # 로그인/로그아웃
    path('login/', auth_views.LoginView.as_view(
        template_name='custom_auth/login.html',
        next_page='border:inquiry_list'  # 로그인 성공 후 리다이렉트할 URL
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
] 