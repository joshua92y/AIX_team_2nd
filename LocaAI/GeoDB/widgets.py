from django import forms
from django.contrib.gis import forms as gis_forms
from django.conf import settings
from django.utils.safestring import mark_safe
import json


class KakaoMapWidget(gis_forms.BaseGeometryWidget):
    """카카오맵 API를 사용하는 커스텀 GIS 위젯"""

    template_name = "gis/admin/kakao_map.html"

    def __init__(self, attrs=None):
        self.map_width = 800
        self.map_height = 600
        self.map_srid = 4326  # 카카오맵은 WGS84 좌표계 사용
        self.geom_type = "POINT"
        super().__init__(attrs)

    def render(self, name, value, attrs=None, renderer=None):
        if attrs is None:
            attrs = {}

        # 카카오맵 API 키 가져오기
        kakao_api_key = getattr(settings, "KAKAO_JS_API_KEY", "")

        # 기본 템플릿 컨텍스트
        context = {
            "id": f"kakao_map_{name}",
            "name": name,
            "map_width": self.map_width,
            "map_height": self.map_height,
            "kakao_api_key": kakao_api_key,
            "default_lat": 37.5665,  # 서울 중심 위도
            "default_lon": 126.9780,  # 서울 중심 경도
            "default_zoom": 3,
            "geometry_wkt": "",
            "initial_lat": None,
            "initial_lng": None,
        }

        # 기존 지오메트리 값 처리
        if value:
            try:
                import pyproj
                from django.contrib.gis.geos import GEOSGeometry

                geom = GEOSGeometry(value)
                context["geometry_wkt"] = str(value)

                # EPSG:5186 → EPSG:4326 좌표 변환
                if geom.geom_type == "Point":
                    if geom.srid == 5186 or (geom.srid is None and geom.x > 100000):
                        # pyproj로 좌표 변환
                        crs_5186 = pyproj.CRS("EPSG:5186")
                        crs_4326 = pyproj.CRS("EPSG:4326")
                        transformer = pyproj.Transformer.from_crs(
                            crs_5186, crs_4326, always_xy=True
                        )

                        lon, lat = transformer.transform(geom.x, geom.y)
                        context["initial_lat"] = lat
                        context["initial_lng"] = lon
                    elif geom.srid == 4326:
                        # 이미 WGS84인 경우
                        context["initial_lat"] = geom.y
                        context["initial_lng"] = geom.x

            except Exception as e:
                print(f"카카오맵 위젯 좌표 변환 오류: {e}")

        # 카카오맵 HTML 생성 (공식 문서 참고)
        html = f"""
        <div id="kakao_map_{name}" style="width:{self.map_width}px;height:{self.map_height}px;border:1px solid #ddd;border-radius:4px;background-color:#f8f9fa;"></div>
        <input type="hidden" id="id_{name}" name="{name}" value="{value or ''}" />
        <div style="margin-top:10px;padding:10px;background-color:#f8f9fa;border:1px solid #ddd;border-radius:4px;">
            <div style="font-size:12px;color:#6c757d;">🗺️ 카카오맵 (한국 지역 최적화)</div>
            <div id="kakao_coords_{name}" style="font-size:11px;color:#28a745;font-weight:bold;margin-top:5px;"></div>
            <div style="font-size:11px;color:#6c757d;margin-top:5px;padding:5px 10px;background-color:#e9ecef;border-radius:3px;border-left:3px solid #28a745;">
                💡 지도를 클릭하여 위치를 설정하세요. 설정된 좌표는 EPSG:5186 형식으로 저장됩니다.
            </div>
        </div>
        
        <!-- 카카오맵 API 로드 -->
        <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey={kakao_api_key}&autoload=false&libraries=services"></script>
        
        <script>
        (function() {{
            // 카카오맵 API 로드 및 초기화
            if (typeof kakao === 'undefined') {{
                console.error('카카오맵 API 로드 실패');
                document.getElementById('kakao_map_{name}').innerHTML = 
                    '<div style="padding:20px;text-align:center;color:#dc3545;">카카오맵 API 로드에 실패했습니다.</div>';
                return;
            }}
            
            kakao.maps.load(function() {{
                // 지도 컨테이너와 옵션 설정 (공식 문서 방식)
                var container = document.getElementById('kakao_map_{name}');
                var options = {{
                    center: new kakao.maps.LatLng({context['default_lat']}, {context['default_lon']}),
                    level: {context['default_zoom']},
                    draggable: true,
                    scrollwheel: true
                }};
                
                // 지도 생성
                var map = new kakao.maps.Map(container, options);
                
                // 지도 컨트롤 추가
                var zoomControl = new kakao.maps.ZoomControl();
                map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
                
                var mapTypeControl = new kakao.maps.MapTypeControl();
                map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
                
                var currentMarker = null;
                
                // 기존 좌표가 있는 경우 마커 표시
                var initialLat = {context['initial_lat'] or 'null'};
                var initialLng = {context['initial_lng'] or 'null'};
                
                if (initialLat && initialLng) {{
                    var position = new kakao.maps.LatLng(initialLat, initialLng);
                    currentMarker = new kakao.maps.Marker({{
                        position: position,
                        map: map,
                        draggable: true
                    }});
                    map.setCenter(position);
                    
                    // 마커 드래그 이벤트
                    kakao.maps.event.addListener(currentMarker, 'dragend', function() {{
                        var pos = currentMarker.getPosition();
                        updateCoordinates(pos.getLat(), pos.getLng());
                    }});
                    
                    updateCoordsDisplay(initialLat, initialLng);
                }}
                
                // 지도 클릭 이벤트 (공식 문서 방식)
                kakao.maps.event.addListener(map, 'click', function(mouseEvent) {{
                    var latlng = mouseEvent.latLng;
                    var lat = latlng.getLat();
                    var lng = latlng.getLng();
                    
                    // 기존 마커 제거
                    if (currentMarker) {{
                        currentMarker.setMap(null);
                    }}
                    
                    // 새 마커 생성
                    currentMarker = new kakao.maps.Marker({{
                        position: latlng,
                        map: map,
                        draggable: true
                    }});
                    
                    // 마커 드래그 이벤트
                    kakao.maps.event.addListener(currentMarker, 'dragend', function() {{
                        var pos = currentMarker.getPosition();
                        updateCoordinates(pos.getLat(), pos.getLng());
                    }});
                    
                    // 좌표 업데이트
                    updateCoordinates(lat, lng);
                }});
                
                // 좌표 업데이트 함수
                function updateCoordinates(lat, lng) {{
                    // WGS84 → EPSG:5186 변환 API 호출
                    fetch('/admin/geodb/transform-coordinates/', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken()
                        }},
                        body: JSON.stringify({{
                            lng: lng,
                            lat: lat,
                            from_srid: 4326,
                            to_srid: 5186
                        }})
                    }})
                    .then(response => response.json())
                    .then(data => {{
                        if (data.success) {{
                            // EPSG:5186 좌표로 WKT 생성
                            var wkt = 'POINT(' + data.x + ' ' + data.y + ')';
                            document.getElementById('id_{name}').value = wkt;
                            updateCoordsDisplay(lat, lng, data.x, data.y);
                        }} else {{
                            console.error('좌표 변환 실패:', data.error);
                            var wkt = 'POINT(' + lng + ' ' + lat + ')';
                            document.getElementById('id_{name}').value = wkt;
                            updateCoordsDisplay(lat, lng);
                        }}
                        
                        // 변경 이벤트 발생
                        var event = new Event('change', {{ bubbles: true }});
                        document.getElementById('id_{name}').dispatchEvent(event);
                    }})
                    .catch(error => {{
                        console.error('좌표 변환 요청 실패:', error);
                        var wkt = 'POINT(' + lng + ' ' + lat + ')';
                        document.getElementById('id_{name}').value = wkt;
                        updateCoordsDisplay(lat, lng);
                    }});
                }}
                
                // 좌표 정보 표시
                function updateCoordsDisplay(lat, lng, x5186, y5186) {{
                    var coordsDiv = document.getElementById('kakao_coords_{name}');
                    if (coordsDiv) {{
                        var html = 'WGS84: ' + lat.toFixed(6) + ', ' + lng.toFixed(6);
                        if (x5186 && y5186) {{
                            html += ' | EPSG:5186: ' + x5186.toFixed(2) + ', ' + y5186.toFixed(2);
                        }}
                        coordsDiv.innerHTML = html;
                    }}
                }}
                
                // CSRF 토큰 가져오기
                function getCsrfToken() {{
                    var token = document.querySelector('[name=csrfmiddlewaretoken]');
                    return token ? token.value : '';
                }}
                
                console.log('카카오맵이 성공적으로 초기화되었습니다.');
            }});
        }})();
        </script>
        """

        return mark_safe(html)


class KakaoPointWidget(KakaoMapWidget):
    """카카오맵을 사용하는 포인트 위젯"""

    geom_type = "POINT"
    map_width = 800
    map_height = 600


class KakaoPolygonWidget(KakaoMapWidget):
    """카카오맵을 사용하는 폴리곤 위젯"""

    geom_type = "POLYGON"
    map_width = 800
    map_height = 600
