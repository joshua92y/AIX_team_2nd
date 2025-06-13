#LocaAI\GeoDB\models.py
from django.contrib.gis.db import models
from django.db import models as django_models

# Create your models here.

class LifePopGrid(models.Model):
    """생활인구 그리드 데이터 (10m)"""
    ogc_fid = django_models.AutoField(primary_key=True)
    총생활인구수 = django_models.FloatField(null=True, blank=True, verbose_name="총생활인구수")
    age_20 = django_models.FloatField(null=True, blank=True, verbose_name="20대", db_column="20대")
    age_30 = django_models.FloatField(null=True, blank=True, verbose_name="30대", db_column="30대")
    age_40 = django_models.FloatField(null=True, blank=True, verbose_name="40대", db_column="40대")
    age_50 = django_models.FloatField(null=True, blank=True, verbose_name="50대", db_column="50대")
    age_60 = django_models.FloatField(null=True, blank=True, verbose_name="60대", db_column="60대")
    geom = models.MultiPolygonField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'life_pop_grid_10m_5186'
        verbose_name = "생활인구 그리드"
        verbose_name_plural = "생활인구 그리드"
        managed = False  # Django가 테이블을 관리하지 않음
    
    def __str__(self):
        return f"생활인구: {self.총생활인구수 or 0}명"


class WorkGrid(models.Model):
    """직장인구 그리드 데이터 (10m)"""
    ogc_fid = django_models.AutoField(primary_key=True)
    총_직장_인구_수 = django_models.IntegerField(null=True, blank=True, verbose_name="총직장인구수", db_column="총_직장_인구_수")
    남성_직장_인구_수 = django_models.IntegerField(null=True, blank=True, verbose_name="남성직장인구수", db_column="남성_직장_인구_수")
    여성_직장_인구_수 = django_models.IntegerField(null=True, blank=True, verbose_name="여성직장인구수", db_column="여성_직장_인구_수")
    geom = models.MultiPointField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'workgrid_10m_5186'
        verbose_name = "직장인구 그리드"
        verbose_name_plural = "직장인구 그리드"
        managed = False
    
    def __str__(self):
        return f"직장인구: {self.총_직장_인구_수 or 0}명"


class TempForeign(models.Model):
    """단기체류외국인 데이터 (25m)"""
    ogc_fid = django_models.AutoField(primary_key=True)
    총생활인구수 = django_models.IntegerField(null=True, blank=True, verbose_name="총생활인구수")
    중국인체류인구수 = django_models.IntegerField(null=True, blank=True, verbose_name="중국인체류인구수")
    geom = models.MultiPointField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'temp_foreign_25m_5186'
        verbose_name = "단기체류외국인"
        verbose_name_plural = "단기체류외국인"
        managed = False
    
    def __str__(self):
        return f"단기체류외국인: {self.총생활인구수 or 0}명"


class LongForeign(models.Model):
    """장기체류외국인 데이터 (25m)"""
    ogc_fid = django_models.AutoField(primary_key=True)
    총생활인구수 = django_models.IntegerField(null=True, blank=True, verbose_name="총생활인구수")
    중국인체류인구수 = django_models.IntegerField(null=True, blank=True, verbose_name="중국인체류인구수")
    geom = models.MultiPointField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'long_foreign_25m_5186'
        verbose_name = "장기체류외국인"
        verbose_name_plural = "장기체류외국인"
        managed = False
    
    def __str__(self):
        return f"장기체류외국인: {self.총생활인구수 or 0}명"


class StorePoint(models.Model):
    """상점 포인트 데이터"""
    ogc_fid = django_models.AutoField(primary_key=True)
    uptaenm = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="업태명")
    service = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="서비스")
    area = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="면적")
    x = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="X좌표")
    y = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="Y좌표")
    geom = models.MultiPointField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'store_point_5186'
        verbose_name = "상점"
        verbose_name_plural = "상점"
        managed = False
    
    def __str__(self):
        return f"{self.uptaenm or '상점'} ({self.service or '서비스미상'})"


