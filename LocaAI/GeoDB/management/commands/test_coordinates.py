from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from GeoDB.models import StorePoint


class Command(BaseCommand):
    help = '좌표 변환 테스트'

    def handle(self, *args, **options):
        self.stdout.write("=== 좌표 변환 테스트 ===\n")
        
        # 실제 데이터에서 샘플 테스트 먼저 수행
        self.stdout.write("=== 실제 데이터 샘플 테스트 ===")
        
        try:
            sample_store = StorePoint.objects.first()
            if sample_store:
                self.stdout.write(f"샘플 상점: {sample_store.uptaenm}")
                
                if sample_store.geom:
                    original_x = sample_store.geom.x
                    original_y = sample_store.geom.y
                    
                    self.stdout.write(f"원본 좌표 (EPSG:5186): X={original_x:.2f}, Y={original_y:.2f}")
                    
                    # pyproj를 사용한 좌표 변환
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
                        self.stdout.write(f"WGS84 (EPSG:4326): 경도={lon:.6f}°, 위도={lat:.6f}°")
                        
                        # 4326 -> 3857 변환
                        x_3857, y_3857 = transformer_to_mercator.transform(lon, lat)
                        self.stdout.write(f"Web Mercator (EPSG:3857): X={x_3857:.2f}, Y={y_3857:.2f}")
                        
                        # OpenStreetMap URL
                        osm_url = f"https://www.openstreetmap.org/#map=18/{lat:.6f}/{lon:.6f}"
                        self.stdout.write(f"OpenStreetMap URL: {osm_url}")
                        
                        # 좌표가 한국 범위 내에 있는지 확인
                        if 124.0 <= lon <= 132.0 and 33.0 <= lat <= 43.0:
                            self.stdout.write("✅ 좌표가 한국 범위 내에 있습니다!")
                        else:
                            self.stdout.write("❌ 좌표가 한국 범위를 벗어났습니다!")
                            
                    except ImportError:
                        self.stdout.write("pyproj 라이브러리가 설치되지 않았습니다.")
                        
                        # 간단한 근사 변환 공식 사용 (부정확하지만 참고용)
                        # 한국 중부원점(EPSG:5186) -> WGS84 근사 변환
                        # 이 공식은 매우 근사치이므로 정확하지 않습니다!
                        
                        # 원점 좌표 (대략적)
                        false_easting = 200000.0
                        false_northing = 500000.0
                        central_meridian = 127.0  # 중앙 경선
                        origin_latitude = 38.0    # 원점 위도
                        
                        # 매우 단순한 근사 계산 (실제로는 복잡한 수학 공식 필요)
                        dx = original_x - false_easting
                        dy = original_y - false_northing
                        
                        # 대략적인 변환 (1도 ≈ 111km)
                        approx_lon = central_meridian + (dx / 88000.0)  # 근사값
                        approx_lat = origin_latitude + (dy / 111000.0)  # 근사값
                        
                        self.stdout.write(f"근사 WGS84: 경도={approx_lon:.6f}°, 위도={approx_lat:.6f}°")
                        self.stdout.write("⚠️  이 좌표는 근사값이므로 정확하지 않습니다!")
                        
                        osm_url = f"https://www.openstreetmap.org/#map=18/{approx_lat:.6f}/{approx_lon:.6f}"
                        self.stdout.write(f"근사 OpenStreetMap URL: {osm_url}")
                        
                elif sample_store.x and sample_store.y:
                    self.stdout.write(f"X,Y 필드: X={sample_store.x}, Y={sample_store.y}")
                    # geom 필드와 동일한 로직 적용
                
            else:
                self.stdout.write("상점 데이터가 없습니다.")
                
        except Exception as e:
            self.stdout.write(f"실제 데이터 테스트 오류: {str(e)}")
            import traceback
            self.stdout.write(f"상세 오류: {traceback.format_exc()}")
        
        self.stdout.write(self.style.SUCCESS('\n좌표 변환 테스트 완료!')) 