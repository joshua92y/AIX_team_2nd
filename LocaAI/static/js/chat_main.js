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
  let currentSessionId = localStorage.getItem(`chat_session_id_${userId}`) || currentUserInfo.initial_session_id || generateUUID();
  localStorage.setItem(`chat_session_id_${userId}`, currentSessionId);

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
    const el = createMessageElement(content, type);
    chatMessagesArea.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendToStreamingMessage(chunk) {
    if (!currentStreamingMessageElement) {
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
          if (data.session_id && currentSessionId !== data.session_id) {
            currentSessionId = data.session_id;
            localStorage.setItem(`chat_session_id_${userId}`, currentSessionId);
          }
        } else if (data.answer) {
          displayMessage(data.answer, "assistant");
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

    const payload = { user_id: userId, session_id: currentSessionId || "", question: msg };
    websocket.send(JSON.stringify(payload));
    displayMessage(msg, "user");
    messageInput.value = "";
    messageInput.style.height = "auto";
    showTyping();
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
