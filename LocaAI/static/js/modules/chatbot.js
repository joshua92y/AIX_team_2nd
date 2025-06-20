import { sendMessage } from '../core/api.js';
import { showTypingIndicator, hideTypingIndicator } from '../core/dom_utils.js';

let currentSessionId = null;

/**
 * 채팅 인터페이스 초기화
 */
export function initChatInput() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const chatMessagesArea = document.getElementById('chatMessagesArea');

  if (!messageInput || !sendButton || !chatMessagesArea) {
    console.error('채팅 인터페이스 요소를 찾을 수 없습니다.');
    return;
  }

  // 메시지 전송 이벤트
  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // 텍스트 영역 자동 높이 조정
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
  });
}

/**
 * 메시지 전송 처리
 */
async function handleSendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();

  if (!message) return;

  // 사용자 메시지 표시
  addMessageToChat('user', message);
  messageInput.value = '';
  messageInput.style.height = 'auto';

  try {
    showTypingIndicator();
    
    const response = await sendMessage(message, currentSessionId);
    
    if (response.session_id && !currentSessionId) {
      currentSessionId = response.session_id;
    }
    
    // AI 응답 표시
    if (response.message) {
      addMessageToChat('assistant', response.message);
    }
    
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    addMessageToChat('error', '메시지 전송에 실패했습니다. 다시 시도해주세요.');
  } finally {
    hideTypingIndicator();
  }
}

/**
 * 채팅 메시지 추가
 */
function addMessageToChat(sender, message) {
  const chatMessagesArea = document.getElementById('chatMessagesArea');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message-entry ${sender}-message`;
  
  const bubbleClass = sender === 'user' ? 'user-bubble' : 'assistant-bubble';
  const iconClass = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
  
  messageDiv.innerHTML = `
    <div class="message-bubble ${bubbleClass}">
      <i class="${iconClass} me-2"></i>
      ${sender === 'assistant' ? marked.parse(message) : message}
    </div>
  `;
  
  chatMessagesArea.appendChild(messageDiv);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

/**
 * 세션 ID 설정
 */
export function setCurrentSession(sessionId) {
  currentSessionId = sessionId;
}

/**
 * 채팅 히스토리 로드
 */
export async function loadChatHistory(sessionId) {
  const chatMessagesArea = document.getElementById('chatMessagesArea');
  if (!chatMessagesArea) return;

  try {
    const history = await fetchChatHistory(sessionId);
    chatMessagesArea.innerHTML = '';
    
    history.forEach(msg => {
      addMessageToChat(msg.sender, msg.message);
    });
    
    currentSessionId = sessionId;
  } catch (error) {
    console.error('채팅 히스토리 로드 실패:', error);
  }
}
