from django.contrib.gis import admin
from django.contrib import admin as django_admin
from django.db import connection
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html
from django.http import JsonResponse
from .models import (
    LifePopGrid, WorkGrid, TempForeign, LongForeign, 
    StorePoint, School, PublicBuilding, LandValue,
    EditableStorePoint, EditablePublicBuilding
)


class BaseGISAdmin(admin.GISModelAdmin):
    """한국 중부원점(EPSG:5186) 좌표계를 위한 기본 GIS 관리자 클래스"""
    
    # pyproj 방식으로 좌표계 변환 지원
    map_template = 'gis/admin/openlayers.html'
    map_srid = 3857  # Web Mercator (OpenStreetMap 호환)
    display_srid = 5186
    map_width = 800
    map_height = 600
    
    # 한국 영역에 맞는 기본 지도 설정
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 8,
            'default_lat': 36.5,    # 한국 중심부 위도
            'default_lon': 127.5,   # 한국 중심부 경도
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator
            'map_width': 800,
            'map_height': 600,
        },
    }
    
    # 성능 최적화
    list_per_page = 50
    show_full_result_count = False
    
    def get_geometry_info(self, obj):
        """지오메트리 정보를 텍스트로 표시 (PROJ 오류 방지)"""
        if hasattr(obj, 'geom') and obj.geom:
            geom_type = obj.geom.geom_type if hasattr(obj.geom, 'geom_type') else 'Unknown'
            if hasattr(obj.geom, 'centroid'):
                centroid = obj.geom.centroid
                return f"{geom_type} - 중심: ({centroid.x:.6f}, {centroid.y:.6f})"
            elif hasattr(obj.geom, 'x') and hasattr(obj.geom, 'y'):
                return f"{geom_type} - 좌표: ({obj.geom.x:.6f}, {obj.geom.y:.6f})"
            else:
                return f"{geom_type} - 좌표 정보 있음"
        return "지오메트리 없음"
    get_geometry_info.short_description = '위치 정보'
    
    def get_queryset(self, request):
        """목록 조회 시 지오메트리 필드 제외로 성능 최적화"""
        qs = super().get_queryset(request)
        if hasattr(request, 'resolver_match') and 'changelist' in request.resolver_match.url_name:
            return qs.defer('geom')
        return qs


