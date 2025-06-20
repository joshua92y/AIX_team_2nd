// modules/user_loader.js

import { getUserInfoFromTemplate } from './core/api.js';
import { loadAnalysisList } from './analysis_list.js';
import { initNewAnalysisFlow } from './new_analysis_flow.js';
import stateManager from './state_manager.js';

/**
 * 사용자 정보 로드 및 초기 분기 처리
 */
export function loadUserInfo() {
  const user = getUserInfoFromTemplate();
  
  if (user && user.id) {
    // 상태 관리자에 사용자 정보 설정
    stateManager.setCurrentUser(user);
    
    // 사용자 체크 섹션 표시
    const userCheckSection = document.getElementById("user-check-section");
    if (userCheckSection) {
      userCheckSection.style.display = "block";
    }
    
    // 분석 목록 로드
    loadAnalysisList(user.id)
      .then(hasRecentAnalyses => {
        if (hasRecentAnalyses) {
          const analysisListSection = document.getElementById("analysis-list-section");
          if (analysisListSection) {
            analysisListSection.style.display = "block";
          }
          stateManager.setActiveSection('analysis-list');
        } else {
          const newAnalysisSequence = document.getElementById("new-analysis-sequence");
          if (newAnalysisSequence) {
            newAnalysisSequence.style.display = "block";
          }
          stateManager.setActiveSection('new-analysis');
          initNewAnalysisFlow();
        }
      })
      .catch(error => {
        console.error("분석 목록 로딩 중 오류:", error);
        const newAnalysisSequence = document.getElementById("new-analysis-sequence");
        if (newAnalysisSequence) {
          newAnalysisSequence.style.display = "block";
        }
        stateManager.setActiveSection('new-analysis');
        initNewAnalysisFlow();
      });
  } else {
    console.warn("로그인된 사용자 없음");
    const newAnalysisSequence = document.getElementById("new-analysis-sequence");
    if (newAnalysisSequence) {
      newAnalysisSequence.style.display = "block";
    }
    stateManager.setActiveSection('new-analysis');
    initNewAnalysisFlow();
  }
}

/**
 * 사용자 정보 가져오기
 */
export function getCurrentUser() {
  return stateManager.getStateValue('currentUser');
}

/**
 * 사용자 로그인 상태 확인
 */
export function isUserLoggedIn() {
  const user = getCurrentUser();
  return user && user.id;
}
