/**
 * AI_Analyzer 전용 완전 독립 다국어 시스템 v2.0
 * - 다른 앱과 100% 격리
 * - funcChangeLang 후킹 없음 
 * - 깔끔하고 효율적인 번역 시스템
 * - 모든 AI_Analyzer 기능 완벽 지원
 */

console.log('🚀 AI_Analyzer 전용 다국어 시스템 v2.0 로드 시작...');

// ===========================================
// 🎯 핵심: 네임스페이스 완전 격리
// ===========================================

const AI_ANALYZER_I18N = {
  // 현재 언어 상태
  currentLanguage: 'ko',
  isInitialized: false,
  
  // 언어 코드 표준화 (전체 시스템에서 ko/en/es 사용)
  normalizeLanguageCode: function(lang) {
    const langMap = {
      'KOR': 'ko', 'kor': 'ko', 'ko': 'ko',
      'ENG': 'en', 'eng': 'en', 'en': 'en', 
      'ESP': 'es', 'esp': 'es', 'es': 'es'
    };
    return langMap[lang] || 'ko';
  },
  
  // 현재 언어 감지 (우선순위 기반, 개선된 버전)
  detectCurrentLanguage: function() {
    // 1. data-lang 속성 확인 (최우선) - 더 정확한 검사
    const langElements = document.querySelectorAll('[data-lang]');
    for (let element of langElements) {
      const style = window.getComputedStyle(element);
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
        const langCode = element.getAttribute('data-lang');
        console.log(`🔍 data-lang 감지: ${langCode}`);
        return this.normalizeLanguageCode(langCode);
      }
    }
    
    // 2. 전역 sessionLang 변수 확인
    if (typeof window.sessionLang !== 'undefined' && window.sessionLang) {
      console.log(`🔍 sessionLang 감지: ${window.sessionLang}`);
      return this.normalizeLanguageCode(window.sessionLang);
    }
    
    // 3. HTML lang 속성
    const htmlLang = document.documentElement.lang;
    if (htmlLang) {
      console.log(`🔍 htmlLang 감지: ${htmlLang}`);
      return this.normalizeLanguageCode(htmlLang);
    }
    
    // 4. URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam) {
      console.log(`🔍 URL lang 파라미터 감지: ${langParam}`);
      return this.normalizeLanguageCode(langParam);
    }
    
    // 5. 로컬 스토리지 확인
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang) {
      console.log(`🔍 localStorage 언어 감지: ${savedLang}`);
      return this.normalizeLanguageCode(savedLang);
    }
    
    // 6. 기본값
    console.log(`🔍 기본 언어 사용: ko`);
    return 'ko';
  },
  
  // 언어 변경 감지 및 업데이트 (최적화된 버전)
  handleLanguageChange: function(newLanguage) {
    const normalizedLang = this.normalizeLanguageCode(newLanguage);
    
    if (this.currentLanguage === normalizedLang) {
      return; // 동일한 언어면 무시
    }
    
    console.log(`🔄 AI_Analyzer 언어 변경: ${this.currentLanguage} → ${normalizedLang}`);
    
    const oldLanguage = this.currentLanguage;
    this.currentLanguage = normalizedLang;
    
    // 🎯 드롭다운만 업데이트 (텍스트는 처음부터 올바른 언어로 출력됨)
    this.updateDropdowns();
    
    // 재분석 트리거 (분석 결과가 있을 때만)
    setTimeout(() => {
      this.triggerReanalysisIfNeeded(oldLanguage);
    }, 500);
  },
  
  // ===========================================
  // 🎯 핵심 번역 시스템 (경량화)
  // ===========================================
  
  // 핵심 번역 데이터만 포함
  translations: {
    // === UI 핵심 요소 ===
    '상권 분석 결과': { en: 'Commercial Area Analysis Result', es: 'Resultado del Análisis Comercial' },
    '핵심 지표': { en: 'Key Indicators', es: 'Indicadores Clave' },
    'AI 예측 분석': { en: 'AI Prediction Analysis', es: 'Análisis de Predicción de IA' },
    '장기 생존 확률': { en: 'Long-term Survival Rate', es: 'Tasa de Supervivencia a Largo Plazo' },
    'AI 분석 결과': { en: 'AI Analysis Result', es: 'Resultado del Análisis de IA' },
    'AI 추천 업종': { en: 'AI Recommended Business Types', es: 'Tipos de Negocio Recomendados por IA' },
    '회원 전용': { en: 'Members Only', es: 'Solo Miembros' },
    '상권 경쟁 분석': { en: 'Commercial Competition Analysis', es: 'Análisis de Competencia Comercial' },
    '경쟁강도 분석': { en: 'Competition Analysis', es: 'Análisis de Competencia' },
    '인구 구성 분석': { en: 'Population Composition Analysis', es: 'Análisis de Composición Poblacional' },
    '외국인 분석': { en: 'Foreigner Analysis', es: 'Análisis de Extranjeros' },
    'AI 분석 요약': { en: 'AI Analysis Summary', es: 'Resumen del Análisis de IA' },
    '강점': { en: 'Strengths', es: 'Fortalezas' },
    '주의사항': { en: 'Cautions', es: 'Precauciones' },
    
    // === 버튼 및 액션 ===
    '상권 분석하기': { en: 'Analyze Commercial Area', es: 'Analizar Área Comercial' },
    'PDF로 저장': { en: 'Save as PDF', es: 'Guardar como PDF' },
    '검색': { en: 'Search', es: 'Buscar' },
    '로그인하기': { en: 'Login', es: 'Iniciar Sesión' },
    '닫기': { en: 'Close', es: 'Cerrar' },
    
    // === 선택 옵션 ===
    '선택': { en: 'Choose', es: 'Seleccionar' },
    '판매함': { en: 'Yes', es: 'Sí' },
    '판매 안함': { en: 'No', es: 'No' },
    
    // === 기본 정보 ===
    '업종': { en: 'Business Type', es: 'Tipo de Negocio' },
    '면적': { en: 'Area', es: 'Área' },
    '주소': { en: 'Address', es: 'Dirección' },
    '유형': { en: 'Type', es: 'Tipo' },
    
    // === 지표 라벨 ===
    '300m 내 생활인구': { en: 'Resident Pop. within 300m', es: 'Pob. Residente dentro de 300m' },
    '300m 내 직장인구': { en: 'Working Pop. within 300m', es: 'Población Trabajadora en 300m' },
    '경쟁업체': { en: 'Competitors', es: 'Competidores' },
    '동일업종 경쟁업체': { en: 'Same Business Type Competitors', es: 'Competidores del Mismo Tipo de Negocio' },
    '총 공시지가': { en: 'Total Public Land Price', es: 'Precio Total del Terreno Público' },
    
    // === 경쟁 분석 상세 ===
    '경쟁업체 수': { en: 'Number of Competitors', es: 'Número de Competidores' },
    '전체 요식업체': { en: 'Total Restaurants', es: 'Total de Restaurantes' },
    '경쟁업체 비율': { en: 'Competitor Ratio', es: 'Ratio de Competidores' },
    '업종 다양성': { en: 'Business Diversity', es: 'Diversidad de Negocios' },
    '경쟁 강도': { en: 'Competition Intensity', es: 'Intensidad de Competencia' },
    
    // === 인구 분석 ===
    '연령대별 인구 비율': { en: 'Age Group Population Ratio', es: 'Ratio de Población por Grupo de Edad' },
    '연령대별 상세 정보': { en: 'Age Group Details', es: 'Detalles por Grupo de Edad' },
    '1000m 반경 내 생활인구 기준': { en: 'Based on residential population within 1000m radius', es: 'Basado en población residente dentro del radio de 1000m' },
    
    // === 외국인 분석 ===
    '단기체류 외국인': { en: 'Short-term Foreigners', es: 'Extranjeros de Corta Estancia' },
    '장기체류 외국인': { en: 'Long-term Foreigners', es: 'Extranjeros de Larga Estancia' },
    '장기체류 중국인 비율': { en: 'Long-term Chinese Ratio', es: 'Proporción China de Larga Estancia' },
    '300m 반경': { en: '300m radius', es: 'radio de 300m' },
    '1000m 반경': { en: '1000m radius', es: 'radio de 1000m' },
    
    // === 분석 진행 ===
    '상권분석 진행 중...': { en: 'Commercial Analysis in Progress...', es: 'Análisis Comercial en Progreso...' },
    'AI가 상권을 분석하고 있습니다...': { en: 'AI is analyzing the commercial area...', es: 'La IA está analizando el área comercial...' },
    '전체 진행률': { en: 'Overall Progress', es: 'Progreso General' },
    '분석 완료': { en: 'Analysis Complete', es: 'Análisis Completo' },
    
    // === placeholder 텍스트 ===
    '업종을 선택해주세요': { en: 'Please select an industry', es: 'Por favor seleccione un tipo de negocio' },
    '주소를 입력해주세요': { en: 'Please enter your address', es: 'Por favor ingrese su dirección' },
    
    // === 순위 ===
    '1위': { en: '1st', es: '1º' },
    '2위': { en: '2nd', es: '2º' },
    '3위': { en: '3rd', es: '3º' },
    '4위': { en: '4th', es: '4º' },
    
    // === 경쟁 레벨 ===
    '낮음': { en: 'Low', es: 'Bajo' },
    '보통': { en: 'Medium', es: 'Medio' },
    '높음': { en: 'High', es: 'Alto' },
    '주의': { en: 'Caution', es: 'Precaución' },
    
    // === 연령대 ===
    '20대': { en: '20s', es: '20s' },
    '30대': { en: '30s', es: '30s' },
    '40대': { en: '40s', es: '40s' },
    '50대': { en: '50s', es: '50s' },
    '60대+': { en: '60+', es: '60+' },
    '60대 이상': { en: '60+', es: '60+' },
    
    // === AI 분석 설명문 ===
    'AI 모델이 25개 지표를 종합 분석한 결과입니다.': { 
      en: 'Result of comprehensive analysis of 25 indicators by AI model.', 
      es: 'Resultado del análisis integral de 25 indicadores por modelo de IA.' 
    },
    '경쟁업체 비율이 20% 이하면 낮음, 20-50%는 보통, 50% 이상은 높음으로 분류됩니다.': { 
      en: 'Competitor ratio below 20% is classified as low, 20-50% as medium, above 50% as high.', 
      es: 'Ratio de competidores por debajo del 20% se clasifica como bajo, 20-50% como medio, por encima del 50% como alto.' 
    },
    
    // === AI 분석 요약 - 강점 ===
    '경쟁업체 비율이 낮아 경쟁 부담 적음': { 
      en: 'Low competitor ratio reduces competitive burden', 
      es: 'Bajo ratio de competidores reduce la carga competitiva' 
    },
    '생활인구가 적어 고객 확보에 어려움 예상': { 
      en: 'Low residential population may make customer acquisition difficult', 
      es: 'Baja población residente puede dificultar la adquisición de clientes' 
    },
    '공시지가가 높아 임대료 부담 클 수 있음': { 
      en: 'High public land price may increase rental burden', 
      es: 'Alto precio del terreno público puede aumentar la carga del alquiler' 
    },
    '직장인구가 적어 평일 점심 고객 부족 우려': { 
      en: 'Low working population may lack weekday lunch customers', 
      es: 'Baja población trabajadora puede carecer de clientes de almuerzo entre semana' 
    },
    
    // === 주소 검색 관련 ===
    '주소 검색': { en: 'Address Search', es: 'Búsqueda de Dirección' },
    '주소를 검색하세요': { en: 'Search for an address', es: 'Buscar una dirección' },
    '주소와 좌표가 설정되었습니다.': { en: 'Address and coordinates have been set.', es: 'La dirección y las coordenadas han sido establecidas.' },
    '좌표 변환에 실패했습니다': { en: 'Failed to convert coordinates', es: 'Error al convertir coordenadas' },
    '좌표 변환 요청에 실패했습니다.': { en: 'Failed to request coordinate conversion.', es: 'Error en la solicitud de conversión de coordenadas.' },
    '서비스 지역 제한': { en: 'Service Area Restriction', es: 'Restricción del Área de Servicio' },
    '서울특별시 지역만 이용 가능합니다': { en: 'Only available for Seoul Metropolitan City', es: 'Solo disponible para la Ciudad Metropolitana de Seúl' },
    
    // === 기타 중요 텍스트 ===
    '일반음식점': { en: 'General Restaurant', es: 'Restaurante General' },
    '기타': { en: 'Others', es: 'Otros' },
    
    // === 생존 확률 상태 ===
    '매우 좋음': { en: 'Very Good', es: 'Muy Bueno' },
    '위험': { en: 'Risk', es: 'Riesgo' },
    
    // === 추가 중요 텍스트들 ===
    '분석완료': { en: 'Analysis Complete', es: 'Análisis Completo' },
    '분석중...': { en: 'Analyzing...', es: 'Analizando...' },
    '로딩 중...': { en: 'Loading...', es: 'Cargando...' },
    '결과보기': { en: 'View Results', es: 'Ver Resultados' },
    '상세보기': { en: 'View Details', es: 'Ver Detalles' },
    '전체보기': { en: 'View All', es: 'Ver Todo' },
    '더보기': { en: 'More', es: 'Más' },
    '접기': { en: 'Collapse', es: 'Contraer' },
    '확장': { en: 'Expand', es: 'Expandir' },
    '새로고침': { en: 'Refresh', es: 'Actualizar' },
    '재시도': { en: 'Retry', es: 'Reintentar' },
    '취소': { en: 'Cancel', es: 'Cancelar' },
    '확인': { en: 'Confirm', es: 'Confirmar' },
    '저장': { en: 'Save', es: 'Guardar' },
    '편집': { en: 'Edit', es: 'Editar' },
    '삭제': { en: 'Delete', es: 'Eliminar' },
    '복사': { en: 'Copy', es: 'Copiar' },
    '공유': { en: 'Share', es: 'Compartir' },
    '인쇄': { en: 'Print', es: 'Imprimir' },
    '다운로드': { en: 'Download', es: 'Descargar' },
    '업로드': { en: 'Upload', es: 'Subir' },
    '설정': { en: 'Settings', es: 'Configuración' },
    '도움말': { en: 'Help', es: 'Ayuda' },
    '정보': { en: 'Information', es: 'Información' },
    '경고': { en: 'Warning', es: 'Advertencia' },
    '오류': { en: 'Error', es: 'Error' },
    '성공': { en: 'Success', es: 'Éxito' },
    '실패': { en: 'Failed', es: 'Fallido' },
    '완료': { en: 'Complete', es: 'Completo' },
    '진행중': { en: 'In Progress', es: 'En Progreso' },
    '대기중': { en: 'Waiting', es: 'Esperando' },
    '처리중': { en: 'Processing', es: 'Procesando...' },
    '연결중': { en: 'Connecting', es: 'Conectando' },
    '연결됨': { en: 'Connected', es: 'Conectado' },
    '연결끊김': { en: 'Disconnected', es: 'Desconectado' },
    '온라인': { en: 'Online', es: 'En línea' },
    '오프라인': { en: 'Offline', es: 'Fuera de línea' },
    '사용가능': { en: 'Available', es: 'Disponible' },
    '사용불가': { en: 'Unavailable', es: 'No disponible' },
    '활성화': { en: 'Enabled', es: 'Habilitado' },
    '비활성화': { en: 'Disabled', es: 'Deshabilitado' },
    '표시': { en: 'Show', es: 'Mostrar' },
    '숨김': { en: 'Hide', es: 'Ocultar' },
    '열기': { en: 'Open', es: 'Abrir' },
    '닫기': { en: 'Close', es: 'Cerrar' },
    '최소화': { en: 'Minimize', es: 'Minimizar' },
    '최대화': { en: 'Maximize', es: 'Maximizar' },
    '복원': { en: 'Restore', es: 'Restaurar' },
    '뒤로': { en: 'Back', es: 'Atrás' },
    '앞으로': { en: 'Forward', es: 'Adelante' },
    '위로': { en: 'Up', es: 'Arriba' },
    '아래로': { en: 'Down', es: 'Abajo' },
    '이전': { en: 'Previous', es: 'Anterior' },
    '다음': { en: 'Next', es: 'Siguiente' },
    '첫번째': { en: 'First', es: 'Primero' },
    '마지막': { en: 'Last', es: 'Último' },
    '시작': { en: 'Start', es: 'Comenzar' },
    '종료': { en: 'End', es: 'Finalizar' },
    '일시정지': { en: 'Pause', es: 'Pausa' },
    '재생': { en: 'Play', es: 'Reproducir' },
    '정지': { en: 'Stop', es: 'Detener' },
    '새로만들기': { en: 'Create New', es: 'Crear Nuevo' },
    '불러오기': { en: 'Load', es: 'Cargar' },
    '가져오기': { en: 'Import', es: 'Importar' },
    '내보내기': { en: 'Export', es: 'Exportar' },
    '미리보기': { en: 'Preview', es: 'Vista previa' },
    '전체화면': { en: 'Full Screen', es: 'Pantalla completa' },
    '창모드': { en: 'Window Mode', es: 'Modo ventana' },
    '선택안함': { en: 'None Selected', es: 'Ninguno seleccionado' },
    '모두선택': { en: 'Select All', es: 'Seleccionar todo' },
    '선택해제': { en: 'Deselect', es: 'Deseleccionar' },
    '필수항목': { en: 'Required', es: 'Requerido' },
    '선택항목': { en: 'Optional', es: 'Opcional' },
    '추천': { en: 'Recommended', es: 'Recomendado' },
    '인기': { en: 'Popular', es: 'Popular' },
    '신규': { en: 'New', es: 'Nuevo' },
    '업데이트': { en: 'Updated', es: 'Actualizado' },
    '최신': { en: 'Latest', es: 'Último' },
    '이전버전': { en: 'Previous Version', es: 'Versión anterior' },
    
    // === 메인 페이지 텍스트 (index.html) ===
    'AI 기반 서울시 상권분석 서비스': { en: 'AI-Based Seoul Commercial Area Analysis Service', es: 'Servicio de Análisis de Área Comercial de Seúl Basado en IA' },
    '창업 전 입지 분석을 통해 성공 가능성을 미리 확인하세요': { en: 'Check your chances of success in advance through location analysis before starting your business', es: 'Verifique sus posibilidades de éxito por adelantado a través del análisis de ubicación antes de iniciar su negocio' },
    '생활인구 분석': { en: 'Resident Population Analysis', es: 'Análisis de Población Residente' },
    '연령대별 유동인구 및 직장인구 분석': { en: 'Age-specific floating population and working population analysis', es: 'Análisis de población flotante y población trabajadora por edad' },
    '경쟁업체 분석': { en: 'Competitor Analysis', es: 'Análisis de Competidores' },
    '동종업계 밀집도 및 경쟁강도 분석': { en: 'Industry density and competition intensity analysis', es: 'Análisis de densidad de la industria e intensidad de la competencia' },
    '주변시설 분석': { en: 'Surrounding Facilities Analysis', es: 'Análisis de Instalaciones Circundantes' },
    '학교, 공공시설 등 유동인구 유발시설': { en: 'Foot traffic generating facilities such as schools and public facilities', es: 'Instalaciones que generan tráfico peatonal como escuelas e instalaciones públicas' },
    '공시지가 분석': { en: 'Public Land Price Analysis', es: 'Análisis de Precio de Terreno Público' },
    '임대료 예상 산출 및 투자비용 분석': { en: 'Estimated rental calculation and investment cost analysis', es: 'Cálculo de alquiler estimado y análisis de costos de inversión' },
    '상권분석 시작하기': { en: 'Start Commercial Area Analysis', es: 'Comenzar Análisis de Área Comercial' },
    '창업을 계획하시는 지역의 정보를 입력해주세요': { en: 'Please enter information about the area where you plan to start your business', es: 'Por favor ingrese información sobre el área donde planea iniciar su negocio' },
    '창업 예정 주소': { en: 'Planned Business Address', es: 'Dirección de Negocio Planificada' },
    '주소검색 버튼을 클릭하여 주소를 입력하세요': { en: 'Click the address search button to enter the address', es: 'Haga clic en el botón de búsqueda de dirección para ingresar la dirección' },
    '주소검색': { en: 'Address Search', es: 'Búsqueda de Dirección' },
    '점포 면적 (㎡)': { en: 'Store Area (㎡)', es: 'Área de la Tienda (㎡)' },
    '음식점 유형': { en: 'Restaurant Type', es: 'Tipo de Restaurante' },
    '선택하세요': { en: 'Please Select', es: 'Por favor seleccione' },
    '일반음식점 (주류 판매 가능)': { en: 'General Restaurant (Alcohol Sales Allowed)', es: 'Restaurante General (Venta de Alcohol Permitida)' },
    '휴게음식점 (주류 판매 불가)': { en: 'Snack Bar (No Alcohol Sales)', es: 'Bar de Bocadillos (Sin Venta de Alcohol)' },
    '업종을 선택하세요': { en: 'Please select a business type', es: 'Por favor seleccione un tipo de negocio' },
    '상권분석 진행 중...': { en: 'Commercial Area Analysis in Progress...', es: 'Análisis de Área Comercial en Progreso...' },
    '좌표 변환': { en: 'Coordinate Conversion', es: 'Conversión de Coordenadas' },
    '주소를 지리좌표로 변환 중...': { en: 'Converting address to geographic coordinates...', es: 'Convirtiendo dirección a coordenadas geográficas...' },
    '300m/1000m 반경 내 생활인구 및 연령대 분석': { en: 'Analysis of residential population and age groups within 300m/1000m radius', es: 'Análisis de población residente y grupos de edad dentro del radio de 300m/1000m' },
    '단기/장기체류외국인 분포 분석': { en: 'Analysis of short-term/long-term foreign resident distribution', es: 'Análisis de distribución de residentes extranjeros de corta/larga duración' },
    '학교, 공공건물, 직장인구 분석': { en: 'Analysis of schools, public buildings, and working population', es: 'Análisis de escuelas, edificios públicos y población trabajadora' },
    '동일업종 및 요식업체 경쟁강도 분석': { en: 'Competition intensity analysis of same industry and restaurants', es: 'Análisis de intensidad de competencia de la misma industria y restaurantes' },
    '토지가치 및 임대료 추정': { en: 'Land value and rental estimation', es: 'Valor del terreno y estimación de alquiler' },
    '결과 페이지로 이동 중...': { en: 'Moving to results page...', es: 'Moviéndose a la página de resultados...' },
    '본 서비스는 공공데이터를 기반으로 한 분석 결과이며, 실제 창업 시 추가적인 시장조사를 권장합니다.': { 
      en: 'This service provides analysis results based on public data, and additional market research is recommended when starting an actual business.', 
      es: 'Este servicio proporciona resultados de análisis basados en datos públicos, y se recomienda una investigación de mercado adicional al iniciar un negocio real.' 
    },
    
    // === 분석 페이지 텍스트 (analyze.html) ===
    '상권 정보입력': { en: 'Enter Commercial Area Information', es: 'Ingresar Información del Área Comercial' },
    '주류 판매 여부': { en: 'Alcohol Sales Status', es: 'Estado de Venta de Alcohol' },
    '상권 분석을 시작하세요': { en: 'Start Commercial Area Analysis', es: 'Comenzar Análisis de Área Comercial' },
    '내 최근 분석 기록': { en: 'My Recent Analysis Records', es: 'Mis Registros de Análisis Recientes' },
    '개인 기록': { en: 'Personal Records', es: 'Registros Personales' },
    '분석 ID': { en: 'Analysis ID', es: 'ID de Análisis' },
    '아직 분석 기록이 없습니다': { en: 'No analysis records yet', es: 'Aún no hay registros de análisis' },
    '첫 번째 상권 분석을 시작해보세요!': { en: 'Start your first commercial area analysis!', es: '¡Comience su primer análisis de área comercial!' },
    '분석 시작하기': { en: 'Start Analysis', es: 'Comenzar Análisis' },
    '월별 분석 추이': { en: 'Monthly Analysis Trend', es: 'Tendencia de Análisis Mensual' },
    '성과 분석': { en: 'Performance Analysis', es: 'Análisis de Rendimiento' },
    '최고 성과': { en: 'Best Performance', es: 'Mejor Rendimiento' },
    '개선 기회': { en: 'Improvement Opportunities', es: 'Oportunidades de Mejora' },
    '주요 분석 업종': { en: 'Major Analysis Business Types', es: 'Tipos de Negocio de Análisis Principales' },
    '주요 분석 지역': { en: 'Major Analysis Areas', es: 'Áreas de Análisis Principales' },
    '분석 횟수': { en: 'Number of Analyses', es: 'Número de Análisis' },
    '개인 분석 기록': { en: 'Personal Analysis Records', es: 'Registros de Análisis Personal' },
    '분석 기록을 보려면 로그인이 필요합니다': { en: 'Login is required to view analysis records', es: 'Se requiere iniciar sesión para ver los registros de análisis' },
    '상권 분석 도움말': { en: 'Commercial Area Analysis Help', es: 'Ayuda de Análisis de Área Comercial' },
    '상권 분석이란 무엇인가?': { en: 'What is Commercial Area Analysis?', es: '¿Qué es el Análisis de Área Comercial?' },
    '상권분석은 특정 지역 내 점포나 사업장의 경제적 환경과 소비자 특성을 체계적으로 조사하여 사업 성공 가능성을 높이기 위한 중요한 과정입니다.': { 
      en: 'Commercial area analysis is an important process that systematically investigates the economic environment and consumer characteristics of stores or businesses within a specific area to increase the likelihood of business success.', 
      es: 'El análisis de área comercial es un proceso importante que investiga sistemáticamente el entorno económico y las características del consumidor de tiendas o negocios dentro de un área específica para aumentar la probabilidad de éxito del negocio.' 
    },
    '왜 상권분석이 필요한가요?': { en: 'Why is commercial area analysis necessary?', es: '¿Por qué es necesario el análisis de área comercial?' },
    '상권의 소비 패턴과 유동 인구를 파악하여 효율적인 마케팅 전략을 세울 수 있습니다.': { 
      en: 'You can establish efficient marketing strategies by understanding consumption patterns and floating population in the commercial area.', 
      es: 'Puede establecer estrategias de marketing eficientes al comprender los patrones de consumo y la población flotante en el área comercial.' 
    },
    '경쟁 업체 현황과 고객 수요를 분석해 적절한 입지와 서비스를 결정할 수 있습니다.': { 
      en: 'You can determine appropriate location and services by analyzing competitor status and customer demand.', 
      es: 'Puede determinar la ubicación y servicios apropiados analizando el estado de la competencia y la demanda del cliente.' 
    },
    '투자 위험을 최소화하고 안정적인 매출을 기대할 수 있습니다.': { 
      en: 'You can minimize investment risks and expect stable sales.', 
      es: 'Puede minimizar los riesgos de inversión y esperar ventas estables.' 
    },
    'AI 기반 상권분석은 다음을 제공합니다:': { en: 'AI-based commercial area analysis provides:', es: 'El análisis de área comercial basado en IA proporciona:' },
    '점포의 생존 확률 예측': { en: 'Store survival probability prediction', es: 'Predicción de probabilidad de supervivencia de la tienda' },
    'SHAP 요인 분석': { en: 'SHAP factor analysis', es: 'Análisis de factores SHAP' },
    '성공적인 창업과 운영을 위해 정확한 정보를 바탕으로 전략을 세워보세요!': { 
      en: 'Develop strategies based on accurate information for successful startup and operation!', 
      es: '¡Desarrolle estrategias basadas en información precisa para una startup y operación exitosas!' 
    },
    '상권 분석을 시작하세요': { en: 'Start Commercial Area Analysis', es: 'Comenzar Análisis de Área Comercial' },
    '위의 정보를 입력하고 \'상권 분석하기\' 버튼을 클릭하면 이 영역에 분석 결과가 표시됩니다.': { 
      en: 'Enter the information above and click the \'Analyze Commercial Area\' button to display analysis results in this area.', 
      es: 'Ingrese la información anterior y haga clic en el botón \'Analizar Área Comercial\' para mostrar los resultados del análisis en esta área.' 
    },
    '서비스 지역: 서울특별시 25개 구만 지원됩니다 (경기도, 인천 등 제외)': { 
      en: 'Service Area: Only 25 districts of Seoul Metropolitan City are supported (excluding Gyeonggi-do, Incheon, etc.)', 
      es: 'Área de Servicio: Solo se admiten 25 distritos de la Ciudad Metropolitana de Seúl (excluyendo Gyeonggi-do, Incheon, etc.)' 
    },
    
    // === 대시보드 텍스트 (user_dashboard.html) ===
    '내 분석 대시보드': { en: 'My Analysis Dashboard', es: 'Mi Panel de Análisis' },
    '상권 분석 히스토리와 성과를 한눈에 확인하세요': { en: 'Check your commercial area analysis history and performance at a glance', es: 'Consulte el historial y rendimiento de su análisis de área comercial de un vistazo' },
    '총 분석 횟수': { en: 'Total Number of Analyses', es: 'Número Total de Análisis' },
    '평균 생존율': { en: 'Average Survival Rate', es: 'Tasa de Supervivencia Promedio' },
    '최고 생존율': { en: 'Highest Survival Rate', es: 'Tasa de Supervivencia Más Alta' },
    '분석 업종 수': { en: 'Number of Analyzed Business Types', es: 'Número de Tipos de Negocio Analizados' },
    '최근 분석 결과': { en: 'Recent Analysis Results', es: 'Resultados de Análisis Recientes' },
    '생활인구': { en: 'Residential Population', es: 'Población Residente' },
    '우수': { en: 'Excellent', es: 'Excelente' },
    '양호': { en: 'Good', es: 'Bueno' },
    '보통': { en: 'Average', es: 'Promedio' },
    '주의': { en: 'Caution', es: 'Precaución' },
    '개': { en: 'units', es: 'unidades' },
    '명': { en: 'people', es: 'personas' },
    '회': { en: 'times', es: 'veces' },
    
    // === 서비스 타입 관련 ===
    '판매함': { en: 'Sell', es: 'Vender' },
    '판매안함': { en: 'Do Not Sell', es: 'No Vender' },
    
    // === 경쟁강도 상세 분석 ===
    '경쟁강도 지수': { en: 'Competition Intensity Index', es: 'Índice de Intensidad de Competencia' },
    '업종 집중도': { en: 'Industry Concentration', es: 'Concentración de la Industria' },
    '시장 포화도': { en: 'Market Saturation', es: 'Saturación del Mercado' },
    '경쟁 우위': { en: 'Competitive Advantage', es: 'Ventaja Competitiva' },
    '경쟁 열세': { en: 'Competitive Disadvantage', es: 'Desventaja Competitiva' },
    '시장 진입 용이성': { en: 'Market Entry Ease', es: 'Facilidad de Entrada al Mercado' },
    '시장 진입 어려움': { en: 'Market Entry Difficulty', es: 'Dificultad de Entrada al Mercado' },
    
    // === 추가 지표 관련 ===
    '임대료 추정': { en: 'Estimated Rent', es: 'Alquiler Estimado' },
    '매출 예상': { en: 'Expected Sales', es: 'Ventas Esperadas' },
    '손익분기점': { en: 'Break-even Point', es: 'Punto de Equilibrio' },
    '투자 회수 기간': { en: 'Investment Recovery Period', es: 'Período de Recuperación de Inversión' },
    '수익성 분석': { en: 'Profitability Analysis', es: 'Análisis de Rentabilidad' },
    '위험도 평가': { en: 'Risk Assessment', es: 'Evaluación de Riesgos' },
    
    // === 시간대별 분석 ===
    '평일': { en: 'Weekdays', es: 'Días de semana' },
    '주말': { en: 'Weekends', es: 'Fines de semana' },
    '점심시간': { en: 'Lunch Time', es: 'Hora del almuerzo' },
    '저녁시간': { en: 'Dinner Time', es: 'Hora de la cena' },
    '심야시간': { en: 'Late Night', es: 'Altas horas de la noche' },
    '새벽시간': { en: 'Early Morning', es: 'Madrugada' },
    
    // === 상권 유형 ===
    '주거상권': { en: 'Residential Commercial Area', es: 'Área Comercial Residencial' },
    '업무상권': { en: 'Business Commercial Area', es: 'Área Comercial de Negocios' },
    '유흥상권': { en: 'Entertainment Commercial Area', es: 'Área Comercial de Entretenimiento' },
    '관광상권': { en: 'Tourist Commercial Area', es: 'Área Comercial Turística' },
    '역세권': { en: 'Station Area', es: 'Área de Estación' },
    '대학가': { en: 'University Area', es: 'Área Universitaria' },
    
    // === 추가 분석 결과 관련 ===
    '상권 활성도': { en: 'Commercial Area Activity', es: 'Actividad del Área Comercial' },
    '성장 잠재력': { en: 'Growth Potential', es: 'Potencial de Crecimiento' },
    '안정성': { en: 'Stability', es: 'Estabilidad' },
    '계절성': { en: 'Seasonality', es: 'Estacionalidad' },
    '트렌드 분석': { en: 'Trend Analysis', es: 'Análisis de Tendencias' },
    
    // === 오류 및 상태 메시지 ===
    '분석 데이터를 불러오는 중...': { en: 'Loading analysis data...', es: 'Cargando datos de análisis...' },
    '분석 완료되었습니다': { en: 'Analysis completed', es: 'Análisis completado' },
    '분석 중 오류가 발생했습니다': { en: 'An error occurred during analysis', es: 'Ocurrió un error durante el análisis' },
    '네트워크 오류가 발생했습니다': { en: 'A network error occurred', es: 'Ocurrió un error de red' },
    '데이터가 없습니다': { en: 'No data available', es: 'No hay datos disponibles' },
    '잠시 후 다시 시도해 주세요': { en: 'Please try again later', es: 'Por favor intente nuevamente más tarde' },
    '필수 정보를 입력해 주세요': { en: 'Please enter required information', es: 'Por favor ingrese la información requerida' },
    '유효하지 않은 입력입니다': { en: 'Invalid input', es: 'Entrada inválida' },
         '서비스 지역을 벗어났습니다': { en: 'Outside service area', es: 'Fuera del área de servicio' },
     
     // === 로딩 UI 진행 단계 ===
     'AI가 상권을 분석하고 있습니다...': { en: 'AI is analyzing the commercial area...', es: 'La IA está analizando el área comercial...' },
     '직장인구 분석': { en: 'Working Population Analysis', es: 'Análisis de Población Trabajadora' },
     '300m 반경 내 직장인구 분포 분석': { en: 'Analysis of working population distribution within 300m radius', es: 'Análisis de distribución de población trabajadora dentro del radio de 300m' },
     '학교, 공공건물 등 유동인구 시설 분석': { en: 'Analysis of foot traffic facilities such as schools and public buildings', es: 'Análisis de instalaciones de tráfico peatonal como escuelas y edificios públicos' },
     '머신러닝 모델을 통한 생존확률 예측': { en: 'Survival probability prediction through machine learning model', es: 'Predicción de probabilidad de supervivencia a través del modelo de aprendizaje automático' },
     '결과를 표시하고 있습니다...': { en: 'Displaying results...', es: 'Mostrando resultados...' },
     
     // === 분석 결과 화면 ===
     '300m 내 직장인구': { en: 'Working Pop. within 300m', es: 'Población Trabajadora en 300m' },
     '동일업종 경쟁업체': { en: 'Same Business Type Competitors', es: 'Competidores del Mismo Tipo de Negocio' },
     '상권 경쟁 분석 (300m 반경)': { en: 'Commercial Competition Analysis (300m radius)', es: 'Análisis de Competencia Comercial (radio de 300m)' },
     '인구 구성 분석 (1000m 반경)': { en: 'Population Composition Analysis (1000m radius)', es: 'Análisis de Composición Poblacional (radio de 1000m)' },
     '장기 생존 확률': { en: 'Long-term Survival Rate', es: 'Tasa de Supervivencia a Largo Plazo' },
     '1위 추천 업종': { en: '1st Recommended Business Type', es: '1er Tipo de Negocio Recomendado' },
     '선택 업종 대비 우수': { en: 'Superior to Selected Business Type', es: 'Superior al Tipo de Negocio Seleccionado' },
     '전체 업종 순위 보기': { en: 'View All Business Rankings', es: 'Ver Todas las Clasificaciones de Negocios' },
     '경쟁 강도 분석': { en: 'Competition Intensity Analysis', es: 'Análisis de Intensidad de Competencia' },
     '연령대별 인구 비율': { en: 'Age Group Population Ratio', es: 'Ratio de Población por Grupo de Edad' },
     '연령대별 상세 정보': { en: 'Age Group Details', es: 'Detalles por Grupo de Edad' },
     '1000m 반경 내 생활인구 기준': { en: 'Based on residential population within 1000m radius', es: 'Basado en población residente dentro del radio de 1000m' },
     '단기체류 외국인': { en: 'Short-term Foreigners', es: 'Extranjeros de Corta Estancia' },
     '장기체류 외국인': { en: 'Long-term Foreigners', es: 'Extranjeros de Larga Estancia' },
     '장기체류 중국인 비율': { en: 'Long-term Chinese Ratio', es: 'Proporción China de Larga Estancia' },
     '1000m 반경': { en: '1000m radius', es: 'radio de 1000m' },
     
     // === 챗봇 텍스트 ===
     '분석결과 상담': { en: 'Analysis Consultation', es: 'Consulta de Análisis' },
     '대기중': { en: 'Waiting', es: 'Esperando' },
     '준비완료': { en: 'Ready', es: 'Listo' },
     '온라인': { en: 'Online', es: 'En línea' },
     '분석결과 상담 AI': { en: 'Analysis Consultation AI', es: 'IA de Consulta de Análisis' },
     '상권 분석 결과에 대해 AI와 상담하려면 로그인이 필요합니다.': { en: 'Login is required to consult with AI about analysis results.', es: 'Se requiere iniciar sesión para consultar con IA sobre los resultados del análisis.' },
     '상권 분석을 완료하면 AI 상담 서비스를 이용할 수 있습니다.': { en: 'Once commercial analysis is complete, you can use AI consultation service.', es: 'Una vez completado el análisis comercial, puede usar el servicio de consulta IA.' },
     '분석 완료 후 자동 활성화': { en: 'Auto-activated after analysis', es: 'Activación automática después del análisis' },
     '안녕하세요! 🎯 방금 완료된 상권 분석 결과에 대해 궁금한 점이 있으시면 언제든 물어보세요.': { 
       en: 'Hello! 🎯 If you have any questions about the commercial area analysis results just completed, feel free to ask anytime.', 
       es: '¡Hola! 🎯 Si tiene alguna pregunta sobre los resultados del análisis del área comercial recién completado, no dude en preguntar en cualquier momento.' 
     },
     '상담 가능한 내용:': { en: 'Available consultation topics:', es: 'Temas de consulta disponibles:' },
     'AI 생존 확률 해석': { en: 'AI Survival Probability Interpretation', es: 'Interpretación de Probabilidad de Supervivencia de IA' },
     '인구 및 고객층 분석': { en: 'Population and Customer Analysis', es: 'Análisis de Población y Clientes' },
     '경쟁업체 현황': { en: 'Competitor Status', es: 'Estado de la Competencia' },
     '수익성 전망': { en: 'Profitability Outlook', es: 'Perspectiva de Rentabilidad' },
     '창업 전략 조언': { en: 'Startup Strategy Advice', es: 'Consejo de Estrategia de Startup' },
     '현재 분석 세션 결과를 기반으로 답변': { en: 'Answers based on current analysis session results', es: 'Respuestas basadas en los resultados de la sesión de análisis actual' },
     '분석결과에 대해 궁금한 점을 물어보세요...': { en: 'Ask any questions about the analysis results...', es: 'Haga cualquier pregunta sobre los resultados del análisis...' },
     
     // === 추천 질문 버튼 ===
     '💡 Recommended Questions': { en: '💡 Recommended Questions', es: '💡 Preguntas Recomendadas' },
     
     // === PDF 관련 ===
     'PDF로 저장': { en: 'Save as PDF', es: 'Guardar como PDF' },
     '비회원 제한:': { en: 'Non-member restriction:', es: 'Restricción de no miembro:' },
     'PDF 저장 기능은 회원만 사용할 수 있습니다.': { en: 'PDF save function is only available to members.', es: 'La función de guardar PDF solo está disponible para miembros.' },
     
     // 사용자 출력 결과 기반 추가 번역
     '분석중...': { en: 'Analyzing...', es: 'Analizando...' },
     '분석 완료': { en: 'Analysis Complete', es: 'Análisis Completo' },
     '장기 생존 확률': { en: 'Long-term Survival Rate', es: 'Tasa de Supervivencia a Largo Plazo' },
     'AI 예측 분석': { en: 'AI Prediction Analysis', es: 'Análisis de Predicción IA' },
     'AI 분석 결과': { en: 'AI Analysis Result', es: 'Resultado del Análisis IA' },
     'AI 모델이 25개 지표를 종합 분석한 결과입니다.': { en: 'Results from AI model\'s comprehensive analysis of 25 indicators.', es: 'Resultados del análisis integral de 25 indicadores del modelo IA.' },
     
     // 경쟁 분석 관련
     '상권 경쟁 분석 (300m 반경)': { en: 'Competition Analysis (300m radius)', es: 'Análisis de Competencia (radio 300m)' },
     '경쟁업체 수': { en: 'Competitors', es: 'Competidores' },
     '전체 요식업체': { en: 'Total Restaurants', es: 'Total Restaurantes' },
     '경쟁업체 비율': { en: 'Competitor Ratio', es: 'Proporción de Competidores' },
     '업종 다양성': { en: 'Business Diversity', es: 'Diversidad de Negocios' },
     '경쟁 강도 분석': { en: 'Competition Intensity', es: 'Intensidad de Competencia' },
     '경쟁업체 비율이 20% 이하면 낮음, 20-50%는 보통, 50% 이상은 높음으로 분류됩니다.': { en: 'Competitor ratio below 20% is low, 20-50% is medium, above 50% is high.', es: 'Proporción de competidores por debajo del 20% es baja, 20-50% es media, por encima del 50% es alta.' },
     
     // 인구 분석 관련
     '인구 구성 분석 (1000m 반경)': { en: 'Population Analysis (1000m radius)', es: 'Análisis de Población (radio 1000m)' },
     '연령대별 인구 비율': { en: 'Population by Age Group', es: 'Población por Grupo de Edad' },
     '연령대별 상세 정보': { en: 'Detailed Age Information', es: 'Información Detallada de Edad' },
     '1000m 반경 내 생활인구 기준': { en: 'Based on population within 1000m radius', es: 'Basado en la población dentro de un radio de 1000m' },
     
     // 외국인 분석 관련
     '외국인 분석': { en: 'Foreign Population Analysis', es: 'Análisis de Población Extranjera' },
     '단기체류 외국인': { en: 'Short-term Foreign Visitors', es: 'Visitantes Extranjeros a Corto Plazo' },
     '장기체류 외국인': { en: 'Long-term Foreign Residents', es: 'Residentes Extranjeros a Largo Plazo' },
     '장기체류 중국인 비율': { en: 'Long-term Chinese Residents Ratio', es: 'Proporción de Residentes Chinos a Largo Plazo' },
     
     // 추천 업종 관련
     '1위 추천 업종': { en: 'Top Recommended Business', es: 'Negocio Más Recomendado' },
     '선택 업종 대비 우수': { en: 'Better than Selected Business', es: 'Mejor que el Negocio Seleccionado' },
     
     // 챗봇 관련
     '분석결과 상담': { en: 'Analysis Consultation', es: 'Consulta de Análisis' },
     '분석결과 상담 AI': { en: 'Analysis Consultation AI', es: 'IA de Consulta de Análisis' },
     '온라인': { en: 'Online', es: 'En línea' },
     '안녕하세요! 🎯 방금 완료된 상권 분석 결과에 대해 궁금한 점이 있으시면 언제든 물어보세요.': { en: 'Hello! 🎯 If you have any questions about the commercial analysis results just completed, please feel free to ask anytime.', es: '¡Hola! 🎯 Si tiene alguna pregunta sobre los resultados del análisis comercial recién completado, no dude en preguntar en cualquier momento.' },
     '상담 가능한 내용:': { en: 'Available consultation topics:', es: 'Temas de consulta disponibles:' },
     '• 📊 AI 생존 확률 해석': { en: '• 📊 AI survival probability interpretation', es: '• 📊 Interpretación de probabilidad de supervivencia IA' },
     '• 👥 인구 및 고객층 분석': { en: '• 👥 Population and customer analysis', es: '• 👥 Análisis de población y clientes' },
     '• 🏪 경쟁업체 현황': { en: '• 🏪 Competitor status', es: '• 🏪 Estado de competidores' },
     '• 💰 수익성 전망': { en: '• 💰 Profitability outlook', es: '• 💰 Perspectiva de rentabilidad' },
     '• 🚀 창업 전략 조언': { en: '• 🚀 Business strategy advice', es: '• 🚀 Consejos de estrategia empresarial' },
     '현재 분석 세션 결과를 기반으로 답변': { en: 'Answers based on current analysis session results', es: 'Respuestas basadas en resultados de la sesión de análisis actual' },
     'AI 연결 중...': { en: 'Connecting to AI...', es: 'Conectando a IA...' },
     
     // 상태 메시지
     '대기중': { en: 'Waiting', es: 'Esperando' },
     '준비': { en: 'Ready', es: 'Listo' },
     '준비중': { en: 'Preparing', es: 'Preparando' },
     '준비완료': { en: 'Ready', es: 'Listo' },
     '활성화': { en: 'Active', es: 'Activo' },
     '연결됨': { en: 'Connected', es: 'Conectado' },
     '연결끊김': { en: 'Disconnected', es: 'Desconectado' },
     '오류': { en: 'Error', es: 'Error' },
     
     // 입력 placeholder 관련
     '주소를 검색하세요': { en: 'Search for an address', es: 'Buscar una dirección' },
     '면적을 입력해주세요 (㎡)': { en: 'Enter area (㎡)', es: 'Ingrese área (㎡)' },
     
     // 챗봇 로딩 및 오류 메시지
     '로그인이 필요합니다.': { en: 'Login required.', es: 'Se requiere iniciar sesión.' },
     '채팅 기록을 불러오는 중...': { en: 'Loading chat history...', es: 'Cargando historial de chat...' },
     '아직 대화 기록이 없습니다.': { en: 'No conversation history yet.', es: 'Aún no hay historial de conversación.' },
     'AI와 대화를 시작해보세요!': { en: 'Start chatting with AI!', es: '¡Comience a chatear con la IA!' },
     '채팅 기록을 불러올 수 없습니다.': { en: 'Unable to load chat history.', es: 'No se puede cargar el historial de chat.' },
     '잠시 후 다시 시도해주세요.': { en: 'Please try again later.', es: 'Por favor, inténtelo de nuevo más tarde.' },
     '대화 기록을 불러오는 중...': { en: 'Loading conversation history...', es: 'Cargando historial de conversación...' },
     '대화 기록을 불러올 수 없습니다': { en: 'Unable to load conversation history', es: 'No se puede cargar el historial de conversación' },
     '공시지가': { en: 'Land Value', es: 'Valor del Terreno' },
     '좌측 채팅에서 분석 결과에 대해 자세히 문의하실 수 있습니다.': { en: 'You can inquire in detail about the analysis results in the left chat.', es: 'Puede consultar en detalle sobre los resultados del análisis en el chat izquierdo.' },
     
     // 인구 분석 관련
     '인구 구성 분석 (1000m 반경)': 'Population Analysis (1000m radius)',
     '연령대별 인구 비율': 'Population by Age Group',
     '연령대별 상세 정보': 'Detailed Age Information',
     '20대': '20s',
     '30대': '30s',
     '40대': '40s',
     '50대': '50s',
     '60대 이상': '60+ years',
     '1000m 반경 내 생활인구 기준': 'Based on population within 1000m radius',
     
     // 외국인 분석 관련
     '외국인 분석': 'Foreign Population Analysis',
     '단기체류 외국인': 'Short-term Foreign Visitors',
     '장기체류 외국인': 'Long-term Foreign Residents',
     '장기체류 중국인 비율': 'Long-term Chinese Residents Ratio',
     '1000m 반경': '1000m radius',
     '300m 반경': '300m radius',
     
     // AI 분석 요약
     'AI 분석 요약': 'AI Analysis Summary',
     '강점': 'Strengths',
     '주의사항': 'Cautions',
     
     // 추천 업종 관련
     '1위 추천 업종': 'Top Recommended Business',
     '선택 업종 대비 우수': 'Better than Selected Business',
     
     // 챗봇 관련
     '분석결과 상담': 'Analysis Consultation',
     '분석결과 상담 AI': 'Analysis Consultation AI',
     'PDF 저장 기능은 회원만 사용할 수 있습니다.': { en: 'PDF save function is only available to members.', es: 'La función de guardar PDF solo está disponible para miembros.' },
     'AI 상권분석 보고서': { en: 'AI Commercial Area Analysis Report', es: 'Informe de Análisis de Área Comercial IA' },
     '인공지능 기반 상업지구 분석 결과': { en: 'AI-Based Commercial Area Analysis Results', es: 'Resultados del Análisis de Área Comercial Basado en IA' },
     '분석 대상 정보': { en: 'Analysis Target Information', es: 'Información del Objetivo de Análisis' },
     '분석일시:': { en: 'Analysis Date:', es: 'Fecha de Análisis:' },
     'AI 생존 확률': { en: 'AI Survival Probability', es: 'Probabilidad de Supervivencia IA' },
     '분석 결과 미리보기': { en: 'Analysis Result Preview', es: 'Vista Previa del Resultado del Análisis' },
     '분석 결과를 불러오고 있습니다...': { en: 'Loading analysis results...', es: 'Cargando resultados del análisis...' },
     '잠시만 기다려 주세요.': { en: 'Please wait a moment.', es: 'Por favor espere un momento.' },
     '답변을 생성하고 있습니다...': { en: 'Generating response...', es: 'Generando respuesta...' },
     
     // Placeholder 번역
     '서울특별시 내 주소를 검색하세요': { en: 'Search for an address in Seoul', es: 'Buscar una dirección en Seúl' },
     '예: 33.2': { en: 'e.g., 33.2', es: 'ej: 33.2' },
     
     // PDF 섹션 제목 번역
     '동일업종': { en: 'Same Industry', es: 'Misma Industria' },
     '인접업체': { en: 'Adjacent Businesses', es: 'Negocios Adyacentes' },
     '경쟁 강도': { en: 'Competition Intensity', es: 'Intensidad de Competencia' },
     '단기체류 외국인': { en: 'Short-term Foreigners', es: 'Extranjeros de Corta Estancia' },
     '장기체류 외국인': { en: 'Long-term Foreigners', es: 'Extranjeros de Larga Estancia' },
     '중국인 비율': { en: 'Chinese Ratio', es: 'Proporción China' },
     '연령대별 인구 분석': { en: 'Age Group Analysis', es: 'Análisis de Grupos de Edad' },
     '연령대별 인구 비율': { en: 'Age Group Population Ratio', es: 'Proporción de Población por Grupo de Edad' },
     '연령대별 상세 정보': { en: 'Detailed Age Group Information', es: 'Información Detallada de Grupos de Edad' },
     '분석중...': { en: 'Analyzing...', es: 'Analizando...' }
  },
  
  //  언어별 텍스트 헬퍼 함수 (처음부터 올바른 언어로 출력)
  getText: function(key, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    const translation = this.translations[key];
    
    if (translation && translation[lang]) {
      return translation[lang];
    }
    
    // 폴백: 한국어 키 자체를 반환
    return key;
  },
  
  // 업종명을 ID로 가져오기 (처음부터 올바른 언어로)
  getBusinessTypeName: function(businessTypeId, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    if (!window.businessTypes) return '';
    
    const businessType = window.businessTypes.find(type => type.id == businessTypeId);
    if (!businessType) return '';
    
    if (lang === 'en' && businessType.eng) return businessType.eng;
    if (lang === 'es' && businessType.esp) return businessType.esp;
    return businessType.kor;
  },
  
  // 서비스 타입 텍스트 (처음부터 올바른 언어로)
  getServiceTypeText: function(serviceType, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    if (serviceType === 1) {
      return this.getText('일반음식점', lang);
    } else {
      return this.getText('기타', lang);
    }
  },
  
  // 생존 확률 상태 텍스트 (처음부터 올바른 언어로)
  getSurvivalStatusText: function(percentage, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    if (percentage >= 80) {
      return this.getText('매우 좋음', lang);
    } else if (percentage >= 60) {
      return this.getText('보통', lang);
    } else if (percentage >= 40) {
      return this.getText('주의', lang);
    } else {
      return this.getText('위험', lang);
    }
  },
  
  // 경쟁 강도 텍스트 (처음부터 올바른 언어로)
  getCompetitionText: function(competitorRatio, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    if (competitorRatio >= 50) {
      return this.getText('높음', lang);
    } else if (competitorRatio >= 20) {
      return this.getText('보통', lang);
    } else {
      return this.getText('낮음', lang);
    }
  },
  
  // 강점 리스트 생성 (처음부터 올바른 언어로)
  generateStrengthsList: function(result, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    let strengths = [];
    
    // 강점 분석 로직
    if (result.life_pop_300m > 5000) {
      if (lang === 'en') {
        strengths.push(`Rich residential population (${Math.round(result.life_pop_300m).toLocaleString()} people)`);
      } else if (lang === 'es') {
        strengths.push(`Rica población residente (${Math.round(result.life_pop_300m).toLocaleString()} personas)`);
      } else {
        strengths.push(`생활인구가 풍부함 (${Math.round(result.life_pop_300m).toLocaleString()}명)`);
      }
    }
    
    if (result.working_pop_300m > 3000) {
      if (lang === 'en') {
        strengths.push('Large working population advantageous for lunch customers');
      } else if (lang === 'es') {
        strengths.push('Gran población trabajadora ventajosa para clientes de almuerzo');
      } else {
        strengths.push('직장인구가 많아 점심시간 고객 확보 유리');
      }
    }
    
    if (result.competitor_ratio_300m < 30) {
      strengths.push(this.getText('경쟁업체 비율이 낮아 경쟁 부담 적음', lang));
    }
    
    if (result.business_diversity_300m > 10) {
      if (lang === 'en') {
        strengths.push('High business diversity indicates active commercial area');
      } else if (lang === 'es') {
        strengths.push('Alta diversidad de negocios indica área comercial activa');
      } else {
        strengths.push('업종 다양성이 높아 상권이 활성화됨');
      }
    }
    
    if (result.public_building_250m > 0 || result.school_250m > 0) {
      if (lang === 'en') {
        strengths.push('Nearby facilities that generate foot traffic');
      } else if (lang === 'es') {
        strengths.push('Instalaciones cercanas que generan tráfico peatonal');
      } else {
        strengths.push('주변 유동인구 유발시설 존재');
      }
    }
    
    // 기본 메시지
    if (strengths.length === 0) {
      if (lang === 'en') {
        strengths.push('Please review the comprehensive commercial area analysis results');
      } else if (lang === 'es') {
        strengths.push('Por favor revise los resultados integrales del análisis del área comercial');
      } else {
        strengths.push('상권 분석 결과를 종합적으로 검토하세요');
      }
    }
    
    return strengths;
  },
  
  // 주의사항 리스트 생성 (처음부터 올바른 언어로)
  generateCautionsList: function(result, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    let cautions = [];
    
    // 주의사항 분석 로직
    if (result.life_pop_300m < 2000) {
      cautions.push(this.getText('생활인구가 적어 고객 확보에 어려움 예상', lang));
    }
    
    if (result.competitor_ratio_300m > 50) {
      if (lang === 'en') {
        cautions.push('High competitor ratio may lead to intense competition');
      } else if (lang === 'es') {
        cautions.push('Alto ratio de competidores puede llevar a competencia intensa');
      } else {
        cautions.push('경쟁업체 비율이 높아 치열한 경쟁 예상');
      }
    }
    
    if (result.competitor_300m > 5) {
      if (lang === 'en') {
        cautions.push(`Many same-type competitors (${result.competitor_300m} businesses)`);
      } else if (lang === 'es') {
        cautions.push(`Muchos competidores del mismo tipo (${result.competitor_300m} negocios)`);
      } else {
        cautions.push(`동일업종 경쟁업체가 많음 (${result.competitor_300m}개)`);
      }
    }
    
    if (result.total_land_value > 100000000) {
      cautions.push(this.getText('공시지가가 높아 임대료 부담 클 수 있음', lang));
    }
    
    if (result.working_pop_300m < 1000) {
      cautions.push(this.getText('직장인구가 적어 평일 점심 고객 부족 우려', lang));
    }
    
    // 기본 메시지
    if (cautions.length === 0) {
      if (lang === 'en') {
        cautions.push('Current commercial area conditions are favorable');
      } else if (lang === 'es') {
        cautions.push('Las condiciones actuales del área comercial son favorables');
      } else {
        cautions.push('현재 상권 조건이 양호합니다');
      }
    }
    
    return cautions;
  },

  // 업종명 번역 (analyze-data.js의 정교한 로직 사용)
  translateBusinessType: function(inputText, targetLang = null) {
    const lang = targetLang || this.currentLanguage;
    
    // analyze-data.js의 translateBusinessType 함수 사용 (더 정교한 로직)
    if (typeof window.translateBusinessType === 'function') {
      const result = window.translateBusinessType(inputText, lang);
      console.log(`🔄 업종명 번역 (analyze-data.js 사용): "${inputText}" → "${result}" (${lang})`);
      return result;
    }
    
    // 폴백: 직접 처리 (analyze-data.js가 로드되지 않은 경우)
    console.log(`⚠️ analyze-data.js translateBusinessType 함수 없음, 폴백 처리: ${inputText}`);
    
    if (lang === 'ko') return inputText;
    if (!window.businessTypes) return inputText;
    
    let koreanName = inputText.trim();
    
    // 공백 변형 처리 (외국음식전문점 문제 해결)
    const nameVariations = [
      koreanName,
      // 공백 제거/추가 패턴
      koreanName.replace(/\s+/g, ''),
      koreanName.replace(/\(/g, ' ('),
      // 외국음식전문점 공백 처리
      koreanName.replace('외국음식전문점(인도,태국등)', '외국음식전문점(인도, 태국 등)'),
      koreanName.replace('외국음식전문점(인도, 태국 등)', '외국음식전문점(인도,태국등)'),
      // 기타 공통 패턴
      koreanName.replace(/,\s*/g, ', '), // 쉼표 뒤 공백 정규화
      koreanName.replace(/\s*,/g, ','),   // 쉼표 앞 공백 제거
    ];
    
    // 🎯 혼재된 텍스트 처리 (예: "Kimbap(fiambrera)" → "김밥(도시락)" 찾기)
    // 1. 이미 번역된 텍스트에서 원본 한국어명 찾기
    const reverseBusinessType = window.businessTypes.find(type => 
      type.eng === koreanName || type.esp === koreanName ||
      type.eng === koreanName.replace(/\([^)]*\)/, '').trim() ||
      type.esp === koreanName.replace(/\([^)]*\)/, '').trim()
    );
    
    if (reverseBusinessType) {
      koreanName = reverseBusinessType.kor;
      nameVariations.push(koreanName);
    }
    
    // 2. 모든 변형에 대해 번역 시도
    for (const variation of nameVariations) {
      const businessType = window.businessTypes.find(type => type.kor === variation);
      if (businessType) {
        if (lang === 'en' && businessType.eng) return businessType.eng;
        if (lang === 'es' && businessType.esp) return businessType.esp;
        return businessType.kor;
      }
    }
    
    // 3. 부분 매칭 시도 (한국어가 포함된 경우)
    for (const type of window.businessTypes) {
      if (inputText.includes(type.kor)) {
        if (lang === 'en' && type.eng) return type.eng;
        if (lang === 'es' && type.esp) return type.esp;
      }
    }
    
    console.log(`❌ 업종명 번역 실패: "${inputText}" (${lang})`);
    return inputText;
  },
  
  // 페이지 번역 실행 (최적화된 버전 - 필요한 것만)
  translatePage: function() {
    console.log(`🌐 AI_Analyzer 드롭다운 업데이트: ${this.currentLanguage}`);
    
    // 🎯 이제 드롭다운만 업데이트 (텍스트는 처음부터 올바른 언어로 출력됨)
    this.updateDropdowns();
    
    console.log(`✅ AI_Analyzer 드롭다운 업데이트 완료: ${this.currentLanguage}`);
  },
  
  // 드롭다운 업데이트
  updateDropdowns: function() {
    // 업종 드롭다운
    const businessSelect = document.getElementById('business_type_id');
    if (businessSelect && window.businessTypes) {
      const currentValue = businessSelect.value;
      
      let placeholder = '업종을 선택해주세요';
      if (this.currentLanguage === 'en') placeholder = 'Please select an industry';
      else if (this.currentLanguage === 'es') placeholder = 'Por favor seleccione un tipo de negocio';
      
      let options = `<option selected disabled>${placeholder}</option>`;
      
      window.businessTypes.forEach(type => {
        let name = type.kor;
        if (this.currentLanguage === 'en' && type.eng) name = type.eng;
        else if (this.currentLanguage === 'es' && type.esp) name = type.esp;
        
        options += `<option value="${type.id}">${name}</option>`;
      });
      
      businessSelect.innerHTML = options;
      if (currentValue && currentValue !== '') {
        businessSelect.value = currentValue;
      }
    }
    
    // 주류 판매 드롭다운
    const serviceSelect = document.getElementById('service_type');
    if (serviceSelect) {
      const currentValue = serviceSelect.value;
      
      let choose = '선택', yes = '판매함', no = '판매 안함';
      if (this.currentLanguage === 'en') {
        choose = 'Choose'; yes = 'Yes'; no = 'No';
      } else if (this.currentLanguage === 'es') {
        choose = 'Seleccionar'; yes = 'Sí'; no = 'No';
      }
      
      serviceSelect.innerHTML = `
        <option selected disabled>${choose}</option>
        <option value="1">${yes}</option>
        <option value="0">${no}</option>
      `;
      
      if (currentValue && currentValue !== '') {
        serviceSelect.value = currentValue;
      }
    }
    
    // Placeholder 업데이트
    this.updatePlaceholders();
  },
  
  // Placeholder 업데이트
  updatePlaceholders: function() {
    // 주소 검색 input placeholder
    const addressInput = document.getElementById('address');
    if (addressInput) {
      const addressPlaceholder = this.getText('서울특별시 내 주소를 검색하세요');
      addressInput.setAttribute('placeholder', addressPlaceholder);
    }
    
    // 면적 input placeholder
    const areaInput = document.getElementById('area');
    if (areaInput) {
      const areaPlaceholder = this.getText('예: 33.2');
      areaInput.setAttribute('placeholder', areaPlaceholder);
    }
  },
  
  // 🚫 텍스트 노드 번역 비활성화 (이제 필요 없음)
  translateTextNodes: function() {
    console.log(`⚡ 텍스트 노드 번역 비활성화됨 (처음부터 올바른 언어로 출력)`);
    // 더 이상 DOM 번역 없음 - 성능 최적화
  },
  
  // 🚫 업종명 번역 비활성화 (이제 필요 없음)
  translateBusinessTypeElements: function() {
    console.log(`⚡ 업종명 번역 비활성화됨 (처음부터 올바른 언어로 출력)`);
    // 더 이상 DOM 번역 없음 - 성능 최적화
  },
  
  // 🚫 특수 요소 처리 비활성화 (이제 필요 없음)
  handleSpecialElements: function() {
    console.log(`⚡ 특수 요소 처리 비활성화됨 (처음부터 올바른 언어로 출력)`);
    // 로딩 UI와 차트는 이제 처음부터 올바른 언어로 생성됨 - 성능 최적화
  },
  
  // 재분석 트리거 (필요한 경우에만)
  triggerReanalysisIfNeeded: function(oldLanguage) {
    console.log('🔍 재분석 필요성 검토 중...');
    console.log('  - 이전 언어:', oldLanguage);
    console.log('  - 새 언어:', this.currentLanguage);
    console.log('  - reAnalyzeOnLanguageChange 함수 존재:', typeof window.reAnalyzeOnLanguageChange === 'function');
    console.log('  - isAnalysisResultVisible:', window.isAnalysisResultVisible);
    console.log('  - lastAnalysisParams:', window.lastAnalysisParams);
    
    if (typeof window.reAnalyzeOnLanguageChange === 'function' && 
        window.isAnalysisResultVisible && 
        window.lastAnalysisParams) {
      
      console.log('🔄 언어 변경에 따른 재분석 트리거');
      window.reAnalyzeOnLanguageChange(this.currentLanguage);
    } else {
      console.log('⚠️ 재분석 조건 미충족:');
      if (typeof window.reAnalyzeOnLanguageChange !== 'function') {
        console.log('  - reAnalyzeOnLanguageChange 함수가 없음');
      }
      if (!window.isAnalysisResultVisible) {
        console.log('  - 분석 결과가 표시되지 않음');
      }
      if (!window.lastAnalysisParams) {
        console.log('  - 마지막 분석 파라미터가 없음');
      }
    }
  },
  
  // ===========================================
  // 🎯 언어 변경 감지 시스템
  // ===========================================
  
  // 언어 변경 감지기 초기화
  initializeLanguageObserver: function() {
    if (this.isInitialized) return;
    
    console.log('🔍 AI_Analyzer 언어 변경 감지기 초기화...');
    
    // 1. MutationObserver로 data-lang 요소 변경 감지
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const element = mutation.target;
          if (element.hasAttribute('data-lang')) {
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        const newLanguage = this.detectCurrentLanguage();
        this.handleLanguageChange(newLanguage);
      }
    });
    
    // data-lang 요소들 관찰
    document.querySelectorAll('[data-lang]').forEach(element => {
      observer.observe(element, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    });
    
    // 2. 최적화된 언어 감지 (백업용 - 성능 개선)
    let pollCount = 0;
    const pollInterval = setInterval(() => {
      const detectedLanguage = this.detectCurrentLanguage();
      if (detectedLanguage !== this.currentLanguage) {
        console.log(`🔄 폴링에서 언어 변경 감지: ${this.currentLanguage} → ${detectedLanguage}`);
        this.handleLanguageChange(detectedLanguage);
      }
      
      // 성능 최적화: 2분 후 폴링 간격을 늘림
      pollCount++;
      if (pollCount > 120) { // 2분 후
        clearInterval(pollInterval);
        // 5초마다로 간격 늘림
        setInterval(() => {
          const detectedLanguage = this.detectCurrentLanguage();
          if (detectedLanguage !== this.currentLanguage) {
            console.log(`🔄 느린폴링에서 언어 변경 감지: ${this.currentLanguage} → ${detectedLanguage}`);
            this.handleLanguageChange(detectedLanguage);
          }
        }, 5000);
        console.log('⚡ 언어 감지 폴링 간격을 5초로 변경 (성능 최적화)');
      }
    }, 1000); // 처음 2분간은 1초마다, 이후 5초마다
    
    this.isInitialized = true;
    console.log('✅ AI_Analyzer 언어 변경 감지기 초기화 완료');
  },
  
  // 🚫 동적 콘텐츠 MutationObserver 비활성화 (이제 필요 없음)
  setupContentObserver: function() {
    console.log('⚡ 동적 콘텐츠 관찰자 비활성화됨 (처음부터 올바른 언어로 출력)');
    // 더 이상 MutationObserver 사용하지 않음 - 성능 최적화
  },
  
  // 🚫 주기적 번역 시스템 비활성화 (이제 필요 없음)
  startPeriodicTranslation: function() {
    console.log('⚡ 주기적 번역 시스템 비활성화됨 (처음부터 올바른 언어로 출력)');
    // 더 이상 setInterval 사용하지 않음 - 성능 최적화
  },
  
  // 초기화 (최적화된 버전)
  initialize: function() {
    console.log('🚀 AI_Analyzer 다국어 시스템 초기화 시작...');
    
    // 현재 언어 감지
    this.currentLanguage = this.detectCurrentLanguage();
    console.log(`📋 현재 감지된 언어: ${this.currentLanguage}`);
    
    // 언어 변경 감지기만 시작 (필수)
    this.initializeLanguageObserver();
    
    // 🎯 이제 처음부터 올바른 언어로 출력되므로 추가 번역 작업 불필요
    // 단, 드롭다운은 초기화 시 한 번 업데이트
    this.updateDropdowns();
    
    console.log('✅ AI_Analyzer 다국어 시스템 초기화 완료! (성능 최적화됨)');
  }
};

