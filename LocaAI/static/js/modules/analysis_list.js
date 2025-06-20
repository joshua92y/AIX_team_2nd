// analysis_list.js

import { fetchAnalysisList, fetchAnalysisDetail } from "./core/api.js";
import { renderAnalysisResult } from "./analysis_report.js";
import { loadChatHistoryForAnalysis } from "./chat_history.js";
import { toggleSection, showMessage } from "./core/dom_utils.js";
import { initNewAnalysisFlow } from "./new_analysis_flow.js";
import stateManager from "./state_manager.js";

export async function loadAnalysisList(userId) {
  const listContainer = document.getElementById("analysisList");
  const pagination = document.getElementById("analysisPagination");

  if (!userId) return false;

  try {
    const analysisList = await fetchAnalysisList(userId);
    renderAnalysisList(analysisList);
    return analysisList && analysisList.length > 0;
  } catch (error) {
    console.error("분석 리스트 로딩 실패:", error);
    return false;
  }
}

function renderAnalysisList(analyses) {
  const listContainer = document.getElementById("analysisList");
  const pagination = document.getElementById("analysisPagination");

  if (!analyses || analyses.length === 0) {
    listContainer.innerHTML = `
      <li class="list-group-item text-center text-muted">
        <i class="fas fa-inbox fa-2x mb-2"></i>
        <p>최근 분석이 없습니다.</p>
        <button class="btn btn-primary btn-sm" onclick="startNewAnalysis()">
          <i class="fas fa-plus me-1"></i>새로운 분석 시작
        </button>
      </li>
    `;
    pagination.innerHTML = "";
    return;
  }

  // 최근 5개만 표시
  const sliced = analyses.slice(0, 5);
  listContainer.innerHTML = sliced.map(item => `
    <li class="list-group-item analysis-item" data-analysis-id="${item.id}">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <h6 class="mb-1">${item.title || '분석 요청'}</h6>
          <p class="mb-1 text-muted small">
            <i class="fas fa-map-marker-alt me-1"></i>${item.address || '주소 정보 없음'}
          </p>
          <p class="mb-1 text-muted small">
            <i class="fas fa-store me-1"></i>${item.business_type || '업종 정보 없음'}
          </p>
          <small class="text-muted">
            <i class="fas fa-clock me-1"></i>${new Date(item.created_at).toLocaleString()}
          </small>
        </div>
        <div class="ms-3">
          <button class="btn btn-outline-primary btn-sm" onclick="viewAnalysisDetail(${item.id})">
            <i class="fas fa-eye me-1"></i>상세보기
          </button>
        </div>
      </div>
    </li>
  `).join("");

  // 분석 항목 클릭 이벤트 추가
  listContainer.querySelectorAll('.analysis-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        const analysisId = item.dataset.analysisId;
        viewAnalysisDetail(analysisId);
      }
    });
  });

  pagination.innerHTML = ""; // 향후 페이지네이션 구현 시 여기에 추가 가능
}

/**
 * 분석 상세 보기
 */
export async function viewAnalysisDetail(analysisId) {
  try {
    stateManager.setLoading(true);
    
    // 분석 결과 로드
    const analysisData = await fetchAnalysisDetail(analysisId);
    
    // 상태 관리자에 현재 분석 설정
    stateManager.setCurrentAnalysis(analysisData);
    
    // 분석 리포트 섹션 표시
    toggleSection('analysis-report-section', true);
    toggleSection('analysis-chat-section', true);
    
    // 분석 결과 렌더링
    renderAnalysisResult(analysisData);
    
    // 채팅 히스토리 로드 (세션이 있는 경우)
    if (analysisData.session_id) {
      await loadChatHistoryForAnalysis(analysisData.session_id);
      stateManager.setCurrentSession({ id: analysisData.session_id });
    }
    
    // 분석 목록 섹션 숨김
    toggleSection('analysis-list-section', false);
    toggleSection('new-analysis-sequence', false);
    
    // 상태 업데이트
    stateManager.setActiveSection('analysis-detail');
    
    // URL 업데이트 (선택사항)
    const url = new URL(window.location);
    url.searchParams.set('analysis_id', analysisId);
    window.history.pushState({}, '', url);
    
  } catch (error) {
    console.error('분석 상세 보기 실패:', error);
    showMessage('error', '분석 결과를 불러오는데 실패했습니다.');
  } finally {
    stateManager.setLoading(false);
  }
}

/**
 * 새로운 분석 시작
 */
export function startNewAnalysis() {
  // 상태 초기화
  stateManager.reset();
  
  // 섹션 전환
  toggleSection('analysis-list-section', false);
  toggleSection('analysis-report-section', false);
  toggleSection('analysis-chat-section', false);
  toggleSection('new-analysis-sequence', true);
  
  // 상태 업데이트
  stateManager.setActiveSection('new-analysis');
  
  // URL 정리
  const url = new URL(window.location);
  url.searchParams.delete('analysis_id');
  window.history.pushState({}, '', url);
  
  // 새로운 분석 플로우 초기화
  initNewAnalysisFlow();
}

/**
 * 분석 목록으로 돌아가기
 */
export function backToAnalysisList() {
  // 섹션 전환
  toggleSection('analysis-report-section', false);
  toggleSection('analysis-chat-section', false);
  toggleSection('new-analysis-sequence', false);
  toggleSection('analysis-list-section', true);
  
  // 상태 업데이트
  stateManager.setActiveSection('analysis-list');
  
  // URL 정리
  const url = new URL(window.location);
  url.searchParams.delete('analysis_id');
  window.history.pushState({}, '', url);
}

// 전역 함수로 등록 (HTML에서 직접 호출할 수 있도록)
window.viewAnalysisDetail = viewAnalysisDetail;
window.startNewAnalysis = startNewAnalysis;
window.backToAnalysisList = backToAnalysisList;
