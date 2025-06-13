from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
<<<<<<< HEAD
=======
    path('blog/', views.blog_api, name='blog')
>>>>>>> mkchoi
]