/**
 * AI Analyzer PIP 모달 관리 모듈
 * 챗봇 PIP 확대, 채팅 히스토리, 세션 관리 기능
 */

// 전역 변수
let currentBotMessageText = '';

// PIP 예시 질문 입력 함수
function fillPIPExampleQuestion(question) {
  const pipChatInput = document.getElementById('pipChatInput');
  if (pipChatInput) {
    pipChatInput.value = question;
    pipChatInput.focus();
  }
}

// 챗봇 PIP 열기
function openChatbotPIP() {
  // 기존 PIP 모달이 있으면 제거
  const existingModal = document.getElementById('chatbotPIPModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 새로운 PIP 모달 생성
  const pipModal = document.createElement('div');
  pipModal.id = 'chatbotPIPModal';
  pipModal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.8);
    z-index: 10003;
    pointer-events: auto;
    display: block;
  `;
  
  pipModal.innerHTML = createPIPModalHTML();
  
  // DOM에 추가
  document.body.appendChild(pipModal);
  
  // 초기화 및 설정
  initializePIPModal();
}

// PIP 모달 HTML 생성
function createPIPModalHTML() {
  return `
    <div class="d-flex flex-column h-100">
      <!-- PIP 헤더 -->
      <div class="bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
            <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
          </div>
          <div>
            <h5 class="mb-0 text-primary">분석결과 상담 AI</h5>
            <small class="text-muted">현재 분석 세션 기반 상담</small>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <span class="badge bg-success-subtle text-success me-3">온라인</span>
          <button class="btn btn-outline-secondary btn-sm me-2" onclick="minimizeChatbotPIP()" title="최소화">
            <i class="bi bi-dash-lg"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="closeChatbotPIP()" title="닫기">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- PIP 채팅 영역 -->
      <div class="flex-grow-1 bg-light d-flex">
        <!-- 채팅 히스토리 사이드바 -->
        <div class="bg-white border-end" style="width: 280px; min-width: 280px;">
          <div class="p-3 border-bottom">
            <h6 class="mb-0 text-primary">
              <i class="bi bi-chat-dots me-2"></i>채팅 히스토리
            </h6>
          </div>
          <div class="p-2" style="max-height: calc(100vh - 200px); overflow-y: auto;">
            <div id="pipChatHistory">
              <div class="text-center text-muted py-4">
                <i class="bi bi-chat-square-dots" style="font-size: 2rem;"></i>
                <p class="small mt-2 mb-0">아직 대화 기록이 없습니다.<br>AI와 대화를 시작해보세요!</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 채팅 메시지 영역 -->
        <div class="flex-grow-1 d-flex flex-column">
          <div id="pipChatMessages" class="flex-grow-1 overflow-auto p-4" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); max-height: calc(100vh - 200px); min-height: 400px;"></div>

          <!-- PIP 입력 영역 -->
          <div class="bg-white border-top p-4">
            <div class="input-group">
              <input type="text" id="pipChatInput" class="form-control" placeholder="분석 결과에 대해 궁금한 점을 물어보세요...">
              <button class="btn btn-primary" id="pipChatSendBtn" type="button">
                <i class="bi bi-send-fill me-1"></i>전송
              </button>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-2">
              <small class="text-muted">
                <i class="bi bi-shield-check me-1"></i>
                현재 분석 세션 결과를 기반으로 답변
              </small>
              <div id="pipChatConnectionStatus" style="display: none;">
                <small class="text-primary">
                  <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                  AI 연결 중...
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- 사이드바 (분석 요약) -->
        <div class="bg-white border-start" style="width: 350px; min-width: 350px;">
          <div class="p-3 border-bottom">
            <h6 class="mb-0 text-primary">
              <i class="bi bi-graph-up me-2"></i>분석 요약
            </h6>
          </div>
          <div class="p-3" style="max-height: calc(100vh - 200px); overflow-y: auto;">
            <!-- 추천 질문 버튼 -->
            <div class="mb-4">
              <h6 class="text-primary mb-3">💡 추천 질문</h6>
              <div class="d-grid gap-2">
                <button class="btn btn-sm btn-outline-primary" onclick="fillPIPExampleQuestion('이 상권의 생존 확률이 높은 이유는 무엇인가요?')">
                  <i class="bi bi-graph-up me-2"></i>생존 확률
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="fillPIPExampleQuestion('경쟁업체가 많은 편인가요?')">
                  <i class="bi bi-shop me-2"></i>경쟁 현황
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="fillPIPExampleQuestion('창업 시 주의해야 할 점은 무엇인가요?')">
                  <i class="bi bi-exclamation-triangle me-2"></i>주의사항
                </button>
              </div>
            </div>
            
            <div id="pipAnalysisSummary">
              <!-- 분석 요약 내용이 여기에 동적으로 추가됩니다 -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// PIP 모달 초기화
