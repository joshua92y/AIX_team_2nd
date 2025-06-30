/**
 * ShopDash 다국어화 JavaScript
 * 대시보드 및 지도의 동적 텍스트 다국어 지원
 */

// 다국어 텍스트 정의
const SHOPDASH_LANGUAGE_TEXTS = {
  ko: {
    languageName: '한국어',
    // 차트 툴팁 텍스트
    analysisCount: '분석 건수',
    cases: '건',
    avgArea: '평균 면적',
    sqm: '㎡',
    storeCount: '매장 수',
    stores: '개',
    totalStores: '총 {count}개 매장',
    
    // 에러 메시지
    cannotLoadData: '데이터를 불러올 수 없습니다.',
    statsLoadFailed: '통계 데이터 로드 실패',
    chartLoadFailed: '차트 로드 실패',
    
    // 지도 팝업 - 구별
    districtName: '구 이름',
    dongCount: '행정동 수',
    totalPopulation: '총 인구',
    businessCount: '업체 수',
    area: '면적',
    people: '명',
    km2: 'km²',
    clickForDongInfo: '💡 클릭하면 해당 구의 행정동을 볼 수 있습니다',
    
    // 지도 팝업 - 행정동
    dongName: '행정동',
    residentPopulation: '거주인구',
    workingPopulation: '직장인구',
    avgSurvivalRate: '평균 생존률',
    mainBusinessType: '주요 업종',
    noInfo: '정보없음',
    clickForStores: '💡 클릭하면 점포를 확인할 수 있습니다 (더블클릭으로 뒤로)',
    
    // 지도 팝업 - 점포
    storeName: '상호명',
    businessType: '업종',
    address: '주소',
    openingDate: '개업일',
    closingDate: '폐업일',
    
    // 로딩 및 에러 메시지
    loadingDistrictData: '구별 데이터 로딩 시작...',
    districtDataLoadFailed: '구별 데이터를 불러오는데 실패했습니다',
    dongDataLoadFailed: '행정동 데이터를 불러오는데 실패했습니다',
    loadingStoreData: '점포 데이터를 불러오는 중...',
    storeDataLoadFailed: '점포 데이터를 불러오는데 실패했습니다',
    
    // 차트 관련
    percent: '%',
    loading: '로딩 중...',
    detailedInfo: '상세 정보'
  },
  en: {
    languageName: 'English',
    // 차트 툴팁 텍스트
    analysisCount: 'Analysis Count',
    cases: ' cases',
    avgArea: 'Average Area',
    sqm: '㎡',
    storeCount: 'Store Count',
    stores: ' stores',
    totalStores: 'Total {count} stores',
    
    // 에러 메시지
    cannotLoadData: 'Unable to load data.',
    statsLoadFailed: 'Failed to load statistical data',
    chartLoadFailed: 'Chart load failed',
    
    // 지도 팝업 - 구별
    districtName: 'District Name',
    dongCount: 'Number of Dongs',
    totalPopulation: 'Total Population',
    businessCount: 'Number of Businesses',
    area: 'Area',
    people: ' people',
    km2: 'km²',
    clickForDongInfo: '💡 Click to see administrative districts of this area',
    
    // 지도 팝업 - 행정동
    dongName: 'Administrative District',
    residentPopulation: 'Resident Population',
    workingPopulation: 'Working Population',
    avgSurvivalRate: 'Average Survival Rate',
    mainBusinessType: 'Main Business Type',
    noInfo: 'No Information',
    clickForStores: '💡 Click to see stores (double-click to go back)',
    
    // 지도 팝업 - 점포
    storeName: 'Store Name',
    businessType: 'Business Type',
    address: 'Address',
    openingDate: 'Opening Date',
    closingDate: 'Closing Date',
    
    // 로딩 및 에러 메시지
    loadingDistrictData: 'Loading district data...',
    districtDataLoadFailed: 'Failed to load district data',
    dongDataLoadFailed: 'Failed to load administrative district data',
    loadingStoreData: 'Loading store data...',
    storeDataLoadFailed: 'Failed to load store data',
    
    // 차트 관련
    percent: '%',
    loading: 'Loading...',
    detailedInfo: 'Detailed Information'
  },
  es: {
    languageName: 'Español',
    // 차트 툴팁 텍스트
    analysisCount: 'Número de Análisis',
    cases: ' casos',
    avgArea: 'Área Promedio',
    sqm: '㎡',
    storeCount: 'Número de Tiendas',
    stores: ' tiendas',
    totalStores: 'Total {count} tiendas',
    
    // 에러 메시지
    cannotLoadData: 'No se pueden cargar los datos.',
    statsLoadFailed: 'Error al cargar datos estadísticos',
    chartLoadFailed: 'Error al cargar el gráfico',
    
    // 지도 팝업 - 구별
    districtName: 'Nombre del Distrito',
    dongCount: 'Número de Dongs',
    totalPopulation: 'Población Total',
    businessCount: 'Número de Negocios',
    area: 'Área',
    people: ' personas',
    km2: 'km²',
    clickForDongInfo: '💡 Haga clic para ver los distritos administrativos de esta área',
    
    // 지도 팝업 - 행정동
    dongName: 'Distrito Administrativo',
    residentPopulation: 'Población Residente',
    workingPopulation: 'Población Trabajadora',
    avgSurvivalRate: 'Tasa Promedio de Supervivencia',
    mainBusinessType: 'Tipo Principal de Negocio',
    noInfo: 'Sin Información',
    clickForStores: '💡 Haga clic para ver tiendas (doble clic para volver)',
    
    // 지도 팝업 - 점포
    storeName: 'Nombre de la Tienda',
    businessType: 'Tipo de Negocio',
    address: 'Dirección',
    openingDate: 'Fecha de Apertura',
    closingDate: 'Fecha de Cierre',
    
    // 로딩 및 에러 메시지
    loadingDistrictData: 'Cargando datos del distrito...',
    districtDataLoadFailed: 'Error al cargar datos del distrito',
    dongDataLoadFailed: 'Error al cargar datos del distrito administrativo',
    loadingStoreData: 'Cargando datos de tiendas...',
    storeDataLoadFailed: 'Error al cargar datos de tiendas',
    
    // 차트 관련
    percent: '%',
    loading: 'Cargando...',
    detailedInfo: 'Información Detallada'
  }
};

