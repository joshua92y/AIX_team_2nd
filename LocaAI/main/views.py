import os
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse

# Create your views here.
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')

def blog(request):
    # AI_Analyzer 앱의 분석 페이지로 리다이렉트
    return redirect('AI_Analyzer:analyze_page')

def blog_detail(request):
    return render(request, 'blog-details.html')

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