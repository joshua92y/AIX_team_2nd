import { fetchChatHistory } from '../core/api.js';
import { showLoading, hideLoading, showMessage } from '../core/dom_utils.js';

/**
 * 채팅 히스토리 로드 및 표시
 */
export async function loadChatHistoryForAnalysis(sessionId) {
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  try {
    showLoading('채팅 히스토리를 불러오는 중...');
    
    const history = await fetchChatHistory(sessionId);
    renderChatHistory(history);
    
  } catch (error) {
    console.error('채팅 히스토리 로드 실패:', error);
    showMessage('error', '채팅 히스토리를 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

/**
 * 채팅 히스토리 렌더링
 */
function renderChatHistory(history) {
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="text-center text-muted py-4">
        <i class="fas fa-comments fa-2x mb-2"></i>
        <p>관련 대화 내용이 없습니다.</p>
      </div>
    `;
    return;
  }

  const historyHTML = history.map(msg => createChatMessageHTML(msg)).join('');
  container.innerHTML = `
    <div class="chat-history">
      <div class="chat-history-header mb-3">
        <h6 class="mb-0">
          <i class="fas fa-history me-2"></i>
          관련 대화 내용 (${history.length}개)
        </h6>
      </div>
      <div class="chat-messages">
        ${historyHTML}
      </div>
    </div>
  `;
}

/**
 * 채팅 메시지 HTML 생성
 */
function createChatMessageHTML(message) {
  const isUser = message.sender === 'user';
  const messageClass = isUser ? 'user-message' : 'assistant-message';
  const bubbleClass = isUser ? 'user-bubble' : 'assistant-bubble';
  const iconClass = isUser ? 'fas fa-user' : 'fas fa-robot';
  const time = new Date(message.timestamp).toLocaleTimeString();

  return `
    <div class="chat-message ${messageClass}">
      <div class="message-bubble ${bubbleClass}">
        <div class="message-header">
          <i class="${iconClass} me-2"></i>
          <small class="text-muted">${time}</small>
        </div>
        <div class="message-content">
          ${isUser ? message.content : marked.parse(message.content)}
        </div>
      </div>
    </div>
  `;
}

/**
 * 채팅 히스토리 섹션 표시/숨김
 */
export function toggleChatHistorySection(show = true) {
  const section = document.getElementById('analysis-chat-section');
  if (section) {
    section.style.display = show ? 'block' : 'none';
  }
}

/**
 * 채팅 히스토리 필터링
 */
export function filterChatHistory(keyword) {
  const messages = document.querySelectorAll('.chat-message');
  
  messages.forEach(msg => {
    const content = msg.textContent.toLowerCase();
    const matches = content.includes(keyword.toLowerCase());
    msg.style.display = matches ? 'block' : 'none';
  });
}

/**
 * 채팅 히스토리 검색 기능 추가
 */
export function addChatHistorySearch() {
  const container = document.getElementById('chatHistoryContainer');
  if (!container) return;

  const searchHTML = `
    <div class="chat-history-search mb-3">
      <div class="input-group">
        <input type="text" class="form-control" id="chatHistorySearch" 
               placeholder="대화 내용에서 검색...">
        <button class="btn btn-outline-secondary" type="button" id="clearSearchBtn">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;

  // 검색 입력창을 히스토리 헤더 앞에 삽입
  const historyHeader = container.querySelector('.chat-history-header');
  if (historyHeader) {
    historyHeader.insertAdjacentHTML('beforebegin', searchHTML);
  }

  // 검색 이벤트 리스너 추가
  const searchInput = document.getElementById('chatHistorySearch');
  const clearBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterChatHistory(e.target.value);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterChatHistory('');
    });
  }
}

/**
 * 채팅 히스토리 내보내기
 */
export function exportChatHistory(sessionId) {
  try {
    const container = document.getElementById('chatHistoryContainer');
    if (!container) return;

    const messages = container.querySelectorAll('.chat-message');
    const exportData = Array.from(messages).map(msg => {
      const isUser = msg.classList.contains('user-message');
      const content = msg.querySelector('.message-content').textContent;
      const time = msg.querySelector('.message-header small').textContent;
      
      return {
        sender: isUser ? '사용자' : 'AI',
        content: content,
        timestamp: time
      };
    });

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `chat_history_${sessionId}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    showMessage('success', '채팅 히스토리가 성공적으로 내보내졌습니다.');
  } catch (error) {
    console.error('채팅 히스토리 내보내기 실패:', error);
    showMessage('error', '채팅 히스토리 내보내기에 실패했습니다.');
  }
}

/**
 * 채팅 히스토리 통계 정보
 */
export function getChatHistoryStats(history) {
  if (!history || history.length === 0) {
    return {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      averageResponseTime: 0
    };
  }

  const userMessages = history.filter(msg => msg.sender === 'user').length;
  const assistantMessages = history.filter(msg => msg.sender === 'assistant').length;
  
  // 평균 응답 시간 계산
  let totalResponseTime = 0;
  let responseCount = 0;
  
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].sender === 'user' && history[i + 1].sender === 'assistant') {
      const responseTime = new Date(history[i + 1].timestamp) - new Date(history[i].timestamp);
      totalResponseTime += responseTime;
      responseCount++;
    }
  }

  const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

  return {
    totalMessages: history.length,
    userMessages,
    assistantMessages,
    averageResponseTime: Math.round(averageResponseTime / 1000) // 초 단위로 변환
  };
}
