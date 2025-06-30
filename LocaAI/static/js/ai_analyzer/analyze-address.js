/**
 * AI Analyzer 주소 검색 모듈
 * 다음 우편번호 API 연동 및 좌표 변환 기능
 */

// Daum 우편번호 서비스 PIP 팝업 열기
function openAddressSearch() {
  // 현재 언어 확인
  const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ko';
  const useEnglish = currentLang === 'en' || currentLang === 'es';
  
  new daum.Postcode({
    // 언어 설정: 영어/스페인어일 때 영문 주소 우선 제공
    language: useEnglish ? 'en' : 'ko',
    oncomplete: function(data) {
      // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드
      
      // 디버깅: 전달받은 데이터 구조 확인
      console.log('🔍 [DEBUG] Daum API 데이터:', data);
      console.log('🔍 [DEBUG] sido:', data.sido);
      console.log('🔍 [DEBUG] sigungu:', data.sigungu);
      console.log('🔍 [DEBUG] roadAddress:', data.roadAddress);
      console.log('🔍 [DEBUG] jibunAddress:', data.jibunAddress);
      
      // 서울특별시 지역 검증
      const isSeoulAddress = isSeoulArea(data);
      console.log('🔍 [DEBUG] 서울 지역 검증 결과:', isSeoulAddress);
      
      if (!isSeoulAddress) {
        // 서울 이외 지역 선택 시 경고 메시지 표시
        console.log('❌ [DEBUG] 서울 이외 지역 차단됨');
        showNonSeoulWarning(data);
        return; // 주소 설정을 차단
      }
      
      console.log('✅ [DEBUG] 서울 지역 확인됨, 주소 설정 진행');
      
      // 기본 주소 정보
      let fullAddr = '';
      let extraAddr = '';
      
      // 언어에 따라 주소 형식 결정
      if (useEnglish) {
        // 영어/스페인어: 영문 주소 사용
        if (data.userSelectedType === 'R') { // 도로명 주소
          fullAddr = data.roadAddressEnglish || data.roadAddress;
        } else { // 지번 주소
          fullAddr = data.jibunAddressEnglish || data.jibunAddress;
        }
        
        // 영문 건물명이 있고, 공동주택일 경우 추가
        if(data.buildingNameEnglish && data.apartment === 'Y'){
          extraAddr += (extraAddr !== '' ? ', ' + data.buildingNameEnglish : data.buildingNameEnglish);
        } else if(data.buildingName !== '' && data.apartment === 'Y'){
          extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
        }
      } else {
        // 한국어: 기본 한글 주소 사용
        if (data.userSelectedType === 'R') { // 도로명 주소
          fullAddr = data.roadAddress;
        } else { // 지번 주소
          fullAddr = data.jibunAddress;
        }
        
        // 건물명이 있고, 공동주택일 경우 추가한다.
        if(data.buildingName !== '' && data.apartment === 'Y'){
          extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
        }
      }
      
      // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
      if(extraAddr !== ''){
        extraAddr = ' (' + extraAddr + ')';
      }
      
      // 최종 주소
      const finalAddress = fullAddr + extraAddr;
      
      // 주소를 입력하고 팝업 즉시 닫기 (UX 개선)
      document.getElementById('address').value = finalAddress;
      closeAddressSearch();
      
      // 좌표 변환 API 호출 (원본 한글 주소 사용)
      const addressForCoords = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
      convertAddressToCoordinates(addressForCoords);
    },
    onclose: function(state) {
      // 주소 검색 창이 닫힐 때 실행되는 콜백
    },
    // PIP 팝업 설정 (페이지 내 팝업)
    width: '100%',
    height: '100%',
    theme: {
      searchBgColor: "#0d6efd", // 검색창 배경색
      queryTextColor: "#FFFFFF" // 검색창 글자색  
    }
  }).embed(document.getElementById('addressSearchContainer'));
  
  // PIP 팝업 컨테이너 표시
  const addressModal = document.getElementById('addressSearchModal');
  addressModal.style.display = 'block';
  addressModal.style.pointerEvents = 'auto';
  
  // 닫기 오버레이 활성화
  const closeOverlay = addressModal.querySelector('div[onclick="closeAddressSearch()"]');
  if (closeOverlay) {
    closeOverlay.style.display = 'block';
    closeOverlay.style.pointerEvents = 'auto';
  }
  
  document.body.style.overflow = 'hidden'; // 스크롤 방지
}

