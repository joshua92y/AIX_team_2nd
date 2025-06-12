from django.contrib.gis.db import models
from django.db import models as django_models



class BusinessType(django_models.Model):
    """
    업종 마스터 데이터
    
    Attributes:
        id (int): 업종 고유 ID (Primary Key)
        name (str): 업종명 (최대 50자)
        
    Note:
        - 상권 분석 시 업종별 특성을 반영하는 기준 데이터
        - XGBoost 모델에서 업종 ID가 피쳐로 사용됨
    """
    id = django_models.IntegerField(primary_key=True)
    name = django_models.CharField(max_length=50, verbose_name="업종명")
    
    class Meta:
        db_table = 'business_type'
        verbose_name = "업종"
        verbose_name_plural = "업종"
    
    def __str__(self):
        return self.name


class AnalysisRequest(django_models.Model):
    """
    분석 요청 데이터
    
    Attributes:
        address (str): 분석 대상 주소
        area (float): 사업장 면적(㎡)
        business_type (BusinessType): 업종 (외래키)
        service_type (int): 서비스 유형 (0: 휴게음식점, 1: 일반음식점)
        longitude, latitude (float): WGS84 좌표
        x_coord, y_coord (float): EPSG:5186 좌표
        created_at (datetime): 분석 요청 일시
        
    Note:
        - 공간 분석을 위해 WGS84와 EPSG:5186 좌표를 모두 저장
        - AnalysisResult와 1:1 관계
    """
    user = django_models.ForeignKey('custom_auth.User', on_delete=django_models.CASCADE, verbose_name="사용자", null=True, blank=True)
    address = django_models.CharField(max_length=200, verbose_name="주소")
    area = django_models.FloatField(verbose_name="면적(㎡)")
    business_type = django_models.ForeignKey(BusinessType, on_delete=django_models.CASCADE, verbose_name="업종")
    service_type = django_models.IntegerField(choices=[(0, '휴게음식점'), (1, '일반음식점')], verbose_name="서비스 유형")
    
    # 좌표 정보
    longitude = django_models.FloatField(verbose_name="경도(WGS84)")
    latitude = django_models.FloatField(verbose_name="위도(WGS84)")
    x_coord = django_models.FloatField(verbose_name="X좌표(EPSG:5186)")
    y_coord = django_models.FloatField(verbose_name="Y좌표(EPSG:5186)")
    
    # 분석 결과
    created_at = django_models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "분석 요청"
        verbose_name_plural = "분석 요청"
    
    def __str__(self):
        return f"{self.address} - {self.business_type.name}"


