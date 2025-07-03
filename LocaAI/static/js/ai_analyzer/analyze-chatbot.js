// ===========================================
// AI Analyzer - 챗봇 모듈
// 분석결과 상담 챗봇 관련 기능
// ===========================================

// 전역 변수들
let currentSessionId = null;
let chatSocket = null;
let chatbotCurrentBotMessageText = '';
let pipCurrentBotMessageText = ''; // PIP 전용 텍스트 변수

// 공유 메시지 시스템 - 두 창이 완전히 동기화됨
let sharedMessages = [];
let currentBotMessageId = null;
let isStreamingInProgress = false;

// ===========================================
// WebSocket 초기화 및 연결 관리
// ===========================================

// WebSocket 초기화
function initializeChatSocket() {
  if (USER_AUTHENTICATED) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chatbot/`;
    
    // WebSocket 연결 시도
    const statusElement = document.getElementById('chatConnectionStatus');
    if (statusElement) {
      statusElement.style.display = 'block';
    }
    
    chatSocket = new WebSocket(wsUrl);
    
    chatSocket.onopen = function(e) {
      
      // WebSocket 연결 완료
      if (statusElement) {
        statusElement.style.display = 'none';
      }
      const chatbotStatus = document.getElementById('chatbotStatus');
      if (chatbotStatus) {
        chatbotStatus.textContent = '연결됨';
        chatbotStatus.className = 'badge bg-success';
      }
    };
    
    chatSocket.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        
        if (data.chunk) {
          // 스트리밍 응답 처리
          appendToCurrentBotMessage(data.chunk);
        } else if (data.done) {
          // 응답 완료
          finalizeBotMessage();
          if (data.session_id) {
            currentSessionId = data.session_id;
          }
        } else if (data.error) {
          // 오류 처리
          console.error('서버 오류:', data.error);
          finalizeBotMessage(); // 현재 메시지 정리
          addBotMessage('죄송합니다. 오류가 발생했습니다: ' + data.error);
        }
      } catch (error) {
        console.error('메시지 파싱 오류:', error);
        finalizeBotMessage(); // 파싱 오류 시에도 현재 메시지 정리
      }
    };
    
    chatSocket.onclose = function(e) {
      // 현재 메시지 정리
      finalizeBotMessage();
      
      // WebSocket 연결 종료
      const chatbotStatus = document.getElementById('chatbotStatus');
      if (chatbotStatus) {
        chatbotStatus.textContent = '연결끊김';
        chatbotStatus.className = 'badge bg-warning';
      }
    };
    
    chatSocket.onerror = function(e) {
      console.error('WebSocket 오류 발생');
      
      // 현재 메시지 정리
      finalizeBotMessage();
      
      const chatbotStatus = document.getElementById('chatbotStatus');
      if (chatbotStatus) {
        chatbotStatus.textContent = '오류';
        chatbotStatus.className = 'badge bg-danger';
      }
    };
  }
}

// ===========================================
// 챗봇 초기화 및 상태 관리
// ===========================================

// 챗봇 초기 상태 설정
function initializeChatbotState() {
  // 페이지 로드 시 항상 비활성화 상태로 시작
  const inactiveElement = document.getElementById('chatbotInactive');
  const activeElement = document.getElementById('chatbotActive');
  
  // 비활성화 상태 표시
  if (inactiveElement) {
    inactiveElement.style.setProperty('display', 'flex', 'important');
    inactiveElement.style.visibility = 'visible';
    inactiveElement.style.height = 'auto';
  }
  
  // 활성화 상태 숨기기
  if (activeElement) {
    activeElement.style.setProperty('display', 'none', 'important');
    activeElement.style.visibility = 'hidden';
    activeElement.style.height = '0';
    activeElement.style.overflow = 'hidden';
  }
  
  const chatbotStatus = document.getElementById('chatbotStatus');
  if (chatbotStatus) {
    // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
    if (window.AI_ANALYZER_I18N) {
      chatbotStatus.textContent = AI_ANALYZER_I18N.translate('대기중');
    }
    chatbotStatus.className = 'badge bg-secondary';
  }
}

// ===========================================
// 채팅 세션 관리
// ===========================================

// 새로운 채팅 세션 생성
async function createNewChatSession() {
  const userId = USER_ID;
  if (!userId || userId === 'None') {
    throw new Error('사용자 인증이 필요합니다');
  }

  // CSRF 토큰 가져오기
  const csrfToken = getCsrfToken();
  
  try {
    const response = await fetch(`/chatbot/sessions/${userId}/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('세션 생성 실패 응답:', errorText);
      throw new Error(`세션 생성 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'ok' || !data.session_id) {
      throw new Error('세션 생성 응답 오류: ' + JSON.stringify(data));
    }

    currentSessionId = data.session_id;
    
    // PIP 히스토리 업데이트
    setTimeout(() => {
      updatePIPChatHistory();
    }, 100);
    
  } catch (error) {
    console.error('세션 생성 상세 오류:', error);
    throw error;
  }
}

// ===========================================
// 채팅 메시지 처리
// ===========================================

// 채팅 메시지 전송
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input ? input.value.trim() : '';
  
  if (!message || !chatSocket) {
    return;
  }
  
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
  
  // 기존 봇 메시지가 있다면 정리
  const currentBotMessage = document.getElementById('currentBotMessage');
  if (currentBotMessage) {
    finalizeBotMessage();
  }
  
  // 사용자 메시지 추가
  addUserMessage(message);
  
  // 입력 필드 초기화
  input.value = '';
  
  // 분석 데이터를 포함한 컨텍스트 생성
  const contextualMessage = createContextualMessage(message);
  
  // 현재 언어 감지
  const currentLanguage = getCurrentLanguage();
  
  // 현재 선택된 모드 가져오기
  const selectedMode = getCurrentChatMode();
  
  // 언어별 컬렉션 이름 설정
  const collectionName = getCollectionNameByLanguage(currentLanguage);
  
  // WebSocket으로 메시지 전송
  const messageData = {
    user_id: USER_ID,
    session_id: currentSessionId,
    question: contextualMessage,
    mode: selectedMode,
    collection: collectionName,
    language: currentLanguage
  };
  
  try {
    if (chatSocket.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(messageData);
      chatSocket.send(messageString);
    } else {
      console.error('WebSocket이 열려있지 않음. 상태:', chatSocket.readyState);
      addBotMessage('연결이 끊어졌습니다. 페이지를 새로고침 해주세요.');
      return;
    }
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    addBotMessage('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    return;
  }
  
  // 봇 응답 준비
  prepareBotMessage();
}

// 분석 데이터를 포함한 컨텍스트 메시지 생성
function createContextualMessage(userMessage) {
  // currentAnalysisData가 정의되지 않았거나 null인 경우 체크
  if (!window.currentAnalysisData) {
    return userMessage;
  }
  
  const currentAnalysisData = window.currentAnalysisData;
  
  const context = `
다음은 방금 완료된 상권 분석 결과입니다:

**기본 정보:**
- 주소: ${currentAnalysisData.request?.address || '정보 없음'}
- 업종: ${currentAnalysisData.request?.business_type?.name || '정보 없음'}
- 면적: ${currentAnalysisData.request?.area || '정보 없음'}㎡

**AI 생존 확률:** ${currentAnalysisData.result?.survival_percentage || '정보 없음'}%

**핵심 지표:**
- 생활인구 (300m): ${Math.round(currentAnalysisData.result?.life_pop_300m || 0).toLocaleString()}명
- 직장인구 (300m): ${Math.round(currentAnalysisData.result?.working_pop_300m || 0).toLocaleString()}명
- 경쟁업체 (300m): ${currentAnalysisData.result?.competitor_300m || 0}개
- 공시지가: ${formatLandValue(currentAnalysisData.result?.total_land_value || 0)}

**경쟁강도 분석:**
- 경쟁업체 비율: ${(currentAnalysisData.result?.competitor_ratio_300m || 0).toFixed(1)}%
- 업종 다양성: ${(currentAnalysisData.result?.business_diversity_300m || 0).toFixed(2)}

**외국인 분석:**
- 단기체류 외국인: ${Math.round(currentAnalysisData.result?.['2A_Temp_Total'] || 0).toLocaleString()}명
- 장기체류 외국인: ${Math.round(currentAnalysisData.result?.['1A_Long_Total'] || 0).toLocaleString()}명
- 중국인 비율: ${(currentAnalysisData.result?.['2A_Long_CN'] || 0).toFixed(1)}%

**연령대별 인구 (1000m 반경):**
- 20대: ${(currentAnalysisData.result?.['2A_20'] || 0).toFixed(1)}%
- 30대: ${(currentAnalysisData.result?.['2A_30'] || 0).toFixed(1)}%
- 40대: ${(currentAnalysisData.result?.['2A_40'] || 0).toFixed(1)}%
- 50대: ${(currentAnalysisData.result?.['2A_50'] || 0).toFixed(1)}%
- 60대+: ${(currentAnalysisData.result?.['2A_60'] || 0).toFixed(1)}%

위 분석 결과를 바탕으로 다음 질문에 답변해주세요: ${userMessage}
  `;
  
  return context;
}

// 통합 사용자 메시지 추가 - 두 창 완전 동기화
function addUserMessage(message) {
  // 메시지를 공유 배열에 저장
  const messageData = {
    id: Date.now(),
    type: 'user',
    content: message,
    timestamp: new Date()
  };
  sharedMessages.push(messageData);
  
  // 사이드바와 PIP 모두 업데이트
  updateBothChatContainers();
}

// 두 채팅 창 모두 업데이트하는 통합 함수
function updateBothChatContainers() {
  updateChatContainer('chatMessages', false); // 사이드바
  updateChatContainer('pipChatMessages', true); // PIP
}

// 개별 채팅 컨테이너 업데이트
function updateChatContainer(containerId, isPIP = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // 기존 메시지들 제거 (현재 스트리밍 중인 메시지 제외)
  const existingMessages = container.querySelectorAll('.chat-message:not(#currentBotMessage):not(#currentPIPBotMessage)');
  existingMessages.forEach(msg => msg.remove());
  
  // 모든 메시지 다시 렌더링
  sharedMessages.forEach(msg => {
    if (msg.type === 'user') {
      addUserMessageToContainer(container, msg.content, isPIP);
    } else if (msg.type === 'bot' && msg.completed) {
      addBotMessageToContainer(container, msg.content, isPIP);
    }
  });
  
  // 스크롤을 아래로
  container.scrollTop = container.scrollHeight;
}

// 사용자 메시지를 특정 컨테이너에 추가
function addUserMessageToContainer(container, message, isPIP = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'd-flex align-items-start mb-3 justify-content-end chat-message';
  
  if (isPIP) {
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
  } else {
    messageDiv.innerHTML = `
      <div class="flex-grow-1 text-end me-2">
        <div class="bg-primary text-white rounded p-2 shadow-sm d-inline-block" style="max-width: 80%;">
          <p class="mb-0 small">${escapeHtml(message)}</p>
        </div>
      </div>
      <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
        <i class="bi bi-person text-white" style="font-size: 14px;"></i>
      </div>
    `;
  }
  
  container.appendChild(messageDiv);
}

// 봇 메시지를 특정 컨테이너에 추가 (완료된 메시지)
function addBotMessageToContainer(container, message, isPIP = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'd-flex align-items-start mb-3 chat-message';
  
  if (isPIP) {
    messageDiv.innerHTML = `
      <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
        <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-4 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">
              <span data-lang="KOR">분석결과 상담 AI</span>
              <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
              <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
            </strong>
            <span class="badge bg-success-subtle text-success">
              <span data-lang="KOR">온라인</span>
              <span data-lang="ENG" style="display: none;">Online</span>
              <span data-lang="ESP" style="display: none;">En línea</span>
            </span>
          </div>
          <div>${marked.parse(message)}</div>
        </div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
        <i class="bi bi-robot text-white" style="font-size: 14px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded p-2 shadow-sm">
          <small class="text-muted d-block mb-1">
            <span data-lang="KOR">분석결과 상담 AI</span>
            <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
            <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
          </small>
          <div class="mb-0 small">${marked.parse(message)}</div>
        </div>
      </div>
    `;
  }
  
  container.appendChild(messageDiv);
}

// 통합 봇 응답 준비 - 두 창 완전 동기화
function prepareBotMessage() {
  // 스트리밍 상태 설정
  isStreamingInProgress = true;
  currentBotMessageId = Date.now();
  
  // 메시지 텍스트 변수 초기화 (단일 텍스트 변수 사용)
  chatbotCurrentBotMessageText = '';
  
  // 미완료된 봇 메시지 제거
  removeIncompleteBotMessages();
  
  // 사이드바에 스트리밍 메시지 생성
  createStreamingBotMessage('chatMessages', 'currentBotMessage', 'botMessageContent', false);
  
  // PIP에 스트리밍 메시지 생성
  createStreamingBotMessage('pipChatMessages', 'currentPIPBotMessage', 'pipBotMessageContent', true);
}

// 미완료된 봇 메시지 제거
function removeIncompleteBotMessages() {
  // 사이드바의 미완료 메시지 제거
  const existingBotMessage = document.getElementById('currentBotMessage');
  if (existingBotMessage) {
    const contentElement = existingBotMessage.querySelector('#botMessageContent');
    if (contentElement && isIncompleteMessage(contentElement)) {
      existingBotMessage.remove();
    } else {
      existingBotMessage.removeAttribute('id');
    }
  }
  
  // PIP의 미완료 메시지 제거
  const existingPIPBotMessage = document.getElementById('currentPIPBotMessage');
  if (existingPIPBotMessage) {
    const pipContentElement = existingPIPBotMessage.querySelector('#pipBotMessageContent');
    if (pipContentElement && isIncompleteMessage(pipContentElement)) {
      existingPIPBotMessage.remove();
    } else {
      existingPIPBotMessage.removeAttribute('id');
    }
  }
}

// 메시지가 미완료 상태인지 확인
function isIncompleteMessage(contentElement) {
  return contentElement && (
    contentElement.innerHTML.includes('spinner-border') || 
    contentElement.innerHTML.includes('답변을 생성하고 있습니다') ||
    contentElement.innerHTML.includes('Generating response') ||
    contentElement.innerHTML.includes('Generando respuesta')
  );
}

// 스트리밍 봇 메시지 생성
function createStreamingBotMessage(containerId, messageId, contentId, isPIP = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = isPIP ? 'd-flex align-items-start mb-4' : 'd-flex align-items-start mb-3';
  messageDiv.id = messageId;
  
  if (isPIP) {
    messageDiv.innerHTML = `
      <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
        <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-4 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">
              <span data-lang="KOR">분석결과 상담 AI</span>
              <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
              <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
            </strong>
            <span class="badge bg-success-subtle text-success">
              <span data-lang="KOR">온라인</span>
              <span data-lang="ENG" style="display: none;">Online</span>
              <span data-lang="ESP" style="display: none;">En línea</span>
            </span>
          </div>
          <div id="${contentId}">
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            <span data-lang="KOR">답변을 생성하고 있습니다...</span>
            <span data-lang="ENG" style="display: none;">Generating response...</span>
            <span data-lang="ESP" style="display: none;">Generando respuesta...</span>
          </div>
        </div>
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
        <i class="bi bi-robot text-white" style="font-size: 14px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded p-2 shadow-sm">
          <small class="text-muted d-block mb-1">
            <span data-lang="KOR">분석결과 상담 AI</span>
            <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
            <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
          </small>
          <p class="mb-0 small" id="${contentId}">
            <span class="spinner-border spinner-border-sm me-1" role="status"></span>
            <span data-lang="KOR">답변을 생성하고 있습니다...</span>
            <span data-lang="ENG" style="display: none;">Generating response...</span>
            <span data-lang="ESP" style="display: none;">Generando respuesta...</span>
          </p>
        </div>
      </div>
    `;
  }
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

// 통합 스트리밍 텍스트 추가 - 두 창 완전 동기화
function appendToCurrentBotMessage(chunk) {
  if (!isStreamingInProgress) {
    console.warn("스트리밍이 진행 중이 아님 - prepareBotMessage를 먼저 호출하세요");
    return;
  }
  
  // 첫 번째 청크인지 확인
  const isFirstChunk = chatbotCurrentBotMessageText === '';
  
  if (isFirstChunk) {
    chatbotCurrentBotMessageText = chunk;
  } else {
    chatbotCurrentBotMessageText += chunk;
  }
  
  // 마크다운 파싱
  const parsedContent = marked.parse(chatbotCurrentBotMessageText);
  
  // 사이드바 업데이트
  updateStreamingContent('botMessageContent', parsedContent, isFirstChunk, 'chatMessages');
  
  // PIP 업데이트 (완전히 동일한 내용)
  updateStreamingContent('pipBotMessageContent', parsedContent, isFirstChunk, 'pipChatMessages');
}

// 개별 스트리밍 콘텐츠 업데이트
function updateStreamingContent(contentId, parsedContent, isFirstChunk, containerId) {
  const contentElement = document.getElementById(contentId);
  const container = document.getElementById(containerId);
  
  if (!contentElement) {
    console.warn(`${contentId} 요소를 찾을 수 없음`);
    if (contentId === 'botMessageContent') {
      // 사이드바에서 요소를 찾지 못하면 오류 메시지 표시
      console.error("사이드바 botMessageContent 요소를 찾을 수 없습니다!");
      addBotMessage(`스트리밍 처리 오류가 발생했습니다.`);
    }
    return;
  }
  
  // 콘텐츠 업데이트 (완전히 동일한 내용)
  contentElement.innerHTML = parsedContent;
  
  // 스크롤 아래로
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// 통합 봇 메시지 완료 처리 - 공유 배열에 저장
function finalizeBotMessage() {
  if (!isStreamingInProgress || !chatbotCurrentBotMessageText) {
    return;
  }
  
  // 완료된 메시지를 공유 배열에 저장
  const messageData = {
    id: currentBotMessageId,
    type: 'bot',
    content: chatbotCurrentBotMessageText,
    completed: true,
    timestamp: new Date()
  };
  sharedMessages.push(messageData);
  
  // 현재 스트리밍 메시지 정리
  const currentMessage = document.getElementById('currentBotMessage');
  const currentPIPMessage = document.getElementById('currentPIPBotMessage');
  const mainContentElement = document.getElementById('botMessageContent');
  const pipContentElement = document.getElementById('pipBotMessageContent');
  
  // 메시지 컨테이너와 콘텐츠 요소의 ID 제거 (히스토리로 남기지만 ID 충돌 방지)
  if (currentMessage) {
    currentMessage.removeAttribute('id');
    currentMessage.classList.add('chat-message'); // 히스토리 메시지로 표시
  }
  if (currentPIPMessage) {
    currentPIPMessage.removeAttribute('id');
    currentPIPMessage.classList.add('chat-message'); // 히스토리 메시지로 표시
  }
  
  // 콘텐츠 요소 ID도 제거하여 다음 메시지와 충돌 방지
  if (mainContentElement) {
    mainContentElement.removeAttribute('id');
  }
  if (pipContentElement) {
    pipContentElement.removeAttribute('id');
  }
  
  // 스트리밍 상태 초기화
  isStreamingInProgress = false;
  currentBotMessageId = null;
  chatbotCurrentBotMessageText = '';
  pipCurrentBotMessageText = ''; // 호환성을 위해 유지
  
  // PIP 히스토리 업데이트
  setTimeout(() => {
    if (typeof window.updatePIPChatHistory === 'function') {
      window.updatePIPChatHistory();
    }
  }, 100);
}

// 봇 메시지 추가 (오류 등)
function addBotMessage(message) {
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'd-flex align-items-start mb-3';
  messageDiv.innerHTML = `
    <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
      <i class="bi bi-robot text-white" style="font-size: 14px;"></i>
    </div>
    <div class="flex-grow-1">
      <div class="bg-white rounded p-2 shadow-sm">
        <small class="text-muted d-block mb-1">
          <span data-lang="KOR">분석결과 상담 AI</span>
          <span data-lang="ENG" style="display: none;">Analysis Consultation AI</span>
          <span data-lang="ESP" style="display: none;">IA de Consulta de Análisis</span>
        </small>
        <div class="mb-0 small">${marked.parse(message)}</div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// PIP 추천 질문 입력 (기본 챗봇용)
function fillPIPExampleQuestion(question) {
  const chatInput = document.getElementById('chatInput');
  const pipChatInput = document.getElementById('pipChatInput');
  
  if (chatInput) {
    chatInput.value = question;
    chatInput.focus();
  }
  if (pipChatInput) {
    pipChatInput.value = question;
    pipChatInput.focus();
  }
}

// 다국어 추천 질문 입력
function fillPIPExampleQuestionWithLang(type) {
  const lang = getCurrentLanguage();
  let question = '';
  
  const questions = {
    survival: {
      ko: '이 상권의 생존 확률이 높은 이유는 무엇인가요?',
      en: 'What are the reasons for the high survival probability of this commercial area?',
      es: '¿Cuáles son las razones de la alta probabilidad de supervivencia de esta área comercial?'
    },
    competition: {
      ko: '경쟁업체가 많은 편인가요?',
      en: 'Are there many competitors in this area?',
      es: '¿Hay muchos competidores en esta área?'
    },
    precautions: {
      ko: '창업 시 주의해야 할 점은 무엇인가요?',
      en: 'What should I be careful about when starting a business?',
      es: '¿De qué debo tener cuidado al iniciar un negocio?'
    }
  };
  
  question = questions[type] ? questions[type][lang] || questions[type].ko : '';
  
  if (question) {
    fillPIPExampleQuestion(question);
  }
}

// PIP 모달에서 현재 선택된 모드 가져오기
function getCurrentPIPMode() {
  const llmMode = document.getElementById('pipLlmMode');
  const ragMode = document.getElementById('pipRagMode');
  
  if (llmMode && llmMode.checked) {
    return 'llm';
  } else if (ragMode && ragMode.checked) {
    return 'rag';
  }
  
  return 'llm'; // 기본값
}

// PIP 모드 변경 시 설명 업데이트
function updatePIPModeDescription() {
  const mode = getCurrentPIPMode();
  const lang = getCurrentLanguage();
  const modeDescElement = document.getElementById('pipModeDescription');
  
  if (!modeDescElement) return;
  
  // 기존 텍스트 초기화
  modeDescElement.innerHTML = '';
  
  let descriptions;
  if (mode === 'llm') {
    descriptions = {
      ko: 'LLM 모드: 직접 AI 모델 연결',
      en: 'LLM Mode: Direct AI model connection',
      es: 'Modo LLM: Conexión directa al modelo de IA'
    };
  } else {
    descriptions = {
      ko: 'RAG 모드: 벡터DB 기반 지식 검색',
      en: 'RAG Mode: Vector DB-based knowledge search',
      es: 'Modo RAG: Búsqueda de conocimiento basada en BD vectorial'
    };
  }
  
  // 모든 언어 span 생성
  Object.keys(descriptions).forEach((langCode, index) => {
    const span = document.createElement('span');
    span.setAttribute('data-lang', langCode.toUpperCase());
    span.textContent = descriptions[langCode];
    
    if (langCode !== lang) {
      span.style.display = 'none';
    }
    
    modeDescElement.appendChild(span);
  });
  
  console.log(`📱 PIP 모드 설명 업데이트: ${mode} (${lang})`);
}

// PIP 모달의 다국어 요소 업데이트
function updatePIPModalLanguage() {
  const lang = getCurrentLanguage();
  
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
  
  // 모든 다국어 스팬 요소 업데이트
  const langElements = document.querySelectorAll('#chatbotPIPModal [data-lang]');
  langElements.forEach(element => {
    const elementLang = element.getAttribute('data-lang').toLowerCase();
    if (elementLang === 'kor' && lang === 'ko') {
      element.style.display = '';
    } else if (elementLang === 'eng' && lang === 'en') {
      element.style.display = '';
    } else if (elementLang === 'esp' && lang === 'es') {
      element.style.display = '';
    } else {
      element.style.display = 'none';
    }
  });
  
  // 모드 설명 업데이트
  updatePIPModeDescription();
  
  // 분석 요약 업데이트 (다국어화 반영)
  updatePIPAnalysisSummary();
  
  console.log(`📱 PIP 모달 언어 업데이트 완료: ${lang}`);
}

// ===========================================
// PIP (Picture-in-Picture) 모달 관리
// ===========================================

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
  syncPIPInputFields();
  
  // 이벤트 리스너 추가
  setupPIPEventListeners();
  
  // 다국어 언어 업데이트
  updatePIPModalLanguage();
  
  // 스크롤을 맨 아래로
  setTimeout(() => {
    if (pipChatMessages) {
      pipChatMessages.scrollTop = pipChatMessages.scrollHeight;
    }
  }, 100);
}

// PIP 모달 HTML 생성 - 다국어 지원 및 모드 토글 포함
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
            <!-- PIP 모드 토글 -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="d-flex align-items-center">
                <span class="me-3">
                  <i class="bi bi-gear me-1"></i>
                  <small class="text-muted">
                    <span data-lang="KOR">모드 선택</span>
                    <span data-lang="ENG" style="display: none;">Mode Selection</span>
                    <span data-lang="ESP" style="display: none;">Selección de Modo</span>
                  </small>
                </span>
                <div class="pip-mode-toggle-container">
                  <div class="pip-mode-toggle">
                    <input type="radio" id="pipLlmMode" name="pipChatMode" value="llm" checked>
                    <label for="pipLlmMode" class="pip-mode-label">
                      <i class="bi bi-cpu me-1"></i>
                      <span data-lang="KOR">LLM</span>
                      <span data-lang="ENG" style="display: none;">LLM</span>
                      <span data-lang="ESP" style="display: none;">LLM</span>
                    </label>
                    
                    <input type="radio" id="pipRagMode" name="pipChatMode" value="rag">
                    <label for="pipRagMode" class="pip-mode-label">
                      <i class="bi bi-database me-1"></i>
                      <span data-lang="KOR">RAG</span>
                      <span data-lang="ENG" style="display: none;">RAG</span>
                      <span data-lang="ESP" style="display: none;">RAG</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

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
                <span id="pipModeDescription">
                  <span data-lang="KOR">LLM 모드: 직접 AI 모델 연결</span>
                  <span data-lang="ENG" style="display: none;">LLM Mode: Direct AI model connection</span>
                  <span data-lang="ESP" style="display: none;">Modo LLM: Conexión directa al modelo de IA</span>
                </span>
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
          <div class="p-3" style="max-height: calc(100vh - 175px); overflow-y: auto;">
            <!-- 추천 질문 버튼 -->
            <div class="mb-4">
              <h6 class="text-primary mb-3">
                💡 <span data-lang="KOR">추천 질문</span>
                <span data-lang="ENG" style="display: none;">Suggested Questions</span>
                <span data-lang="ESP" style="display: none;">Preguntas Sugeridas</span>
              </h6>
              <div class="d-grid gap-2">
                <button class="btn btn-sm btn-outline-primary" onclick="fillPIPExampleQuestionWithLang('survival')">
                  <i class="bi bi-graph-up me-2"></i>
                  <span data-lang="KOR">생존 확률</span>
                  <span data-lang="ENG" style="display: none;">Survival Rate</span>
                  <span data-lang="ESP" style="display: none;">Tasa de Supervivencia</span>
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="fillPIPExampleQuestionWithLang('competition')">
                  <i class="bi bi-shop me-2"></i>
                  <span data-lang="KOR">경쟁 현황</span>
                  <span data-lang="ENG" style="display: none;">Competition Status</span>
                  <span data-lang="ESP" style="display: none;">Estado de la Competencia</span>
                </button>
                <button class="btn btn-sm btn-outline-success" onclick="fillPIPExampleQuestionWithLang('precautions')">
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

// PIP 입력 필드 상태 동기화
function syncPIPInputFields() {
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
  const pipLlmMode = document.getElementById('pipLlmMode');
  const pipRagMode = document.getElementById('pipRagMode');
  
  // 채팅 입력 이벤트
  if (pipChatInput) {
    pipChatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendPIPMessage();
      }
    });
  }
  
  // 채팅 전송 버튼 이벤트
  if (pipChatSendBtn) {
    pipChatSendBtn.addEventListener('click', sendPIPMessage);
  }
  
  // PIP 모드 변경 이벤트
  if (pipLlmMode) {
    pipLlmMode.addEventListener('change', function() {
      if (this.checked) {
        updatePIPModeDescription();
        console.log('📱 PIP 모드 변경: LLM');
      }
    });
  }
  
  if (pipRagMode) {
    pipRagMode.addEventListener('change', function() {
      if (this.checked) {
        updatePIPModeDescription();
        console.log('📱 PIP 모드 변경: RAG');
      }
    });
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

// PIP 챗봇 메시지 전송 (모드와 언어 지원)
// PIP에서 메시지 전송 - 통합 시스템 사용
async function sendPIPMessage() {
  
  const input = document.getElementById('pipChatInput');
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;
  
  // PIP 입력값을 메인 입력창에도 동기화
  const mainInput = document.getElementById('chatInput');
  if (mainInput) {
    mainInput.value = message;
  }
  
  // PIP 입력 초기화
  input.value = '';
  
  // 통합된 sendChatMessage 함수 호출 - 두 창 자동 동기화
  try {
    await sendChatMessage();
  } catch (error) {
    console.error('❌ PIP 메시지 전송 실패:', error);
    // 실패 시 원래 입력값 복원
    input.value = message;
    if (mainInput) {
      mainInput.value = '';
    }
  }
}

// ===========================================
// PIP 히스토리 및 세션 관리
// ===========================================

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
          <i class="bi bi-person-x text-secondary" style="font-size: 2rem;"></i>
          <p class="small mt-2 mb-0">${AI_ANALYZER_I18N.getTranslation('로그인이 필요합니다.')}</p>
        </div>
      `;
      return;
    }

    // 로딩 표시
    historyDiv.innerHTML = `
      <div class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm mb-2" role="status"></div>
        <p class="small mb-0">${AI_ANALYZER_I18N.getTranslation('채팅 기록을 불러오는 중...')}</p>
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
          <p class="small mt-2 mb-0">${AI_ANALYZER_I18N.getTranslation('아직 대화 기록이 없습니다.')}<br>${AI_ANALYZER_I18N.getTranslation('AI와 대화를 시작해보세요!')}</p>
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
        <p class="small mt-2 mb-0">${AI_ANALYZER_I18N.getTranslation('채팅 기록을 불러올 수 없습니다.')}<br>${AI_ANALYZER_I18N.getTranslation('잠시 후 다시 시도해주세요.')}</p>
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
          <p class="text-muted">${AI_ANALYZER_I18N.getTranslation('대화 기록을 불러오는 중...')}</p>
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
          messagesHTML += createUserMessageHTML(message.content);
        } else if (message.role === 'assistant') {
          messagesHTML += createBotMessageHTML(message.content);
        }
      });
    }

    if (messagesHTML === '') {
      messagesHTML = createWelcomeMessageHTML();
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
    const pipChatMessages = document.getElementById('pipChatMessages');
    if (pipChatMessages) {
      pipChatMessages.innerHTML = `
        <div class="text-center py-4">
          <i class="bi bi-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
          <h6>${AI_ANALYZER_I18N.getTranslation('대화 기록을 불러올 수 없습니다')}</h6>
          <p class="text-muted">${AI_ANALYZER_I18N.getTranslation('잠시 후 다시 시도해주세요.')}</p>
        </div>
      `;
    }
  }
}

