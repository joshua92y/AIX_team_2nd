// ==================================================
// analyze-i18n.js
// 다국어 지원 기능
// ==================================================

// 현재 언어 상태
let currentLanguage = 'ko';

// 언어별 텍스트 정의
const LANGUAGE_TEXTS = {
  ko: {
    languageName: '한국어',
    // 추가 텍스트들...
  },
  en: {
    languageName: 'English',
    // 추가 텍스트들...
  },
  es: {
    languageName: 'Español',
    // 추가 텍스트들...
  }
};

// 언어 변경 함수
function changeLanguage(language) {
  if (!LANGUAGE_TEXTS[language]) {
    console.warn('지원하지 않는 언어:', language);
    return;
  }
  
  currentLanguage = language;
  
  // HTML lang 속성 변경
  document.documentElement.lang = language;
  
  // 모든 다국어 요소 숨기기
  document.querySelectorAll('[data-lang]').forEach(element => {
    element.style.display = 'none';
  });
  
  // 선택된 언어 요소만 표시
  const langCode = language.toUpperCase();
  document.querySelectorAll(`[data-lang="${langCode}"]`).forEach(element => {
    element.style.display = '';
  });
  
  // 언어 선택기 텍스트 업데이트
  const currentLanguageSpan = document.getElementById('currentLanguage');
  if (currentLanguageSpan) {
    currentLanguageSpan.textContent = LANGUAGE_TEXTS[language].languageName;
  }
  
  // 로컬 스토리지에 언어 설정 저장
  localStorage.setItem('preferred_language', language);
  
  console.log('언어가 변경되었습니다:', language);
}

// 페이지 로드 시 저장된 언어 설정 적용
function initializeLanguage() {
  const savedLanguage = localStorage.getItem('preferred_language') || 'ko';
  changeLanguage(savedLanguage);
}

// 언어 선택기 이벤트 리스너 등록
function initializeLanguageSelector() {
  document.querySelectorAll('[data-language]').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const language = this.getAttribute('data-language');
      changeLanguage(language);
    });
  });
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
  initializeLanguage();
  initializeLanguageSelector();
}); 