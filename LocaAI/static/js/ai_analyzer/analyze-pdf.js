// ==================================================
// analyze-pdf.js
// PDF 생성 및 다운로드 관련 함수들
// jsPDF와 html2canvas를 사용한 PDF 처리
// ==================================================

// 다국어 지원을 위한 텍스트 정의
const PDF_TRANSLATIONS = {
  ko: {
    no_preview_data: '미리보기 데이터가 없습니다.',
    no_preview_content: '미리보기 내용을 찾을 수 없습니다.',
    generating: '생성 중...',
    high_quality_pdf: '고품질 PDF (이미지)',
    lightweight_pdf: '경량 PDF (텍스트)',
    download_complete: 'PDF 다운로드가 완료되었습니다.',
    lightweight_download_complete: '경량 PDF 다운로드가 완료되었습니다.',
    generation_error: 'PDF 생성 중 오류가 발생했습니다: ',
    lightweight_generation_error: '경량 PDF 생성 중 오류가 발생했습니다: ',
    no_analysis_result: '분석 결과가 없습니다.',
    filename_prefix: 'AI_상권분석_보고서_',
    lightweight_filename_prefix: 'AI_상권분석_경량_'
  },
  en: {
    no_preview_data: 'No preview data available.',
    no_preview_content: 'Preview content not found.',
    generating: 'Generating...',
    high_quality_pdf: 'High Quality PDF (Image)',
    lightweight_pdf: 'Lightweight PDF (Text)',
    download_complete: 'PDF download completed.',
    lightweight_download_complete: 'Lightweight PDF download completed.',
    generation_error: 'Error occurred during PDF generation: ',
    lightweight_generation_error: 'Error occurred during lightweight PDF generation: ',
    no_analysis_result: 'No analysis results available.',
    filename_prefix: 'AI_Commercial_Analysis_Report_',
    lightweight_filename_prefix: 'AI_Commercial_Analysis_Light_'
  },
  es: {
    no_preview_data: 'No hay datos de vista previa disponibles.',
    no_preview_content: 'Contenido de vista previa no encontrado.',
    generating: 'Generando...',
    high_quality_pdf: 'PDF de Alta Calidad (Imagen)',
    lightweight_pdf: 'PDF Ligero (Texto)',
    download_complete: 'Descarga de PDF completada.',
    lightweight_download_complete: 'Descarga de PDF ligero completada.',
    generation_error: 'Error durante la generación del PDF: ',
    lightweight_generation_error: 'Error durante la generación del PDF ligero: ',
    no_analysis_result: 'No hay resultados de análisis disponibles.',
    filename_prefix: 'Informe_Análisis_Comercial_IA_',
    lightweight_filename_prefix: 'Informe_Análisis_Comercial_IA_Ligero_'
  }
};

// 현재 언어 감지 함수
function getCurrentLanguage() {
  // HTML lang 속성에서 언어 감지
  const htmlLang = document.documentElement.lang || 'ko';
  const langCode = htmlLang.split('-')[0]; // 'ko-kr' -> 'ko'
  return PDF_TRANSLATIONS[langCode] ? langCode : 'ko';
}

// 번역 텍스트 가져오기 함수
function getTranslation(key) {
  const currentLang = getCurrentLanguage();
  return PDF_TRANSLATIONS[currentLang][key] || PDF_TRANSLATIONS['ko'][key];
}

