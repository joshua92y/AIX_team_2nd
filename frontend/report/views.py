import os
import json
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from datetime import datetime
from django.template import TemplateDoesNotExist


def report_main(request):
    return render(request, 'report/report.html')

@csrf_exempt
def report_api(request):
    if request.method == 'POST':
        
        # ✅ 1. 사용자 입력 받기
        industry_code = request.POST.get('industry')
        address = request.POST.get('address')
        area = request.POST.get('area')
        service = request.POST.get('service')
        tm_x = request.POST.get('tm_x')
        tm_y = request.POST.get('tm_y')
        latitude = request.POST.get('latitude')
        longitude = request.POST.get('longitude')

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

        # ✅ 3. 더미 JSON 불러오기
        dummy_path = os.path.join(os.path.dirname(__file__), 'data', 'dummy_data.json')
        with open(dummy_path, 'r', encoding='utf-8') as f:
            context = json.load(f)

        # ✅ 4. 입력값 덮어쓰기
        context['input'] = {
            '업종코드': industry_code,
            '업종': industry_name,
            '주소': address,
            '면적': area,
            '주류판매여부': '가능' if service == '0' else '불가능',
            '위도': latitude,
            '경도': longitude
        }
        # 단위 변환 영역
        context['survival_prob_percent'] = round(context['survival_prob'] * 100, 1)
        context['shap_json'] = json.dumps(context['shap'], ensure_ascii=False)
        
        # ✅ 5. 현재 날짜 및 시간 추가
        context['analyzed_date'] = datetime.now().strftime('%Y-%m-%d %H:%M')

       # ✅ 6. 리포트 템플릿 렌더링 (디버깅용 예외 처리 추가)
        try:
            html = render_to_string('report/report_partial.html', context)
            return JsonResponse({'html': html})
        except TemplateDoesNotExist as e:
            return JsonResponse({'error': f"템플릿 없음: {str(e)}"})
        except Exception as e:
            return JsonResponse({'error': f"렌더링 실패: {str(e)}", 'context': context})

        # 응답 전송
        return JsonResponse({'html': html})
