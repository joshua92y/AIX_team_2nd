from django import forms
from django.contrib.gis import forms as gis_forms
from .widgets import KakaoPointWidget, KakaoPolygonWidget
from .models import *


class BaseGISForm(forms.ModelForm):
    """카카오맵 위젯을 사용하는 기본 GIS 폼"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # 모든 지오메트리 필드에 카카오맵 위젯 적용
        for field_name, field in self.fields.items():
            if isinstance(field, gis_forms.GeometryField):
                if hasattr(field, 'geom_type'):
                    if field.geom_type == 'POINT':
                        field.widget = KakaoPointWidget()
                    elif field.geom_type == 'POLYGON':
                        field.widget = KakaoPolygonWidget()
                    else:
                        field.widget = KakaoPointWidget()  # 기본값
                # GeometryField가 geom_type을 직접 가지지 않는 경우
                elif hasattr(self._meta.model, field_name):
                    model_field = self._meta.model._meta.get_field(field_name)
                    if hasattr(model_field, 'geom_type'):
                        if model_field.geom_type == 'POINT':
                            field.widget = KakaoPointWidget()
                        elif model_field.geom_type == 'POLYGON':
                            field.widget = KakaoPolygonWidget()
                        else:
                            field.widget = KakaoPointWidget()


class LifePopGridForm(BaseGISForm):
    """생활인구 그리드 폼"""
    class Meta:
        model = LifePopGrid
        fields = '__all__'


class WorkGridForm(BaseGISForm):
    """직장인구 그리드 폼"""
    class Meta:
        model = WorkGrid
        fields = '__all__'


class TempForeignForm(BaseGISForm):
    """단기체류외국인 폼"""
    class Meta:
        model = TempForeign
        fields = '__all__'


class LongForeignForm(BaseGISForm):
    """장기체류외국인 폼"""
    class Meta:
        model = LongForeign
        fields = '__all__'


class StorePointForm(BaseGISForm):
    """상점 포인트 폼"""
    class Meta:
        model = StorePoint
        fields = '__all__'


class SchoolForm(BaseGISForm):
    """학교 폼"""
    class Meta:
        model = School
        fields = '__all__'


class PublicBuildingForm(BaseGISForm):
    """공공건물 폼"""
    class Meta:
        model = PublicBuilding
        fields = '__all__'


class LandValueForm(BaseGISForm):
    """공시지가 폼"""
    class Meta:
        model = LandValue
        fields = '__all__'


class EditableStorePointForm(BaseGISForm):
    """편집 가능한 상점 폼"""
    class Meta:
        model = EditableStorePoint
        fields = '__all__'


class EditablePublicBuildingForm(BaseGISForm):
    """편집 가능한 공공건물 폼"""
    class Meta:
        model = EditablePublicBuilding
        fields = '__all__'


class AdministrativeDistrictForm(BaseGISForm):
    """행정동구역 폼"""
    class Meta:
        model = AdministrativeDistrict
        fields = '__all__' 