class LifePopGridAdmin(BaseGISAdmin):
    """생활인구 그리드 관리"""
    list_display = ('ogc_fid', 'get_total_pop', 'get_age_groups', 'get_geometry_info')
    list_filter = ('총생활인구수',)
    search_fields = ()
    readonly_fields = ('총생활인구수', 'age_20', 'age_30', 'age_40', 'age_50', 'age_60')
    
    fieldsets = (
        ('인구 정보', {
            'fields': ('총생활인구수',)
        }),
        ('연령별 인구', {
            'fields': (('age_20', 'age_30'), ('age_40', 'age_50'), 'age_60')
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
    def get_total_pop(self, obj):
        return f"{obj.총생활인구수 or 0:,}명"
    get_total_pop.short_description = '총인구'
    
    def get_age_groups(self, obj):
        ages = [obj.age_20 or 0, obj.age_30 or 0, obj.age_40 or 0, obj.age_50 or 0, obj.age_60 or 0]
        return f"20대:{ages[0]} / 30대:{ages[1]} / 40대:{ages[2]}"
    get_age_groups.short_description = '연령대'


class WorkGridAdmin(BaseGISAdmin):
    """직장인구 그리드 관리"""
    list_display = ('ogc_fid', 'get_work_pop', 'get_male_female_work', 'get_coord_info')
    readonly_fields = ('총_직장_인구_수', '남성_직장_인구_수', '여성_직장_인구_수')
    
    def get_work_pop(self, obj):
        return f"{obj.총_직장_인구_수 or 0:,}명"
    get_work_pop.short_description = '총직장인구'
    
    def get_male_female_work(self, obj):
        male = obj.남성_직장_인구_수 or 0
        female = obj.여성_직장_인구_수 or 0
        return f"남:{male:,} / 여:{female:,}"
    get_male_female_work.short_description = '성별직장인구'
    
    def get_coord_info(self, obj):
        if obj.geom and hasattr(obj.geom, 'centroid'):
            centroid = obj.geom.centroid
            return f"중심: ({centroid.x:.6f}, {centroid.y:.6f})"
        return "좌표 없음"
    get_coord_info.short_description = '중심좌표'


class TempForeignAdmin(BaseGISAdmin):
    """단기체류외국인 관리"""
    list_display = ('ogc_fid', 'get_total_foreign', 'get_chinese_ratio')
    readonly_fields = ('총생활인구수', '중국인체류인구수')
    
    def get_total_foreign(self, obj):
        return f"{obj.총생활인구수 or 0:,}명"
    get_total_foreign.short_description = '총 단기체류외국인'
    
    def get_chinese_ratio(self, obj):
        total = obj.총생활인구수 or 0
        chinese = obj.중국인체류인구수 or 0
        if total > 0:
            ratio = (chinese / total) * 100
            return f"{chinese:,}명 ({ratio:.1f}%)"
        return f"{chinese:,}명 (0%)"
    get_chinese_ratio.short_description = '중국인 비율'


class LongForeignAdmin(BaseGISAdmin):
    """장기체류외국인 관리"""
    list_display = ('ogc_fid', 'get_total_foreign', 'get_chinese_ratio')
    readonly_fields = ('총생활인구수', '중국인체류인구수')
    
    def get_total_foreign(self, obj):
        return f"{obj.총생활인구수 or 0:,}명"
    get_total_foreign.short_description = '총 장기체류외국인'
    
    def get_chinese_ratio(self, obj):
        total = obj.총생활인구수 or 0
        chinese = obj.중국인체류인구수 or 0
        if total > 0:
            ratio = (chinese / total) * 100
            return f"{chinese:,}명 ({ratio:.1f}%)"
        return f"{chinese:,}명 (0%)"
    get_chinese_ratio.short_description = '중국인 비율'


class StorePointAdmin(BaseGISAdmin):
    """상점 포인트 관리"""
    list_display = ('ogc_fid', 'uptaenm', 'service', 'area', 'get_coord_info')
    list_filter = ('uptaenm', 'service')
    search_fields = ('uptaenm', 'service')
    
    # 서울 영역에 최적화된 지도 설정 (좌표계 변환 지원 (5186 → 3857))
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 11,
            'default_lat': 37.5665,  # 서울 중심 위도
            'default_lon': 126.9780, # 서울 중심 경도
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator (OpenStreetMap 호환)
        },
    }
    
    fieldsets = (
        ('상점 정보', {
            'fields': ('uptaenm', 'service', 'area')
        }),
        ('좌표 정보', {
            'fields': ('x', 'y')
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
    def get_coord_info(self, obj):
        if obj.x and obj.y:
            return f"({obj.x}, {obj.y})"
        elif obj.geom:
            return f"({obj.geom.x:.6f}, {obj.geom.y:.6f})"
        return "좌표 없음"
    get_coord_info.short_description = '좌표'


class SchoolAdmin(BaseGISAdmin):
    """학교 관리"""
    list_display = ('ogc_fid', 'school_name', 'school_type', 'road_address', 'get_coord_info')
    list_filter = ('school_type',)
    search_fields = ('school_name', 'school_type', 'road_address')
    
    # 서울 영역에 최적화된 지도 설정 (좌표계 변환 지원 (5186 → 3857))
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 11,
            'default_lat': 37.5665,
            'default_lon': 126.9780,
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator (OpenStreetMap 호환)
        },
    }
    
    fieldsets = (
        ('학교 정보', {
            'fields': ('school_name', 'school_type', 'establishment_type', 'standard_school')
        }),
        ('연락처 정보', {
            'fields': ('phone_number', 'fax_number', 'homepage')
        }),
        ('주소 정보', {
            'fields': ('postal_code', 'road_address', 'detail_address')
        }),
        ('좌표 정보', {
            'fields': ('x', 'y')
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
    def get_coord_info(self, obj):
        if obj.x and obj.y:
            return f"({obj.x}, {obj.y})"
        elif obj.geom:
            return f"({obj.geom.x:.6f}, {obj.geom.y:.6f})"
        return "좌표 없음"
    get_coord_info.short_description = '좌표'


class PublicBuildingAdmin(BaseGISAdmin):
    """공공건물 관리"""
    list_display = ('ogc_fid', 'dgm_nm', 'lclas_cl', 'mlsfc_cl', 'get_area_display')
    list_filter = ('lclas_cl', 'mlsfc_cl')
    search_fields = ('dgm_nm', 'lclas_cl', 'mlsfc_cl')
    
    # 서울 영역에 최적화된 지도 설정 (좌표계 변환 지원 (5186 → 3857))
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 11,
            'default_lat': 37.5665,
            'default_lon': 126.9780,
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator (OpenStreetMap 호환)
        },
    }
    
    fieldsets = (
        ('건물 정보', {
            'fields': ('dgm_nm', 'lclas_cl', 'mlsfc_cl', 'dgm_ar')
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
    def get_area_display(self, obj):
        if obj.dgm_ar:
            return f"{obj.dgm_ar:,.2f}㎡"
        return "면적 없음"
    get_area_display.short_description = '면적'


class LandValueAdmin(BaseGISAdmin):
    """공시지가 관리"""
    list_display = ('ogc_fid', 'get_land_value_display', 'a2', 'a6', 'get_geom_type')
    list_filter = ('a1', 'a3')
    search_fields = ('a2', 'a6')
    ordering = ('-a9',)
    
    fieldsets = (
        ('공시지가 정보', {
            'fields': ('a1', 'a2', 'a3', 'a6', 'a9')
        }),
        ('공간 정보', {
            'fields': ('geom',),
            'classes': ('collapse',)
        })
    )
    
    def get_land_value_display(self, obj):
        if obj.a9 and isinstance(obj.a9, (int, float)):
            # 천 단위 구분자를 사용한 숫자 포맷팅
            formatted_value = f"{int(obj.a9):,}"
            return format_html('<strong>{}원/㎡</strong>', formatted_value)
        return "가격 정보 없음"
    get_land_value_display.short_description = "공시지가"
    
    def get_geom_type(self, obj):
        if obj.geom:
            return obj.geom.geom_type
        return "None"
    get_geom_type.short_description = "지오메트리 타입"


# 편집 가능한 모델들을 위한 Admin 클래스들
class EditableStorePointAdmin(admin.GISModelAdmin):
    """편집 가능한 상점 관리"""
    list_display = ('id', 'storename', 'uptaenm', 'address', 'phone', 'created_at')
    list_display_links = ('id', 'storename')
    list_filter = ('uptaenm', 'created_at')
    search_fields = ('storename', 'uptaenm', 'address')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    # 좌표계 변환 지원 (5186 → 3857)
    map_srid = 3857  # Web Mercator (OpenStreetMap 호환)
    display_srid = 5186
    
    # 서울 중심 지도 설정
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 12,
            'default_lat': 37.5665,
            'default_lon': 126.9780,
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator (OpenStreetMap 호환)
        },
    }
    
    fieldsets = (
        ('상점 정보', {
            'fields': ('storename', 'uptaenm', 'address', 'phone')
        }),
        ('위치 정보', {
            'fields': ('geom',),
            'description': '지도에서 마우스로 클릭하여 위치를 설정할 수 있습니다.'
        }),
        ('메타 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


class EditablePublicBuildingAdmin(admin.GISModelAdmin):
    """편집 가능한 공공건물 관리"""
    list_display = ('id', 'building_name', 'building_type', 'address', 'created_at')
    list_display_links = ('id', 'building_name')
    list_filter = ('building_type', 'created_at')
    search_fields = ('building_name', 'building_type', 'address')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    # 좌표계 변환 지원 (5186 → 3857)
    map_srid = 3857  # Web Mercator (OpenStreetMap 호환)
    display_srid = 5186
    
    # 서울 중심 지도 설정
    gis_widget_kwargs = {
        'attrs': {
            'default_zoom': 12,
            'default_lat': 37.5665,
            'default_lon': 126.9780,
            'display_srid': 5186,
            'map_srid': 3857,  # Web Mercator (OpenStreetMap 호환)
        },
    }
    
    fieldsets = (
        ('건물 정보', {
            'fields': ('building_name', 'building_type', 'address', 'description')
        }),
        ('위치 정보', {
            'fields': ('geom',),
            'description': '지도에서 마우스로 클릭하여 위치를 설정할 수 있습니다.'
        }),
        ('메타 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


# 공간 데이터 통계 정보를 위한 커스텀 뷰
class SpatialDataStatsView:
    """공간 데이터 통계 관리 뷰"""
    
    @staticmethod
    def get_spatial_stats():
        """공간 데이터 통계 정보 수집"""
        from django.db import connection
        
        stats = {}
        
        with connection.cursor() as cursor:
            try:
                # 각 테이블별 레코드 수 조회
                tables = [
                    ('life_pop_grid_10m_5186', '생활인구 그리드'),
                    ('workgrid_10m_5186', '직장인구 그리드'),
                    ('temp_foreign_25m_5186', '단기체류외국인'),
                    ('long_foreign_25m_5186', '장기체류외국인'),
                    ('store_point_5186', '상점'),
                    ('school_5186', '학교'),
                    ('public_5186', '공공건물'),
                    ('ltv_5186', '공시지가'),
                ]
                
                for table_name, display_name in tables:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        stats[table_name] = {
                            'name': display_name,
                            'count': count,
                            'formatted_count': f"{count:,}"
                        }
                    except Exception as e:
                        stats[table_name] = {
                            'name': display_name,
                            'count': 0,
                            'formatted_count': f"오류: {str(e)}"
                        }
                
                # 전체 통계
                total_records = sum(s['count'] for s in stats.values() if isinstance(s['count'], int))
                stats['total'] = {
                    'name': '전체 레코드',
                    'count': total_records,
                    'formatted_count': f"{total_records:,}"
                }
                
            except Exception as e:
                stats['error'] = str(e)
        
        return stats


# 모델 등록
admin.site.register(LifePopGrid, LifePopGridAdmin)
admin.site.register(WorkGrid, WorkGridAdmin)
admin.site.register(TempForeign, TempForeignAdmin)
admin.site.register(LongForeign, LongForeignAdmin)
admin.site.register(StorePoint, StorePointAdmin)
admin.site.register(School, SchoolAdmin)
admin.site.register(PublicBuilding, PublicBuildingAdmin)
admin.site.register(LandValue, LandValueAdmin)
admin.site.register(EditableStorePoint, EditableStorePointAdmin)
admin.site.register(EditablePublicBuilding, EditablePublicBuildingAdmin)
