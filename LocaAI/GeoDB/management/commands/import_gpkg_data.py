from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.db import transaction
from GeoDB.models import StoreResult
import geopandas as gpd
import os


class Command(BaseCommand):
    help = 'dong_store.gpkg 파일을 GeoDB의 StoreResult 테이블로 가져오기'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file-path',
            type=str,
            default='dong_store.gpkg',
            help='GPKG 파일 경로 (기본값: dong_store.gpkg)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 저장하지 않고 테스트만 실행'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='배치 처리 크기 (기본값: 1000)'
        )
    
    def safe_float(self, value):
        """안전한 float 변환 (Boolean 처리 포함)"""
        if value is None or str(value).lower() in ['nan', '', 'none', 'null']:
            return None
        # Boolean 값 처리
        if isinstance(value, bool):
            return float(value)  # True -> 1.0, False -> 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def safe_int(self, value):
        """안전한 int 변환"""
        if value is None or str(value).lower() in ['nan', '', 'none', 'null']:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None
    
    def handle(self, *args, **options):
        file_path = options['file_path']
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        
        # 파일 존재 확인
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"파일을 찾을 수 없습니다: {file_path}"))
            return
        
        self.stdout.write(f"GPKG 파일 가져오기 시작: {file_path}")
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
                for col in gdf.columns[:10]:  # 처음 10개 컬럼만 표시
                    self.stdout.write(f"  {col}: {sample[col]}")
                if len(gdf.columns) > 10:
                    self.stdout.write(f"  ... 및 {len(gdf.columns) - 10}개 추가 컬럼")
            
            if dry_run:
                self.stdout.write(self.style.SUCCESS("DRY RUN 완료 - 데이터 구조 확인됨"))
                return
            
            # 좌표계 변환 (EPSG:5186으로)
            if gdf.crs and gdf.crs.to_epsg() != 5186:
                self.stdout.write(f"좌표계 변환: {gdf.crs} → EPSG:5186")
                gdf = gdf.to_crs('EPSG:5186')
            
            # 기존 데이터 삭제 확인
            existing_count = StoreResult.objects.count()
            self.stdout.write(f"기존 StoreResult 데이터: {existing_count:,}개")
            
            if existing_count > 0:
                confirm = input(f"기존 데이터 {existing_count:,}개를 삭제하고 진행하시겠습니까? (y/N): ")
                if confirm.lower() != 'y':
                    self.stdout.write(self.style.ERROR("작업 취소"))
                    return
                
                self.stdout.write("기존 데이터 삭제 중...")
                StoreResult.objects.all().delete()
                self.stdout.write(self.style.SUCCESS("기존 데이터 삭제 완료"))
            
            # 데이터 변환 및 저장
            batch = []
            success_count = 0
            error_count = 0
            
            self.stdout.write("데이터 변환 및 저장 시작...")
            
            with transaction.atomic():
                for idx, row in gdf.iterrows():
                    try:
                        # 지오메트리 처리
                        geom = None
                        if row.geometry and not row.geometry.is_empty:
                            # GeoPandas geometry를 Django GEOSGeometry로 변환
                            if row.geometry.geom_type == 'Point':
                                x, y = row.geometry.x, row.geometry.y
                                geom = Point(x, y, srid=5186)
                        
                        # StoreResult 객체 생성 (컬럼명 매핑)
                        store_result = StoreResult(
                            # 기본 정보
                            area=self.safe_float(row.get('area') or row.get('Area')),
                            adjacent_biz=self.safe_int(row.get('adjacent_biz') or row.get('Adjacent_BIZ')),
                            
                            # 생활인구 데이터
                            life_pop_total=self.safe_int(row.get('life_pop_total') or row.get('1A_Total')),
                            life_pop_20_300m=self.safe_int(row.get('life_pop_20_300m') or row.get('2A_20')),
                            life_pop_30_300m=self.safe_int(row.get('life_pop_30_300m') or row.get('2A_30')),
                            life_pop_40_300m=self.safe_int(row.get('life_pop_40_300m') or row.get('2A_40')),
                            life_pop_50_300m=self.safe_int(row.get('life_pop_50_300m') or row.get('2A_50')),
                            life_pop_60_300m=self.safe_int(row.get('life_pop_60_300m') or row.get('2A_60')),
                            
                            life_pop_20_1000m=self.safe_int(row.get('life_pop_20_1000m') or row.get('6A_20')),
                            life_pop_30_1000m=self.safe_int(row.get('life_pop_30_1000m') or row.get('6A_30')),
                            life_pop_40_1000m=self.safe_int(row.get('life_pop_40_1000m') or row.get('6A_40')),
                            life_pop_50_1000m=self.safe_int(row.get('life_pop_50_1000m') or row.get('6A_50')),
                            life_pop_60_1000m=self.safe_int(row.get('life_pop_60_1000m') or row.get('6A_60')),
                            
                            # 외국인 데이터
                            temp_foreign_total=self.safe_int(row.get('temp_foreign_total') or row.get('3A_Total')),
                            temp_foreign_cn_300m=self.safe_float(row.get('temp_foreign_cn_300m') or row.get('3B_CN')),
                            temp_foreign_cn_1000m=self.safe_float(row.get('temp_foreign_cn_1000m') or row.get('7B_CN')),
                            
                            long_foreign_300m=self.safe_int(row.get('long_foreign_300m') or row.get('4A_300')),
                            long_foreign_1000m=self.safe_int(row.get('long_foreign_1000m') or row.get('8A_1000')),
                            long_foreign_cn_1000m=self.safe_float(row.get('long_foreign_cn_1000m') or row.get('8B_CN')),
                            
                            # 직장인구 및 시설
                            working_pop_300m=self.safe_int(row.get('working_pop_300m') or row.get('5A_300')),
                            public_building_250m=self.safe_int(row.get('public_building_250m') or row.get('9A_250')),
                            school_250m=self.safe_int(row.get('school_250m') or row.get('10A_250')),
                            
                            # 상권 분석
                            competitor_300m=self.safe_int(row.get('competitor_300m') or row.get('11A_300')),
                            business_diversity_300m=self.safe_int(row.get('business_diversity_300m') or row.get('12A_300')),
                            
                            # 업종 및 서비스
                            uptaenm=str(row.get('uptaenm') or row.get('UPTAENM') or '').strip() or None,
                            service_type=self.safe_int(row.get('service_type')),
                            
                            # 행정동 정보
                            emd_kor_nm=str(row.get('emd_kor_nm') or row.get('EMD_KOR_NM') or '').strip() or None,
                            
                            # 좌표 정보
                            x_coord=self.safe_float(row.get('x_coord') or row.get('X')) if geom else None,
                            y_coord=self.safe_float(row.get('y_coord') or row.get('Y')) if geom else None,
                            
                            # 공시지가
                            total_land_value=self.safe_float(row.get('total_land_value') or row.get('Total_LV')),
                            
                            # AI 예측 결과
                            result=self.safe_float(row.get('result') if 'result' in row else row.get('Result')),
                            
                            # 지오메트리
                            geom=geom
                        )
                        
                        batch.append(store_result)
                        
                        # 배치 저장
                        if len(batch) >= batch_size:
                            StoreResult.objects.bulk_create(batch)
                            success_count += len(batch)
                            batch = []
                            
                            # 진행률 표시
                            if success_count % 5000 == 0:
                                self.stdout.write(f"처리 중: {success_count:,}개 완료")
                    
                    except Exception as e:
                        error_count += 1
                        if error_count <= 10:  # 처음 10개 오류만 표시
                            self.stdout.write(
                                self.style.ERROR(f"행 {idx} 처리 오류: {str(e)}")
                            )
                
                # 남은 배치 저장
                if batch:
                    StoreResult.objects.bulk_create(batch)
                    success_count += len(batch)
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"파일 처리 중 오류: {str(e)}"))
            return
        
        # 결과 출력
        self.stdout.write(self.style.SUCCESS(f"GPKG 데이터 가져오기 완료!"))
        self.stdout.write(f"총 처리 행수: {len(gdf):,}개")
        self.stdout.write(f"성공: {success_count:,}개")
        self.stdout.write(f"실패: {error_count:,}개")
        
        # 최종 확인
        final_count = StoreResult.objects.count()
        self.stdout.write(f"최종 StoreResult 테이블 레코드 수: {final_count:,}개")
        
        # 샘플 데이터 표시
        if success_count > 0:
            sample = StoreResult.objects.first()
            if sample:
                self.stdout.write(f"\n저장된 샘플 데이터:")
                self.stdout.write(f"  업종: {sample.uptaenm}")
                self.stdout.write(f"  면적: {sample.area}")
                self.stdout.write(f"  예측결과: {sample.result}")
                self.stdout.write(f"  좌표: ({sample.x_coord}, {sample.y_coord})")
                self.stdout.write(f"  지오메트리: {sample.geom}") 