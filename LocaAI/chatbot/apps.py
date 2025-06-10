from django.apps import AppConfig


class ChatbotConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "chatbot"

    def ready(self):
        # 서버 시작 시 임베딩 모델, 컬렉션 목록 미리 로딩 (선택적)
        try:
            from chatbot.utils.qdrant import get_embedding_model, list_all_collections, get_qdrant_client
            get_embedding_model()
            list_all_collections()
            get_qdrant_client()
            print("[OK] 챗봇 시스템 초기화 완료")
        except Exception as e:
            print(f"[WARNING] 챗봇 시스템 초기화 실패 (서버는 정상 작동): {e}")
            print("[INFO] Qdrant 서버가 실행되지 않았거나 네트워크 문제가 있을 수 있습니다.")