// ===========================================
// 🎯 전역 함수 노출 (호환성)
// ===========================================

// 기존 함수들과의 호환성을 위한 전역 함수 노출
window.getCurrentAILanguage = function() {
  return AI_ANALYZER_I18N.currentLanguage;
};

window.performFullTranslation = function(language) {
  AI_ANALYZER_I18N.handleLanguageChange(language);
};

// translateBusinessType은 analyze-data.js에서 노출하므로 덮어쓰지 않음
// (analyze-data.js의 정교한 로직을 유지하기 위해)
if (!window.translateBusinessType) {
  window.translateBusinessType = function(koreanName, lang = null) {
    return AI_ANALYZER_I18N.translateBusinessType(koreanName, lang);
  };
}

// analyze-data.js 함수들과의 호환성
window.updateDropdownOptions = function(lang = null) {
  if (lang) {
    AI_ANALYZER_I18N.currentLanguage = AI_ANALYZER_I18N.normalizeLanguageCode(lang);
  }
  AI_ANALYZER_I18N.updateDropdowns();
};

// 🎯 새로운 헬퍼 함수들 전역 노출
window.getLocalizedText = function(key, lang = null) {
  return AI_ANALYZER_I18N.getText(key, lang);
};

window.getLocalizedBusinessTypeName = function(businessTypeId, lang = null) {
  return AI_ANALYZER_I18N.getBusinessTypeName(businessTypeId, lang);
};

