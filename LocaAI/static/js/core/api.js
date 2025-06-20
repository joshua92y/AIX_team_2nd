// static/js/core/api.js

// ✅ 템플릿에서 JSON으로 전달된 유저 정보 가져오기
export function getUserInfoFromTemplate() {
    const el = document.getElementById("user-info-data");
    if (!el) return null;
    return JSON.parse(el.textContent);
  }
  
  // ✅ 공통 fetch wrapper
  export async function apiFetch(url, method = 'GET', body = null, headers = {}) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
    };
  
    if (body) {
      options.body = JSON.stringify(body);
    }
  
    const response = await fetch('/' + url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 요청 실패 (${response.status}): ${errorText}`);
    }
  
    return await response.json();
  }
  
  // ✅ 분석 세션 목록 불러오기 (최근 5개)
  export function fetchAnalysisList(userId) {
    return apiFetch(`chatbot/sessions/${userId}/`);
  }
  
  // ✅ 분석 세션 생성
  export function createAnalysisSession(userId) {
    return apiFetch(`chatbot/sessions/${userId}/create/`, 'POST');
  }
  
  // ✅ 분석 결과 상세 조회
  export function fetchAnalysisDetail(analysisId) {
    return apiFetch(`ai_analyzer/api/result/${analysisId}/`);
  }
  
  // ✅ 분석 결과 PDF 데이터 조회 (PDF 저장용)
  export function fetchPdfData(analysisId) {
    return apiFetch(`ai_analyzer/pdf-data/${analysisId}/`);
  }
  
  // ✅ 신규 상권 분석 요청
  export function submitNewAnalysis(data) {
    return apiFetch('ai_analyzer/analyze-business/', 'POST', data);
  }
  
  // ✅ 해당 분석 세션의 채팅 내역 조회
  export function fetchChatHistory(sessionId) {
    return apiFetch(`chatbot/chatlog/${sessionId}/`);
  }
  
  // ✅ 세션 제목 업데이트
  export function updateSessionTitle(userId, sessionId, newTitle) {
    return apiFetch(`chatbot/sessions/${userId}/${sessionId}/title/`, 'POST', { title: newTitle });
  }
  
  // ✅ 세션 삭제
  export function deleteSession(userId, sessionId) {
    return apiFetch(`chatbot/sessions/${userId}/${sessionId}/delete/`, 'POST');
  }

  // ✅ 채팅 메시지 전송
  export function sendMessage(message, sessionId = null) {
    const data = { message };
    if (sessionId) {
      data.session_id = sessionId;
    }
    return apiFetch('chatbot/send-message/', 'POST', data);
  }

  // ✅ 사용자별 채팅 히스토리 조회
  export function fetchUserChatHistory(userId, sessionId) {
    return apiFetch(`chatbot/chatlog/${userId}/${sessionId}/`);
  }

  // ✅ 분석 상태 확인
  export function checkAnalysisStatus(analysisId) {
    return apiFetch(`ai_analyzer/status/${analysisId}/`);
  }

  // ✅ 분석 결과 업데이트 확인
  export function checkAnalysisUpdates(analysisId, lastUpdate) {
    return apiFetch(`ai_analyzer/updates/${analysisId}/`, 'POST', { last_update: lastUpdate });
  }