// 미리보기 모달에서 PDF 다운로드 함수 (고품질)
function downloadPreviewPDF() {
  if (!currentPreviewRequestId) {
    alert(getTranslation('no_preview_data'));
    return;
  }
  
  try {
    // 미리보기 컨테이너를 이미지로 변환
    const element = document.getElementById('previewContent');
    
    if (!element) {
      alert(getTranslation('no_preview_content'));
      return;
    }
    
    // 로딩 상태 표시
    document.getElementById('previewDownloadPdfBtn').innerHTML = `<i class="spinner-border spinner-border-sm me-2"></i>${getTranslation('generating')}`;
    document.getElementById('previewDownloadPdfBtn').disabled = true;
    document.getElementById('previewDownloadLightPdfBtn').disabled = true;
    
    html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.offsetHeight,
      removeContainer: true,
      imageTimeout: 0,
      logging: false
    }).then(canvas => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 이미지 크기 계산 (A4 크기에 맞게 조정)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // JPEG 품질 설정으로 용량 줄이기
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      
      // 첫 번째 페이지
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 추가 페이지가 필요한 경우
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // 파일명 생성
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${getTranslation('filename_prefix')}${currentDate}.pdf`;
      
      // PDF 다운로드
      doc.save(filename);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadPdfBtn').innerHTML = `<i class="bi bi-download me-2"></i>${getTranslation('high_quality_pdf')}`;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
      
      alert(getTranslation('download_complete'));
      
    }).catch(error => {
      console.error('html2canvas 오류:', error);
      alert(getTranslation('generation_error') + error.message);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadPdfBtn').innerHTML = `<i class="bi bi-download me-2"></i>${getTranslation('high_quality_pdf')}`;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
    });
    
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    alert(getTranslation('generation_error') + error.message);
    
    // 버튼 상태 복원
    document.getElementById('previewDownloadPdfBtn').innerHTML = `<i class="bi bi-download me-2"></i>${getTranslation('high_quality_pdf')}`;
    document.getElementById('previewDownloadPdfBtn').disabled = false;
    document.getElementById('previewDownloadLightPdfBtn').disabled = false;
  }
}

// 미리보기 모달에서 경량 PDF 다운로드 함수 (한글 폰트 지원)
function downloadPreviewLightweightPDF() {
  if (!currentPreviewRequestId) {
    alert(getTranslation('no_preview_data'));
    return;
  }
  
  try {
    // 로딩 상태 표시
    document.getElementById('previewDownloadLightPdfBtn').innerHTML = `<i class="spinner-border spinner-border-sm me-2"></i>${getTranslation('generating')}`;
    document.getElementById('previewDownloadLightPdfBtn').disabled = true;
    document.getElementById('previewDownloadPdfBtn').disabled = true;
    
    // 미리보기 컨테이너를 이미지로 변환 (경량화 옵션 적용)
    const element = document.getElementById('previewContent');
    
    if (!element) {
      alert(getTranslation('no_preview_content'));
      return;
    }
    
    html2canvas(element, {
      scale: 0.8, // 낮은 해상도로 용량 절약
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.offsetHeight,
      removeContainer: true,
      imageTimeout: 0,
      logging: false
    }).then(canvas => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 이미지 크기 계산 (A4 크기에 맞게 조정)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // JPEG 품질을 더 낮춰서 용량 절약 (경량 버전)
      const imgData = canvas.toDataURL('image/jpeg', 0.5); // 50% 품질
      
      // 첫 번째 페이지
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 추가 페이지가 필요한 경우
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // 파일명 생성
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `AI_상권분석_경량_${currentDate}.pdf`;
      
      // PDF 다운로드
      doc.save(filename);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadLightPdfBtn').innerHTML = '<i class="bi bi-file-text me-2"></i>경량 PDF (텍스트)';
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
      
      alert('경량 PDF 다운로드가 완료되었습니다.');
      
    }).catch(error => {
      console.error('html2canvas 오류:', error);
      alert('경량 PDF 생성 중 오류가 발생했습니다: ' + error.message);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadLightPdfBtn').innerHTML = '<i class="bi bi-file-text me-2"></i>경량 PDF (텍스트)';
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
    });
    
  } catch (error) {
    console.error('경량 PDF 생성 오류:', error);
    alert('경량 PDF 생성 중 오류가 발생했습니다: ' + error.message);
    
    // 버튼 상태 복원
    document.getElementById('previewDownloadLightPdfBtn').innerHTML = '<i class="bi bi-file-text me-2"></i>경량 PDF (텍스트)';
    document.getElementById('previewDownloadLightPdfBtn').disabled = false;
    document.getElementById('previewDownloadPdfBtn').disabled = false;
  }
}

// 경량 PDF 다운로드 함수
function downloadLightweightPDF() {
  if (!currentRequestId) {
    alert('분석 결과가 없습니다.');
    return;
  }
  
  // 로딩 상태 표시
  document.getElementById('pdfPreviewContainer').style.display = 'none';
  document.getElementById('pdfError').style.display = 'none';
  document.getElementById('pdfGenerating').style.display = 'block';
  document.getElementById('downloadPdfBtn').style.display = 'none';
  document.getElementById('downloadLightPdfBtn').style.display = 'none';
  document.getElementById('retryPdfBtn').style.display = 'none';
  
  // 서버에서 PDF 데이터 가져오기
  fetch(`/ai_analyzer/pdf-data/${currentRequestId}/`, {
    method: 'GET',
    headers: {
      'X-CSRFToken': CSRF_TOKEN
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('PDF 데이터를 가져올 수 없습니다.');
    }
    return response.json();
  })
  .then(data => {
    // 경량 PDF 생성
    generateLightweightPDF(data);
  })
  .catch(error => {
    console.error('경량 PDF 생성 오류:', error);
    
    // 오류 상태 표시
    document.getElementById('pdfGenerating').style.display = 'none';
    document.getElementById('pdfPreviewContainer').style.display = 'block';
    document.getElementById('pdfError').style.display = 'block';
    document.getElementById('pdfErrorMessage').textContent = error.message;
    document.getElementById('downloadPdfBtn').style.display = 'inline-block';
    document.getElementById('downloadLightPdfBtn').style.display = 'inline-block';
    document.getElementById('retryPdfBtn').style.display = 'inline-block';
  });
}

// jsPDF를 사용한 PDF 생성 (html2canvas로 미리보기를 이미지로 변환)
function generatePDFWithJsPDF(data) {
  try {
    // 미리보기 컨테이너를 이미지로 변환
    const element = document.getElementById('pdfPreviewContainer');
    
    // PDF 생성 상태 표시
    document.getElementById('pdfGenerating').style.display = 'block';
    document.getElementById('downloadPdfBtn').style.display = 'none';
    
    html2canvas(element, {
      scale: 1.2, // 해상도 조정 (2 -> 1.2)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: element.offsetHeight,
      removeContainer: true,
      imageTimeout: 0,
      logging: false
    }).then(canvas => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 이미지 크기 계산 (A4 크기에 맞게 조정)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      // JPEG 품질 설정으로 용량 줄이기
      const imgData = canvas.toDataURL('image/jpeg', 0.8); // JPEG, 80% 품질
      
      // 첫 번째 페이지
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 추가 페이지가 필요한 경우
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
     
      // 파일명 생성
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `AI_상권분석_보고서_${currentDate}.pdf`;
      
      // PDF 다운로드
      doc.save(filename);
      
      // 성공 시 모달 닫기
      setTimeout(() => {
        const pdfModal = bootstrap.Modal.getInstance(document.getElementById('pdfModal'));
        if (pdfModal) {
          pdfModal.hide();
        }
      }, 1000);
      
    }).catch(error => {
      console.error('html2canvas 오류:', error);
      throw new Error('PDF 생성 중 오류가 발생했습니다.');
    });
    
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    
    // 오류 상태 표시
    document.getElementById('pdfGenerating').style.display = 'none';
    document.getElementById('pdfError').style.display = 'block';
    document.getElementById('pdfErrorMessage').textContent = error.message || 'PDF 생성 중 오류가 발생했습니다.';
    document.getElementById('retryPdfBtn').style.display = 'inline-block';
  }
}

// 텍스트 기반 PDF 생성 (용량 최적화)
function generateLightweightPDF(data) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // 기본 폰트 사용 (한국어는 영문으로 표기)
    doc.setFont('helvetica');
    
    let yPos = 20;
    const lineHeight = 7;
    const margin = 20;
    const pageWidth = 170; // 텍스트 영역 너비
    
    // 제목
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Commercial District Analysis Report', margin, yPos);
    yPos += lineHeight * 2;
    
    // 부제목
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('AI-based Commercial Area Analysis Results', margin, yPos);
    yPos += lineHeight * 2;
    
    // 구분선
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, margin + pageWidth, yPos);
    yPos += lineHeight;
    
    // 기본 정보 섹션
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Basic Information', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Address: ${data.basic_info.address}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Business Type: ${data.basic_info.business_type}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Area: ${data.basic_info.area}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Service Type: ${data.basic_info.service_type}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Analysis Date: ${data.basic_info.analysis_date}`, margin, yPos);
    yPos += lineHeight * 2;
    
    // AI 분석 결과
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. AI Analysis Results', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Survival Probability: ${data.ai_analysis.survival_rate}`, margin, yPos);
    yPos += lineHeight * 1.5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const analysisLines = doc.splitTextToSize(data.ai_analysis.analysis_text, pageWidth);
    analysisLines.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    yPos += lineHeight;
    
    // 핵심 지표
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('3. Key Metrics (300m radius)', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Living Population: ${data.key_metrics.life_pop_300m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Working Population: ${data.key_metrics.working_pop_300m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Competitors: ${data.key_metrics.competitor_300m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Total Land Value: ${data.key_metrics.total_land_value}`, margin, yPos);
    yPos += lineHeight * 2;
    
    // 경쟁 분석
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Competition Analysis', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Competitor Count: ${data.competition_analysis.competitor_count}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Total Business: ${data.competition_analysis.total_business}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Competitor Ratio: ${data.competition_analysis.competitor_ratio}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Business Diversity: ${data.competition_analysis.business_diversity}`, margin, yPos);
    yPos += lineHeight * 2;
    
    // 새 페이지가 필요한 경우
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // 상세 분석
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('5. Detailed Analysis', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Temporary Foreign Residents (1000m): ${data.detailed_analysis.temp_foreign_1000m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Long-term Foreign Residents (300m): ${data.detailed_analysis.long_foreign_300m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Long-term Foreign Residents (1000m): ${data.detailed_analysis.long_foreign_1000m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Chinese Temporary Residents (300m): ${data.detailed_analysis.temp_foreign_cn_300m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Chinese Temporary Residents (1000m): ${data.detailed_analysis.temp_foreign_cn_1000m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Chinese Long-term Residents (1000m): ${data.detailed_analysis.long_foreign_cn_1000m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Schools (250m): ${data.detailed_analysis.school_250m}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`• Public Buildings (250m): ${data.detailed_analysis.public_building_250m}`, margin, yPos);
    yPos += lineHeight * 2;
    
    // 하단 정보
    yPos = 280; // 페이지 하단으로 이동
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by AI-based Commercial District Analysis System', margin, yPos);
    yPos += 4;
    doc.text(`Report Date: ${new Date().toLocaleDateString('en-US')}`, margin, yPos);
    
    // 파일명 생성
    const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `AI_Analysis_Report_Light_${currentDate}.pdf`;
    
    // PDF 다운로드
    doc.save(filename);
    
    // 성공 시 모달 닫기
    setTimeout(() => {
      const pdfModal = bootstrap.Modal.getInstance(document.getElementById('pdfModal'));
      if (pdfModal) {
        pdfModal.hide();
      }
    }, 1000);
    
  } catch (error) {
    console.error('경량 PDF 생성 오류:', error);
    throw new Error('경량 PDF 생성 중 오류가 발생했습니다.');
  }
}

// PDF 생성 함수 (최신 버전으로 업데이트)
function generatePDF() {
  // Django 템플릿에서 사용자 인증 상태 확인
  const isAuthenticated = USER_AUTHENTICATED;
  
  if (!isAuthenticated) {
    document.getElementById('guestPdfMessage').style.display = 'block';
    return;
  }
  
  // 현재 분석 결과를 사용하여 PDF 미리보기 표시
  if (!currentRequestId) {
    alert('분석 결과가 없습니다.');
    return;
  }
  
  // 최신 PDF 미리보기 함수 호출
  openPdfPreviewModal(currentRequestId);
}

// PDF 미리보기 모달 인스턴스 (싱글톤 패턴)
let pdfPreviewModalInstance = null;

// PDF 미리보기 모달 열기 함수 (전역 함수로 추가)
function openPdfPreviewModal(requestId) {
  // 미리보기 컨텐츠 로드 (모달은 showPdfPreview에서 처리)
  showPdfPreview(requestId);
}

// PDF 미리보기 모달 표시 함수 (분석 기록용)
function showPdfPreview(requestId) {
  // PDF 미리보기 요청 처리
  
  // 모달 인스턴스가 없으면 생성, 있으면 재사용
  if (!pdfPreviewModalInstance) {
    const modalElement = document.getElementById('pdfPreviewModal');
    if (modalElement) {
      pdfPreviewModalInstance = new bootstrap.Modal(modalElement, {
        backdrop: 'static', // 배경 클릭으로 닫기 방지
        keyboard: true,     // ESC 키로 닫기 허용
        focus: true         // 포커스 관리
      });
      
      // 모달 닫힐 때 정리 작업
      modalElement.addEventListener('hidden.bs.modal', function () {
        // 차트 정리
        if (previewAgeChart) {
          previewAgeChart.destroy();
          previewAgeChart = null;
        }
        
        // 미리보기 데이터 정리
        currentPreviewRequestId = null;
        
        // 모든 Bootstrap 백드롭 제거 (오버레이 문제 해결)
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
          backdrop.remove();
        });
        
        // body 클래스 정리
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }
  }
  
  // 모달 표시
  if (pdfPreviewModalInstance) {
    pdfPreviewModalInstance.show();
  }
  
  // 초기 상태 설정
  document.getElementById('previewLoading').style.display = 'block';
  document.getElementById('previewError').style.display = 'none';
  document.getElementById('previewContent').style.display = 'none';
  document.getElementById('previewDownloadPdfBtn').style.display = 'none';
  document.getElementById('previewDownloadLightPdfBtn').style.display = 'none';
  
  // 분석 결과 데이터 가져오기
  fetch(`/ai_analyzer/api/result/${requestId}/`, {
    method: 'GET',
    headers: {
      'X-CSRFToken': CSRF_TOKEN
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('분석 결과를 불러올 수 없습니다.');
    }
    return response.json();
  })
  .then(data => {
    // 분석 결과 데이터 처리
    
    // 로딩 숨기고 내용 표시
    document.getElementById('previewLoading').style.display = 'none';
    document.getElementById('previewContent').style.display = 'block';
    document.getElementById('previewDownloadPdfBtn').style.display = 'inline-block';
    document.getElementById('previewDownloadLightPdfBtn').style.display = 'inline-block';
    
    // 데이터 채우기
    populatePreviewData(data, requestId);
  })
  .catch(error => {
    console.error('PDF 미리보기 오류:', error);
    
    // 오류 상태 표시
    document.getElementById('previewLoading').style.display = 'none';
    document.getElementById('previewError').style.display = 'block';
    document.getElementById('previewErrorMessage').textContent = error.message;
  });
}

// 미리보기 데이터 채우기 함수
function populatePreviewData(data, requestId) {
  console.log('PDF 미리보기 데이터:', data);
  const request = data.request;
  const result = data.result;
  
  console.log('Request 데이터:', request);
  console.log('Result 데이터:', result);
  
  // 기본 정보
  console.log('주소:', request.address);
  console.log('업종 ID:', request.business_type_id);
  console.log('면적:', request.area);
  
  const addressElement = document.getElementById('previewAddr');
  const businessTypeElement = document.getElementById('previewBizType');
  const areaElement = document.getElementById('previewAreaSize');
  
  console.log('주소 엘리먼트:', addressElement);
  console.log('업종 엘리먼트:', businessTypeElement);
  console.log('면적 엘리먼트:', areaElement);
  
  if (addressElement) {
    addressElement.textContent = request.address || '-';
    console.log('주소 설정 완료:', request.address);
  }
  if (businessTypeElement) {
    const businessTypeName = getBusinessTypeName(request.business_type_id);
    businessTypeElement.textContent = businessTypeName || '-';
    console.log('업종 설정 완료:', businessTypeName);
  }
  if (areaElement) {
    areaElement.textContent = request.area || '-';
    console.log('면적 설정 완료:', request.area);
  }
  
  // 분석일시
  const analysisDate = new Date(request.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById('previewAnalysisDate').textContent = analysisDate;
  document.getElementById('previewReportGeneratedDate').textContent = analysisDate;
  
  // AI 생존 확률
  console.log('생존 확률:', result.survival_percentage);
  const survivalRate = (result.survival_percentage || 0).toFixed(1);
  
  const survivalElement = document.getElementById('previewSurvivalRate');
  console.log('생존 확률 엘리먼트:', survivalElement);
  
  if (survivalElement) {
    survivalElement.textContent = survivalRate + '%';
    console.log('생존 확률 설정 완료:', survivalRate + '%');
  }
  
  // 프로그레스 바 설정
  const progressBar = document.getElementById('previewSurvivalProgressBar');
  progressBar.style.width = survivalRate + '%';
  
  // 생존 확률에 따른 색상 및 메시지
  const survivalComment = document.getElementById('previewSurvivalComment');
  const currentLang = getCurrentLanguage();
  const texts = getTranslation('survivalTexts') || {};
  
  if (survivalRate >= 80) {
    progressBar.className = 'progress-bar bg-success';
    survivalComment.textContent = texts.high || (currentLang === 'en' ? 'High survival possibility - Very good conditions for long-term business sustainability' : 
                                                 currentLang === 'es' ? 'Alta posibilidad de supervivencia - Muy buenas condiciones para la sostenibilidad empresarial a largo plazo' : 
                                                 '높은 생존 가능성 - 장기적 사업 지속에 매우 좋은 조건');
    survivalComment.className = 'text-success mb-0';
  } else if (survivalRate >= 60) {
    progressBar.className = 'progress-bar bg-warning';
    survivalComment.textContent = texts.moderate || (currentLang === 'en' ? 'Moderate survival possibility - Appropriate conditions or additional strategy review needed' : 
                                                     currentLang === 'es' ? 'Posibilidad de supervivencia moderada - Se necesita revisión de condiciones apropiadas o estrategia adicional' : 
                                                     '보통 생존 가능성 - 적절한 조건이나 추가 전략 검토 필요');
    survivalComment.className = 'text-warning mb-0';
  } else {
    progressBar.className = 'progress-bar bg-danger';
    survivalComment.textContent = texts.low || (currentLang === 'en' ? 'Low survival possibility - Difficulties expected in long-term business sustainability' : 
                                                currentLang === 'es' ? 'Baja posibilidad de supervivencia - Se esperan dificultades en la sostenibilidad empresarial a largo plazo' : 
                                                '낮은 생존 가능성 - 장기 사업 지속에 어려움 예상');
    survivalComment.className = 'text-danger mb-0';
  }
  
  // 핵심 지표
  console.log('생활인구:', result.life_pop_300m);
  console.log('직장인구:', result.working_pop_300m);
  console.log('경쟁업체:', result.competitor_300m);
  
  const peopleUnit = currentLang === 'en' ? ' people' : currentLang === 'es' ? ' personas' : '명';
  const storeUnit = currentLang === 'en' ? ' stores' : currentLang === 'es' ? ' tiendas' : '개';
  
  document.getElementById('previewLifePopulation').textContent = 
    Math.round(result.life_pop_300m || 0).toLocaleString() + peopleUnit;
  document.getElementById('previewWorkingPopulation').textContent = 
    Math.round(result.working_pop_300m || 0).toLocaleString() + peopleUnit;
  document.getElementById('previewCompetitors').textContent = 
    (result.competitor_300m || 0) + storeUnit;
  
  // 공시지가
  const landValue = result.total_land_value || 0;
  const currencyUnit = currentLang === 'en' ? ' KRW' : currentLang === 'es' ? ' KRW' : '원';
  let landValueText = landValue > 0 ? Math.round(landValue).toLocaleString() + currencyUnit : '0' + currencyUnit;
  document.getElementById('previewLandPrice').textContent = landValueText;
  
  // 경쟁강도 분석 (새로 추가된 필드들)
  const competitorRatio = Math.round(result.competitor_ratio_300m || 0);
  const businessDiversity = result.business_diversity_300m || 0;
  const adjacentBiz = result.adjacent_biz_300m || 0;
  
  // 경쟁강도 미리보기 데이터 업데이트
  document.getElementById('previewCompetitorCount').textContent = (result.competitor_300m || 0) + storeUnit;
  document.getElementById('previewAdjacentBiz').textContent = adjacentBiz + storeUnit;
  
  // 경쟁강도 진행률 바 설정
  const previewCompetitionBar = document.getElementById('previewCompetitionBar');
  const previewCompetitionLevel = document.getElementById('previewCompetitionLevel');
  
  if (previewCompetitionBar && previewCompetitionLevel) {
    previewCompetitionBar.style.width = competitorRatio + '%';
    
    if (competitorRatio <= 20) {
      previewCompetitionBar.className = 'progress-bar bg-success';
      previewCompetitionLevel.className = 'badge bg-success fs-6';
      previewCompetitionLevel.textContent = currentLang === 'en' ? `Low (${competitorRatio}%)` : 
                                           currentLang === 'es' ? `Bajo (${competitorRatio}%)` : 
                                           `낮음 (${competitorRatio}%)`;
    } else if (competitorRatio <= 50) {
      previewCompetitionBar.className = 'progress-bar bg-warning';
      previewCompetitionLevel.className = 'badge bg-warning fs-6';
      previewCompetitionLevel.textContent = currentLang === 'en' ? `Medium (${competitorRatio}%)` : 
                                           currentLang === 'es' ? `Medio (${competitorRatio}%)` : 
                                           `보통 (${competitorRatio}%)`;
    } else {
      previewCompetitionBar.className = 'progress-bar bg-danger';
      previewCompetitionLevel.className = 'badge bg-danger fs-6';
      previewCompetitionLevel.textContent = currentLang === 'en' ? `High (${competitorRatio}%)` : 
                                           currentLang === 'es' ? `Alto (${competitorRatio}%)` : 
                                           `높음 (${competitorRatio}%)`;
    }
  }
  
  // 외국인 분석 데이터 (새로 추가된 필드들)
  const tempTotal = result['2A_Temp_Total'] || result.temp_foreign_1000m || 0;
  const longTotal300 = result['1A_Long_Total'] || result.long_foreign_300m || 0;
  const longCNRatio1000 = result['2A_Long_CN'] || result.long_foreign_cn_1000m || 0;
  
  // 외국인 분석 미리보기 데이터 업데이트
  document.getElementById('previewTempForeign').textContent = tempTotal > 0 ? Math.round(tempTotal).toLocaleString() + peopleUnit : '0' + peopleUnit;
  document.getElementById('previewLongForeign').textContent = longTotal300 > 0 ? Math.round(longTotal300).toLocaleString() + peopleUnit : '0' + peopleUnit;
  document.getElementById('previewChinaRatio').textContent = longCNRatio1000 > 0 ? longCNRatio1000.toFixed(1) + '%' : '0.0%';
  
  // 연령대별 인구 분석 (새로 추가된 필드들)
  const age20 = result['2A_20'] || result.life_pop_20_1000m || 0;
  const age30 = result['2A_30'] || result.life_pop_30_1000m || 0;
  const age40 = result['2A_40'] || result.life_pop_40_1000m || 0;
  const age50 = result['2A_50'] || result.life_pop_50_1000m || 0;
  const age60 = result['2A_60'] || result.life_pop_60_1000m || 0;
  
  // 연령대별 미리보기 데이터 업데이트
  document.getElementById('previewAge20').textContent = age20.toFixed(1) + '%';
  document.getElementById('previewAge30').textContent = age30.toFixed(1) + '%';
  document.getElementById('previewAge40').textContent = age40.toFixed(1) + '%';
  document.getElementById('previewAge50').textContent = age50.toFixed(1) + '%';
  document.getElementById('previewAge60').textContent = age60.toFixed(1) + '%';
  
  // PDF 미리보기용 파이차트 생성
  const ageData = [age20, age30, age40, age50, age60];
  updatePreviewAgeChart(ageData);
  
  // 강점과 주의사항 분석
  populateStrengthsAndCautions(result);
  
  // 업종 추천 데이터 처리 (회원 전용)
  console.log('회원 분석 여부:', result.is_member_analysis);
  console.log('업종 추천 데이터:', result.business_recommendations);
  
  if (result.is_member_analysis && result.business_recommendations) {
    populateBusinessRecommendations(result.business_recommendations);
    document.getElementById('previewBusinessRecommendations').style.display = 'block';
  } else {
    document.getElementById('previewBusinessRecommendations').style.display = 'none';
  }
  
  // AI 분석 리포트 처리 (회원 전용)
  if (result.is_member_analysis && result.ai_explanation) {
    populateAiReport(result.ai_explanation);
    document.getElementById('previewAiReport').style.display = 'block';
  } else {
    document.getElementById('previewAiReport').style.display = 'none';
  }
  
  // 현재 미리보기 중인 requestId를 전역 변수에 저장 (PDF 다운로드용)
  currentPreviewRequestId = requestId;
}

// 업종 추천 데이터를 PDF 미리보기에 채우는 함수
function populateBusinessRecommendations(recommendations) {
  try {
    console.log('populateBusinessRecommendations 호출됨:', recommendations);
    if (!recommendations || recommendations.length === 0) {
      console.log('업종 추천 데이터가 없음');
      return;
    }
    
    // 1위 업종 데이터
    if (recommendations[0]) {
      const firstPlace = recommendations[0];
      console.log('1위 업종 데이터:', firstPlace);
      
      const businessTypeElement = document.getElementById('previewRecommendedBusinessType');
      const percentageElement = document.getElementById('previewRecommendedPercentage');
      
      console.log('업종명 엘리먼트:', businessTypeElement);
      console.log('퍼센트 엘리먼트:', percentageElement);
      
      if (businessTypeElement) {
        businessTypeElement.textContent = firstPlace.name || '-';
        console.log('업종명 설정:', firstPlace.name);
      }
      if (percentageElement) {
        percentageElement.textContent = (firstPlace.percentage || 0).toFixed(1) + '%';
        console.log('퍼센트 설정:', firstPlace.percentage);
      }
      
      // 1위 업종 진행바
      const progressBar = document.getElementById('previewRecommendedProgressBar');
      progressBar.style.width = (firstPlace.percentage || 0) + '%';
      
      // 생존확률에 따른 색상 설정
      if (firstPlace.percentage >= 80) {
        progressBar.className = 'progress-bar bg-success';
      } else if (firstPlace.percentage >= 60) {
        progressBar.className = 'progress-bar bg-warning';
      } else {
        progressBar.className = 'progress-bar bg-danger';
      }
    }
    
    // 2위 업종 데이터
    if (recommendations[1]) {
      const secondPlace = recommendations[1];
      document.getElementById('previewRecommended2nd').textContent = secondPlace.name || '-';
      document.getElementById('previewRecommended2ndPercent').textContent = (secondPlace.percentage || 0).toFixed(1) + '%';
    }
    
    // 3위 업종 데이터
    if (recommendations[2]) {
      const thirdPlace = recommendations[2];
      document.getElementById('previewRecommended3rd').textContent = thirdPlace.name || '-';
      document.getElementById('previewRecommended3rdPercent').textContent = (thirdPlace.percentage || 0).toFixed(1) + '%';
    }
    
    // 4위 업종 데이터
    if (recommendations[3]) {
      const fourthPlace = recommendations[3];
      document.getElementById('previewRecommended4th').textContent = fourthPlace.name || '-';
      document.getElementById('previewRecommended4thPercent').textContent = (fourthPlace.percentage || 0).toFixed(1) + '%';
    }
    
  } catch (error) {
    console.error('업종 추천 데이터 처리 오류:', error);
  }
}

// AI 분석 리포트를 PDF 미리보기에 채우는 함수
function populateAiReport(aiExplanation) {
  try {
    if (!aiExplanation) {
      return;
    }
    
    const reportContainer = document.getElementById('previewAiReportContent');
    
    // 마크다운 형식의 AI 분석 리포트를 HTML로 변환
    let htmlContent = aiExplanation
      // 제목 변환 (##, ###)
      .replace(/^### (.+)$/gm, '<h5 class="text-primary mt-3 mb-2">$1</h5>')
      .replace(/^## (.+)$/gm, '<h4 class="text-primary mt-4 mb-3">$1</h4>')
      .replace(/^# (.+)$/gm, '<h3 class="text-primary mt-4 mb-3">$1</h3>')
      
      // 굵은 글씨 변환
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      
      // 이탤릭 변환
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      
      // 불릿 포인트 변환
      .replace(/^[\s]*[-•]\s(.+)$/gm, '<li>$1</li>')
      
      // 숫자 리스트 변환
      .replace(/^[\s]*\d+\.\s(.+)$/gm, '<li>$1</li>')
      
      // 줄바꿈 변환
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // 리스트 태그로 감싸기
    htmlContent = htmlContent.replace(/(<li>.*?<\/li>)/gs, function(match) {
      return '<ul class="mb-3">' + match + '</ul>';
    });
    
    // 문단 태그로 감싸기
    if (!htmlContent.includes('<h3>') && !htmlContent.includes('<h4>') && !htmlContent.includes('<h5>')) {
      htmlContent = '<p>' + htmlContent + '</p>';
    }
    
    // 생존확률 수치 강조
    htmlContent = htmlContent.replace(/(\d+\.?\d*%)/g, '<span class="badge bg-primary">$1</span>');
    
    // 컨테이너에 HTML 삽입
    reportContainer.innerHTML = htmlContent;
    
    // 스타일 추가
    reportContainer.style.lineHeight = '1.6';
    reportContainer.style.fontSize = '14px';
    
  } catch (error) {
    console.error('AI 분석 리포트 처리 오류:', error);
    document.getElementById('previewAiReportContent').innerHTML = '<p class="text-muted">AI 분석 리포트를 불러올 수 없습니다.</p>';
  }
}

// 강점과 주의사항 분석 함수 (미리보기용)
function populateStrengthsAndCautions(result) {
  const strengths = [];
  const cautions = [];
  
  console.log('미리보기 강점/주의사항 분석 데이터:', result);
  // 강점/주의사항 분석을 위한 데이터 처리
  
  // 생활인구 분석
  const lifePop300 = result.life_pop_300m || 0;
  if (lifePop300 > 5000) {
    strengths.push('300m 반경 내 생활인구가 풍부합니다 (' + Math.round(lifePop300).toLocaleString() + '명)');
  } else if (lifePop300 < 2000) {
    cautions.push('300m 반경 내 생활인구가 부족합니다 (' + Math.round(lifePop300).toLocaleString() + '명)');
  }
  
  // 직장인구 분석
  const workingPop300 = result.working_pop_300m || 0;
  if (workingPop300 > 3000) {
    strengths.push('300m 반경 내 직장인구가 많아 점심/저녁 수요가 기대됩니다');
  } else if (workingPop300 < 1000) {
    cautions.push('300m 반경 내 직장인구가 적어 평일 수요가 제한적일 수 있습니다');
  }
  
  // 경쟁업체 분석
  const competitor300 = result.competitor_300m || 0;
  if (competitor300 < 3) {
    strengths.push('300m 반경 내 경쟁업체가 적어 시장 선점 기회가 있습니다');
  } else if (competitor300 > 10) {
    cautions.push('300m 반경 내 경쟁업체가 많아 치열한 경쟁이 예상됩니다 (' + competitor300 + '개)');
  }
  
  // 경쟁강도 분석 (새로 추가)
  const competitorRatio = result.competitor_ratio_300m || 0;
  if (competitorRatio < 20) {
    strengths.push('경쟁강도가 낮아 시장 진입이 유리합니다 (' + competitorRatio.toFixed(1) + '%)');
  } else if (competitorRatio > 60) {
    cautions.push('경쟁강도가 높아 치열한 경쟁이 예상됩니다 (' + competitorRatio.toFixed(1) + '%)');
  }
  
  // 업종 다양성 분석 (새로 추가)
  const businessDiversity = result.business_diversity_300m || 0;
  if (businessDiversity > 15) {
    strengths.push('주변 업종이 다양해 상권이 활성화되어 있습니다');
  } else if (businessDiversity < 5) {
    cautions.push('주변 업종 다양성이 부족해 상권 활력이 제한적일 수 있습니다');
  }
  
  // 공시지가 분석
  const landValue = result.total_land_value || 0;
  if (landValue < 50000000) { // 5천만원 미만
    strengths.push('상대적으로 낮은 공시지가로 임대료 부담이 적을 것으로 예상됩니다');
  } else if (landValue > 200000000) { // 2억 초과
    cautions.push('높은 공시지가로 인한 임대료 부담이 클 수 있습니다');
  }
  
  // 외국인 고객층 분석 (새로 추가)
  const tempForeign1000 = result['2A_Temp_Total'] || result.temp_foreign_1000m || 0;
  const longForeign300 = result['1A_Long_Total'] || result.long_foreign_300m || 0;
  
  if (tempForeign1000 > 3000 || longForeign300 > 1000) {
    strengths.push('외국인 고객층이 풍부해 다양한 고객 확보 가능');
  }
  
  // 연령대별 인구 분석 (새로 추가)
  const age20 = result['2A_20'] || result.life_pop_20_1000m || 0;
  const age30 = result['2A_30'] || result.life_pop_30_1000m || 0;
  const age40 = result['2A_40'] || result.life_pop_40_1000m || 0;
  
  if (age20 > 25 || age30 > 25) {
    strengths.push('젊은 연령층 비율이 높아 트렌디한 업종에 유리');
  } else if (age40 > 30) {
    strengths.push('중장년층 비율이 높아 안정적인 소비 패턴 기대');
  }
  
  // 유동인구 유발시설 분석
  const publicBuilding = result.public_building_250m || 0;
  const school = result.school_250m || 0;
  if (publicBuilding > 0 || school > 0) {
    strengths.push('주변 유동인구 유발시설이 있어 고객 유입에 유리');
  }
  
  // 생존 확률 분석
  const survivalRate = result.survival_percentage || 0;
  if (survivalRate >= 80) {
    strengths.push('AI 예측 생존 확률이 매우 높아 안정적인 사업 운영이 기대됩니다');
  } else if (survivalRate < 50) {
    cautions.push('AI 예측 생존 확률이 낮아 신중한 사업 계획이 필요합니다');
  }
  
  // 기본 메시지 추가
  if (strengths.length === 0) {
    strengths.push('현재 상권 조건이 평균적인 수준입니다');
  }
  if (cautions.length === 0) {
    cautions.push('현재 상권 조건이 양호합니다');
  }
  
  // HTML 생성
  const strengthsList = document.getElementById('previewStrengthsList').querySelector('ul');
  const cautionsList = document.getElementById('previewCautionsList').querySelector('ul');
  
  if (strengthsList) {
    strengthsList.innerHTML = strengths.map(item => 
      `<li class="mb-2"><i class="bi bi-check-circle-fill text-success me-2"></i>${item}</li>`
    ).join('');
  }
  
  if (cautionsList) {
    cautionsList.innerHTML = cautions.map(item => 
      `<li class="mb-2"><i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>${item}</li>`
    ).join('');
  }
}

// PDF 미리보기용 파이차트 업데이트 함수
let previewAgeChart = null;

function updatePreviewAgeChart(ageData) {
  const chartData = {
    labels: ['20대', '30대', '40대', '50대', '60대 이상'],
    datasets: [{
      data: ageData,
      backgroundColor: [
        '#FF6384',  // 20대 - 핑크
        '#36A2EB',  // 30대 - 블루
        '#FFCE56',  // 40대 - 옐로우
        '#4BC0C0',  // 50대 - 시안
        '#9966FF'   // 60대 - 퍼플
      ],
      borderColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF'
      ],
      borderWidth: 2
    }]
  };
  
  const chartConfig = {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 8,
            usePointStyle: true,
            font: {
              size: 10
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return label + ': ' + value.toFixed(1) + '%';
            }
          }
        }
      },
      layout: {
        padding: 5
      }
    }
  };
  
  // 기존 차트가 있으면 제거
  if (previewAgeChart) {
    previewAgeChart.destroy();
  }
  
  // 새 차트 생성
  const previewCtx = document.getElementById('previewAgeChart');
  if (previewCtx) {
    previewAgeChart = new Chart(previewCtx.getContext('2d'), chartConfig);
  }
}