function initializePIPModal() {
  // 기존 채팅 메시지 복사
  const chatMessages = document.getElementById('chatMessages');
  const pipChatMessages = document.getElementById('pipChatMessages');
  if (chatMessages && pipChatMessages) {
    pipChatMessages.innerHTML = chatMessages.innerHTML;
  }
  
  // 채팅 히스토리 업데이트
  updatePIPChatHistory();
  
  // 분석 요약 정보 업데이트
  updatePIPAnalysisSummary();
  
  // PIP 입력 필드 상태 동기화
  synchronizePIPInputs();
  
  // 이벤트 리스너 추가
  setupPIPEventListeners();
  
  // 스크롤을 맨 아래로
  setTimeout(() => {
    pipChatMessages.scrollTop = pipChatMessages.scrollHeight;
  }, 100);
}

// PIP 입력 필드 상태 동기화
function synchronizePIPInputs() {
  const chatInput = document.getElementById('chatInput');
  const pipChatInput = document.getElementById('pipChatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const pipChatSendBtn = document.getElementById('pipChatSendBtn');
  
  if (chatInput && pipChatInput) {
    pipChatInput.disabled = chatInput.disabled;
    pipChatInput.value = chatInput.value;
  }
  if (chatSendBtn && pipChatSendBtn) {
    pipChatSendBtn.disabled = chatSendBtn.disabled;
  }
}

// PIP 이벤트 리스너 설정
function setupPIPEventListeners() {
  const pipChatInput = document.getElementById('pipChatInput');
  const pipChatSendBtn = document.getElementById('pipChatSendBtn');
  
  if (pipChatInput) {
    pipChatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendPIPMessage();
      }
    });
  }
  
  if (pipChatSendBtn) {
    pipChatSendBtn.addEventListener('click', sendPIPMessage);
  }
}

// 챗봇 PIP 닫기
function closeChatbotPIP() {
  const pipModal = document.getElementById('chatbotPIPModal');
  if (pipModal) {
    pipModal.remove();
  }
}

// 챗봇 PIP 최소화 (닫기와 동일)
function minimizeChatbotPIP() {
  closeChatbotPIP();
}