// 시스템 프롬프트에서 사용자의 실제 질문만 추출
function extractUserQuestion(content) {
  // 다국어 시스템 프롬프트 패턴들
  const patterns = [
    /위 분석 결과를 바탕으로 다음 질문에 답변해주세요:\s*/,  // 한국어
    /Based on the above analysis results.*answer.*following question:\s*/i,  // 영어 (미래 대비)
    /Basándose en.*resultados.*análisis.*responda.*siguiente pregunta:\s*/i  // 스페인어 (미래 대비)
  ];
  
  // 각 패턴을 확인하여 매칭되는 것 찾기
  for (const pattern of patterns) {
    if (pattern.test(content)) {
      const parts = content.split(pattern);
      if (parts.length > 1 && parts[1].trim()) {
        return parts[1].trim();
      }
    }
  }
  
  // 어떤 패턴도 매칭되지 않으면 원본 그대로 반환
  return content;
}

// 사용자 메시지 HTML 생성
function createUserMessageHTML(content) {
  // 시스템 프롬프트 제거하고 실제 사용자 질문만 표시
  const userQuestion = extractUserQuestion(content);
  
  return `
    <div class="d-flex align-items-start mb-3">
      <div class="ms-auto d-flex align-items-start">
        <div class="bg-primary text-white rounded-3 p-3 shadow-sm me-2" style="max-width: 70%;">
          <p class="mb-0">${userQuestion}</p>
        </div>
        <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
          <i class="bi bi-person-fill text-white" style="font-size: 16px;"></i>
        </div>
      </div>
    </div>
  `;
}

