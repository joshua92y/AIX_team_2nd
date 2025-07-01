import os
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse
from border.models import Post  # 추가

# 언어 설정을 세션에 저장하는 함수
def set_language(request):
    selected_lang = request.POST.get('lang')

    print(f"[set_language] 요청된 언어: {selected_lang}")  # 디버깅용

    if selected_lang:
        # 이미 같은 언어면 구지 덕지 않음
        if request.session.get('django_language') == selected_lang:
            print("[set_language] 기존 언어와 동일해서 스킵")  # 디버깅용
            return JsonResponse({"code": "0001", "message": "이미 설정된 언어"})

        request.session['django_language'] = selected_lang
        print(f"[set_language] 세션에 저장된 언어: {request.session.get('django_language')}")  # 디버깅용
        return JsonResponse({"code": "0000", "message": "언어변화성공"})

    print("[set_language] 언어 선택 실패")  # 디버깅용
    return JsonResponse({"code": "9999", "message": "언어변화실패"})

def index(request):
    lang_param = request.GET.get('lang')
    if lang_param:
        request.session['django_language'] = lang_param
    lang = request.session.get('django_language', 'KOR')
    topic_posts = Post.objects.filter(board_type='topic').order_by('-created_at')[:3]
    return render(request, 'index.html', {'lang': lang, 'topic_posts': topic_posts})

def guidebook(request):
    lang_param = request.GET.get('lang')
    if lang_param:
        request.session['django_language'] = lang_param
    lang = request.session.get('django_language', 'KOR')
    print(lang)
    return render(request, 'guidebook.html', {'lang': lang})

def about_us(request):
    lang_param = request.GET.get('lang')
    if lang_param:
        request.session['django_language'] = lang_param
    lang = request.session.get('django_language', 'KOR')
    return render(request, 'about_us.html', {'lang': lang})