from django.contrib.gis import admin
from django.contrib import admin as django_admin
from django.db import connection
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
from .models import (
    LifePopGrid, WorkGrid, TempForeign, LongForeign, 
    StorePoint, School, PublicBuilding, LandValue,
    EditableStorePoint, EditablePublicBuilding
)
from .widgets import KakaoPointWidget, KakaoPolygonWidget
from .forms import (
    LifePopGridForm, WorkGridForm, TempForeignForm, LongForeignForm,
    StorePointForm, SchoolForm, PublicBuildingForm, LandValueForm,
    EditableStorePointForm, EditablePublicBuildingForm
)
# 한국 좌표계 최적화를 위한 GIS 설정

@csrf_exempt
def transform_coordinates(request):
    """좌표 변환 API (WGS84 ↔ EPSG:5186)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            lng = float(data.get('lng'))
            lat = float(data.get('lat'))
            from_srid = int(data.get('from_srid', 4326))
            to_srid = int(data.get('to_srid', 5186))
            
            import pyproj
            
            # 좌표계 정의
            crs_from = pyproj.CRS(f'EPSG:{from_srid}')
            crs_to = pyproj.CRS(f'EPSG:{to_srid}')
            
            # 변환
            transformer = pyproj.Transformer.from_crs(crs_from, crs_to, always_xy=True)
            x, y = transformer.transform(lng, lat)
            
            return JsonResponse({
                'success': True,
                'x': x,
                'y': y,
                'from_srid': from_srid,
                'to_srid': to_srid
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e)
            })
    
    return JsonResponse({'success': False, 'error': 'POST method required'})


class BaseGISAdmin(admin.GISModelAdmin):
    """한국 중부원점(EPSG:5186) 좌표계를 위한 기본 GIS 관리자 클래스 - 카카오맵 사용"""
    
    # 카카오맵 사용 - OpenLayers 대신
    map_template = None  # 카카오맵 위젯 사용으로 템플릿 비활성화
    map_srid = 4326  # 카카오맵은 WGS84 좌표계 사용
    map_width = 800
    map_height = 600
    
    # 한국 영역에 맞는 기본 지도 설정
    default_lon = 126.9780  # 서울 중심 경도 (WGS84)
    default_lat = 37.5665   # 서울 중심 위도 (WGS84)  
    default_zoom = 8
    
    # Web Mercator 좌표로 변환된 서울 중심점
    # 126.9780, 37.5665 → 14141893.0, 4518386.0 (approximately)
    default_lon_3857 = 14141893.0
    default_lat_3857 = 4518386.0
    
    # 지도 범위 설정 (한국 전체 영역을 위한 경계)
    point_zoom = 16  # 포인트 데이터 줌 레벨
    
    # GIS 위젯 설정 - 카카오맵 사용
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """지오메트리 필드에 대한 위젯 설정 - 카카오맵 사용"""
        if hasattr(db_field, 'geom_type'):
            # 지오메트리 필드인 경우 카카오맵 위젯 사용
            geom_type = db_field.geom_type
            
            if geom_type == 'POINT':
                kwargs['widget'] = KakaoPointWidget()
            elif geom_type == 'POLYGON':
                kwargs['widget'] = KakaoPolygonWidget()
            else:
                # 기본값으로 포인트 위젯 사용
                kwargs['widget'] = KakaoPointWidget()
        
        return super().formfield_for_dbfield(db_field, request, **kwargs)
    
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
    
    def get_xy_coordinates(self, obj):
        """XY 좌표를 표시 (EPSG:5186)"""
        if hasattr(obj, 'geom') and obj.geom:
            if hasattr(obj.geom, 'centroid'):
                centroid = obj.geom.centroid
                return f"X: {centroid.x:.2f}, Y: {centroid.y:.2f}"
            elif hasattr(obj.geom, 'x') and hasattr(obj.geom, 'y'):
                return f"X: {obj.geom.x:.2f}, Y: {obj.geom.y:.2f}"
        # 별도 X, Y 필드가 있는 경우 체크
        if hasattr(obj, 'x') and hasattr(obj, 'y') and obj.x and obj.y:
            return f"X: {obj.x:.2f}, Y: {obj.y:.2f}"
        return "-"
    get_xy_coordinates.short_description = 'XY 좌표 (EPSG:5186)'
    
    def get_coordinate_detail(self, obj):
        """상세보기용 좌표 정보 (원본 + 변환된 좌표)"""
        result_lines = []
        
        # 원본 좌표 (EPSG:5186) 
        original_x = None
        original_y = None
        
        if hasattr(obj, 'geom') and obj.geom:
            if hasattr(obj.geom, 'centroid'):
                centroid = obj.geom.centroid
                original_x, original_y = centroid.x, centroid.y
            elif hasattr(obj.geom, 'x') and hasattr(obj.geom, 'y'):
                original_x, original_y = obj.geom.x, obj.geom.y
        elif hasattr(obj, 'x') and hasattr(obj, 'y') and obj.x and obj.y:
            original_x, original_y = obj.x, obj.y
            
        if original_x and original_y:
            result_lines.append("=== 원본 좌표 (EPSG:5186) ===")
            result_lines.append(f"X좌표: {original_x:.6f}")
            result_lines.append(f"Y좌표: {original_y:.6f}")
            
            # pyproj를 사용한 정확한 좌표 변환
            try:
                import pyproj
                
                # 좌표계 정의
                crs_5186 = pyproj.CRS('EPSG:5186')
                crs_4326 = pyproj.CRS('EPSG:4326')
                crs_3857 = pyproj.CRS('EPSG:3857')
                
                # 변환기 생성
                transformer_to_wgs84 = pyproj.Transformer.from_crs(crs_5186, crs_4326, always_xy=True)
                transformer_to_mercator = pyproj.Transformer.from_crs(crs_4326, crs_3857, always_xy=True)
                
                # 5186 -> 4326 변환
                lon, lat = transformer_to_wgs84.transform(original_x, original_y)
                
                result_lines.append("")
                result_lines.append("=== WGS84 좌표 (EPSG:4326) ===")
                result_lines.append(f"경도: {lon:.6f}°")
                result_lines.append(f"위도: {lat:.6f}°")
                
                # 4326 -> 3857 변환
                x_3857, y_3857 = transformer_to_mercator.transform(lon, lat)
                
                result_lines.append("")
                result_lines.append("=== Web Mercator 좌표 (EPSG:3857) ===")
                result_lines.append(f"X좌표: {x_3857:.2f}")
                result_lines.append(f"Y좌표: {y_3857:.2f}")
                
                # OpenStreetMap URL 생성
                osm_url = f"https://www.openstreetmap.org/#map=18/{lat:.6f}/{lon:.6f}"
                result_lines.append("")
                result_lines.append("=== OpenStreetMap 링크 ===")
                result_lines.append(osm_url)
                
                # 좌표 범위 확인
                if 124.0 <= lon <= 132.0 and 33.0 <= lat <= 43.0:
                    result_lines.append("")
                    result_lines.append("✅ 좌표가 한국 범위 내에 있습니다!")
                else:
                    result_lines.append("")
                    result_lines.append("❌ 좌표가 한국 범위를 벗어났습니다!")
                
            except ImportError:
                result_lines.append("")
                result_lines.append("⚠️ pyproj 라이브러리가 필요합니다")
                result_lines.append("정확한 좌표 변환을 위해 'pip install pyproj' 실행")
                
            except Exception as e:
                result_lines.append("")
                result_lines.append(f"좌표 변환 오류: {str(e)}")
                
            return "\n".join(result_lines)
        
        return "좌표 정보 없음"
    get_coordinate_detail.short_description = '상세 좌표 정보 (원본+변환)'
    
    def get_queryset(self, request):
        """목록 조회 시 지오메트리 필드 제외로 성능 최적화"""
        qs = super().get_queryset(request)
        if hasattr(request, 'resolver_match') and 'changelist' in request.resolver_match.url_name:
            return qs.defer('geom')
        return qs


class LifePopGridAdmin(BaseGISAdmin):
    """생활인구 그리드 관리"""
    form = LifePopGridForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'get_total_pop', 'get_age_groups', 'get_xy_coordinates', 'get_geometry_info')
    list_filter = ('총생활인구수',)
    search_fields = ()
    readonly_fields = ('총생활인구수', 'age_20', 'age_30', 'age_40', 'age_50', 'age_60', 'get_coordinate_detail')
    
    fieldsets = (
        ('인구 정보', {
            'fields': ('총생활인구수',)
        }),
        ('연령별 인구', {
            'fields': (('age_20', 'age_30'), ('age_40', 'age_50'), 'age_60')
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
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
    form = WorkGridForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'get_work_pop', 'get_male_female_work', 'get_xy_coordinates', 'get_coord_info')
    readonly_fields = ('총_직장_인구_수', '남성_직장_인구_수', '여성_직장_인구_수', 'get_coordinate_detail')
    
    fieldsets = (
        ('직장인구 정보', {
            'fields': (('총_직장_인구_수',), ('남성_직장_인구_수', '여성_직장_인구_수'))
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
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
    form = TempForeignForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'get_total_foreign', 'get_chinese_ratio', 'get_xy_coordinates')
    readonly_fields = ('총생활인구수', '중국인체류인구수', 'get_coordinate_detail')
    
    fieldsets = (
        ('단기체류외국인 정보', {
            'fields': ('총생활인구수', '중국인체류인구수')
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
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
    form = LongForeignForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'get_total_foreign', 'get_chinese_ratio', 'get_xy_coordinates')
    readonly_fields = ('총생활인구수', '중국인체류인구수', 'get_coordinate_detail')
    
    fieldsets = (
        ('장기체류외국인 정보', {
            'fields': ('총생활인구수', '중국인체류인구수')
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
        }),
        ('지리 정보', {
            'fields': ('geom',)
        }),
    )
    
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
    @admin.display(description='XY 좌표 (EPSG:5186)')
    def get_xy_coordinates(self, obj):
        return super().get_xy_coordinates(obj)
    form = StorePointForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'uptaenm', 'service', 'area', 'get_xy_coordinates', 'get_coord_info')
    list_filter = ('uptaenm', 'service')
    search_fields = ('uptaenm', 'service')
    readonly_fields = ('get_coordinate_detail',)
    
    # 서울 지역 최적화
    default_zoom = 11
    
    fieldsets = (
        ('상점 정보', {
            'fields': ('uptaenm', 'service', 'area')
        }),
        ('좌표 정보', {
            'fields': ('x', 'y', 'get_coordinate_detail')
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
    form = SchoolForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'school_name', 'school_type', 'road_address', 'get_xy_coordinates', 'get_coord_info')
    list_filter = ('school_type',)
    search_fields = ('school_name', 'school_type', 'road_address')
    readonly_fields = ('get_coordinate_detail',)
    
    # 서울 지역 최적화
    default_zoom = 11
    
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
            'fields': ('x', 'y', 'get_coordinate_detail')
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
    form = PublicBuildingForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'dgm_nm', 'lclas_cl', 'mlsfc_cl', 'get_xy_coordinates', 'get_area_display')
    list_filter = ('lclas_cl', 'mlsfc_cl')
    search_fields = ('dgm_nm', 'lclas_cl', 'mlsfc_cl')
    readonly_fields = ('get_coordinate_detail',)
    
    # 서울 지역 최적화
    default_zoom = 11
    
    fieldsets = (
        ('건물 정보', {
            'fields': ('dgm_nm', 'lclas_cl', 'mlsfc_cl', 'dgm_ar')
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
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
    form = LandValueForm  # 카카오맵 위젯 사용
    list_display = ('ogc_fid', 'get_land_value_display', 'a2', 'a6', 'get_xy_coordinates', 'get_geom_type')
    list_filter = ('a1', 'a3')
    search_fields = ('a2', 'a6')
    ordering = ('-a9',)
    readonly_fields = ('get_coordinate_detail',)
    
    fieldsets = (
        ('공시지가 정보', {
            'fields': ('a1', 'a2', 'a3', 'a6', 'a9')
        }),
        ('좌표 정보', {
            'fields': ('get_coordinate_detail',),
            'classes': ('collapse',)
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
class EditableStorePointAdmin(BaseGISAdmin):
    """편집 가능한 상점 관리"""
    form = EditableStorePointForm  # 카카오맵 위젯 사용
    list_display = ('id', 'storename', 'uptaenm', 'address', 'phone', 'get_xy_coordinates', 'created_at')
    list_display_links = ('id', 'storename')
    list_filter = ('uptaenm', 'created_at')
    search_fields = ('storename', 'uptaenm', 'address')
    readonly_fields = ('created_at', 'updated_at', 'get_coordinate_detail')
    ordering = ('-created_at',)
    
    # 서울 중심 지도 설정
    default_zoom = 12
    
    fieldsets = (
        ('상점 정보', {
            'fields': ('storename', 'uptaenm', 'address', 'phone')
        }),
        ('위치 정보', {
            'fields': ('geom', 'get_coordinate_detail'),
            'description': '지도에서 마우스로 클릭하여 위치를 설정할 수 있습니다.'
        }),
        ('메타 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


class EditablePublicBuildingAdmin(BaseGISAdmin):
    """편집 가능한 공공건물 관리"""
    form = EditablePublicBuildingForm  # 카카오맵 위젯 사용
    list_display = ('id', 'building_name', 'building_type', 'address', 'get_xy_coordinates', 'created_at')
    list_display_links = ('id', 'building_name')
    list_filter = ('building_type', 'created_at')
    search_fields = ('building_name', 'building_type', 'address')
    readonly_fields = ('created_at', 'updated_at', 'get_coordinate_detail')
    ordering = ('-created_at',)
    
    # 서울 중심 지도 설정
    default_zoom = 12
    
    fieldsets = (
        ('건물 정보', {
            'fields': ('building_name', 'building_type', 'address', 'description')
        }),
        ('위치 정보', {
            'fields': ('geom', 'get_coordinate_detail'),
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
