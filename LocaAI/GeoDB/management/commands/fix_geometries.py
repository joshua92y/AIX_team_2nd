from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = '지오메트리 데이터 수정'

    def handle(self, *args, **options):
        self.stdout.write("=== 지오메트리 데이터 수정 시작 ===\n")
        
        # MultiPolygon을 Point로 변환 (첫 번째 폴리곤의 중심점 사용)
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE store_point_5186
                SET geom = ST_Centroid(ST_GeometryN(geom, 1))
                WHERE ST_GeometryType(geom) = 'ST_MultiPolygon'
            """)
            
            cursor.execute("""
                SELECT COUNT(*)
                FROM store_point_5186
                WHERE ST_GeometryType(geom) = 'ST_MultiPolygon'
            """)
            remaining_multipolygon = cursor.fetchone()[0]
            self.stdout.write(f"MultiPolygon을 Point로 변환 완료. 남은 MultiPolygon: {remaining_multipolygon}")

        # MultiPoint를 Point로 변환 (첫 번째 포인트 사용)
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE store_point_5186
                SET geom = ST_GeometryN(geom, 1)
                WHERE ST_GeometryType(geom) = 'ST_MultiPoint'
            """)
            
            cursor.execute("""
                SELECT COUNT(*)
                FROM store_point_5186
                WHERE ST_GeometryType(geom) = 'ST_MultiPoint'
            """)
            remaining_multipoint = cursor.fetchone()[0]
            
            self.stdout.write(f"MultiPoint를 Point로 변환 완료. 남은 MultiPoint: {remaining_multipoint}")
        
        self.stdout.write("\n=== 지오메트리 데이터 수정 완료 ===") 