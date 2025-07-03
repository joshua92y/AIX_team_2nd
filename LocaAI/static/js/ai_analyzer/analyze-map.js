/**
 * AI_Analyzer 카카오맵 지도 기능
 * 주소 입력 ↔ 지도 위치 양방향 연동
 */

// 전역 변수
let kakaoMap = null;
let kakaoGeocoder = null;
let currentMarker = null;
let isMapInitialized = false;

// 🔧 요청 관리 변수 추가
let isProcessingClick = false;
let currentAbortController = null;
let clickDebounceTimeout = null;
let lastClickTime = 0;
const CLICK_DEBOUNCE_DELAY = 300; // 300ms 디바운스

// 기본 좌표 (서울 시청)
const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.9780;
const DEFAULT_LEVEL = 8; // 서울시 전체가 보이는 레벨

/**
 * 카카오맵 초기화
 */
function initializeKakaoMap() {
  console.log('🗺️ 카카오맵 초기화 시작...');
  
  // 카카오맵 API 로드 확인
  if (typeof kakao === 'undefined') {
    console.error('❌ 카카오맵 API가 로드되지 않았습니다');
    showMapError('카카오맵 API를 로드할 수 없습니다.');
    return;
  }

  // 지도 컨테이너 확인
  const mapContainer = document.getElementById('kakao-map');
  if (!mapContainer) {
    console.error('❌ 지도 컨테이너를 찾을 수 없습니다');
    return;
  }

  try {
    // 카카오맵 객체 생성
    const mapOptions = {
      center: new kakao.maps.LatLng(DEFAULT_LAT, DEFAULT_LNG),
      level: DEFAULT_LEVEL,
      mapTypeId: kakao.maps.MapTypeId.ROADMAP
    };

    kakaoMap = new kakao.maps.Map(mapContainer, mapOptions);

    // 지도 컨트롤 추가
    const mapTypeControl = new kakao.maps.MapTypeControl();
    kakaoMap.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

    const zoomControl = new kakao.maps.ZoomControl();
    kakaoMap.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 지오코더 초기화
    kakaoGeocoder = new kakao.maps.services.Geocoder();

    // 지도 클릭 이벤트 등록
    kakao.maps.event.addListener(kakaoMap, 'click', onMapClick);

    // 초기화 완료
    isMapInitialized = true;
    console.log('✅ 카카오맵 초기화 완료');

    // 기존 주소가 있다면 지도에 표시
    const existingAddress = document.getElementById('address').value;
    if (existingAddress) {
      searchAddressAndUpdateMap(existingAddress);
    }

  } catch (error) {
    console.error('❌ 카카오맵 초기화 오류:', error);
    showMapError('지도를 초기화할 수 없습니다.');
  }
}

/**
 * 지도 클릭 이벤트 처리 (개선된 버전)
 */
function onMapClick(mouseEvent) {
  const latlng = mouseEvent.latLng;
  const clickTime = Date.now();
  
  console.log('🎯 지도 클릭:', latlng.getLat(), latlng.getLng());
  
  // 🔧 클릭 디바운싱 처리
  if (clickTime - lastClickTime < CLICK_DEBOUNCE_DELAY) {
    console.log('⚡ 클릭 디바운스 적용 - 무시됨');
    return;
  }
  
  lastClickTime = clickTime;
  
  // 🔧 진행 중인 요청이 있으면 취소
  if (isProcessingClick) {
    console.log('🔄 이전 요청 취소 중...');
    cancelCurrentRequest();
  }
  
  // 🔧 클릭 디바운스 타이머 설정
  if (clickDebounceTimeout) {
    clearTimeout(clickDebounceTimeout);
  }
  
  clickDebounceTimeout = setTimeout(() => {
    processMapClick(latlng);
  }, CLICK_DEBOUNCE_DELAY);
}

/**
 * 지도 클릭 처리 실행
 */
function processMapClick(latlng) {
  // 🔧 처리 상태 설정
  isProcessingClick = true;
  
  // 로딩 인디케이터 표시
  showLoadingIndicator();
  
  // 마커 추가/이동 (즉시 실행)
  addOrMoveMarker(latlng);
  
  // 좌표를 주소로 변환
  convertCoordsToAddress(latlng);
}

/**
 * 현재 진행 중인 요청 취소
 */
function cancelCurrentRequest() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  if (clickDebounceTimeout) {
    clearTimeout(clickDebounceTimeout);
    clickDebounceTimeout = null;
  }
  
  isProcessingClick = false;
  hideLoadingIndicator();
}

