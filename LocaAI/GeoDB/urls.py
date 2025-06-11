from django.urls import path
from . import views
from .admin import transform_coordinates

app_name = 'geodb'
 
urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('stats/', views.geodb_stats, name='stats'),
    path('api/spatial-data/', views.spatial_data_api, name='spatial_data_api'),
    path('transform-coordinates/', transform_coordinates, name='transform_coordinates'),
] 