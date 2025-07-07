/**
 * AI_Analyzer OpenLayers 지도 시스템
 * OpenStreetMap + OpenLayers 10.6.1 사용
 * 분석 결과 위치 표시 및 주변 데이터 시각화
 */

console.log('🗺️ AI_Analyzer OpenLayers 지도 시스템 로드...');

// ===========================================
// 🎯 전역 변수 및 설정
// ===========================================

let openLayersMap = null;
let vectorSource = null;
let vectorLayer = null;
let markerSource = null;
let markerLayer = null;
let currentLocation = null;
let currentBuffer = null;
let isOpenLayersMapInitialized = false;

// 현재 설정
let currentMapMode = 'population'; // 'population', 'workplace', 'shops'
let currentBufferSize = 300; // 300m or 1000m

// 지도 설정
const MAP_CONFIG = {
  defaultCenter: [126.9780, 37.5665], // 서울 시청 [경도, 위도]
  defaultZoom: 15,
  bufferColors: {
    300: 'rgba(74, 144, 226, 0.5)',
    1000: 'rgba(244, 67, 54, 0.4)'
  },
  markerStyles: {
    center: {
      color: '#dc3545',
      size: 12
    },
    population: {
      color: '#28a745',
      size: 8
    },
    workplace: {
      color: '#007bff',
      size: 8
    },
    shops: {
      color: '#ffc107',
      size: 8
    }
  }
};

// ===========================================
// 🎯 지도 초기화
// ===========================================

/**
 * OpenLayers 지도 초기화
 */
function initializeOpenLayersMap() {
  // 중복 초기화 방지
  if (isOpenLayersMapInitialized) {
    console.log('⚠️ OpenLayers 지도가 이미 초기화되었습니다.');
    return;
  }
  
  console.log('🔧 OpenLayers 지도 초기화 시작...');
  
  // OpenLayers 라이브러리 확인
  if (typeof ol === 'undefined') {
    console.error('❌ OpenLayers 라이브러리가 로드되지 않았습니다');
    console.log('🔄 OpenLayers 라이브러리 로드 대기 중...');
    // 라이브러리 로드 대기 후 재시도
    setTimeout(() => {
      if (typeof ol !== 'undefined') {
        console.log('✅ OpenLayers 라이브러리 로드 완료, 재시도');
        initializeOpenLayersMap();
      } else {
        console.error('❌ OpenLayers 라이브러리 로드 실패');
        showMapInitError('OpenLayers 라이브러리를 찾을 수 없습니다.');
      }
    }, 1000);
    return;
  }

  // 지도 컨테이너 확인
  const mapContainer = document.getElementById('analysis-openmap');
  if (!mapContainer) {
    console.error('❌ 지도 컨테이너를 찾을 수 없습니다');
    return;
  }

  try {
    // Vector 레이어 생성 (버퍼 및 데이터 표시용)
    vectorSource = new ol.source.Vector();
    vectorLayer = new ol.layer.Vector({
      source: vectorSource,
      style: getFeatureStyle
    });

    // 마커 레이어 생성 (중심점 및 POI 표시용)
    markerSource = new ol.source.Vector();
    markerLayer = new ol.layer.Vector({
      source: markerSource,
      style: getMarkerStyle
    });

    // OpenLayers 맵 생성
    openLayersMap = new ol.Map({
      target: 'analysis-openmap',
      layers: [
        // OpenStreetMap 타일 레이어
        new ol.layer.Tile({
          source: new ol.source.OSM()
        }),
        vectorLayer,
        markerLayer
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat(MAP_CONFIG.defaultCenter),
        zoom: MAP_CONFIG.defaultZoom,
        minZoom: 10,
        maxZoom: 20
      }),
      controls: [
        new ol.control.Zoom(),
        new ol.control.Attribution()
      ]
    });

    // 지도 클릭 이벤트
    openLayersMap.on('click', onOpenLayersMapClick);

    // 마우스 오버 이벤트 (상점 정보 표시용)
    openLayersMap.on('pointermove', onOpenLayersPointerMove);

    // 팝업 오버레이 생성
    createPopupOverlay();

    isOpenLayersMapInitialized = true;
    console.log('✅ OpenLayers 지도 초기화 완료');

    // 로딩 오버레이 강제 숨기기
    showMapLoading(false);
    
    // 지도 컨테이너가 보이도록 설정
    const mapContainer = document.getElementById('analysis-openmap');
    if (mapContainer) {
      mapContainer.style.display = 'block';
      mapContainer.style.visibility = 'visible';
    }

    // 초기 상태 설정
    updateMapControls();

  } catch (error) {
    console.error('❌ OpenLayers 지도 초기화 오류:', error);
    showMapInitError('지도를 초기화할 수 없습니다.');
  }
}

