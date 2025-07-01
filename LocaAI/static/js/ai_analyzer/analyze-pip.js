/**
 * AI Analyzer PIP 모달 관리 모듈
 * 챗봇 PIP 확대, 채팅 히스토리, 세션 관리 기능
 */

// 전역 변수
let pipCurrentBotMessageText = '';

// PIP 예시 질문 입력 함수
function fillPIPExampleQuestion(question) {
  const pipChatInput = document.getElementById('pipChatInput');
  if (pipChatInput) {
    pipChatInput.value = question;
    pipChatInput.focus();
  }
}

// 언어별 추천 질문 가져오기 함수들
function getPIPSurvivalProbQuestion() {
  const lang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  const questions = {
    ko: '이 상권의 생존 확률이 높은 이유는 무엇인가요?',
    en: 'What are the reasons for the high survival probability of this commercial area?',
    es: '¿Cuáles son las razones de la alta probabilidad de supervivencia de esta área comercial?'
  };
  return questions[lang] || questions.ko;
}

function getPIPCompetitionQuestion() {
  const lang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  const questions = {
    ko: '경쟁업체가 많은 편인가요?',
    en: 'Are there many competitors in this area?',
    es: '¿Hay muchos competidores en esta área?'
  };
  return questions[lang] || questions.ko;
}

function getPIPPrecautionsQuestion() {
  const lang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  const questions = {
    ko: '창업 시 주의해야 할 점은 무엇인가요?',
    en: 'What should I be careful about when starting a business?',
    es: '¿De qué debo tener cuidado al iniciar un negocio?'
  };
  return questions[lang] || questions.ko;
}

