from django.conf import settings

def api_keys(request):
    """
    템플릿에서 API 키들을 사용할 수 있도록 하는 context processor
    """
    return {
        'KAKAO_JS_API_KEY': settings.KAKAO_JS_API_KEY,
        'KAKAO_REST_API_KEY': settings.KAKAO_REST_API_KEY,
    } 