/**
 * 팝업 오버레이 생성
 */
function createPopupOverlay() {
  // 팝업 요소 생성
  const popupElement = document.createElement('div');
  popupElement.id = 'map-popup';
  popupElement.className = 'ol-popup';
  popupElement.innerHTML = `
    <a href="#" id="popup-closer" class="ol-popup-closer"></a>
    <div id="popup-content"></div>
  `;
  
  // 팝업 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .ol-popup {
      position: absolute;
      background-color: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
      padding: 15px;
      border-radius: 10px;
      border: 1px solid #cccccc;
      bottom: 12px;
      left: -50px;
      min-width: 280px;
      max-width: 350px;
      z-index: 1000;
    }
    .ol-popup:after, .ol-popup:before {
      top: 100%;
      border: solid transparent;
      content: " ";
      height: 0;
      width: 0;
      position: absolute;
      pointer-events: none;
    }
    .ol-popup:after {
      border-color: rgba(255, 255, 255, 0);
      border-top-color: white;
      border-width: 10px;
      left: 48px;
      margin-left: -10px;
    }
    .ol-popup:before {
      border-color: rgba(204, 204, 204, 0);
      border-top-color: #cccccc;
      border-width: 11px;
      left: 48px;
      margin-left: -11px;
    }
    .ol-popup-closer {
      text-decoration: none;
      position: absolute;
      top: 2px;
      right: 8px;
      color: #999;
      font-size: 18px;
    }
    .ol-popup-closer:after {
      content: "✖";
    }
  `;
  document.head.appendChild(style);
  
  // 오버레이 생성
  const popupOverlay = new ol.Overlay({
    element: popupElement,
    autoPan: {
      animation: {
        duration: 250,
      },
    },
  });
  
  openLayersMap.addOverlay(popupOverlay);
  
  // 닫기 버튼 이벤트
  document.getElementById('popup-closer').onclick = function() {
    popupOverlay.setPosition(undefined);
    return false;
  };
  
  // 전역 변수로 저장
  window.mapPopupOverlay = popupOverlay;
}

// ===========================================
// 🎯 지도 컨트롤 및 UI
// ===========================================

/**
 * 지도 모드 변경 (거주인구, 직장인구, 주변상점)
 */
function changeMapMode(mode) {
  console.log(`🔄 지도 모드 변경: ${currentMapMode} → ${mode}`);
  
  currentMapMode = mode;
  
  // 탭 UI 업데이트
  updateTabUI();
  
  // 데이터 레이어 업데이트
  updateDataLayers();
  
  // 컨트롤 상태 업데이트
  updateMapControls();
}

// 즉시 전역으로 노출
window.changeMapMode = changeMapMode;

/**
 * 버퍼 크기 변경 (300m, 1000m)
 */
function changeBufferSize(size) {
  console.log(`🔄 버퍼 크기 변경: ${currentBufferSize}m → ${size}m`);
  
  currentBufferSize = size;
  
  // 버튼 UI 업데이트
  updateBufferUI();
  
  // 버퍼 영역 다시 그리기
  if (currentLocation) {
    drawBufferArea(currentLocation, size);
  }
  
  // 데이터 레이어 업데이트
  updateDataLayers();
}

// 즉시 전역으로 노출
window.changeBufferSize = changeBufferSize;

/**
 * 탭 UI 업데이트
 */
function updateTabUI() {
  const tabs = document.querySelectorAll('.map-mode-tab');
  tabs.forEach(tab => {
    const mode = tab.getAttribute('data-mode');
    if (mode === currentMapMode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

/**
 * 버퍼 버튼 UI 업데이트
 */
function updateBufferUI() {
  const buttons = document.querySelectorAll('.buffer-btn');
  buttons.forEach(btn => {
    const size = parseInt(btn.getAttribute('data-size'));
    if (size === currentBufferSize) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * 지도 컨트롤 상태 업데이트
 */
function updateMapControls() {
  const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  
  // 상태 표시 업데이트
  const statusElement = document.getElementById('map-status');
  if (statusElement) {
    let statusText = '';
    if (currentLang === 'en') {
      statusText = `${getModeText(currentMapMode)} data within ${currentBufferSize}m`;
    } else if (currentLang === 'es') {
      statusText = `Datos de ${getModeText(currentMapMode)} dentro de ${currentBufferSize}m`;
    } else {
      statusText = `${currentBufferSize}m 반경 ${getModeText(currentMapMode)} 데이터`;
    }
    statusElement.textContent = statusText;
  }
}

/**
 * 모드 텍스트 가져오기
 */
function getModeText(mode) {
  const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  
  const texts = {
    population: { ko: '거주인구', en: 'residential population', es: 'población residencial' },
    workplace: { ko: '직장인구', en: 'working population', es: 'población trabajadora' },
    shops: { ko: '주변상점', en: 'nearby shops', es: 'tiendas cercanas' }
  };
  
  return texts[mode] ? texts[mode][currentLang] : mode;
}

// ===========================================
// 🎯 지도 위치 및 데이터 표시
// ===========================================

/**
 * 분석 위치 설정 및 표시
 */
function setAnalysisLocation(latitude, longitude, address) {
  if (!isOpenLayersMapInitialized) {
    console.warn('⚠️ 지도가 초기화되지 않았습니다');
    return;
  }
  
  console.log(`📍 분석 위치 설정: ${address} (${latitude}, ${longitude})`);
  
  currentLocation = {
    lat: latitude,
    lng: longitude,
    address: address
  };
  
  // 지도 중심 이동
  const coords = ol.proj.fromLonLat([longitude, latitude]);
  openLayersMap.getView().setCenter(coords);
  openLayersMap.getView().setZoom(16);
  
  // 기존 마커 제거
  markerSource.clear();
  
  // 중심 마커 추가
  const centerMarker = new ol.Feature({
    geometry: new ol.geom.Point(coords),
    type: 'center',
    name: address,
    info: '분석 대상 위치'
  });
  
  markerSource.addFeature(centerMarker);
  
  // 버퍼 영역 그리기
  drawBufferArea(currentLocation, currentBufferSize);
  
  // 초기 데이터 로드 (약간의 지연 후)
  setTimeout(() => {
    loadMapData();
  }, 200);
}

/**
 * 버퍼 영역 그리기
 */
function drawBufferArea(location, radius) {
  if (!location) return;
  
  // 기존 버퍼 제거
  const features = vectorSource.getFeatures();
  features.forEach(feature => {
    if (feature.get('type') === 'buffer') {
      vectorSource.removeFeature(feature);
    }
  });
  
  // 새 버퍼 생성
  const center = ol.proj.fromLonLat([location.lng, location.lat]);
  const circle = new ol.geom.Circle(center, radius);
  
  const bufferFeature = new ol.Feature({
    geometry: circle,
    type: 'buffer',
    radius: radius
  });
  
  vectorSource.addFeature(bufferFeature);
  currentBuffer = bufferFeature;
  
  console.log(`🔵 ${radius}m 버퍼 영역 생성 완료`);
}

/**
 * 지도 데이터 로드
 */
function loadMapData() {
  if (!currentLocation) {
    console.warn('⚠️ 현재 위치가 설정되지 않았습니다');
    return;
  }
  
  console.log(`📊 지도 데이터 로드 시작: ${currentMapMode}, ${currentBufferSize}m`);
  
  // 로딩 상태 표시 (짧은 시간만)
  showMapLoading(true);
  
  // 모드에 따른 데이터 로드
  switch (currentMapMode) {
    case 'population':
      loadPopulationData();
      break;
    case 'workplace':
      loadWorkplaceData();
      break;
    case 'shops':
      loadShopsData();
      break;
    default:
      console.warn(`⚠️ 알 수 없는 지도 모드: ${currentMapMode}`);
      // 알 수 없는 모드인 경우 로딩 즉시 해제
      showMapLoading(false);
  }
}

/**
 * 실제 Django API에서 지도 데이터 로드
 */
function loadRealMapData(mode) {
  if (!currentLocation) {
    console.warn('⚠️ 현재 위치가 설정되지 않았습니다');
    showMapLoading(false);
    return;
  }
  
  console.log(`🌐 Django API 호출 시작: ${mode} 데이터, ${currentBufferSize}m 반경`);
  
  // API 요청 데이터 준비
  const requestData = {
    latitude: currentLocation.lat,
    longitude: currentLocation.lng,
    radius: currentBufferSize,
    mode: mode
  };
  
  // Django API 호출
  fetch('/ai-analyzer/api/map-data/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify(requestData)
  })
  .then(response => {
    console.log(`📡 API 응답 상태: ${response.status}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`✅ ${mode} 데이터 수신 완료:`, data);
    
    if (data.success && data.data) {
      // 모드에 따른 데이터 표시
      switch (mode) {
        case 'population':
          displayPopulationData(data.data);
          break;
        case 'workplace':
          displayWorkplaceData(data.data);
          break;
        case 'shops':
          displayShopsData(data.data);
          break;
      }
      
      console.log(`📊 ${mode} 데이터 표시 완료: ${data.count}개`);
    } else {
      console.warn(`⚠️ ${mode} 데이터가 없습니다:`, data);
      // 데이터가 없어도 로딩 상태 해제
    }
    
    showMapLoading(false);
  })
  .catch(error => {
    console.error(`❌ ${mode} 데이터 로드 실패:`, error);
    showMapLoading(false);
    
    // 실패 시 폴백으로 데모 데이터 표시
    console.log(`🔄 ${mode} 데모 데이터로 폴백...`);
    setTimeout(() => {
      switch (mode) {
        case 'population':
          displayPopulationData(generateDemoPopulationData());
          break;
        case 'workplace':
          displayWorkplaceData(generateDemoWorkplaceData());
          break;
        case 'shops':
          displayShopsData(generateDemoShopsData());
          break;
      }
    }, 100);
  });
}

