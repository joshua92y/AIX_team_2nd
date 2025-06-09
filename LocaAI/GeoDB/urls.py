from django.urls import path
from . import views

app_name = 'geodb'
 
urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('stats/', views.geodb_stats, name='stats'),
    path('api/spatial-data/', views.spatial_data_api, name='spatial_data_api'),
] 