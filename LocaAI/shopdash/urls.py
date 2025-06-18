from django.urls import path
from . import views

app_name = 'shopdash'

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('api/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('api/population/', views.population_data, name='population_data'),
    path('api/business-activity/', views.business_activity_data, name='business_activity_data'),
    path('api/working-population/', views.working_population_data, name='working_population_data'),
    path('api/foreign-visitors/', views.foreign_visitor_data, name='foreign_visitor_data'),
    path('api/business-types/', views.business_type_distribution, name='business_type_distribution'),
    path('api/survival-rate/', views.survival_rate_data, name='survival_rate_data'),
    path('api/top-business-survival/', views.top_business_survival_rate, name='top_business_survival_rate'),
    path('api/district-data/', views.district_data, name='district_data'),
    path('api/dong-data/', views.dong_data, name='dong_data'),
    path('api/age-distribution/', views.age_distribution_data, name='age_distribution_data'),
    path('api/geometry/', views.get_geometry_data, name='geometry_data'),
] 