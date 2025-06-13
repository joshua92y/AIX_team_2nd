import os
<<<<<<< HEAD
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
from django.shortcuts import render
=======
import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.template.loader import render_to_string
>>>>>>> mkchoi

def index(request):
    return render(request, 'index.html')

def blog(request):
    return render(request, 'blog.html')

def blog_detail(request):
    return render(request, 'blog-details.html')

<<<<<<< HEAD
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
=======
@csrf_exempt
def blog_api(request):
    if request.method == 'POST':
        # ✅ 1. 사용자 입력값 받기
        industry_code = request.POST.get('industry')
        address = request.POST.get('address')
        area = request.POST.get('area')
        service = request.POST.get('service')
        tm_x = request.POST.get('tm_x')
        tm_y = request.POST.get('tm_y')
        latitude = request.POST.get('latitude')
        longitude = request.POST.get('longitude')

        print(f"industry: {industry_code}, address: {address}, area: {area}, service: {service}, tm_x: {tm_x}, tm_y: {tm_y}")

        # ✅ 2. 업종코드 → 업종명 매핑
        industry_map = {
            "0": "감성주점", "1": "경양식", "2": "관광호텔", "3": "극장", "4": "기타",
            "5": "기타 휴게음식점", "6": "김밥(도시락)", "7": "까페", "8": "냉면집", "9": "다방",
            "10": "떡카페", "11": "라이브카페", "12": "백화점", "13": "복어취급", "14": "분식",
            "15": "뷔페식", "16": "식육(숯불구이)", "17": "아이스크림", "18": "외국음식전문점(인도, 태국 등)",
            "19": "유원지", "20": "일반조리판매", "21": "일식", "22": "전통찻집", "23": "정종/대포집/소주방",
            "24": "중국식", "25": "철도역구내", "26": "출장조리", "27": "커피숍", "28": "키즈카페",
            "29": "탕류(보신용)", "30": "통닭(치킨)", "31": "패밀리레스토랑", "32": "패스트푸드",
            "33": "편의점", "34": "푸드트럭", "35": "한식", "36": "호프/통닭", "37": "횟집"
        }
        industry_name = industry_map.get(industry_code, "기타")

        # ✅ 3. 더미 데이터 불러오기
        dummy_path = os.path.join(os.path.dirname(__file__), 'dummy_data.json')
        with open(dummy_path, 'r', encoding='utf-8') as f:
            context = json.load(f)

        # ✅ 4. 입력 정보 덮어쓰기
        context['input'] = {
            '업종코드': industry_code,
            '업종': industry_name,
            '주소': address,
            '면적': area,
            '주류판매여부': '가능' if service == '0' else '불가능',
            '위도': latitude,
            '경도': longitude
        }

        context['survival_prob_percent'] = round(context['survival_prob'] * 100, 1)

        # ✅ 5. 리포트 템플릿 조각 렌더링 후 반환
        rendered_html = render_to_string('report_partial.html', context)
        return JsonResponse({'html': rendered_html})

    # POST 아닌 경우: 페이지 자체 렌더링
>>>>>>> mkchoi
    return render(request, 'blog.html')