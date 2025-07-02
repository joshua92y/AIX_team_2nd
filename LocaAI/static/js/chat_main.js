// 📁 chatbot/static/chatbot/js/chat_main.js

document.addEventListener("DOMContentLoaded", function () {
  const chatMessagesArea = document.getElementById("chatMessagesArea");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const typingIndicator = document.getElementById("typingIndicator");

  let currentUserInfo = {};
  try {
    const userInfoDataElement = document.getElementById("user-info-data");
    if (userInfoDataElement) {
      currentUserInfo = JSON.parse(userInfoDataElement.textContent);
      
    }
  } catch (e) {
    console.error("Error parsing user info JSON in chat_main.js:", e);
  }

  const userId = currentUserInfo.user_id || 'anonymous_' + generateUUID();
  let currentSessionId = currentUserInfo.initial_session_id || null;

  // 세션 ID가 없으면 새 세션 생성
  if (!currentSessionId) {
    fetch(`/chatbot/sessions/${userId}/create/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'ok') {
        currentSessionId = data.session_id;

      }
    })
    .catch(error => console.error("Error creating session in chat_main.js:", error));
  }

  let websocket = null;
  let currentStreamingMessageElement = null;
  let streamingTextContent = ""; // 실시간 스트리밍을 위한 텍스트 누적 변수
  let connectionAttempts = 0;
  const MAX_CONNECTION_ATTEMPTS = 5;
  let isWebSocketInitialized = false; // WebSocket 초기화 상태 추적

  function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  function getCurrentTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
  }

  function showTyping() {
    typingIndicator.style.display = 'flex';
    scrollToBottom();
  }

  function hideTyping() {
    typingIndicator.style.display = 'none';
  }

  // 현재 선택된 모드 가져오기 
  function getCurrentMode() {
    const llmMode = document.getElementById("llmMode");
    const ragMode = document.getElementById("ragMode");
    return llmMode && llmMode.checked ? "llm" : (ragMode && ragMode.checked ? "rag" : "llm");
  }

  function createMessageElement(content, type) {
    const entry = document.createElement("div");
    entry.className = `message-entry ${type}-message`;
  
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
  
    // ✅ Markdown 변환
    const htmlContent = marked.parse(content);
    bubble.innerHTML = htmlContent;
  
    const timestamp = document.createElement("div");
    timestamp.className = "message-timestamp";
    timestamp.textContent = getCurrentTimestamp();
  
    entry.appendChild(bubble);
    entry.appendChild(timestamp);
    return entry;
  }

  function displayMessage(content, type) {
    // 첫 메시지 전송 시 웰컴 메시지 숨기기
    const welcomeMessage = chatMessagesArea.querySelector('.chat-welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }
    
    const el = createMessageElement(content, type);
    chatMessagesArea.appendChild(el);
    scrollToBottom();
    
    return el;
  }

  function appendToStreamingMessage(chunk) {
    if (!currentStreamingMessageElement) {
      // 새로운 스트리밍 메시지 생성
      const messageId = Date.now();
      currentStreamingMessageElement = document.createElement('div');
      currentStreamingMessageElement.className = 'd-flex align-items-start mb-3';
      currentStreamingMessageElement.setAttribute('data-message-id', messageId);
      
      // 봇 메시지 HTML 구조
      currentStreamingMessageElement.innerHTML = `
        <div class="bg-primary rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
          <i class="bi bi-robot text-white" style="font-size: 14px;"></i>
        </div>
        <div class="flex-grow-1">
          <div class="bg-light rounded p-3 shadow-sm">
            <div class="d-flex align-items-center mb-2">
              <small class="text-muted">
                <span data-lang="KOR">ChatBot</span>
                <span data-lang="ENG" style="display: none;">ChatBot</span>
                <span data-lang="ESP" style="display: none;">ChatBot</span>
              </small>
              <span class="badge bg-success ms-2">
                <span data-lang="KOR">온라인</span>
                <span data-lang="ENG" style="display: none;">Online</span>
                <span data-lang="ESP" style="display: none;">En línea</span>
              </span>
            </div>
            <div class="message-content"></div>
          </div>
        </div>
      `;
      
      // 채팅 컨테이너에 추가
      const chatContainer = document.getElementById('messages');
      if (chatContainer) {
        chatContainer.appendChild(currentStreamingMessageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
    
    // 기존 메시지에 텍스트 추가
    const contentElement = currentStreamingMessageElement.querySelector('.message-content');
    if (contentElement) {
      streamingTextContent += chunk;
      contentElement.innerHTML = marked.parse(streamingTextContent);
      
      // 스크롤 아래로
      const chatContainer = document.getElementById('messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }
  
  function finalizeStreamingMessage() {
    if (currentStreamingMessageElement) {
      // 새 스트리밍 메시지 엘리먼트 생성
      currentStreamingMessageElement = document.createElement("div");
      currentStreamingMessageElement.className = "message-entry assistant-message";
      currentStreamingMessageElement.setAttribute("data-message-id", generateUUID()); // 디버깅용 ID 추가
      
      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      
      const timestamp = document.createElement("div");
      timestamp.className = "message-timestamp";
      timestamp.textContent = getCurrentTimestamp();
      
      currentStreamingMessageElement.appendChild(bubble);
      currentStreamingMessageElement.appendChild(timestamp);
      chatMessagesArea.appendChild(currentStreamingMessageElement);
      
      streamingTextContent = ""; // 텍스트 누적 초기화
    }
    
    const bubble = currentStreamingMessageElement.querySelector(".message-bubble");
    if (bubble) {
      // 텍스트 누적하고 마크다운 렌더링
      streamingTextContent += chunk;
      bubble.innerHTML = marked.parse(streamingTextContent);
      scrollToBottom();

    }
  }
  
  function finalizeStreamingMessage() {
    console.log("🏁 finalizeStreamingMessage 호출됨 - 현재 element:", !!currentStreamingMessageElement);
    
    // 최종 스트리밍 메시지를 채팅 리스트에 반영
    if (currentStreamingMessageElement) {
      const messageId = currentStreamingMessageElement.getAttribute("data-message-id");
      console.log("🔚 스트리밍 메시지 완료 - ID:", messageId);
      
      const bubble = currentStreamingMessageElement.querySelector(".message-bubble");
      if (bubble && window.addChatMessage) {
        window.addChatMessage(streamingTextContent, "assistant", currentSessionId);
      }
    }
    
    console.log("🧹 스트리밍 상태 초기화");
    currentStreamingMessageElement = null;
    streamingTextContent = "";
    hideTyping();
  }

  function displayNotification(msg, type = 'info') {
    const note = document.createElement("div");
    note.className = `chat-notification ${type}`;
    note.textContent = msg;
    chatMessagesArea.appendChild(note);
    scrollToBottom();
    if (type === 'error') setTimeout(() => note.remove(), 5000);
  }

  function setupWebSocket() {
    const wsScheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsScheme}//${window.location.host}/ws/chatbot/`;
    websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("🔗 WebSocket 연결됨");
      displayNotification("챗봇에 연결되었습니다.", "info");
      connectionAttempts = 0;
      
      // 초기 연결 시 user_id, session_id 전송
      if (!isWebSocketInitialized) {
        const initPayload = { 
          user_id: userId, 
          session_id: currentSessionId || "",
          language: "ko"
        };

        websocket.send(JSON.stringify(initPayload));
        isWebSocketInitialized = true;
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 WebSocket 메시지 수신:", data);
        
        if (data.error) {
          hideTyping();
          displayNotification(`오류: ${data.error}`, "error");
          finalizeStreamingMessage();
        } else if (data.chunk) {
          // 실시간 스트리밍 처리 - 타이핑은 계속 표시
          appendToStreamingMessage(data.chunk);
        } else if (data.done) {
          hideTyping();
          finalizeStreamingMessage();
          // 새 세션 ID가 생성되었을 때 채팅 리스트 매니저 업데이트
          if (data.session_id && currentSessionId !== data.session_id) {
            currentSessionId = data.session_id;
            if (window.updateCurrentChatId) {
              window.updateCurrentChatId(data.session_id);
            }
          }
          // 응답 완료 후 채팅 리스트 새로고침
          if (window.chatListManager && window.chatListManager.refreshChatList) {
            setTimeout(() => {
              window.chatListManager.refreshChatList();
            }, 500);
          }
        } else if (data.answer) {
          hideTyping();
          displayMessage(data.answer, "assistant");
          // 일반 응답 후에도 채팅 리스트 새로고침
          if (window.chatListManager && window.chatListManager.refreshChatList) {
            setTimeout(() => {
              window.chatListManager.refreshChatList();
            }, 500);
          }
        }
      } catch (e) {
        console.error("❌ WebSocket 메시지 처리 오류:", e);
        hideTyping();
        displayNotification("서버 응답 처리 중 오류", "error");
        finalizeStreamingMessage();
      }
    };

    websocket.onclose = (event) => {
      console.log("❌ WebSocket 연결 종료:", event.code, event.reason);
      finalizeStreamingMessage();
      websocket = null;
      isWebSocketInitialized = false;
      displayNotification("연결 끊김. 재연결 중...", "error");
      if (++connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        setTimeout(setupWebSocket, 2000 * connectionAttempts);
      }
    };

    websocket.onerror = (error) => {
      console.error("❌ WebSocket 오류:", error);
      hideTyping();
      finalizeStreamingMessage();
    };
  }

  function handleSendMessage() {
    const msg = messageInput.value.trim();
    if (!msg) return;

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      displayNotification("챗봇 연결이 불안정합니다.", "error");
      if (!websocket) setupWebSocket();
      return;
    }

    // 새 메시지 전송 전 스트리밍 상태 초기화

    if (currentStreamingMessageElement) {
      const oldMessageId = currentStreamingMessageElement.getAttribute("data-message-id");
      
      finalizeStreamingMessage();
    }
    currentStreamingMessageElement = null;
    streamingTextContent = "";
    console.log("🧹 메시지 전송 전 상태 초기화 완료");

    // 현재 선택된 채팅 ID 가져오기
    if (window.getCurrentChatId) {
      currentSessionId = window.getCurrentChatId();
    }

    // 현재 선택된 모드 가져오기
    const selectedMode = getCurrentMode();
    console.log("🎯 선택된 모드:", selectedMode);

    const payload = { 
      user_id: userId, 
      session_id: currentSessionId || "", 
      question: msg,
      mode: selectedMode,
      language: "ko"
    };
    
    console.log("📤 메시지 전송:", payload);
    websocket.send(JSON.stringify(payload));
    displayMessage(msg, "user");
    messageInput.value = "";
    messageInput.style.height = "auto";
    showTyping();
    
    // 사용자 메시지 전송 후 채팅 리스트 새로고침
    if (window.chatListManager && window.chatListManager.refreshChatList) {
      setTimeout(() => {
        window.chatListManager.refreshChatList();
      }, 500);
    }
  }

  // 모드 변경 시 알림 표시
  function setupModeChangeHandler() {
    const llmMode = document.getElementById("llmMode");
    const ragMode = document.getElementById("ragMode");
    
    if (llmMode) {
      llmMode.addEventListener("change", function() {
        if (this.checked) {
          console.log("🧠 LLM 모드로 변경");
          displayNotification("LLM 모드로 변경되었습니다.", "info");
        }
      });
    }
    
    if (ragMode) {
      ragMode.addEventListener("change", function() {
        if (this.checked) {
          console.log("🗄️ RAG 모드로 변경");
          displayNotification("RAG 모드로 변경되었습니다.", "info");
        }
      });
    }
  }

  // 툴팁 초기화
  function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  sendButton.addEventListener("click", handleSendMessage);
  messageInput.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 150) + "px";
  });

  setupWebSocket();
  setupModeChangeHandler();
  initializeTooltips();
  messageInput.focus();

  // ChatListManager 초기화를 여기서 수행하고 currentUserInfo 전달
  window.chatListManager = new ChatListManager(currentUserInfo);
});
