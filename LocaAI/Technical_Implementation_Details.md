# 기술적 구현 세부사항

## 📋 개요

AI_Analyzer PIP 기능 개발의 기술적 구현 세부사항을 기록한 문서입니다.

---

## 🏗️ 아키텍처 설계

### 1. PIP 모달 컴포넌트 구조

```
chatbotPIPModal
├── Header (AI 브랜딩 + 컨트롤 버튼)
├── Main Content (3단 레이아웃)
│   ├── Chat History Sidebar (280px)
│   ├── Chat Messages Area (중앙)
│   └── Analysis Summary Sidebar (350px)
└── Event Listeners
```

### 2. 데이터 플로우

```
사용자 입력 → WebSocket 전송 → AI 처리 → 스트리밍 응답 → 양방향 UI 업데이트 → 히스토리 갱신
```

---

## 💻 핵심 JavaScript 구현

### 1. PIP 모달 동적 생성

```javascript
function openChatbotPIP() {
  // 기존 모달 제거 (메모리 누수 방지)
  const existingModal = document.getElementById('chatbotPIPModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 새로운 PIP 모달 생성
  const pipModal = document.createElement('div');
  pipModal.id = 'chatbotPIPModal';
  pipModal.innerHTML = createPIPModalHTML();
  
  // DOM에 추가 및 초기화
  document.body.appendChild(pipModal);
  initializePIPModal();
}
```

### 2. 채팅 히스토리 관리

```javascript
function updatePIPChatHistory() {
  // 메시지 파싱 및 세션 그룹화
  const sessions = parseMessagesIntoSessions();
  
  // 히스토리 HTML 생성
  const historyHTML = sessions.map((session, index) => 
    createHistorySessionHTML(session, index + 1)
  ).join('');
  
  document.getElementById('pipChatHistory').innerHTML = historyHTML;
}

function parseMessagesIntoSessions() {
  const messages = document.querySelectorAll('#chatMessages .d-flex.mb-3');
  const sessions = [];
  let currentSession = [];

  messages.forEach((message) => {
    const isUser = message.querySelector('.ms-auto') !== null;
    
    if (isUser && currentSession.length > 0) {
      sessions.push([...currentSession]);
      currentSession = [];
    }
    
    currentSession.push({
      type: isUser ? 'user' : 'ai',
      text: extractMessageText(message),
      element: message
    });
  });

  if (currentSession.length > 0) {
    sessions.push(currentSession);
  }

  return sessions;
}
```

### 3. 실시간 메시지 동기화

```javascript
// WebSocket 메시지 처리
chatSocket.onmessage = function(e) {
  const data = JSON.parse(e.data);
  
  if (data.chunk) {
    // 원본과 PIP 동시 업데이트
    appendToCurrentBotMessage(data.chunk);
    appendToPIPBotMessage(data.chunk);
  } else if (data.done) {
    finalizeBotMessage();
    finalizePIPBotMessage();
    // 히스토리 업데이트
    setTimeout(() => updatePIPChatHistory(), 100);
  }
};

// PIP 메시지 전송
function sendPIPMessage() {
  const message = document.getElementById('pipChatInput').value.trim();
  if (!message || !chatSocket) return;
  
  // 양방향 메시지 추가
  addPIPUserMessage(message);
  addUserMessage(message);
  
  // WebSocket 전송
  chatSocket.send(JSON.stringify({
    user_id: '{{ user.id }}',
    session_id: currentSessionId,
    question: createContextualMessage(message),
    collection: 'analysis_result_consultation'
  }));
  
  // 봇 응답 준비
  preparePIPBotMessage();
  prepareBotMessage();
}
```

### 4. 분석 요약 데이터 처리

