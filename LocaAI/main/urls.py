from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('blog/', views.blog, name='blog'),
    path('blog-detail/', views.blog_detail, name='blog_detail'),
    path('blog-api/', views.blog_api, name='blog_api'),
]