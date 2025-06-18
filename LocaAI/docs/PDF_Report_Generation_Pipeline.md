# LocaAI PDF 리포트 생성 파이프라인 문서

## 📋 문서 개요
이 문서는 LocaAI 프로젝트에서 AI 상권분석 결과를 PDF 리포트로 생성하는 전체 과정을 상세히 설명합니다. 서버 사이드 데이터 처리부터 클라이언트 사이드 PDF 생성까지의 완전한 파이프라인을 다룹니다.

**작성일**: 2025-06-11  
**버전**: 1.0  
**생성 방식**: 클라이언트 사이드 (jsPDF + html2canvas)

---

## 🏗️ 전체 아키텍처

### PDF 생성 방식
- **서버 역할**: 데이터 제공 (JSON API)
- **클라이언트 역할**: PDF 생성 및 다운로드
- **라이브러리**: jsPDF (PDF 생성) + html2canvas (HTML → 이미지 변환)

### 데이터 플로우 개요
```
1. 사용자 PDF 생성 요청
   ↓
2. 서버: 분석 결과 데이터 포맷팅 (get_pdf_data)
   ↓
3. 클라이언트: JSON 데이터 수신
   ↓
4. 클라이언트: HTML 미리보기 생성
   ↓
5. 클라이언트: html2canvas로 이미지 변환
   ↓
6. 클라이언트: jsPDF로 PDF 생성 및 다운로드
```

---

## 📊 데이터베이스 연관 관계

### 주요 테이블 및 모델
```
AnalysisRequest (분석 요청)
├── id (PK)
├── address, area, business_type_id
├── longitude, latitude, x_coord, y_coord
├── service_type, created_at
└── [1:1] → AnalysisResult

AnalysisResult (분석 결과)
├── request_id (FK, OneToOne)
├── 생활인구: life_pop_300m, life_pop_*_300m, life_pop_*_1000m
├── 외국인: temp_foreign_1000m, temp_foreign_cn_*, long_foreign_*
├── 시설: working_pop_300m, school_250m, public_building_250m
├── 상권: competitor_300m, adjacent_biz_300m, competitor_ratio_300m
├── 공시지가: total_land_value
└── AI 결과: survival_probability, survival_percentage

BusinessType (업종 마스터)
├── id (PK)
└── name
```

---

## 🔧 서버 사이드 처리

### 📄 views.py - `get_pdf_data(request, request_id)`

#### 함수 시그니처
```python
@csrf_exempt
def get_pdf_data(request, request_id):
    """
    PDF 생성을 위한 분석 결과 데이터 제공 (jsPDF용)
    
    Args:
        request: HTTP 요청 객체
        request_id (int): 분석 요청 ID
        
    Returns:
        JsonResponse: PDF 생성용 데이터 또는 에러 메시지
    """
```

#### 데이터 조회 과정

##### 1. 분석 결과 조회
```python
# 분석 요청 및 결과 조회
analysis_request = AnalysisRequest.objects.get(id=request_id)
analysis_result = AnalysisResult.objects.get(request=analysis_request)
```

**관련 필드**:
- `analysis_request.address` - 분석 대상 주소
- `analysis_request.area` - 사업장 면적(㎡)
- `analysis_request.business_type_id` - 업종 ID (FK)
- `analysis_request.service_type` - 서비스 유형 (0: 휴게음식점, 1: 일반음식점)
- `analysis_request.created_at` - 분석 일시

##### 2. 업종명 변환
```python
try:
    business_type = BusinessType.objects.get(id=analysis_request.business_type_id)
    business_type_name = business_type.name
except BusinessType.DoesNotExist:
    business_type_name = "알 수 없음"
```

**변수명**:
- `business_type` - BusinessType 모델 인스턴스
- `business_type_name` - 업종명 문자열

##### 3. 서비스 유형명 변환
```python
service_type_map = {1: '일반음식점', 2: '휴게음식점', 3: '매장'}
service_type_name = service_type_map.get(analysis_request.service_type, '알 수 없음')
```

**변수명**:
- `service_type_map` - 서비스 유형 매핑 딕셔너리
- `service_type_name` - 변환된 서비스 유형명