// PIP 모달의 다국어 요소 업데이트
function updatePIPModalLanguage() {
  const lang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
  
  // 플레이스홀더 업데이트
  const pipChatInput = document.getElementById('pipChatInput');
  if (pipChatInput) {
    const placeholders = {
      ko: '분석 결과에 대해 궁금한 점을 물어보세요...',
      en: 'Ask any questions about the analysis results...',
      es: 'Haga cualquier pregunta sobre los resultados del análisis...'
    };
    pipChatInput.placeholder = placeholders[lang] || placeholders.ko;
  }
  
  console.log(`📱 PIP 모달 언어 업데이트 완료: ${lang}`);
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

// PIP 모달 HTML 생성 - 다국어 지원
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
            <h5 class="mb-0 text-primary">
              <span data-lang="KOR">분석결과 상담 AI</span>
              <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
              <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
            </h5>
            <small class="text-muted">
              <span data-lang="KOR">현재 분석 세션 기반 상담</span>
              <span data-lang="ENG" style="display: none;">Current analysis session-based consultation</span>
              <span data-lang="ESP" style="display: none;">Consulta basada en sesión de análisis actual</span>
            </small>
          </div>
        </div>
        <div class="d-flex align-items-center">
          <span class="badge bg-success-subtle text-success me-3">
            <span data-lang="KOR">온라인</span>
            <span data-lang="ENG" style="display: none;">Online</span>
            <span data-lang="ESP" style="display: none;">En línea</span>
          </span>
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
              <i class="bi bi-chat-dots me-2"></i>
              <span data-lang="KOR">채팅 히스토리</span>
              <span data-lang="ENG" style="display: none;">Chat History</span>
              <span data-lang="ESP" style="display: none;">Historial de Chat</span>
            </h6>
          </div>
          <div class="p-2" style="max-height: calc(100vh - 200px); overflow-y: auto;">
            <div id="pipChatHistory">
              <div class="text-center text-muted py-4">
                <i class="bi bi-chat-square-dots" style="font-size: 2rem;"></i>
                <p class="small mt-2 mb-0">
                  <span data-lang="KOR">아직 대화 기록이 없습니다.<br>AI와 대화를 시작해보세요!</span>
                  <span data-lang="ENG" style="display: none;">No conversation history yet.<br>Start chatting with AI!</span>
                  <span data-lang="ESP" style="display: none;">Aún no hay historial de conversación.<br>¡Comience a chatear con la IA!</span>
                </p>
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
              <input type="text" id="pipChatInput" class="form-control" 
                data-placeholder-kor="분석 결과에 대해 궁금한 점을 물어보세요..."
                data-placeholder-eng="Ask any questions about the analysis results..."
                data-placeholder-esp="Haga cualquier pregunta sobre los resultados del análisis..."
                placeholder="분석 결과에 대해 궁금한 점을 물어보세요...">
              <button class="btn btn-primary" id="pipChatSendBtn" type="button">
                <i class="bi bi-send-fill me-1"></i>
                <span data-lang="KOR">전송</span>
                <span data-lang="ENG" style="display: none;">Send</span>
                <span data-lang="ESP" style="display: none;">Enviar</span>
              </button>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-2">
              <small class="text-muted">
                <i class="bi bi-shield-check me-1"></i>
                <span data-lang="KOR">현재 분석 세션 결과를 기반으로 답변</span>
                <span data-lang="ENG" style="display: none;">Answers based on current analysis session results</span>
                <span data-lang="ESP" style="display: none;">Respuestas basadas en los resultados de la sesión de análisis actual</span>
              </small>
              <div id="pipChatConnectionStatus" style="display: none;">
                <small class="text-primary">
                  <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                  <span data-lang="KOR">AI 연결 중...</span>
                  <span data-lang="ENG" style="display: none;">Connecting to AI...</span>
                  <span data-lang="ESP" style="display: none;">Conectando a IA...</span>
                </small>
              </div>
            </div>
          </div>
        </div>

        <!-- 사이드바 (분석 요약) -->
        <div class="bg-white border-start" style="width: 350px; min-width: 350px;">
          <div class="p-3 border-bottom">
            <h6 class="mb-0 text-primary">
              <i class="bi bi-graph-up me-2"></i>
              <span data-lang="KOR">분석 요약</span>
              <span data-lang="ENG" style="display: none;">Analysis Summary</span>
              <span data-lang="ESP" style="display: none;">Resumen de Análisis</span>
            </h6>
          </div>
          <div class="p-3" style="max-height: calc(100vh - 200px); overflow-y: auto;">
            <!-- 추천 질문 버튼 -->
            <div class="mb-4">
              <h6 class="text-primary mb-3">
                💡 <span data-lang="KOR">추천 질문</span>
                <span data-lang="ENG" style="display: none;">Suggested Questions</span>
                <span data-lang="ESP" style="display: none;">Preguntas Sugeridas</span>
              </h6>
              <div class="d-grid gap-2">
                <button class="btn btn-sm btn-outline-primary" onclick="fillPIPExampleQuestion(getPIPSurvivalProbQuestion())">
                  <i class="bi bi-graph-up me-2"></i>
                  <span data-lang="KOR">생존 확률</span>
                  <span data-lang="ENG" style="display: none;">Survival Rate</span>
                  <span data-lang="ESP" style="display: none;">Tasa de Supervivencia</span>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="fillPIPExampleQuestion(getPIPCompetitionQuestion())">
                  <i class="bi bi-shop me-2"></i>
                  <span data-lang="KOR">경쟁 현황</span>
                  <span data-lang="ENG" style="display: none;">Competition Status</span>
                  <span data-lang="ESP" style="display: none;">Estado de la Competencia</span>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="fillPIPExampleQuestion(getPIPPrecautionsQuestion())">
                  <i class="bi bi-exclamation-triangle me-2"></i>
                  <span data-lang="KOR">주의사항</span>
                  <span data-lang="ENG" style="display: none;">Precautions</span>
                  <span data-lang="ESP" style="display: none;">Precauciones</span>
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
  
  // 다국어 언어 업데이트
  updatePIPModalLanguage();
  
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
// PIP 메시지 전송 - analyze-chatbot.js의 sendChatMessage 함수 사용
async function sendPIPMessage() {
  const input = document.getElementById('pipChatInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // PIP 입력 필드를 메인 입력 필드와 동기화
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = message;
  }
  
  // analyze-chatbot.js의 sendChatMessage 함수 호출
  if (typeof window.sendChatMessage === 'function') {
    await window.sendChatMessage();
  }
  
  // 입력 필드 초기화
  input.value = '';
  if (chatInput) {
    chatInput.value = '';
  }
  
  // 히스토리 업데이트
  setTimeout(() => {
    updatePIPChatHistory();
  }, 100);
}

// PIP 관련 함수들은 analyze-chatbot.js에서 처리됩니다.
// 필요한 경우 여기서 PIP 전용 UI 업데이트만 수행합니다.

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
  const currentLanguage = getCurrentLanguage();
  
  const messages = {
    ko: {
      title: '분석결과 상담 AI',
      status: '온라인',
      greeting: '안녕하세요! 🎯 방금 완료된 상권 분석 결과에 대해 궁금한 점이 있으시면 언제든 물어보세요.',
      consultationTitle: '상담 가능한 내용:',
      items: [
        '📊 AI 생존 확률 해석',
        '👥 인구 및 고객층 분석', 
        '🏪 경쟁업체 현황',
        '💰 수익성 전망',
        '🚀 창업 전략 조언'
      ]
    },
    en: {
      title: 'Analysis Consultation AI',
      status: 'Online',
      greeting: 'Hello! 🎯 If you have any questions about the commercial area analysis results just completed, feel free to ask anytime.',
      consultationTitle: 'Available Consultation Topics:',
      items: [
        '📊 AI Survival Probability Interpretation',
        '👥 Population and Customer Analysis',
        '🏪 Competitor Status',
        '💰 Profitability Outlook',
        '🚀 Startup Strategy Advice'
      ]
    },
    es: {
      title: 'IA de Consulta de Análisis',
      status: 'En línea',
      greeting: '¡Hola! 🎯 Si tiene alguna pregunta sobre los resultados del análisis de zona comercial recién completado, no dude en preguntar en cualquier momento.',
      consultationTitle: 'Temas de Consulta Disponibles:',
      items: [
        '📊 Interpretación de Probabilidad de Supervivencia IA',
        '👥 Análisis de Población y Clientes',
        '🏪 Estado de Competidores',
        '💰 Perspectiva de Rentabilidad',
        '🚀 Consejos de Estrategia de Startup'
      ]
    }
  };
  
  const msg = messages[currentLanguage] || messages.ko;
  const itemsHTML = msg.items.map(item => `• ${item}`).join('<br>');
  
  return `
    <div class="d-flex align-items-start mb-3">
      <div class="bg-gradient bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
        <i class="bi bi-robot text-white" style="font-size: 16px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-3 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">${msg.title}</strong>
            <span class="badge bg-success-subtle text-success">${msg.status}</span>
          </div>
          <p class="mb-0">${msg.greeting}<br><br>
          <strong>${msg.consultationTitle}</strong><br>
          ${itemsHTML}</p>
        </div>
      </div>
    </div>
  `;
}

