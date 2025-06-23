from django.core.management.base import BaseCommand
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.db import transaction
from GeoDB.models import SeoulDistrict
import geopandas as gpd
import os


class Command(BaseCommand):
    help = 'gu_surface.gpkg 파일을 GeoDB의 SeoulDistrict 테이블로 가져오기'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file-path',
            type=str,
            default='gu_surface.gpkg',
            help='GPKG 파일 경로 (기본값: gu_surface.gpkg)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 저장하지 않고 테스트만 실행'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='기존 데이터를 업데이트 (기본값: 삭제 후 새로 생성)'
        )
    
    def safe_str(self, value):
        """안전한 문자열 변환"""
        if value is None or str(value).lower() in ['nan', '', 'none', 'null']:
            return None
        return str(value).strip()
    
    def safe_float(self, value):
        """안전한 float 변환"""
        if value is None or str(value).lower() in ['nan', '', 'none', 'null']:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def convert_geometry(self, geom):
        """지오메트리를 Django GEOSGeometry로 변환"""
        if geom is None or geom.is_empty:
            return None
        
        try:
            # Shapely geometry를 WKT로 변환 후 Django GEOSGeometry로 변환
            from django.contrib.gis.geos import GEOSGeometry
            
            # WKT 형식으로 변환
            wkt_string = geom.wkt
            
            # Django GEOSGeometry로 변환
            django_geom = GEOSGeometry(wkt_string, srid=5186)
            
            # MultiPolygon이 아닌 경우 MultiPolygon으로 변환
            if django_geom.geom_type == 'Polygon':
                django_geom = MultiPolygon(django_geom)
                django_geom.srid = 5186
            
            return django_geom
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"지오메트리 변환 오류: {str(e)}")
            )
            return None
    
    def handle(self, *args, **options):
        file_path = options['file_path']
        dry_run = options['dry_run']
        update_mode = options['update']
        
        # 파일 존재 확인
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"파일을 찾을 수 없습니다: {file_path}"))
            return
        
        self.stdout.write(f"서울시 구별 경계면 데이터 가져오기 시작: {file_path}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN 모드 - 실제 저장하지 않음"))
        
        try:
            # GPKG 파일 읽기
            self.stdout.write("GPKG 파일 읽는 중...")
            gdf = gpd.read_file(file_path)
            
            self.stdout.write(f"GPKG 파일 정보:")
            self.stdout.write(f"  - 총 레코드 수: {len(gdf):,}개")
            self.stdout.write(f"  - 컬럼 수: {len(gdf.columns)}개")
            self.stdout.write(f"  - CRS: {gdf.crs}")
            self.stdout.write(f"  - 컬럼 목록: {list(gdf.columns)}")
            
            # 샘플 데이터 표시
            if len(gdf) > 0:
                sample = gdf.iloc[0]
                self.stdout.write(f"\n샘플 데이터 (첫 번째 레코드):")
                for col in gdf.columns:
                    if col != 'geometry':
                        self.stdout.write(f"  {col}: {sample[col]}")
            
            if dry_run:
                self.stdout.write(self.style.SUCCESS("DRY RUN 완료 - 데이터 구조 확인됨"))
                return
            
            # 좌표계 변환 (EPSG:5186으로)
            if gdf.crs and gdf.crs.to_epsg() != 5186:
                self.stdout.write(f"좌표계 변환: {gdf.crs} → EPSG:5186")
                gdf = gdf.to_crs('EPSG:5186')
            
            # 기존 데이터 처리
            existing_count = SeoulDistrict.objects.count()
            self.stdout.write(f"기존 SeoulDistrict 데이터: {existing_count:,}개")
            
            if existing_count > 0 and not update_mode:
                confirm = input(f"기존 데이터 {existing_count:,}개를 삭제하고 진행하시겠습니까? (y/N): ")
                if confirm.lower() != 'y':
                    self.stdout.write(self.style.ERROR("작업 취소"))
                    return
                
                self.stdout.write("기존 데이터 삭제 중...")
                SeoulDistrict.objects.all().delete()
                self.stdout.write(self.style.SUCCESS("기존 데이터 삭제 완료"))
            
            # 데이터 변환 및 저장
            success_count = 0
            error_count = 0
            
            self.stdout.write("데이터 변환 및 저장 시작...")
            
            with transaction.atomic():
                for idx, row in gdf.iterrows():
                    try:
                        # 행정구역코드 확인
                        adm_sect_c = self.safe_str(row.get('ADM_SECT_C'))
                        if not adm_sect_c:
                            self.stdout.write(
                                self.style.WARNING(f"행 {idx}: 행정구역코드가 없어 건너뜀")
                            )
                            error_count += 1
                            continue
                        
                        # 지오메트리 처리
                        geom = None
                        if row.geometry and not row.geometry.is_empty:
                            geom = self.convert_geometry(row.geometry)
                            if geom is None:
                                self.stdout.write(
                                    self.style.WARNING(f"행 {idx}: 지오메트리 변환 실패")
                                )
                                error_count += 1
                                continue
                        
                        # SeoulDistrict 객체 생성/업데이트
                        district_data = {
                            'sgg_nm': self.safe_str(row.get('SGG_NM')),
                            'sgg_oid': self.safe_float(row.get('SGG_OID')),
                            'col_adm_se': self.safe_str(row.get('COL_ADM_SE')),
                            'geom': geom
                        }
                        
                        if update_mode:
                            # 업데이트 모드: 기존 레코드가 있으면 업데이트, 없으면 생성
                            district, created = SeoulDistrict.objects.update_or_create(
                                adm_sect_c=adm_sect_c,
                                defaults=district_data
                            )
                            action = "생성됨" if created else "업데이트됨"
                        else:
                            # 새로 생성 모드
                            district = SeoulDistrict.objects.create(
                                adm_sect_c=adm_sect_c,
                                **district_data
                            )
                            action = "생성됨"
                        
                        success_count += 1
                        
                        # 진행률 표시
                        if success_count % 5 == 0:
                            self.stdout.write(f"처리 중: {success_count}/{len(gdf)} {action}")
                    
                    except Exception as e:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(f"행 {idx} 처리 오류: {str(e)}")
                        )
                        
                        if error_count <= 10:  # 처음 10개 오류만 상세 표시
                            self.stdout.write(f"  데이터: {dict(row)}")
            
            # 결과 요약
            self.stdout.write(self.style.SUCCESS(f"\n=== 가져오기 완료 ==="))
            self.stdout.write(f"성공: {success_count:,}개")
            self.stdout.write(f"실패: {error_count:,}개")
            self.stdout.write(f"전체: {len(gdf):,}개")
            
            if success_count > 0:
                # 저장된 데이터 샘플 표시
                sample_district = SeoulDistrict.objects.first()
                if sample_district:
                    self.stdout.write(f"\n저장된 데이터 샘플:")
                    self.stdout.write(f"  구명: {sample_district.sgg_nm}")
                    self.stdout.write(f"  행정구역코드: {sample_district.adm_sect_c}")
                    self.stdout.write(f"  면적: {sample_district.area_sqkm} km²")
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"전체 처리 오류: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc()) 