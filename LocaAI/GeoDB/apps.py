from django.apps import AppConfig


class GeodbConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "GeoDB"
    verbose_name = "지오메트리 데이터베이스"

    def ready(self):
        """앱 초기화 시 실행"""
        # 공간정보 관련 초기화 코드 추가 가능
        pass
