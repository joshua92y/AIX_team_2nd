from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.gis.db import models
from django.db import connection, transaction
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import user_passes_test
import json
import requests
from pyproj import Proj, Transformer
from .models import BusinessType, AnalysisRequest, AnalysisResult
import time
import pickle
import numpy as np
import os

# XGBoost 모델 전역 변수
XGBOOST_MODEL = None

def load_xgboost_model():
    """XGBoost 모델을 로드하는 함수"""
    global XGBOOST_MODEL
    if XGBOOST_MODEL is None:
        # 상대경로로 변경
        model_path = os.path.join('model', 'best_xgb_model.pkl')
        try:
            with open(model_path, 'rb') as f:
                XGBOOST_MODEL = pickle.load(f)
            print(f"✅ XGBoost 모델 로드 완료: {model_path}")
        except Exception as e:
            print(f"❌ XGBoost 모델 로드 실패: {e}")
            XGBOOST_MODEL = None
    return XGBOOST_MODEL

def predict_survival_probability(features_dict):
    """
    장기 생존 확률을 예측하는 함수
    features_dict: 분석 결과에서 추출한 피쳐 딕셔너리
    """
    try:
        model = load_xgboost_model()
        if model is None:
            return 0.0
        
        # 먼저 28개 피쳐로 시도 (업종 ID 포함)
        try:
            # 학습 데이터의 컬럼 순서대로 피쳐 배열 생성
            # 순서: Area, Adjacent_BIZ, 1A_Total, Total_LV, Business_D, Working_Pop,
            #       2A_20, 2A_30, 2A_40, 2A_50, 2A_60, 1A_20, 1A_30, 1A_40, 1A_50, 1A_60,
            #       1A_Long_Total, 2A_Long_Total, 1A_Temp_CN, 2A_Temp_CN, 2A_Temp_Total, 2A_Long_CN,
            #       Competitor_C, Competitor_R, Service, School, PubBuilding, UPTAENM
            
            feature_array = [
                features_dict.get('Area', 0),
                features_dict.get('Adjacent_BIZ', 0),
                features_dict.get('1A_Total', 0),
                features_dict.get('Total_LV', 0),
                features_dict.get('Business_D', 0),
                features_dict.get('Working_Pop', 0),
                features_dict.get('2A_20', 0),
                features_dict.get('2A_30', 0),
                features_dict.get('2A_40', 0),
                features_dict.get('2A_50', 0),
                features_dict.get('2A_60', 0),
                features_dict.get('1A_20', 0),
                features_dict.get('1A_30', 0),
                features_dict.get('1A_40', 0),
                features_dict.get('1A_50', 0),
                features_dict.get('1A_60', 0),
                features_dict.get('1A_Long_Total', 0),
                features_dict.get('2A_Long_Total', 0),
                features_dict.get('1A_Temp_CN', 0),
                features_dict.get('2A_Temp_CN', 0),
                features_dict.get('2A_Temp_Total', 0),
                features_dict.get('2A_Long_CN', 0),
                features_dict.get('Competitor_C', 0),
                features_dict.get('Competitor_R', 0),
                features_dict.get('Service', 0),
                features_dict.get('School', 0),
                features_dict.get('PubBuilding', 0),
                features_dict.get('UPTAENM_ID', 0),  # 업종 ID (숫자)
            ]
            
            print(f"🔍 AI 모델 입력 피쳐 수: {len(feature_array)} (28개, 업종 ID 포함)")
            print(f"   업종 ID: {features_dict.get('UPTAENM_ID', 0)}")
            
            # numpy 배열로 변환하고 2D로 reshape (1개 샘플)
            feature_array = np.array(feature_array, dtype=float).reshape(1, -1)
            
            # 예측 수행 (확률 반환)
            survival_probability = model.predict_proba(feature_array)[0][1]  # 생존(1) 클래스의 확률
            
            print(f"🤖 AI 모델 예측 완료 (28개 피쳐) - 장기 생존 확률: {survival_probability:.3f} ({survival_probability*100:.1f}%)")
            
            return float(survival_probability)
            
        except Exception as e28:
            print(f"⚠️ 28개 피쳐로 예측 실패: {e28}")
            print("   27개 피쳐(업종 ID 제외)로 재시도...")
            
            # 27개 피쳐로 재시도 (업종 ID 제외)
            feature_array = [
                features_dict.get('Area', 0),
                features_dict.get('Adjacent_BIZ', 0),
                features_dict.get('1A_Total', 0),
                features_dict.get('Total_LV', 0),
                features_dict.get('Business_D', 0),
                features_dict.get('Working_Pop', 0),
                features_dict.get('2A_20', 0),
                features_dict.get('2A_30', 0),
                features_dict.get('2A_40', 0),
                features_dict.get('2A_50', 0),
                features_dict.get('2A_60', 0),
                features_dict.get('1A_20', 0),
                features_dict.get('1A_30', 0),
                features_dict.get('1A_40', 0),
                features_dict.get('1A_50', 0),
                features_dict.get('1A_60', 0),
                features_dict.get('1A_Long_Total', 0),
                features_dict.get('2A_Long_Total', 0),
                features_dict.get('1A_Temp_CN', 0),
                features_dict.get('2A_Temp_CN', 0),
                features_dict.get('2A_Temp_Total', 0),
                features_dict.get('2A_Long_CN', 0),
                features_dict.get('Competitor_C', 0),
                features_dict.get('Competitor_R', 0),
                features_dict.get('Service', 0),
                features_dict.get('School', 0),
                features_dict.get('PubBuilding', 0),
            ]
            
            print(f"🔍 AI 모델 입력 피쳐 수: {len(feature_array)} (27개, 업종 ID 제외)")
            
            # numpy 배열로 변환하고 2D로 reshape (1개 샘플)
            feature_array = np.array(feature_array, dtype=float).reshape(1, -1)
            
            # 예측 수행 (확률 반환)
            survival_probability = model.predict_proba(feature_array)[0][1]  # 생존(1) 클래스의 확률
            
            print(f"🤖 AI 모델 예측 완료 (27개 피쳐) - 장기 생존 확률: {survival_probability:.3f} ({survival_probability*100:.1f}%)")
            
            return float(survival_probability)
        
    except Exception as e:
        print(f"❌ AI 모델 예측 오류: {e}")
        return 0.0