// PIP 채팅 메시지 전송
async function sendPIPMessage() {
  const input = document.getElementById('pipChatInput');
  const message = input.value.trim();
  
  if (!message || !chatSocket) return;
  
  // 새로운 세션이 필요한 경우 생성
  if (!currentSessionId) {
    try {
      await createNewChatSession();
    } catch (error) {
      console.error('세션 생성 실패:', error);
      addBotMessage('죄송합니다. 채팅 세션을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
  }
  
  // 사용자 메시지 추가 (PIP와 원본 모두)
  addPIPUserMessage(message);
  addUserMessage(message);
  
  // 입력 필드 초기화
  input.value = '';
  document.getElementById('chatInput').value = '';
  
  // 분석 데이터를 포함한 컨텍스트 생성
  const contextualMessage = createContextualMessage(message);
  
  // WebSocket으로 메시지 전송
  chatSocket.send(JSON.stringify({
    user_id: USER_ID,
    session_id: currentSessionId,
    question: contextualMessage,
    collection: 'analysis_result_consultation'
  }));
  
  // 봇 응답 준비 (PIP와 원본 모두)
  preparePIPBotMessage();
  prepareBotMessage();
  
  // 히스토리 업데이트
  setTimeout(() => {
    updatePIPChatHistory();
  }, 100);
}

// PIP 사용자 메시지 추가
function addPIPUserMessage(message) {
  const messagesContainer = document.getElementById('pipChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'd-flex align-items-start mb-3 justify-content-end';
  messageDiv.innerHTML = `
    <div class="flex-grow-1 text-end me-2">
      <div class="bg-primary text-white rounded-3 p-3 shadow-sm d-inline-block" style="max-width: 80%;">
        <p class="mb-0">${escapeHtml(message)}</p>
      </div>
    </div>
    <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
      <i class="bi bi-person text-white" style="font-size: 18px;"></i>
    </div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// PIP 봇 응답 준비
function preparePIPBotMessage() {
  const messagesContainer = document.getElementById('pipChatMessages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'd-flex align-items-start mb-4';
  messageDiv.id = 'currentPIPBotMessage';
  messageDiv.innerHTML = `
    <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
      <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
    </div>
    <div class="flex-grow-1">
      <div class="bg-white rounded-3 p-4 shadow-sm border">
        <div class="d-flex align-items-center mb-2">
          <strong class="text-primary me-2">분석결과 상담 AI</strong>
          <span class="badge bg-success-subtle text-success">온라인</span>
        </div>
        <div id="pipBotMessageContent">
          <span class="spinner-border spinner-border-sm me-2" role="status"></span>
          답변을 생성하고 있습니다...
        </div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// PIP 채팅 히스토리 업데이트 (DB 기반)
async function updatePIPChatHistory() {
  const historyDiv = document.getElementById('pipChatHistory');
  if (!historyDiv) return;

  try {
    // 사용자 ID 확인
    const userId = USER_ID;
    if (!userId || userId === 'None') {
      historyDiv.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-person-x" style="font-size: 2rem;"></i>
          <p class="small mt-2 mb-0">로그인이 필요합니다</p>
        </div>
      `;
      return;
    }

    // 로딩 표시
    historyDiv.innerHTML = `
      <div class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
        <p class="small mb-0">채팅 기록을 불러오는 중...</p>
      </div>
    `;

    // chatbot 앱의 세션 리스트 API 호출
    const response = await fetch(`/chatbot/sessions/${userId}/`);
    if (!response.ok) {
      throw new Error('세션 데이터를 불러올 수 없습니다');
    }

    const data = await response.json();
    if (data.status !== 'ok' || !data.sessions || data.sessions.length === 0) {
      historyDiv.innerHTML = `
        <div class="text-center text-muted py-4">
          <i class="bi bi-chat-square-dots" style="font-size: 2rem;"></i>
          <p class="small mt-2 mb-0">아직 대화 기록이 없습니다.<br>AI와 대화를 시작해보세요!</p>
        </div>
      `;
      return;
    }

    // 세션 리스트 렌더링
    let historyHTML = '';
    data.sessions.forEach((session, index) => {
      const isActive = session.session_id === currentSessionId;
      const title = session.title || `세션 ${index + 1}`;
      const preview = session.preview || '새로운 대화';
      const createdAt = new Date(session.created_at).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      historyHTML += `
        <div class="chat-history-item mb-2 ${isActive ? 'active' : ''}" 
             onclick="loadChatSession('${session.session_id}')" 
             style="cursor: pointer;">
          <div class="p-2 rounded ${isActive ? 'bg-primary text-white' : 'bg-light'} hover-effect">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h6 class="mb-0 small fw-bold text-truncate" style="max-width: 180px;" title="${title}">
                ${title}
              </h6>
              <small class="${isActive ? 'text-white-50' : 'text-muted'}" style="font-size: 0.7rem;">
                ${createdAt}
              </small>
            </div>
            <p class="mb-0 small ${isActive ? 'text-white-50' : 'text-muted'} text-truncate" 
               style="font-size: 0.75rem; line-height: 1.2;" title="${preview}">
              ${preview.length > 40 ? preview.substring(0, 40) + '...' : preview}
            </p>
          </div>
        </div>
      `;
    });

    historyDiv.innerHTML = historyHTML;

    // 현재 활성 세션으로 스크롤
    const activeItem = historyDiv.querySelector('.chat-history-item.active');
    if (activeItem) {
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

  } catch (error) {
    console.error('채팅 히스토리 로드 실패:', error);
    historyDiv.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="bi bi-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
        <p class="small mt-2 mb-0">채팅 기록을 불러올 수 없습니다.<br>잠시 후 다시 시도해주세요.</p>
      </div>
    `;
  }
}

// 채팅 세션 로드 함수
async function loadChatSession(sessionId) {
  if (!sessionId || sessionId === currentSessionId) return;

  try {
    const userId = USER_ID;
    if (!userId || userId === 'None') return;

    // 로딩 표시
    const pipChatMessages = document.getElementById('pipChatMessages');
    if (pipChatMessages) {
      pipChatMessages.innerHTML = `
        <div class="text-center py-4">
          <div class="spinner-border text-primary mb-3" role="status"></div>
          <p class="text-muted">대화 기록을 불러오는 중...</p>
        </div>
      `;
    }

    // 세션 데이터 로드
    const response = await fetch(`/chatbot/sessions/${userId}/${sessionId}/`);
    if (!response.ok) {
      throw new Error('세션 데이터를 불러올 수 없습니다');
    }

    const data = await response.json();
    if (data.status !== 'ok') {
      throw new Error('세션 데이터 응답 오류: ' + JSON.stringify(data));
    }

    // 현재 세션 ID 업데이트
    currentSessionId = sessionId;

    // 채팅 메시지 렌더링
    let messagesHTML = '';
    const chatLog = data.chat_log || data.log || [];
    
    if (chatLog && chatLog.length > 0) {
      chatLog.forEach(message => {
      if (message.role === 'user') {
        messagesHTML += `
          <div class="d-flex align-items-start mb-3">
            <div class="ms-auto d-flex align-items-start">
              <div class="bg-primary text-white rounded-3 p-3 shadow-sm me-2" style="max-width: 70%;">
                <p class="mb-0">${message.content}</p>
              </div>
              <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
                <i class="bi bi-person-fill text-white" style="font-size: 16px;"></i>
              </div>
            </div>
          </div>
        `;
      } else if (message.role === 'assistant') {
        messagesHTML += `
          <div class="d-flex align-items-start mb-3">
            <div class="bg-gradient bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
              <i class="bi bi-robot text-white" style="font-size: 16px;"></i>
            </div>
            <div class="flex-grow-1">
              <div class="bg-white rounded-3 p-3 shadow-sm border" style="max-width: 85%;">
                <div class="d-flex align-items-center mb-2">
                  <strong class="text-primary me-2">분석결과 상담 AI</strong>
                  <span class="badge bg-success-subtle text-success">온라인</span>
                </div>
                <div class="message-content">${message.content}</div>
              </div>
            </div>
          </div>
        `;
        }
      });
    }

    if (messagesHTML === '') {
      messagesHTML = getDefaultChatMessage();
    }

    if (pipChatMessages) {
      pipChatMessages.innerHTML = messagesHTML;
      // 스크롤을 맨 아래로
      setTimeout(() => {
        pipChatMessages.scrollTop = pipChatMessages.scrollHeight;
      }, 100);
    }

    // 히스토리 업데이트 (활성 세션 표시)
    updatePIPChatHistory();

    // 메인 채팅도 동기화
    const mainChatMessages = document.getElementById('chatMessages');
    if (mainChatMessages) {
      mainChatMessages.innerHTML = messagesHTML;
      setTimeout(() => {
        mainChatMessages.scrollTop = mainChatMessages.scrollHeight;
      }, 100);
    }

  } catch (error) {
    console.error('세션 로드 실패:', error);
    if (pipChatMessages) {
      pipChatMessages.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
          <h6>대화 기록을 불러올 수 없습니다</h6>
          <p class="text-muted">잠시 후 다시 시도해주세요.</p>
        </div>
      `;
    }
  }
}

// 기본 채팅 메시지 생성
function getDefaultChatMessage() {
  return `
    <div class="d-flex align-items-start mb-3">
      <div class="bg-gradient bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
        <i class="bi bi-robot text-white" style="font-size: 16px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-3 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">분석결과 상담 AI</strong>
            <span class="badge bg-success-subtle text-success">온라인</span>
          </div>
          <p class="mb-0">안녕하세요! 🎯 방금 완료된 상권 분석 결과에 대해 궁금한 점이 있으시면 언제든 물어보세요.<br><br>
          <strong>상담 가능한 내용:</strong><br>
          • 📊 AI 생존 확률 해석<br>
          • 👥 인구 및 고객층 분석<br>
          • 🏪 경쟁업체 현황<br>
          • 💰 수익성 전망<br>
          • 🚀 창업 전략 조언</p>
        </div>
      </div>
    </div>
  `;
}

// PIP 분석 요약 업데이트
function updatePIPAnalysisSummary() {
  const summaryDiv = document.getElementById('pipAnalysisSummary');
  if (!summaryDiv) return;

  // 현재 분석 결과에서 주요 지표 가져오기
  const address = document.getElementById('resultAddress')?.textContent || '-';
  const businessType = document.getElementById('resultBusinessType')?.textContent || '-';
  const survivalRate = document.getElementById('survivalPercentage')?.textContent || '-%';
  const lifePop = document.getElementById('lifePop300')?.textContent || '-';
  const workingPop = document.getElementById('workingPop300')?.textContent || '-';
  const competitor = document.getElementById('competitor300')?.textContent || '-';
  const landValue = document.getElementById('totalLandValue')?.innerHTML || '-';

  summaryDiv.innerHTML = `
    <div class="mb-3">
      <h6 class="text-primary mb-2">📍 기본 정보</h6>
      <div class="small">
        <div class="mb-1"><strong>주소:</strong> ${address}</div>
        <div class="mb-1"><strong>업종:</strong> ${businessType}</div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-success mb-2">🎯 AI 생존 확률</h6>
      <div class="text-center">
        <div class="h4 text-primary mb-1">${survivalRate}</div>
        <div class="progress mb-2" style="height: 8px;">
          <div class="progress-bar ${getSurvivalBarClass(survivalRate)}" style="width: ${survivalRate}"></div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-info mb-2">📊 핵심 지표</h6>
      <div class="row g-2 small">
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-primary">${lifePop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">생활인구</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-warning">${workingPop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">직장인구</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-danger">${competitor}</div>
            <div class="text-muted" style="font-size: 0.75rem;">경쟁업체</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-secondary">${landValue}</div>
            <div class="text-muted" style="font-size: 0.75rem;">공시지가</div>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info py-2 px-3">
      <small>
        <i class="bi bi-info-circle me-1"></i>
        좌측 채팅에서 분석 결과에 대해 자세히 문의하실 수 있습니다.
      </small>
    </div>
  `;
}

// PIP 메시지로 스크롤
function scrollToPIPMessage(sessionNumber) {
  const pipChatMessages = document.getElementById('pipChatMessages');
  if (!pipChatMessages) return;

  const messages = pipChatMessages.querySelectorAll('.d-flex.mb-3');
  let targetMessage = null;
  let currentSessionCount = 0;

  for (let message of messages) {
    const isUser = message.querySelector('.ms-auto') !== null;
    if (isUser) {
      currentSessionCount++;
      if (currentSessionCount === sessionNumber) {
        targetMessage = message;
        break;
      }
    }
  }

  if (targetMessage) {
    targetMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 잠시 하이라이트 효과
    targetMessage.style.backgroundColor = 'rgba(13, 110, 253, 0.1)';
    setTimeout(() => {
      targetMessage.style.backgroundColor = '';
    }, 2000);
  }
}

// 스트리밍 메시지 업데이트 (PIP 포함)
function appendToPIPBotMessage(chunk) {
  currentBotMessageText += chunk;
  
  // 메인 채팅 메시지 업데이트
  const currentMessage = document.getElementById('currentBotMessage');
  if (currentMessage) {
    const contentElement = currentMessage.querySelector('#botMessageContent');
    if (contentElement) {
      if (contentElement.innerHTML.includes('spinner-border')) {
        contentElement.innerHTML = marked.parse(chunk);
      } else {
        contentElement.innerHTML = marked.parse(currentBotMessageText);
      }
    }
    document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
  }

  // PIP도 동시에 업데이트
  const currentPIPMessage = document.getElementById('currentPIPBotMessage');
  if (currentPIPMessage) {
    const pipContentElement = currentPIPMessage.querySelector('#pipBotMessageContent');
    if (pipContentElement) {
      if (pipContentElement.innerHTML.includes('spinner-border')) {
        pipContentElement.innerHTML = marked.parse(chunk);
      } else {
        pipContentElement.innerHTML = marked.parse(currentBotMessageText);
      }
      document.getElementById('pipChatMessages').scrollTop = document.getElementById('pipChatMessages').scrollHeight;
    }
  }
}

// 봇 메시지 완료 처리 (PIP 포함)
function finalizePIPBotMessage() {
  const currentMessage = document.getElementById('currentBotMessage');
  const currentPIPMessage = document.getElementById('currentPIPBotMessage');
  
  if (currentMessage) {
    currentMessage.removeAttribute('id');
  }
  if (currentPIPMessage) {
    currentPIPMessage.removeAttribute('id');
  }
  // 메시지 텍스트 초기화
  currentBotMessageText = '';
  
  // PIP 히스토리 업데이트
  setTimeout(() => {
    updatePIPChatHistory();
  }, 100);
} 