/**
 * 로딩 인디케이터 표시
 */
export function showLoading(message = '로딩 중...') {
  // 기존 로딩 인디케이터가 있다면 제거
  hideLoading();
  
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingIndicator';
  loadingDiv.className = 'loading-overlay';
  loadingDiv.innerHTML = `
    <div class="loading-content">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">${message}</p>
    </div>
  `;
  
  document.body.appendChild(loadingDiv);
}

/**
 * 로딩 인디케이터 숨김
 */
export function hideLoading() {
  const loadingDiv = document.getElementById('loadingIndicator');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

/**
 * 타이핑 인디케이터 표시
 */
export function showTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.style.display = 'block';
    indicator.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * 타이핑 인디케이터 숨김
 */
export function hideTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.style.display = 'none';
  }
}

/**
 * 메시지 표시 (토스트 스타일)
 */
export function showMessage(type, message, duration = 5000) {
  // 기존 메시지 제거
  const existingMessages = document.querySelectorAll('.message-toast');
  existingMessages.forEach(msg => msg.remove());
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-toast alert alert-${getAlertClass(type)} alert-dismissible fade show`;
  messageDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // 스타일 적용
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    min-width: 300px;
    max-width: 500px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(messageDiv);
  
  // 자동 제거
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, duration);
}

/**
 * 알림 클래스 반환
 */
function getAlertClass(type) {
  switch (type) {
    case 'success': return 'success';
    case 'error': return 'danger';
    case 'warning': return 'warning';
    case 'info': return 'info';
    default: return 'info';
  }
}

/**
 * 섹션 표시/숨김
 */
export function toggleSection(sectionId, show = true) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = show ? 'block' : 'none';
  }
}

/**
 * 요소 활성화/비활성화
 */
export function setElementEnabled(elementId, enabled = true) {
  const element = document.getElementById(elementId);
  if (element) {
    element.disabled = !enabled;
    if (enabled) {
      element.classList.remove('disabled');
    } else {
      element.classList.add('disabled');
    }
  }
}

/**
 * 폼 데이터 수집
 */
export function collectFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  
  const formData = new FormData(form);
  const data = {};
  
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  
  return data;
}

/**
 * 폼 초기화
 */
export function resetForm(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();
  }
}

/**
 * 요소 내용 업데이트
 */
export function updateElementContent(elementId, content) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = content;
  }
}

/**
 * 요소 텍스트 업데이트
 */
export function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

/**
 * 요소 속성 설정
 */
export function setElementAttribute(elementId, attribute, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

/**
 * 요소 클래스 토글
 */
export function toggleElementClass(elementId, className, force = null) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.toggle(className, force);
  }
}

/**
 * 스크롤을 요소로 이동
 */
export function scrollToElement(elementId, behavior = 'smooth') {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ behavior });
  }
}

/**
 * 요소가 뷰포트에 보이는지 확인
 */
export function isElementInViewport(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 디바운스 함수
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 스로틀 함수
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 로컬 스토리지 유틸리티
 */
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('스토리지 저장 실패:', error);
    }
  },
  
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('스토리지 읽기 실패:', error);
      return defaultValue;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('스토리지 삭제 실패:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('스토리지 초기화 실패:', error);
    }
  }
};