// 봇 메시지 HTML 생성
function createBotMessageHTML(content) {
  const currentLanguage = getCurrentLanguage();
  
  const labels = {
    ko: { title: '분석결과 상담 AI', status: '온라인' },
    en: { title: 'Analysis Consultation AI', status: 'Online' },
    es: { title: 'IA de Consulta de Análisis', status: 'En línea' }
  };
  
  const label = labels[currentLanguage] || labels.ko;
  
  // 마크다운 처리
  const processedContent = typeof marked !== 'undefined' ? marked.parse(content) : content;
  
  return `
    <div class="d-flex align-items-start mb-3">
      <div class="bg-gradient bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px; min-width: 36px;">
        <i class="bi bi-robot text-white" style="font-size: 16px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-3 shadow-sm border" style="max-width: 85%;">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">${label.title}</strong>
            <span class="badge bg-success-subtle text-success">${label.status}</span>
          </div>
          <div class="message-content">${processedContent}</div>
        </div>
      </div>
    </div>
  `;
}

// 환영 메시지 HTML 생성 (다국어 지원)
function createWelcomeMessageHTML() {
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
      <h6 class="text-primary mb-2">📍 ${AI_ANALYZER_I18N.getTranslation('기본 정보')}</h6>
      <div class="small">
        <div class="mb-1">
          <strong>${AI_ANALYZER_I18N.getTranslation('주소:')}</strong> ${address}
        </div>
        <div class="mb-1">
          <strong>${AI_ANALYZER_I18N.getTranslation('업종:')}</strong> ${businessType}
        </div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-success mb-2">🎯 ${AI_ANALYZER_I18N.getTranslation('AI 생존 확률')}</h6>
      <div class="text-center">
        <div class="h4 text-primary mb-1">${survivalRate}</div>
        <div class="progress mb-2" style="height: 8px;">
          <div class="progress-bar ${getSurvivalBarClass(survivalRate)}" style="width: ${survivalRate}"></div>
        </div>
      </div>
    </div>

    <div class="mb-3">
      <h6 class="text-info mb-2">📊 ${AI_ANALYZER_I18N.getTranslation('핵심 지표')}</h6>
      <div class="row g-2 small">
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-primary">${lifePop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${AI_ANALYZER_I18N.getTranslation('생활인구')}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-warning">${workingPop}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${AI_ANALYZER_I18N.getTranslation('직장인구')}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-danger">${competitor}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${AI_ANALYZER_I18N.getTranslation('경쟁업체')}</div>
          </div>
        </div>
        <div class="col-6">
          <div class="bg-light rounded p-2 text-center">
            <div class="fw-bold text-secondary">${landValue}</div>
            <div class="text-muted" style="font-size: 0.75rem;">${AI_ANALYZER_I18N.getTranslation('공시지가')}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="alert alert-info py-2 px-3">
      <small>
        <i class="bi bi-info-circle me-1"></i>
        ${AI_ANALYZER_I18N.getTranslation('좌측 채팅에서 분석 결과에 대해 자세히 문의하실 수 있습니다.')}
      </small>
    </div>
  `;
}

// 생존 확률에 따른 진행바 클래스 반환
function getSurvivalBarClass(survivalRate) {
  const rate = parseInt(survivalRate.replace('%', ''));
  if (rate >= 80) return 'bg-success';
  if (rate >= 60) return 'bg-warning';
  return 'bg-danger';
}

// ===========================================
// PIP 메시지 전송은 analyze-pip.js에서 처리
// =========================================== 

// ===========================================
// 언어 및 다국어화 유틸리티
// ===========================================

// getCurrentLanguage 함수 간소화 - AI_ANALYZER_I18N 시스템과 연동
function getCurrentLanguage() {
  // 새로운 통합 시스템 사용
  if (window.getCurrentAILanguage) {
    return window.getCurrentAILanguage();
  }
  return 'ko'; // 백업
}

// 현재 선택된 챗봇 모드 가져오기
function getCurrentChatMode() {
  const llmMode = document.getElementById('analyzerLlmMode');
  const ragMode = document.getElementById('analyzerRagMode');
  
  if (llmMode && llmMode.checked) {
    return 'llm';
  } else if (ragMode && ragMode.checked) {
    return 'rag';
  }
  
  // 기본값 LLM 모드
  return 'llm';
}

// 언어별 컬렉션 이름 반환
function getCollectionNameByLanguage(language) {
  switch(language) {
    case 'en':
      return 'analysis_result_consultation_en';
    case 'es':
      return 'analysis_result_consultation_es';
    default:
      return 'analysis_result_consultation';
  }
}

// ===========================================
// 모드 변경 이벤트 리스너 설정
// ===========================================

// 모드 변경 이벤트 리스너 초기화
function setupModeChangeListeners() {
  const llmMode = document.getElementById('analyzerLlmMode');
  const ragMode = document.getElementById('analyzerRagMode');
  
  if (llmMode) {
    llmMode.addEventListener('change', function() {
      if (this.checked) {
        console.log('🧠 LLM 모드로 변경');
        // 선택적으로 알림 표시
        // addBotMessage('LLM 모드로 변경되었습니다.');
      }
    });
  }
  
  if (ragMode) {
    ragMode.addEventListener('change', function() {
      if (this.checked) {
        console.log('🗄️ RAG 모드로 변경');
        // 선택적으로 알림 표시
        // addBotMessage('RAG 모드로 변경되었습니다.');
      }
    });
  }
}

// 페이지 로드 시 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', function() {
  setupModeChangeListeners();
  
  // 언어 변경 감지를 위한 MutationObserver 설정
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const pipModal = document.getElementById('chatbotPIPModal');
        if (pipModal && pipModal.style.display !== 'none') {
          // PIP 모달이 열려있으면 다국어화 업데이트
          setTimeout(() => {
            updatePIPModalLanguage();
          }, 100);
        }
      }
    });
  });

  // 언어 요소들 감시
  const langElements = document.querySelectorAll('[data-lang]');
  langElements.forEach(element => {
    observer.observe(element, { attributes: true, attributeFilter: ['style'] });
  });
});

// ===========================================
// 윈도우 전역 함수 및 변수 할당 (PIP 접근용)
// ===========================================
window.sendChatMessage = sendChatMessage;
window.createNewChatSession = createNewChatSession;
window.addUserMessage = addUserMessage;
window.prepareBotMessage = prepareBotMessage;
window.addBotMessage = addBotMessage;
window.createContextualMessage = createContextualMessage;

// PIP 관련 함수들
window.openChatbotPIP = openChatbotPIP;
window.closeChatbotPIP = closeChatbotPIP;
window.minimizeChatbotPIP = minimizeChatbotPIP;
window.sendPIPMessage = sendPIPMessage;
window.updatePIPModalLanguage = updatePIPModalLanguage;
window.getCurrentPIPMode = getCurrentPIPMode;
window.updatePIPModeDescription = updatePIPModeDescription;
window.fillPIPExampleQuestionWithLang = fillPIPExampleQuestionWithLang;
window.updatePIPChatHistory = updatePIPChatHistory;
window.updatePIPAnalysisSummary = updatePIPAnalysisSummary;

// 언어 및 모드 유틸리티 함수들
window.getCurrentLanguage = getCurrentLanguage;
window.getCurrentChatMode = getCurrentChatMode;
window.getCollectionNameByLanguage = getCollectionNameByLanguage;

// 동적 변수를 위한 getter 함수들
Object.defineProperty(window, 'chatSocket', {
  get: function() { return chatSocket; },
  set: function(value) { chatSocket = value; }
});

Object.defineProperty(window, 'currentSessionId', {
  get: function() { return currentSessionId; },
  set: function(value) { currentSessionId = value; }
});