// static/js/ai_analyzer/analyze-explainable.js
// 회원용 XGBoost 설명 가능 AI 결과 표시 및 시각화

// 스크립트 로딩 확인
console.log('🔄 analyze-explainable.js 로드됨 - 회원 AI 분석 기능 활성화');

// ===========================================
// 전역 변수
// ===========================================
let featureImportanceChart = null;

// 로드 완료 시 전역 플래그 설정
window.analyzeExplainableLoaded = true;

// ===========================================
// AI 설명 결과 표시 함수
// ===========================================

/**
 * 마크다운 형식을 HTML로 변환
 */
function formatMarkdownContent(content) {
  if (!content || content.trim() === '') {
    const currentLang = getCurrentLanguage();
    return currentLang === 'en' ? 'Loading analysis content...' : 
           currentLang === 'es' ? 'Cargando contenido de análisis...' : 
           '분석 내용을 불러오는 중...';
  }
  
  console.log('🔍 formatMarkdownContent 원본 내용:', content.substring(0, 200) + '...');
  
  // 간단하고 안전한 포맷팅
  const formatted = content
    // 볼드 텍스트 변환 (**text** -> <strong>text</strong>)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // 번호 목록 변환 (1. text -> <h6>text</h6>)
    .replace(/^(\d+)\.\s+(.+)$/gm, '<h6 class="mt-3 mb-2 text-secondary">$2</h6>')
    // 불릿 포인트 변환 (- **title**: content)
    .replace(/^\s*-\s+\*\*([^*]+)\*\*:\s*(.+)$/gm, '<div class="mb-2 ms-3"><strong class="text-primary">$1:</strong> $2</div>')
    // 일반 불릿 포인트 (- content)
    .replace(/^\s*-\s+(.+)$/gm, '<div class="mb-1 ms-3">• $1</div>')
    // 줄바꿈을 <br>로 변환
    .replace(/\n/g, '<br>');
    
  console.log('🔍 formatMarkdownContent 변환 결과:', formatted.substring(0, 200) + '...');
  
  return formatted;
}

/**
 * 실제 생존확률을 기반으로 한 요약 생성 (150자 정도) - 다국어 지원
 */
function extractCleanSummary(summary, actualSurvivalRate) {
  if (!actualSurvivalRate && actualSurvivalRate !== 0) {
    const currentLang = getCurrentLanguage();
    return currentLang === 'en' ? 'Analyzing...' : currentLang === 'es' ? 'Analizando...' : '분석 중...';
  }
  
  // 실제 생존확률 사용 (result.survival_percentage)
  const survivalRate = parseFloat(actualSurvivalRate);
  const currentLang = getCurrentLanguage();
  
  // 다국어 메시지 템플릿
  const getAnalysisMessage = (lang, rate, level) => {
    const messages = {
      ko: {
        excellent: `예측 생존확률 ${rate}%로 매우 양호한 사업 환경입니다. 창업에 적합한 입지 조건을 갖추고 있으며, 성공 가능성이 높은 것으로 분석됩니다.`,
        good: `예측 생존확률 ${rate}%로 양호한 사업 환경입니다. 적절한 마케팅 전략과 운영 계획을 수립한다면 성공할 가능성이 높습니다.`,
        moderate: `예측 생존확률 ${rate}%로 보통 수준의 사업 환경입니다. 경쟁력 있는 차별화 전략과 신중한 사업 계획이 필요합니다.`,
        challenging: `예측 생존확률 ${rate}%로 도전적인 사업 환경입니다. 위험 요인을 면밀히 검토하고 전문적인 컨설팅을 받아보시기 바랍니다.`,
        risky: `예측 생존확률 ${rate}%로 높은 위험이 예상됩니다. 입지 변경을 고려하거나 사업 모델을 전면 재검토하시기 바랍니다.`
      },
      en: {
        excellent: `AI Analysis Result: Predicted survival probability is ${rate}% with excellent business environment. This location is suitable for startup with high success potential.`,
        good: `AI Analysis Result: Predicted survival probability is ${rate}% with good business environment. Success is likely with proper marketing strategies and operational planning.`,
        moderate: `AI Analysis Result: Predicted survival probability is ${rate}% with moderate business environment. Competitive differentiation strategies and careful business planning are needed.`,
        challenging: `AI Analysis Result: Predicted survival probability is ${rate}% with challenging business environment. Please carefully review risk factors and consider professional consulting.`,
        risky: `AI Analysis Result: Predicted survival probability is ${rate}% with high risk expected. Please consider changing location or completely reviewing business model.`
      },
      es: {
        excellent: `Resultado del Análisis de IA: La probabilidad de supervivencia predicha es ${rate}% con excelente entorno empresarial. Esta ubicación es adecuada para startup con alto potencial de éxito.`,
        good: `Resultado del Análisis de IA: La probabilidad de supervivencia predicha es ${rate}% con buen entorno empresarial. El éxito es probable con estrategias de marketing adecuadas y planificación operativa.`,
        moderate: `Resultado del Análisis de IA: La probabilidad de supervivencia predicha es ${rate}% con entorno empresarial moderado. Se necesitan estrategias de diferenciación competitiva y planificación empresarial cuidadosa.`,
        challenging: `Resultado del Análisis de IA: La probabilidad de supervivencia predicha es ${rate}% con entorno empresarial desafiante. Por favor revise cuidadosamente los factores de riesgo y considere consultoría profesional.`,
        risky: `Resultado del Análisis de IA: La probabilidad de supervivencia predicha es ${rate}% con alto riesgo esperado. Por favor considere cambiar la ubicación o revisar completamente el modelo de negocio.`
      }
    };
    
    return messages[lang] || messages.ko;
  };
  
  // 150자 정도의 더 자세한 분석 요약 생성
  const rateStr = survivalRate.toFixed(1);
  const langMessages = getAnalysisMessage(currentLang, rateStr);
  
  let detailedSummary = '';
  if (survivalRate >= 80) {
    detailedSummary = langMessages.excellent;
  } else if (survivalRate >= 65) {
    detailedSummary = langMessages.good;
  } else if (survivalRate >= 50) {
    detailedSummary = langMessages.moderate;
  } else if (survivalRate >= 35) {
    detailedSummary = langMessages.challenging;
  } else {
    detailedSummary = langMessages.risky;
  }
  
  return detailedSummary;
}

