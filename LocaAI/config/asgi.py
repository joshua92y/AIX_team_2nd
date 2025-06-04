# LocaAI/config/asgi.py
import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()  # ✅ 이 줄 꼭 필요
from chatbot.routing import websocket_urlpatterns
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(websocket_urlpatterns),
})