##### 4. AI 분석 결과 판정
```python
survival_rate = analysis_result.survival_percentage or 0
if survival_rate >= 80:
    analysis_text = "높은 생존 가능성 - 현재 위치는 장기적으로 사업을 지속하기에 매우 좋은 조건을 갖추고 있습니다."
elif survival_rate >= 60:
    analysis_text = "보통 생존 가능성 - 현재 위치는 사업 지속에 적절한 조건을 갖추고 있으나, 추가적인 전략 검토가 필요합니다."
else:
    analysis_text = "낮은 생존 가능성 - 현재 위치는 장기 사업 지속에 어려움이 예상됩니다. 신중한 검토가 필요합니다."
```

**판정 기준**:
- **80% 이상**: 높은 생존 가능성
- **60-79%**: 보통 생존 가능성  
- **59% 이하**: 낮은 생존 가능성

**변수명**:
- `survival_rate` - 생존 확률 퍼센트
- `analysis_text` - AI 분석 텍스트

#### 데이터 구조화

##### PDF 데이터 구조 (`pdf_data`)
```python
pdf_data = {
    'title': 'AI 상권분석 보고서',
    'basic_info': {
        'address': analysis_request.address,
        'business_type': business_type_name,
        'area': f"{analysis_request.area}㎡",
        'service_type': service_type_name,
        'analysis_date': analysis_request.created_at.strftime('%Y년 %m월 %d일 %H:%M')
    },
    'key_metrics': {
        'life_pop_300m': f"{int(analysis_result.life_pop_300m or 0):,}명",
        'working_pop_300m': f"{int(analysis_result.working_pop_300m or 0):,}명",
        'competitor_300m': f"{analysis_result.competitor_300m or 0}개",
        'total_land_value': format_currency(analysis_result.total_land_value or 0)
    },
    'ai_analysis': {
        'survival_rate': f"{survival_rate:.1f}%",
        'analysis_text': analysis_text
    },
    'competition_analysis': {
        'competitor_count': f"{analysis_result.competitor_300m or 0}개",
        'total_business': f"{analysis_result.adjacent_biz_300m or 0}개",
        'competitor_ratio': f"{analysis_result.competitor_ratio_300m or 0:.1f}%",
        'business_diversity': f"{analysis_result.business_diversity_300m or 0}종류"
    },
    'detailed_analysis': {
        'temp_foreign_1000m': f"{int(analysis_result.temp_foreign_1000m or 0):,}명",
        'long_foreign_300m': f"{int(analysis_result.long_foreign_300m or 0):,}명",
        'long_foreign_1000m': f"{int(analysis_result.long_foreign_1000m or 0):,}명",
        'temp_foreign_cn_300m': f"{analysis_result.temp_foreign_cn_300m or 0:.1f}%",
        'temp_foreign_cn_1000m': f"{analysis_result.temp_foreign_cn_1000m or 0:.1f}%",
        'long_foreign_cn_1000m': f"{analysis_result.long_foreign_cn_1000m or 0:.1f}%",
        'school_250m': f"{analysis_result.school_250m or 0}개",
        'public_building_250m': f"{analysis_result.public_building_250m or 0}개"
    }
}
```

**데이터 섹션별 설명**:

1. **basic_info**: 기본 분석 정보
   - 주소, 업종, 면적, 서비스 유형, 분석 일시

2. **key_metrics**: 핵심 지표 (300m 반경)
   - 생활인구, 직장인구, 경쟁업체 수, 총 공시지가

3. **ai_analysis**: AI 분석 결과
   - 생존 확률, 분석 텍스트

4. **competition_analysis**: 경쟁 분석 (300m 반경)
   - 경쟁업체 수, 전체 요식업체 수, 경쟁업체 비율, 업종 다양성

5. **detailed_analysis**: 상세 분석
   - 외국인 인구, 중국인 비율, 학교/공공건물 수

### 📄 views.py - `format_currency(value)`

#### 함수 시그니처
```python
def format_currency(value):
    """
    통화 포맷팅 함수
    
    Args:
        value (float): 포맷팅할 금액 (원 단위)
        
    Returns:
        str: 포맷팅된 통화 문자열
    """
```

