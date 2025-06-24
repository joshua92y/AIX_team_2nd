// static/js/ai_analyzer/analyze-explainable.js
// 회원용 XGBoost 설명 가능 AI 결과 표시 및 시각화

// ===========================================
// 전역 변수
// ===========================================
let featureImportanceChart = null;

// ===========================================
// AI 설명 결과 표시 함수
// ===========================================

/**
 * 회원/비회원에 따른 AI 분석 결과 섹션 업데이트
 */
function updateAIAnalysisSection(result) {
  const analysisSection = $('#survivalAnalysis');
  const isMember = result.is_member_analysis || false;
  
  if (isMember && result.ai_summary) {
    // 회원: ChatGPT 기반 AI 설명
    const detailButtonHtml = `
      <div class="mt-3">
        <button class="btn btn-outline-primary btn-sm" onclick="showDetailedAnalysis()">
          <i class="fas fa-chart-bar me-2"></i>자세히 보기
        </button>
      </div>
    `;
    
    analysisSection.removeClass('alert-success alert-warning alert-danger')
      .addClass('alert alert-info')
      .html(`
        <div>
          <strong><i class="fas fa-robot me-2"></i>AI 분석 결과:</strong> 
          <span>${result.ai_summary}</span>
        </div>
        ${detailButtonHtml}
      `);
      
    window.currentAnalysisData = result;
    
  } else {
    // 비회원: 기존 하드코딩된 메시지
    const survivalPercent = result.survival_percentage || 0;
    let barClass = 'bg-danger';
    let analysisText = '';
    
    if (survivalPercent >= 80) {
      barClass = 'bg-success';
      analysisText = '이 위치는 매우 좋은 사업 환경을 가지고 있습니다.';
    } else if (survivalPercent >= 60) {
      barClass = 'bg-warning';
      analysisText = '이 위치는 적당한 사업 환경을 가지고 있습니다.';
    } else if (survivalPercent >= 40) {
      barClass = 'bg-warning';
      analysisText = '이 위치는 도전적인 사업 환경입니다.';
    } else {
      analysisText = '이 위치는 높은 위험을 가지고 있습니다.';
    }
    
    analysisSection.removeClass('alert-success alert-warning alert-danger alert-info')
      .addClass('alert alert-' + barClass.split('-')[1])
      .html('<strong>분석 결과:</strong> ' + analysisText);
  }
}

/**
 * 상세 분석 모달 표시
 */