/**
 * AI 분석에서 긍정/위험 요인 추출하여 하단에 표시
 */
function updateAIFactorsSection(result) {
  console.log('updateAIFactorsSection 호출됨, result:', result);
  
  // ai_explanation이 없거나 빈 문자열인 경우에도 기본 분석 기반으로 강점/주의사항 표시
  if (!result.ai_explanation || result.ai_explanation.trim() === '') {
    console.log('ai_explanation이 없어서 기본 분석 기반으로 강점/주의사항 표시');
    // 기존 displayStrengthsAndCautions 함수를 사용하여 강점/주의사항 표시
    if (typeof displayStrengthsAndCautions === 'function') {
      displayStrengthsAndCautions(result);
    } else {
      // displayStrengthsAndCautions 함수가 없는 경우 기본 AI 기반 분석
      generateBasicFactors(result);
    }
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
  
  // AI에서 추출한 요인이 없는 경우 기본 분석 사용
  if (positiveFactors.length === 0 && riskFactors.length === 0) {
    console.log('AI에서 요인을 추출하지 못했으므로 기본 분석 사용');
    if (typeof displayStrengthsAndCautions === 'function') {
      displayStrengthsAndCautions(result);
    } else {
      generateBasicFactors(result);
    }
    return;
  }
  
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
 * AI 설명이 없을 때 기본 강점/주의사항 생성
 */
function generateBasicFactors(result) {
  console.log('generateBasicFactors 호출됨, result:', result);
  
  const strengths = [];
  const cautions = [];
  
  // 생활인구 분석
  const lifePop300 = result.life_pop_300m || 0;
  if (lifePop300 > 5000) {
    strengths.push(`생활인구가 풍부함 (${Math.round(lifePop300).toLocaleString()}명)`);
  } else if (lifePop300 < 2000) {
    cautions.push('생활인구가 적어 고객 확보에 어려움 예상');
  }
  
  // 직장인구 분석
  const workingPop300 = result.working_pop_300m || 0;
  if (workingPop300 > 3000) {
    strengths.push('직장인구가 많아 점심시간 고객 확보 유리');
  } else if (workingPop300 < 1000) {
    cautions.push('직장인구가 적어 평일 점심 고객 부족 우려');
  }
  
  // 경쟁업체 분석
  const competitor300 = result.competitor_300m || 0;
  const competitorRatio = result.competitor_ratio_300m || 0;
  if (competitorRatio < 30) {
    strengths.push('경쟁업체 비율이 낮아 경쟁 부담 적음');
  } else if (competitorRatio > 50) {
    cautions.push('경쟁업체 비율이 높아 치열한 경쟁 예상');
  }
  
  if (competitor300 > 5) {
    cautions.push(`동일업종 경쟁업체가 많음 (${competitor300}개)`);
  }
  
  // 업종 다양성 분석
  const businessDiversity = result.business_diversity_300m || 0;
  if (businessDiversity > 10) {
    strengths.push('업종 다양성이 높아 상권이 활성화됨');
  }
  
  // 공시지가 분석
  const landValue = result.total_land_value || 0;
  if (landValue > 100000000) {
    cautions.push('공시지가가 높아 임대료 부담 클 수 있음');
  }
  
  // 유동인구 유발시설 분석
  const publicBuilding = result.public_building_250m || 0;
  const school = result.school_250m || 0;
  if (publicBuilding > 0 || school > 0) {
    strengths.push('주변 유동인구 유발시설 존재');
  }
  
  // 기본 메시지
  if (strengths.length === 0) {
    strengths.push('상권 분석 결과를 종합적으로 검토하세요');
  }
  if (cautions.length === 0) {
    cautions.push('현재 상권 조건이 양호합니다');
  }
  
  // UI 업데이트
  updateFactorsUI(strengths, cautions);
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
      console.log('✅ 강점 업데이트 완료:', positiveFactors);
    } else {
      console.log('⚠️ 긍정 요인이 없습니다');
      strengthsList.innerHTML = '<li class="mb-1">상권 분석 결과를 종합적으로 검토하세요</li>';
    }
  } else {
    console.error('❌ strengthsList 요소를 찾을 수 없습니다');
  }
  
  // 주의사항 업데이트
  const cautionsList = document.querySelector('#cautionsList');
  console.log('cautionsList 요소:', cautionsList);
  
  if (cautionsList) {
    if (riskFactors.length > 0) {
      cautionsList.innerHTML = riskFactors.map(factor => 
        `<li class="mb-1">${factor}</li>`
      ).join('');
      console.log('✅ 주의사항 업데이트 완료:', riskFactors);
    } else {
      console.log('⚠️ 위험 요인이 없습니다');
      cautionsList.innerHTML = '<li class="mb-1">현재 상권 조건이 양호합니다</li>';
    }
  } else {
    console.error('❌ cautionsList 요소를 찾을 수 없습니다');
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
          <strong><i class="fas fa-robot me-2"></i>
            <span data-lang="KOR">AI 분석 결과:</span>
            <span data-lang="ENG" style="display: none;">AI Analysis Result:</span>
            <span data-lang="ESP" style="display: none;">Resultado del Análisis de IA:</span>
          </strong> 
          <span>${cleanSummary}</span>
        </div>
        ${detailButtonHtml}
      `);
      
    // AI 긍정/위험 요인을 하단에 표시
    updateAIFactorsSection(result);
      
    // 전역 변수에 result 데이터만 저장 (이미 analyze-core.js에서 전체 데이터는 저장됨)
    window.currentAnalysisResult = result;
    
  } else {
    // 비회원: 다국어화된 메시지
    const survivalPercent = result.survival_percentage || 0;
    let barClass = 'bg-danger';
    let analysisText = '';
    
    // 현재 언어 가져오기
    const currentLang = getCurrentLanguage();
    const texts = getTexts(currentLang);
    
    if (survivalPercent >= 80) {
      barClass = 'bg-success';
      analysisText = texts.analysisExcellent || '이 위치는 매우 좋은 사업 환경을 가지고 있습니다.';
    } else if (survivalPercent >= 60) {
      barClass = 'bg-warning';
      analysisText = texts.analysisGood || '이 위치는 적당한 사업 환경을 가지고 있습니다.';
    } else if (survivalPercent >= 40) {
      barClass = 'bg-warning';
      analysisText = texts.analysisChallenging || '이 위치는 도전적인 사업 환경입니다.';
    } else {
      analysisText = texts.analysisRisky || '이 위치는 높은 위험을 가지고 있습니다.';
    }
    
    const analysisResultLabel = texts.analysisResult || '분석 결과';
    
    analysisSection.removeClass('alert-success alert-warning alert-danger alert-info')
      .addClass('alert alert-' + barClass.split('-')[1])
      .html('<strong>' + analysisResultLabel + ':</strong> ' + analysisText);
      
    // 비회원은 기존 방식으로 강점/주의사항 표시 (analyze-core.js의 displayStrengthsAndCautions 함수 사용)
    if (typeof displayStrengthsAndCautions === 'function') {
      displayStrengthsAndCautions(result);
    }
  }
}

/**
 * AI 설명 텍스트 가져오기 (여러 필드명 시도)
 */
function getAIExplanationText(result) {
  const currentLang = getCurrentLanguage();
  
  console.log('🔍 getAIExplanationText 호출됨, result:', result);
  
  // 다양한 필드명 시도 (우선순위 순)
  const possibleFields = [
    'ai_explanation',  // 가장 가능성 높은 필드
    'ai_summary',      // 두 번째 가능성
    'analysis_result', // 세 번째 가능성
    'ai_analysis',     // 네 번째 가능성
    'explanation',     // 다섯 번째 가능성
    'summary'          // 여섯 번째 가능성
  ];
  
  for (const field of possibleFields) {
    console.log(`🔍 필드 확인: ${field} =`, result[field]);
    if (result[field] && typeof result[field] === 'string' && result[field].trim().length > 0) {
      const content = result[field].trim();
      console.log(`✅ AI 설명 텍스트 발견: ${field}`, content.substring(0, 100) + '...');
      console.log(`📝 전체 내용 길이: ${content.length}자`);
      return content;
    }
  }
  
  // 모든 필드에서 찾지 못한 경우 기본 메시지
  console.warn('⚠️ AI 설명 텍스트를 찾을 수 없습니다. 사용 가능한 필드들:', Object.keys(result));
  
  if (currentLang === 'en') {
    return 'AI analysis content is being generated. Please wait a moment or try refreshing the page.';
  } else if (currentLang === 'es') {
    return 'El contenido del análisis de IA se está generando. Por favor espere un momento o intente actualizar la página.';
  } else {
    return 'AI 분석 내용을 생성 중입니다. 잠시 기다리시거나 페이지를 새로고침해 주세요.';
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
  
  // 디버깅: 데이터 구조 확인
  console.log('🔍 [DEBUG] currentAnalysisData:', data);
  console.log('🔍 [DEBUG] result:', result);
  console.log('🔍 [DEBUG] AI 설명 필드들 확인:');
  console.log('- result.ai_summary:', result.ai_summary);
  console.log('- result.ai_explanation:', result.ai_explanation);
  console.log('- result.analysis_result:', result.analysis_result);
  console.log('- result.ai_analysis:', result.ai_analysis);
  
  const modalHtml = `
    <div class="modal fade" id="detailAnalysisModal" tabindex="-1">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <span data-lang="KOR">XGBoost AI 상세 분석 결과</span>
              <span data-lang="ENG" style="display: none;">XGBoost AI Detailed Analysis Results</span>
              <span data-lang="ESP" style="display: none;">Resultados de Análisis Detallado XGBoost AI</span>
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-lg-7">
                <div class="card">
                  <div class="card-header">
                    <span data-lang="KOR">AI 분석 리포트</span>
                    <span data-lang="ENG" style="display: none;">AI Analysis Report</span>
                    <span data-lang="ESP" style="display: none;">Informe de Análisis de IA</span>
                  </div>
                  <div class="card-body">
                    <div style="line-height: 1.6; max-height: 400px; overflow-y: auto;">
                      ${formatMarkdownContent(getAIExplanationText(result))}
                    </div>
                  </div>
                </div>
                <div class="card mt-3">
                  <div class="card-header">
                    <span data-lang="KOR">다운로드</span>
                    <span data-lang="ENG" style="display: none;">Download</span>
                    <span data-lang="ESP" style="display: none;">Descargar</span>
                  </div>
                  <div class="card-body">
                    <button class="btn btn-success" onclick="downloadAnalysisReport()">
                      <i class="fas fa-download me-2"></i>
                      <span data-lang="KOR">분석 리포트 다운로드</span>
                      <span data-lang="ENG" style="display: none;">Download Analysis Report</span>
                      <span data-lang="ESP" style="display: none;">Descargar Informe de Análisis</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="col-lg-5">
                <div class="card">
                  <div class="card-header">
                    <span data-lang="KOR">주요 피쳐 분석</span>
                    <span data-lang="ENG" style="display: none;">Key Feature Analysis</span>
                    <span data-lang="ESP" style="display: none;">Análisis de Características Clave</span>
                  </div>
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
  
  // 모달이 생성된 후 언어 업데이트 적용
  const currentLang = getCurrentLanguage();
  console.log('🌐 모달 생성 후 언어 업데이트:', currentLang);
  
  // data-lang 속성 기반 언어 업데이트
  const langMap = {
    'ko': 'KOR',
    'en': 'ENG', 
    'es': 'ESP'
  };
  
  const targetLang = langMap[currentLang] || 'KOR';
  
  // 모든 data-lang 요소 숨기기
  $('#detailAnalysisModal [data-lang]').hide();
  
  // 현재 언어에 해당하는 요소만 표시
  $('#detailAnalysisModal [data-lang="' + targetLang + '"]').show();
  
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
  
  // 현재 언어 가져오기
  const currentLang = getCurrentLanguage();
  
  // 다국어 텍스트 정의 (간단한 버전)
  const getTexts = (lang) => {
    const textMap = {
      ko: {
        analysisExcellent: '이 위치는 매우 좋은 사업 환경을 가지고 있습니다.',
        analysisGood: '이 위치는 적당한 사업 환경을 가지고 있습니다.',
        analysisChallenging: '이 위치는 도전적인 사업 환경입니다.',
        analysisRisky: '이 위치는 높은 위험을 가지고 있습니다.',
        analysisResult: '분석 결과'
      },
      en: {
        analysisExcellent: 'This location has an excellent business environment.',
        analysisGood: 'This location has a moderate business environment.',
        analysisChallenging: 'This location presents a challenging business environment.',
        analysisRisky: 'This location has high risks.',
        analysisResult: 'Analysis Result'
      },
      es: {
        analysisExcellent: 'Esta ubicación tiene un excelente entorno empresarial.',
        analysisGood: 'Esta ubicación tiene un entorno empresarial moderado.',
        analysisChallenging: 'Esta ubicación presenta un entorno empresarial desafiante.',
        analysisRisky: 'Esta ubicación tiene altos riesgos.',
        analysisResult: 'Resultado del Análisis'
      }
    };
    return textMap[lang] || textMap.ko;
  };
  
  const texts = getTexts(currentLang);
  
  const features = [
    { 
      name: currentLang === 'en' ? 'Residents' : currentLang === 'es' ? 'Residentes' : '생활인구', 
      value: lifePopulation / 1000, 
      unit: currentLang === 'en' ? 'K people' : currentLang === 'es' ? 'K personas' : 'K명' 
    },
    { 
      name: currentLang === 'en' ? 'Workers' : currentLang === 'es' ? 'Trabajadores' : '직장인구', 
      value: workingPopulation / 1000, 
      unit: currentLang === 'en' ? 'K people' : currentLang === 'es' ? 'K personas' : 'K명' 
    },
    { 
      name: currentLang === 'en' ? 'Competitors' : currentLang === 'es' ? 'Competidores' : '경쟁업체', 
      value: competitors, 
      unit: currentLang === 'en' ? 'stores' : currentLang === 'es' ? 'tiendas' : '개' 
    },
    { 
      name: currentLang === 'en' ? 'Land Value' : currentLang === 'es' ? 'Valor del Terreno' : '토지가치', 
      value: landValue / 100000000, 
      unit: currentLang === 'en' ? '100M KRW' : currentLang === 'es' ? '100M KRW' : '억원' 
    },
    { 
      name: currentLang === 'en' ? 'Business Diversity' : currentLang === 'es' ? 'Diversidad de Negocios' : '업종다양성', 
      value: businessDiversity, 
      unit: currentLang === 'en' ? 'types' : currentLang === 'es' ? 'tipos' : '개' 
    }
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
            text: currentLang === 'en' ? 'Relative Value' : currentLang === 'es' ? 'Valor Relativo' : '상대적 수치'
          }
        },
        x: {
          title: {
            display: true,
            text: currentLang === 'en' ? 'Key Analysis Factors' : currentLang === 'es' ? 'Factores de Análisis Clave' : '주요 분석 요소'
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
    text.textContent = currentPercent.toFixed(1) + '%';
    
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