/**
 * CSRF 토큰 가져오기
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * 거주인구 데이터 로드
 */
function loadPopulationData() {
  console.log('👥 거주인구 데이터 로드...');
  
  // 실제 Django API 호출
  loadRealMapData('population');
}

/**
 * 직장인구 데이터 로드
 */
function loadWorkplaceData() {
  console.log('🏢 직장인구 데이터 로드...');
  
  // 실제 Django API 호출
  loadRealMapData('workplace');
}

/**
 * 주변상점 데이터 로드
 */
function loadShopsData() {
  console.log('🏪 주변상점 데이터 로드...');
  
  // 실제 Django API 호출
  loadRealMapData('shops');
}

// ===========================================
// 🎯 데이터 표시 함수들
// ===========================================

/**
 * 거주인구 데이터 표시
 */
function displayPopulationData(data) {
  console.log('📊 거주인구 데이터 표시 시작:', data.length, '개');
  
  // 기존 데이터 마커 제거
  clearDataMarkers();
  
  // 인구 밀도 히트맵 스타일로 표시
  data.forEach((point, index) => {
    const coords = ol.proj.fromLonLat([point.lng, point.lat]);
    const marker = new ol.Feature({
      geometry: new ol.geom.Point(coords),
      type: 'population',
      population: point.population,
      info: `거주인구: ${point.population.toLocaleString()}명`
    });
    
    markerSource.addFeature(marker);
    console.log(`📍 거주인구 마커 ${index + 1} 추가:`, point.lat, point.lng, point.population);
  });
  
  console.log('✅ 거주인구 데이터 표시 완료, 총 마커 수:', markerSource.getFeatures().length);
}