function showDetailedAnalysis() {
  if (!window.currentAnalysisData) return;
  
  const data = window.currentAnalysisData;
  const modalHtml = `
    <div class="modal fade" id="detailAnalysisModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">XGBoost AI 상세 분석 결과</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-lg-7">
                <div class="card">
                  <div class="card-header">AI 분석 리포트</div>
                  <div class="card-body">
                    <div style="line-height: 1.6; max-height: 400px; overflow-y: auto;">
                      ${(data.ai_explanation || '분석 중...').replace(/\n/g, '<br>')}
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header">주요 피쳐 분석</div>
                  <div class="card-body">
                    <canvas id="featureChart" width="400" height="300"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  $('#detailAnalysisModal').remove();
  $('body').append(modalHtml);
  
  const modal = new bootstrap.Modal(document.getElementById('detailAnalysisModal'));
  modal.show();
  
  setTimeout(() => drawChart(data), 500);
}

function drawChart(data) {
  const ctx = document.getElementById('featureChart');
  if (!ctx) return;
  
  if (featureImportanceChart) {
    featureImportanceChart.destroy();
  }
  
  const features = [
    { name: '생활인구', value: (data['1A_Total'] || 0) / 1000 },
    { name: '직장인구', value: (data['Working_Pop'] || 0) / 1000 },
    { name: '경쟁업체', value: data['Competitor_C'] || 0 },
    { name: '토지가치', value: (data['Total_LV'] || 0) / 10000000 },
    { name: '업종다양성', value: data['Business_D'] || 0 }
  ];
  
  featureImportanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: features.map(f => f.name),
      datasets: [{
        label: '상대적 중요도',
        data: features.map(f => f.value),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

/**
 * 주요 메트릭 업데이트
 */
function updateFeatureMetrics(data) {
  const metricsContainer = document.getElementById('featureMetrics');
  if (!metricsContainer) return;
  
  const metrics = [
    { label: '생활인구 밀도', value: `${(data['1A_Total'] || 0).toLocaleString()}명` },
    { label: '경쟁 강도', value: `${(data['Competitor_R'] || 0).toFixed(1)}%` },
    { label: '유동인구 시설', value: `${(data['School'] || 0) + (data['PubBuilding'] || 0)}개` },
    { label: '토지 가치', value: `${((data['Total_LV'] || 0) / 10000).toFixed(0)}만원/㎡` }
  ];
  
  const metricsHtml = metrics.map(m => 
    `<div class="d-flex justify-content-between mb-1">
      <span>${m.label}:</span>
      <strong>${m.value}</strong>
    </div>`
  ).join('');
  
  metricsContainer.innerHTML = metricsHtml;
}

/**
 * 생존확률 게이지 애니메이션
 */
function animateSurvivalGauge(percentage) {
  const gauge = document.querySelector('.survival-gauge');
  if (!gauge) return;
  
  const fill = gauge.querySelector('.gauge-fill');
  const text = gauge.querySelector('.percentage');
  
  // 애니메이션 효과
  let currentPercent = 0;
  const targetPercent = Math.min(100, Math.max(0, percentage));
  const increment = targetPercent / 30; // 30 스텝으로 애니메이션
  
  const timer = setInterval(() => {
    currentPercent += increment;
    if (currentPercent >= targetPercent) {
      currentPercent = targetPercent;
      clearInterval(timer);
    }
    
    // 게이지 채우기
    const rotation = (currentPercent / 100) * 180; // 반원 게이지
    fill.style.transform = `rotate(${rotation}deg)`;
    
    // 텍스트 업데이트
    text.textContent = Math.round(currentPercent) + '%';
    
    // 색상 변경
    let color = '#dc3545'; // 빨간색 (위험)
    if (currentPercent >= 80) color = '#28a745'; // 초록색 (좋음)
    else if (currentPercent >= 60) color = '#ffc107'; // 노란색 (보통)
    else if (currentPercent >= 40) color = '#fd7e14'; // 주황색 (주의)
    
    fill.style.backgroundColor = color;
  }, 50);
}

/**
 * 분석 리포트 다운로드
 */
function downloadAnalysisReport() {
  if (!window.currentAnalysisData) return;
  
  const data = window.currentAnalysisData;
  const reportContent = `
XGBoost AI 상권분석 리포트
생성일시: ${new Date().toLocaleString('ko-KR')}

=== 예측 결과 ===
생존 확률: ${data.survival_percentage}%

=== AI 분석 내용 ===
${data.ai_explanation || '분석 내용이 없습니다.'}

=== 주요 데이터 ===
• 매장 면적: ${data.Area || 0}㎡
• 생활인구(300m): ${(data['1A_Total'] || 0).toLocaleString()}명
• 직장인구(300m): ${(data['Working_Pop'] || 0).toLocaleString()}명
• 경쟁업체: ${data['Competitor_C'] || 0}개
• 토지 가치: ${((data['Total_LV'] || 0)).toLocaleString()}원

본 분석은 XGBoost 머신러닝 모델과 ChatGPT를 활용하여 생성되었습니다.
  `.trim();
  
  // 파일 다운로드
  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AI_상권분석_리포트_${new Date().getTime()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ===========================================
// CSS 스타일 추가
// ===========================================
$(document).ready(function() {
  // 동적 CSS 추가
  const styles = `
    <style>
    .ai-explanation-text {
      line-height: 1.6;
      font-size: 14px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .survival-gauge-container {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    
    .survival-gauge {
      position: relative;
      width: 200px;
      height: 100px;
      border: 3px solid #e9ecef;
      border-bottom: none;
      border-radius: 100px 100px 0 0;
      overflow: hidden;
    }
    
    .gauge-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #dc3545;
      transform-origin: center bottom;
      transform: rotate(0deg);
      transition: transform 0.5s ease;
    }
    
    .gauge-text {
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 20px;
      font-weight: bold;
    }
    
    #featureImportanceChart {
      max-height: 300px;
    }
    </style>
  `;
  
  $('head').append(styles);
}); 