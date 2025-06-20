#LocaAI/AI_Analyzer/viws.py
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.gis.db import models
from django.db import connection, transaction
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
import json
import requests
from pyproj import Transformer
from .models import BusinessType, AnalysisRequest, AnalysisResult
import time
import pickle
import numpy as np
import os
from django.utils.crypto import get_random_string
from chatbot.models import ChatSession
from django.core.serializers.json import DjangoJSONEncoder
import pandas as pd
from datetime import datetime, timedelta
# PDF 생성은 클라이언트 사이드에서 jsPDF로 처리

# XGBoost 모델 전역 변수
XGBOOST_MODEL = None


def load_xgboost_model():
    """
    XGBoost 모델을 로드하는 함수

    Returns:
        object: 로드된 XGBoost 모델 객체, 실패 시 None

    Note:
        - 모델은 전역 변수로 캐시되어 중복 로드를 방지
        - 모델 파일 경로: model/best_xgb_model.pkl
    """
    global XGBOOST_MODEL
    if XGBOOST_MODEL is None:
        # 상대경로로 변경
        model_path = os.path.join("model", "best_xgb_model.pkl")
        try:
            with open(model_path, "rb") as f:
                XGBOOST_MODEL = pickle.load(f)
            print(f"✅ XGBoost 모델 로드 완료: {model_path}")
        except FileNotFoundError:
            print(f"❌ XGBoost 모델 파일을 찾을 수 없습니다: {model_path}")
            XGBOOST_MODEL = None
        except Exception as e:
            print(f"❌ XGBoost 모델 로드 실패: {e}")
            XGBOOST_MODEL = None
    return XGBOOST_MODEL


def predict_survival_probability(features_dict):
    """
    장기 생존 확률을 예측하는 함수

    Args:
        features_dict (dict): 분석 결과에서 추출한 피쳐 딕셔너리

    Returns:
        float: 생존 확률 (0.0 ~ 1.0), 예측 실패 시 0.0

    Note:
        - 28개 피쳐(업종 ID 포함) 우선 시도, 실패시 27개 피쳐로 재시도
        - 피쳐 순서는 모델 학습 시와 동일해야 함
    """
    try:
        model = load_xgboost_model()
        if model is None:
            print("❌ AI 모델이 로드되지 않아 예측을 수행할 수 없습니다.")
            return 0.0

        # 먼저 28개 피쳐로 시도 (업종 ID 포함)
        try:
            # 학습 데이터의 컬럼 순서대로 피쳐 배열 생성
            # 순서: Area, Adjacent_BIZ, 1A_Total, Total_LV, Business_D, Working_Pop,
            #       2A_20, 2A_30, 2A_40, 2A_50, 2A_60, 1A_20, 1A_30, 1A_40, 1A_50, 1A_60,
            #       1A_Long_Total, 2A_Long_Total, 1A_Temp_CN, 2A_Temp_CN, 2A_Temp_Total, 2A_Long_CN,
            #       Competitor_C, Competitor_R, Service, School, PubBuilding, UPTAENM

            feature_array = [
                features_dict.get("Area", 0),
                features_dict.get("Adjacent_BIZ", 0),
                features_dict.get("1A_Total", 0),
                features_dict.get("Total_LV", 0),
                features_dict.get("Business_D", 0),
                features_dict.get("Working_Pop", 0),
                features_dict.get("2A_20", 0),
                features_dict.get("2A_30", 0),
                features_dict.get("2A_40", 0),
                features_dict.get("2A_50", 0),
                features_dict.get("2A_60", 0),
                features_dict.get("1A_20", 0),
                features_dict.get("1A_30", 0),
                features_dict.get("1A_40", 0),
                features_dict.get("1A_50", 0),
                features_dict.get("1A_60", 0),
                features_dict.get("1A_Long_Total", 0),
                features_dict.get("2A_Long_Total", 0),
                features_dict.get("1A_Temp_CN", 0),
                features_dict.get("2A_Temp_CN", 0),
                features_dict.get("2A_Temp_Total", 0),
                features_dict.get("2A_Long_CN", 0),
                features_dict.get("Competitor_C", 0),
                features_dict.get("Competitor_R", 0),
                features_dict.get("Service", 0),
                features_dict.get("School", 0),
                features_dict.get("PubBuilding", 0),
                features_dict.get("UPTAENM_ID", 0),  # 업종 ID (숫자)
            ]

            print(f"🔍 AI 모델 입력 피쳐 수: {len(feature_array)} (28개, 업종 ID 포함)")
            print(f"   업종 ID: {features_dict.get('UPTAENM_ID', 0)}")

            # numpy 배열로 변환하고 2D로 reshape (1개 샘플)
            feature_array = np.array(feature_array, dtype=float).reshape(1, -1)

            # 예측 수행 (확률 반환)
            survival_probability = model.predict_proba(feature_array)[0][
                1
            ]  # 생존(1) 클래스의 확률

            print(
                f"🤖 AI 모델 예측 완료 (28개 피쳐) - 장기 생존 확률: {survival_probability:.3f} ({survival_probability*100:.1f}%)"
            )

            return float(survival_probability)

        except Exception as e28:
            print(f"⚠️ 28개 피쳐로 예측 실패: {e28}")
            print("   27개 피쳐(업종 ID 제외)로 재시도...")

            # 27개 피쳐로 재시도 (업종 ID 제외)
            feature_array = [
                features_dict.get("Area", 0),
                features_dict.get("Adjacent_BIZ", 0),
                features_dict.get("1A_Total", 0),
                features_dict.get("Total_LV", 0),
                features_dict.get("Business_D", 0),
                features_dict.get("Working_Pop", 0),
                features_dict.get("2A_20", 0),
                features_dict.get("2A_30", 0),
                features_dict.get("2A_40", 0),
                features_dict.get("2A_50", 0),
                features_dict.get("2A_60", 0),
                features_dict.get("1A_20", 0),
                features_dict.get("1A_30", 0),
                features_dict.get("1A_40", 0),
                features_dict.get("1A_50", 0),
                features_dict.get("1A_60", 0),
                features_dict.get("1A_Long_Total", 0),
                features_dict.get("2A_Long_Total", 0),
                features_dict.get("1A_Temp_CN", 0),
                features_dict.get("2A_Temp_CN", 0),
                features_dict.get("2A_Temp_Total", 0),
                features_dict.get("2A_Long_CN", 0),
                features_dict.get("Competitor_C", 0),
                features_dict.get("Competitor_R", 0),
                features_dict.get("Service", 0),
                features_dict.get("School", 0),
                features_dict.get("PubBuilding", 0),
            ]

            print(f"🔍 AI 모델 입력 피쳐 수: {len(feature_array)} (27개, 업종 ID 제외)")

            # numpy 배열로 변환하고 2D로 reshape (1개 샘플)
            feature_array = np.array(feature_array, dtype=float).reshape(1, -1)

            # 예측 수행 (확률 반환)
            survival_probability = model.predict_proba(feature_array)[0][
                1
            ]  # 생존(1) 클래스의 확률

            print(
                f"🤖 AI 모델 예측 완료 (27개 피쳐) - 장기 생존 확률: {survival_probability:.3f} ({survival_probability*100:.1f}%)"
            )

            return float(survival_probability)

    except Exception as e:
        print(f"❌ AI 모델 예측 중 오류가 발생했습니다: {e}")
        return 0.0