#### 포맷팅 로직
```python
if value >= 100000000:  # 1억 이상
    return f"₩{value/100000000:.1f}억"
elif value >= 10000:  # 1만 이상
    return f"₩{value/10000:.0f}만"
else:
    return f"₩{value:,.0f}"
```

**포맷 예시**:
- `150000000` → `"₩1.5억"`
- `50000` → `"₩5만"`
- `1000` → `"₩1,000"`

### URL 엔드포인트

#### PDF 데이터 API
```python
# urls.py
path('pdf-data/<int:request_id>/', views.get_pdf_data, name='get_pdf_data'),
```

**전체 URL**: `/ai_analyzer/pdf-data/{request_id}/`

**HTTP 메서드**: GET  
**데코레이터**: `@csrf_exempt`

---

## 🎨 클라이언트 사이드 처리

### 📄 analyze.html - PDF 생성 JavaScript

#### 라이브러리 로드
```html
<!-- jsPDF 라이브러리 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<!-- html2canvas 라이브러리 -->
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
<!-- jsPDF 한국어 폰트 지원 -->
<script src="https://cdn.jsdelivr.net/npm/jspdf-customfonts@0.0.4/dist/jspdf-customfonts.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf-customfonts@0.0.4/dist/customfonts.js"></script>
```

**라이브러리 역할**:
- `jsPDF`: PDF 생성 라이브러리
- `html2canvas`: HTML을 이미지로 변환
- `jspdf-customfonts`: 한국어 폰트 지원

#### 주요 함수들

##### 1. `generatePDF()` - PDF 생성 메인 함수
```javascript
function generatePDF() {
    // 현재 분석 결과 ID 확인
    if (!currentRequestId) {
        alert('분석 결과가 없습니다. 먼저 분석을 실행해주세요.');
        return;
    }
    
    // PDF 미리보기 업데이트
    updatePdfPreview();
    
    // PDF 모달 표시
    const pdfModal = new bootstrap.Modal(document.getElementById('pdfModal'));
    pdfModal.show();
    
    // UI 상태 초기화
    document.getElementById('pdfPreviewContainer').style.display = 'block';
    document.getElementById('pdfGenerating').style.display = 'none';
    document.getElementById('pdfError').style.display = 'none';
    document.getElementById('downloadPdfBtn').style.display = 'inline-block';
    document.getElementById('retryPdfBtn').style.display = 'none';
}
```

**변수명**:
- `currentRequestId` - 현재 분석 결과 ID (전역 변수)
- `pdfModal` - Bootstrap 모달 인스턴스

##### 2. `updatePdfPreview()` - PDF 미리보기 업데이트
```javascript
function updatePdfPreview() {
    // 현재 분석 결과에서 데이터 추출
    const analysisData = window.currentAnalysisData;
    
    if (!analysisData) {
        console.warn('분석 데이터가 없습니다.');
        return;
    }
    
    // 미리보기 HTML 요소들 업데이트
    document.getElementById('preview-address').textContent = analysisData.address || '-';
    document.getElementById('preview-business-type').textContent = analysisData.business_type || '-';
    document.getElementById('preview-area').textContent = `${analysisData.area || 0}㎡`;
    document.getElementById('preview-analysis-date').textContent = analysisData.created_at || '-';
    
    // 핵심 지표 업데이트
    document.getElementById('preview-life-pop').textContent = `${parseInt(analysisData.life_pop_300m || 0).toLocaleString()}명`;
    document.getElementById('preview-working-pop').textContent = `${parseInt(analysisData.working_pop_300m || 0).toLocaleString()}명`;
    document.getElementById('preview-competitors').textContent = `${analysisData.competitor_300m || 0}개`;
    document.getElementById('preview-land-value').textContent = `${parseInt(analysisData.total_land_value || 0).toLocaleString()}원`;
    
    // AI 분석 결과 업데이트
    const survivalRate = parseFloat(analysisData.survival_percentage || 0);
    document.getElementById('preview-survival-rate').textContent = `${survivalRate.toFixed(1)}%`;
    
    // 생존 확률 진행바 업데이트
    const progressBar = document.getElementById('preview-progress-fill');
    progressBar.style.width = `${survivalRate}%`;
    
    // 추가 지표들 업데이트...
}
```

