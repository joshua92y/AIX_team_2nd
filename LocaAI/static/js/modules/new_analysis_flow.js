import { submitNewAnalysis, fetchAnalysisDetail } from '../core/api.js';
import { validateAnalysisForm } from '../core/validator.js';
import { showLoading, hideLoading, showMessage } from '../core/dom_utils.js';
import { renderAnalysisResult } from './analysis_report.js';
import { loadChatHistoryForAnalysis } from './chat_history.js';
import { toggleSection } from '../core/dom_utils.js';
import stateManager from './state_manager.js';

/**
 * 새로운 분석 플로우 초기화
 */
export function initNewAnalysisFlow() {
  const newAnalysisSequence = document.getElementById('new-analysis-sequence');
  if (!newAnalysisSequence) return;

  // 분석 폼 HTML 생성
  newAnalysisSequence.innerHTML = createAnalysisFormHTML();
  
  // 이벤트 리스너 등록
  setupFormEventListeners();
}

/**
 * 분석 폼 HTML 생성
 */
function createAnalysisFormHTML() {
  return `
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">🏪 새로운 상권 분석</h5>
      </div>
      <div class="card-body">
        <form id="analysisForm">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="businessType" class="form-label">업종</label>
              <select class="form-select" id="businessType" name="business_type" required>
                <option value="">업종을 선택하세요</option>
                <option value="음식점">음식점</option>
                <option value="카페">카페</option>
                <option value="소매점">소매점</option>
                <option value="서비스업">서비스업</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label for="area" class="form-label">면적 (㎡)</label>
              <input type="number" class="form-control" id="area" name="area" 
                     min="1" max="1000" placeholder="면적을 입력하세요" required>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="address" class="form-label">주소</label>
              <div class="input-group">
                <input type="text" class="form-control" id="address" name="address" 
                       placeholder="주소를 입력하세요" readonly required>
                <button type="button" class="btn btn-outline-secondary" id="addressSearchBtn">
                  <i class="fas fa-search"></i>
                </button>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <label for="isLiquor" class="form-label">주류 판매 여부</label>
              <select class="form-select" id="isLiquor" name="is_liquor" required>
                <option value="">선택하세요</option>
                <option value="true">예</option>
                <option value="false">아니오</option>
              </select>
            </div>
          </div>
          
          <div class="row">
            <div class="col-md-6 mb-3">
              <label for="investmentAmount" class="form-label">투자 금액 (만원)</label>
              <input type="number" class="form-control" id="investmentAmount" name="investment_amount" 
                     min="0" placeholder="투자 금액을 입력하세요">
            </div>
            <div class="col-md-6 mb-3">
              <label for="expectedRevenue" class="form-label">예상 매출 (만원/월)</label>
              <input type="number" class="form-control" id="expectedRevenue" name="expected_revenue" 
                     min="0" placeholder="예상 매출을 입력하세요">
            </div>
          </div>
          
          <div class="text-center">
            <button type="submit" class="btn btn-primary btn-lg">
              <i class="fas fa-chart-line me-2"></i>상권 분석 시작
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * 폼 이벤트 리스너 설정
 */
function setupFormEventListeners() {
  const form = document.getElementById('analysisForm');
  const addressSearchBtn = document.getElementById('addressSearchBtn');
  
  if (form) {
    form.addEventListener('submit', handleAnalysisSubmit);
  }
  
  if (addressSearchBtn) {
    addressSearchBtn.addEventListener('click', openAddressSearch);
  }
}

/**
 * 주소 검색 팝업 열기
 */
function openAddressSearch() {
  new daum.Postcode({
    oncomplete: function(data) {
      document.getElementById('address').value = data.address;
    }
  }).open();
}

/**
 * 분석 제출 처리
 */
async function handleAnalysisSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const analysisData = Object.fromEntries(formData.entries());
  
  // 폼 검증
  const validationResult = validateAnalysisForm(analysisData);
  if (!validationResult.isValid) {
    showMessage('error', validationResult.message);
    return;
  }
  
  try {
    showLoading('상권 분석을 시작합니다...');
    stateManager.setLoading(true);
    
    const response = await submitNewAnalysis(analysisData);
    
    if (response.success) {
      showMessage('success', '분석이 성공적으로 시작되었습니다!');
      
      // 상태 관리자에 현재 분석 설정
      stateManager.setCurrentAnalysis(response);
      
      // 섹션 전환
      toggleSection('analysis-report-section', true);
      toggleSection('analysis-chat-section', true);
      toggleSection('new-analysis-sequence', false);
      
      // 분석 결과 로드
      await loadAnalysisResult(response.analysis_id);
      
      // 상태 업데이트
      stateManager.setActiveSection('analysis-detail');
      
      // URL 업데이트
      const url = new URL(window.location);
      url.searchParams.set('analysis_id', response.analysis_id);
      window.history.pushState({}, '', url);
      
    } else {
      showMessage('error', response.message || '분석 시작에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('분석 제출 실패:', error);
    showMessage('error', '분석 요청 중 오류가 발생했습니다.');
  } finally {
    hideLoading();
    stateManager.setLoading(false);
  }
}

/**
 * 분석 결과 로드
 */
async function loadAnalysisResult(analysisId) {
  try {
    const result = await fetchAnalysisDetail(analysisId);
    renderAnalysisResult(result);
    
    // 채팅 히스토리 로드 (세션이 있는 경우)
    if (result.session_id) {
      await loadChatHistoryForAnalysis(result.session_id);
      stateManager.setCurrentSession({ id: result.session_id });
    }
    
  } catch (error) {
    console.error('분석 결과 로드 실패:', error);
    showMessage('error', '분석 결과를 불러오는데 실패했습니다.');
  }
}
