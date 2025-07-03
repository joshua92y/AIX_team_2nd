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

// getCurrentLanguage 함수 간소화 - AI_ANALYZER_I18N 시스템과 연동
function getCurrentLanguage() {
  // 새로운 통합 시스템 사용
  if (window.getCurrentAILanguage) {
    return window.getCurrentAILanguage();
  }
  return 'ko'; // 백업
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
      const filename = `${getTranslation('lightweight_filename_prefix')}${currentDate}.pdf`;
      
      // PDF 다운로드
      doc.save(filename);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadLightPdfBtn').innerHTML = `<i class="bi bi-file-text me-2"></i>${getTranslation('lightweight_pdf')}`;
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
      
      alert(getTranslation('lightweight_download_complete'));
      
    }).catch(error => {
      console.error('html2canvas 오류:', error);
      alert(getTranslation('lightweight_generation_error') + error.message);
      
      // 버튼 상태 복원
      document.getElementById('previewDownloadLightPdfBtn').innerHTML = `<i class="bi bi-file-text me-2"></i>${getTranslation('lightweight_pdf')}`;
      document.getElementById('previewDownloadLightPdfBtn').disabled = false;
      document.getElementById('previewDownloadPdfBtn').disabled = false;
    });
    
  } catch (error) {
    console.error('경량 PDF 생성 오류:', error);
    alert(getTranslation('lightweight_generation_error') + error.message);
    
    // 버튼 상태 복원
    document.getElementById('previewDownloadLightPdfBtn').innerHTML = `<i class="bi bi-file-text me-2"></i>${getTranslation('lightweight_pdf')}`;
    document.getElementById('previewDownloadLightPdfBtn').disabled = false;
    document.getElementById('previewDownloadPdfBtn').disabled = false;
  }
}

// 경량 PDF 다운로드 함수
function downloadLightweightPDF() {
  if (!currentRequestId) {
    alert(getTranslation('no_analysis_result'));
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
  const currentLang = getCurrentLanguage(); // 함수 전체에서 사용할 언어 코드
  
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
    // 직접 출력 방식: 현재 언어에 맞는 업종명을 직접 가져오기
    let businessTypeName = '-';
    
    if (window.businessTypes && request.business_type_id) {
      const businessType = window.businessTypes.find(type => type.id == request.business_type_id);
      if (businessType) {
        if (currentLang === 'en' && businessType.eng) {
          businessTypeName = businessType.eng;
        } else if (currentLang === 'es' && businessType.esp) {
          businessTypeName = businessType.esp;
        } else {
          businessTypeName = businessType.kor;
        }
      }
    }
    
    businessTypeElement.textContent = businessTypeName;
    console.log('📝 PDF 업종명 설정 완료:', businessTypeName, `(언어: ${currentLang}, ID: ${request.business_type_id})`);
  }
  if (areaElement) {
    areaElement.textContent = request.area || '-';
    console.log('면적 설정 완료:', request.area);
  }
  
  // 분석일시 - 언어별 포맷팅
  let locale = 'ko-KR';
  if (currentLang === 'en') locale = 'en-US';
  else if (currentLang === 'es') locale = 'es-ES';
  
  const analysisDate = new Date(request.created_at).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  document.getElementById('previewAnalysisDate').textContent = analysisDate;
  document.getElementById('previewReportGeneratedDate').textContent = analysisDate;
  console.log('📅 PDF 분석일시 설정 완료:', analysisDate, `(언어: ${currentLang}, locale: ${locale})`);
  
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
  
  // 공시지가 - 다국어 단위 지원
  const landValue = result.total_land_value || 0;
  let landValueText = '₩0';
  
  if (landValue > 0) {
    // formatLandValue 함수 사용 (다국어 단위 지원)
    if (typeof formatLandValue === 'function') {
      landValueText = formatLandValue(Math.round(landValue), currentLang);
      console.log(`✅ PDF 공시지가 포맷팅: ${landValue} -> ${landValueText} (언어: ${currentLang})`);
    } else {
      // 폴백: formatLandValue 함수가 없는 경우
      const currencyUnit = currentLang === 'en' ? ' KRW' : currentLang === 'es' ? ' KRW' : '원';
      landValueText = Math.round(landValue).toLocaleString() + currencyUnit;
      console.warn('⚠️ formatLandValue 함수를 찾을 수 없습니다. 폴백 방식 사용:', landValueText);
    }
  }
  
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
  
  // PDF 미리보기 모달 다국어화 적용
  updatePdfPreviewSectionTitles(currentLang);
  
  // 언어 변경 이벤트 리스너 등록 (PDF 모달이 열려있을 때)
  if (typeof AI_ANALYZER_I18N !== 'undefined' && AI_ANALYZER_I18N.onLanguageChange) {
    AI_ANALYZER_I18N.onLanguageChange(() => {
      if (document.getElementById('pdfPreviewModal').style.display !== 'none') {
        console.log('🔄 PDF 모달 언어 변경 감지 - 다국어화 재적용');
        setTimeout(() => {
          updatePdfPreviewSectionTitles(getCurrentLanguage());
          
          // 업종명들도 다시 업데이트
          if (window.allBusinessRecommendations) {
            populateBusinessRecommendations(window.allBusinessRecommendations);
          }
          
          // 강점/주의사항도 다시 업데이트
          if (window.currentPreviewData && window.currentPreviewData.result) {
            populateStrengthsAndCautions(window.currentPreviewData.result);
          }
        }, 100);
      }
    });
  }
  
  if (typeof updatePdfPreviewTexts === 'function') {
    const texts = LANGUAGE_TEXTS ? LANGUAGE_TEXTS[currentLang] : null;
    if (texts) {
      console.log('📄 PDF 미리보기 모달 다국어화 적용:', currentLang);
      updatePdfPreviewTexts(texts);
    }
  }
  
  // 현재 미리보기 데이터를 전역 변수에 저장 (언어 변경 시 재사용)
  window.currentPreviewData = data;
}

