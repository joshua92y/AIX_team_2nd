from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from GeoDB.models import StorePoint
from django.db import connection

class Command(BaseCommand):
    help = '지오메트리 데이터 검증 및 수정'

    def handle(self, *args, **options):
        self.stdout.write("=== 지오메트리 데이터 검증 시작 ===\n")
        
        # StorePoint 모델의 지오메트리 검증
        self.validate_store_points()
        
        self.stdout.write("\n=== 지오메트리 데이터 검증 완료 ===")

    def validate_store_points(self):
        self.stdout.write("StorePoint 지오메트리 검증 중...")
        
        # 유효하지 않은 지오메트리 찾기
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT ogc_fid, ST_IsValid(geom) as is_valid, 
                       ST_GeometryType(geom) as geom_type
                FROM store_point_5186
                WHERE geom IS NOT NULL
            """)
            results = cursor.fetchall()
        
        invalid_count = 0
        for ogc_fid, is_valid, geom_type in results:
            if not is_valid or geom_type not in ['ST_Point']:
                invalid_count += 1
                self.stdout.write(f"유효하지 않은 지오메트리 발견: ID={ogc_fid}, 타입={geom_type}")
                
                # X, Y 좌표가 있는 경우 Point로 변환
                try:
                    store = StorePoint.objects.get(ogc_fid=ogc_fid)
                    if store.x and store.y:
                        try:
                            x = float(store.x)
                            y = float(store.y)
                            point = Point(x, y, srid=5186)
                            
                            # 지오메트리 업데이트
                            with connection.cursor() as cursor:
                                cursor.execute("""
                                    UPDATE store_point_5186
                                    SET geom = ST_SetSRID(ST_MakePoint(%s, %s), 5186)
                                    WHERE ogc_fid = %s
                                """, [x, y, ogc_fid])
                            
                            self.stdout.write(f"지오메트리 수정 완료: ID={ogc_fid}")
                        except ValueError:
                            self.stdout.write(f"좌표 변환 실패: ID={ogc_fid}, X={store.x}, Y={store.y}")
                except StorePoint.DoesNotExist:
                    self.stdout.write(f"상점을 찾을 수 없음: ID={ogc_fid}")
        
        self.stdout.write(f"\n검증 결과: {invalid_count}개의 유효하지 않은 지오메트리 발견") 