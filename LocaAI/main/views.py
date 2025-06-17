import os
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse

# Create your views here.
from django.shortcuts import render

# 언어 설정을 세션에서 가져오는 함수
def getSessionLang(request):
    return request.session.get('language', 'KOR')

# 언어 설정을 세션에 저장하는 함수
def set_language(request) :
	selected_lang = request.POST.get('lang')
	
	if selected_lang :
		request.session['language'] = selected_lang
		return JsonResponse({"code":"0000", "message":"언어변환성공"})
		
	return JsonResponse({"code":"9999", "message":"언어변환실패"})

def index(request):
    lang = getSessionLang(request)
    print(lang)
    return render(request, 'index.html', {'lang': lang})

def blog(request):
    lang = getSessionLang(request)
    # AI_Analyzer 앱의 분석 페이지로 리다이렉트
    return redirect('AI_Analyzer:analyze_page', {'lang': lang})

def blog_detail(request):
    lang = getSessionLang(request)
    return render(request, 'blog-details.html', {'lang': lang})

def blog_api(request):
    # check request parameters
    if request.method == 'POST':
        print("POST data:", request.POST)  # 딕셔너리 형태로 출력
        
        # 필요한 값들 뽑기
        industry = request.POST.get('industry')
        address = request.POST.get('address')
        area = request.POST.get('area')
        service = request.POST.get('service')
        tm_x = request.POST.get('tm_x')  # 추가
        tm_y = request.POST.get('tm_y')  # 추가
        
        print(f"industry: {industry}, address: {address}, area: {area}, service: {service}, tm_x: {tm_x}, tm_y: {tm_y}")
        
        # 정상 응답 예시
        return JsonResponse({'message': '데이터 잘 받았습니다!'})
    
    # POST 아니면 그냥 blog.html 렌더링
    return render(request, 'blog.html')