def index(request):
    """메인 페이지"""
    business_types = BusinessType.objects.all().order_by('id')
    return render(request, 'locai/index.html', {
        'business_types': business_types
    })


def analyze_page(request):
    """새로운 상권 분석 페이지"""
    return render(request, 'locai/analyze.html')


@csrf_exempt
@require_http_methods(["POST"])
def get_coordinates(request):
    """카카오 API를 통해 주소를 좌표로 변환"""
    try:
        data = json.loads(request.body)
        address = data.get('address')
        
        if not address:
            return JsonResponse({'error': '주소가 필요합니다.'}, status=400)
        
        # 카카오맵 API로 좌표 가져오기
        kakao_api_key = '4b3a451741a307fa3db2b9273005146a'
        url = 'https://dapi.kakao.com/v2/local/search/address.json'
        headers = {'Authorization': f'KakaoAK {kakao_api_key}'}
        params = {'query': address}
        
        response = requests.get(url, headers=headers, params=params)
        
        if response.status_code == 200:
            result = response.json()
            if result['documents']:
                # WGS84 좌표
                longitude = float(result['documents'][0]['x'])
                latitude = float(result['documents'][0]['y'])
                
                # EPSG:5186으로 변환
                transformer = Transformer.from_crs('EPSG:4326', 'EPSG:5186', always_xy=True)
                x_coord, y_coord = transformer.transform(longitude, latitude)
                
                return JsonResponse({
                    'success': True,
                    'longitude': longitude,
                    'latitude': latitude,
                    'x_coord': x_coord,
                    'y_coord': y_coord
                })
            else:
                return JsonResponse({'error': '주소를 찾을 수 없습니다.'}, status=404)
        else:
            return JsonResponse({'error': 'API 호출 실패'}, status=500)
            
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def analyze_location(request):
    """위치 분석 수행"""
    try:
        # 원본 AI_Analyzer와 같이 JSON 데이터로 받기
        data = json.loads(request.body)
        
        # 디버깅: 전체 JSON 데이터 출력
        print(f"🔍 [DEBUG] 받은 JSON 데이터: {data}")
        print(f"🔍 [DEBUG] Content-Type: {request.content_type}")
        
        # 입력 데이터 검증 - 원본 AI_Analyzer 변수명 사용
        required_fields = ['address', 'area', 'business_type_id', 'service_type', 
                          'longitude', 'latitude', 'x_coord', 'y_coord']
        for field in required_fields:
            if field not in data:
                print(f"❌ [ERROR] 필수 필드 누락: {field}")
                return JsonResponse({'error': f'{field}가 필요합니다.'}, status=400)
        
        # 데이터 추출
        business_type_id = data['business_type_id']
        address = data['address']
        area = data['area']
        service_type = data['service_type']
        longitude = data['longitude']
        latitude = data['latitude']
        x_coord = data['x_coord']
        y_coord = data['y_coord']
        
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
        business_type = BusinessType.objects.get(id=business_type_id)
        
        analysis_request = AnalysisRequest.objects.create(
            address=address,
            area=float(area),
            business_type=business_type,
            service_type=int(service_type),
            longitude=float(longitude),
            latitude=float(latitude),
            x_coord=float(x_coord),
            y_coord=float(y_coord)
        )
        
        # 공간 분석 수행
        result = perform_spatial_analysis(analysis_request)
        
        return JsonResponse({
            'success': True,
            'request_id': analysis_request.id,
            'result': result
        })
        
    except Exception as e:
        print(f"❌ [ERROR] 분석 요청 오류: {e}")
        import traceback
        print(f"❌ [ERROR] 스택 트레이스: {traceback.format_exc()}")
        return JsonResponse({'error': str(e)}, status=500)


