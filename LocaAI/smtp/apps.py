#LocaAI/smtp/apps.py
from django.apps import AppConfig

class SmtpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'smtp'

    def ready(self):
        import custom_auth.signals  # 시그널 등록