/**
 * 직장인구 데이터 표시
 */
function displayWorkplaceData(data) {
  console.log('📊 직장인구 데이터 표시 시작:', data.length, '개');
  
  clearDataMarkers();
  
  data.forEach((point, index) => {
    const coords = ol.proj.fromLonLat([point.lng, point.lat]);
    const marker = new ol.Feature({
      geometry: new ol.geom.Point(coords),
      type: 'workplace',
      workers: point.workers,
      male_workers: point.male_workers || 0,
      female_workers: point.female_workers || 0,
      info: `직장인구: ${point.workers.toLocaleString()}명 (남: ${point.male_workers || 0}명, 여: ${point.female_workers || 0}명)`
    });
    
    markerSource.addFeature(marker);
    console.log(`🏢 직장인구 마커 ${index + 1} 추가:`, point.lat, point.lng, point.workers);
  });
  
  console.log('✅ 직장인구 데이터 표시 완료, 총 마커 수:', markerSource.getFeatures().length);
}

/**
 * 주변상점 데이터 표시
 */
function displayShopsData(data) {
  console.log('📊 주변상점 데이터 표시 시작:', data.length, '개');
  
  clearDataMarkers();
  
  data.forEach((shop, index) => {
    const coords = ol.proj.fromLonLat([shop.lng, shop.lat]);
    const marker = new ol.Feature({
      geometry: new ol.geom.Point(coords),
      type: 'shops',
      shopData: shop,
      info: `${shop.name} (${shop.category})`
    });
    
    markerSource.addFeature(marker);
    console.log(`🏪 주변상점 마커 ${index + 1} 추가:`, shop.lat, shop.lng, shop.name);
  });
  
  console.log('✅ 주변상점 데이터 표시 완료, 총 마커 수:', markerSource.getFeatures().length);
}

