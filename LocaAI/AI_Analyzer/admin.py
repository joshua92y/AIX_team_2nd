from django.contrib import admin
from django.db import connection
from .models import BusinessType, AnalysisRequest, AnalysisResult


@admin.register(BusinessType)
class BusinessTypeAdmin(admin.ModelAdmin):
    """업종 관리"""

    list_display = ("id", "name")
    list_display_links = ("id", "name")
    search_fields = ("name",)
    ordering = ("id",)


@admin.register(AnalysisRequest)
class AnalysisRequestAdmin(admin.ModelAdmin):
    """분석 요청 관리"""

    list_display = (
        "id",
        "address",
        "business_type",
        "area",
        "service_type",
        "created_at",
    )
    list_display_links = ("id", "address")
    list_filter = ("business_type", "service_type", "created_at")
    search_fields = ("address",)
    readonly_fields = ("longitude", "latitude", "x_coord", "y_coord", "created_at")
    ordering = ("-created_at",)

    fieldsets = (
        ("기본 정보", {"fields": ("address", "area", "business_type", "service_type")}),
        (
            "좌표 정보",
            {
                "fields": ("longitude", "latitude", "x_coord", "y_coord"),
                "classes": ("collapse",),
            },
        ),
        ("메타 정보", {"fields": ("created_at",), "classes": ("collapse",)}),
    )


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    """분석 결과 관리"""

    list_display = (
        "id",
        "get_address",
        "get_business_type",
        "life_pop_300m",
        "working_pop_300m",
        "competitor_300m",
        "created_at",
    )
    list_display_links = ("id", "get_address")
    list_filter = ("request__business_type", "created_at")
    search_fields = ("request__address",)
    readonly_fields = ("request", "created_at")
    ordering = ("-created_at",)

    def get_address(self, obj):
        return obj.request.address

    get_address.short_description = "주소"

    def get_business_type(self, obj):
        return obj.request.business_type.name

    get_business_type.short_description = "업종"

    fieldsets = (
        ("요청 정보", {"fields": ("request",)}),
        (
            "생활인구 분석",
            {
                "fields": (
                    "life_pop_300m",
                    ("life_pop_20_300m", "life_pop_30_300m", "life_pop_40_300m"),
                    ("life_pop_50_300m", "life_pop_60_300m"),
                    ("life_pop_20_1000m", "life_pop_30_1000m", "life_pop_40_1000m"),
                    ("life_pop_50_1000m", "life_pop_60_1000m"),
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "외국인 분석",
            {
                "fields": (
                    (
                        "temp_foreign_1000m",
                        "temp_foreign_cn_300m",
                        "temp_foreign_cn_1000m",
                    ),
                    (
                        "long_foreign_300m",
                        "long_foreign_1000m",
                        "long_foreign_cn_1000m",
                    ),
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "주변 시설",
            {
                "fields": (
                    "working_pop_300m",
                    ("public_building_250m", "school_250m"),
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "상권 분석",
            {
                "fields": (
                    ("competitor_300m", "adjacent_biz_300m"),
                    ("competitor_ratio_300m", "business_diversity_300m"),
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "기타",
            {
                "fields": (
                    ("area", "service_type"),
                    "total_land_value",
                    "created_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )


# SpatiaLite 데이터베이스 정보를 위한 커스텀 관리 뷰
class SpatialDatabaseInfo:
    """공간 데이터베이스 정보 관리"""

    @staticmethod
    def get_table_info():
        """데이터베이스 테이블 정보 조회"""
        with connection.cursor() as cursor:
            try:
                # SpatiaLite 테이블 목록 조회
                cursor.execute(
                    """
                    SELECT name, type, sql 
                    FROM sqlite_master 
                    WHERE type IN ('table', 'view') 
                    AND name NOT LIKE 'sqlite_%'
                    AND name NOT LIKE 'idx_%'
                    AND name NOT LIKE 'cache_%'
                    ORDER BY name
                """
                )
                return cursor.fetchall()
            except Exception as e:
                print(f"❌ 데이터베이스 테이블 정보 조회 오류: {e}")
                return [
                    (
                        "데이터베이스 오류",
                        "error",
                        f"테이블 정보를 조회할 수 없습니다: {str(e)}",
                    )
                ]

    @staticmethod
    def get_spatial_ref_info():
        """공간 참조 시스템 정보 조회"""
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    SELECT srid, auth_name, auth_srid, ref_sys_name, proj4text 
                    FROM spatial_ref_sys 
                    WHERE srid IN (4326, 5186)
                    ORDER BY srid
                """
                )
                return cursor.fetchall()
            except:
                return []

    @staticmethod
    def get_geometry_columns():
        """지오메트리 컬럼 정보 조회"""
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    """
                    SELECT f_table_name, f_geometry_column, coord_dimension, srid, type 
                    FROM geometry_columns 
                    ORDER BY f_table_name
                """
                )
                return cursor.fetchall()
            except:
                return []


# admin 사이트에 추가 정보 표시를 위한 설정
admin.site.site_header = "LocAI 관리자"
admin.site.site_title = "LocAI Admin"
admin.site.index_title = "LocAI 서울시 상권분석 관리"