/**
 * 로딩 인디케이터 표시
 */
function showLoadingIndicator() {
  // 기존 로딩 인디케이터 제거
  const existingIndicator = document.querySelector('.map-loading-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  const indicator = document.createElement('div');
  indicator.className = 'map-loading-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 10000;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  let loadingText = '좌표 정보 처리 중...';
  
  if (currentLang === 'en') {
    loadingText = 'Processing coordinates...';
  } else if (currentLang === 'es') {
    loadingText = 'Procesando coordenadas...';
  }
  
  indicator.innerHTML = `
    <div class="spinner-border spinner-border-sm" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
    ${loadingText}
  `;
  
  document.body.appendChild(indicator);
}

/**
 * 로딩 인디케이터 숨김
 */
function hideLoadingIndicator() {
  const indicator = document.querySelector('.map-loading-indicator');
  if (indicator) {
    indicator.remove();
  }
}

/**
 * 마커 추가 또는 이동
 */
function addOrMoveMarker(latlng) {
  if (currentMarker) {
    // 기존 마커 위치 변경
    currentMarker.setPosition(latlng);
  } else {
    // 새 마커 생성
    const markerImageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png';
    const markerImageSize = new kakao.maps.Size(50, 45);
    const markerImageOption = { offset: new kakao.maps.Point(25, 45) };

    const markerImage = new kakao.maps.MarkerImage(markerImageSrc, markerImageSize, markerImageOption);

    currentMarker = new kakao.maps.Marker({
      position: latlng,
      image: markerImage
    });

    currentMarker.setMap(kakaoMap);
  }
}

/**
 * 좌표를 주소로 변환 (개선된 버전 - 중복 요청 방지)
 */
function convertCoordsToAddress(latlng) {
  const lat = latlng.getLat();
  const lng = latlng.getLng();

  console.log('🔍 좌표 → 주소 변환 시도:', { lat, lng });

  // REST API 직접 호출
  const restApiKey = window.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    console.error('❌ KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    showMapError('API 키 설정 오류');
    finishProcessing();
    return;
  }

  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  
  // 🔧 AbortController로 요청 취소 가능하도록 설정
  currentAbortController = new AbortController();
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json'
    },
    signal: currentAbortController.signal
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('📡 카카오 REST API 응답:', data);
    
    if (data.documents && data.documents.length > 0) {
      const address = data.documents[0];
      let displayAddress = '';

      if (address.road_address) {
        displayAddress = address.road_address.address_name;
      } else if (address.address) {
        displayAddress = address.address.address_name;
      }

      console.log('✅ 좌표 → 주소 변환 성공:', displayAddress);

      // 서울시 지역 검증 (주소 + 좌표)
      if (!isSeoulAreaForMap(displayAddress, lat, lng)) {
        console.warn('⚠️ 서울시 외 지역이 선택되었습니다:', displayAddress);
        showSeoulAreaWarning();
        resetMapToSeoul();
        finishProcessing();
        return;
      }

      // 주소 필드 업데이트
      updateAddressField(displayAddress, lat, lng);
      
      // 🔧 성공 시 처리 완료
      finishProcessing();
    } else {
      console.warn('⚠️ 주소 정보를 찾을 수 없습니다.');
      showMapError('해당 위치의 주소를 찾을 수 없습니다.');
      finishProcessing();
    }
  })
  .catch(error => {
    // 🔧 요청이 취소된 경우는 오류로 처리하지 않음
    if (error.name === 'AbortError') {
      console.log('🔄 요청이 취소되었습니다.');
      return;
    }
    
    console.error('❌ 좌표 → 주소 변환 실패:', error);
    
    // 에러 메시지 분석
    if (error.message.includes('401')) {
      showMapError('API 키 인증 실패');
    } else if (error.message.includes('403')) {
      showMapError('API 사용 권한 없음');
    } else if (error.message.includes('429')) {
      showMapError('API 호출 한도 초과');
    } else {
      showMapError('주소 변환 중 오류 발생');
    }
    
    finishProcessing();
  });
}

/**
 * 처리 완료 시 상태 초기화
 */
function finishProcessing() {
  isProcessingClick = false;
  currentAbortController = null;
  hideLoadingIndicator();
  console.log('✅ 지도 클릭 처리 완료');
}

/**
 * 서울시 지역인지 확인 (지도용 - 문자열 주소 또는 Daum API 응답 객체 모두 지원)
 */