// PIP 분석 요약 업데이트
function updatePIPAnalysisSummary() {
  const summaryDiv = document.getElementById('pipAnalysisSummary');
  if (!summaryDiv) return;

  const currentLanguage = getCurrentLanguage();
  
  const labels = {
    ko: {
      basicInfo: '📍 기본 정보',
      address: '주소:',
      businessType: '업종:',
      survivalProb: '🎯 AI 생존 확률',
      keyMetrics: '📊 핵심 지표',
      lifePop: '생활인구',
      workingPop: '직장인구',
      competitor: '경쟁업체',
      landValue: '공시지가',
      chatNote: '좌측 채팅에서 분석 결과에 대해 자세히 문의하실 수 있습니다.'
    },
    en: {
      basicInfo: '📍 Basic Information',
      address: 'Address:',
      businessType: 'Business Type:',
      survivalProb: '🎯 AI Survival Probability',
      keyMetrics: '📊 Key Metrics',
      lifePop: 'Residential Pop.',
      workingPop: 'Working Pop.',
      competitor: 'Competitors',
      landValue: 'Land Value',
      chatNote: 'You can inquire in detail about the analysis results in the left chat.'
    },
    es: {
      basicInfo: '📍 Información Básica',
      address: 'Dirección:',
      businessType: 'Tipo de Negocio:',
      survivalProb: '🎯 Probabilidad de Supervivencia IA',
      keyMetrics: '📊 Métricas Clave',
      lifePop: 'Pob. Residencial',
      workingPop: 'Pob. Trabajadora',
      competitor: 'Competidores',
      landValue: 'Valor del Terreno',
      chatNote: 'Puede consultar en detalle sobre los resultados del análisis en el chat de la izquierda.'
    }
  };
  
  const label = labels[currentLanguage] || labels.ko;

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
      <h6 class="text-primary mb-2">${label.basicInfo}</h6>
      <div class="small">
        <div class="mb-1"><strong>${label.address}</strong> ${address}</div>
        <div class="mb-1"><strong>${label.businessType}</strong> ${businessType}</div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-success mb-2">${label.survivalProb}</h6>
      <div class="text-center">
        <div class="h4 text-primary mb-1">${survivalRate}</div>
        <div class="progress mb-2" style="height: 8px;">
          <div class="progress-bar ${getSurvivalBarClass(survivalRate)}" style="width: ${survivalRate}"></div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-info mb-2">${label.keyMetrics}</h6>
      <div class="row g-2 small">
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-primary">${lifePop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${label.lifePop}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-warning">${workingPop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${label.workingPop}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-danger">${competitor}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${label.competitor}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-secondary">${landValue}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${label.landValue}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info py-2 px-3">
      <small>
        <i class="bi bi-info-circle me-1"></i>
        ${label.chatNote}
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
  pipCurrentBotMessageText += chunk;
  
  // 메인 채팅 메시지 업데이트
  const currentMessage = document.getElementById('currentBotMessage');
  if (currentMessage) {
    const contentElement = currentMessage.querySelector('#botMessageContent');
    if (contentElement) {
      if (contentElement.innerHTML.includes('spinner-border')) {
        contentElement.innerHTML = marked.parse(chunk);
      } else {
        contentElement.innerHTML = marked.parse(pipCurrentBotMessageText);
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
        pipContentElement.innerHTML = marked.parse(pipCurrentBotMessageText);
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
  pipCurrentBotMessageText = '';
  
  // PIP 히스토리 업데이트
  setTimeout(() => {
    updatePIPChatHistory();
  }, 100);
}

// 현재 언어 감지 함수
function getCurrentLanguage() {
  // 글로벌 함수 사용 시도
  if (typeof window.getCurrentAILanguage === 'function') {
    return window.getCurrentAILanguage();
  }
  
  // 직접 감지
  const langElement = document.querySelector('[data-lang]');
  if (!langElement) return 'ko';
  
  // 현재 보이는 언어 요소 찾기
  const visibleLangElement = document.querySelector('[data-lang="KOR"]:not([style*="display: none"]), [data-lang="ENG"]:not([style*="display: none"]), [data-lang="ESP"]:not([style*="display: none"])');
  if (visibleLangElement) {
    const lang = visibleLangElement.getAttribute('data-lang');
    return lang === 'KOR' ? 'ko' : lang === 'ENG' ? 'en' : 'es';
  }
  
  return 'ko';
}

// ===========================================
// 윈도우 전역 함수 할당
// ===========================================
window.updatePIPModalLanguage = updatePIPModalLanguage;
window.updatePIPChatHistory = updatePIPChatHistory;