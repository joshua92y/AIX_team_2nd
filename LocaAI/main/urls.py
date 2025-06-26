from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('blog/', views.blog, name='blog'),
    path('blog-detail/', views.blog_detail, name='blog_detail'),
    path('blog-api/', views.blog_api, name='blog_api'),
    path('set-lang/', views.set_language, name='set_language'),
    path('guidebook/', views.guidebook, name='guidebook'),
    path('about-us/', views.about_us, name='about_us'),
]