function isSeoulAreaForMap(addressOrData, lat = null, lng = null) {
  if (!addressOrData) return false;
  
  let addressCheck = false;
  
  // 🔧 파라미터 타입 확인 - 문자열인지 객체인지 판단
  if (typeof addressOrData === 'string') {
    // 문자열인 경우: 직접 주소 검증
    const address = addressOrData;
    addressCheck = address.startsWith('서울특별시') || 
                  address.startsWith('서울시') || 
                  address.startsWith('서울');
    
    console.log('🔍 문자열 주소 검증:', { address, addressCheck });
  } else if (typeof addressOrData === 'object' && addressOrData !== null) {
    // 객체인 경우: Daum API 응답 객체로 처리
    const data = addressOrData;
    
    // analyze-address.js의 isSeoulArea 로직과 동일하게 처리
    const sido = data.sido || '';
    const sigungu = data.sigungu || '';
    const roadAddress = data.roadAddress || '';
    const jibunAddress = data.jibunAddress || '';
    
    // 서울특별시 키워드 검증
    const seoulKeywords = ['서울특별시', '서울시', '서울'];
    
    // 1. sido 필드 검증
    const sidoMatch = sido && seoulKeywords.some(keyword => sido.includes(keyword));
    if (sidoMatch) {
      addressCheck = true;
    }
    
    // 2. 주소 문자열에서 서울 검증
    if (!addressCheck) {
      addressCheck = seoulKeywords.some(keyword => 
        roadAddress.includes(keyword) || jibunAddress.includes(keyword)
      );
    }
    
    // 3. 서울 구 이름으로 검증 (보조 검증)
    if (!addressCheck) {
      const seoulDistricts = [
        '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
        '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
        '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
        '서초구', '강남구', '송파구', '강동구'
      ];
      
      const matchedDistrict = seoulDistricts.find(district => 
        roadAddress.includes(district) || jibunAddress.includes(district) || sigungu.includes(district)
      );
      
      if (matchedDistrict) {
        addressCheck = true;
      }
    }
    
    console.log('🔍 객체 주소 검증:', { data, addressCheck });
  }
  
  // 2. 좌표 범위로 확인 (서울시 대략적 경계)
  let coordCheck = true;
  if (lat !== null && lng !== null) {
    // 서울시 대략적 좌표 범위
    const seoulBounds = {
      north: 37.715,  // 최북단 (도봉구)
      south: 37.413,  // 최남단 (서초구)
      east: 127.269,  // 최동단 (강동구)
      west: 126.764   // 최서단 (강서구)
    };
    
    coordCheck = lat >= seoulBounds.south && 
                lat <= seoulBounds.north && 
                lng >= seoulBounds.west && 
                lng <= seoulBounds.east;
    
    console.log('🔍 좌표 범위 검증:', { lat, lng, coordCheck });
  }
  
  const result = addressCheck && coordCheck;
  console.log('🔍 서울 지역 검증 결과:', { addressCheck, coordCheck, result });
  
  return result;
}

/**
 * 서울 외 지역 선택 시 경고 메시지 표시 (개선된 버전)
 */
function showSeoulAreaWarning() {
  // 🔧 기존 경고 메시지 제거 (중복 방지)
  const existingWarning = document.querySelector('.seoul-area-warning');
  if (existingWarning) {
    existingWarning.remove();
  }
  
  const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  
  let title, message;
  
  if (currentLang === 'en') {
    title = '🚫 Service Area Restriction';
    message = 'Only Seoul Metropolitan City is supported. The map will return to Seoul center.';
  } else if (currentLang === 'es') {
    title = '🚫 Restricción del área de servicio';
    message = 'Solo se admite la Ciudad Metropolitana de Seúl. El mapa volverá al centro de Seúl.';
  } else {
    title = '🚫 서비스 지역 제한';
    message = '서울특별시만 지원됩니다. 지도가 서울 중심으로 이동합니다.';
  }
  
  // 토스트 알림 표시 (개선된 버전)
  showToastNotification(title, message, 'warning', 'seoul-area-warning');
  
  // 콘솔에도 출력
  console.warn(`${title}: ${message}`);
}

/**
 * 토스트 알림 표시 (개선된 버전 - 중복 방지)
 */
