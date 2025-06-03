"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
import asyncio
import nest_asyncio

# 이벤트 루프 중첩 허용
nest_asyncio.apply()

# Django 설정 로드
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# RAG 체인 초기화
from chatbot.rag_pipeline import initialize_chains


# 비동기 초기화 함수
async def init_app():
    await initialize_chains()


# 이벤트 루프에서 초기화 실행
try:
    loop = asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

loop.run_until_complete(init_app())

# 라우팅 설정
from chatbot.routing import websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
        ),
    }
)