// 주소 검색 팝업 닫기 (Daum API와 안전하게 연동)
function closeAddressSearch() {
  try {
    const addressModal = document.getElementById('addressSearchModal');
    if (addressModal) {
      addressModal.style.display = 'none';
      addressModal.style.pointerEvents = 'none';
      
      // 닫기 오버레이 비활성화
      const closeOverlay = addressModal.querySelector('div[onclick="closeAddressSearch()"]');
      if (closeOverlay) {
        closeOverlay.style.display = 'none';
        closeOverlay.style.pointerEvents = 'none';
      }
    }
    
    // 스크롤 복원
    document.body.style.overflow = 'auto';
    
    // Daum API 컨테이너는 건드리지 않음 (API가 자체적으로 관리)
    // 다음 사용을 위해 컨테이너만 숨김 처리
    const container = document.getElementById('addressSearchContainer');
    if (container) {
      // innerHTML 초기화는 하지 않고, 단순히 숨김 처리만
      // Daum API가 자체적으로 DOM을 정리하도록 함
      container.style.display = 'none';
      
      // 다음 사용을 위해 약간 지연 후 다시 표시 상태로 복원
      setTimeout(() => {
        if (container) {
          container.style.display = 'block';
        }
      }, 100);
    }
  } catch (error) {
    console.warn('주소 검색 팝업 닫기 중 오류 (무시됨):', error.message);
    // 오류가 발생해도 기본 동작은 수행
    document.body.style.overflow = 'auto';
  }
}

// 주소를 좌표로 변환하는 함수
function convertAddressToCoordinates(address) {
  const csrfToken = getCsrfToken(); // utils.js의 함수 사용
  
  $.ajax({
    url: '/ai_analyzer/get-coordinates/',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      address: address
    }),
    headers: {
      'X-CSRFToken': csrfToken
    },
    success: function(response) {
      if (response.success) {
        // 좌표 설정 성공
        document.getElementById('latitude').value = response.latitude.toFixed(6);
        document.getElementById('longitude').value = response.longitude.toFixed(6);
        document.getElementById('x_coord').value = response.x_coord.toFixed(2);
        document.getElementById('y_coord').value = response.y_coord.toFixed(2);
        
        // 성공 메시지를 다국어로 표시
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ko';
        const texts = typeof LANGUAGE_TEXTS !== 'undefined' ? LANGUAGE_TEXTS[currentLang] : null;
        const successMsg = texts ? texts.addressAndCoordinatesSet : "주소와 좌표가 설정되었습니다.";
        showSuccessMessage(successMsg); // utils.js의 함수 사용
      } else {
        console.error("좌표 변환 실패:", response.error);
        const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ko';
        const texts = typeof LANGUAGE_TEXTS !== 'undefined' ? LANGUAGE_TEXTS[currentLang] : null;
        const errorMsg = texts ? texts.coordinateConversionFailed : "좌표 변환에 실패했습니다";
        alert(errorMsg + ": " + response.error);
      }
    },
    error: function(xhr, status, error) {
      console.error("좌표 변환 요청 실패:", error);
      console.error("응답:", xhr.responseText);
      const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ko';
      const texts = typeof LANGUAGE_TEXTS !== 'undefined' ? LANGUAGE_TEXTS[currentLang] : null;
      const errorMsg = texts ? texts.coordinateRequestFailed : "좌표 변환 요청에 실패했습니다.";
      alert(errorMsg);
    }
  });
}

// 주소 검색 관련 초기화 (DOM 로드 시)
function initializeAddressSearch() {
  // 주소 검색 컨테이너 클릭 시 이벤트 전파 방지
  const addressContainer = document.getElementById('addressSearchContainer');
  if (addressContainer) {
    addressContainer.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 버블링 방지
    });
  }
  
  // 모든 모달 초기화 확인
  const addressModal = document.getElementById('addressSearchModal');
  if (addressModal) {
    addressModal.style.display = 'none';
    addressModal.style.pointerEvents = 'none';
  }
}

// 서울특별시 지역 검증 함수
function isSeoulArea(data) {
  // 시/도 정보 확인 (sido)
  const sido = data.sido || '';
  const sigungu = data.sigungu || '';
  
  // 도로명 주소와 지번 주소에서 서울 확인
  const roadAddress = data.roadAddress || '';
  const jibunAddress = data.jibunAddress || '';
  
  console.log('🔍 [isSeoulArea] 검증 시작');
  console.log('  - sido:', sido);
  console.log('  - sigungu:', sigungu);
  console.log('  - roadAddress:', roadAddress);
  console.log('  - jibunAddress:', jibunAddress);
  
  // 서울특별시 키워드 검증
  const seoulKeywords = ['서울특별시', '서울시', '서울'];
  
  // 1. sido 필드 검증
  const sidoMatch = sido && seoulKeywords.some(keyword => sido.includes(keyword));
  console.log('  - sido 검증:', sidoMatch, sido);
  if (sidoMatch) {
    console.log('✅ [isSeoulArea] sido로 서울 확인됨');
    return true;
  }
  
  // 2. 주소 문자열에서 서울 검증
  const addressMatch = seoulKeywords.some(keyword => 
    roadAddress.includes(keyword) || jibunAddress.includes(keyword)
  );
  console.log('  - 주소 문자열 검증:', addressMatch);
  if (addressMatch) {
    console.log('✅ [isSeoulArea] 주소 문자열로 서울 확인됨');
    return true;
  }
  
  // 3. 서울 구 이름으로 검증 (보조 검증)
  const seoulDistricts = [
    '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구',
    '성북구', '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구',
    '양천구', '강서구', '구로구', '금천구', '영등포구', '동작구', '관악구',
    '서초구', '강남구', '송파구', '강동구'
  ];
  
  const matchedDistrict = seoulDistricts.find(district => 
    roadAddress.includes(district) || jibunAddress.includes(district) || sigungu.includes(district)
  );
  
  console.log('  - 구 이름 검증:', !!matchedDistrict, matchedDistrict || '없음');
  
  if (matchedDistrict) {
    console.log('✅ [isSeoulArea] 구 이름으로 서울 확인됨:', matchedDistrict);
    return true;
  }
  
  console.log('❌ [isSeoulArea] 서울 지역 아님');
  return false;
}