function showToastNotification(title, message, type = 'info', customClass = '') {
  // 🔧 기존 토스트 제거 (중복 방지)
  const existingToast = document.querySelector('.map-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // 같은 타입의 토스트 제거
  if (customClass) {
    const existingCustomToast = document.querySelector(`.${customClass}`);
    if (existingCustomToast) {
      existingCustomToast.remove();
    }
  }
  
  // 토스트 타입별 스타일
  const typeClasses = {
    'info': 'bg-info text-white',
    'warning': 'bg-warning text-dark',
    'error': 'bg-danger text-white',
    'success': 'bg-success text-white'
  };
  
  const toastClass = typeClasses[type] || typeClasses.info;
  const additionalClass = customClass ? ` ${customClass}` : '';
  
  // 토스트 HTML 생성
  const toastHtml = `
    <div class="toast map-toast${additionalClass} position-fixed ${toastClass}" 
         style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" 
         role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        ${message}
      </div>
    </div>
  `;
  
  // 토스트를 body에 추가
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  
  // 토스트 표시
  const toastElement = document.querySelector('.map-toast');
  if (toastElement) {
    // Bootstrap Toast 사용 (가능한 경우)
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 4000
      });
      toast.show();
    } else {
      // Bootstrap이 없는 경우 수동으로 표시/숨김
      toastElement.style.display = 'block';
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.remove();
        }
      }, 4000);
    }
  }
}

/**
 * 지도를 서울 중심으로 리셋
 */
function resetMapToSeoul() {
  if (!kakaoMap) return;
  
  console.log('🔄 지도를 서울 중심으로 리셋');
  
  // 서울시청 좌표로 이동
  const seoulCenter = new kakao.maps.LatLng(37.5665, 126.9780);
  
  // 지도 중심 이동 (애니메이션 효과)
  kakaoMap.panTo(seoulCenter);
  
  // 줌 레벨을 서울 전체가 보이도록 조정
  kakaoMap.setLevel(8);
  
  // 기존 마커 제거
  if (currentMarker) {
    currentMarker.setMap(null);
    currentMarker = null;
  }
}

/**
 * 주소 필드 업데이트
 */
function updateAddressField(address, lat, lng) {
  const addressField = document.getElementById('address');
  if (addressField) {
    addressField.value = address;
    
    // 🗺️ 기존 좌표 변환 시스템과 연동 (analyze-address.js)
    if (typeof convertAddressToCoordinates === 'function') {
      // 기존 시스템의 좌표 변환 API 호출
      convertAddressToCoordinates(address);
      console.log('🔄 기존 좌표 변환 시스템과 연동 완료');
    } else {
      // 지도에서 직접 얻은 좌표로 업데이트 (백업)
      updateCoordinateFields(lat, lng);
      console.log('📍 지도 좌표로 직접 업데이트');
    }
    
    // 주소 변경 이벤트 발생
    const changeEvent = new Event('change', { bubbles: true });
    addressField.dispatchEvent(changeEvent);
  }
}

/**
 * 좌표 필드 업데이트 (EPSG:5186 변환 포함)
 */
function updateCoordinateFields(lat, lng) {
  const latField = document.getElementById('latitude');
  const lngField = document.getElementById('longitude');
  
  // WGS84 좌표 저장
  if (latField) latField.value = lat;
  if (lngField) lngField.value = lng;
  
  // 🎯 EPSG:5186 좌표로 변환해서 저장
  convertToEPSG5186AndUpdate(lat, lng);
}

/**
 * WGS84 좌표를 EPSG:5186으로 변환하여 좌표 필드 업데이트
 */
function convertToEPSG5186AndUpdate(lat, lng) {
  const csrfToken = getCsrfToken();
  
  // 좌표 변환 API 호출
  fetch('/ai_analyzer/get-coordinates/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken
    },
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
      from_srid: 4326,  // WGS84
      to_srid: 5186     // EPSG:5186
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // EPSG:5186 좌표로 업데이트
      const xField = document.getElementById('x_coord');
      const yField = document.getElementById('y_coord');
      
      if (xField) xField.value = data.x_coord.toFixed(2);
      if (yField) yField.value = data.y_coord.toFixed(2);
      
      console.log('✅ EPSG:5186 좌표 변환 성공:', {
        WGS84: { lat, lng },
        EPSG5186: { x: data.x_coord.toFixed(2), y: data.y_coord.toFixed(2) }
      });
    } else {
      console.error('❌ EPSG:5186 좌표 변환 실패:', data.error);
      // 실패 시 임시로 WGS84 좌표 사용 (긴급 대응)
      const xField = document.getElementById('x_coord');
      const yField = document.getElementById('y_coord');
      
      if (xField) xField.value = lng;
      if (yField) yField.value = lat;
    }
  })
  .catch(error => {
    console.error('❌ 좌표 변환 요청 실패:', error);
    // 실패 시 임시로 WGS84 좌표 사용 (긴급 대응)
    const xField = document.getElementById('x_coord');
    const yField = document.getElementById('y_coord');
    
    if (xField) xField.value = lng;
    if (yField) yField.value = lat;
  });
}