// 업종 추천 데이터를 PDF 미리보기에 채우는 함수 (직접 출력 방식)
function populateBusinessRecommendations(recommendations) {
  try {
    console.log('📊 PDF 업종 추천 데이터 처리 시작:', recommendations);
    if (!recommendations || recommendations.length === 0) {
      console.log('업종 추천 데이터가 없음');
      return;
    }
    
    const currentLang = window.getCurrentAILanguage ? window.getCurrentAILanguage() : 'ko';
    
    // 1위 업종 데이터
    if (recommendations[0]) {
      const firstPlace = recommendations[0];
      console.log('1위 업종 데이터:', firstPlace);
      
      const businessTypeElement = document.getElementById('previewRecommendedBusinessType');
      const percentageElement = document.getElementById('previewRecommendedPercentage');
      
      if (businessTypeElement) {
        // 직접 출력 방식: 현재 언어에 맞는 업종명을 직접 가져오기
        const businessTypeName = getBusinessTypeNameByCurrentLanguage(firstPlace.name, currentLang);
        businessTypeElement.textContent = businessTypeName || '-';
        console.log('📝 1위 업종명 설정:', firstPlace.name, '->', businessTypeName);
      }
      if (percentageElement) {
        percentageElement.textContent = (firstPlace.percentage || 0).toFixed(1) + '%';
        console.log('📊 1위 퍼센트 설정:', firstPlace.percentage);
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
      const businessTypeName2nd = getBusinessTypeNameByCurrentLanguage(secondPlace.name, currentLang);
      document.getElementById('previewRecommended2nd').textContent = businessTypeName2nd || '-';
      document.getElementById('previewRecommended2ndPercent').textContent = (secondPlace.percentage || 0).toFixed(1) + '%';
      console.log('📝 2위 업종명 설정:', secondPlace.name, '->', businessTypeName2nd);
    }
    
    // 3위 업종 데이터
    if (recommendations[2]) {
      const thirdPlace = recommendations[2];
      const businessTypeName3rd = getBusinessTypeNameByCurrentLanguage(thirdPlace.name, currentLang);
      document.getElementById('previewRecommended3rd').textContent = businessTypeName3rd || '-';
      document.getElementById('previewRecommended3rdPercent').textContent = (thirdPlace.percentage || 0).toFixed(1) + '%';
      console.log('📝 3위 업종명 설정:', thirdPlace.name, '->', businessTypeName3rd);
    }
    
    // 4위 업종 데이터
    if (recommendations[3]) {
      const fourthPlace = recommendations[3];
      const businessTypeName4th = getBusinessTypeNameByCurrentLanguage(fourthPlace.name, currentLang);
      document.getElementById('previewRecommended4th').textContent = businessTypeName4th || '-';
      document.getElementById('previewRecommended4thPercent').textContent = (fourthPlace.percentage || 0).toFixed(1) + '%';
      console.log('📝 4위 업종명 설정:', fourthPlace.name, '->', businessTypeName4th);
    }
    
    console.log('✅ PDF 업종 추천 데이터 처리 완료');
    
    // 업종 추천 데이터를 전역 변수에 저장 (언어 변경 시 재사용)
    window.allBusinessRecommendations = recommendations;
    
  } catch (error) {
    console.error('❌ 업종 추천 데이터 처리 오류:', error);
  }
}

// PDF용 업종명 직접 가져오기 함수
function getBusinessTypeNameByCurrentLanguage(koreanName, targetLanguage) {
  if (!window.businessTypes || !koreanName) return koreanName;
  
  // analyze-core.js의 getBusinessTypeNameByLanguage 함수 사용
  if (typeof window.getBusinessTypeNameByLanguage === 'function') {
    return window.getBusinessTypeNameByLanguage(koreanName, targetLanguage);
  }
  
  // 폴백: 직접 처리
  const nameVariations = [
    koreanName.trim(),
    koreanName.replace('외국음식전문점(인도,태국등)', '외국음식전문점(인도, 태국 등)'),
    koreanName.replace('외국음식전문점(인도, 태국 등)', '외국음식전문점(인도,태국등)'),
    // 패밀리레스트랑/패밀리레스토랑 변형 처리
    koreanName.replace('패밀리레스트랑', '패밀리레스토랑'),
    koreanName.replace('패밀리레스토랑', '패밀리레스트랑'),
    koreanName.replace(/,\s*/g, ', '), 
    koreanName.replace(/\s*,/g, ','),
    koreanName.replace(/\s+/g, ''),
  ];
  
  for (const variation of nameVariations) {
    const businessType = window.businessTypes.find(type => type.kor === variation);
    if (businessType) {
      if (targetLanguage === 'en' && businessType.eng) return businessType.eng;
      if (targetLanguage === 'es' && businessType.esp) return businessType.esp;
      return businessType.kor;
    }
  }
  
  console.log(`⚠️ PDF 업종명 매칭 실패: "${koreanName}" (${targetLanguage})`);
  return koreanName;
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
  const currentLang = getCurrentLanguage(); // 이 함수 내에서만 사용
  
  console.log('미리보기 강점/주의사항 분석 데이터:', result);
  // 강점/주의사항 분석을 위한 데이터 처리
  
  // 단위 텍스트 다국어화
  const peopleUnit = currentLang === 'en' ? ' people' : currentLang === 'es' ? ' personas' : '명';
  const storeUnit = currentLang === 'en' ? ' stores' : currentLang === 'es' ? ' tiendas' : '개';
  
  // 생활인구 분석
  const lifePop300 = result.life_pop_300m || 0;
  if (lifePop300 > 5000) {
    if (currentLang === 'en') {
      strengths.push(`Rich residential population within 300m (${Math.round(lifePop300).toLocaleString()} people)`);
    } else if (currentLang === 'es') {
      strengths.push(`Rica población residente dentro de 300m (${Math.round(lifePop300).toLocaleString()} personas)`);
    } else {
      strengths.push('300m 반경 내 생활인구가 풍부합니다 (' + Math.round(lifePop300).toLocaleString() + '명)');
    }
  } else if (lifePop300 < 2000) {
    if (currentLang === 'en') {
      cautions.push(`Low residential population within 300m (${Math.round(lifePop300).toLocaleString()} people)`);
    } else if (currentLang === 'es') {
      cautions.push(`Baja población residente dentro de 300m (${Math.round(lifePop300).toLocaleString()} personas)`);
    } else {
      cautions.push('300m 반경 내 생활인구가 부족합니다 (' + Math.round(lifePop300).toLocaleString() + '명)');
    }
  }
  
  // 직장인구 분석
  const workingPop300 = result.working_pop_300m || 0;
  if (workingPop300 > 3000) {
    if (currentLang === 'en') {
      strengths.push('Large working population within 300m radius - good for lunch/dinner demand');
    } else if (currentLang === 'es') {
      strengths.push('Gran población trabajadora dentro de un radio de 300m: buena para la demanda de almuerzo/cena');
    } else {
      strengths.push('300m 반경 내 직장인구가 많아 점심/저녁 수요가 기대됩니다');
    }
  } else if (workingPop300 < 1000) {
    if (currentLang === 'en') {
      cautions.push('Low working population within 300m radius - limited weekday demand expected');
    } else if (currentLang === 'es') {
      cautions.push('Baja población trabajadora dentro de un radio de 300m: demanda limitada entre semana');
    } else {
      cautions.push('300m 반경 내 직장인구가 적어 평일 수요가 제한적일 수 있습니다');
    }
  }
  
  // 경쟁업체 분석
  const competitor300 = result.competitor_300m || 0;
  if (competitor300 < 3) {
    if (currentLang === 'en') {
      strengths.push('Few competitors within 300m radius - good market entry opportunity');
    } else if (currentLang === 'es') {
      strengths.push('Pocos competidores dentro de un radio de 300m: buena oportunidad de entrada al mercado');
    } else {
      strengths.push('300m 반경 내 경쟁업체가 적어 시장 선점 기회가 있습니다');
    }
  } else if (competitor300 > 10) {
    if (currentLang === 'en') {
      cautions.push(`Many competitors within 300m radius - intense competition expected (${competitor300} stores)`);
    } else if (currentLang === 'es') {
      cautions.push(`Muchos competidores dentro de un radio de 300m: se espera competencia intensa (${competitor300} tiendas)`);
    } else {
      cautions.push('300m 반경 내 경쟁업체가 많아 치열한 경쟁이 예상됩니다 (' + competitor300 + '개)');
    }
  }
  
  // 경쟁강도 분석 (새로 추가)
  const competitorRatio = result.competitor_ratio_300m || 0;
  if (competitorRatio < 20) {
    if (currentLang === 'en') {
      strengths.push(`Low competition intensity - favorable for market entry (${competitorRatio.toFixed(1)}%)`);
    } else if (currentLang === 'es') {
      strengths.push(`Baja intensidad de competencia: favorable para la entrada al mercado (${competitorRatio.toFixed(1)}%)`);
    } else {
      strengths.push('경쟁강도가 낮아 시장 진입이 유리합니다 (' + competitorRatio.toFixed(1) + '%)');
    }
  } else if (competitorRatio > 60) {
    if (currentLang === 'en') {
      cautions.push(`High competition intensity - intense competition expected (${competitorRatio.toFixed(1)}%)`);
    } else if (currentLang === 'es') {
      cautions.push(`Alta intensidad de competencia: se espera competencia intensa (${competitorRatio.toFixed(1)}%)`);
    } else {
      cautions.push('경쟁강도가 높아 치열한 경쟁이 예상됩니다 (' + competitorRatio.toFixed(1) + '%)');
    }
  }
  
  // 업종 다양성 분석 (새로 추가)
  const businessDiversity = result.business_diversity_300m || 0;
  if (businessDiversity > 15) {
    if (currentLang === 'en') {
      strengths.push('High business diversity indicates an active commercial area');
    } else if (currentLang === 'es') {
      strengths.push('Alta diversidad de negocios indica un área comercial activa');
    } else {
      strengths.push('주변 업종이 다양해 상권이 활성화되어 있습니다');
    }
  } else if (businessDiversity < 5) {
    if (currentLang === 'en') {
      cautions.push('Low business diversity may limit commercial area vitality');
    } else if (currentLang === 'es') {
      cautions.push('Baja diversidad de negocios puede limitar la vitalidad del área comercial');
    } else {
      cautions.push('주변 업종 다양성이 부족해 상권 활력이 제한적일 수 있습니다');
    }
  }
  
  // 공시지가 분석
  const landValue = result.total_land_value || 0;
  if (landValue < 50000000) { // 5천만원 미만
    if (currentLang === 'en') {
      strengths.push('Relatively low public land price - expected lower rental burden');
    } else if (currentLang === 'es') {
      strengths.push('Precio del terreno público relativamente bajo: se espera menor carga de alquiler');
    } else {
      strengths.push('상대적으로 낮은 공시지가로 임대료 부담이 적을 것으로 예상됩니다');
    }
  } else if (landValue > 200000000) { // 2억 초과
    if (currentLang === 'en') {
      cautions.push('High public land price may result in significant rental burden');
    } else if (currentLang === 'es') {
      cautions.push('Alto precio del terreno público puede resultar en una carga de alquiler significativa');
    } else {
      cautions.push('높은 공시지가로 인한 임대료 부담이 클 수 있습니다');
    }
  }
  
  // 외국인 고객층 분석 (새로 추가)
  const tempForeign1000 = result['2A_Temp_Total'] || result.temp_foreign_1000m || 0;
  const longForeign300 = result['1A_Long_Total'] || result.long_foreign_300m || 0;
  
  if (tempForeign1000 > 3000 || longForeign300 > 1000) {
    if (currentLang === 'en') {
      strengths.push('Rich foreign customer base - diverse customer acquisition possible');
    } else if (currentLang === 'es') {
      strengths.push('Rica base de clientes extranjeros: posible adquisición de clientes diversos');
    } else {
      strengths.push('외국인 고객층이 풍부해 다양한 고객 확보 가능');
    }
  }
  
  // 연령대별 인구 분석 (새로 추가)
  const age20 = result['2A_20'] || result.life_pop_20_1000m || 0;
  const age30 = result['2A_30'] || result.life_pop_30_1000m || 0;
  const age40 = result['2A_40'] || result.life_pop_40_1000m || 0;
  
  if (age20 > 25 || age30 > 25) {
    if (currentLang === 'en') {
      strengths.push('High proportion of young age groups - favorable for trendy businesses');
    } else if (currentLang === 'es') {
      strengths.push('Alta proporción de grupos de edad jóvenes: favorable para negocios de moda');
    } else {
      strengths.push('젊은 연령층 비율이 높아 트렌디한 업종에 유리');
    }
  } else if (age40 > 30) {
    if (currentLang === 'en') {
      strengths.push('High proportion of middle-aged groups - stable consumption patterns expected');
    } else if (currentLang === 'es') {
      strengths.push('Alta proporción de grupos de mediana edad: se esperan patrones de consumo estables');
    } else {
      strengths.push('중장년층 비율이 높아 안정적인 소비 패턴 기대');
    }
  }
  
  // 유동인구 유발시설 분석
  const publicBuilding = result.public_building_250m || 0;
  const school = result.school_250m || 0;
  if (publicBuilding > 0 || school > 0) {
    if (currentLang === 'en') {
      strengths.push('Nearby foot traffic generating facilities - favorable for customer influx');
    } else if (currentLang === 'es') {
      strengths.push('Instalaciones cercanas que generan tráfico peatonal: favorable para la afluencia de clientes');
    } else {
      strengths.push('주변 유동인구 유발시설이 있어 고객 유입에 유리');
    }
  }
  
  // 생존 확률 분석
  const survivalRate = result.survival_percentage || 0;
  if (survivalRate >= 80) {
    if (currentLang === 'en') {
      strengths.push('Very high AI predicted survival rate - stable business operation expected');
    } else if (currentLang === 'es') {
      strengths.push('Muy alta tasa de supervivencia predicha por IA: se espera operación comercial estable');
    } else {
      strengths.push('AI 예측 생존 확률이 매우 높아 안정적인 사업 운영이 기대됩니다');
    }
  } else if (survivalRate < 50) {
    if (currentLang === 'en') {
      cautions.push('Low AI predicted survival rate - careful business planning required');
    } else if (currentLang === 'es') {
      cautions.push('Baja tasa de supervivencia predicha por IA: se requiere planificación comercial cuidadosa');
    } else {
      cautions.push('AI 예측 생존 확률이 낮아 신중한 사업 계획이 필요합니다');
    }
  }
  
  // 기본 메시지 추가
  if (strengths.length === 0) {
    if (currentLang === 'en') {
      strengths.push('Current commercial area conditions are at average level');
    } else if (currentLang === 'es') {
      strengths.push('Las condiciones actuales del área comercial están en nivel promedio');
    } else {
      strengths.push('현재 상권 조건이 평균적인 수준입니다');
    }
  }
  if (cautions.length === 0) {
    if (currentLang === 'en') {
      cautions.push('Current commercial area conditions are favorable');
    } else if (currentLang === 'es') {
      cautions.push('Las condiciones actuales del área comercial son favorables');
    } else {
      cautions.push('현재 상권 조건이 양호합니다');
    }
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

// PDF 미리보기 섹션 제목들 다국어화 함수 (강화된 버전)
function updatePdfPreviewSectionTitles(currentLanguage) {
  try {
    console.log('🔄 PDF 미리보기 완전 다국어화 적용:', currentLanguage);
    
    // 🎯 하드코딩된 섹션 제목들 직접 업데이트
    
    // 1. 연령대별 인구 분석 섹션 - 더 정확한 선택자 사용
    const ageAnalysisTitles = document.querySelectorAll('#previewContent h5');
    ageAnalysisTitles.forEach(title => {
      if (title.textContent.includes('연령대별 인구 분석') || 
          title.textContent.includes('Population Analysis by Age Group') ||
          title.textContent.includes('Análisis de Población por Grupo de Edad')) {
        if (currentLanguage === 'en') {
          title.innerHTML = '<i class="bi bi-people me-2"></i>Population Analysis by Age Group (1000m radius)';
        } else if (currentLanguage === 'es') {
          title.innerHTML = '<i class="bi bi-people me-2"></i>Análisis de Población por Grupo de Edad (radio de 1000m)';
        } else {
          title.innerHTML = '<i class="bi bi-people me-2"></i>연령대별 인구 분석 (1000m 반경)';
        }
      }
    });
    
    // 2. AI 추천 업종 섹션
    const businessRecommendationsTitle = document.querySelector('#previewBusinessRecommendations h5');
    if (businessRecommendationsTitle && businessRecommendationsTitle.textContent.includes('AI 추천 업종')) {
      if (currentLanguage === 'en') {
        businessRecommendationsTitle.innerHTML = '<i class="bi bi-star me-2"></i>AI Recommended Business Types (Members Only)';
      } else if (currentLanguage === 'es') {
        businessRecommendationsTitle.innerHTML = '<i class="bi bi-star me-2"></i>Tipos de Negocio Recomendados por IA (Solo Miembros)';
      } else {
        businessRecommendationsTitle.innerHTML = '<i class="bi bi-star me-2"></i>AI 추천 업종 (회원 전용)';
      }
    }
    
    // 3. AI 분석 리포트 섹션
    const aiReportTitle = document.querySelector('#previewAiReport h5');
    if (aiReportTitle && aiReportTitle.textContent.includes('AI 분석 리포트')) {
      if (currentLanguage === 'en') {
        aiReportTitle.innerHTML = '<i class="bi bi-cpu me-2"></i>AI Analysis Report';
      } else if (currentLanguage === 'es') {
        aiReportTitle.innerHTML = '<i class="bi bi-cpu me-2"></i>Informe de Análisis IA';
      } else {
        aiReportTitle.innerHTML = '<i class="bi bi-cpu me-2"></i>AI 분석 리포트';
      }
    }
    
    // 4. 강점/주의사항 제목들
    const strengthsHeader = document.querySelector('#previewStrengthsList').parentElement.querySelector('.card-header h6');
    if (strengthsHeader && strengthsHeader.textContent.includes('강점')) {
      if (currentLanguage === 'en') {
        strengthsHeader.innerHTML = '<i class="bi bi-check-circle me-2"></i>Strengths';
      } else if (currentLanguage === 'es') {
        strengthsHeader.innerHTML = '<i class="bi bi-check-circle me-2"></i>Fortalezas';
      } else {
        strengthsHeader.innerHTML = '<i class="bi bi-check-circle me-2"></i>강점';
      }
    }
    
    const cautionsHeader = document.querySelector('#previewCautionsList').parentElement.querySelector('.card-header h6');
    if (cautionsHeader && cautionsHeader.textContent.includes('주의사항')) {
      if (currentLanguage === 'en') {
        cautionsHeader.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Cautions';
      } else if (currentLanguage === 'es') {
        cautionsHeader.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>Precauciones';
      } else {
        cautionsHeader.innerHTML = '<i class="bi bi-exclamation-triangle me-2"></i>주의사항';
      }
    }
    
    // 5. 카드 제목들 업데이트
    const cardTitles = document.querySelectorAll('#previewContent .card-title');
    cardTitles.forEach(element => {
      const text = element.textContent.trim();
      
      if (text === '연령대별 인구 비율' || text === 'Population by Age Group' || text === 'Población por Grupo de Edad') {
        if (currentLanguage === 'en') {
          element.textContent = 'Population by Age Group';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Población por Grupo de Edad';
        } else {
          element.textContent = '연령대별 인구 비율';
        }
      }
      
      if (text === '연령대별 상세 정보' || text === 'Detailed Age Information' || text === 'Información Detallada de Edad') {
        if (currentLanguage === 'en') {
          element.textContent = 'Detailed Age Information';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Información Detallada de Edad';
        } else {
          element.textContent = '연령대별 상세 정보';
        }
      }
      
      if (text === '경쟁업체 현황' || text === 'Competitor Status' || text === 'Estado de la Competencia') {
        if (currentLanguage === 'en') {
          element.textContent = 'Competitor Status';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Estado de la Competencia';
        } else {
          element.textContent = '경쟁업체 현황';
        }
      }
      
      if (text === '경쟁 강도' || text === 'Competition Intensity' || text === 'Intensidad de Competencia') {
        if (currentLanguage === 'en') {
          element.textContent = 'Competition Intensity';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Intensidad de Competencia';
        } else {
          element.textContent = '경쟁 강도';
        }
      }
    });
    
    // 6. 연령대 라벨들 업데이트
    const ageLabels = document.querySelectorAll('#previewContent small.text-muted');
    ageLabels.forEach(element => {
      const text = element.textContent.trim();
      
      if (text === '20대' || text === '20s') {
        element.textContent = currentLanguage === 'en' ? '20s' : 
                             currentLanguage === 'es' ? '20s' : '20대';
      } else if (text === '30대' || text === '30s') {
        element.textContent = currentLanguage === 'en' ? '30s' : 
                             currentLanguage === 'es' ? '30s' : '30대';
      } else if (text === '40대' || text === '40s') {
        element.textContent = currentLanguage === 'en' ? '40s' : 
                             currentLanguage === 'es' ? '40s' : '40대';
      } else if (text === '50대' || text === '50s') {
        element.textContent = currentLanguage === 'en' ? '50s' : 
                             currentLanguage === 'es' ? '50s' : '50대';
      } else if (text === '60대 이상' || text === '60+') {
        element.textContent = currentLanguage === 'en' ? '60+' : 
                             currentLanguage === 'es' ? '60+' : '60대 이상';
      } else if (text === '동일업종' || text === 'Same Industry' || text === 'Misma Industria') {
        if (currentLanguage === 'en') {
          element.textContent = 'Same Industry';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Misma Industria';
        } else {
          element.textContent = '동일업종';
        }
      } else if (text === '인접업체' || text === 'Adjacent Businesses' || text === 'Negocios Adyacentes') {
        if (currentLanguage === 'en') {
          element.textContent = 'Adjacent Businesses';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Negocios Adyacentes';
        } else {
          element.textContent = '인접업체';
        }
      } else if (text.includes('1000m 반경') || text.includes('1000m radius') || text.includes('radio de 1000m')) {
        if (currentLanguage === 'en') {
          element.textContent = 'Based on population within 1000m radius';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Basado en la población dentro del radio de 1000m';
        } else {
          element.textContent = '1000m 반경 내 생활인구 기준';
        }
      } else if (text.includes('300m 반경') || text.includes('300m radius') || text.includes('radio de 300m')) {
        if (currentLanguage === 'en') {
          element.textContent = '300m radius';
        } else if (currentLanguage === 'es') {
          element.textContent = 'radio de 300m';
        } else {
          element.textContent = '300m 반경';
        }
      } else if (text === 'AI 예측 생존확률' || text === 'AI Predicted Survival Rate' || text === 'Tasa de Supervivencia Predicha por IA') {
        if (currentLanguage === 'en') {
          element.textContent = 'AI Predicted Survival Rate';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Tasa de Supervivencia Predicha por IA';
        } else {
          element.textContent = 'AI 예측 생존확률';
        }
      }
    });
    
    // 7. 분석중... 텍스트들 업데이트
    const analyzingTexts = document.querySelectorAll('#previewContent li, #previewContent .badge, #previewContent span');
    analyzingTexts.forEach(element => {
      const text = element.textContent.trim();
      if (text === '분석 중...' || text === '분석중...' || text === 'Analyzing...' || text === 'Analizando...') {
        if (currentLanguage === 'en') {
          element.textContent = 'Analyzing...';
        } else if (currentLanguage === 'es') {
          element.textContent = 'Analizando...';
        } else {
          element.textContent = '분석 중...';
        }
      }
    });
    
    // 8. 순위 표시 텍스트 업데이트 (1위, 2위, 3위, 4위)
    const rankBadges = document.querySelectorAll('#previewContent .badge');
    rankBadges.forEach(element => {
      const text = element.textContent.trim();
      
      if (text === '🏆 1위' || text === '🏆 1st' || text === '🏆 1º') {
        if (currentLanguage === 'en') {
          element.textContent = '🏆 1st';
        } else if (currentLanguage === 'es') {
          element.textContent = '🏆 1º';
        } else {
          element.textContent = '🏆 1위';
        }
      } else if (text === '2위' || text === '2nd' || text === '2º') {
        if (currentLanguage === 'en') {
          element.textContent = '2nd';
        } else if (currentLanguage === 'es') {
          element.textContent = '2º';
        } else {
          element.textContent = '2위';
        }
      } else if (text === '3위' || text === '3rd' || text === '3º') {
        if (currentLanguage === 'en') {
          element.textContent = '3rd';
        } else if (currentLanguage === 'es') {
          element.textContent = '3º';
        } else {
          element.textContent = '3위';
        }
      } else if (text === '4위' || text === '4th' || text === '4º') {
        if (currentLanguage === 'en') {
          element.textContent = '4th';
        } else if (currentLanguage === 'es') {
          element.textContent = '4º';
        } else {
          element.textContent = '4위';
        }
      }
    });
    
    console.log('✅ PDF 미리보기 완전 다국어화 완료');
    
  } catch (error) {
    console.error('❌ PDF 미리보기 섹션 제목 다국어화 오류:', error);
  }
}

// PDF 미리보기용 파이차트 업데이트 함수
let previewAgeChart = null;

function updatePreviewAgeChart(ageData) {
  const currentLang = getCurrentLanguage();
  
  // 다국어 레이블 설정
  let labels = ['20대', '30대', '40대', '50대', '60대 이상'];
  if (currentLang === 'en') {
    labels = ['20s', '30s', '40s', '50s', '60+'];
  } else if (currentLang === 'es') {
    labels = ['20s', '30s', '40s', '50s', '60+'];
  }
  
  const chartData = {
    labels: labels,
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