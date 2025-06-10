from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chatbot"

    def ready(self):
        # 서버 시작 시 임베딩 모델, 컬렉션 목록 미리 로딩
        from chatbot.utils.qdrant import get_embedding_model, list_all_collections, get_qdrant_client
        get_embedding_model()
        list_all_collections()
        get_qdrant_client()