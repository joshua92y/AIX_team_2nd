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
    console.error("Error parsing user info JSON:", e);
  }

  const userId = currentUserInfo.user_id || 'anonymous_' + generateUUID();
  let currentSessionId = currentUserInfo.initial_session_id || null;

  let websocket = null;
  let currentStreamingMessageElement = null;
  let connectionAttempts = 0;
  const MAX_CONNECTION_ATTEMPTS = 5;

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
      // 첫 스트리밍 메시지 시 웰컴 메시지 숨기기
      const welcomeMessage = chatMessagesArea.querySelector('.chat-welcome-message');
      if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
      }
      
      currentStreamingMessageElement = displayMessage("", "assistant");
    }
    const bubble = currentStreamingMessageElement.querySelector(".message-bubble");
    if (bubble) {
      // ✅ 누적 Markdown -> HTML 재렌더링
      const currentText = bubble.textContent + chunk;
      bubble.innerHTML = marked.parse(currentText);
      scrollToBottom();
    }
  }
  
  function finalizeStreamingMessage() {
    // 최종 스트리밍 메시지를 채팅 리스트에 반영
    if (currentStreamingMessageElement) {
      const bubble = currentStreamingMessageElement.querySelector(".message-bubble");
      if (bubble && window.addChatMessage) {
        window.addChatMessage(bubble.textContent, "assistant", currentSessionId);
      }
    }
    currentStreamingMessageElement = null;
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
      displayNotification("챗봇에 연결되었습니다.", "info");
      connectionAttempts = 0;
    };

    websocket.onmessage = (event) => {
      hideTyping();
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          displayNotification(`오류: ${data.error}`, "error");
          finalizeStreamingMessage();
        } else if (data.chunk) {
          appendToStreamingMessage(data.chunk);
        } else if (data.done) {
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
          displayMessage(data.answer, "assistant");
          // 일반 응답 후에도 채팅 리스트 새로고침
          if (window.chatListManager && window.chatListManager.refreshChatList) {
            setTimeout(() => {
              window.chatListManager.refreshChatList();
            }, 500);
          }
        }
      } catch (e) {
        displayNotification("서버 응답 처리 중 오류", "error");
        finalizeStreamingMessage();
      }
    };

    websocket.onclose = () => {
      finalizeStreamingMessage();
      websocket = null;
      displayNotification("연결 끊김. 재연결 중...", "error");
      if (++connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        setTimeout(setupWebSocket, 2000 * connectionAttempts);
      }
    };

    websocket.onerror = () => {
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

    // 현재 선택된 채팅 ID 가져오기
    if (window.getCurrentChatId) {
      currentSessionId = window.getCurrentChatId();
    }

    const payload = { user_id: userId, session_id: currentSessionId || "", question: msg };
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
  messageInput.focus();
});