/**
 * 주소 검색 후 지도 업데이트 (개선된 버전 - 중복 요청 방지)
 */
function searchAddressAndUpdateMap(address) {
  if (!address) return;

  console.log('🔍 주소 검색:', address);
  
  // 🔧 진행 중인 요청이 있으면 취소
  if (isProcessingClick) {
    console.log('🔄 진행 중인 요청 취소 후 주소 검색 시작');
    cancelCurrentRequest();
  }
  
  // 처리 상태 설정
  isProcessingClick = true;
  showLoadingIndicator();

  // REST API 직접 호출
  const restApiKey = window.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    console.error('❌ KAKAO_REST_API_KEY가 설정되지 않았습니다.');
    showMapError('API 키 설정 오류');
    finishProcessing();
    return;
  }

  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  
  // 🔧 AbortController로 요청 취소 가능하도록 설정
  currentAbortController = new AbortController();
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json'
    },
    signal: currentAbortController.signal
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('📡 카카오 주소 검색 API 응답:', data);
    
    if (data.documents && data.documents.length > 0) {
      const result = data.documents[0];
      let lat, lng;
      
      // 좌표 추출
      if (result.road_address) {
        lat = parseFloat(result.road_address.y);
        lng = parseFloat(result.road_address.x);
      } else if (result.address) {
        lat = parseFloat(result.address.y);
        lng = parseFloat(result.address.x);
      }
      
      if (lat && lng) {
        console.log('✅ 주소 → 좌표 변환 성공:', lat, lng);
        
        // 지도 중심 이동
        const coords = new kakao.maps.LatLng(lat, lng);
        kakaoMap.setCenter(coords);
        kakaoMap.setLevel(3);

        // 마커 추가/이동
        addOrMoveMarker(coords);

        // 좌표 필드 업데이트
        updateCoordinateFields(lat, lng);
        
        // 처리 완료
        finishProcessing();
      } else {
        console.warn('⚠️ 좌표 정보를 찾을 수 없습니다.');
        showMapError('좌표 정보를 찾을 수 없습니다.');
        finishProcessing();
      }
    } else {
      console.warn('⚠️ 주소 검색 결과가 없습니다.');
      showMapError('주소를 찾을 수 없습니다.');
      finishProcessing();
    }
  })
  .catch(error => {
    // 🔧 요청이 취소된 경우는 오류로 처리하지 않음
    if (error.name === 'AbortError') {
      console.log('🔄 주소 검색 요청이 취소되었습니다.');
      return;
    }
    
    console.error('❌ 주소 → 좌표 변환 실패:', error);
    
    // 에러 메시지 분석
    if (error.message.includes('401')) {
      showMapError('API 키 인증 실패');
    } else if (error.message.includes('403')) {
      showMapError('API 사용 권한 없음');
    } else if (error.message.includes('429')) {
      showMapError('API 호출 한도 초과');
    } else {
      showMapError('주소 검색 중 오류 발생');
    }
    
    finishProcessing();
  });
}

/**
 * 기존 주소 검색 함수와 연동
 */
function onAddressSelected(data) {
  console.log('📍 주소 선택됨:', data);
  
  let fullAddress = '';
  if (data.userSelectedType === 'R') {
    fullAddress = data.roadAddress;
  } else {
    fullAddress = data.jibunAddress;
  }

  // 주소 필드 업데이트
  document.getElementById('address').value = fullAddress;

  // 지도 업데이트
  searchAddressAndUpdateMap(fullAddress);
}

/**
 * 지도 오류 표시 (개선된 버전)
 */
function showMapError(message) {
  const mapContainer = document.getElementById('kakao-map');
  if (mapContainer) {
    const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
    
    const errorMessages = {
      ko: message,
      en: 'Map loading failed. Please try again.',
      es: 'Error al cargar el mapa. Inténtalo de nuevo.'
    };

    // 🔧 오류 메시지를 토스트로 표시 (지도 컨테이너 대신)
    showToastNotification(
      currentLang === 'en' ? 'Map Error' : currentLang === 'es' ? 'Error del Mapa' : '지도 오류',
      errorMessages[currentLang] || errorMessages.ko,
      'error'
    );
    
    // 콘솔에도 출력
    console.error(`지도 오류: ${message}`);
  }
}

