from django.urls import path
from . import views

app_name = 'AI_Analyzer'

urlpatterns = [
    path('', views.index, name='index'),
    path('analyze/', views.analyze_page, name='analyze_page'),
    path('get-coordinates/', views.get_coordinates, name='get_coordinates'),
    path('analyze-business/', views.analyze_location, name='analyze_location'),
    path('api/result/<int:request_id>/', views.get_analysis_result_api, name='get_analysis_result_api'),
    path('result/<int:request_id>/', views.result_detail, name='result_detail'),
    path('database-info/', views.database_info, name='database_info'),
    path('pdf-data/<int:request_id>/', views.get_pdf_data, name='get_pdf_data'),
    
    # main 브랜치 호환 API
    path('api/result-list/<int:user_id>/', views.analysis_list_api, name='analysis_list_api'),
    
    # 분석 세션 관리 API (ssh 브랜치)
    path('analysis-sessions/<str:user_id>/<int:request_id>/create/', views.create_analysis_session, name='create-analysis-session'),
    path('analysis-sessions/<str:user_id>/<int:request_id>/', views.AnalysisSessionListView.as_view(), name='analysis-session-list'),
    path('analysis-session-log/<str:user_id>/<str:session_id>/', views.AnalysisSessionLogView.as_view(), name='analysis-session-log'),
    path('analysis-sessions/<str:user_id>/<str:session_id>/title/', views.update_analysis_session_title, name='update-analysis-session-title'),
    path('analysis-sessions/<str:user_id>/<str:session_id>/delete/', views.delete_analysis_session, name='delete-analysis-session'),
    
    # 사용자 대시보드 (ssh 브랜치)
    path('dashboard/', views.user_analysis_dashboard, name='user_dashboard'),
    path('comparison/', views.user_analysis_comparison, name='user_comparison'),
    
    # chatbot 호환 API (main 브랜치 지원)
    path('chatbot/', views.chatbot_view, name='chatbot_view'),
    path('api/sessions/<str:user_id>/create/', views.create_session, name='create_session'),
    path('api/sessions/<str:user_id>/<str:session_id>/title/', views.update_session_title, name='update_session_title'),
    path('api/sessions/<str:user_id>/<str:session_id>/delete/', views.delete_session, name='delete_session'),
    path('api/chat-log/<str:user_id>/<str:session_id>/', views.ChatLogView.as_view(), name='chat_log'),
    path('api/sessions/<str:user_id>/', views.SessionListView.as_view(), name='session_list'),
    path('api/result-sessions/<int:result_id>/', views.ResultSessionListView.as_view(), name='result_session_list'),
    path('api/result-sessions/<str:user_id>/<int:result_id>/create/', views.result_create_session, name='result_create_session'),
] 