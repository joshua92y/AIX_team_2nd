# chatbot/urls.py 생성
from django.urls import path
from .views import AsyncChatLogView, AsyncSessionListView, delete_session, chatbot_view


app_name = "chatbot"

urlpatterns = [
    path("", chatbot_view, name="chatbot"),
    path("chatlog/<int:user_id>/<str:session_id>/", AsyncChatLogView.as_view(), name="chatlog-async-view"),
    path("sessions/<int:user_id>/", AsyncSessionListView.as_view()),
    path("sessions/<int:user_id>/<str:session_id>/delete/", delete_session),
]