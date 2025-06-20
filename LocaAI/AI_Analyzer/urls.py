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
    path('api/result-list/<int:user_id>/', views.analysis_list_api, name='analysis_list_api'),
] 