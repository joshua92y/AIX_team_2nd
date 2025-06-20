/**
 * 분석 폼 검증
 */
export function validateAnalysisForm(data) {
  const errors = [];

  // 업종 검증
  if (!data.business_type || data.business_type.trim() === '') {
    errors.push('업종을 선택해주세요.');
  }

  // 주소 검증
  if (!data.address || data.address.trim() === '') {
    errors.push('주소를 입력해주세요.');
  }

  // 면적 검증
  const area = parseInt(data.area);
  if (!area || area <= 0 || area > 1000) {
    errors.push('면적은 1~1000㎡ 사이의 값이어야 합니다.');
  }

  // 주류 판매 여부 검증
  if (data.is_liquor === undefined || data.is_liquor === '') {
    errors.push('주류 판매 여부를 선택해주세요.');
  }

  // 투자 금액 검증 (선택사항)
  if (data.investment_amount) {
    const investment = parseInt(data.investment_amount);
    if (investment < 0) {
      errors.push('투자 금액은 0 이상이어야 합니다.');
    }
  }

  // 예상 매출 검증 (선택사항)
  if (data.expected_revenue) {
    const revenue = parseInt(data.expected_revenue);
    if (revenue < 0) {
      errors.push('예상 매출은 0 이상이어야 합니다.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    message: errors.join(' ')
  };
}

/**
 * 이메일 검증
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 검증
 */
export function validatePhone(phone) {
  const phoneRegex = /^[0-9-+\s()]+$/;
  return phoneRegex.test(phone) && phone.replace(/[^0-9]/g, '').length >= 10;
}

/**
 * 비밀번호 검증
 */
export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다.');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('비밀번호는 대문자를 포함해야 합니다.');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('비밀번호는 소문자를 포함해야 합니다.');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('비밀번호는 숫자를 포함해야 합니다.');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * 주소 검증
 */
export function validateAddress(address) {
  if (!address || address.trim() === '') {
    return false;
  }
  
  // 한국 주소 패턴 (시/도, 구/군 포함)
  const addressPattern = /^[가-힣\s]+(시|도|구|군|동|읍|면|리|번지)/;
  return addressPattern.test(address);
}

/**
 * 숫자 범위 검증
 */
export function validateNumberRange(value, min, max) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

/**
 * 필수 필드 검증
 */
export function validateRequired(value, fieldName) {
  if (!value || value.toString().trim() === '') {
    return {
      isValid: false,
      message: `${fieldName}은(는) 필수 입력 항목입니다.`
    };
  }
  return { isValid: true };
}

/**
 * 문자열 길이 검증
 */
export function validateStringLength(value, minLength, maxLength, fieldName) {
  const length = value ? value.toString().length : 0;
  
  if (minLength && length < minLength) {
    return {
      isValid: false,
      message: `${fieldName}은(는) 최소 ${minLength}자 이상이어야 합니다.`
    };
  }
  
  if (maxLength && length > maxLength) {
    return {
      isValid: false,
      message: `${fieldName}은(는) 최대 ${maxLength}자까지 입력 가능합니다.`
    };
  }
  
  return { isValid: true };
}

/**
 * 날짜 검증
 */
export function validateDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * 미래 날짜 검증
 */
export function validateFutureDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return date > now;
}

/**
 * 과거 날짜 검증
 */
export function validatePastDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  return date < now;
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file, maxSizeMB) {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 파일 타입 검증
 */
export function validateFileType(file, allowedTypes) {
  return allowedTypes.includes(file.type);
}

/**
 * 복합 검증 (여러 검증 규칙 적용)
 */
export function validateMultiple(value, validators) {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

/**
 * 실시간 폼 검증
 */
export function setupRealTimeValidation(formId, validationRules) {
  const form = document.getElementById(formId);
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    const fieldName = input.name;
    const rules = validationRules[fieldName];
    
    if (rules) {
      input.addEventListener('blur', () => {
        validateField(input, rules);
      });
      
      input.addEventListener('input', debounce(() => {
        validateField(input, rules);
      }, 300));
    }
  });
}

/**
 * 필드 검증
 */
function validateField(input, rules) {
  const value = input.value;
  const fieldName = input.getAttribute('placeholder') || input.name;
  
  // 기존 에러 메시지 제거
  removeFieldError(input);
  
  for (const rule of rules) {
    let result;
    
    switch (rule.type) {
      case 'required':
        result = validateRequired(value, fieldName);
        break;
      case 'email':
        result = { isValid: validateEmail(value), message: '올바른 이메일 형식이 아닙니다.' };
        break;
      case 'phone':
        result = { isValid: validatePhone(value), message: '올바른 전화번호 형식이 아닙니다.' };
        break;
      case 'minLength':
        result = validateStringLength(value, rule.value, null, fieldName);
        break;
      case 'maxLength':
        result = validateStringLength(value, null, rule.value, fieldName);
        break;
      case 'range':
        result = { 
          isValid: validateNumberRange(value, rule.min, rule.max), 
          message: `${fieldName}은(는) ${rule.min}~${rule.max} 사이의 값이어야 합니다.`
        };
        break;
      default:
        continue;
    }
    
    if (!result.isValid) {
      showFieldError(input, result.message);
      break;
    }
  }
}

/**
 * 필드 에러 표시
 */
function showFieldError(input, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error text-danger small mt-1';
  errorDiv.textContent = message;
  
  input.classList.add('is-invalid');
  input.parentNode.appendChild(errorDiv);
}

/**
 * 필드 에러 제거
 */
function removeFieldError(input) {
  const errorDiv = input.parentNode.querySelector('.field-error');
  if (errorDiv) {
    errorDiv.remove();
  }
  input.classList.remove('is-invalid');
}

/**
 * 디바운스 함수
 */
function debounce(func, wait) {
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