**변수명**:
- `analysisData` - 현재 분석 데이터 (전역 변수 `window.currentAnalysisData`)
- `survivalRate` - 생존 확률 퍼센트
- `progressBar` - 생존 확률 진행바 요소

##### 3. `downloadPDF()` - PDF 다운로드 메인 함수
```javascript
function downloadPDF() {
    // 현재 분석 결과 ID 확인
    if (!currentRequestId) {
        alert('분석 결과가 없습니다.');
        return;
    }
    
    // UI 상태: 생성 중으로 변경
    document.getElementById('pdfPreviewContainer').style.display = 'none';
    document.getElementById('pdfError').style.display = 'none';
    document.getElementById('pdfGenerating').style.display = 'block';
    document.getElementById('downloadPdfBtn').style.display = 'none';
    document.getElementById('retryPdfBtn').style.display = 'none';
    
            // 서버에서 PDF 데이터 가져오기
    fetch(`/ai_analyzer/pdf-data/${currentRequestId}/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('PDF 데이터를 가져올 수 없습니다.');
        }
        return response.json();
    })
    .then(data => {
        // 미리보기를 다시 표시하고 PDF 생성
        document.getElementById('pdfPreviewContainer').style.display = 'block';
        // jsPDF로 PDF 생성
        generatePDFWithJsPDF(data);
    })
    .catch(error => {
        console.error('PDF 생성 오류:', error);
        
        // 오류 상태 표시
        document.getElementById('pdfGenerating').style.display = 'none';
        document.getElementById('pdfPreviewContainer').style.display = 'none';
        document.getElementById('pdfError').style.display = 'block';
        document.getElementById('pdfErrorMessage').textContent = error.message;
        document.getElementById('retryPdfBtn').style.display = 'inline-block';
    });
}
```

**API 호출**:
- **URL**: `/ai_analyzer/pdf-data/${currentRequestId}/`
- **메서드**: GET
- **응답**: JSON 형태의 PDF 데이터

##### 4. `generatePDFWithJsPDF(data)` - jsPDF 기반 PDF 생성
```javascript
function generatePDFWithJsPDF(data) {
    try {
        // 미리보기 컨테이너를 이미지로 변환
        const element = document.getElementById('pdfPreviewContainer');
        
        // PDF 생성 상태 표시
        document.getElementById('pdfGenerating').style.display = 'block';
        document.getElementById('downloadPdfBtn').style.display = 'none';
        
        // html2canvas 설정
        html2canvas(element, {
            scale: 1.2, // 해상도 조정
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: element.offsetWidth,
            height: element.offsetHeight,
            removeContainer: true,
            imageTimeout: 0,
            logging: false
        }).then(canvas => {
            // jsPDF 인스턴스 생성
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
```

**html2canvas 설정값**:
- `scale: 1.2` - 해상도 조정 (고화질)
- `useCORS: true` - CORS 이미지 허용
- `allowTaint: true` - 외부 이미지 허용
- `backgroundColor: '#ffffff'` - 배경색 흰색
- `imageTimeout: 0` - 이미지 로딩 타임아웃 무제한
- `logging: false` - 로깅 비활성화

**jsPDF 설정값**:
- `'p'` - Portrait (세로) 방향
- `'mm'` - 밀리미터 단위
- `'a4'` - A4 용지 크기
- `imgWidth: 210mm` - A4 용지 너비
- `pageHeight: 297mm` - A4 용지 높이
- `JPEG 품질: 0.8` - 80% 품질 (용량 최적화)

**변수명**:
- `element` - PDF로 변환할 HTML 요소
- `canvas` - html2canvas로 생성된 캔버스
- `doc` - jsPDF 문서 인스턴스
- `imgData` - Base64 인코딩된 이미지 데이터
- `imgWidth`, `imgHeight` - 이미지 크기 (mm)
- `heightLeft` - 남은 페이지 높이
- `position` - 현재 이미지 위치
- `filename` - PDF 파일명

##### 5. `generateLightweightPDF(data)` - 경량 텍스트 기반 PDF
```javascript
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
        
        // 각 섹션별 텍스트 추가...
        // (기본 정보, AI 분석 결과, 핵심 지표, 경쟁 분석, 상세 분석)
        
        // 파일명 생성 및 다운로드
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `AI_Analysis_Light_${currentDate}.pdf`;
        doc.save(filename);
        
    } catch (error) {
        console.error('경량 PDF 생성 오류:', error);
        // 오류 처리...
    }
}
```

**경량 PDF 특징**:
- 이미지 없이 순수 텍스트만 사용
- 파일 크기 최소화
- 영문 표기로 폰트 문제 해결
- 빠른 생성 속도

**변수명**:
- `yPos` - 현재 Y 위치 (mm)
- `lineHeight` - 줄 간격 (mm)
- `margin` - 페이지 여백 (mm)
- `pageWidth` - 텍스트 영역 너비 (mm)

---

## 🎨 템플릿 구조

### 📄 pdf_report.html - PDF 미리보기 템플릿

#### CSS 스타일링
```css
@import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Nanum Gothic', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.6;
    color: #333;
    background: white;
    padding: 20px;
}
```

**폰트 설정**:
- `Nanum Gothic` - 한국어 지원 웹폰트
- `Arial` - 백업 폰트
- `font-size: 12px` - 기본 폰트 크기
- `line-height: 1.6` - 줄 간격

#### 주요 스타일 클래스

##### 헤더 섹션
```css
.header {
    text-align: center;
    padding: 20px 0;
    border-bottom: 3px solid #1e3a8a;
    margin-bottom: 30px;
}

.header h1 {
    font-size: 24px;
    font-weight: 800;
    color: #1e3a8a;
    margin-bottom: 5px;
}
```

##### 지표 카드
```css
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    margin-bottom: 20px;
}