class AnalysisResult(django_models.Model):
    """
    분석 결과 데이터
    
    Attributes:
        request (AnalysisRequest): 분석 요청 (1:1 외래키)
        
        # 생활인구 관련
        life_pop_300m (int): 300m 반경 내 총 생활인구
        life_pop_*_300m (float): 300m 반경 내 연령대별 비율(%)
        life_pop_*_1000m (float): 1000m 반경 내 연령대별 비율(%)
        
        # 외국인 관련  
        temp_foreign_1000m (int): 1000m 반경 내 단기체류 외국인 수
        temp_foreign_cn_*m (float): 단기체류 중국인 비율(%)
        long_foreign_*m (int): 장기체류 외국인 수
        long_foreign_cn_*m (float): 장기체류 중국인 비율(%)
        
        # 주변 시설
        working_pop_300m (int): 300m 반경 내 직장인구
        public_building_250m (int): 250m 반경 내 공공건물 수
        school_250m (int): 250m 반경 내 학교 수
        
        # 상권 분석
        competitor_300m (int): 300m 반경 내 동일업종 경쟁업체 수
        adjacent_biz_300m (int): 300m 반경 내 전체 요식업체 수
        competitor_ratio_300m (float): 경쟁업체 비율(%)
        business_diversity_300m (int): 업종 다양성
        
        # 기타
        area (float): 면적(㎡)
        service_type (int): 서비스 유형
        total_land_value (float): 총 공시지가
        
        # AI 예측 결과
        survival_probability (float): 생존 확률 (0-1)
        survival_percentage (float): 생존 확률 (%)
        
        created_at (datetime): 결과 생성 일시
        
    Note:
        - 공간 분석 결과와 AI 예측 결과를 종합 저장
        - PDF 생성 및 결과 조회에 활용
    """
    request = django_models.OneToOneField(AnalysisRequest, on_delete=django_models.CASCADE, verbose_name="분석 요청")
    user = django_models.ForeignKey('custom_auth.User', on_delete=django_models.CASCADE, verbose_name="사용자", null=True, blank=True)
    
    # 생활인구 관련
    life_pop_300m = django_models.IntegerField(verbose_name="300m내 총생활인구", default=0)
    life_pop_20_300m = django_models.FloatField(verbose_name="300m내 20대 비율(%)", default=0)
    life_pop_30_300m = django_models.FloatField(verbose_name="300m내 30대 비율(%)", default=0)
    life_pop_40_300m = django_models.FloatField(verbose_name="300m내 40대 비율(%)", default=0)
    life_pop_50_300m = django_models.FloatField(verbose_name="300m내 50대 비율(%)", default=0)
    life_pop_60_300m = django_models.FloatField(verbose_name="300m내 60대 비율(%)", default=0)
    
    life_pop_20_1000m = django_models.FloatField(verbose_name="1000m내 20대 비율(%)", default=0)
    life_pop_30_1000m = django_models.FloatField(verbose_name="1000m내 30대 비율(%)", default=0)
    life_pop_40_1000m = django_models.FloatField(verbose_name="1000m내 40대 비율(%)", default=0)
    life_pop_50_1000m = django_models.FloatField(verbose_name="1000m내 50대 비율(%)", default=0)
    life_pop_60_1000m = django_models.FloatField(verbose_name="1000m내 60대 비율(%)", default=0)
    
    # 외국인 관련
    temp_foreign_1000m = django_models.IntegerField(verbose_name="1000m내 단기체류외국인", default=0)
    temp_foreign_cn_300m = django_models.FloatField(verbose_name="300m내 단기체류 중국인 비율(%)", default=0)
    temp_foreign_cn_1000m = django_models.FloatField(verbose_name="1000m내 단기체류 중국인 비율(%)", default=0)
    
    long_foreign_300m = django_models.IntegerField(verbose_name="300m내 장기체류외국인", default=0)
    long_foreign_1000m = django_models.IntegerField(verbose_name="1000m내 장기체류외국인", default=0)
    long_foreign_cn_1000m = django_models.FloatField(verbose_name="1000m내 장기체류 중국인 비율(%)", default=0)
    
    # 직장인구
    working_pop_300m = django_models.IntegerField(verbose_name="300m내 직장인구", default=0)
    
    # 주변 시설
    public_building_250m = django_models.IntegerField(verbose_name="250m내 공공건물 수", default=0)
    school_250m = django_models.IntegerField(verbose_name="250m내 학교 수", default=0)
    
    # 상권 분석
    competitor_300m = django_models.IntegerField(verbose_name="300m내 동일업종 경쟁업체 수", default=0)
    adjacent_biz_300m = django_models.IntegerField(verbose_name="300m내 전체 요식업체 수", default=0)
    competitor_ratio_300m = django_models.FloatField(verbose_name="300m내 경쟁업체 비율(%)", default=0)
    business_diversity_300m = django_models.IntegerField(verbose_name="300m내 업종 다양성", default=0)
    
    # 면적 및 서비스
    area = django_models.FloatField(verbose_name="면적(㎡)", default=0)
    service_type = django_models.IntegerField(verbose_name="서비스 유형", default=0)
    
    # 공시지가
    total_land_value = django_models.FloatField(verbose_name="총 공시지가", default=0)
    
    # AI 예측 결과
    survival_probability = django_models.FloatField(verbose_name="생존 확률 (0-1)", default=0)
    survival_percentage = django_models.FloatField(verbose_name="생존 확률 (%)", default=0)
    
    created_at = django_models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "분석 결과"
        verbose_name_plural = "분석 결과"
    
    def __str__(self):
        return f"{self.request.address} 분석결과"