window.getLocalizedServiceTypeText = function(serviceType, lang = null) {
  return AI_ANALYZER_I18N.getServiceTypeText(serviceType, lang);
};

window.getLocalizedSurvivalStatusText = function(percentage, lang = null) {
  return AI_ANALYZER_I18N.getSurvivalStatusText(percentage, lang);
};

window.getLocalizedCompetitionText = function(competitorRatio, lang = null) {
  return AI_ANALYZER_I18N.getCompetitionText(competitorRatio, lang);
};

window.generateLocalizedStrengthsList = function(result, lang = null) {
  return AI_ANALYZER_I18N.generateStrengthsList(result, lang);
};

window.generateLocalizedCautionsList = function(result, lang = null) {
  return AI_ANALYZER_I18N.generateCautionsList(result, lang);
};

// ===========================================
// 🎯 자동 초기화
// ===========================================

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // 약간 지연 후 초기화 (다른 스크립트 로드 대기)
    setTimeout(() => {
      AI_ANALYZER_I18N.initialize();
    }, 100);
  });
} else {
  // 이미 로드 완료된 경우 즉시 초기화
  setTimeout(() => {
    AI_ANALYZER_I18N.initialize();
  }, 100);
}

console.log('✅ AI_Analyzer 전용 다국어 시스템 v3.0 로드 완료! (성능 최적화)'); 