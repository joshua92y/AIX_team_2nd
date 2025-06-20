import { loadUserInfo } from './modules/user_loader.js'
import { initChatInput } from './modules/chatbot.js'
import { exportChatHistory, addChatHistorySearch } from './modules/chat_history.js'
import stateManager from './modules/state_manager.js'

// 전역 함수들 노출
window.stateManager = stateManager;
window.exportChatHistory = exportChatHistory;
window.addChatHistorySearch = addChatHistorySearch;

document.addEventListener("DOMContentLoaded", () => {
  // 상태 관리자 초기화
  stateManager.loadFromStorage();
  stateManager.enableAutoSave();
  
  // 사용자 정보 로드 및 초기 진입 분기
  loadUserInfo();
  
  // 채팅창 초기화
  initChatInput();
  
  // URL 파라미터에서 분석 ID 확인
  const urlParams = new URLSearchParams(window.location.search);
  const analysisId = urlParams.get('analysis_id');
  
  if (analysisId) {
    // 분석 ID가 있으면 해당 분석 로드
    import('./modules/analysis_list.js').then(({ viewAnalysisDetail }) => {
      viewAnalysisDetail(analysisId);
    });
  }
  
  // 브라우저 뒤로가기/앞으로가기 처리
  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisId = urlParams.get('analysis_id');
    
    if (analysisId) {
      import('./modules/analysis_list.js').then(({ viewAnalysisDetail }) => {
        viewAnalysisDetail(analysisId);
      });
    } else {
      import('./modules/analysis_list.js').then(({ backToAnalysisList }) => {
        backToAnalysisList();
      });
    }
  });
});