import os
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
from django.shortcuts import render

def index(request):
    return render(request, 'index.html')

def blog(request):
    return render(request, 'blog.html')

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
        latitude = request.POST.get('latitude')
        longitude = request.POST.get('longitude')
        
        print(f"industry: {industry}, address: {address}, area: {area}, service: {service}, latitude: {latitude}, longitude: {longitude}")
        
        # 정상 응답 예시
        return JsonResponse({'message': '데이터 잘 받았습니다!'})
    
    # POST 아니면 그냥 blog.html 렌더링
    return render(request, 'blog.html')