.metric-card {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 15px;
    text-align: center;
}

.metric-value {
    font-size: 18px;
    font-weight: 700;
    color: #1e3a8a;
    margin-bottom: 5px;
}
```

##### 생존 확률 섹션
```css
.survival-section {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    margin-bottom: 20px;
}

.survival-percentage {
    font-size: 36px;
    font-weight: 800;
    color: #1e3a8a;
    margin-bottom: 10px;
}

.progress-bar {
    width: 100%;
    height: 20px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
    border-radius: 10px;
}
```

**생존 확률 색상**:
- `#dc3545` (빨강) - 0-50% (위험)
- `#ffc107` (노랑) - 50-80% (보통)
- `#28a745` (초록) - 80-100% (양호)

#### HTML 구조
```html
<div class="header">
    <h1>AI 상권분석 보고서</h1>
    <div class="subtitle">인공지능 기반 상업지구 분석 결과</div>
</div>

<div class="location-info">
    <h3>📍 분석 대상 정보</h3>
    <div class="info-grid">
        <div class="info-item"><strong>주소:</strong> {{ result.address }}</div>
        <div class="info-item"><strong>업종:</strong> {{ result.business_type }}</div>
        <div class="info-item"><strong>면적:</strong> {{ result.area }}㎡</div>
        <div class="info-item"><strong>분석일시:</strong> {{ result.created_at|date:"Y-m-d H:i" }}</div>
    </div>
</div>

<div class="section">
    <div class="section-title">📊 핵심 지표</div>
    <div class="metrics-grid">
        <div class="metric-card">
            <div class="metric-value">{{ result.life_pop_300|floatformat:0 }}명</div>
            <div class="metric-label">300m 내 생활인구</div>
        </div>
        <!-- 추가 지표 카드들... -->
    </div>
</div>

<div class="section">
    <div class="section-title">🤖 AI 예측 분석</div>
    <div class="survival-section">
        <div class="survival-percentage">{{ result.survival_probability|floatformat:1 }}%</div>
        <div class="survival-title">장기 생존 확률</div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: {{ result.survival_probability }}%;"></div>
        </div>
        <small>AI 모델이 28개 지표를 종합 분석한 결과입니다.</small>
    </div>
</div>
```

**Django 템플릿 필터**:
- `{{ result.life_pop_300|floatformat:0 }}` - 소수점 제거
- `{{ result.created_at|date:"Y-m-d H:i" }}` - 날짜 포맷
- `{{ result.survival_probability|floatformat:1 }}` - 소수점 1자리

---

## 🔄 상세 프로세스 플로우

