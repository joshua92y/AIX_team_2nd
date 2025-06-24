/**
 * AI Analyzer 주소 검색 모듈
 * 다음 우편번호 API 연동 및 좌표 변환 기능
 */

// Daum 우편번호 서비스 PIP 팝업 열기
function openAddressSearch() {
  console.log('🔍 [DEBUG] openAddressSearch 함수 호출됨');
  new daum.Postcode({
    oncomplete: function(data) {
      // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드
      
      // 기본 주소 정보
      let fullAddr = '';
      let extraAddr = '';
      
      // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
      if (data.userSelectedType === 'R') { // 도로명 주소
        fullAddr = data.roadAddress;
      } else { // 지번 주소
        fullAddr = data.jibunAddress;
      }
      
      // 건물명이 있고, 공동주택일 경우 추가한다.
      if(data.buildingName !== '' && data.apartment === 'Y'){
        extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
      }
      // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
      if(extraAddr !== ''){
        extraAddr = ' (' + extraAddr + ')';
      }
      
      // 최종 주소
      const finalAddress = fullAddr + extraAddr;
      
      // 서울특별시 주소 검증 (팝업에서 선택한 주소)
      console.log('🔍 [DEBUG] 선택된 주소:', finalAddress);
      if (!validateSeoulAddress(finalAddress)) {
        console.log('⚠️ [DEBUG] 서울특별시 이외 주소 선택됨, 경고 표시');
        alert('⚠️ 서비스 지역 제한\n\n현재 서비스는 서울특별시 지역만 지원합니다.\n서울특별시 내의 주소를 선택해주세요.');
        return; // 팝업을 닫지 않고 다시 선택할 수 있도록 함
      }
      console.log('✅ [DEBUG] 서울특별시 주소 검증 통과');
      
      // 주소를 입력하고 팝업 즉시 닫기 (UX 개선) - 다국어 필드 모두 업데이트
      const addressInputs = ['address', 'addressEng', 'addressEsp'];
      addressInputs.forEach(function(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = finalAddress;
        }
      });
      closeAddressSearch();
      
      // 좌표 변환 API 호출
      convertAddressToCoordinates(fullAddr);
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

// 서울특별시 주소인지 검증하는 함수
function validateSeoulAddress(address) {
  // 서울특별시 관련 키워드들
  const seoulKeywords = [
    '서울특별시', '서울시', '서울',
    '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구',
    '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구',
    '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'
  ];
  
  // 주소에 서울 관련 키워드가 포함되어 있는지 확인
  return seoulKeywords.some(keyword => address.includes(keyword));
}

// 주소를 좌표로 변환하는 함수
function convertAddressToCoordinates(address) {
  // 서울특별시 주소 검증
  if (!validateSeoulAddress(address)) {
    alert('⚠️ 서비스 지역 제한\n\n현재 서비스는 서울특별시 지역만 지원합니다.\n서울특별시 내의 주소를 입력해주세요.');
    // 주소 필드 초기화 (다국어 필드 모두)
    const addressInputs = ['address', 'addressEng', 'addressEsp'];
    addressInputs.forEach(function(inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        input.value = '';
      }
    });
    return;
  }
  
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
        
        // 성공 메시지를 더 부드럽게 표시
        showSuccessMessage("주소와 좌표가 설정되었습니다."); // utils.js의 함수 사용
      } else {
        console.error("좌표 변환 실패:", response.error);
        alert("좌표 변환에 실패했습니다: " + response.error);
      }
    },
    error: function(xhr, status, error) {
      console.error("좌표 변환 요청 실패:", error);
      console.error("응답:", xhr.responseText);
      alert("좌표 변환 요청에 실패했습니다.");
    }
  });
}

// 주소 검색 관련 초기화 (DOM 로드 시)
function initializeAddressSearch() {
  console.log('🔍 [DEBUG] initializeAddressSearch 함수 실행됨');
  
  // 주소 검색 컨테이너 클릭 시 이벤트 전파 방지
  const addressContainer = document.getElementById('addressSearchContainer');
  if (addressContainer) {
    console.log('🔍 [DEBUG] addressSearchContainer 찾음');
    addressContainer.addEventListener('click', function(e) {
      e.stopPropagation(); // 이벤트 버블링 방지
    });
  } else {
    console.warn('⚠️ [DEBUG] addressSearchContainer 찾을 수 없음');
  }
  
  // 모든 모달 초기화 확인
  const addressModal = document.getElementById('addressSearchModal');
  if (addressModal) {
    console.log('🔍 [DEBUG] addressSearchModal 찾음');
    addressModal.style.display = 'none';
    addressModal.style.pointerEvents = 'none';
  } else {
    console.warn('⚠️ [DEBUG] addressSearchModal 찾을 수 없음');
  }
  
  // 주소 입력 필드 클릭 시 주소 검색 모달 열기 (다국어 지원)
  const addressInputs = ['address', 'addressEng', 'addressEsp'];
  
  addressInputs.forEach(function(inputId) {
    const addressInput = document.getElementById(inputId);
    if (addressInput) {
      console.log(`🔍 [DEBUG] ${inputId} 입력 필드 찾음, 이벤트 리스너 추가`);
      addressInput.addEventListener('click', function(e) {
        console.log(`🔍 [DEBUG] ${inputId} 클릭됨, 주소 검색 모달 열기`);
        e.preventDefault();
        openAddressSearch();
      });
      
      // 포커스 시에도 모달 열기
      addressInput.addEventListener('focus', function(e) {
        console.log(`🔍 [DEBUG] ${inputId} 포커스됨, 주소 검색 모달 열기`);
        e.preventDefault();
        this.blur(); // 포커스 해제
        openAddressSearch();
      });
    } else {
      console.warn(`⚠️ [DEBUG] ${inputId} 입력 필드 찾을 수 없음`);
    }
  });
}

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 [DEBUG] analyze-address.js 로드됨');
  initializeAddressSearch();
}); 