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
    
    # 분석 세션 관리 API (chatbot과 동일한 구조)
    path('analysis-sessions/<str:user_id>/<int:request_id>/create/', views.create_analysis_session, name='create-analysis-session'),
    path('analysis-sessions/<str:user_id>/<int:request_id>/', views.AnalysisSessionListView.as_view(), name='analysis-session-list'),
    path('analysis-session-log/<str:user_id>/<str:session_id>/', views.AnalysisSessionLogView.as_view(), name='analysis-session-log'),
    path('analysis-sessions/<str:user_id>/<str:session_id>/title/', views.update_analysis_session_title, name='update-analysis-session-title'),
    path('analysis-sessions/<str:user_id>/<str:session_id>/delete/', views.delete_analysis_session, name='delete-analysis-session'),
    
    # 지도 데이터 API
    path('api/map-data/', views.get_map_data, name='get_map_data'),
] 