/**
 * 지도 초기화 재시도
 */
function retryMapInitialization() {
  console.log('🔄 지도 초기화 재시도...');
  
  // 지도 컨테이너 리셋
  const mapContainer = document.getElementById('kakao-map');
  if (mapContainer) {
    mapContainer.innerHTML = '';
  }

  // 기존 객체 정리
  kakaoMap = null;
  currentMarker = null;
  isMapInitialized = false;

  // 재초기화
  setTimeout(() => {
    initializeKakaoMap();
  }, 100);
}

/**
 * 지도 크기 조정 (반응형)
 */
function resizeMap() {
  if (kakaoMap) {
    kakaoMap.relayout();
  }
}

/**
 * 외부 함수들을 전역으로 노출
 */
window.initializeKakaoMap = initializeKakaoMap;
window.searchAddressAndUpdateMap = searchAddressAndUpdateMap;
window.onAddressSelected = onAddressSelected;
window.retryMapInitialization = retryMapInitialization;
window.resizeMap = resizeMap;

/**
 * 카카오맵 API 동적 로드
 */
function loadKakaoMapAPI() {
  return new Promise((resolve, reject) => {
    // 이미 로드된 경우
    if (typeof kakao !== 'undefined') {
      resolve();
      return;
    }

    // 카카오맵 API 스크립트 동적 생성
    const script = document.createElement('script');
    script.type = 'text/javascript';
    
    // Django 템플릿 변수 사용 (전역 변수에서 가져오기)
    const apiKey = window.KAKAO_JS_API_KEY || 'YOUR_API_KEY_HERE';
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services`;
    
    script.onload = () => {
      console.log('✅ 카카오맵 API 동적 로드 완료');
      resolve();
    };
    
    script.onerror = () => {
      console.error('❌ 카카오맵 API 로드 실패');
      reject(new Error('카카오맵 API 로드 실패'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * 페이지 로드 시 초기화
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 analyze-map.js 로드됨');
  
  // 카카오맵 API 로드 확인 후 초기화
  if (typeof kakao !== 'undefined') {
    initializeKakaoMap();
  } else {
    console.log('⏳ 카카오맵 API 동적 로드 시작...');
    
    // 동적 API 로드 시도
    loadKakaoMapAPI()
      .then(() => {
        initializeKakaoMap();
      })
      .catch((error) => {
        console.error('❌ 카카오맵 API 로드 실패:', error);
        showMapError('카카오맵 API를 로드할 수 없습니다.');
      });
  }
});

/**
 * 윈도우 리사이즈 이벤트
 */
window.addEventListener('resize', function() {
  if (isMapInitialized) {
    resizeMap();
  }
});

// ===========================================
// 🔍 디버깅 및 문제해결 도구
// ===========================================

/**
 * API 키 및 지도 상태 디버깅 함수
 */
window.debugKakaoMap = function() {
  console.log('🔍 ===== 카카오맵 디버깅 정보 =====');
  console.log('1. API 키 상태:');
  console.log('   - window.KAKAO_JS_API_KEY:', window.KAKAO_JS_API_KEY);
  console.log('   - window.KAKAO_REST_API_KEY:', window.KAKAO_REST_API_KEY);
  console.log('   - JS API 키 길이:', window.KAKAO_JS_API_KEY ? window.KAKAO_JS_API_KEY.length : 0);
  console.log('   - REST API 키 길이:', window.KAKAO_REST_API_KEY ? window.KAKAO_REST_API_KEY.length : 0);
  console.log('   - JS API 키 첫 10자:', window.KAKAO_JS_API_KEY ? window.KAKAO_JS_API_KEY.substring(0, 10) + '...' : 'undefined');
  console.log('   - REST API 키 첫 10자:', window.KAKAO_REST_API_KEY ? window.KAKAO_REST_API_KEY.substring(0, 10) + '...' : 'undefined');
  
  console.log('2. 카카오 객체 상태:');
  console.log('   - typeof kakao:', typeof kakao);
  console.log('   - kakao.maps:', typeof kakao !== 'undefined' ? typeof kakao.maps : 'undefined');
  console.log('   - kakao.maps.services:', typeof kakao !== 'undefined' && kakao.maps ? typeof kakao.maps.services : 'undefined');
  
  console.log('3. 지도 상태:');
  console.log('   - isMapInitialized:', isMapInitialized);
  console.log('   - kakaoMap:', kakaoMap ? '초기화됨' : 'null');
  console.log('   - kakaoGeocoder:', kakaoGeocoder ? '초기화됨' : 'null');
  
  console.log('4. 도메인 정보:');
  console.log('   - 현재 도메인:', window.location.hostname);
  console.log('   - 현재 프로토콜:', window.location.protocol);
  console.log('   - 현재 포트:', window.location.port);
  console.log('   - 전체 URL:', window.location.href);
  
  console.log('5. 로드된 스크립트 확인:');
  const scripts = Array.from(document.querySelectorAll('script[src*="kakao"]'));
  scripts.forEach((script, index) => {
    console.log(`   - 스크립트 ${index + 1}:`, script.src);
  });
  
  console.log('🔍 ===== 디버깅 정보 끝 =====');
  
  // 개발자 사이트 설정 확인 안내
  if (window.KAKAO_JS_API_KEY || window.KAKAO_REST_API_KEY) {
    console.log('');
    console.log('🔧 카카오 개발자 사이트 설정 확인사항:');
    console.log('1. 웹 플랫폼 도메인 등록 (JavaScript API):');
    console.log(`   - 현재 도메인: ${window.location.hostname}`);
    console.log(`   - 포트 포함: ${window.location.hostname}:${window.location.port}`);
    console.log('2. REST API 키 권한 확인:');
    console.log('   - 지도/로컬 > 주소 검색 API');
    console.log('   - 지도/로컬 > 좌표계 변환 API');
    console.log('3. 카카오 개발자 사이트: https://developers.kakao.com/console/app');
  }
  
  // 네트워크 요청 테스트
  console.log('');
  console.log('🌐 네트워크 연결 테스트 시작...');
  testKakaoMapConnection();
  
  // REST API 테스트
  console.log('');
  console.log('🔗 REST API 테스트 시작...');
  testKakaoRestAPI();
};

/**
 * 카카오맵 연결 테스트
 */
function testKakaoMapConnection() {
  const apiKey = window.KAKAO_JS_API_KEY;
  if (!apiKey) {
    console.error('❌ JavaScript API 키가 없어 연결 테스트를 실행할 수 없습니다.');
    return;
  }
  
  // 스크립트 로드 테스트
  const testScript = document.createElement('script');
  testScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services`;
  
  testScript.onload = () => {
    console.log('✅ 카카오맵 스크립트 로드 성공');
    
    // kakao 객체 확인
    if (typeof kakao !== 'undefined' && kakao.maps) {
      console.log('✅ kakao.maps 객체 접근 가능');
      
      // 간단한 지도 생성 테스트
      try {
        const testContainer = document.createElement('div');
        testContainer.style.width = '100px';
        testContainer.style.height = '100px';
        testContainer.style.display = 'none';
        document.body.appendChild(testContainer);
        
        const testMap = new kakao.maps.Map(testContainer, {
          center: new kakao.maps.LatLng(37.5665, 126.9780),
          level: 3
        });
        
        console.log('✅ 지도 객체 생성 성공');
        document.body.removeChild(testContainer);
        console.log('🎉 JavaScript API 테스트 통과!');
        
      } catch (mapError) {
        console.error('❌ 지도 생성 실패:', mapError);
        console.log('💡 이 오류는 API 키 권한이나 도메인 설정 문제일 수 있습니다.');
      }
    } else {
      console.error('❌ kakao.maps 객체에 접근할 수 없습니다.');
    }
  };
  
  testScript.onerror = (error) => {
    console.error('❌ 카카오맵 스크립트 로드 실패:', error);
    console.log('💡 네트워크 연결 또는 API 키 문제일 수 있습니다.');
  };
  
  // 기존 테스트 스크립트 제거
  const existingTestScript = document.querySelector('script[src*="test-kakao"]');
  if (existingTestScript) {
    existingTestScript.remove();
  }
  
  // 식별을 위한 속성 추가
  testScript.setAttribute('data-test', 'kakao-map-test');
  document.head.appendChild(testScript);
}

/**
 * 카카오 REST API 테스트
 */
function testKakaoRestAPI() {
  const restApiKey = window.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    console.error('❌ REST API 키가 없어 테스트를 실행할 수 없습니다.');
    return;
  }
  
  console.log('🧪 REST API 테스트 1: 좌표 → 주소 변환');
  
  // 서울시청 좌표로 테스트
  const testLng = 126.9780;
  const testLat = 37.5665;
  
  console.log(`🔍 테스트 좌표: (${testLat}, ${testLng})`);
  
  const coordUrl = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${testLng}&y=${testLat}`;
  
  fetch(coordUrl, {
    method: 'GET',
    headers: {
      'Authorization': `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log(`📡 좌표 → 주소 API 응답: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('✅ 좌표 → 주소 변환 성공:', data);
    
    if (data.documents && data.documents.length > 0) {
      const address = data.documents[0];
      console.log('🏢 변환된 주소:', address.address ? address.address.address_name : '주소 정보 없음');
      console.log('🛣️ 도로명 주소:', address.road_address ? address.road_address.address_name : '도로명 주소 없음');
      console.log('✅ 좌표 → 주소 변환 테스트 통과!');
      
      // 두 번째 테스트: 주소 → 좌표 변환
      console.log('');
      console.log('🧪 REST API 테스트 2: 주소 → 좌표 변환');
      testAddressSearch();
      
    } else {
      console.warn('⚠️ 응답은 성공했지만 주소 정보가 없습니다.');
    }
  })
  .catch(error => {
    console.error('❌ 좌표 → 주소 변환 테스트 실패:', error);
    handleRestAPIError(error);
  });
}

/**
 * 주소 검색 API 테스트
 */
function testAddressSearch() {
  const restApiKey = window.KAKAO_REST_API_KEY;
  const testAddress = '서울특별시 중구 세종대로 110';
  
  console.log(`🔍 테스트 주소: ${testAddress}`);
  
  const addressUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(testAddress)}`;
  
  fetch(addressUrl, {
    method: 'GET',
    headers: {
      'Authorization': `KakaoAK ${restApiKey}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log(`📡 주소 → 좌표 API 응답: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('✅ 주소 → 좌표 변환 성공:', data);
    
    if (data.documents && data.documents.length > 0) {
      const result = data.documents[0];
      let lat, lng;
      
      if (result.road_address) {
        lat = parseFloat(result.road_address.y);
        lng = parseFloat(result.road_address.x);
        console.log('📍 도로명주소 좌표:', lat, lng);
      }
      
      if (result.address) {
        lat = parseFloat(result.address.y);
        lng = parseFloat(result.address.x);
        console.log('📍 지번주소 좌표:', lat, lng);
      }
      
      console.log('✅ 주소 → 좌표 변환 테스트 통과!');
      console.log('🎉 모든 REST API 테스트 완료!');
      
    } else {
      console.warn('⚠️ 응답은 성공했지만 주소 정보가 없습니다.');
    }
  })
  .catch(error => {
    console.error('❌ 주소 → 좌표 변환 테스트 실패:', error);
    handleRestAPIError(error);
  });
}

/**
 * REST API 오류 처리
 */
function handleRestAPIError(error) {
  // 에러 타입별 안내
  if (error.message.includes('401')) {
    console.log('💡 401 오류: REST API 키가 올바르지 않거나 권한이 없습니다.');
    console.log('   - 카카오 개발자 사이트에서 REST API 키 확인');
    console.log('   - 지도/로컬 > 주소 검색 API 활성화 여부 확인');
    console.log('   - 지도/로컬 > 좌표계 변환 API 활성화 여부 확인');
  } else if (error.message.includes('403')) {
    console.log('💡 403 오류: API 사용 권한이 없습니다.');
    console.log('   - 카카오 개발자 사이트에서 API 권한 설정 확인');
  } else if (error.message.includes('429')) {
    console.log('💡 429 오류: API 호출 한도를 초과했습니다.');
    console.log('   - 잠시 후 다시 시도하세요.');
  } else {
    console.log('💡 네트워크 연결 또는 기타 오류일 수 있습니다.');
  }
}

console.log('✅ AI_Analyzer 카카오맵 모듈 로드 완료');
console.log('💡 디버깅: 개발자 도구에서 debugKakaoMap() 함수를 실행하세요.');

/**
 * 페이지 언로드 시 정리
 */
window.addEventListener('beforeunload', function() {
  // 진행 중인 요청 취소
  if (isProcessingClick) {
    cancelCurrentRequest();
  }
  
  // 디바운스 타이머 정리
  if (clickDebounceTimeout) {
    clearTimeout(clickDebounceTimeout);
  }
}); 