@transaction.atomic
def perform_spatial_analysis(analysis_request):
    """실제 공간 분석 수행"""
    print(f"\n🚀 === 상권분석 시작 === 요청 ID: {analysis_request.id}")
    print(f"📍 좌표: ({analysis_request.x_coord}, {analysis_request.y_coord})")
    print(f"📍 주소: {analysis_request.address}")
    print(f"📏 면적: {analysis_request.area}㎡, 업종: {analysis_request.business_type.name}")
    
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
                # 1. 생활인구 분석 (300m)
                try:
                    cursor.execute(f"""
                        SELECT 
                            COALESCE(SUM("총생활인구수"), 0) as total_pop,
                            COALESCE(SUM("20대"), 0) as pop_20,
                            COALESCE(SUM("30대"), 0) as pop_30,
                            COALESCE(SUM("40대"), 0) as pop_40,
                            COALESCE(SUM("50대"), 0) as pop_50,
                            COALESCE(SUM("60대"), 0) as pop_60
                        FROM life_pop_grid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """)
                    
                    row = cursor.fetchone()
                    total_pop_300m = row[0] if row[0] else 0
                    
                    results.update({
                        'life_pop_300m': int(total_pop_300m),
                        'life_pop_20_300m': round((row[1] / total_pop_300m * 100) if total_pop_300m > 0 else 0, 2),
                        'life_pop_30_300m': round((row[2] / total_pop_300m * 100) if total_pop_300m > 0 else 0, 2),
                        'life_pop_40_300m': round((row[3] / total_pop_300m * 100) if total_pop_300m > 0 else 0, 2),
                        'life_pop_50_300m': round((row[4] / total_pop_300m * 100) if total_pop_300m > 0 else 0, 2),
                        'life_pop_60_300m': round((row[5] / total_pop_300m * 100) if total_pop_300m > 0 else 0, 2),
                    })
                    print(f"   ✅ 300m 생활인구: {int(total_pop_300m):,}명")
                except Exception as e:
                    print(f"   ❌ 생활인구 300m 분석 오류: {e}")
                    results.update({
                        'life_pop_300m': 0,
                        'life_pop_20_300m': 0, 'life_pop_30_300m': 0, 'life_pop_40_300m': 0,
                        'life_pop_50_300m': 0, 'life_pop_60_300m': 0,
                    })
                
                # 각 쿼리 사이에 작은 지연 추가
                time.sleep(0.1)
                
                # 2. 생활인구 분석 (1000m)
                try:
                    cursor.execute(f"""
                        SELECT 
                            COALESCE(SUM("총생활인구수"), 0) as total_pop,
                            COALESCE(SUM("20대"), 0) as pop_20,
                            COALESCE(SUM("30대"), 0) as pop_30,
                            COALESCE(SUM("40대"), 0) as pop_40,
                            COALESCE(SUM("50대"), 0) as pop_50,
                            COALESCE(SUM("60대"), 0) as pop_60
                        FROM life_pop_grid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                    """)
                    
                    row = cursor.fetchone()
                    total_pop_1000m = row[0] if row[0] else 0
                    
                    results.update({
                        'life_pop_20_1000m': round((row[1] / total_pop_1000m * 100) if total_pop_1000m > 0 else 0, 2),
                        'life_pop_30_1000m': round((row[2] / total_pop_1000m * 100) if total_pop_1000m > 0 else 0, 2),
                        'life_pop_40_1000m': round((row[3] / total_pop_1000m * 100) if total_pop_1000m > 0 else 0, 2),
                        'life_pop_50_1000m': round((row[4] / total_pop_1000m * 100) if total_pop_1000m > 0 else 0, 2),
                        'life_pop_60_1000m': round((row[5] / total_pop_1000m * 100) if total_pop_1000m > 0 else 0, 2),
                    })
                    print(f"   ✅ 1000m 생활인구: {int(total_pop_1000m):,}명")
                except Exception as e:
                    print(f"   ❌ 생활인구 1000m 분석 오류: {e}")
                    results.update({
                        'life_pop_20_1000m': 0, 'life_pop_30_1000m': 0, 'life_pop_40_1000m': 0,
                        'life_pop_50_1000m': 0, 'life_pop_60_1000m': 0,
                    })
                
                time.sleep(0.1)
                print("✅ [1/6] 생활인구 분석 완료")
                
                print("\n👔 [2/6] 직장인구 분석 시작...")
                # 3. 직장인구 분석 (300m)
                try:
                    cursor.execute(f"""
                        SELECT COALESCE(SUM("총_직장_인구_수"), 0) as working_pop
                        FROM workgrid_10m_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """)
                    
                    row = cursor.fetchone()
                    working_pop = int(row[0]) if row[0] else 0
                    results['working_pop_300m'] = working_pop
                    print(f"   ✅ 300m 직장인구: {working_pop:,}명")
                except Exception as e:
                    print(f"   ❌ 직장인구 분석 오류: {e}")
                    results['working_pop_300m'] = 0
                
                time.sleep(0.1)
                print("✅ [2/6] 직장인구 분석 완료")
                
                # 4. 단기체류외국인 분석
                try:
                    print(f"\n🌍 [3/6] 외국인 분석 시작...")
                    print(f"=== 단기체류외국인 분석 시작 ===")
                    print(f"테스트 좌표: ({x_coord}, {y_coord})")
                    
                    # 새로운 테이블명을 우선순위로 
                    foreign_tables = ["temp_25m_5186", "temp_foreign_25m_5186", "_단기체류외국인_25m_5186", "단기체류외국인_25m_5186"]
                    temp_total_1000m = 0
                    temp_cn_1000m = 0
                    temp_cn_300m = 0
                    used_table = None
                    
                    # 사용 가능한 테이블 확인
                    for table_name in foreign_tables:
                        try:
                            # 테이블 존재 여부 확인
                            cursor.execute(f"""
                                SELECT name FROM sqlite_master 
                                WHERE type='table' AND name='{table_name}'
                            """)
                            if not cursor.fetchone():
                                print(f"테이블 {table_name}: 존재하지 않음")
                                continue
                                
                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            table_count = cursor.fetchone()[0]
                            print(f"테이블 {table_name}: {table_count:,}개 레코드 존재")
                            
                            if table_count == 0:
                                print(f"테이블 {table_name}: 데이터가 없음")
                                continue
                            
                            # 1000m 쿼리 - 총수와 중국인수 조회
                            cursor.execute(f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as temp_total,
                                       COALESCE(SUM("중국인체류인구수"), 0) as temp_cn
                                FROM {table_name} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                            """)
                            row = cursor.fetchone()
                            temp_total_1000m = row[0] if row[0] else 0
                            temp_cn_1000m = row[1] if row[1] else 0
                            print(f"단기체류외국인 1000m - 테이블 {table_name} 사용: 총 {temp_total_1000m}명, 중국인 {temp_cn_1000m}명")
                            
                            used_table = table_name
                            break
                        except Exception as e:
                            print(f"단기체류외국인 테이블 {table_name} 시도 실패: {e}")
                            continue
                    
                    if not used_table:
                        print("❌ 사용 가능한 단기체류외국인 테이블이 없습니다. 기본값 0 사용")
                    
                    time.sleep(0.1)
                    
                    # 300m 내 중국인 (같은 테이블 사용)
                    if used_table:
                        try:
                            cursor.execute(f"""
                                SELECT COALESCE(SUM("중국인체류인구수"), 0) as temp_cn
                                FROM {used_table} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            """)
                            row = cursor.fetchone()
                            temp_cn_300m = row[0] if row[0] else 0
                            print(f"단기체류외국인 300m - 테이블 {used_table} 사용: 중국인 {temp_cn_300m}명")
                        except Exception as e:
                            print(f"단기체류외국인 300m 쿼리 실패: {e}")
                            temp_cn_300m = 0

                    results.update({
                        'temp_foreign_1000m': int(temp_total_1000m),
                        'temp_foreign_cn_300m': round((temp_cn_300m / temp_total_1000m * 100) if temp_total_1000m > 0 else 0, 2),
                        'temp_foreign_cn_1000m': round((temp_cn_1000m / temp_total_1000m * 100) if temp_total_1000m > 0 else 0, 2),
                    })
                    print(f"   ✅ 단기체류외국인 분석 완료: 1000m {int(temp_total_1000m):,}명")
                except Exception as e:
                    print(f"단기체류외국인 전체 분석 오류: {e}")
                    results.update({
                        'temp_foreign_1000m': 0,
                        'temp_foreign_cn_300m': 0,
                        'temp_foreign_cn_1000m': 0,
                    })
                
                time.sleep(0.1)
                
                # 5. 장기체류외국인 분석
                try:
                    print(f"=== 장기체류외국인 분석 시작 ===")
                    
                    # 새로운 테이블명을 우선순위로
                    long_tables = ["long_25m_5186", "long_foreign_25m_5186", "_장기체류외국인_25m_5186", "장기체류외국인_25m_5186"]
                    long_total_300m = 0
                    long_total_1000m = 0
                    long_cn_1000m = 0
                    used_table = None
                    
                    # 사용 가능한 테이블 확인 및 300m 쿼리
                    for table_name in long_tables:
                        try:
                            # 테이블 존재 여부 확인
                            cursor.execute(f"""
                                SELECT name FROM sqlite_master 
                                WHERE type='table' AND name='{table_name}'
                            """)
                            if not cursor.fetchone():
                                print(f"테이블 {table_name}: 존재하지 않음")
                                continue
                                
                            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                            table_count = cursor.fetchone()[0]
                            print(f"테이블 {table_name}: {table_count:,}개 레코드 존재")
                            
                            if table_count == 0:
                                print(f"테이블 {table_name}: 데이터가 없음")
                                continue
                            
                            # 300m 쿼리 - 총수 조회
                            cursor.execute(f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as long_total
                                FROM {table_name} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            """)
                            row = cursor.fetchone()
                            long_total_300m = row[0] if row[0] else 0
                            print(f"장기체류외국인 300m - 테이블 {table_name} 사용: {long_total_300m}명")
                            
                            used_table = table_name
                            break
                        except Exception as e:
                            print(f"장기체류외국인 테이블 {table_name} 시도 실패: {e}")
                            continue
                    
                    if not used_table:
                        print("❌ 사용 가능한 장기체류외국인 테이블이 없습니다. 기본값 0 사용")
                    
                    time.sleep(0.1)
                    
                    # 1000m 쿼리 (같은 테이블 사용) - 총수와 중국인수 조회
                    if used_table:
                        try:
                            cursor.execute(f"""
                                SELECT COALESCE(SUM("총생활인구수"), 0) as long_total,
                                       COALESCE(SUM("중국인체류인구수"), 0) as long_cn
                                FROM {used_table} 
                                WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 1000))
                            """)
                            row = cursor.fetchone()
                            long_total_1000m = row[0] if row[0] else 0
                            long_cn_1000m = row[1] if row[1] else 0
                            print(f"장기체류외국인 1000m - 테이블 {used_table} 사용: 총 {long_total_1000m}명, 중국인 {long_cn_1000m}명")
                        except Exception as e:
                            print(f"장기체류외국인 1000m 쿼리 실패: {e}")
                            long_total_1000m = 0
                            long_cn_1000m = 0

                    results.update({
                        'long_foreign_300m': int(long_total_300m),
                        'long_foreign_1000m': int(long_total_1000m),
                        'long_foreign_cn_1000m': round((long_cn_1000m / long_total_1000m * 100) if long_total_1000m > 0 else 0, 2),
                    })
                    print(f"   ✅ 장기체류외국인 분석 완료: 300m {int(long_total_300m):,}명, 1000m {int(long_total_1000m):,}명")
                except Exception as e:
                    print(f"장기체류외국인 전체 분석 오류: {e}")
                    results.update({
                        'long_foreign_300m': 0,
                        'long_foreign_1000m': 0,
                        'long_foreign_cn_1000m': 0,
                    })
                
                time.sleep(0.1)
                print("✅ [3/6] 외국인 분석 완료")
                
                print("\n🏢 [4/6] 주변시설 분석 시작...")
                # 6. 공공건물 분석 (250m)
                try:
                    cursor.execute(f"""
                        SELECT COUNT(*) as pub_count
                        FROM public_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 250))
                    """)
                    row = cursor.fetchone()
                    pub_count = int(row[0]) if row[0] else 0
                    results['public_building_250m'] = pub_count
                    print(f"   ✅ 250m 공공건물: {pub_count}개")
                except Exception as e:
                    print(f"   ❌ 공공건물 분석 오류: {e}")
                    results['public_building_250m'] = 0
                
                time.sleep(0.1)
                
                # 7. 학교 분석 (250m)
                try:
                    cursor.execute(f"""
                        SELECT COUNT(*) as school_count
                        FROM school_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 250))
                    """)
                    row = cursor.fetchone()
                    school_count = int(row[0]) if row[0] else 0
                    results['school_250m'] = school_count
                    print(f"   ✅ 250m 학교: {school_count}개")
                except Exception as e:
                    print(f"   ❌ 학교 분석 오류: {e}")
                    results['school_250m'] = 0
                
                time.sleep(0.1)
                print("✅ [4/6] 주변시설 분석 완료")
                
                print("\n🏪 [5/6] 경쟁업체 분석 시작...")
                # 8. 상권 분석 (300m)
                try:
                    # BusinessType에서 업종명 가져오기
                    business_type_name = analysis_request.business_type.name
                    print(f"   검색 대상 업종: {business_type_name} (ID: {business_type_id})")
                    
                    # 동일 업종 경쟁업체 - 업종명으로 매칭
                    cursor.execute(f"""
                        SELECT COUNT(*) as competitor_count
                        FROM store_point_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                          AND uptaenm = '{business_type_name}'
                    """)
                    row = cursor.fetchone()
                    competitor_count = int(row[0]) if row[0] else 0
                    
                    time.sleep(0.1)
                    
                    # 전체 요식업체
                    cursor.execute(f"""
                        SELECT COUNT(*) as total_biz,
                               COUNT(DISTINCT uptaenm) as diversity
                        FROM store_point_5186 
                        WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                    """)
                    row = cursor.fetchone()
                    total_biz = int(row[0]) if row[0] else 0
                    diversity = int(row[1]) if row[1] else 0
                    
                    # 디버깅: 주변 업종들 출력
                    if competitor_count == 0:
                        print(f"   ⚠️  '{business_type_name}' 업종 경쟁업체가 0개입니다.")
                        print("   주변 업종들 확인 중...")
                        cursor.execute(f"""
                            SELECT uptaenm, COUNT(*) as count
                            FROM store_point_5186 
                            WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT({x_coord} {y_coord})', 5186), 300))
                            GROUP BY uptaenm
                            ORDER BY count DESC
                            LIMIT 5
                        """)
                        nearby_types = cursor.fetchall()
                        for uptae, count in nearby_types:
                            print(f"     - {uptae}: {count}개")
                    
                    results.update({
                        'competitor_300m': competitor_count,
                        'adjacent_biz_300m': total_biz,
                        'competitor_ratio_300m': round((competitor_count / total_biz * 100) if total_biz > 0 else 0, 2),
                        'business_diversity_300m': diversity,
                    })
                    print(f"   ✅ 300m 경쟁업체: {competitor_count}개 / 전체 {total_biz}개 (비율: {round((competitor_count / total_biz * 100) if total_biz > 0 else 0, 1)}%)")
                except Exception as e:
                    print(f"   ❌ 상권 분석 오류: {e}")
                    results.update({
                        'competitor_300m': 0,
                        'adjacent_biz_300m': 0,
                        'competitor_ratio_300m': 0,
                        'business_diversity_300m': 0,
                    })
                
                time.sleep(0.1)
                print("✅ [5/6] 경쟁업체 분석 완료")
                
                print("\n💰 [6/6] 공시지가 분석 시작...")
                # 9. 공시지가 분석
                try:
                    cursor.execute(f"""
                        SELECT COALESCE("A9", 0) as land_price
                        FROM ltv_5186 
                        WHERE ST_Contains(geom, ST_GeomFromText('POINT({x_coord} {y_coord})', 5186))
                        LIMIT 1
                    """)
                    row = cursor.fetchone()
                    land_price = float(row[0]) if row and row[0] else 0
                    total_land_value = area * land_price
                    
                    results['total_land_value'] = round(total_land_value, 0)
                    print(f"   ✅ 공시지가: {land_price:,.0f}원/㎡, 총 토지가치: {total_land_value:,.0f}원")
                except Exception as e:
                    print(f"   ❌ 공시지가 분석 오류: {e}")
                    results['total_land_value'] = 0
                
                print("✅ [6/6] 공시지가 분석 완료")
                
                # 기본 정보 추가
                results.update({
                    'area': area,
                    'service_type': service_type,
                })
                
                # 다른 페이지에서 사용할 수 있도록 변수명 매핑
                print(f"📋 변수 매핑 중...")
                
                # 생활인구 관련 (300m = 1A, 1000m = 2A)
                _1A_Total = results['life_pop_300m']                    # 300m내 총생활인구
                _1A_20 = results['life_pop_20_300m']                    # 300m내 20대 비율(%)
                _1A_30 = results['life_pop_30_300m']                    # 300m내 30대 비율(%)
                _1A_40 = results['life_pop_40_300m']                    # 300m내 40대 비율(%)
                _1A_50 = results['life_pop_50_300m']                    # 300m내 50대 비율(%)
                _1A_60 = results['life_pop_60_300m']                    # 300m내 60대 비율(%)
                _2A_20 = results['life_pop_20_1000m']                   # 1000m내 20대 비율(%)
                _2A_30 = results['life_pop_30_1000m']                   # 1000m내 30대 비율(%)
                _2A_40 = results['life_pop_40_1000m']                   # 1000m내 40대 비율(%)
                _2A_50 = results['life_pop_50_1000m']                   # 1000m내 50대 비율(%)
                _2A_60 = results['life_pop_60_1000m']                   # 1000m내 60대 비율(%)
                
                # 외국인 관련
                _1A_Temp_CN = results['temp_foreign_cn_300m']           # 300m내 단기체류 중국인 비율(%)
                _2A_Temp_Total = results['temp_foreign_1000m']          # 1000m내 단기체류외국인 총수
                _2A_Temp_CN = results['temp_foreign_cn_1000m']          # 1000m내 단기체류 중국인 비율(%)
                _1A_Long_Total = results['long_foreign_300m']           # 300m내 장기체류외국인 총수
                _2A_Long_Total = results['long_foreign_1000m']          # 1000m내 장기체류외국인 총수
                _2A_Long_CN = results['long_foreign_cn_1000m']          # 1000m내 장기체류 중국인 비율(%)
                
                # 직장인구 및 시설
                Working_Pop = results['working_pop_300m']               # 300m내 직장인구
                PubBuilding = results['public_building_250m']           # 250m내 공공건물 수
                School = results['school_250m']                         # 250m내 학교 수
                
                # 경쟁업체 관련
                Competitor_C = results['competitor_300m']               # 300m내 동일업종 경쟁업체 수
                Competitor_R = results['competitor_ratio_300m']         # 300m내 경쟁업체 비율(%)
                Adjacent_BIZ = results['adjacent_biz_300m']             # 300m내 전체 요식업체 수
                Business_D = results['business_diversity_300m']         # 300m내 업종 다양성
                
                # 기본 정보
                Area = results['area']                                  # 면적(㎡)
                Total_LV = results['total_land_value']                  # 총 공시지가
                Service = results['service_type']                       # 서비스 유형 (0:휴게음식점, 1:일반음식점)
                
                # 변수 매핑 완료 로그
                print(f"✅ 변수 매핑 완료:")
                print(f"   생활인구: 1A_Total={_1A_Total:,}명")
                print(f"   외국인: 2A_Temp_Total={_2A_Temp_Total:,}명, 1A_Long_Total={_1A_Long_Total:,}명")  
                print(f"   직장인구: Working_Pop={Working_Pop:,}명")
                print(f"   경쟁업체: Competitor_C={Competitor_C}개 (비율 {Competitor_R}%)")
                print(f"   면적/지가: Area={Area}㎡, Total_LV={Total_LV:,.0f}원")
                
                # AI 모델을 이용한 장기 생존 확률 예측
                print("\n🤖 [AI 예측] 장기 생존 확률 분석 시작...")
                features_for_ai = {
                    'Area': Area,
                    'Adjacent_BIZ': Adjacent_BIZ,
                    '1A_Total': _1A_Total,
                    'Total_LV': Total_LV,
                    'Business_D': Business_D,
                    'Working_Pop': Working_Pop,
                    '2A_20': _2A_20,
                    '2A_30': _2A_30,
                    '2A_40': _2A_40,
                    '2A_50': _2A_50,
                    '2A_60': _2A_60,
                    '1A_20': _1A_20,
                    '1A_30': _1A_30,
                    '1A_40': _1A_40,
                    '1A_50': _1A_50,
                    '1A_60': _1A_60,
                    '1A_Long_Total': _1A_Long_Total,
                    '2A_Long_Total': _2A_Long_Total,
                    '1A_Temp_CN': _1A_Temp_CN,
                    '2A_Temp_CN': _2A_Temp_CN,
                    '2A_Temp_Total': _2A_Temp_Total,
                    '2A_Long_CN': _2A_Long_CN,
                    'Competitor_C': Competitor_C,
                    'Competitor_R': Competitor_R,
                    'Service': Service,
                    'School': School,
                    'PubBuilding': PubBuilding,
                    'UPTAENM_ID': business_type_id,  # 업종 ID (숫자)로 변경
                }
                
                survival_probability = predict_survival_probability(features_for_ai)
                survival_percentage = round(survival_probability * 100, 1)
                
                # AI 예측 결과를 results에 추가
                results.update({
                    'survival_probability': survival_probability,
                    'survival_percentage': survival_percentage,
                })
                
                print(f"\n💾 분석 결과 저장 중...")
                # 분석 결과 저장 (AI 예측 결과 포함)
                AnalysisResult.objects.create(
                    request=analysis_request,
                    **results
                )
                
                print(f"🎉 === 상권분석 완료 === 요청 ID: {analysis_request.id}")
                print(f"📊 생활인구: {results['life_pop_300m']:,}명")
                print(f"👔 직장인구: {results['working_pop_300m']:,}명") 
                print(f"🌍 외국인: 단기 {results['temp_foreign_1000m']:,}명, 장기 {results['long_foreign_300m']:,}명")
                print(f"🏪 경쟁업체: {results['competitor_300m']:,}개")
                print(f"💰 토지가치: {results['total_land_value']:,.0f}원")
                print(f"🤖 AI 예측 생존확률: {survival_percentage}%")
                
                # 새로운 변수들을 results에 추가하여 반환
                results.update({
                    # 생활인구 관련 변수들
                    '1A_Total': _1A_Total,
                    '1A_20': _1A_20,
                    '1A_30': _1A_30,
                    '1A_40': _1A_40,
                    '1A_50': _1A_50,
                    '1A_60': _1A_60,
                    '2A_20': _2A_20,
                    '2A_30': _2A_30,
                    '2A_40': _2A_40,
                    '2A_50': _2A_50,
                    '2A_60': _2A_60,
                    
                    # 외국인 관련 변수들
                    '1A_Temp_CN': _1A_Temp_CN,
                    '2A_Temp_Total': _2A_Temp_Total,
                    '2A_Temp_CN': _2A_Temp_CN,
                    '1A_Long_Total': _1A_Long_Total,
                    '2A_Long_Total': _2A_Long_Total,
                    '2A_Long_CN': _2A_Long_CN,
                    
                    # 직장인구 및 시설 변수들
                    'Working_Pop': Working_Pop,
                    'PubBuilding': PubBuilding,
                    'School': School,
                    
                    # 경쟁업체 관련 변수들
                    'Competitor_C': Competitor_C,
                    'Competitor_R': Competitor_R,
                    'Adjacent_BIZ': Adjacent_BIZ,
                    'Business_D': Business_D,
                    
                    # 기본 정보 변수들
                    'Area': Area,
                    'Total_LV': Total_LV,
                    'Service': Service,
                    
                    # 좌표 정보 (추가 요청사항)
                    'X_Coord': x_coord,
                    'Y_Coord': y_coord,
                })
                
                return results
                
        except Exception as e:
            error_msg = str(e).lower()
            if "database is locked" in error_msg and retry_count < max_retries - 1:
                retry_count += 1
                print(f"데이터베이스 락 오류 발생, 재시도 {retry_count}/{max_retries}")
                time.sleep(2 ** retry_count)  # 지수 백오프
                continue
            else:
                print(f"공간 분석 오류: {e}")
                raise e
    
    # 모든 재시도가 실패한 경우
    raise Exception("데이터베이스 락으로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.")