### 1단계: 사용자 액션
```
사용자가 "PDF 다운로드" 버튼 클릭
   ↓
generatePDF() 함수 호출
   ↓
PDF 모달 창 표시
   ↓
updatePdfPreview() 호출 (미리보기 업데이트)
```

### 2단계: 서버 데이터 요청
```
downloadPDF() 함수 호출
   ↓
fetch('/ai_analyzer/pdf-data/{request_id}/')
   ↓
서버: get_pdf_data() 함수 실행
   ↓
데이터베이스 조회:
   - AnalysisRequest 테이블에서 기본 정보
   - AnalysisResult 테이블에서 분석 결과
   - BusinessType 테이블에서 업종명
   ↓
데이터 포맷팅 및 구조화
   ↓
JSON 응답 반환
```

### 3단계: 클라이언트 PDF 생성
```
JSON 데이터 수신
   ↓
generatePDFWithJsPDF(data) 호출
   ↓
html2canvas로 HTML 요소를 이미지 변환:
   - DOM 요소: 'pdfPreviewContainer'
   - 설정: scale=1.2, JPEG 80% 품질
   ↓
jsPDF로 PDF 생성:
   - A4 크기 (210mm × 297mm)
   - 다중 페이지 지원
   - 이미지 압축 적용
   ↓
파일명 생성: 'AI_상권분석_보고서_YYYYMMDD.pdf'
   ↓
브라우저 다운로드 실행
```

### 4단계: 후처리
```
PDF 다운로드 완료
   ↓
모달 창 자동 닫기 (1초 후)
   ↓
UI 상태 초기화
   ↓
프로세스 완료
```

---

## ⚡ 성능 최적화

### 서버 사이드 최적화

#### 데이터베이스 쿼리 최적화
```python
# 단일 쿼리로 관련 데이터 조회
analysis_request = AnalysisRequest.objects.select_related('business_type').get(id=request_id)
analysis_result = AnalysisResult.objects.get(request=analysis_request)
```

**최적화 기법**:
- `select_related()` - 외래키 관계 미리 로드
- 예외 처리로 존재하지 않는 데이터 처리
- 기본값 설정 (`or 0`) 으로 Null 처리

#### 데이터 포맷팅 최적화
```python
# 한 번에 포맷팅하여 재사용
survival_rate = analysis_result.survival_percentage or 0
formatted_survival = f"{survival_rate:.1f}%"

# 통화 포맷팅 함수 사용
formatted_land_value = format_currency(analysis_result.total_land_value or 0)
```

### 클라이언트 사이드 최적화

#### 이미지 품질 및 용량 최적화
```javascript
// html2canvas 최적화 설정
html2canvas(element, {
    scale: 1.2,  // 2.0에서 1.2로 낮춰 용량 감소
    backgroundColor: '#ffffff',
    removeContainer: true,
    imageTimeout: 0,
    logging: false  // 로깅 비활성화로 성능 향상
})

// JPEG 압축 적용
const imgData = canvas.toDataURL('image/jpeg', 0.8); // 80% 품질
```

#### 메모리 관리
```javascript
// 캔버스 메모리 해제
.then(canvas => {
    // PDF 생성 후 캔버스 정리
    canvas.remove();
    canvas = null;
});
```

#### 다중 페이지 처리 최적화
```javascript
// 페이지 높이 계산 최적화
const imgHeight = (canvas.height * imgWidth) / canvas.width;
let heightLeft = imgHeight;

// 효율적인 페이지 분할
while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
}
```

---

## 🛠️ 에러 처리 및 디버깅

### 서버 사이드 에러 처리

#### 데이터 존재 여부 확인
```python
try:
    analysis_request = AnalysisRequest.objects.get(id=request_id)
    analysis_result = AnalysisResult.objects.get(request=analysis_request)
except (AnalysisRequest.DoesNotExist, AnalysisResult.DoesNotExist):
    print(f"❌ PDF: 분석 결과를 찾을 수 없습니다: ID {request_id}")
    return JsonResponse({
        'error': '분석 결과를 찾을 수 없습니다.'
    }, status=404)
```

