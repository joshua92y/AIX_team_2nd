from django.contrib.gis.db import models
from django.db import models as django_models


class BusinessType(django_models.Model):
    """업종 마스터 데이터"""
    id = django_models.IntegerField(primary_key=True)
    name = django_models.CharField(max_length=50, verbose_name="업종명")
    
    class Meta:
        db_table = 'business_type'
        verbose_name = "업종"
        verbose_name_plural = "업종"
    
    def __str__(self):
        return self.name


class AnalysisRequest(django_models.Model):
    """분석 요청 데이터"""
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
    """분석 결과 데이터"""
    request = django_models.OneToOneField(AnalysisRequest, on_delete=django_models.CASCADE, verbose_name="분석 요청")
    
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
