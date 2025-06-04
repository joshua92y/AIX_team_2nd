from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_main, name='report_main'),
    path('api/', views.report_api, name='report_api'),  # POST용
]
