from django.contrib import admin
from django.urls import path, include
from main import views
from django.contrib.auth import views as auth_views
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.index, name='index'),
    path('', include('main.urls')),
    path('blog/', lambda request: redirect('/analyze/'), name='blog'),  # blog를 analyze로 리다이렉트
    path('blog/<int:post_id>/', views.blog_detail, name='blog_detail'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='index'), name='logout'),
    path('users/', include('users.urls')),
    path('', include('main.urls')),
    path('api/', views.blog_api, name='blog_api'), #임시 api url
    path('', include('locai.urls')),  # locai 앱 URL 추가
]
