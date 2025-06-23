from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailMessageViewSet, ContactEmailView,NewsletterSubscribeView, NewsletterUnsubscribeView
from .views import unsubscribe_done

app_name = 'smtp'
router = DefaultRouter()
router.register(r'emails', EmailMessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', ContactEmailView.as_view(), name='contact-email'),
    path('newsletter/subscribe/', NewsletterSubscribeView.as_view(), name='newsletter-subscribe'),
    path('newsletter/unsubscribe/', NewsletterUnsubscribeView.as_view(), name='newsletter-unsubscribe'),
    path('unsubscribe/done/', unsubscribe_done, name='newsletter_unsubscribe_done'),
]