def index(request):
    """
    메인 페이지 뷰

    Args:
        request: HTTP 요청 객체

    Returns:
        HttpResponse: 분석 페이지 렌더링 결과

    Note:
        - 업종 목록을 조회하여 템플릿에 전달
    """
    business_types = BusinessType.objects.all().order_by("id")
    return render(
        request, "AI_Analyzer/analyze.html", {"business_types": business_types}
    )

@login_required
def analyze_page(request):
    """
    상권 분석 페이지 뷰

    Args:
        request: HTTP 요청 객체

    Returns:
        HttpResponse: 분석 페이지 렌더링 결과
    """
    
    """상권 분석 메인 페이지 - 사용자별 이전 분석 목록 포함"""
    
    user = request.user # 사용자 정보 추가

    # 사용자의 가장 최근 세션 가져오기 또는 새 세션 생성 (chatbot/views.py 로직 참조)
    try:
        session = (
            ChatSession.objects.filter(user=user)
            .order_by("-lastload_at", "-created_at")
            .first()
        )
        if not session:
            session = ChatSession.objects.create(
                user=user, session_id=get_random_string(12)
            )
    except Exception as e:
        # 혹시 문제가 있으면 새 세션 생성
        print(f"DEBUG: Error getting/creating session: {e}") # 디버깅 로그 추가
        session = ChatSession.objects.create(
            user=user, session_id=get_random_string(12)
        )

    user_info = {
        "user_id": str(user.id),  # UUID를 문자열로 변환
        "initial_session_id": session.session_id,
        "username": user.username,
    }

    print(f"DEBUG: user.id in view: {user.id}") # 디버깅 로그 추가
    print(f"DEBUG: session.session_id in view: {session.session_id}") # 디버깅 로그 추가
    print(f"DEBUG: user_info dict in view: {user_info}") # 디버깅 로그 추가

    # 이전 분석 결과를 사용자별로 조회 mk추가
    previous_docs = AnalysisResult.objects.filter(
        request__user=request.user
    ).order_by('-created_at')

    business_types = BusinessType.objects.all().order_by('id')

    # JSON 직렬화
    user_info_json = json.dumps(user_info, cls=DjangoJSONEncoder)
    previous_docs_json = json.dumps(list(previous_docs.values()), cls=DjangoJSONEncoder)

    return render(request, 'AI_Analyzer/analyze.html', {
        'business_types': business_types,
        'previous_docs': previous_docs_json,
        'user_info': user_info_json, # user_info 추가
    })



@csrf_exempt
@require_http_methods(["POST"])
def get_coordinates(request):
    """
    카카오 API를 통해 주소를 좌표로 변환

    Args:
        request: HTTP 요청 객체 (JSON body에 address 포함)

    Returns:
        JsonResponse: 성공 시 좌표 정보, 실패 시 에러 메시지

    Raises:
        400: 주소가 제공되지 않은 경우
        404: 주소를 찾을 수 없는 경우
        500: API 호출 실패 또는 기타 오류
    """
    try:
        data = json.loads(request.body)
        address = data.get("address")

        if not address:
            return JsonResponse({"error": "주소가 필요합니다."}, status=400)

        # 카카오맵 API로 좌표 가져오기
        kakao_api_key = "4b3a451741a307fa3db2b9273005146a"
        url = "https://dapi.kakao.com/v2/local/search/address.json"
        headers = {"Authorization": f"KakaoAK {kakao_api_key}"}
        params = {"query": address}

        response = requests.get(url, headers=headers, params=params)

        if response.status_code == 200:
            result = response.json()
            if result["documents"]:
                # WGS84 좌표
                longitude = float(result["documents"][0]["x"])
                latitude = float(result["documents"][0]["y"])

                # EPSG:5186으로 변환
                transformer = Transformer.from_crs(
                    "EPSG:4326", "EPSG:5186", always_xy=True
                )
                x_coord, y_coord = transformer.transform(longitude, latitude)

                return JsonResponse(
                    {
                        "success": True,
                        "longitude": longitude,
                        "latitude": latitude,
                        "x_coord": x_coord,
                        "y_coord": y_coord,
                    }
                )
            else:
                return JsonResponse({"error": "주소를 찾을 수 없습니다."}, status=404)
        else:
            return JsonResponse(
                {"error": f"카카오 API 호출 실패 (Status: {response.status_code})"},
                status=500,
            )

    except json.JSONDecodeError:
        return JsonResponse({"error": "잘못된 JSON 형식입니다."}, status=400)
    except Exception as e:
        print(f"❌ 좌표 변환 중 오류 발생: {e}")
        return JsonResponse(
            {"error": f"좌표 변환 중 오류가 발생했습니다: {str(e)}"}, status=500
        )


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def analyze_location(request):
    """
    위치 분석 수행

    Args:
        request: HTTP 요청 객체 (JSON body에 분석 데이터 포함)

    Returns:
        JsonResponse: 성공 시 분석 결과, 실패 시 에러 메시지

    Required JSON fields:
        - address: 분석할 주소
        - area: 면적(㎡)
        - business_type_id: 업종 ID
        - service_type: 서비스 유형
        - longitude, latitude: WGS84 좌표
        - x_coord, y_coord: EPSG:5186 좌표

    Raises:
        400: 필수 필드 누락 또는 잘못된 JSON
        404: 업종을 찾을 수 없는 경우
        500: 분석 중 오류 발생
    """
    try:
        # 원본 AI_Analyzer와 같이 JSON 데이터로 받기
        data = json.loads(request.body)

        # 디버깅: 전체 JSON 데이터 출력
        print(f"🔍 [DEBUG] 받은 JSON 데이터: {data}")
        print(f"🔍 [DEBUG] Content-Type: {request.content_type}")

        # 입력 데이터 검증 - 원본 AI_Analyzer 변수명 사용
        required_fields = [
            "address",
            "area",
            "business_type_id",
            "service_type",
            "longitude",
            "latitude",
            "x_coord",
            "y_coord",
        ]
        for field in required_fields:
            if field not in data:
                print(f"❌ [ERROR] 필수 필드 누락: {field}")
                return JsonResponse({"error": f"{field}가 필요합니다."}, status=400)

        # 데이터 추출
        business_type_id = data["business_type_id"]
        address = data["address"]
        area = data["area"]
        service_type = data["service_type"]
        longitude = data["longitude"]
        latitude = data["latitude"]
        x_coord = data["x_coord"]
        y_coord = data["y_coord"]

        # 디버깅: 추출된 값들 출력
        print(f"🔍 [DEBUG] 추출된 값들:")
        print(f"   business_type_id: {business_type_id}")
        print(f"   address: {address}")
        print(f"   area: {area}")
        print(f"   service_type: {service_type}")
        print(f"   x_coord: {x_coord}")
        print(f"   y_coord: {y_coord}")
        print(f"   longitude: {longitude}")
        print(f"   latitude: {latitude}")

        # 분석 요청 저장 - 원본 AI_Analyzer와 동일
        try:
            business_type = BusinessType.objects.get(id=business_type_id)
        except BusinessType.DoesNotExist:
            print(f"❌ [ERROR] 업종을 찾을 수 없습니다: ID {business_type_id}")
            return JsonResponse(
                {"error": f"업종 ID {business_type_id}를 찾을 수 없습니다."}, status=404
            )

        analysis_request = AnalysisRequest.objects.create(
            user=request.user,  # 현재 로그인한 사용자로 설정 mk추가
            address=address,
            area=float(area),
            business_type=business_type,
            service_type=int(service_type),
            longitude=float(longitude),
            latitude=float(latitude),
            x_coord=float(x_coord),
            y_coord=float(y_coord),
        )

        # 공간 분석 수행
        result = perform_spatial_analysis(analysis_request)

        return JsonResponse(
            {"success": True, "request_id": analysis_request.id, "result": result}
        )

    except json.JSONDecodeError:
        print("❌ [ERROR] 잘못된 JSON 형식")
        return JsonResponse({"error": "잘못된 JSON 형식입니다."}, status=400)
    except ValueError as e:
        print(f"❌ [ERROR] 데이터 타입 변환 오류: {e}")
        return JsonResponse(
            {"error": f"데이터 형식이 잘못되었습니다: {str(e)}"}, status=400
        )
    except Exception as e:
        print(f"❌ [ERROR] 분석 요청 중 예상치 못한 오류 발생: {e}")
        import traceback

        print(f"❌ [ERROR] 스택 트레이스: {traceback.format_exc()}")
        return JsonResponse(
            {"error": f"분석 요청 중 오류가 발생했습니다: {str(e)}"}, status=500
        )


