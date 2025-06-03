# chatbot/urls.py 생성
from django.urls import path
from . import views

app_name = "chatbot"

urlpatterns = [
    path("", views.chat_view, name="chatbot"),
]