// 서울 이외 지역 선택 시 경고 메시지 표시
function showNonSeoulWarning(data) {
  const currentLang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'ko';
  const texts = typeof LANGUAGE_TEXTS !== 'undefined' ? LANGUAGE_TEXTS[currentLang] : null;
  
  // 선택된 주소 정보
  const selectedAddress = data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
  const sido = data.sido || '';
  
  // 다국어 메시지
  let title, message, confirmText;
  
  if (currentLang === 'en') {
    title = '❌ Service Area Restriction';
    message = `Sorry, this service is only available for Seoul Metropolitan City.\n\nSelected area: ${sido}\nAddress: ${selectedAddress}\n\nPlease search for an address within Seoul.`;
    confirmText = 'OK';
  } else if (currentLang === 'es') {
    title = '❌ Restricción del Área de Servicio';
    message = `Lo sentimos, este servicio solo está disponible para la Ciudad Metropolitana de Seúl.\n\nÁrea seleccionada: ${sido}\nDirección: ${selectedAddress}\n\nPor favor busque una dirección dentro de Seúl.`;
    confirmText = 'OK';
  } else {
    title = '❌ 서비스 지역 제한';
    message = `죄송합니다. 이 서비스는 서울특별시 지역만 이용 가능합니다.\n\n선택하신 지역: ${sido}\n주소: ${selectedAddress}\n\n서울특별시 내 주소를 검색해 주세요.`;
    confirmText = '확인';
  }
  
  // 경고창을 닫은 후 다시 주소 검색 모달을 여는 콜백 함수
  const reopenAddressSearch = () => {
    console.log('🔄 [DEBUG] 경고창 닫음, 주소 검색 모달 재오픈');
    // 잠시 후 다시 주소 검색 모달 열기
    setTimeout(() => {
      openAddressSearch();
    }, 100);
  };
  
  // 커스텀 경고 창 표시
  showCustomAlert(title, message, confirmText, reopenAddressSearch);
}

// 커스텀 알림 창 표시 함수
function showCustomAlert(title, message, confirmText, onCloseCallback = null) {
  // 기존 알림이 있으면 제거
  const existingAlert = document.getElementById('customAddressAlert');
  if (existingAlert) {
    existingAlert.remove();
  }
  
  // 알림 창 HTML 생성
  const alertHtml = `
    <div id="customAddressAlert" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.7);
      z-index: 20000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        text-align: center;
        position: relative;
      ">
        <div style="
          font-size: 48px;
          margin-bottom: 16px;
        ">❌</div>
        
        <h3 style="
          margin: 0 0 16px 0;
          color: #dc3545;
          font-size: 18px;
          font-weight: 600;
        ">${title}</h3>
        
        <div style="
          color: #6c757d;
          line-height: 1.5;
          margin-bottom: 24px;
          white-space: pre-line;
          font-size: 14px;
        ">${message}</div>
        
        <button onclick="closeCustomAlert()" style="
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#c82333'" 
           onmouseout="this.style.backgroundColor='#dc3545'">
          ${confirmText}
        </button>
      </div>
    </div>
  `;
  
  // 알림 창을 body에 추가
  document.body.insertAdjacentHTML('beforeend', alertHtml);
  
  // 콜백 함수를 전역으로 저장 (closeCustomAlert에서 사용)
  window.customAlertCallback = onCloseCallback;
  
  // 배경 클릭 시 닫기
  document.getElementById('customAddressAlert').addEventListener('click', function(e) {
    if (e.target === this) {
      closeCustomAlert();
    }
  });
}

// 커스텀 알림 창 닫기 함수
function closeCustomAlert() {
  const alertElement = document.getElementById('customAddressAlert');
  if (alertElement) {
    alertElement.remove();
  }
  console.log('사용자가 서울 지역 제한 안내를 확인했습니다.');
  
  // 콜백 함수가 있으면 실행
  if (window.customAlertCallback && typeof window.customAlertCallback === 'function') {
    console.log('🔄 [DEBUG] 콜백 함수 실행');
    window.customAlertCallback();
    window.customAlertCallback = null; // 콜백 함수 초기화
  }
}

// 전역 함수로 노출 (HTML에서 접근 가능하도록)
window.openAddressSearch = openAddressSearch;
window.closeAddressSearch = closeAddressSearch;
window.closeCustomAlert = closeCustomAlert;

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', initializeAddressSearch); 