/**
 * 데이터 마커 제거
 */
function clearDataMarkers() {
  const features = markerSource.getFeatures();
  features.forEach(feature => {
    const type = feature.get('type');
    if (type !== 'center') {
      markerSource.removeFeature(feature);
    }
  });
}

/**
 * 데이터 레이어 업데이트
 */
function updateDataLayers() {
  if (!isOpenLayersMapInitialized || !currentLocation) return;
  
  loadMapData();
}

// ===========================================
// 🎯 스타일 및 이벤트 처리
// ===========================================

/**
 * 피처 스타일 설정
 */
function getFeatureStyle(feature) {
  const type = feature.get('type');
  
  if (type === 'buffer') {
    const radius = feature.get('radius');
    return new ol.style.Style({
      fill: new ol.style.Fill({
        color: MAP_CONFIG.bufferColors[radius] || 'rgba(0, 0, 255, 0.1)'
      }),
      stroke: new ol.style.Stroke({
        color: radius === 300 ? '#4a90e2' : '#f44336',
        width: 2,
        lineDash: [5, 5]
      })
    });
  }
  
  return null;
}

/**
 * 마커 스타일 설정
 */
function getMarkerStyle(feature) {
  const type = feature.get('type');
  const config = MAP_CONFIG.markerStyles[type] || MAP_CONFIG.markerStyles.center;
  
  let size = config.size;
  let color = config.color;
  
  // 데이터에 따른 크기 조정
  if (type === 'population') {
    const population = feature.get('population') || 0;
    size = Math.max(6, Math.min(16, Math.log(population + 1) * 2));
  } else if (type === 'workplace') {
    const workers = feature.get('workers') || 0;
    size = Math.max(6, Math.min(16, Math.log(workers + 1) * 2));
  }
  
  return new ol.style.Style({
    image: new ol.style.Circle({
      radius: size,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: new ol.style.Stroke({
        color: '#ffffff',
        width: 2
      })
    })
  });
}

/**
 * OpenLayers 지도 클릭 이벤트
 */
function onOpenLayersMapClick(event) {
  const feature = openLayersMap.forEachFeatureAtPixel(event.pixel, (feature) => {
    return feature;
  });
  
  if (feature && feature.get('type') === 'shops') {
    const shopData = feature.get('shopData');
    showShopInfoPopup(event.coordinate, shopData);
  }
}

/**
 * OpenLayers 마우스 오버 이벤트
 */
function onOpenLayersPointerMove(event) {
  const pixel = openLayersMap.getEventPixel(event.originalEvent);
  const hit = openLayersMap.hasFeatureAtPixel(pixel);
  
  openLayersMap.getTargetElement().style.cursor = hit ? 'pointer' : '';
  
  // 상점 마커에 마우스 오버 시 정보 표시
  if (hit) {
    const feature = openLayersMap.forEachFeatureAtPixel(pixel, (feature) => {
      return feature;
    });
    
    if (feature && feature.get('type') === 'shops') {
      const shopData = feature.get('shopData');
      showShopHoverInfo(event.coordinate, shopData);
    }
  } else {
    hideShopHoverInfo();
  }
}

