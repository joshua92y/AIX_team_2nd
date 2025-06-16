from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailMessageViewSet, ContactEmailView

app_name = 'smtp'
router = DefaultRouter()
router.register(r'emails', EmailMessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', ContactEmailView.as_view(), name='contact-email'),
]