class School(models.Model):
    """학교 데이터"""
    ogc_fid = django_models.AutoField(primary_key=True)
    school_type = django_models.CharField(max_length=255, verbose_name="학교종류", db_column="_학교종류", null=True, blank=True)
    establishment_type = django_models.CharField(max_length=255, verbose_name="설립구분", db_column="_설립구분_", null=True, blank=True)
    standard_school = django_models.CharField(max_length=255, verbose_name="표준학교", db_column="_표준학교", null=True, blank=True)
    school_name = django_models.CharField(max_length=255, verbose_name="학교명", db_column="_학교명_", null=True, blank=True)
    english_name = django_models.CharField(max_length=255, verbose_name="영문학교", db_column="_영문학교", null=True, blank=True)
    authority = django_models.CharField(max_length=255, verbose_name="관할조직", db_column="_관할조직", null=True, blank=True)
    postal_code = django_models.CharField(max_length=255, verbose_name="도로명우편번호", db_column="_도로명우", null=True, blank=True)
    road_address = django_models.CharField(max_length=255, verbose_name="도로명주소", db_column="_도로명주", null=True, blank=True)
    detail_address = django_models.CharField(max_length=255, verbose_name="도로명상세주소", db_column="_도로명상", null=True, blank=True)
    phone_number = django_models.CharField(max_length=255, verbose_name="전화번호", db_column="_전화번호_", null=True, blank=True)
    homepage = django_models.CharField(max_length=255, verbose_name="홈페이지", db_column="_홈페이지", null=True, blank=True)
    fax_number = django_models.CharField(max_length=255, verbose_name="팩스번호", db_column="_팩스번호_", null=True, blank=True)
    x = django_models.CharField(max_length=255, verbose_name="X좌표", null=True, blank=True)
    y = django_models.CharField(max_length=255, verbose_name="Y좌표", null=True, blank=True)
    geom = models.MultiPointField(srid=5186, verbose_name="위치", null=True, blank=True)
    
    class Meta:
        db_table = 'school_5186'
        verbose_name = "학교"
        verbose_name_plural = "학교"
        managed = False
    
    def __str__(self):
        return f"{self.school_name} ({self.school_type})"


class PublicBuilding(models.Model):
    """공공건물 데이터"""
    ogc_fid = django_models.AutoField(primary_key=True)
    dgm_nm = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="건물명")
    lclas_cl = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="대분류")
    mlsfc_cl = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="중분류")
    dgm_ar = django_models.FloatField(null=True, blank=True, verbose_name="면적")
    geom = models.MultiPolygonField(srid=5186, verbose_name="지오메트리")
    
    class Meta:
        db_table = 'public_5186'
        verbose_name = "공공건물"
        verbose_name_plural = "공공건물"
        managed = False
    
    def __str__(self):
        return f"{self.dgm_nm or '공공건물'} ({self.lclas_cl or '구분미상'})"


class LandValue(models.Model):
    """공시지가 데이터"""
    ogc_fid = django_models.IntegerField(primary_key=True, db_column='ogc_fid')
    A1 = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="A1", db_column='A1')
    A2 = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="A2", db_column='A2')
    A3 = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="A3", db_column='A3')
    A6 = django_models.CharField(max_length=255, null=True, blank=True, verbose_name="A6", db_column='A6')
    A9 = django_models.FloatField(null=True, blank=True, verbose_name="공시지가", db_column='A9')
    geom = models.MultiPolygonField(srid=5186, verbose_name="지오메트리", db_column='geom')
    
    class Meta:
        db_table = 'ltv_5186'
        verbose_name = "공시지가"
        verbose_name_plural = "공시지가"
        managed = False
    
    def __str__(self):
        return f"공시지가: {self.A9 or 0:,.0f}원/㎡"


# 새로운 데이터 추가/편집을 위한 관리형 모델들 (managed=True)
class EditableStorePoint(models.Model):
    """편집 가능한 상점 데이터"""
    storename = django_models.CharField(max_length=200, verbose_name="상호명")
    uptaenm = django_models.CharField(max_length=100, verbose_name="업종명")
    address = django_models.CharField(max_length=500, null=True, blank=True, verbose_name="주소")
    phone = django_models.CharField(max_length=20, null=True, blank=True, verbose_name="전화번호")
    geom = models.PointField(srid=5186, verbose_name="위치")
    created_at = django_models.DateTimeField(auto_now_add=True)
    updated_at = django_models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'editable_store_point'
        verbose_name = "편집가능한 상점"
        verbose_name_plural = "편집가능한 상점"
        managed = True
    
    def __str__(self):
        return f"{self.storename} ({self.uptaenm})"


class EditablePublicBuilding(models.Model):
    """편집 가능한 공공건물 데이터"""
    building_name = django_models.CharField(max_length=200, verbose_name="건물명")
    building_type = django_models.CharField(max_length=100, verbose_name="건물구분")
    address = django_models.CharField(max_length=500, null=True, blank=True, verbose_name="주소")
    description = django_models.TextField(null=True, blank=True, verbose_name="설명")
    geom = models.PointField(srid=5186, verbose_name="위치")
    created_at = django_models.DateTimeField(auto_now_add=True)
    updated_at = django_models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'editable_public_building'
        verbose_name = "편집가능한 공공건물"
        verbose_name_plural = "편집가능한 공공건물"
        managed = True
    
    def __str__(self):
        return f"{self.building_name} ({self.building_type})"
