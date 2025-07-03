/**
 * AI Analyzer 메인 스크립트
 * analyze.html에서 사용되는 전체적인 초기화와 통합 관리를 담당
 */

class AnalyzerMain {
  constructor() {
    this.USER_ID = null;
    this.chatSocket = null;
    this.currentAnalysisData = null;
    this.currentSessionId = null;
    this.currentBotMessageText = '';
    this.pipChatManager = null;
    this.currentRequestId = null;
    
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    // Django 템플릿에서 전달받은 사용자 ID 설정
    this.USER_ID = document.querySelector('meta[name="user-id"]')?.content;
    
    // DOM 로드 완료 후 이벤트 바인딩
    this.bindEvents();
    
    // 챗봇 초기 상태 설정
    this.initializeChatbotState();
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // jQuery ready 이벤트
    $(window).on('load', () => {
      this._eventBind();
    });
  }

  /**
   * 페이지 내 이벤트 바인딩
   */
  _eventBind() {
    // 추가 이벤트 바인딩이 필요한 경우 여기에 작성
  }

  /**
   * 챗봇 초기 상태 설정
   */
  initializeChatbotState() {
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
    
    const statusElement = document.getElementById('chatbotStatus');
    if (statusElement) {
      // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
      if (window.AI_ANALYZER_I18N) {
        statusElement.textContent = AI_ANALYZER_I18N.translate('대기중');
      }
      statusElement.className = 'badge bg-secondary';
    }
  }

  /**
   * 챗봇 활성화 (분석 완료 후 호출)
   */
  activateChatbot(analysisData) {
    // 분석 데이터 저장
    this.currentAnalysisData = analysisData;
    
    // UI 상태 전환 - 비활성화 → 활성화
    const inactiveElement = document.getElementById('chatbotInactive');
    const activeElement = document.getElementById('chatbotActive');
    
    // 비활성화 상태 완전히 숨기기
    if (inactiveElement) {
      inactiveElement.style.setProperty('display', 'none', 'important');
      inactiveElement.style.visibility = 'hidden';
      inactiveElement.style.height = '0';
      inactiveElement.style.overflow = 'hidden';
    }
    
    // 활성화 상태 표시
    if (activeElement) {
      activeElement.style.setProperty('display', 'flex', 'important');
      activeElement.style.visibility = 'visible';
      activeElement.style.height = 'auto';
    }
    
    const statusElement = document.getElementById('chatbotStatus');
    if (statusElement) {
      // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
      if (window.AI_ANALYZER_I18N) {
        statusElement.textContent = AI_ANALYZER_I18N.translate('준비완료');
      }
      statusElement.className = 'badge bg-success';
    }
    
    // 입력 필드 활성화
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatInput) chatInput.disabled = false;
    if (chatSendBtn) chatSendBtn.disabled = false;
    
    // WebSocket 연결
    this.initializeChatSocket();
    