def result_detail(request, request_id):
    """분석 결과 상세 페이지"""
    try:
        analysis_request = AnalysisRequest.objects.get(id=request_id)
        analysis_result = AnalysisResult.objects.get(request=analysis_request)
        
        return render(request, 'locai/result.html', {
            'request': analysis_request,
            'result': analysis_result
        })
    except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
        return render(request, 'locai/error.html', {
            'error': '분석 결과를 찾을 수 없습니다.'
        })


@csrf_exempt
def get_analysis_result_api(request, request_id):
    """분석 결과를 JSON으로 반환하는 API"""
    try:
        analysis_request = AnalysisRequest.objects.get(id=request_id)
        analysis_result = AnalysisResult.objects.get(request=analysis_request)
        
        # 결과 데이터를 딕셔너리로 변환
        result_data = {
            'request': {
                'address': analysis_request.address,
                'business_type_id': analysis_request.business_type_id,
                'area': float(analysis_request.area),
                'service_type': analysis_request.service_type,
                'created_at': analysis_request.created_at.isoformat(),
            },
            'result': {
                'life_pop_300m': float(analysis_result.life_pop_300m or 0),
                'working_pop_300m': float(analysis_result.working_pop_300m or 0),
                'competitor_300m': analysis_result.competitor_300m or 0,
                'total_land_value': float(analysis_result.total_land_value or 0),
                'survival_percentage': float(analysis_result.survival_percentage or 0),
                'adjacent_biz_300m': analysis_result.adjacent_biz_300m or 0,
                'competitor_ratio_300m': float(analysis_result.competitor_ratio_300m or 0),
                'business_diversity_300m': analysis_result.business_diversity_300m or 0,
                'public_building_250m': analysis_result.public_building_250m or 0,
                'school_250m': analysis_result.school_250m or 0,
                'temp_foreign_1000m': analysis_result.temp_foreign_1000m or 0,
                'long_foreign_1000m': analysis_result.long_foreign_1000m or 0,
                'temp_foreign_cn_300m': float(analysis_result.temp_foreign_cn_300m or 0),
                'long_foreign_cn_1000m': float(analysis_result.long_foreign_cn_1000m or 0),
            }
        }
        
        return JsonResponse(result_data)
        
    except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
        return JsonResponse({
            'error': '분석 결과를 찾을 수 없습니다.'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'결과 조회 중 오류가 발생했습니다: {str(e)}'
        }, status=500)


