from django.shortcuts import render
from django.http import JsonResponse
from django.db import connection
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test
from django.db.models import Count, Q
import json
from .models import (
    LifePopGrid,
    WorkGrid,
    TempForeign,
    LongForeign,
    StorePoint,
    School,
    PublicBuilding,
    LandValue,
    EditableStorePoint,
    EditablePublicBuilding,
    AdministrativeDistrict,
)


def is_admin(user):
    """관리자 권한 체크"""
    return user.is_staff or user.is_superuser


@login_required
@user_passes_test(is_admin)
def dashboard(request):
    """GeoDB 대시보드 메인 페이지"""
    context = {
        "title": "GeoDB 대시보드",
        "spatial_stats": get_spatial_statistics(),
        "recent_editable_stores": EditableStorePoint.objects.all()[:5],
        "recent_editable_buildings": EditablePublicBuilding.objects.all()[:5],
    }
    return render(request, "geodb/dashboard.html", context)


@login_required
@user_passes_test(is_admin)
def geodb_stats(request):
    """GeoDB 통계 페이지"""
    stats = get_detailed_statistics()
    context = {
        "title": "GeoDB 통계",
        "stats": stats,
    }
    return render(request, "geodb/stats.html", context)


@login_required
@user_passes_test(is_admin)
def spatial_data_api(request):
    """공간 데이터 API 엔드포인트"""
    data_type = request.GET.get("type", "")
    limit = int(request.GET.get("limit", 100))

    try:
        if data_type == "stores":
            data = StorePoint.objects.all()[:limit]
            result = [
                {
                    "id": item.ogc_fid,
                    "name": item.uptaenm,
                    "service": item.service,
                    "area": item.area,
                    "x": item.x,
                    "y": item.y,
                }
                for item in data
            ]
        elif data_type == "schools":
            data = School.objects.all()[:limit]
            result = [
                {
                    "id": item.ogc_fid,
                    "name": item.school_name,
                    "type": item.school_type,
                    "address": item.road_address,
                    "phone": item.phone_number,
                    "x": item.x,
                    "y": item.y,
                }
                for item in data
            ]
        elif data_type == "life_population":
            data = LifePopGrid.objects.all()[:limit]
            result = [
                {
                    "id": item.ogc_fid,
                    "total_pop": item.총생활인구수,
                    "age_20": item.age_20,
                    "age_30": item.age_30,
                    "age_40": item.age_40,
                    "age_50": item.age_50,
                    "age_60": item.age_60,
                }
                for item in data
            ]
        else:
            result = {"error": "Invalid data type"}

        return JsonResponse({"success": True, "data": result})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


def get_spatial_statistics():
    """공간 데이터 통계 수집"""
    stats = {}

    try:
        with connection.cursor() as cursor:
            tables = [
                ("life_pop_grid_10m_5186", "생활인구 그리드", LifePopGrid),
                ("workgrid_10m_5186", "직장인구 그리드", WorkGrid),
                ("temp_foreign_25m_5186", "단기체류외국인", TempForeign),
                ("long_foreign_25m_5186", "장기체류외국인", LongForeign),
                ("store_point_5186", "상점", StorePoint),
                ("school_5186", "학교", School),
                ("public_5186", "공공건물", PublicBuilding),
                ("ltv_5186", "공시지가", LandValue),
            ]

            for table_name, display_name, model_class in tables:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    stats[table_name] = {
                        "name": display_name,
                        "count": count,
                        "formatted_count": f"{count:,}",
                        "model_name": model_class._meta.verbose_name,
                    }
                except Exception as e:
                    stats[table_name] = {
                        "name": display_name,
                        "count": 0,
                        "formatted_count": f"오류: {str(e)}",
                        "model_name": display_name,
                    }

            # 편집 가능한 데이터 통계
            stats["editable_stores"] = {
                "name": "편집가능한 상점",
                "count": EditableStorePoint.objects.count(),
                "formatted_count": f"{EditableStorePoint.objects.count():,}",
                "model_name": "편집가능한 상점",
            }

            stats["editable_buildings"] = {
                "name": "편집가능한 공공건물",
                "count": EditablePublicBuilding.objects.count(),
                "formatted_count": f"{EditablePublicBuilding.objects.count():,}",
                "model_name": "편집가능한 공공건물",
            }

            # 전체 통계
            total_records = sum(
                s["count"] for s in stats.values() if isinstance(s["count"], int)
            )
            stats["total"] = {
                "name": "전체 레코드",
                "count": total_records,
                "formatted_count": f"{total_records:,}",
                "model_name": "전체",
            }

    except Exception as e:
        stats["error"] = str(e)

    return stats


def get_detailed_statistics():
    """상세 통계 정보 수집"""
    stats = get_spatial_statistics()

    # 추가 상세 통계
    try:
        # 상점 업종별 분포
        store_types = (
            StorePoint.objects.exclude(Q(uptaenm__isnull=True) | Q(uptaenm=""))
            .values("uptaenm")
            .annotate(count=Count("uptaenm"))
            .order_by("-count")[:10]
        )

        # 학교 유형별 분포
        school_types = (
            School.objects.exclude(Q(school_type__isnull=True) | Q(school_type=""))
            .values("school_type")
            .annotate(count=Count("school_type"))
            .order_by("-count")
        )

        # 공공건물 분류별 분포
        building_types = (
            PublicBuilding.objects.exclude(Q(lclas_cl__isnull=True) | Q(lclas_cl=""))
            .values("lclas_cl")
            .annotate(count=Count("lclas_cl"))
            .order_by("-count")[:10]
        )

        stats["detailed"] = {
            "store_types": list(store_types),
            "school_types": list(school_types),
            "building_types": list(building_types),
        }

    except Exception as e:
        stats["detailed_error"] = str(e)

    return stats
