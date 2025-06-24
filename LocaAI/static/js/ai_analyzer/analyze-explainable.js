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
 * 마크다운 형식을 HTML로 변환
 */
function formatMarkdownContent(content) {
  if (!content) return '분석 내용을 불러오는 중...';
  
  return content
    // 첫 번째 줄 (50자 이내) 제거
    .replace(/^1\.\s*첫\s*번째\s*줄[^:]*:[^.\n]*\.\s*\n*/i, '')
    // 제목 변환 (##, ###)
    .replace(/^###\s+(.+)$/gm, '<h5 class="mt-3 mb-2 text-primary">$1</h5>')
    .replace(/^##\s+(.+)$/gm, '<h4 class="mt-3 mb-2 text-primary">$1</h4>')
    // 번호 목록 변환 (2., 3., 4., 5.)
    .replace(/^(\d+)\.\s+(.+)$/gm, '<h5 class="mt-3 mb-2 text-secondary">$2</h5>')
    // 불릿 포인트 변환
    .replace(/^\s*-\s+\*\*([^*]+)\*\*:\s*(.+)$/gm, '<div class="mb-2"><strong class="text-primary">$1:</strong> $2</div>')
    .replace(/^\s*-\s+(.+)$/gm, '<div class="mb-1">• $1</div>')
    // 볼드 텍스트 변환
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 줄바꿈 변환
    .replace(/\n/g, '<br>');
}

/**
 * 실제 생존확률을 기반으로 한 요약 생성 (150자 정도)
 */
function extractCleanSummary(summary, actualSurvivalRate) {
  if (!actualSurvivalRate && actualSurvivalRate !== 0) return '분석 중...';
  
  // 실제 생존확률 사용 (result.survival_percentage)
  const survivalRate = parseFloat(actualSurvivalRate);
  
  // 150자 정도의 더 자세한 분석 요약 생성
  let detailedSummary = '';
  if (survivalRate >= 80) {
    detailedSummary = `예측 생존확률 ${survivalRate}%로 매우 양호한 사업 환경입니다. 창업에 적합한 입지 조건을 갖추고 있으며, 성공 가능성이 높은 것으로 분석됩니다.`;
  } else if (survivalRate >= 65) {
    detailedSummary = `예측 생존확률 ${survivalRate}%로 양호한 사업 환경입니다. 적절한 마케팅 전략과 운영 계획을 수립한다면 성공할 가능성이 높습니다.`;
  } else if (survivalRate >= 50) {
    detailedSummary = `예측 생존확률 ${survivalRate}%로 보통 수준의 사업 환경입니다. 경쟁력 있는 차별화 전략과 신중한 사업 계획이 필요합니다.`;
  } else if (survivalRate >= 35) {
    detailedSummary = `예측 생존확률 ${survivalRate}%로 도전적인 사업 환경입니다. 위험 요인을 면밀히 검토하고 전문적인 컨설팅을 받아보시기 바랍니다.`;
  } else {
    detailedSummary = `예측 생존확률 ${survivalRate}%로 높은 위험이 예상됩니다. 입지 변경을 고려하거나 사업 모델을 전면 재검토하시기 바랍니다.`;
  }
  
  return detailedSummary;
}

/**
 * AI 분석에서 긍정/위험 요인 추출하여 하단에 표시
 */
function updateAIFactorsSection(result) {
  console.log('updateAIFactorsSection 호출됨, result:', result);
  
  if (!result.ai_explanation) {
    console.log('ai_explanation이 없습니다:', result.ai_explanation);
    return;
  }
  
  const content = result.ai_explanation;
  console.log('AI 설명 내용:', content);
  
  // 긍정 요인 추출
  const positiveMatch = content.match(/주요\s*긍정\s*요인[^]*?(?=주요\s*위험\s*요인)/i);
  const positiveFactors = positiveMatch ? extractFactors(positiveMatch[0]) : [];
  console.log('긍정 요인:', positiveFactors);
  
  // 위험 요인 추출  
  const riskMatch = content.match(/주요\s*위험\s*요인[^]*?(?=개선\s*제안사항|종합\s*의견|$)/i);
  const riskFactors = riskMatch ? extractFactors(riskMatch[0]) : [];
  console.log('위험 요인:', riskFactors);
  
  // 기존 강점/주의사항 섹션 업데이트
  updateFactorsUI(positiveFactors, riskFactors);
}

/**
 * 텍스트에서 요인들을 추출
 */
function extractFactors(text) {
  const factors = [];
  // - **제목**: 내용 형태 매칭
  const matches = text.match(/-\s*\*\*([^*]+)\*\*:\s*([^-]+)/g);
  
  if (matches) {
    matches.forEach(match => {
      const cleanMatch = match.replace(/-\s*\*\*([^*]+)\*\*:\s*/, '$1: ');
      factors.push(cleanMatch.trim());
    });
  }
  
  return factors;
}

/**
 * 강점/주의사항 UI 업데이트
 */
function updateFactorsUI(positiveFactors, riskFactors) {
  console.log('updateFactorsUI 호출됨', { positiveFactors, riskFactors });
  
  // 강점 업데이트
  const strengthsList = document.querySelector('#strengthsList');
  console.log('strengthsList 요소:', strengthsList);
  
  if (strengthsList) {
    if (positiveFactors.length > 0) {
      strengthsList.innerHTML = positiveFactors.map(factor => 
        `<li class="mb-1">${factor}</li>`
      ).join('');
      console.log('강점 업데이트 완료:', positiveFactors);
    } else {
      console.log('긍정 요인이 없습니다');
    }
  } else {
    console.error('strengthsList 요소를 찾을 수 없습니다');
  }
  
  // 주의사항 업데이트
  const cautionsList = document.querySelector('#cautionsList');
  console.log('cautionsList 요소:', cautionsList);
  
  if (cautionsList) {
    if (riskFactors.length > 0) {
      cautionsList.innerHTML = riskFactors.map(factor => 
        `<li class="mb-1">${factor}</li>`
      ).join('');
      console.log('주의사항 업데이트 완료:', riskFactors);
    } else {
      console.log('위험 요인이 없습니다');
    }
  } else {
    console.error('cautionsList 요소를 찾을 수 없습니다');
  }
}

/**
 * 다운로드용 텍스트 포맷팅 (마크다운 제거)
 */
function formatTextForDownload(content) {
  if (!content) return '';
  
  return content
    // HTML 태그 제거
    .replace(/<[^>]*>/g, '')
    // 마크다운 형식 정리
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 볼드 제거
    .replace(/^#+\s+/gm, '') // 헤더 마크 제거
    .replace(/^\d+\.\s+/gm, '') // 번호 목록 정리
    .replace(/^\s*-\s+/gm, '• ') // 불릿 포인트 정리
    // 여러 줄바꿈을 하나로
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 회원/비회원에 따른 AI 분석 결과 섹션 업데이트
 */
function updateAIAnalysisSection(result) {
  const analysisSection = $('#survivalAnalysis');
  const isMember = result.is_member_analysis || false;
  
  if (isMember && result.ai_summary) {
    // 회원: ChatGPT 기반 AI 설명 (실제 생존확률 사용)
    const cleanSummary = extractCleanSummary(result.ai_summary, result.survival_percentage);
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
          <span>${cleanSummary}</span>
        </div>
        ${detailButtonHtml}
      `);
      
    // AI 긍정/위험 요인을 하단에 표시
    updateAIFactorsSection(result);
      
    // 전역 변수에 result 데이터만 저장 (이미 analyze-core.js에서 전체 데이터는 저장됨)
    window.currentAnalysisResult = result;
    
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
      
    // 비회원은 기존 방식으로 강점/주의사항 표시 (analyze-core.js의 displayStrengthsAndCautions 함수 사용)
    if (typeof displayStrengthsAndCautions === 'function') {
      displayStrengthsAndCautions(result);
    }
  }
}

/**
 * 상세 분석 모달 표시
 */
function showDetailedAnalysis() {
  if (!window.currentAnalysisData) {
    console.error('분석 데이터가 없습니다');
    return;
  }
  
  const data = window.currentAnalysisData;
  const result = data.result || data; // API 응답 구조에 따라 유연하게 처리
  
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
                      ${formatMarkdownContent(result.ai_explanation || '분석 내용을 불러오는 중...')}
                    </div>
                  </div>
                </div>
                <div class="card mt-3">
                  <div class="card-header">다운로드</div>
                  <div class="card-body">
                    <button class="btn btn-success" onclick="downloadAnalysisReport()">
                      <i class="fas fa-download me-2"></i>분석 리포트 다운로드
                    </button>
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
  
  setTimeout(() => drawChart(result), 500);
}

function drawChart(data) {
  const ctx = document.getElementById('featureChart');
  if (!ctx) return;
  
  console.log('차트 데이터:', data);
  
  if (featureImportanceChart) {
    featureImportanceChart.destroy();
  }
  
  // 올바른 필드명으로 데이터 추출 (API 응답 구조에 맞게)
  const lifePopulation = data['1A_Total'] || data.life_pop_300m || 0;
  const workingPopulation = data['Working_Pop'] || data.working_pop_300m || 0;
  const competitors = data['Competitor_C'] || data.competitor_300m || 0;
  const landValue = data['Total_LV'] || data.total_land_value || 0;
  const businessDiversity = data['Business_D'] || data.business_diversity_300m || 0;
  
  console.log('추출된 값들:', {
    lifePopulation, workingPopulation, competitors, landValue, businessDiversity
  });
  
  const features = [
    { name: '생활인구', value: lifePopulation / 1000, unit: 'K명' },
    { name: '직장인구', value: workingPopulation / 1000, unit: 'K명' },
    { name: '경쟁업체', value: competitors, unit: '개' },
    { name: '토지가치', value: landValue / 100000000, unit: '억원' },
    { name: '업종다양성', value: businessDiversity, unit: '개' }
  ];
  
  featureImportanceChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: features.map(f => f.name),
      datasets: [{
        label: '수치',
        data: features.map(f => f.value),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const feature = features[context.dataIndex];
              return `${feature.name}: ${feature.value.toFixed(1)}${feature.unit}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: '상대적 수치'
          }
        },
        x: {
          title: {
            display: true,
            text: '주요 분석 요소'
          }
        }
      }
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
  const result = data.result || data;
  const request = data.request || {};
  
  const reportContent = `
XGBoost AI 상권분석 리포트
생성일시: ${new Date().toLocaleString('ko-KR')}

=== 기본 정보 ===
• 주소: ${request.address || '정보 없음'}
• 매장 면적: ${request.area || 0}㎡
• 업종: ${request.business_type_id || '정보 없음'}

=== 예측 결과 ===
생존 확률: ${result.survival_percentage}%

=== AI 분석 내용 ===
${formatTextForDownload(result.ai_explanation || '분석 내용이 없습니다.')}

=== 주요 데이터 ===
• 생활인구(300m): ${(result['1A_Total'] || result.life_pop_300m || 0).toLocaleString()}명
• 직장인구(300m): ${(result['Working_Pop'] || result.working_pop_300m || 0).toLocaleString()}명
• 경쟁업체: ${result['Competitor_C'] || result.competitor_300m || 0}개
• 토지 가치: ${((result['Total_LV'] || result.total_land_value || 0)).toLocaleString()}원

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