/**
 * 상점 정보 팝업 표시
 */
function showShopInfoPopup(coordinate, shopData) {
  if (!window.mapPopupOverlay) return;
  
  const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  
  const content = document.getElementById('popup-content');
  content.innerHTML = `
    <div class="shop-popup">
      <h6 class="mb-2">${shopData.name}</h6>
      <div class="mb-1"><strong>${currentLang === 'en' ? 'Category:' : currentLang === 'es' ? 'Categoría:' : '업종:'}</strong> ${shopData.category}</div>
      <div class="mb-1"><strong>${currentLang === 'en' ? 'Address:' : currentLang === 'es' ? 'Dirección:' : '주소:'}</strong> ${shopData.address}</div>
      ${shopData.phone ? `<div class="mb-1"><strong>${currentLang === 'en' ? 'Phone:' : currentLang === 'es' ? 'Teléfono:' : '전화:'}</strong> ${shopData.phone}</div>` : ''}
      ${shopData.rating ? `<div class="mb-1"><strong>${currentLang === 'en' ? 'Rating:' : currentLang === 'es' ? 'Calificación:' : '평점:'}</strong> ⭐ ${shopData.rating}</div>` : ''}
    </div>
  `;
  
  window.mapPopupOverlay.setPosition(coordinate);
}

/**
 * 상점 호버 정보 표시 (간단한 툴팁)
 */
function showShopHoverInfo(coordinate, shopData) {
  // 간단한 툴팁 구현
  let tooltip = document.getElementById('map-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'map-tooltip';
    tooltip.className = 'map-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10000;
      max-width: 200px;
    `;
    document.body.appendChild(tooltip);
  }
  
  tooltip.innerHTML = `<strong>${shopData.name}</strong><br>${shopData.category}`;
  tooltip.style.display = 'block';
}

/**
 * 상점 호버 정보 숨김
 */
function hideShopHoverInfo() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// ===========================================
// 🎯 데모 데이터 생성 (개발용)
// ===========================================

/**
 * 데모 거주인구 데이터 생성
 */
function generateDemoPopulationData() {
  const data = [];
  const baseLocation = currentLocation || { lat: 37.5665, lng: 126.9780 }; // 서울시청 좌표로 폴백
  
  console.log('📊 거주인구 데모 데이터 생성 시작:', baseLocation);
  
  for (let i = 0; i < 15; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.01;
    const offsetLng = (Math.random() - 0.5) * 0.01;
    
    data.push({
      lat: baseLocation.lat + offsetLat,
      lng: baseLocation.lng + offsetLng,
      population: Math.floor(Math.random() * 1000) + 100
    });
  }
  
  console.log('📊 거주인구 데모 데이터 생성 완료:', data.length, '개');
  return data;
}

/**
 * 데모 직장인구 데이터 생성
 */
function generateDemoWorkplaceData() {
  const data = [];
  const baseLocation = currentLocation || { lat: 37.5665, lng: 126.9780 }; // 서울시청 좌표로 폴백
  
  console.log('🏢 직장인구 데모 데이터 생성 시작:', baseLocation);
  
  for (let i = 0; i < 10; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.008;
    const offsetLng = (Math.random() - 0.5) * 0.008;
    
    data.push({
      lat: baseLocation.lat + offsetLat,
      lng: baseLocation.lng + offsetLng,
      workers: Math.floor(Math.random() * 500) + 50
    });
  }
  
  console.log('🏢 직장인구 데모 데이터 생성 완료:', data.length, '개');
  return data;
}

/**
 * 데모 상점 데이터 생성
 */
function generateDemoShopsData() {
  const data = [];
  const baseLocation = currentLocation || { lat: 37.5665, lng: 126.9780 }; // 서울시청 좌표로 폴백
  const categories = ['카페', '음식점', '편의점', '패스트푸드', '베이커리', '치킨', '피자', '분식'];
  
  console.log('🏪 주변상점 데모 데이터 생성 시작:', baseLocation);
  
  for (let i = 0; i < 20; i++) {
    const offsetLat = (Math.random() - 0.5) * 0.006;
    const offsetLng = (Math.random() - 0.5) * 0.006;
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    data.push({
      id: i + 1,
      lat: baseLocation.lat + offsetLat,
      lng: baseLocation.lng + offsetLng,
      name: `${category} ${i + 1}`,
      category: category,
      address: `서울시 중구 주소 ${i + 1}`,
      phone: `02-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      rating: (Math.random() * 2 + 3).toFixed(1)
    });
  }
  
  console.log('🏪 주변상점 데모 데이터 생성 완료:', data.length, '개');
  return data;
}