    // Enter 키 이벤트 리스너 추가
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendChatMessage();
        }
      });
    }
    
    // 전송 버튼 이벤트 리스너 추가
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', () => this.sendChatMessage());
    }
  }

  /**
   * WebSocket 초기화
   */
  initializeChatSocket() {
    if (!this.USER_ID || this.USER_ID === 'None' || this.USER_ID === '') return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chatbot/`;
    
    // WebSocket 연결 시도
    const connectionStatus = document.getElementById('chatConnectionStatus');
    if (connectionStatus) connectionStatus.style.display = 'block';
    
    this.chatSocket = new WebSocket(wsUrl);
    
    this.chatSocket.onopen = (e) => {
      // WebSocket 연결 완료
      if (connectionStatus) connectionStatus.style.display = 'none';
      
      const statusElement = document.getElementById('chatbotStatus');
      if (statusElement) {
        // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
        if (window.AI_ANALYZER_I18N) {
          statusElement.textContent = AI_ANALYZER_I18N.translate('연결됨');
        }
        statusElement.className = 'badge bg-success';
      }
    };
    
    this.chatSocket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // 챗봇 메시지 수신 처리
      
      if (data.chunk) {
        // 스트리밍 응답 처리
        this.appendToCurrentBotMessage(data.chunk);
      } else if (data.done) {
        // 응답 완료
        this.finalizeBotMessage();
        if (data.session_id) {
          this.currentSessionId = data.session_id;
        }
      } else if (data.error) {
        // 오류 처리
        this.addBotMessage('죄송합니다. 오류가 발생했습니다: ' + data.error);
      }
    };
    
    this.chatSocket.onclose = (e) => {
      // WebSocket 연결 종료
      const statusElement = document.getElementById('chatbotStatus');
      if (statusElement) {
        // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
        if (window.AI_ANALYZER_I18N) {
          statusElement.textContent = AI_ANALYZER_I18N.translate('연결끊김');
        }
        statusElement.className = 'badge bg-warning';
      }
    };
    
    this.chatSocket.onerror = (e) => {
      console.error('챗봇 WebSocket 오류:', e);
      const statusElement = document.getElementById('chatbotStatus');
      if (statusElement) {
        // AI_ANALYZER_I18N 시스템을 사용하여 다국어화
        if (window.AI_ANALYZER_I18N) {
          statusElement.textContent = AI_ANALYZER_I18N.translate('오류');
        }
        statusElement.className = 'badge bg-danger';
      }
    };
  }

  /**
   * 채팅 메시지 전송
   */
  async sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message || !this.chatSocket) return;
    
    // 새로운 세션이 필요한 경우 생성
    if (!this.currentSessionId) {
      try {
        await this.createNewChatSession();
      } catch (error) {
        console.error('세션 생성 실패:', error);
        this.addBotMessage('죄송합니다. 채팅 세션을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }
    
    // 사용자 메시지 추가
    this.addUserMessage(message);
    
    // 입력 필드 초기화
    input.value = '';
    
    // 분석 데이터를 포함한 컨텍스트 생성
    const contextualMessage = this.createContextualMessage(message);
    
    // WebSocket으로 메시지 전송
    this.chatSocket.send(JSON.stringify({
      user_id: this.USER_ID,
      session_id: this.currentSessionId,
      question: contextualMessage,
      collection: 'analysis_result_consultation'
    }));
    
    // 봇 응답 준비
    this.prepareBotMessage();
  }

  /**
   * 새로운 채팅 세션 생성
   */
  async createNewChatSession() {
    if (!this.USER_ID || this.USER_ID === 'None') {
      throw new Error('사용자 인증이 필요합니다');
    }

    // CSRF 토큰 가져오기
    const csrfToken = this.getCsrfToken();
    
    try {
      const response = await fetch(`/chatbot/sessions/${this.USER_ID}/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({})
      });

      console.log('세션 생성 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('세션 생성 실패 응답:', errorText);
        throw new Error(`세션 생성 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('세션 생성 응답 데이터:', data);
      
      if (data.status !== 'ok' || !data.session_id) {
        throw new Error('세션 생성 응답 오류: ' + JSON.stringify(data));
      }

      this.currentSessionId = data.session_id;
      console.log('새로운 채팅 세션 생성됨:', this.currentSessionId);
      
      // PIP 히스토리 업데이트
      setTimeout(() => {
        this.updatePIPChatHistory();
      }, 100);
      
    } catch (error) {
      console.error('세션 생성 상세 오류:', error);
      throw error;
    }
  }

  /**
   * CSRF 토큰 가져오기
   */
  getCsrfToken() {
    // 여러 방법으로 CSRF 토큰 시도
    let token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    
    if (!token) {
      // 메타 태그에서 시도
      token = document.querySelector('meta[name="csrf-token"]')?.content;
    }
    
    if (!token) {
      // 쿠키에서 시도
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
          token = decodeURIComponent(value);
          break;
        }
      }
    }
    
    return token || '';
  }

  /**
   * 컨텍스트가 포함된 메시지 생성
   */
  createContextualMessage(userMessage) {
    if (!this.currentAnalysisData) {
      return userMessage;
    }

    const context = `
분석 정보:
- 주소: ${this.currentAnalysisData.request?.address || '정보 없음'}
- 업종: ${this.getBusinessTypeName(this.currentAnalysisData.request?.business_type_id) || '정보 없음'}
- 면적: ${this.currentAnalysisData.request?.area || '정보 없음'}㎡
- 생활인구: ${Math.round(this.currentAnalysisData.result?.life_pop_300m || 0).toLocaleString()}명
- 직장인구: ${Math.round(this.currentAnalysisData.result?.working_pop_300m || 0).toLocaleString()}명
- 경쟁업체: ${this.currentAnalysisData.result?.competitor_300m || 0}개
        - AI 생존확률: ${(this.currentAnalysisData.result?.survival_percentage || 0).toFixed(1)}%
- 공시지가: ${this.formatLandValue(this.currentAnalysisData.result?.total_land_value || 0)}

사용자 질문: ${userMessage}

위 분석 정보를 바탕으로 사용자의 질문에 대해 전문적이고 구체적인 답변을 해주세요.`;
    
    return context;
  }

  /**
   * 사용자 메시지 추가
   */
  addUserMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'd-flex align-items-start mb-3 justify-content-end';
    messageDiv.innerHTML = `
      <div class="flex-grow-1 text-end me-2">
        <div class="bg-primary text-white rounded-3 p-3 shadow-sm d-inline-block" style="max-width: 80%;">
          <p class="mb-0">${this.escapeHtml(message)}</p>
        </div>
      </div>
      <div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
        <i class="bi bi-person text-white" style="font-size: 18px;"></i>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * 봇 응답 준비
   */
  prepareBotMessage() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
    const titles = {
      ko: '분석결과 상담 AI',
      en: 'Analysis Consultation AI', 
      es: 'IA de Consulta de Análisis'
    };
    
    const status = {
      ko: '온라인',
      en: 'Online',
      es: 'En línea'
    };
    
    const loadingMessages = {
      ko: '답변을 생성하고 있습니다...',
      en: 'Generating response...',
      es: 'Generando respuesta...'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'd-flex align-items-start mb-4';
    messageDiv.id = 'currentBotMessage';
    messageDiv.innerHTML = `
      <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
        <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-4 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">${titles[currentLang] || titles.ko}</strong>
            <span class="badge bg-success-subtle text-success">${status[currentLang] || status.ko}</span>
          </div>
          <div id="botMessageContent">
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            ${loadingMessages[currentLang] || loadingMessages.ko}
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * 현재 봇 메시지에 청크 추가
   */
  appendToCurrentBotMessage(chunk) {
    const contentElement = document.getElementById('botMessageContent');
    const pipContentElement = document.getElementById('pipBotMessageContent');
    
    if (contentElement && contentElement.innerHTML.includes('spinner-border')) {
      contentElement.innerHTML = '';
      this.currentBotMessageText = '';
    }
    
    if (pipContentElement && pipContentElement.innerHTML.includes('spinner-border')) {
      pipContentElement.innerHTML = '';
    }
    
    this.currentBotMessageText += chunk;
    
    if (contentElement) {
      contentElement.innerHTML = marked.parse(this.currentBotMessageText);
    }
    
    if (pipContentElement) {
      pipContentElement.innerHTML = marked.parse(this.currentBotMessageText);
    }
  }

  /**
   * 봇 메시지 완료 처리
   */
  finalizeBotMessage() {
    const currentMessage = document.getElementById('currentBotMessage');
    const currentPIPMessage = document.getElementById('currentPIPBotMessage');
    
    if (currentMessage) {
      currentMessage.id = '';
    }
    
    if (currentPIPMessage) {
      currentPIPMessage.id = '';
    }
    
    this.currentBotMessageText = '';
  }

  /**
   * 봇 메시지 추가 (에러 등의 경우)
   */
  addBotMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
    const titles = {
      ko: '분석결과 상담 AI',
      en: 'Analysis Consultation AI', 
      es: 'IA de Consulta de Análisis'
    };
    
    const status = {
      ko: '온라인',
      en: 'Online',
      es: 'En línea'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'd-flex align-items-start mb-4';
    messageDiv.innerHTML = `
      <div class="bg-gradient bg-primary rounded-circle me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; min-width: 40px;">
        <i class="bi bi-robot text-white" style="font-size: 18px;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="bg-white rounded-3 p-4 shadow-sm border">
          <div class="d-flex align-items-center mb-2">
            <strong class="text-primary me-2">${titles[currentLang] || titles.ko}</strong>
            <span class="badge bg-success-subtle text-success">${status[currentLang] || status.ko}</span>
          </div>
          <div>
            ${this.escapeHtml(message)}
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * 헬퍼 메서드들
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getBusinessTypeName(businessTypeId) {
    if (window.analyzerUtils) {
      return window.analyzerUtils.getBusinessTypeName(businessTypeId);
    }
    return '알 수 없음';
  }

  formatLandValue(value) {
    if (window.analyzerUtils) {
      return window.analyzerUtils.formatLandValue(value);
    }
    return '₩' + value.toLocaleString();
  }

  updatePIPChatHistory() {
    if (this.pipChatManager) {
      this.pipChatManager.updateHistory();
    }
  }
}

// 전역 인스턴스
window.AnalyzerMain = AnalyzerMain;
window.analyzerMain = null;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', function() {
  window.analyzerMain = new AnalyzerMain();
});

// 레거시 호환성을 위한 전역 함수들
function activateChatbot(analysisData) {
  if (window.analyzerMain) {
    window.analyzerMain.activateChatbot(analysisData);
  }
}

function sendChatMessage() {
  if (window.analyzerMain) {
    window.analyzerMain.sendChatMessage();
  }
}

function fillExampleQuestion(question) {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.value = question;
    chatInput.focus();
  }
} 