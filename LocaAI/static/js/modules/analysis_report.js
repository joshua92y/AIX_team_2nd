import { fetchAnalysisDetail, fetchPdfData } from '../core/api.js';
import { showLoading, hideLoading, showMessage } from '../core/dom_utils.js';

/**
 * 분석 결과 렌더링
 */
export function renderAnalysisResult(analysisData) {
  const container = document.getElementById('analysisReportContainer');
  if (!container) return;

  container.innerHTML = createAnalysisReportHTML(analysisData);
  setupReportEventListeners();
}

/**
 * 분석 결과 HTML 생성
 */
function createAnalysisReportHTML(data) {
  return `
    <div class="analysis-report">
      <div class="report-header mb-4">
        <div class="d-flex justify-content-between align-items-center">
          <h4 class="mb-0">📊 상권 분석 결과</h4>
          <div class="btn-group">
            <button type="button" class="btn btn-outline-primary" id="refreshReportBtn">
              <i class="fas fa-sync-alt me-1"></i>새로고침
            </button>
            <button type="button" class="btn btn-outline-success" id="downloadPdfBtn">
              <i class="fas fa-download me-1"></i>PDF 다운로드
            </button>
          </div>
        </div>
        <hr>
        <div class="row">
          <div class="col-md-6">
            <p><strong>업종:</strong> ${data.business_type || 'N/A'}</p>
            <p><strong>주소:</strong> ${data.address || 'N/A'}</p>
          </div>
          <div class="col-md-6">
            <p><strong>면적:</strong> ${data.area || 'N/A'} ㎡</p>
            <p><strong>분석일:</strong> ${new Date(data.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div class="report-content">
        ${renderAnalysisSections(data)}
      </div>
    </div>
  `;
}

/**
 * 분석 섹션 렌더링
 */
function renderAnalysisSections(data) {
  const sections = [];

  // 상권 점수
  if (data.score) {
    sections.push(`
      <div class="analysis-section mb-4">
        <h5 class="section-title">🎯 상권 점수</h5>
        <div class="score-display">
          <div class="score-circle ${getScoreClass(data.score)}">
            <span class="score-number">${data.score}</span>
            <span class="score-label">점</span>
          </div>
          <div class="score-description">
            ${getScoreDescription(data.score)}
          </div>
        </div>
      </div>
    `);
  }

  // 상권 분석 결과
  if (data.analysis_result) {
    sections.push(`
      <div class="analysis-section mb-4">
        <h5 class="section-title">📋 상권 분석</h5>
        <div class="analysis-content">
          ${marked.parse(data.analysis_result)}
        </div>
      </div>
    `);
  }

  // 추천 사항
  if (data.recommendations) {
    sections.push(`
      <div class="analysis-section mb-4">
        <h5 class="section-title">💡 추천 사항</h5>
        <div class="recommendations-list">
          ${renderRecommendations(data.recommendations)}
        </div>
      </div>
    `);
  }

  // 위험 요소
  if (data.risk_factors) {
    sections.push(`
      <div class="analysis-section mb-4">
        <h5 class="section-title">⚠️ 주의 사항</h5>
        <div class="risk-factors-list">
          ${renderRiskFactors(data.risk_factors)}
        </div>
      </div>
    `);
  }

  // 시장 데이터
  if (data.market_data) {
    sections.push(`
      <div class="analysis-section mb-4">
        <h5 class="section-title">📈 시장 데이터</h5>
        <div class="market-data">
          ${renderMarketData(data.market_data)}
        </div>
      </div>
    `);
  }

  return sections.join('');
}

/**
 * 추천 사항 렌더링
 */
function renderRecommendations(recommendations) {
  if (Array.isArray(recommendations)) {
    return recommendations.map(rec => `
      <div class="recommendation-item">
        <i class="fas fa-check-circle text-success me-2"></i>
        ${rec}
      </div>
    `).join('');
  }
  return `<div class="recommendation-item">${recommendations}</div>`;
}

/**
 * 위험 요소 렌더링
 */
function renderRiskFactors(riskFactors) {
  if (Array.isArray(riskFactors)) {
    return riskFactors.map(risk => `
      <div class="risk-item">
        <i class="fas fa-exclamation-triangle text-warning me-2"></i>
        ${risk}
      </div>
    `).join('');
  }
  return `<div class="risk-item">${riskFactors}</div>`;
}

/**
 * 시장 데이터 렌더링
 */
function renderMarketData(marketData) {
  if (typeof marketData === 'object') {
    return Object.entries(marketData).map(([key, value]) => `
      <div class="market-data-item">
        <strong>${key}:</strong> ${value}
      </div>
    `).join('');
  }
  return `<div class="market-data-item">${marketData}</div>`;
}

/**
 * 점수 클래스 반환
 */
function getScoreClass(score) {
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-fair';
  return 'score-poor';
}

/**
 * 점수 설명 반환
 */
function getScoreDescription(score) {
  if (score >= 80) return '매우 좋은 상권입니다. 적극적으로 고려해보세요.';
  if (score >= 60) return '좋은 상권입니다. 신중하게 검토해보세요.';
  if (score >= 40) return '보통 수준의 상권입니다. 추가 검토가 필요합니다.';
  return '위험한 상권입니다. 신중한 판단이 필요합니다.';
}

/**
 * 리포트 이벤트 리스너 설정
 */
function setupReportEventListeners() {
  const refreshBtn = document.getElementById('refreshReportBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefreshReport);
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', handleDownloadPdf);
  }
}

/**
 * 리포트 새로고침
 */
async function handleRefreshReport() {
  const analysisId = getCurrentAnalysisId();
  if (!analysisId) {
    showMessage('error', '분석 ID를 찾을 수 없습니다.');
    return;
  }

  try {
    showLoading('분석 결과를 새로고침합니다...');
    const result = await fetchAnalysisDetail(analysisId);
    renderAnalysisResult(result);
    showMessage('success', '분석 결과가 업데이트되었습니다.');
  } catch (error) {
    console.error('리포트 새로고침 실패:', error);
    showMessage('error', '분석 결과 새로고침에 실패했습니다.');
  } finally {
    hideLoading();
  }
}

/**
 * PDF 다운로드
 */
async function handleDownloadPdf() {
  const analysisId = getCurrentAnalysisId();
  if (!analysisId) {
    showMessage('error', '분석 ID를 찾을 수 없습니다.');
    return;
  }

  try {
    showLoading('PDF를 생성합니다...');
    const pdfData = await fetchPdfData(analysisId);
    
    // PDF 생성 및 다운로드
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // PDF 내용 구성
    doc.setFontSize(20);
    doc.text('LocaAI 상권 분석 리포트', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`분석 ID: ${analysisId}`, 20, 40);
    doc.text(`생성일: ${new Date().toLocaleDateString()}`, 20, 50);
    
    // 분석 결과 내용 추가
    const container = document.getElementById('analysisReportContainer');
    const textContent = container.textContent || container.innerText;
    
    const splitText = doc.splitTextToSize(textContent, 170);
    doc.text(splitText, 20, 70);
    
    // PDF 다운로드
    doc.save(`상권분석_${analysisId}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showMessage('success', 'PDF가 성공적으로 다운로드되었습니다.');
  } catch (error) {
    console.error('PDF 다운로드 실패:', error);
    showMessage('error', 'PDF 생성에 실패했습니다.');
  } finally {
    hideLoading();
  }
}

/**
 * 현재 분석 ID 가져오기
 */
function getCurrentAnalysisId() {
  // URL에서 분석 ID 추출하거나 세션에서 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('analysis_id') || sessionStorage.getItem('currentAnalysisId');
}