```javascript
function updatePIPAnalysisSummary() {
  const analysisData = {
    address: getElementText('resultAddress'),
    businessType: getElementText('resultBusinessType'),
    survivalRate: getElementText('survivalPercentage'),
    lifePop: getElementText('lifePop300'),
    workingPop: getElementText('workingPop300'),
    competitor: getElementText('competitor300'),
    landValue: getElementHTML('totalLandValue')
  };
  
  document.getElementById('pipAnalysisSummary').innerHTML = generateSummaryHTML(analysisData);
}

function generateSummaryHTML(data) {
  return `
    <div class="mb-3">
      <h6 class="text-primary mb-2">📍 기본 정보</h6>
      <div class="small">
        <div class="mb-1"><strong>주소:</strong> ${data.address}</div>
        <div class="mb-1"><strong>업종:</strong> ${data.businessType}</div>
      </div>
    </div>
    
    <div class="mb-3">
      <h6 class="text-success mb-2">🎯 AI 생존 확률</h6>
      <div class="text-center">
        <div class="h4 text-primary mb-1">${data.survivalRate}</div>
        <div class="progress mb-2" style="height: 8px;">
          <div class="progress-bar ${getSurvivalBarClass(data.survivalRate)}" 
               style="width: ${data.survivalRate}"></div>
        </div>
      </div>
    </div>
    
    <!-- 추가 지표들... -->
  `;
}
```

---

## 🎨 CSS 스타일링 전략

### 1. 반응형 레이아웃

```css
/* PIP 모달 기본 스타일 */
#chatbotPIPModal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 10003;
}

/* 3단 레이아웃 */
.pip-main-content {
  display: flex;
  flex-grow: 1;
}

.pip-history-sidebar {
  width: 280px;
  min-width: 280px;
}

.pip-summary-sidebar {
  width: 350px;
  min-width: 350px;
}

/* 모바일 대응 */
@media (max-width: 768px) {
  .pip-history-sidebar { width: 200px; }
  .pip-summary-sidebar { width: 250px; }
}
```

### 2. 인터랙션 효과

```css
/* 호버 효과 */
.hover-bg-light:hover {
  background-color: #f8f9fa !important;
  transition: background-color 0.15s ease-in-out;
}

/* 하이라이트 효과 */
.message-highlight {
  background-color: rgba(13, 110, 253, 0.1) !important;
  transition: background-color 0.3s ease-in-out;
}
```

---

## 🔧 성능 최적화

### 1. 메모리 관리

```javascript
// 메모리 누수 방지
class PIPModalManager {
  constructor() {
    this.eventListeners = [];
    this.modal = null;
  }
  
  createModal() {
    this.destroyModal(); // 기존 정리
    this.modal = document.createElement('div');
    this.setupEventListeners();
    document.body.appendChild(this.modal);
  }
  
  destroyModal() {
    if (this.modal) {
      this.removeAllEventListeners();
      this.modal.remove();
      this.modal = null;
    }
  }
}
```

### 2. DOM 조작 최적화

```javascript
// 디바운싱으로 업데이트 최적화
const debouncedHistoryUpdate = debounce(updatePIPChatHistory, 100);

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

---

## 🐛 에러 처리

### 1. 전역 에러 핸들러

```javascript
class ErrorHandler {
  static handle(error, context = '') {
    console.error(`[${context}] 오류:`, error);
    this.showUserMessage(error, context);
  }
  
  static showUserMessage(error, context) {
    const messages = {
      'websocket': '채팅 연결 문제가 발생했습니다.',
      'pip_modal': 'PIP 모드 오류가 발생했습니다.',
      'default': '예상치 못한 오류가 발생했습니다.'
    };
    
    const message = messages[context] || messages.default;
    this.showToast(message, 'error');
  }
}

// 사용 예시
try {
  openChatbotPIP();
} catch (error) {
  ErrorHandler.handle(error, 'pip_modal');
}
```

---

## 📱 브라우저 호환성

### 지원 브라우저
- **Chrome 80+**: ✅ 완전 지원
- **Firefox 75+**: ✅ 완전 지원  
- **Safari 13+**: ✅ 완전 지원
- **Edge 80+**: ✅ 완전 지원
- **IE**: ❌ 지원 안함

### Polyfill 처리
```javascript
// WebSocket 지원 확인
if (!window.WebSocket) {
  console.error('WebSocket 미지원 브라우저');
  initPollingMode(); // Fallback
}

// CSS Grid 지원 확인
if (!CSS.supports('display', 'grid')) {
  document.body.classList.add('no-grid-support');
}
```

---

## 🔄 배포 고려사항

### 1. 프로덕션 최적화
- JavaScript 파일 압축 및 번들링
- CSS 파일 최적화
- 이미지 최적화 (WebP 포맷 사용)
- 브라우저 캐싱 설정

### 2. 모니터링
- 에러 로깅 시스템 연동
- 성능 메트릭 수집
- 사용자 행동 분석

---

**문서 작성일**: 2025년 6월 18일  
**작성자**: AI Assistant  
**버전**: 1.0 