// ===========================================
// 🎯 유틸리티 함수
// ===========================================

/**
 * 지도 로딩 상태 표시 (개선된 버전)
 */
function showMapLoading(show) {
  const loadingElement = document.getElementById('map-loading');
  if (loadingElement) {
    if (show) {
      loadingElement.style.display = 'flex';
      loadingElement.style.visibility = 'visible';
      console.log('🔄 지도 로딩 오버레이 표시');
    } else {
      loadingElement.style.display = 'none';
      loadingElement.style.visibility = 'hidden';
      console.log('✅ 지도 로딩 오버레이 숨김');
    }
  } else {
    console.warn('⚠️ map-loading 요소를 찾을 수 없습니다.');
  }
}

/**
 * 지도 초기화 오류 표시
 */
function showMapInitError(message) {
  const mapContainer = document.getElementById('analysis-openmap');
  if (mapContainer) {
    mapContainer.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 bg-light text-center p-4">
        <div>
          <i class="bi bi-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
          <h5 class="text-muted">지도 로드 오류</h5>
          <p class="text-muted">${message}</p>
          <button class="btn btn-primary btn-sm" onclick="retryMapInitialization()">다시 시도</button>
        </div>
      </div>
    `;
  }
}

/**
 * 지도 초기화 재시도
 */
function retryMapInitialization() {
  console.log('🔄 지도 초기화 재시도...');
  
  // 기존 지도 정리
  if (openLayersMap) {
    openLayersMap.setTarget(null);
    openLayersMap = null;
  }
  
  isOpenLayersMapInitialized = false;
  
  // 재초기화
  setTimeout(() => {
    initializeOpenLayersMap();
  }, 100);
}

/**
 * 지도 크기 조정
 */
function resizeOpenMap() {
  if (openLayersMap) {
    openLayersMap.updateSize();
  }
}

// ===========================================
// 🎯 외부 인터페이스 함수
// ===========================================

/**
 * 분석 결과와 연동하여 지도 업데이트
 */
function updateMapWithAnalysisResult(result) {
  console.log('📊 분석 결과로 지도 업데이트:', result);
  
  if (result.latitude && result.longitude) {
    setAnalysisLocation(result.latitude, result.longitude, result.address);
  }
}

/**
 * 지도 표시/숨김
 */
function toggleAnalysisMap(show) {
  const mapSection = document.getElementById('analysis-map-section');
  if (mapSection) {
    mapSection.style.display = show ? 'block' : 'none';
    
    if (show && isOpenLayersMapInitialized) {
      // 지도 크기 재계산
      setTimeout(() => {
        resizeOpenMap();
      }, 100);
    }
  }
}

// ===========================================
// 🎯 전역 함수 노출
// ===========================================

// 외부에서 사용할 수 있도록 전역 함수로 노출
window.initializeOpenLayersMap = initializeOpenLayersMap;
window.changeMapMode = changeMapMode;
window.changeBufferSize = changeBufferSize;
window.setAnalysisLocation = setAnalysisLocation;
window.updateMapWithAnalysisResult = updateMapWithAnalysisResult;
window.toggleAnalysisMap = toggleAnalysisMap;
window.resizeOpenMap = resizeOpenMap;
window.retryMapInitialization = retryMapInitialization;

// ===========================================
// 🎯 자동 초기화
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 analyze-openmap.js 로드됨');
  
  // OpenLayers 라이브러리 로드 확인 (자동 초기화는 비활성화)
  setTimeout(() => {
    if (typeof ol !== 'undefined') {
      console.log('✅ OpenLayers 라이브러리 감지됨');
      console.log('ℹ️ 지도 초기화는 분석 결과 표시 시에만 실행됩니다.');
    } else {
      console.warn('⚠️ OpenLayers 라이브러리가 로드되지 않았습니다');
    }
  }, 1000);
});

console.log('✅ AI_Analyzer OpenLayers 지도 시스템 로드 완료'); 