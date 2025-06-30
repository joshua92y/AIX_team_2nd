/**
 * AI Analyzer 유틸리티 함수들
 * 다른 모든 모듈에서 사용하는 공통 함수들
 */

// HTML 이스케이프 함수
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 공시지가 포맷팅 함수 - 다국어 지원
function formatLandValue(value, lang = null) {
  // 언어가 지정되지 않은 경우 현재 언어 감지
  if (!lang) {
    lang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  }
  
  console.log(`💰 formatLandValue 호출: ${value}, 언어: ${lang}`);
  
  // 언어별 단위 정의
  const units = {
    ko: { hundred_million: '억', ten_thousand: '만', currency: '₩' },
    en: { hundred_million: ' hundred million', ten_thousand: ' ten thousand', currency: '₩' },
    es: { hundred_million: ' cien millones', ten_thousand: ' diez mil', currency: '₩' }
  };
  
  const unit = units[lang] || units.ko;
  
  if (value >= 100000000) {
    const formatted = `${unit.currency}${(value / 100000000).toFixed(1)}${unit.hundred_million}`;
    console.log(`✅ 억 단위 포맷팅: ${value} -> ${formatted}`);
    return formatted;
  } else if (value >= 10000) {
    const formatted = `${unit.currency}${(value / 10000).toFixed(0)}${unit.ten_thousand}`;
    console.log(`✅ 만 단위 포맷팅: ${value} -> ${formatted}`);
    return formatted;
  } else {
    const formatted = `${unit.currency}${value.toLocaleString()}`;
    console.log(`✅ 기본 단위 포맷팅: ${value} -> ${formatted}`);
    return formatted;
  }
}

// 생존 확률에 따른 프로그레스 바 클래스 반환
function getSurvivalBarClass(survivalRate) {
  const rate = parseInt(survivalRate);
  if (rate >= 80) return 'bg-success';
  if (rate >= 60) return 'bg-warning';
  return 'bg-danger';
}

// CSRF 토큰 가져오기 함수
function getCsrfToken() {
  // 여러 방법으로 CSRF 토큰 시도
  let token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
  
  if (!token) {
    // 쿠키에서 시도
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') {
        token = value;
        break;
      }
    }
  }
  
  if (!token) {
    // Django 템플릿 변수에서 시도 (템플릿에서 렌더링됨)
    token = CSRF_TOKEN; // 전역 변수로 설정된 CSRF 토큰 사용
  }
  
  console.log('CSRF 토큰:', token ? '존재함' : '없음');
  return token || '';
}

// 성공 메시지 표시 함수
function showSuccessMessage(message) {
  // 기존 메시지가 있으면 제거
  const existingMessage = document.getElementById('successMessage');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // 성공 메시지 생성
  const messageDiv = document.createElement('div');
  messageDiv.id = 'successMessage';
  messageDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
  messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  messageDiv.innerHTML = `
    <i class="bi bi-check-circle me-2"></i>${message}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
  `;
  
  document.body.appendChild(messageDiv);
  
  // 3초 후 자동 제거
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 3000);
}

// 업종명 가져오기 함수
function getBusinessTypeName(businessTypeId) {
  const businessTypes = {
    0: "감성주점", 1: "경양식", 2: "관광호텔", 3: "극장", 4: "기타",
    5: "기타 휴게음식점", 6: "김밥(도시락)", 7: "까페", 8: "냉면집", 9: "다방",
    10: "떡카페", 11: "라이브카페", 12: "백화점", 13: "복어취급", 14: "분식",
    15: "뷔페식", 16: "식육(숯불구이)", 17: "아이스크림", 18: "외국음식전문점(인도, 태국 등)",
    19: "유원지", 20: "일반조리판매", 21: "일식", 22: "전통찻집", 23: "정종/대포집/소주방",
    24: "중국식", 25: "철도역구내", 26: "출장조리", 27: "커피숍", 28: "키즈카페",
    29: "탕류(보신용)", 30: "통닭(치킨)", 31: "패밀리레스토랑", 32: "패스트푸드", 33: "편의점",
    34: "푸드트럭", 35: "한식", 36: "호프/통닭", 37: "횟집"
  };
  return businessTypes[businessTypeId] || "알 수 없는 업종";
}

// 추천 질문 입력 (메인 챗봇)
function fillExampleQuestion(question) {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = question;
    chatInput.focus();
  }
}

// PIP 예시 질문 입력 함수
function fillPIPExampleQuestion(question) {
  const pipChatInput = document.getElementById('pipChatInput');
  if (pipChatInput) {
    pipChatInput.value = question;
    pipChatInput.focus();
  }
} 