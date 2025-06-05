# chatbot/urls.py 생성
from django.urls import path
from .views import (
    ChatLogView, SessionListView, delete_session, 
    chatbot_view, create_session, update_session_title
)

app_name = "chatbot"

urlpatterns = [
    path("", chatbot_view, name="chatbot"),
    path("chatlog/<str:user_id>/<str:session_id>/", ChatLogView.as_view(), name="chatlog-view"),
    path("sessions/<str:user_id>/", SessionListView.as_view(), name="session-list"),
    path("sessions/<str:user_id>/create/", create_session, name="create-session"),
    path("sessions/<str:user_id>/<str:session_id>/", ChatLogView.as_view(), name="session-detail"),
    path("sessions/<str:user_id>/<str:session_id>/title/", update_session_title, name="update-session-title"),
    path("sessions/<str:user_id>/<str:session_id>/delete/", delete_session, name="delete-session"),
]