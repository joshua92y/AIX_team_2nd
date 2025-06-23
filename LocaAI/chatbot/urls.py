# chatbot/urls.py 생성
from django.urls import path
from .views import (
    ChatLogView, SessionListView, delete_session, 
    chatbot_view, create_session, update_session_title,
    ResultSessionListView, result_create_session
)

app_name = "chatbot"

urlpatterns = [
    path("", chatbot_view, name="chatbot"),
    path("sessions/result/<int:result_id>/", ResultSessionListView.as_view(), name="result-session-list"),
    path("chatlog/<str:user_id>/<str:session_id>/", ChatLogView.as_view(), name="chatlog-view"),
    path("sessions/<str:user_id>/create/<int:result_id>/", result_create_session, name="result-create-session"),
    path("sessions/<str:user_id>/create/", create_session, name="create-session"),
    path("sessions/<str:user_id>/", SessionListView.as_view(), name="session-list"),
    path("sessions/<str:user_id>/<str:session_id>/", ChatLogView.as_view(), name="session-detail"),
    path("sessions/<str:user_id>/<str:session_id>/title/", update_session_title, name="update-session-title"),
    path("sessions/<str:user_id>/<str:session_id>/delete/", delete_session, name="delete-session"),
]