@transaction.atomic
def perform_spatial_analysis(analysis_request):
    """
    실제 공간 분석 수행

    Args:
        analysis_request (AnalysisRequest): 분석 요청 객체

    Returns:
        dict: 분석 결과 데이터

    Note:
        - 생활인구, 직장인구, 외국인, 시설, 경쟁업체, 공시지가 등을 종합 분석
        - 데이터베이스 락 발생 시 최대 3회 재시도
        - AI 모델을 통한 생존 확률 예측 포함

    Raises:
        Exception: 데이터베이스 접속 실패 또는 분석 오류
    """
    import time

    # 전체 분석 시작 시간
    analysis_start_time = time.time()
    step_times = {}  # 각 단계별 소요 시간 저장

    print(f"\n🚀 === 상권분석 시작 === 요청 ID: {analysis_request.id}")
    print(f"📍 좌표: ({analysis_request.x_coord}, {analysis_request.y_coord})")
    print(f"📍 주소: {analysis_request.address}")
    print(
        f"📏 면적: {analysis_request.area}㎡, 업종: {analysis_request.business_type.name}"
    )

    x_coord = analysis_request.x_coord
    y_coord = analysis_request.y_coord
    area = analysis_request.area
    business_type_id = analysis_request.business_type.id
    service_type = analysis_request.service_type

    # 재시도 로직 추가
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            with connection.cursor() as cursor:
                results = {}

                print("\n📊 [1/6] 생활인구 분석 시작...")
                step_start = time.time()
                # 1. 생활인구 분석 (300m)
                try:
                    cursor.execute(
                        f"""
                        SELECT 
                            COALESCE(SUM("총생활인구수"), 0) as total_pop,
                            COALESCE(SUM("20대"), 0) as pop_20,
                            COALESCE(SUM("30대"), 0) as pop_30,
                            COALESCE(SUM("40대"), 0) as pop_40,
                            COALESCE(SUM("50대"), 0) as pop_50,
                            COALESCE(SUM("60대"), 0) as pop_60
                        FROM life_pop_grid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """
                    )

                    row = cursor.fetchone()
                    total_pop_300m = row[0] if row[0] else 0

                    results.update(
                        {
                            "life_pop_300m": int(total_pop_300m),
                            "life_pop_20_300m": round(
                                (
                                    (row[1] / total_pop_300m * 100)
                                    if total_pop_300m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_30_300m": round(
                                (
                                    (row[2] / total_pop_300m * 100)
                                    if total_pop_300m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_40_300m": round(
                                (
                                    (row[3] / total_pop_300m * 100)
                                    if total_pop_300m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_50_300m": round(
                                (
                                    (row[4] / total_pop_300m * 100)
                                    if total_pop_300m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_60_300m": round(
                                (
                                    (row[5] / total_pop_300m * 100)
                                    if total_pop_300m > 0
                                    else 0
                                ),
                                2,
                            ),
                        }
                    )
                    print(f"   ✅ 300m 생활인구: {int(total_pop_300m):,}명")
                except Exception as e:
                    print(f"   ❌ 생활인구 300m 분석 중 데이터베이스 오류: {e}")
                    results.update(
                        {
                            "life_pop_300m": 0,
                            "life_pop_20_300m": 0,
                            "life_pop_30_300m": 0,
                            "life_pop_40_300m": 0,
                            "life_pop_50_300m": 0,
                            "life_pop_60_300m": 0,
                        }
                    )

                # 각 쿼리 사이에 작은 지연 추가
                time.sleep(0.1)

                # 2. 생활인구 분석 (1000m)
                try:
                    cursor.execute(
                        f"""
                        SELECT 
                            COALESCE(SUM("총생활인구수"), 0) as total_pop,
                            COALESCE(SUM("20대"), 0) as pop_20,
                            COALESCE(SUM("30대"), 0) as pop_30,
                            COALESCE(SUM("40대"), 0) as pop_40,
                            COALESCE(SUM("50대"), 0) as pop_50,
                            COALESCE(SUM("60대"), 0) as pop_60
                        FROM life_pop_grid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                    """
                    )

                    row = cursor.fetchone()
                    total_pop_1000m = row[0] if row[0] else 0

                    results.update(
                        {
                            "life_pop_20_1000m": round(
                                (
                                    (row[1] / total_pop_1000m * 100)
                                    if total_pop_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_30_1000m": round(
                                (
                                    (row[2] / total_pop_1000m * 100)
                                    if total_pop_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_40_1000m": round(
                                (
                                    (row[3] / total_pop_1000m * 100)
                                    if total_pop_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_50_1000m": round(
                                (
                                    (row[4] / total_pop_1000m * 100)
                                    if total_pop_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "life_pop_60_1000m": round(
                                (
                                    (row[5] / total_pop_1000m * 100)
                                    if total_pop_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                        }
                    )
                    print(f"   ✅ 1000m 생활인구: {int(total_pop_1000m):,}명")
                except Exception as e:
                    print(f"   ❌ 생활인구 1000m 분석 중 데이터베이스 오류: {e}")
                    results.update(
                        {
                            "life_pop_20_1000m": 0,
                            "life_pop_30_1000m": 0,
                            "life_pop_40_1000m": 0,
                            "life_pop_50_1000m": 0,
                            "life_pop_60_1000m": 0,
                        }
                    )

                time.sleep(0.1)
                step_times["생활인구_분석"] = time.time() - step_start
                print(
                    f"✅ [1/6] 생활인구 분석 완료 ({step_times['생활인구_분석']:.2f}초)"
                )

                print("\n👔 [2/6] 직장인구 분석 시작...")
                step_start = time.time()
                # 3. 직장인구 분석 (300m)
                try:
                    cursor.execute(
                        f"""
                        SELECT COALESCE(SUM("총_직장_인구_수"), 0) as working_pop
                        FROM workgrid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """
                    )

                    row = cursor.fetchone()
                    working_pop = int(row[0]) if row[0] else 0
                    results["working_pop_300m"] = working_pop
                    print(f"   ✅ 300m 직장인구: {working_pop:,}명")
                except Exception as e:
                    print(f"   ❌ 직장인구 분석 중 데이터베이스 오류: {e}")
                    results["working_pop_300m"] = 0

                time.sleep(0.1)
                step_times["직장인구_분석"] = time.time() - step_start
                print(
                    f"✅ [2/6] 직장인구 분석 완료 ({step_times['직장인구_분석']:.2f}초)"
                )

                # 4. 단기체류외국인 분석
                try:
                    print(f"\n🌍 [3/6] 외국인 분석 시작...")
                    step_start = time.time()
                    print(f"=== 단기체류외국인 분석 시작 ===")
                    print(f"테스트 좌표: ({x_coord}, {y_coord})")

                    # 새로운 테이블명을 우선순위로
                    foreign_tables = [
                        "temp_25m_5186",
                        "temp_foreign_25m_5186",
                        "_단기체류외국인_25m_5186",
                        "단기체류외국인_25m_5186",
                    ]
                    temp_total_1000m = 0
                    temp_cn_1000m = 0
                    temp_cn_300m = 0
                    used_table = None

                    # 사용 가능한 테이블 확인
                    for table_name in foreign_tables:
                        try:
                            # 테이블 존재 여부 확인 (PostgreSQL 문법)
                            cursor.execute(
                                """
                                SELECT EXISTS (
                                    SELECT FROM pg_catalog.pg_tables 
                                    WHERE schemaname = 'public' 
                                    AND tablename = %s
                                )
                            """,
                                [table_name],
                            )

                            if not cursor.fetchone()[0]:
                                print(f"테이블 {table_name}: 존재하지 않음")
                                continue

                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            table_count = cursor.fetchone()[0]
                            print(f"테이블 {table_name}: {table_count:,}개 레코드 존재")

                            if table_count == 0:
                                print(f"테이블 {table_name}: 데이터가 없음")
                                continue

                            # 1000m 쿼리 - 총수와 중국인수 조회
                            cursor.execute(
                                f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as temp_total,
                                       COALESCE(SUM("중국인체류인구수"), 0) as temp_cn
                                FROM {table_name} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                            """
                            )
                            row = cursor.fetchone()
                            temp_total_1000m = row[0] if row[0] else 0
                            temp_cn_1000m = row[1] if row[1] else 0
                            print(
                                f"단기체류외국인 1000m - 테이블 {table_name} 사용: 총 {temp_total_1000m}명, 중국인 {temp_cn_1000m}명"
                            )

                            used_table = table_name
                            break
                        except Exception as e:
                            print(f"단기체류외국인 테이블 {table_name} 시도 실패: {e}")
                            continue

                    if not used_table:
                        print(
                            "❌ 사용 가능한 단기체류외국인 테이블이 없습니다. 기본값 0 사용"
                        )

                    time.sleep(0.1)

                    # 300m 내 중국인 (같은 테이블 사용)
                    if used_table:
                        try:
                            cursor.execute(
                                f"""
                                SELECT COALESCE(SUM("중국인체류인구수"), 0) as temp_cn
                                FROM {used_table} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            """
                            )
                            row = cursor.fetchone()
                            temp_cn_300m = row[0] if row[0] else 0
                            print(
                                f"단기체류외국인 300m - 테이블 {used_table} 사용: 중국인 {temp_cn_300m}명"
                            )
                        except Exception as e:
                            print(f"단기체류외국인 300m 쿼리 실패: {e}")
                            temp_cn_300m = 0

                    results.update(
                        {
                            "temp_foreign_1000m": int(temp_total_1000m),
                            "temp_foreign_cn_300m": round(
                                (
                                    (temp_cn_300m / temp_total_1000m * 100)
                                    if temp_total_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                            "temp_foreign_cn_1000m": round(
                                (
                                    (temp_cn_1000m / temp_total_1000m * 100)
                                    if temp_total_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                        }
                    )
                    print(
                        f"   ✅ 단기체류외국인 분석 완료: 1000m {int(temp_total_1000m):,}명"
                    )
                except Exception as e:
                    print(f"단기체류외국인 전체 분석 오류: {e}")
                    results.update(
                        {
                            "temp_foreign_1000m": 0,
                            "temp_foreign_cn_300m": 0,
                            "temp_foreign_cn_1000m": 0,
                        }
                    )

                time.sleep(0.1)

                # 5. 장기체류외국인 분석
                try:
                    print(f"=== 장기체류외국인 분석 시작 ===")

                    # 새로운 테이블명을 우선순위로
                    long_tables = [
                        "long_25m_5186",
                        "long_foreign_25m_5186",
                        "_장기체류외국인_25m_5186",
                        "장기체류외국인_25m_5186",
                    ]
                    long_total_300m = 0
                    long_total_1000m = 0
                    long_cn_1000m = 0
                    used_table = None

                    # 사용 가능한 테이블 확인 및 300m 쿼리
                    for table_name in long_tables:
                        try:
                            # 테이블 존재 여부 확인 (PostgreSQL 문법)
                            cursor.execute(
                                """
                                SELECT EXISTS (
                                    SELECT FROM pg_catalog.pg_tables 
                                    WHERE schemaname = 'public' 
                                    AND tablename = %s
                                )
                            """,
                                [table_name],
                            )

                            if not cursor.fetchone()[0]:
                                print(f"테이블 {table_name}: 존재하지 않음")
                                continue

                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            table_count = cursor.fetchone()[0]
                            print(f"테이블 {table_name}: {table_count:,}개 레코드 존재")

                            if table_count == 0:
                                print(f"테이블 {table_name}: 데이터가 없음")
                                continue

                            # 300m 쿼리 - 총수 조회
                            cursor.execute(
                                f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as long_total
                                FROM {table_name} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            """
                            )
                            row = cursor.fetchone()
                            long_total_300m = row[0] if row[0] else 0
                            print(
                                f"장기체류외국인 300m - 테이블 {table_name} 사용: {long_total_300m}명"
                            )

                            used_table = table_name
                            break
                        except Exception as e:
                            print(f"장기체류외국인 테이블 {table_name} 시도 실패: {e}")
                            continue

                    if not used_table:
                        print(
                            "❌ 사용 가능한 장기체류외국인 테이블이 없습니다. 기본값 0 사용"
                        )

                    time.sleep(0.1)

                    # 1000m 쿼리 (같은 테이블 사용) - 총수와 중국인수 조회
                    if used_table:
                        try:
                            cursor.execute(
                                f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as long_total,
                                       COALESCE(SUM("중국인체류인구수"), 0) as long_cn
                                FROM {used_table} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                            """
                            )
                            row = cursor.fetchone()
                            long_total_1000m = row[0] if row[0] else 0
                            long_cn_1000m = row[1] if row[1] else 0
                            print(
                                f"장기체류외국인 1000m - 테이블 {used_table} 사용: 총 {long_total_1000m}명, 중국인 {long_cn_1000m}명"
                            )
                        except Exception as e:
                            print(f"장기체류외국인 1000m 쿼리 실패: {e}")
                            long_total_1000m = 0
                            long_cn_1000m = 0

                    results.update(
                        {
                            "long_foreign_300m": int(long_total_300m),
                            "long_foreign_1000m": int(long_total_1000m),
                            "long_foreign_cn_1000m": round(
                                (
                                    (long_cn_1000m / long_total_1000m * 100)
                                    if long_total_1000m > 0
                                    else 0
                                ),
                                2,
                            ),
                        }
                    )
                    print(
                        f"   ✅ 장기체류외국인 분석 완료: 300m {int(long_total_300m):,}명, 1000m {int(long_total_1000m):,}명"
                    )
                except Exception as e:
                    print(f"장기체류외국인 전체 분석 오류: {e}")
                    results.update(
                        {
                            "long_foreign_300m": 0,
                            "long_foreign_1000m": 0,
                            "long_foreign_cn_1000m": 0,
                        }
                    )

                time.sleep(0.1)
                print("✅ [3/6] 외국인 분석 완료")

                print("\n🏢 [4/6] 주변시설 분석 시작...")
                # 6. 공공건물 분석 (250m)
                try:
                    cursor.execute(
                        f"""
                        SELECT COUNT(*) as pub_count
                        FROM public_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 250))
                    """
                    )
                    row = cursor.fetchone()
                    pub_count = int(row[0]) if row[0] else 0
                    results["public_building_250m"] = pub_count
                    print(f"   ✅ 250m 공공건물: {pub_count}개")
                except Exception as e:
                    print(f"   ❌ 공공건물 분석 오류: {e}")
                    results["public_building_250m"] = 0

                time.sleep(0.1)

                # 7. 학교 분석 (250m)
                try:
                    cursor.execute(
                        f"""
                        SELECT COUNT(*) as school_count
                        FROM school_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 250))
                    """
                    )
                    row = cursor.fetchone()
                    school_count = int(row[0]) if row[0] else 0
                    results["school_250m"] = school_count
                    print(f"   ✅ 250m 학교: {school_count}개")
                except Exception as e:
                    print(f"   ❌ 학교 분석 오류: {e}")
                    results["school_250m"] = 0

                time.sleep(0.1)
                print("✅ [4/6] 주변시설 분석 완료")

                print("\n🏪 [5/6] 경쟁업체 분석 시작...")
                # 8. 상권 분석 (300m)
                try:
                    # BusinessType에서 업종명 가져오기
                    business_type_name = analysis_request.business_type.name
                    print(
                        f"   검색 대상 업종: {business_type_name} (ID: {business_type_id})"
                    )

                    # 동일 업종 경쟁업체 - 업종명으로 매칭
                    cursor.execute(
                        f"""
                        SELECT COUNT(*) as competitor_count
                        FROM store_point_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                          AND uptaenm = '{business_type_name}'
                    """
                    )
                    row = cursor.fetchone()
                    competitor_count = int(row[0]) if row[0] else 0

                    time.sleep(0.1)

                    # 전체 요식업체
                    cursor.execute(
                        f"""
                        SELECT COUNT(*) as total_biz,
                               COUNT(DISTINCT uptaenm) as diversity
                        FROM store_point_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """
                    )
                    row = cursor.fetchone()
                    total_biz = int(row[0]) if row[0] else 0
                    diversity = int(row[1]) if row[1] else 0

                    # 디버깅: 주변 업종들 출력
                    if competitor_count == 0:
                        print(
                            f"   ⚠️  '{business_type_name}' 업종 경쟁업체가 0개입니다."
                        )
                        print("   주변 업종들 확인 중...")
                        cursor.execute(
                            f"""
                            SELECT uptaenm, COUNT(*) as count
                            FROM store_point_5186 
                            WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            GROUP BY uptaenm
                            ORDER BY count DESC
                            LIMIT 5
                        """
                        )
                        nearby_types = cursor.fetchall()
                        for uptae, count in nearby_types:
                            print(f"     - {uptae}: {count}개")

                    results.update(
                        {
                            "competitor_300m": competitor_count,
                            "adjacent_biz_300m": total_biz,
                            "competitor_ratio_300m": round(
                                (
                                    (competitor_count / total_biz * 100)
                                    if total_biz > 0
                                    else 0
                                ),
                                2,
                            ),
                            "business_diversity_300m": diversity,
                        }
                    )
                    print(
                        f"   ✅ 300m 경쟁업체: {competitor_count}개 / 전체 {total_biz}개 (비율: {round((competitor_count / total_biz * 100) if total_biz > 0 else 0, 1)}%)"
                    )
                except Exception as e:
                    print(f"   ❌ 상권 분석 오류: {e}")
                    results.update(
                        {
                            "competitor_300m": 0,
                            "adjacent_biz_300m": 0,
                            "competitor_ratio_300m": 0,
                            "business_diversity_300m": 0,
                        }
                    )

                time.sleep(0.1)
                print("✅ [5/6] 경쟁업체 분석 완료")

                print("\n💰 [6/6] 공시지가 분석 시작...")
                # 6. 공시지가 분석
                print("\n💰 [6/6] 공시지가 분석 시작...")
                try:
                    cursor.execute(
                        f"""
                        SELECT COALESCE("A9", 0) as land_price
                        FROM ltv_5186
                        WHERE ST_Intersects(
                            ltv_5186.geom,
                            ST_Buffer(
                                ST_SetSRID(ST_GeomFromText('POINT({x_coord} {y_coord})'), 900914),
                                300
                            )
                        )
                        ORDER BY ST_Distance(
                            ltv_5186.geom,
                            ST_SetSRID(ST_GeomFromText('POINT({x_coord} {y_coord})'), 900914)
                        )
                        LIMIT 1
                    """
                    )
                    row = cursor.fetchone()
                    land_price = row[0] if row[0] else 0
                    total_land_value = land_price * area
                    results.update({
                        "total_land_value": total_land_value,
                    })
                    print(f"   ✅ 공시지가: {land_price:,.0f}원/㎡")
                    print(f"   ✅ 총 공시지가: {total_land_value:,.0f}원")
                except Exception as e:
                    print(f"   ❌ 공시지가 분석 오류: {e}")
                    results.update({
                        "total_land_value": 0,
                    })

                # 기본 정보 추가
                results.update(
                    {
                        "area": area,
                        "service_type": service_type,
                    }
                )

                # 다른 페이지에서 사용할 수 있도록 변수명 매핑
                print(f"📋 변수 매핑 중...")

                # 생활인구 관련 (300m = 1A, 1000m = 2A)
                _1A_Total = results["life_pop_300m"]  # 300m내 총생활인구
                _1A_20 = results["life_pop_20_300m"]  # 300m내 20대 비율(%)
                _1A_30 = results["life_pop_30_300m"]  # 300m내 30대 비율(%)
                _1A_40 = results["life_pop_40_300m"]  # 300m내 40대 비율(%)
                _1A_50 = results["life_pop_50_300m"]  # 300m내 50대 비율(%)
                _1A_60 = results["life_pop_60_300m"]  # 300m내 60대 비율(%)
                _2A_20 = results["life_pop_20_1000m"]  # 1000m내 20대 비율(%)
                _2A_30 = results["life_pop_30_1000m"]  # 1000m내 30대 비율(%)
                _2A_40 = results["life_pop_40_1000m"]  # 1000m내 40대 비율(%)
                _2A_50 = results["life_pop_50_1000m"]  # 1000m내 50대 비율(%)
                _2A_60 = results["life_pop_60_1000m"]  # 1000m내 60대 비율(%)

                # 외국인 관련
                _1A_Temp_CN = results[
                    "temp_foreign_cn_300m"
                ]  # 300m내 단기체류 중국인 비율(%)
                _2A_Temp_Total = results[
                    "temp_foreign_1000m"
                ]  # 1000m내 단기체류외국인 총수
                _2A_Temp_CN = results[
                    "temp_foreign_cn_1000m"
                ]  # 1000m내 단기체류 중국인 비율(%)
                _1A_Long_Total = results[
                    "long_foreign_300m"
                ]  # 300m내 장기체류외국인 총수
                _2A_Long_Total = results[
                    "long_foreign_1000m"
                ]  # 1000m내 장기체류외국인 총수
                _2A_Long_CN = results[
                    "long_foreign_cn_1000m"
                ]  # 1000m내 장기체류 중국인 비율(%)

                # 직장인구 및 시설
                Working_Pop = results["working_pop_300m"]  # 300m내 직장인구
                PubBuilding = results["public_building_250m"]  # 250m내 공공건물 수
                School = results["school_250m"]  # 250m내 학교 수

                # 경쟁업체 관련
                Competitor_C = results["competitor_300m"]  # 300m내 동일업종 경쟁업체 수
                Competitor_R = results[
                    "competitor_ratio_300m"
                ]  # 300m내 경쟁업체 비율(%)
                Adjacent_BIZ = results["adjacent_biz_300m"]  # 300m내 전체 요식업체 수
                Business_D = results["business_diversity_300m"]  # 300m내 업종 다양성

                # 기본 정보
                Area = results["area"]  # 면적(㎡)
                Total_LV = results["total_land_value"]  # 총 공시지가
                Service = results[
                    "service_type"
                ]  # 서비스 유형 (0:휴게음식점, 1:일반음식점)

                # 변수 매핑 완료 로그
                print(f"✅ 변수 매핑 완료:")
                print(f"   생활인구: 1A_Total={_1A_Total:,}명")
                print(
                    f"   외국인: 2A_Temp_Total={_2A_Temp_Total:,}명, 1A_Long_Total={_1A_Long_Total:,}명"
                )
                print(f"   직장인구: Working_Pop={Working_Pop:,}명")
                print(
                    f"   경쟁업체: Competitor_C={Competitor_C}개 (비율 {Competitor_R}%)"
                )
                print(f"   면적/지가: Area={Area}㎡, Total_LV={Total_LV:,.0f}원")

                # AI 모델을 이용한 장기 생존 확률 예측
                print("\n🤖 [AI 예측] 장기 생존 확률 분석 시작...")
                features_for_ai = {
                    "Area": Area,
                    "Adjacent_BIZ": Adjacent_BIZ,
                    "1A_Total": _1A_Total,
                    "Total_LV": Total_LV,
                    "Business_D": Business_D,
                    "Working_Pop": Working_Pop,
                    "2A_20": _2A_20,
                    "2A_30": _2A_30,
                    "2A_40": _2A_40,
                    "2A_50": _2A_50,
                    "2A_60": _2A_60,
                    "1A_20": _1A_20,
                    "1A_30": _1A_30,
                    "1A_40": _1A_40,
                    "1A_50": _1A_50,
                    "1A_60": _1A_60,
                    "1A_Long_Total": _1A_Long_Total,
                    "2A_Long_Total": _2A_Long_Total,
                    "1A_Temp_CN": _1A_Temp_CN,
                    "2A_Temp_CN": _2A_Temp_CN,
                    "2A_Temp_Total": _2A_Temp_Total,
                    "2A_Long_CN": _2A_Long_CN,
                    "Competitor_C": Competitor_C,
                    "Competitor_R": Competitor_R,
                    "Service": Service,
                    "School": School,
                    "PubBuilding": PubBuilding,
                    "UPTAENM_ID": business_type_id,  # 업종 ID (숫자)로 변경
                }

                survival_probability = predict_survival_probability(features_for_ai)
                survival_percentage = round(survival_probability * 100, 1)

                # AI 예측 결과를 results에 추가
                results.update(
                    {
                        "survival_probability": survival_probability,
                        "survival_percentage": survival_percentage,
                    }
                )

                print(f"\n💾 분석 결과 저장 중...")
                # 분석 결과 저장 (AI 예측 결과 포함)
                AnalysisResult.objects.create(request=analysis_request, **results)

                print(f"🎉 === 상권분석 완료 === 요청 ID: {analysis_request.id}")
                print(f"📊 생활인구: {results['life_pop_300m']:,}명")
                print(f"👔 직장인구: {results['working_pop_300m']:,}명")
                print(
                    f"🌍 외국인: 단기 {results['temp_foreign_1000m']:,}명, 장기 {results['long_foreign_300m']:,}명"
                )
                print(f"🏪 경쟁업체: {results['competitor_300m']:,}개")
                print(f"💰 토지가치: {results['total_land_value']:,.0f}원")
                print(f"🤖 AI 예측 생존확률: {survival_percentage}%")

                # 새로운 변수들을 results에 추가하여 반환
                results.update(
                    {
                        # 생활인구 관련 변수들
                        "1A_Total": _1A_Total,
                        "1A_20": _1A_20,
                        "1A_30": _1A_30,
                        "1A_40": _1A_40,
                        "1A_50": _1A_50,
                        "1A_60": _1A_60,
                        "2A_20": _2A_20,
                        "2A_30": _2A_30,
                        "2A_40": _2A_40,
                        "2A_50": _2A_50,
                        "2A_60": _2A_60,
                        # 외국인 관련 변수들
                        "1A_Temp_CN": _1A_Temp_CN,
                        "2A_Temp_Total": _2A_Temp_Total,
                        "2A_Temp_CN": _2A_Temp_CN,
                        "1A_Long_Total": _1A_Long_Total,
                        "2A_Long_Total": _2A_Long_Total,
                        "2A_Long_CN": _2A_Long_CN,
                        # 직장인구 및 시설 변수들
                        "Working_Pop": Working_Pop,
                        "PubBuilding": PubBuilding,
                        "School": School,
                        # 경쟁업체 관련 변수들
                        "Competitor_C": Competitor_C,
                        "Competitor_R": Competitor_R,
                        "Adjacent_BIZ": Adjacent_BIZ,
                        "Business_D": Business_D,
                        # 기본 정보 변수들
                        "Area": Area,
                        "Total_LV": Total_LV,
                        "Service": Service,
                        # 좌표 정보 (추가 요청사항)
                        "X_Coord": x_coord,
                        "Y_Coord": y_coord,
                    }
                )

                return results

        except Exception as e:
            error_msg = str(e).lower()
            if "database is locked" in error_msg and retry_count < max_retries - 1:
                retry_count += 1
                print(
                    f"⚠️ 데이터베이스 락 오류 발생, 재시도 {retry_count}/{max_retries}"
                )
                time.sleep(2**retry_count)  # 지수 백오프
                continue
            elif "no such table" in error_msg:
                print(f"❌ 데이터베이스 테이블을 찾을 수 없습니다: {e}")
                raise Exception(
                    "필요한 공간 데이터 테이블을 찾을 수 없습니다. 관리자에게 문의하세요."
                )
            elif "syntax error" in error_msg:
                print(f"❌ SQL 구문 오류: {e}")
                raise Exception(
                    "데이터베이스 쿼리 오류가 발생했습니다. 관리자에게 문의하세요."
                )
            else:
                print(f"❌ 공간 분석 중 예상치 못한 오류 발생: {e}")
                raise Exception(f"공간 분석 중 오류가 발생했습니다: {str(e)}")

    # 모든 재시도가 실패한 경우
    raise Exception(
        "데이터베이스 락으로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요."
    )

@login_required # mk추가
def result_detail(request, request_id):
    """
    분석 결과 상세 페이지 뷰

    Args:
        request: HTTP 요청 객체
        request_id (int): 분석 요청 ID

    Returns:
        HttpResponse: 결과 페이지 또는 에러 페이지 렌더링
    """
    try:
        analysis_request = AnalysisRequest.objects.get(id=request_id)

        # ✅ 접근 제한: 다른 사용자 결과 접근 방지
        if analysis_request.user != request.user:
            print(f"⚠️ 다른 사용자의 결과에 접근 시도: {request.user} → {analysis_request.user}")
            return render(request, 'AI_Analyzer/error.html', {
                'error': '해당 분석 결과에 접근할 수 없습니다.'
            })

        analysis_result = AnalysisResult.objects.get(request=analysis_request)

        return render(
            request,
            "AI_Analyzer/result.html",
            {"request": analysis_request, "result": analysis_result},
        )
    except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
        print(f"❌ 분석 결과를 찾을 수 없습니다: ID {request_id}")
        return render(
            request,
            "AI_Analyzer/error.html",
            {"error": "분석 결과를 찾을 수 없습니다."},
        )


@csrf_exempt
def get_analysis_result_api(request, request_id):
    """
    분석 결과를 JSON으로 반환하는 API

    Args:
        request: HTTP 요청 객체
        request_id (int): 분석 요청 ID

    Returns:
        JsonResponse: 분석 결과 데이터 또는 에러 메시지

    Raises:
        404: 분석 결과를 찾을 수 없는 경우
        500: 데이터 조회 중 오류 발생
    """
    try:
        analysis_request = AnalysisRequest.objects.get(id=request_id)
        analysis_result = AnalysisResult.objects.get(request=analysis_request)

        # 서비스 유형명 변환
        service_type_map = {0: "휴게음식점", 1: "일반음식점"}
        service_type_name = service_type_map.get(analysis_request.service_type, "알 수 없음")

        result_data = {
            "request": {
                "address": analysis_request.address,
                "business_type": analysis_request.business_type.name,  # 업종명 반환
                "area": float(analysis_request.area),
                "service_type": service_type_name,  # 한글명 반환
                "created_at": analysis_request.created_at.isoformat(),
            },
            "result": {
                "life_pop_300m": float(analysis_result.life_pop_300m or 0),
                "working_pop_300m": float(analysis_result.working_pop_300m or 0),
                "competitor_300m": analysis_result.competitor_300m or 0,
                "total_land_value": float(analysis_result.total_land_value or 0),
                "survival_percentage": float(analysis_result.survival_percentage or 0),
                "adjacent_biz_300m": analysis_result.adjacent_biz_300m or 0,
                "competitor_ratio_300m": float(
                    analysis_result.competitor_ratio_300m or 0
                ),
                "business_diversity_300m": analysis_result.business_diversity_300m or 0,
                "public_building_250m": analysis_result.public_building_250m or 0,
                "school_250m": analysis_result.school_250m or 0,
                "temp_foreign_1000m": analysis_result.temp_foreign_1000m or 0,
                "long_foreign_1000m": analysis_result.long_foreign_1000m or 0,
                "temp_foreign_cn_300m": float(
                    analysis_result.temp_foreign_cn_300m or 0
                ),
                "long_foreign_cn_1000m": float(
                    analysis_result.long_foreign_cn_1000m or 0
                ),
            },
        }

        return JsonResponse(result_data)

    except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
        print(f"❌ API: 분석 결과를 찾을 수 없습니다: ID {request_id}")
        return JsonResponse({"error": "분석 결과를 찾을 수 없습니다."}, status=404)
    except Exception as e:
        print(f"❌ API: 결과 조회 중 오류 발생: {e}")
        return JsonResponse(
            {"error": f"결과 조회 중 오류가 발생했습니다: {str(e)}"}, status=500
        )


@staff_member_required
def database_info(request):
    """
    SpatiaLite 데이터베이스 정보 보기 (관리자 전용)

    Args:
        request: HTTP 요청 객체

    Returns:
        HttpResponse: 데이터베이스 정보 페이지 렌더링

    Note:
        - 테이블 목록, 공간 참조 시스템, 지오메트리 컬럼 정보 등 제공
        - 관리자 권한 필요
    """
    with connection.cursor() as cursor:
        # 테이블 정보
        cursor.execute(
            """
            SELECT table_name, table_type, table_schema
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_type IN ('BASE TABLE', 'VIEW')
            AND table_name NOT LIKE 'pg_%'
            AND table_name NOT LIKE 'sql_%'
            ORDER BY table_name
        """
        )
        tables = cursor.fetchall()

        # 공간 참조 시스템 정보
        try:
            cursor.execute(
                """
                SELECT srid, auth_name, auth_srid, ref_sys_name, proj4text 
                FROM spatial_ref_sys 
                WHERE srid IN (4326, 5186)
                ORDER BY srid
            """
            )
            spatial_refs = cursor.fetchall()
        except:
            spatial_refs = []

        # 지오메트리 컬럼 정보
        try:
            cursor.execute(
                """
                SELECT f_table_name, f_geometry_column, coord_dimension, srid, type 
                FROM geometry_columns 
                ORDER BY f_table_name
            """
            )
            geometry_columns = cursor.fetchall()
        except:
            geometry_columns = []

        # 공간 테이블들 정보 (재시도 로직 포함)
        spatial_tables = [
            ["life_pop_grid_10m_5186"],
            ["workgrid_10m_5186"],
            [
                "temp_25m_5186",
                "temp_foreign_25m_5186",
                "_단기체류외국인_25m_5186",
                "단기체류외국인_25m_5186",
            ],
            [
                "long_25m_5186",
                "long_foreign_25m_5186",
                "_장기체류외국인_25m_5186",
                "장기체류외국인_25m_5186",
            ],
            ["store_point_5186"],
            ["school_5186"],
            ["ltv_5186"],
            ["public_5186"],
        ]

        spatial_table_counts = {}
        for table_group in spatial_tables:
            found = False
            for table_name in table_group:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    if table_name in [
                        "temp_25m_5186",
                        "temp_foreign_25m_5186",
                        "_단기체류외국인_25m_5186",
                        "단기체류외국인_25m_5186",
                    ]:
                        spatial_table_counts["temp_25m_5186"] = count
                    elif table_name in [
                        "long_25m_5186",
                        "long_foreign_25m_5186",
                        "_장기체류외국인_25m_5186",
                        "장기체류외국인_25m_5186",
                    ]:
                        spatial_table_counts["long_25m_5186"] = count
                    else:
                        spatial_table_counts[table_name] = count
                    found = True
                    break
                except:
                    continue

            if not found:
                # 첫 번째 테이블명으로 0값 저장
                primary_table = table_group[0]
                if "temp" in primary_table.lower():
                    spatial_table_counts["temp_25m_5186"] = 0
                elif "long" in primary_table.lower():
                    spatial_table_counts["long_25m_5186"] = 0
                else:
                    spatial_table_counts[primary_table] = 0

    context = {
        "tables": tables,
        "spatial_refs": spatial_refs,
        "geometry_columns": geometry_columns,
        "spatial_table_counts": spatial_table_counts,
    }

    return render(request, "admin/database_info.html", context)


@csrf_exempt
def get_pdf_data(request, request_id):
    """
    PDF 생성을 위한 분석 결과 데이터 제공 (jsPDF용)

    Args:
        request: HTTP 요청 객체
        request_id (int): 분석 요청 ID

    Returns:
        JsonResponse: PDF 생성용 데이터 또는 에러 메시지

    Note:
        - 클라이언트 사이드 jsPDF 라이브러리용 데이터 포맷
        - 생존 확률에 따른 분석 텍스트 자동 생성

    Raises:
        404: 분석 결과를 찾을 수 없는 경우
        500: 데이터 조회 중 오류 발생
    """
    try:
        # 분석 결과 조회
        analysis_request = AnalysisRequest.objects.get(id=request_id)
        analysis_result = AnalysisResult.objects.get(request=analysis_request)

        # 업종명 조회
        try:
            business_type = BusinessType.objects.get(
                id=analysis_request.business_type_id
            )
            business_type_name = business_type.name
        except BusinessType.DoesNotExist:
            business_type_name = "알 수 없음"

        # 서비스 유형명 변환
        service_type_map = {1: "일반음식점", 2: "휴게음식점", 3: "매장"}
        service_type_name = service_type_map.get(
            analysis_request.service_type, "알 수 없음"
        )

        # AI 분석 결과 판정
        survival_rate = analysis_result.survival_percentage or 0
        if survival_rate >= 80:
            analysis_text = "높은 생존 가능성 - 현재 위치는 장기적으로 사업을 지속하기에 매우 좋은 조건을 갖추고 있습니다."
        elif survival_rate >= 60:
            analysis_text = "보통 생존 가능성 - 현재 위치는 사업 지속에 적절한 조건을 갖추고 있으나, 추가적인 전략 검토가 필요합니다."
        else:
            analysis_text = "낮은 생존 가능성 - 현재 위치는 장기 사업 지속에 어려움이 예상됩니다. 신중한 검토가 필요합니다."

        # PDF용 데이터 구조 생성
        pdf_data = {
            "title": "AI 상권분석 보고서",
            "basic_info": {
                "address": analysis_request.address,
                "business_type": business_type_name,
                "area": f"{analysis_request.area}㎡",
                "service_type": service_type_name,
                "analysis_date": analysis_request.created_at.strftime(
                    "%Y년 %m월 %d일 %H:%M"
                ),
            },
            "key_metrics": {
                "life_pop_300m": f"{int(analysis_result.life_pop_300m or 0):,}명",
                "working_pop_300m": f"{int(analysis_result.working_pop_300m or 0):,}명",
                "competitor_300m": f"{analysis_result.competitor_300m or 0}개",
                "total_land_value": format_currency(
                    analysis_result.total_land_value or 0
                ),
            },
            "ai_analysis": {
                "survival_rate": f"{survival_rate:.1f}%",
                "analysis_text": analysis_text,
            },
            "competition_analysis": {
                "competitor_count": f"{analysis_result.competitor_300m or 0}개",
                "total_business": f"{analysis_result.adjacent_biz_300m or 0}개",
                "competitor_ratio": f"{analysis_result.competitor_ratio_300m or 0:.1f}%",
                "business_diversity": f"{analysis_result.business_diversity_300m or 0}종류",
            },
            "detailed_analysis": {
                "temp_foreign_1000m": f"{int(analysis_result.temp_foreign_1000m or 0):,}명",
                "long_foreign_300m": f"{int(analysis_result.long_foreign_300m or 0):,}명",
                "long_foreign_1000m": f"{int(analysis_result.long_foreign_1000m or 0):,}명",
                "temp_foreign_cn_300m": f"{analysis_result.temp_foreign_cn_300m or 0:.1f}%",
                "temp_foreign_cn_1000m": f"{analysis_result.temp_foreign_cn_1000m or 0:.1f}%",
                "long_foreign_cn_1000m": f"{analysis_result.long_foreign_cn_1000m or 0:.1f}%",
                "school_250m": f"{analysis_result.school_250m or 0}개",
                "public_building_250m": f"{analysis_result.public_building_250m or 0}개",
            },
        }

        return JsonResponse(pdf_data)

    except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
        print(f"❌ PDF: 분석 결과를 찾을 수 없습니다: ID {request_id}")
        return JsonResponse({"error": "분석 결과를 찾을 수 없습니다."}, status=404)
    except Exception as e:
        print(f"❌ PDF: 데이터 조회 중 오류 발생: {e}")
        return JsonResponse(
            {"error": f"데이터 조회 중 오류가 발생했습니다: {str(e)}"}, status=500
        )


def format_currency(value):
    """
    통화 포맷팅 함수

    Args:
        value (float): 포맷팅할 금액 (원 단위)

    Returns:
        str: 포맷팅된 통화 문자열

    Example:
        format_currency(150000000) -> "₩1.5억"
        format_currency(50000) -> "₩5만"
        format_currency(1000) -> "₩1,000"
    """
    if value >= 100000000:  # 1억 이상
        return f"₩{value/100000000:.1f}억"
    elif value >= 10000:  # 1만 이상
        return f"₩{value/10000:.0f}만"
    else:
        return f"₩{value:,.0f}"

def analysis_list_api(request, user_id):
    print(f"🔍 API 호출: user_id={user_id}")
    try:
        from custom_auth.models import User
        user = User.objects.get(id=user_id)
        print(f"✅ 사용자 찾음: {user.username}")
        
        analysis = AnalysisRequest.objects.filter(user=user).order_by('-created_at')
        print(f"📊 분석 요청 수: {analysis.count()}")
        
        data = []
        
        for item in analysis:
            # AnalysisResult에서 survival_percentage 가져오기
            try:
                analysis_result = AnalysisResult.objects.get(request=item)
                survival_percentage = analysis_result.survival_percentage
                result_id = analysis_result.pk
            except AnalysisResult.DoesNotExist:
                survival_percentage = None
                result_id = None
                print(f"⚠️ 분석 결과 없음: {item.id}")
            
            data.append({
                "id": item.id,
                "result_id": result_id,
                "user": item.user.username,
                "business_type": item.business_type.name if item.business_type else "알 수 없음",
                "address": item.address,
                "survival_percentage": survival_percentage,
                "created_at": item.created_at.strftime("%Y-%m-%d %H:%M"),
            })
        
        print(f"📤 응답 데이터: {len(data)}개 항목")
        return JsonResponse(data, safe=False)
    except User.DoesNotExist:
        print(f"❌ 사용자를 찾을 수 없음: user_id={user_id}")
        return JsonResponse({"error": "사용자를 찾을 수 없습니다."}, status=404)
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        return JsonResponse({"error": f"오류가 발생했습니다: {str(e)}"}, status=500)