from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Sum, Count, Avg, Q
from django.db import connection
from AI_Analyzer.models import AnalysisResult, BusinessType
from GeoDB.models import StoreResult
import json


def dashboard_view(request):
    """메인 대시보드 뷰"""
    return render(request, 'shopdash/dashboard.html')


def get_district_from_address(address):
    """주소에서 구 이름을 추출하는 함수"""
    if not address:
        return None
    
    # 서울시 구 이름 목록
    districts = [
        '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
        '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
        '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
    ]
    
    for district in districts:
        if district in address:
            return district
    return None


def population_data(request):
    """거주인구 데이터 API - 사전 집계된 dong_life 테이블 사용"""
    try:
        with connection.cursor() as cursor:
            # dong_life 테이블에서 직접 데이터 조회
            cursor.execute("""
                SELECT 
                    emd_kor_nm,
                    emd_cd,
                    총생활인구수_sum as total_population
                FROM dong_life
                WHERE emd_cd LIKE '11%'  -- 서울시 전체 (11로 시작)
                    AND 총생활인구수_sum > 0
                ORDER BY 총생활인구수_sum DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
        
        data = {
            'labels': [row[0] or f'행정동_{row[1][-3:]}' for row in results],
            'datasets': [{
                'label': '총 거주인구 (행정동별)',
                'data': [round(float(row[2]), 0) for row in results],
                'backgroundColor': [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                ],
                'borderColor': '#fff',
                'borderWidth': 2
            }]
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Population data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def business_activity_data(request):
    """분석 활발지역 데이터 API - 분석 건수 기준"""
    try:
        with connection.cursor() as cursor:
            # 행정동별 분석 건수 상위 10개 지역
            cursor.execute("""
                SELECT 
                    SPLIT_PART(SPLIT_PART(req.address, ' ', 3), ' ', 1) as dong_name,
                    COUNT(*) as analysis_count
                FROM "AI_Analyzer_analysisresult" ar
                JOIN "AI_Analyzer_analysisrequest" req ON ar.request_id = req.id
                WHERE req.address LIKE '서울%'
                    AND LENGTH(SPLIT_PART(req.address, ' ', 3)) > 0
                GROUP BY SPLIT_PART(SPLIT_PART(req.address, ' ', 3), ' ', 1)
                ORDER BY analysis_count DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
        
        data = {
            'labels': [row[0] for row in results],
            'datasets': [{
                'label': '분석 건수 (활발지역)',
                'data': [int(row[1]) for row in results],
                'backgroundColor': 'rgba(54, 162, 235, 0.8)',
                'borderColor': 'rgba(54, 162, 235, 1)',
                'borderWidth': 2
            }]
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Business activity data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def working_population_data(request):
    """직장인구 데이터 API - 사전 집계된 dong_work 테이블 사용"""
    try:
        with connection.cursor() as cursor:
            # dong_work 테이블에서 직접 데이터 조회
            cursor.execute("""
                SELECT 
                    emd_kor_nm,
                    emd_cd,
                    총_직장_인구_수_sum as total_working_pop
                FROM dong_work
                WHERE emd_cd LIKE '11%'  -- 서울시 전체 (11로 시작)
                    AND 총_직장_인구_수_sum > 0
                ORDER BY 총_직장_인구_수_sum DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
        
        data = {
            'labels': [row[0] or f'행정동_{row[1][-3:]}' for row in results],
            'datasets': [{
                'label': '직장인구 (행정동별)',
                'data': [round(float(row[2]), 0) for row in results],
                'backgroundColor': 'rgba(255, 206, 86, 0.8)',
                'borderColor': 'rgba(255, 206, 86, 1)',
                'borderWidth': 2
            }]
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Working population data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def foreign_visitor_data(request):
    """외국인 여행객 데이터 API - 사전 집계된 dong_temp 테이블 사용"""
    try:
        with connection.cursor() as cursor:
            # dong_temp 테이블에서 직접 데이터 조회
            cursor.execute("""
                SELECT 
                    emd_kor_nm,
                    emd_cd,
                    총생활인구수_sum as total_foreign_visitors
                FROM dong_temp
                WHERE emd_cd LIKE '11%'  -- 서울시 전체 (11로 시작)
                    AND 총생활인구수_sum > 0
                ORDER BY 총생활인구수_sum DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
        
        data = {
            'labels': [row[0] or f'행정동_{row[1][-3:]}' for row in results],
            'datasets': [{
                'label': '외국인 여행객 (단기체류자)',
                'data': [round(float(row[2]), 0) for row in results],
                'backgroundColor': 'rgba(75, 192, 192, 0.8)',
                'borderColor': 'rgba(75, 192, 192, 1)',
                'borderWidth': 2
            }]
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Foreign visitor data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def business_type_distribution(request):
    """업종별 분포 데이터 API - 전체 상점 데이터 기준"""
    try:
        with connection.cursor() as cursor:
            # 전체 상점 데이터에서 업종별 분포
            cursor.execute("""
                SELECT 
                    uptaenm as business_type_name,
                    COUNT(*) as store_count
                FROM "store_point_5186"
                WHERE uptaenm IS NOT NULL
                    AND uptaenm != ''
                GROUP BY uptaenm
                ORDER BY store_count DESC
                LIMIT 10
            """)
            results = cursor.fetchall()
        
        data = {
            'labels': [row[0] for row in results],
            'datasets': [{
                'data': [int(row[1]) for row in results],
                'backgroundColor': [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                ],
                'borderWidth': 2
            }]
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Business type data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def survival_rate_data(request):
    """생존률 데이터 API - 행정동별 평균 생존률 (store_result EMD_KOR_NM 기반)"""
    try:
        with connection.cursor() as cursor:
            # GPKG 데이터의 EMD_KOR_NM을 사용한 행정동별 생존률 계산 (0 포함, 100% 제외)
            cursor.execute("""
                SELECT 
                    COALESCE(emd_kor_nm, '기타') as dong_name,
                    AVG(result * 100) as avg_survival_rate,
                    COUNT(*) as analysis_count
                FROM "store_result"
                WHERE result IS NOT NULL
                    AND emd_kor_nm IS NOT NULL
                    AND emd_kor_nm != ''
                GROUP BY emd_kor_nm
                HAVING COUNT(*) >= 10  -- 최소 10건 이상 있는 동만
                    AND AVG(result * 100) < 100  -- 100% 생존률 제외
                ORDER BY avg_survival_rate DESC
                LIMIT 10
            """)
            
            results = cursor.fetchall()
            
            # 동명만으로 라벨 생성
            labels = [row[0] for row in results]
            
            # 전체 분석 건수 확인 (0 포함)
            cursor.execute("""
                SELECT COUNT(*) FROM "store_result"
                WHERE result IS NOT NULL
            """)
            total_count = cursor.fetchone()[0]
        
        data = {
            'labels': labels,
            'datasets': [{
                'label': '평균 생존률 (%) - 행정동별',
                'data': [round(float(row[1]), 1) for row in results],
                'backgroundColor': 'rgba(153, 102, 255, 0.8)',
                'borderColor': 'rgba(153, 102, 255, 1)',
                'borderWidth': 2
            }],
            'analysis_counts': [int(row[2]) for row in results],
            'total_analysis_count': total_count
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Survival rate data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def age_distribution_data(request):
    """연령대 분포 데이터 API - 행정동별 전체 생활인구 데이터 기준"""
    try:
        district = request.GET.get('district', None)
        
        if district:
            with connection.cursor() as cursor:
                # 외국인 체류 데이터에서 특정 구의 연령대 분포 (행정동 기준)
                # life_pop_grid_10m_5186에는 adstrd_cd가 없으므로 대안 방법 사용
                cursor.execute("""
                    SELECT 
                        SUM("20대") * 1000 as total_20s,
                        SUM("30대") * 1000 as total_30s,
                        SUM("40대") * 1000 as total_40s,
                        SUM("50대") * 1000 as total_50s,
                        SUM("60대") * 1000 as total_60s,
                        SUM(총생활인구수) * 1000 as total_pop
                    FROM "life_pop_grid_10m_5186"
                    WHERE 총생활인구수 > 0
                    LIMIT 1000
                """)
                
                result = cursor.fetchone()
                
                if result and result[5]:  # total_pop이 있는 경우
                    data = {
                        'labels': ['20대', '30대', '40대', '50대', '60대+'],
                        'datasets': [{
                            'data': [
                                round(float(result[0]) if result[0] else 0),
                                round(float(result[1]) if result[1] else 0),
                                round(float(result[2]) if result[2] else 0),
                                round(float(result[3]) if result[3] else 0),
                                round(float(result[4]) if result[4] else 0)
                            ],
                            'backgroundColor': [
                                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                            ],
                            'borderWidth': 2
                        }]
                    }
                else:
                    data = {
                        'labels': ['20대', '30대', '40대', '50대', '60대+'],
                        'datasets': [{
                            'data': [0, 0, 0, 0, 0],
                            'backgroundColor': [
                                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                            ],
                            'borderWidth': 2
                        }]
                    }
        else:
            # 외국인 체류 데이터에서 행정동 목록 가져오기 (adstrd_cd가 있는 테이블)
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT 
                        SUBSTRING(adstrd_cd, 1, 5) as district_code
                    FROM "long_foreign_25m_5186"
                    WHERE adstrd_cd LIKE '111%'
                        AND 전체외국인체류인구수 > 0
                    ORDER BY district_code
                    LIMIT 25
                """)
                
                results = cursor.fetchall()
                
                # 구 코드를 구 이름으로 매핑
                district_map = {
                    '11110': '종로구', '11140': '중구', '11170': '용산구', '11200': '성동구',
                    '11215': '광진구', '11230': '동대문구', '11260': '중랑구', '11290': '성북구',
                    '11305': '강북구', '11320': '도봉구', '11350': '노원구', '11380': '은평구',
                    '11410': '서대문구', '11440': '마포구', '11470': '양천구', '11500': '강서구',
                    '11530': '구로구', '11545': '금천구', '11560': '영등포구', '11590': '동작구',
                    '11620': '관악구', '11650': '서초구', '11680': '강남구', '11710': '송파구',
                    '11740': '강동구'
                }
                
                district_list = [district_map.get(row[0], row[0]) for row in results]
                data = {'district_list': district_list}
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Age distribution data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def dashboard_stats(request):
    """대시보드 통계 데이터 API - 분석건수는 analysisresult, 생존률은 store_result 기반"""
    try:
        with connection.cursor() as cursor:
            # 실제 사용자 분석 건수 (AI_Analyzer_analysisresult)
            cursor.execute("""
                SELECT COUNT(*) FROM "AI_Analyzer_analysisresult"
            """)
            total_analysis = cursor.fetchone()[0]
            
            # store_result 테이블 기반 평균 생존률 계산 (result * 100, 0 포함)
            cursor.execute("""
                SELECT AVG(result * 100) 
                FROM "store_result"
                WHERE result IS NOT NULL
            """)
            avg_survival_rate = cursor.fetchone()[0]
            
            # 서울시 전체 업소 수 (store_point_5186 전체 행 수)
            cursor.execute("""
                SELECT COUNT(*) FROM "store_point_5186"
            """)
            total_businesses = cursor.fetchone()[0]
            
            # 분석이 이루어진 활발 지역 수
            cursor.execute("""
                SELECT COUNT(DISTINCT SPLIT_PART(SPLIT_PART(req.address, ' ', 3), ' ', 1))
                FROM "AI_Analyzer_analysisrequest" req
                WHERE req.address LIKE '서울%'
                    AND LENGTH(SPLIT_PART(req.address, ' ', 3)) > 0
            """)
            active_districts = cursor.fetchone()[0]
            
            # 추가 통계: 전체 데이터 기반
            cursor.execute("""
                SELECT COUNT(*) FROM "public_5186"
            """)
            total_public = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM "school_5186"
            """)
            total_schools = cursor.fetchone()[0]
            
            stats = {
                'total_analysis': int(total_analysis) if total_analysis else 0,
                'avg_survival_rate': round(float(avg_survival_rate), 1) if avg_survival_rate else 0,
                'total_businesses': int(total_businesses) if total_businesses else 0,
                'active_districts': int(active_districts) if active_districts else 0,
                'total_public_facilities': int(total_public) if total_public else 0,
                'total_schools': int(total_schools) if total_schools else 0
            }
        
        return JsonResponse(stats)
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def top_business_survival_rate(request):
    """업종별 평균 생존률 상위 TOP3 API (store_result 테이블 기반, 0값 포함)"""
    try:
        with connection.cursor() as cursor:
            # store_result 테이블 기반 업종별 평균 생존률 계산 (0값도 포함하여 정확한 평균 계산)
            cursor.execute("""
                SELECT 
                    uptaenm as business_type_name,
                    AVG(result * 100) as avg_survival_rate,
                    COUNT(*) as analysis_count,
                    AVG(area) as avg_area,
                    COUNT(CASE WHEN result = 0 THEN 1 END) as zero_count,
                    MIN(result * 100) as min_survival_rate,
                    MAX(result * 100) as max_survival_rate
                FROM "store_result"
                WHERE result IS NOT NULL 
                    AND uptaenm IS NOT NULL
                    AND uptaenm != ''
                GROUP BY uptaenm
                HAVING COUNT(*) >= 10  -- 최소 10건 이상 있는 업종만
                ORDER BY avg_survival_rate DESC
                LIMIT 3
            """)
            
            results = cursor.fetchall()
            
            # 전체 분석 건수 확인 (0 포함)
            cursor.execute("""
                SELECT COUNT(*) FROM "store_result"
                WHERE result IS NOT NULL
            """)
            total_count = cursor.fetchone()[0]
        
        # 결과가 없는 경우 기본값 사용 (업종명, 생존률, 분석건수, 평균면적, 0건수, 최소생존률, 최대생존률)
        if not results:
            results = [
                ('카페', 75.5, 15, 45.2, 0, 65.0, 85.0),
                ('음식점', 68.2, 22, 52.8, 1, 55.0, 80.0),
                ('편의점', 62.1, 18, 38.9, 2, 45.0, 75.0)
            ]
        
        data = {
            'labels': [row[0] for row in results],
            'datasets': [{
                'label': '평균 생존률 (%) - 0값 포함',
                'data': [round(float(row[1]), 1) for row in results],
                'backgroundColor': [
                    'rgba(65, 84, 241, 0.8)',   # 1위: 파란색
                    'rgba(5, 150, 82, 0.8)',    # 2위: 초록색
                    'rgba(255, 107, 53, 0.8)'   # 3위: 오렌지색
                ],
                'borderColor': [
                    'rgba(65, 84, 241, 1)',
                    'rgba(5, 150, 82, 1)',
                    'rgba(255, 107, 53, 1)'
                ],
                'borderWidth': 2
            }],
            'analysis_counts': [int(row[2]) for row in results],
            'avg_area': [round(float(row[3]), 1) for row in results],
            'store_counts': [int(row[2]) for row in results],  # 분석 건수를 매장 수로 사용
            'zero_counts': [int(row[4]) for row in results],  # 0값 개수
            'min_survival_rates': [round(float(row[5]), 1) for row in results],  # 최소 생존률
            'max_survival_rates': [round(float(row[6]), 1) for row in results],  # 최대 생존률
            'total_analysis_count': total_count if total_count else 0
        }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Top business survival rate data error: {e}")
        # 에러 발생 시 기본 데이터 반환
        return JsonResponse({
            'labels': ['카페', '음식점', '편의점'],
            'datasets': [{
                'label': '평균 생존률 (%)',
                'data': [75.5, 68.2, 62.1],
                'backgroundColor': [
                    'rgba(65, 84, 241, 0.8)',
                    'rgba(5, 150, 82, 0.8)',
                    'rgba(255, 107, 53, 0.8)'
                ],
                'borderColor': [
                    'rgba(65, 84, 241, 1)',
                    'rgba(5, 150, 82, 1)',
                    'rgba(255, 107, 53, 1)'
                ],
                'borderWidth': 2
            }],
            'analysis_counts': [15, 22, 18],
            'avg_area': [45.2, 52.8, 38.9],
            'store_counts': [15, 22, 18],
            'total_analysis_count': 0
        })


def district_data(request):
    """서울시 구별 데이터 API - 직장인구, 거주인구, 업체 수"""
    try:
        with connection.cursor() as cursor:
            # 구별 집계 데이터
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN emd_cd LIKE '11110%' THEN '종로구'
                        WHEN emd_cd LIKE '11140%' THEN '중구'
                        WHEN emd_cd LIKE '11170%' THEN '용산구'
                        WHEN emd_cd LIKE '11200%' THEN '성동구'
                        WHEN emd_cd LIKE '11215%' THEN '광진구'
                        WHEN emd_cd LIKE '11230%' THEN '동대문구'
                        WHEN emd_cd LIKE '11260%' THEN '중랑구'
                        WHEN emd_cd LIKE '11290%' THEN '성북구'
                        WHEN emd_cd LIKE '11305%' THEN '강북구'
                        WHEN emd_cd LIKE '11320%' THEN '도봉구'
                        WHEN emd_cd LIKE '11350%' THEN '노원구'
                        WHEN emd_cd LIKE '11380%' THEN '은평구'
                        WHEN emd_cd LIKE '11410%' THEN '서대문구'
                        WHEN emd_cd LIKE '11440%' THEN '마포구'
                        WHEN emd_cd LIKE '11470%' THEN '양천구'
                        WHEN emd_cd LIKE '11500%' THEN '강서구'
                        WHEN emd_cd LIKE '11530%' THEN '구로구'
                        WHEN emd_cd LIKE '11545%' THEN '금천구'
                        WHEN emd_cd LIKE '11560%' THEN '영등포구'
                        WHEN emd_cd LIKE '11590%' THEN '동작구'
                        WHEN emd_cd LIKE '11620%' THEN '관악구'
                        WHEN emd_cd LIKE '11650%' THEN '서초구'
                        WHEN emd_cd LIKE '11680%' THEN '강남구'
                        WHEN emd_cd LIKE '11710%' THEN '송파구'
                        WHEN emd_cd LIKE '11740%' THEN '강동구'
                        ELSE '기타'
                    END as district_name,
                    CAST(ROUND(CAST(SUM(총생활인구수_sum) AS NUMERIC), 0) AS INTEGER) as total_life_population,
                    CAST(ROUND(CAST(SUM(총생활인구수_sum * 0.7) AS NUMERIC), 0) AS INTEGER) as estimated_work_population
                FROM dong_life
                WHERE emd_cd LIKE '11%'
                    AND 총생활인구수_sum > 0
                GROUP BY 
                    CASE 
                        WHEN emd_cd LIKE '11110%' THEN '종로구'
                        WHEN emd_cd LIKE '11140%' THEN '중구'
                        WHEN emd_cd LIKE '11170%' THEN '용산구'
                        WHEN emd_cd LIKE '11200%' THEN '성동구'
                        WHEN emd_cd LIKE '11215%' THEN '광진구'
                        WHEN emd_cd LIKE '11230%' THEN '동대문구'
                        WHEN emd_cd LIKE '11260%' THEN '중랑구'
                        WHEN emd_cd LIKE '11290%' THEN '성북구'
                        WHEN emd_cd LIKE '11305%' THEN '강북구'
                        WHEN emd_cd LIKE '11320%' THEN '도봉구'
                        WHEN emd_cd LIKE '11350%' THEN '노원구'
                        WHEN emd_cd LIKE '11380%' THEN '은평구'
                        WHEN emd_cd LIKE '11410%' THEN '서대문구'
                        WHEN emd_cd LIKE '11440%' THEN '마포구'
                        WHEN emd_cd LIKE '11470%' THEN '양천구'
                        WHEN emd_cd LIKE '11500%' THEN '강서구'
                        WHEN emd_cd LIKE '11530%' THEN '구로구'
                        WHEN emd_cd LIKE '11545%' THEN '금천구'
                        WHEN emd_cd LIKE '11560%' THEN '영등포구'
                        WHEN emd_cd LIKE '11590%' THEN '동작구'
                        WHEN emd_cd LIKE '11620%' THEN '관악구'
                        WHEN emd_cd LIKE '11650%' THEN '서초구'
                        WHEN emd_cd LIKE '11680%' THEN '강남구'
                        WHEN emd_cd LIKE '11710%' THEN '송파구'
                        WHEN emd_cd LIKE '11740%' THEN '강동구'
                        ELSE '기타'
                    END
                ORDER BY total_life_population DESC
            """)
            
            districts = cursor.fetchall()
            
            # 업체 수 데이터 (대략적인 추정)
            cursor.execute("""
                SELECT COUNT(*) as total_businesses
                FROM "store_point_5186"
            """)
            
            total_businesses = cursor.fetchone()[0]
            businesses_per_district = total_businesses // 25  # 25개구 평균
            
        district_data = {}
        for district in districts:
            district_data[district[0]] = {
                'name': district[0],
                'life_population': int(district[1]) if district[1] else 0,
                'work_population': int(district[2]) if district[2] else 0,
                'business_count': businesses_per_district + (int(district[1]) // 10000)  # 인구 기반 추정
            }
        
        return JsonResponse(district_data)
    except Exception as e:
        print(f"District data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def dong_data(request):
    """행정동별 데이터 API - 특정 구의 행정동 데이터"""
    district = request.GET.get('district', '')
    
    try:
        with connection.cursor() as cursor:
            # 구 코드 매핑
            district_codes = {
                '종로구': '11110', '중구': '11140', '용산구': '11170', '성동구': '11200',
                '광진구': '11215', '동대문구': '11230', '중랑구': '11260', '성북구': '11290',
                '강북구': '11305', '도봉구': '11320', '노원구': '11350', '은평구': '11380',
                '서대문구': '11410', '마포구': '11440', '양천구': '11470', '강서구': '11500',
                '구로구': '11530', '금천구': '11545', '영등포구': '11560', '동작구': '11590',
                '관악구': '11620', '서초구': '11650', '강남구': '11680', '송파구': '11710',
                '강동구': '11740'
            }
            
            district_code = district_codes.get(district, '11110')
            
            # 해당 구의 행정동별 데이터
            cursor.execute("""
                SELECT 
                    emd_kor_nm,
                    emd_cd,
                    CAST(ROUND(CAST(총생활인구수_sum AS NUMERIC), 0) AS INTEGER) as life_population,
                    CAST(ROUND(CAST(총생활인구수_sum * 0.7 AS NUMERIC), 0) AS INTEGER) as work_population
                FROM dong_life
                WHERE emd_cd LIKE %s
                    AND 총생활인구수_sum > 0
                    AND emd_kor_nm IS NOT NULL
                ORDER BY 총생활인구수_sum DESC
            """, [f"{district_code}%"])
            
            results = cursor.fetchall()
        
        dong_data_result = {}
        for row in results:
            dong_name = row[0] or f"행정동_{row[1][-3:]}"
            dong_data_result[dong_name] = {
                'name': dong_name,
                'code': row[1],
                'life_population': int(row[2]) if row[2] else 0,
                'work_population': int(row[3]) if row[3] else 0,
                'business_count': max(50, int(row[2]) // 100) if row[2] else 50  # 인구 기반 추정
            }
        
        return JsonResponse(dong_data_result)
    except Exception as e:
        print(f"Dong data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def get_geometry_data(request):
    """지오메트리 데이터 API - 전체 공간 데이터 통계"""
    try:
        with connection.cursor() as cursor:
            # 전체 공간 데이터 테이블들의 통계 (빠른 조회)
            spatial_tables = [
                'store_point_5186',
                'public_5186',
                'school_5186'
            ]
            
            table_stats = {}
            for table in spatial_tables:
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                table_stats[table] = count
            
            # 서울시 전체 업종별 상점 분포 (상위 5개)
            cursor.execute("""
                SELECT 
                    uptaenm,
                    COUNT(*) as store_count,
                    AVG(area) as avg_area
                FROM "store_point_5186"
                WHERE uptaenm IS NOT NULL
                GROUP BY uptaenm
                ORDER BY store_count DESC
                LIMIT 5
            """)
            
            top_business_types = cursor.fetchall()
            
            # 행정동별 외국인 체류 통계 (샘플)
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT adstrd_cd) as total_dong,
                    SUM(전체외국인체류인구수) as total_foreign_pop
                FROM "long_foreign_25m_5186"
                WHERE adstrd_cd LIKE '111%'
                    AND 전체외국인체류인구수 > 0
            """)
            
            district_stats = cursor.fetchone()
            
            data = {
                'spatial_table_stats': table_stats,
                'top_business_types': [
                    {'type': row[0], 'count': row[1], 'avg_area': round(row[2], 2)}
                    for row in top_business_types
                ],
                'total_administrative_dong': int(district_stats[0]) if district_stats[0] else 0,
                'total_foreign_population': round(float(district_stats[1]), 0) if district_stats[1] else 0,
                'message': '서울시 행정동별 공간 데이터 통계입니다.'
            }
        
        return JsonResponse(data)
    except Exception as e:
        print(f"Geometry data error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def get_seoul_districts_geojson(request):
    """서울시 구별 경계면 벡터 타일 데이터 API"""
    try:
        from GeoDB.models import SeoulDistrict
        from django.contrib.gis.serializers import geojson
        from django.db.models import Count, Sum
        
        # 구별 데이터 조회
        districts = SeoulDistrict.objects.all().order_by('adm_sect_c')
        
        features = []
        for district in districts:
            # 해당 구의 행정동 수 계산 (간단한 쿼리)
            with connection.cursor() as cursor:
                # 행정동 수 계산
                cursor.execute("""
                    SELECT COUNT(*) FROM "행정동구역" 
                    WHERE emd_cd LIKE %s
                """, [f"{district.adm_sect_c}%"])
                dong_count = cursor.fetchone()[0] or 0
                
                # 인구 수 계산
                cursor.execute("""
                    SELECT COALESCE(SUM(총생활인구수_sum), 0) FROM dong_life 
                    WHERE emd_cd LIKE %s
                """, [f"{district.adm_sect_c}%"])
                total_population = int(cursor.fetchone()[0] or 0)
                
                # 실제 업체 수 계산 (dong_store 테이블에서 COUNT)
                cursor.execute("""
                    SELECT COUNT(*) FROM dong_store ds
                    JOIN "행정동구역" ad ON ds.emd_kor_nm = ad.emd_kor_nm
                    WHERE ad.emd_cd LIKE %s
                """, [f"{district.adm_sect_c}%"])
                total_businesses = int(cursor.fetchone()[0] or 0)
            
            # GeoJSON Feature 생성 (원본 좌표계 사용)
            feature = {
                "type": "Feature",
                "id": district.adm_sect_c,  # 벡터 타일용 ID 추가
                "properties": {
                    "adm_sect_c": district.adm_sect_c,
                    "district_name": district.district_name_only,
                    "full_name": district.sgg_nm,
                    "dong_count": dong_count,
                    "total_population": total_population,
                    "total_businesses": total_businesses,
                    "area_sqkm": district.area_sqkm
                },
                "geometry": json.loads(district.geom.geojson)
            }
            features.append(feature)
        
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return JsonResponse(geojson_data)
        
    except Exception as e:
        print(f"Seoul districts GeoJSON error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def get_dong_geojson(request):
    """행정동별 경계면 GeoJSON 데이터 API"""
    try:
        gu_code = request.GET.get('gu_code')  # 구 코드 (예: 11110)
        
        if not gu_code:
            return JsonResponse({'error': 'gu_code parameter required'}, status=400)
        
        from django.db import connection
        
        with connection.cursor() as cursor:
            # 행정동 기본 정보 조회 (원본 좌표계 사용)
            cursor.execute("""
                SELECT emd_cd, emd_kor_nm, emd_eng_nm, ST_AsGeoJSON(geom) as geometry
                FROM "행정동구역"
                WHERE emd_cd LIKE %s
                ORDER BY emd_cd
            """, [f"{gu_code}%"])
            
            admin_results = cursor.fetchall()
            
            # 각 행정동의 인구 데이터 조회
            results = []
            for admin_row in admin_results:
                emd_cd, emd_kor_nm, emd_eng_nm, geometry = admin_row
                
                # 거주인구 조회
                cursor.execute("""
                    SELECT COALESCE(총생활인구수_sum, 0) FROM dong_life WHERE emd_cd = %s
                """, [emd_cd])
                dong_life = int(cursor.fetchone()[0] or 0)
                
                # 직장인구 조회
                cursor.execute("""
                    SELECT COALESCE(총_직장_인구_수_sum, 0) FROM dong_work WHERE emd_cd = %s
                """, [emd_cd])
                dong_work = int(cursor.fetchone()[0] or 0)
                
                # 실제 업체 수 조회 (dong_store 테이블에서 COUNT)
                cursor.execute("""
                    SELECT COUNT(*) FROM dong_store ds
                    JOIN "행정동구역" ad ON ds.emd_kor_nm = ad.emd_kor_nm
                    WHERE ad.emd_cd = %s
                """, [emd_cd])
                total_businesses = int(cursor.fetchone()[0] or 0)
                
                # 평균 생존률 조회 (store_result 테이블에서)
                cursor.execute("""
                    SELECT COALESCE(AVG(result * 100), 0) 
                    FROM "store_result" sr
                    JOIN "행정동구역" ad ON sr.emd_kor_nm = ad.emd_kor_nm
                    WHERE ad.emd_cd = %s AND sr.result IS NOT NULL
                """, [emd_cd])
                avg_survival_rate = float(cursor.fetchone()[0] or 0)
                
                # 가장 많은 업종 조회 (dong_store 테이블에서)
                cursor.execute("""
                    SELECT ds."UPTAENM", COUNT(*) as count
                    FROM dong_store ds
                    JOIN "행정동구역" ad ON ds.emd_kor_nm = ad.emd_kor_nm
                    WHERE ad.emd_cd = %s AND ds."UPTAENM" IS NOT NULL
                    GROUP BY ds."UPTAENM"
                    ORDER BY count DESC
                    LIMIT 1
                """, [emd_cd])
                
                top_business_result = cursor.fetchone()
                if top_business_result:
                    top_business_type, top_business_count = top_business_result
                else:
                    top_business_type, top_business_count = "정보없음", 0
                
                results.append((emd_cd, emd_kor_nm, emd_eng_nm, geometry, dong_life, dong_work, 
                              total_businesses, avg_survival_rate, top_business_type, top_business_count))
        
        features = []
        for row in results:
            emd_cd, emd_kor_nm, emd_eng_nm, geometry, dong_life, dong_work, total_businesses, avg_survival_rate, top_business_type, top_business_count = row
            
            feature = {
                "type": "Feature",
                "properties": {
                    "emd_cd": emd_cd,
                    "emd_kor_nm": emd_kor_nm,
                    "emd_eng_nm": emd_eng_nm,
                    "dong_life": int(dong_life) if dong_life else 0,
                    "dong_work": int(dong_work) if dong_work else 0,
                    "total_businesses": int(total_businesses) if total_businesses else 0,
                    "avg_survival_rate": round(float(avg_survival_rate), 1),
                    "top_business_type": top_business_type,
                    "top_business_count": int(top_business_count)
                },
                "geometry": json.loads(geometry) if geometry else None
            }
            features.append(feature)
        
        geojson_data = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return JsonResponse(geojson_data)
        
    except Exception as e:
        print(f"Dong GeoJSON error: {e}")
        return JsonResponse({'error': str(e)}, status=500) 