@staff_member_required
def database_info(request):
    """SpatiaLite 데이터베이스 정보 보기 (관리자 전용)"""
    with connection.cursor() as cursor:
        # 테이블 정보
        cursor.execute("""
            SELECT name, type, sql 
            FROM sqlite_master 
            WHERE type IN ('table', 'view') 
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE 'idx_%'
            AND name NOT LIKE 'cache_%'
            ORDER BY name
        """)
        tables = cursor.fetchall()
        
        # 공간 참조 시스템 정보
        try:
            cursor.execute("""
                SELECT srid, auth_name, auth_srid, ref_sys_name, proj4text 
                FROM spatial_ref_sys 
                WHERE srid IN (4326, 5186)
                ORDER BY srid
            """)
            spatial_refs = cursor.fetchall()
        except:
            spatial_refs = []
        
        # 지오메트리 컬럼 정보
        try:
            cursor.execute("""
                SELECT f_table_name, f_geometry_column, coord_dimension, srid, type 
                FROM geometry_columns 
                ORDER BY f_table_name
            """)
            geometry_columns = cursor.fetchall()
        except:
            geometry_columns = []
        
        # 공간 테이블들 정보 (재시도 로직 포함)
        spatial_tables = [
            ['life_pop_grid_10m_5186'],
            ['workgrid_10m_5186'],
            ['temp_25m_5186', 'temp_foreign_25m_5186', '_단기체류외국인_25m_5186', '단기체류외국인_25m_5186'],
            ['long_25m_5186', 'long_foreign_25m_5186', '_장기체류외국인_25m_5186', '장기체류외국인_25m_5186'],
            ['store_point_5186'],
            ['school_5186'],
            ['ltv_5186'],
            ['public_5186']
        ]
        
        spatial_table_counts = {}
        for table_group in spatial_tables:
            found = False
            for table_name in table_group:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    if table_name in ['temp_25m_5186', 'temp_foreign_25m_5186', '_단기체류외국인_25m_5186', '단기체류외국인_25m_5186']:
                        spatial_table_counts['temp_25m_5186'] = count
                    elif table_name in ['long_25m_5186', 'long_foreign_25m_5186', '_장기체류외국인_25m_5186', '장기체류외국인_25m_5186']:
                        spatial_table_counts['long_25m_5186'] = count
                    else:
                        spatial_table_counts[table_name] = count
                    found = True
                    break
                except:
                    continue
            
            if not found:
                # 첫 번째 테이블명으로 0값 저장
                primary_table = table_group[0]
                if 'temp' in primary_table.lower():
                    spatial_table_counts['temp_25m_5186'] = 0
                elif 'long' in primary_table.lower():
                    spatial_table_counts['long_25m_5186'] = 0
                else:
                    spatial_table_counts[primary_table] = 0
    
    context = {
        'tables': tables,
        'spatial_refs': spatial_refs,
        'geometry_columns': geometry_columns,
        'spatial_table_counts': spatial_table_counts,
    }
    
    return render(request, 'admin/database_info.html', context)