// 현재 언어 상태
let currentShopDashLanguage = 'ko';

// 현재 언어 가져오기
function getCurrentShopDashLanguage() {
  // 네비게이션의 언어 설정 확인
  if (typeof window.getCurrentLanguage === 'function') {
    return window.getCurrentLanguage();
  }
  
  // localStorage에서 확인
  const saved = localStorage.getItem('preferred_language');
  if (saved && SHOPDASH_LANGUAGE_TEXTS[saved]) {
    return saved;
  }
  
  return currentShopDashLanguage;
}

// 다국어 텍스트 가져오기
function getShopDashText(key) {
  const language = getCurrentShopDashLanguage();
  const texts = SHOPDASH_LANGUAGE_TEXTS[language] || SHOPDASH_LANGUAGE_TEXTS['ko'];
  return texts[key] || key;
}

// 템플릿 문자열 처리 ({count} 등)
function formatShopDashText(template, params = {}) {
  let result = template;
  Object.keys(params).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), params[key]);
  });
  return result;
}

// 차트 툴팁 다국어화 함수
function getLocalizedTooltipText(analysisCount, avgArea, storeCount) {
  const texts = SHOPDASH_LANGUAGE_TEXTS[getCurrentShopDashLanguage()];
  return [
    `${texts.analysisCount}: ${analysisCount}${texts.cases}`,
    `${texts.avgArea}: ${avgArea}${texts.sqm}`,
    `${texts.storeCount}: ${storeCount.toLocaleString()}${texts.stores}`
  ];
}

// 지도 팝업 텍스트 다국어화
function getLocalizedPopupTexts() {
  return SHOPDASH_LANGUAGE_TEXTS[getCurrentShopDashLanguage()];
}

// ShopDash 언어 변경 함수
function changeShopDashLanguage(language) {
  if (!SHOPDASH_LANGUAGE_TEXTS[language]) {
    console.warn('지원하지 않는 언어:', language);
    return;
  }
  
  currentShopDashLanguage = language;
  
  // 차트들 다시 로드 (다국어 적용)
  if (typeof loadAllCharts === 'function') {
    loadAllCharts();
  }
  
  console.log('ShopDash 언어가 변경되었습니다:', language);
}

// 네비게이션 언어 변경 감지
function observeShopDashLanguageChanges() {
  // MutationObserver로 data-lang 변경 감지
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const element = mutation.target;
        if (element.hasAttribute('data-lang')) {
          const langCode = element.getAttribute('data-lang');
          if (element.style.display !== 'none') {
            // 표시되는 언어 요소 확인
            const langMap = { 'KOR': 'ko', 'ENG': 'en', 'ESP': 'es' };
            const newLang = langMap[langCode];
            if (newLang && newLang !== currentShopDashLanguage) {
              changeShopDashLanguage(newLang);
            }
          }
        }
      }
    });
  });
  
  // 모든 data-lang 요소 관찰
  document.querySelectorAll('[data-lang]').forEach(element => {
    observer.observe(element, { 
      attributes: true, 
      attributeFilter: ['style'] 
    });
  });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 초기 언어 설정
  currentShopDashLanguage = getCurrentShopDashLanguage();
  
  // 언어 변경 감지 시작
  observeShopDashLanguageChanges();
  
  console.log('ShopDash 다국어화 초기화 완료:', currentShopDashLanguage);
});

// 전역 함수로 등록
window.getShopDashText = getShopDashText;
window.formatShopDashText = formatShopDashText;
window.getLocalizedTooltipText = getLocalizedTooltipText;
window.getLocalizedPopupTexts = getLocalizedPopupTexts;
window.changeShopDashLanguage = changeShopDashLanguage; 