#### 업종 데이터 안전 처리
```python
try:
    business_type = BusinessType.objects.get(id=analysis_request.business_type_id)
    business_type_name = business_type.name
except BusinessType.DoesNotExist:
    business_type_name = "알 수 없음"
```

#### 일반 예외 처리
```python
except Exception as e:
    print(f"❌ PDF: 데이터 조회 중 오류 발생: {e}")
    return JsonResponse({
        'error': f'데이터 조회 중 오류가 발생했습니다: {str(e)}'
    }, status=500)
```

### 클라이언트 사이드 에러 처리

#### 네트워크 에러 처리
```javascript
fetch(`/ai_analyzer/pdf-data/${currentRequestId}/`)
.then(response => {
    if (!response.ok) {
        throw new Error('PDF 데이터를 가져올 수 없습니다.');
    }
    return response.json();
})
.catch(error => {
    console.error('PDF 생성 오류:', error);
    
    // UI 에러 표시
    document.getElementById('pdfGenerating').style.display = 'none';
    document.getElementById('pdfError').style.display = 'block';
    document.getElementById('pdfErrorMessage').textContent = error.message;
    document.getElementById('retryPdfBtn').style.display = 'inline-block';
});
```

#### html2canvas 에러 처리
```javascript
html2canvas(element, options)
.then(canvas => {
    // PDF 생성 로직
})
.catch(error => {
    console.error('html2canvas 오류:', error);
    throw new Error('PDF 생성 중 오류가 발생했습니다.');
});
```

#### 재시도 메커니즘
```javascript
// 재시도 버튼 이벤트
document.getElementById('retryPdfBtn').addEventListener('click', function() {
    downloadPDF(); // 다시 시도
});
```

### 디버깅 정보

#### 로깅 포인트
```python
# 서버 사이드 로깅
print(f"✅ PDF: 데이터 조회 성공 - ID {request_id}")
print(f"   주소: {analysis_request.address}")
print(f"   업종: {business_type_name}")
print(f"   생존확률: {survival_rate:.1f}%")
```

```javascript
// 클라이언트 사이드 로깅
console.log('PDF 생성 시작:', {
    requestId: currentRequestId,
    dataKeys: Object.keys(data)
});

console.log('html2canvas 설정:', {
    scale: 1.2,
    width: element.offsetWidth,
    height: element.offsetHeight
});
```

---

## 📈 모니터링 및 분석

### 성능 메트릭

#### 서버 사이드 메트릭
- **응답 시간**: PDF 데이터 조회 시간
- **메모리 사용량**: 대용량 결과 데이터 처리
- **데이터베이스 쿼리 수**: 최적화된 쿼리 효율성

#### 클라이언트 사이드 메트릭
- **HTML→이미지 변환 시간**: html2canvas 성능
- **PDF 생성 시간**: jsPDF 처리 시간
- **파일 크기**: 생성된 PDF 용량
- **메모리 사용량**: 브라우저 메모리 점유율

### 사용자 경험 메트릭
- **성공률**: PDF 생성 성공/실패 비율
- **완료 시간**: 전체 프로세스 소요 시간
- **재시도율**: 에러 후 재시도 빈도

---

## 🔮 향후 개선 방안

### 기능 개선
1. **서버 사이드 PDF 생성**: WeasyPrint, ReportLab 등 도입
2. **템플릿 커스터마이징**: 다양한 리포트 템플릿 제공
3. **실시간 미리보기**: 데이터 변경 시 즉시 반영
4. **PDF 템플릿 편집기**: 사용자 맞춤 레이아웃

### 성능 개선
1. **캐싱 시스템**: 생성된 PDF 캐싱
2. **백그라운드 생성**: 큐 시스템을 통한 비동기 처리
3. **CDN 활용**: 정적 리소스 최적화
4. **압축 최적화**: 더 효율적인 이미지 압축

### 보안 강화
1. **접근 권한 검증**: 사용자별 PDF 접근 제한
2. **워터마크 추가**: PDF 무단 복제 방지
3. **다운로드 로깅**: PDF 다운로드 이력 관리

---

**문서 끝** - PDF 생성 파이프라인의 모든 과정이 상세히 문서화되었습니다. 추가 질문이나 수정사항이 있으면 개발팀에 문의해주세요. 