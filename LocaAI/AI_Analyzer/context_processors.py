from django.conf import settings


def api_keys(request):
    """
    템플릿에서 API 키들을 사용할 수 있도록 하는 context processor

    Args:
        request: HTTP 요청 객체

    Returns:
        dict: 템플릿에서 사용할 API 키들

    Note:
        - settings.py에 정의된 카카오 API 키들을 템플릿에 전달
        - 프론트엔드에서 카카오맵 API 사용 시 필요
    """
    return {
        "KAKAO_JS_API_KEY": settings.KAKAO_JS_API_KEY,
        "KAKAO_REST_API_KEY": settings.KAKAO_REST_API_KEY,
    }
