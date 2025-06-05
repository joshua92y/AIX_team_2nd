/**
 * 채팅 리스트 관리 JavaScript (백엔드 연동 버전)
 * 채팅 히스토리 관리, 검색, 선택, 삭제 기능 - API 기반
 */

class ChatListManager {
  constructor() {
    this.currentChatId = null;
    this.chatList = [];
    this.userId = null;
    this.apiBaseUrl = '/chatbot/sessions';
    this.init();
  }

  init() {
    // 사용자 정보 가져오기
    this.getUserInfo();
    this.bindEvents();
    this.loadChatListFromAPI();
  }

  getUserInfo() {
    // HTML에서 사용자 정보 추출
    const userInfoElement = document.getElementById('user-info-data');
    if (userInfoElement) {
      try {
        const userInfo = JSON.parse(userInfoElement.textContent);
        this.userId = userInfo.user_id;
        this.currentChatId = userInfo.initial_session_id || null;
        console.log('사용자 정보 로드됨:', userInfo);
      } catch (error) {
        console.error('사용자 정보 파싱 오류:', error);
      }
    } else {
      console.error('사용자 정보 요소를 찾을 수 없습니다.');
    }
  }

  bindEvents() {
    // 새 채팅 시작 버튼
    const newChatButton = document.getElementById('newChatButton');
    if (newChatButton) {
      newChatButton.addEventListener('click', () => this.createNewChat());
    }

    // 채팅 검색
    const searchInput = document.getElementById('chatSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.searchChats(e.target.value));
    }

    // 사이드바 토글 (모바일)
    const toggleButton = document.getElementById('toggleSidebar');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggleSidebar());
    }

    // 채팅 리스트 아이템 클릭 이벤트 위임
    const chatListItems = document.getElementById('chatListItems');
    if (chatListItems) {
      chatListItems.addEventListener('click', (e) => this.handleChatListClick(e));
    }

    // 화면 크기 변경 시 사이드바 처리
    window.addEventListener('resize', () => this.handleResize());
  }

  handleChatListClick(e) {
    const chatItem = e.target.closest('.chat-list-item');
    const deleteButton = e.target.closest('.chat-item-actions button[data-action="delete"]');
    const editButton = e.target.closest('.chat-item-actions button[data-action="edit"]');

    if (deleteButton) {
      e.stopPropagation();
      const chatId = chatItem.dataset.chatId;
      this.deleteChat(chatId);
    } else if (editButton) {
      e.stopPropagation();
      const chatId = chatItem.dataset.chatId;
      this.editChatTitle(chatId);
    } else if (chatItem) {
      const chatId = chatItem.dataset.chatId;
      this.selectChat(chatId);
    }
  }

  async createNewChat() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${this.userId}/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        }
      });

      const data = await response.json();
      
      if (data.status === 'ok') {
        // 새 채팅을 리스트에 추가
        const newChat = {
          session_id: data.session_id,
          title: data.title || '새 채팅',
          preview: '새로운 대화를 시작해보세요...',
          created_at: data.created_at,
          lastload_at: data.created_at
        };
        
        this.chatList.unshift(newChat);
        this.renderChatList();
        this.selectChat(data.session_id);
        
        // 메시지 영역 초기화 및 웰컴 메시지 표시
        const messagesArea = document.getElementById('chatMessagesArea');
        if (messagesArea) {
          // 기존 메시지들 제거
          const messagesToRemove = messagesArea.querySelectorAll('.message-entry, .chat-notification');
          messagesToRemove.forEach(msg => msg.remove());
          
          // 웰컴 메시지 표시
          const welcomeMessage = messagesArea.querySelector('.chat-welcome-message');
          if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
          } else {
            this.showWelcomeMessage();
          }
        }
        
        console.log('새 채팅 생성됨:', data.session_id);
      } else {
        console.error('새 채팅 생성 실패:', data.message);
        alert('새 채팅을 생성할 수 없습니다.');
      }
    } catch (error) {
      console.error('새 채팅 생성 오류:', error);
      alert('새 채팅 생성 중 오류가 발생했습니다.');
    }
  }

  async selectChat(chatId) {
    this.currentChatId = chatId;
    
    // UI 업데이트
    document.querySelectorAll('.chat-list-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }

    // 선택된 채팅의 메시지 로드
    await this.loadChatMessages(chatId);
    
    // 모바일에서 사이드바 숨기기
    if (window.innerWidth <= 768) {
      this.hideSidebar();
    }
  }

  async loadChatMessages(chatId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${this.userId}/${chatId}/`);
      const data = await response.json();
      
      if (data.status === 'ok' && data.log) {
        const messagesArea = document.getElementById('chatMessagesArea');
        if (!messagesArea) return;

        // 웰컴 메시지는 보존하고 실제 메시지들만 삭제
        const messagesToRemove = messagesArea.querySelectorAll('.message-entry, .chat-notification');
        messagesToRemove.forEach(msg => msg.remove());
        
        // 웰컴 메시지 표시/숨김 처리
        const welcomeMessage = messagesArea.querySelector('.chat-welcome-message');
        if (data.log.length > 0) {
          if (welcomeMessage) welcomeMessage.style.display = 'none';
          
          data.log.forEach(message => {
            this.displayMessage(message.content, message.role, message.timestamp);
          });
        } else {
          if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
          } else {
            // 웰컴 메시지가 없으면 다시 생성
            this.showWelcomeMessage();
          }
        }

        // 스크롤을 맨 아래로
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }
    } catch (error) {
      console.error('채팅 메시지 로드 오류:', error);
    }
  }

  showWelcomeMessage() {
    const messagesArea = document.getElementById('chatMessagesArea');
    if (!messagesArea) return;

    const welcomeHTML = `
      <div class="chat-welcome-message text-center py-5">
        <div class="mb-3">
          <i class="fas fa-robot fa-3x text-primary"></i>
        </div>
        <h4 class="text-primary mb-3">LocaAI 챗봇에 오신 것을 환영합니다!</h4>
        <p class="text-muted mb-4">상권 분석과 관련된 질문을 자유롭게 해보세요.</p>
        <div class="row justify-content-center">
          <div class="col-md-8">
            <div class="card border-0 bg-light">
              <div class="card-body p-3">
                <h6 class="card-title text-primary mb-2">💡 예시 질문들</h6>
                <ul class="list-unstyled mb-0 text-start">
                  <li class="mb-1">• "강남역 주변 상권 분석해줘"</li>
                  <li class="mb-1">• "홍대 근처 카페 창업하려는데 어때?"</li>
                  <li class="mb-1">• "명동 유동인구 데이터 알려줘"</li>
                  <li>• "서울 핫플레이스 추천해줘"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    messagesArea.insertAdjacentHTML('afterbegin', welcomeHTML);
  }

  displayMessage(content, role, timestamp) {
    const messagesArea = document.getElementById('chatMessagesArea');
    if (!messagesArea) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-entry ${role}-message`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (role === 'assistant') {
      // 마크다운 렌더링 (marked.js 사용)
      if (typeof marked !== 'undefined') {
        bubbleDiv.innerHTML = marked.parse(content);
      } else {
        bubbleDiv.textContent = content;
      }
    } else {
      bubbleDiv.textContent = content;
    }

    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = timestamp || this.formatTime(new Date());

    messageDiv.appendChild(bubbleDiv);
    messageDiv.appendChild(timestampDiv);
    messagesArea.appendChild(messageDiv);
  }

  async editChatTitle(chatId) {
    const chat = this.chatList.find(c => c.session_id === chatId);
    if (!chat) return;

    const newTitle = prompt('새로운 제목을 입력하세요:', chat.title);
    if (newTitle && newTitle.trim() !== chat.title) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/${this.userId}/${chatId}/title/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.getCSRFToken()
          },
          body: JSON.stringify({ title: newTitle.trim() })
        });

        const data = await response.json();
        
        if (data.status === 'ok') {
          // 로컬 리스트 업데이트
          chat.title = data.title;
          this.renderChatList();
          console.log('채팅 제목 업데이트됨:', data.title);
        } else {
          alert('제목 변경에 실패했습니다: ' + data.message);
        }
      } catch (error) {
        console.error('제목 변경 오류:', error);
        alert('제목 변경 중 오류가 발생했습니다.');
      }
    }
  }

  async deleteChat(chatId) {
    if (confirm('이 채팅을 삭제하시겠습니까?')) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/${this.userId}/${chatId}/delete/`, {
          method: 'DELETE',
          headers: {
            'X-CSRFToken': this.getCSRFToken()
          }
        });

        const data = await response.json();
        
        if (data.status === 'ok') {
          // 로컬 리스트에서 제거
          this.chatList = this.chatList.filter(chat => chat.session_id !== chatId);
          this.renderChatList();
          
          // 삭제된 채팅이 현재 선택된 채팅이면 첫 번째 채팅 선택
          if (this.currentChatId === chatId) {
            if (this.chatList.length > 0) {
              this.selectChat(this.chatList[0].session_id);
            } else {
              this.currentChatId = null;
              const messagesArea = document.getElementById('chatMessagesArea');
              if (messagesArea) {
                messagesArea.innerHTML = '';
              }
            }
          }
          console.log('채팅 삭제됨:', chatId);
        } else {
          alert('채팅 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('채팅 삭제 오류:', error);
        alert('채팅 삭제 중 오류가 발생했습니다.');
      }
    }
  }

  async loadChatListFromAPI() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${this.userId}/`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        this.chatList = data.sessions || [];
        this.renderChatList();
        
        // 초기 채팅 선택
        if (this.currentChatId && this.chatList.find(c => c.session_id === this.currentChatId)) {
          this.selectChat(this.currentChatId);
        } else if (this.chatList.length > 0) {
          this.selectChat(this.chatList[0].session_id);
        }
      }
    } catch (error) {
      console.error('채팅 리스트 로드 오류:', error);
      // 오류 발생 시 빈 리스트로 시작
      this.chatList = [];
      this.renderChatList();
    }
  }

  searchChats(query) {
    const items = document.querySelectorAll('.chat-list-item');
    
    items.forEach(item => {
      const title = item.querySelector('.chat-item-title').textContent.toLowerCase();
      const preview = item.querySelector('.chat-item-preview').textContent.toLowerCase();
      const searchTerm = query.toLowerCase();
      
      if (title.includes(searchTerm) || preview.includes(searchTerm)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  toggleSidebar() {
    const sidebar = document.querySelector('.chat-list-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('show');
    }
  }

  hideSidebar() {
    const sidebar = document.querySelector('.chat-list-sidebar');
    if (sidebar) {
      sidebar.classList.remove('show');
    }
  }

  handleResize() {
    if (window.innerWidth > 768) {
      this.hideSidebar();
    }
  }

  renderChatList() {
    const chatListContainer = document.getElementById('chatListItems');
    if (!chatListContainer) return;

    chatListContainer.innerHTML = '';

    // 저장된 채팅 목록 렌더링
    this.chatList.forEach(chat => {
      const item = this.createChatListItem(chat, this.currentChatId === chat.session_id);
      chatListContainer.appendChild(item);
    });

    // 빈 상태 메시지
    if (this.chatList.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'chat-list-empty';
      emptyDiv.innerHTML = `
        <i class="fas fa-comments"></i>
        <h6>채팅 히스토리가 없습니다</h6>
        <p>새로운 채팅을 시작해보세요!</p>
      `;
      chatListContainer.appendChild(emptyDiv);
    }
  }

  createChatListItem(chat, isActive = false) {
    const itemDiv = document.createElement('div');
    itemDiv.className = `chat-list-item ${isActive ? 'active' : ''}`;
    itemDiv.dataset.chatId = chat.session_id;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'chat-item-info';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'chat-item-title';
    titleDiv.textContent = chat.title || '새 채팅';

    const previewDiv = document.createElement('div');
    previewDiv.className = 'chat-item-preview';
    previewDiv.textContent = chat.preview || '새로운 대화를 시작해보세요...';

    const dateDiv = document.createElement('div');
    dateDiv.className = 'chat-item-date';
    dateDiv.textContent = this.formatDate(chat.lastload_at || chat.created_at);

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(previewDiv);
    infoDiv.appendChild(dateDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'chat-item-actions';

    // 편집 버튼
    const editButton = document.createElement('button');
    editButton.className = 'btn btn-sm btn-outline-secondary me-1';
    editButton.title = '제목 편집';
    editButton.setAttribute('data-action', 'edit');
    editButton.innerHTML = '<i class="fas fa-edit"></i>';

    // 삭제 버튼
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-outline-danger';
    deleteButton.title = '채팅 삭제';
    deleteButton.setAttribute('data-action', 'delete');
    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';

    actionsDiv.appendChild(editButton);
    actionsDiv.appendChild(deleteButton);

    itemDiv.appendChild(infoDiv);
    itemDiv.appendChild(actionsDiv);

    return itemDiv;
  }

  formatDate(dateString) {
    if (!dateString) return '방금 전';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  }

  formatTime(date) {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
  }

  // 메시지 추가 (외부에서 호출) - 채팅 리스트 새로고침만 수행
  async addMessage(content, role, chatId = null) {
    // 채팅 리스트 새로고침 (미리보기 업데이트를 위해)
    if (role === 'user' || role === 'assistant') {
      setTimeout(() => {
        this.refreshChatList();
      }, 1000);
    }
  }

  async refreshChatList() {
    await this.loadChatListFromAPI();
  }

  // 현재 채팅 ID 반환
  getCurrentChatId() {
    return this.currentChatId;
  }

  // 새 세션 ID가 생성되었을 때 업데이트
  updateCurrentChatId(newChatId) {
    this.currentChatId = newChatId;
    this.refreshChatList();
  }
}

// 전역 인스턴스 생성
let chatListManager;

document.addEventListener('DOMContentLoaded', function() {
  chatListManager = new ChatListManager();
  window.chatListManager = chatListManager; // 전역 참조 추가
});

// 외부에서 접근 가능하도록 전역 함수 제공
window.addChatMessage = function(content, role, chatId = null) {
  if (chatListManager) {
    chatListManager.addMessage(content, role, chatId);
  }
};

window.getCurrentChatId = function() {
  return chatListManager ? chatListManager.getCurrentChatId() : null;
};

window.updateCurrentChatId = function(newChatId) {
  if (chatListManager) {
    chatListManager.updateCurrentChatId(newChatId);
  }
}; 