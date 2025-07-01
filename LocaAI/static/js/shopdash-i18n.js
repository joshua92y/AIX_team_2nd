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
    detailedInfo: '상세 정보',
    
    // 업종별 다국어 매핑 (실제 DB에서 사용되는 모든 업종명 포함)
    businessTypes: {
      // === 음식점업 ===
      '한식': '한식',
      '중식': '중식',
      '중국식': '중식',
      '일식': '일식',
      '양식': '양식',
      '경양식': '경양식',
      '분식': '분식',
      '카페': '카페',
      '까페': '카페',
      '커피숍': '커피숍',
      '커피전문점': '커피전문점',
      '음식점': '음식점',
      '일반음식점': '일반음식점',
      '기타 휴게음식점': '기타 휴게음식점',
      '휴게음식점': '휴게음식점',
      '치킨': '치킨',
      '통닭(치킨)': '치킨',
      '피자': '피자',
      '햄버거': '햄버거',
      '패스트푸드': '패스트푸드',
      '패밀리레스토랑': '패밀리레스토랑',
      '뷔페식': '뷔페',
      '외국음식전문점(인도, 태국 등)': '외국음식전문점',
      '외국음식전문점(인도,태국등)': '외국음식전문점',
      '한국음식점': '한식당',
      '중국음식점': '중식당',
      '일본음식점': '일식당',
      '양식음식점': '양식당',
      
      // === 주점업 ===
      '술집': '술집',
      '호프집': '호프집',
      '정종/대포집/소주방': '소주방',
      '단란주점': '단란주점',
      '감성주점': '감성주점',
      '호프/통닭': '호프치킨',
      
      // === 제과점 및 베이커리 ===
      '베이커리': '베이커리',
      '제과점영업': '제과점',
      '제과점': '제과점',
      '빵집': '베이커리',
      '떡·빵류 제조업소': '떡·빵 제조업',
      '떡카페': '떡카페',
      
      // === 편의점 및 소매업 ===
      '편의점': '편의점',
      '슈퍼마켓': '슈퍼마켓',
      '대형마트': '대형마트',
      '백화점': '백화점',
      '쇼핑센터': '쇼핑센터',
      '전문점': '전문점',
      '재래시장': '재래시장',
      '소매업': '소매업',
      '기타소매업': '기타소매업',
      '도·소매업': '도·소매업',
      '유통전문판매업': '유통전문판매업',
      
      // === 의류 및 패션 ===
      '의류': '의류',
      '의류점': '의류점',
      '신발': '신발',
      '신발점': '신발점',
      '아동복점': '아동복점',
      '유아용품점': '유아용품점',
      '교복점': '교복점',
      '란제리점': '란제리점',
      '혼수용품점': '혼수용품점',
      '액세서리점': '액세서리점',
      '가방점': '가방점',
      '잡화점': '잡화점',
      
      // === 미용 및 건강 ===
      '미용실': '미용실',
      '미용업': '미용실',
      '이용업': '이용소',
      '네일아트': '네일아트',
      '네일미용업': '네일샵',
      '피부미용업': '피부관리실',
      '화장품점': '화장품점',
      '안경업': '안경점',
      
      // === 의료 및 약국 ===
      '약국': '약국',
      '의료기기판매업': '의료기기판매점',
      '동물병원': '동물병원',
      '동물약국': '동물약국',
      '건강기능식품전문판매업': '건강기능식품판매점',
      
      // === 교육 및 학원 ===
      '학원': '학원',
      '입시학원': '입시학원',
      '외국어학원': '외국어학원',
      '컴퓨터학원': '컴퓨터학원',
      '미술학원': '미술학원',
      '음악학원': '음악학원',
      '댄스학원': '댄스학원',
      '방과후교실': '방과후교실',
      
      // === 운동 및 레저 ===
      '헬스장': '헬스장',
      '체육관': '체육관',
      '수영장': '수영장',
      '골프연습장': '골프연습장',
      '태권도장': '태권도장',
      '요가스튜디오': '요가스튜디오',
      '필라테스': '필라테스',
      '볼링장업': '볼링장',
      '당구장업': '당구장',
      '찜질방': '찜질방',
      
      // === 엔터테인먼트 ===
      '노래방': '노래방',
      '노래연습장업': '노래방',
      'PC방': 'PC방',
      '컴퓨터게임제공업': 'PC방',
      '인터넷컴퓨터게임시설제공업': 'PC방',
      '게임방': '게임방',
      '만화방': '만화카페',
      '오락실': '오락실',
      '키즈카페': '키즈카페',
      '라이브카페': '라이브카페',
      
      // === 문화 및 서비스 ===
      '문구점': '문구점',
      '서점': '서점',
      '음반점': '음반점',
      '사진관': '사진관',
      '꽃집': '꽃집',
      '화훼장식업': '꽃집',
      '독서실': '독서실',
      
      // === 전자제품 및 통신 ===
      '핸드폰': '핸드폰샵',
      '핸드폰대리점': '핸드폰샵',
      '휴대폰판매수리업': '핸드폰수리점',
      '전자제품점': '전자제품점',
      '컴퓨터판매점': '컴퓨터판매점',
      
      // === 생활서비스 ===
      '세탁소': '세탁소',
      '세탁업': '세탁소',
      
      // === 숙박업 ===
      '숙박업': '숙박업',
      '호텔업': '호텔',
      '모텔업': '모텔',
      '여관업': '여관',
      '펜션업': '펜션',
      '민박업': '민박',
      
      // === 식품 관련업 ===
      '기타': '기타',
      '일반조리판매': '일반조리판매',
      '즉석판매제조·가공업': '즉석판매제조업',
      '식품접객업': '식품접객업',
      '집단급식소': '집단급식소',
      '위탁급식영업': '위탁급식업',
      '식품제조·가공업': '식품제조업',
      '식품운반업': '식품운반업',
      '식품냉동·냉장업': '식품냉동·냉장업',
      '식품첨가물제조업': '식품첨가물제조업',
      '식품자동판매기영업': '식품자동판매기업',
      
      // === 기타 ===
      '전통찻집': '전통찻집',
      '다방': '다방',
      '아이스크림': '아이스크림점'
    }
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
    detailedInfo: 'Detailed Information',
    
    // 업종별 다국어 매핑 (실제 DB에서 사용되는 모든 업종명 포함)
    businessTypes: {
      // === 음식점업 ===
      '한식': 'Korean Food',
      '중식': 'Chinese Food',
      '중국식': 'Chinese Food',
      '일식': 'Japanese Food',
      '양식': 'Western Food',
      '경양식': 'Light Western Food',
      '분식': 'Snack Bar',
      '카페': 'Cafe',
      '까페': 'Cafe',
      '커피숍': 'Coffee Shop',
      '커피전문점': 'Coffee Shop',
      '음식점': 'Restaurant',
      '일반음식점': 'General Restaurant',
      '기타 휴게음식점': 'Other Snack Bar',
      '휴게음식점': 'Snack Bar',
      '치킨': 'Chicken',
      '통닭(치킨)': 'Fried Chicken',
      '피자': 'Pizza',
      '햄버거': 'Hamburger',
      '패스트푸드': 'Fast Food',
      '패밀리레스토랑': 'Family Restaurant',
      '뷔페식': 'Buffet',
      '외국음식전문점(인도, 태국 등)': 'Foreign Restaurant',
      '외국음식전문점(인도,태국등)': 'Foreign Restaurant',
      '한국음식점': 'Korean Restaurant',
      '중국음식점': 'Chinese Restaurant',
      '일본음식점': 'Japanese Restaurant',
      '양식음식점': 'Western Restaurant',
      
      // === 주점업 ===
      '술집': 'Bar',
      '호프집': 'Beer House',
      '정종/대포집/소주방': 'Traditional Pub',
      '단란주점': 'Lounge Bar',
      '감성주점': 'Emotional Bar',
      '호프/통닭': 'Beer & Chicken',
      
      // === 제과점 및 베이커리 ===
      '베이커리': 'Bakery',
      '제과점영업': 'Bakery Business',
      '제과점': 'Bakery',
      '빵집': 'Bakery',
      '떡·빵류 제조업소': 'Rice Cake & Bread Manufacturing',
      '떡카페': 'Rice Cake Cafe',
      
      // === 편의점 및 소매업 ===
      '편의점': 'Convenience Store',
      '슈퍼마켓': 'Supermarket',
      '대형마트': 'Hypermarket',
      '백화점': 'Department Store',
      '쇼핑센터': 'Shopping Center',
      '전문점': 'Specialty Store',
      '재래시장': 'Traditional Market',
      '소매업': 'Retail',
      '기타소매업': 'Other Retail',
      '도·소매업': 'Wholesale & Retail',
      '유통전문판매업': 'Distribution Sales',
      
      // === 의류 및 패션 ===
      '의류': 'Clothing',
      '의류점': 'Clothing Store',
      '신발': 'Shoes',
      '신발점': 'Shoe Store',
      '아동복점': 'Children\'s Clothing Store',
      '유아용품점': 'Baby Products Store',
      '교복점': 'School Uniform Store',
      '란제리점': 'Lingerie Store',
      '혼수용품점': 'Wedding Goods Store',
      '액세서리점': 'Accessory Store',
      '가방점': 'Bag Store',
      '잡화점': 'General Goods Store',
      
      // === 미용 및 건강 ===
      '미용실': 'Beauty Salon',
      '미용업': 'Beauty Salon',
      '이용업': 'Barber Shop',
      '네일아트': 'Nail Art',
      '네일미용업': 'Nail Salon',
      '피부미용업': 'Skin Care Salon',
      '화장품점': 'Cosmetics Store',
      '안경업': 'Optical Store',
      
      // === 의료 및 약국 ===
      '약국': 'Pharmacy',
      '의료기기판매업': 'Medical Equipment Store',
      '동물병원': 'Veterinary Clinic',
      '동물약국': 'Veterinary Pharmacy',
      '건강기능식품전문판매업': 'Health Functional Food Store',
      
      // === 교육 및 학원 ===
      '학원': 'Academy',
      '입시학원': 'Entrance Exam Academy',
      '외국어학원': 'Language Academy',
      '컴퓨터학원': 'Computer Academy',
      '미술학원': 'Art Academy',
      '음악학원': 'Music Academy',
      '댄스학원': 'Dance Academy',
      '방과후교실': 'After School Program',
      
      // === 운동 및 레저 ===
      '헬스장': 'Gym',
      '체육관': 'Sports Center',
      '수영장': 'Swimming Pool',
      '골프연습장': 'Golf Practice Range',
      '태권도장': 'Taekwondo Gym',
      '요가스튜디오': 'Yoga Studio',
      '필라테스': 'Pilates',
      '볼링장업': 'Bowling Alley',
      '당구장업': 'Billiards',
      '찜질방': 'Sauna',
      
      // === 엔터테인먼트 ===
      '노래방': 'Karaoke',
      '노래연습장업': 'Karaoke',
      'PC방': 'PC Room',
      '컴퓨터게임제공업': 'PC Room',
      '인터넷컴퓨터게임시설제공업': 'PC Room',
      '게임방': 'Game Room',
      '만화방': 'Manga Cafe',
      '오락실': 'Arcade',
      '키즈카페': 'Kids Cafe',
      '라이브카페': 'Live Cafe',
      
      // === 문화 및 서비스 ===
      '문구점': 'Stationery Store',
      '서점': 'Bookstore',
      '음반점': 'Record Store',
      '사진관': 'Photo Studio',
      '꽃집': 'Flower Shop',
      '화훼장식업': 'Flower Shop',
      '독서실': 'Study Room',
      
      // === 전자제품 및 통신 ===
      '핸드폰': 'Mobile Phone Store',
      '핸드폰대리점': 'Mobile Phone Store',
      '휴대폰판매수리업': 'Mobile Phone Repair',
      '전자제품점': 'Electronics Store',
      '컴퓨터판매점': 'Computer Store',
      
      // === 생활서비스 ===
      '세탁소': 'Laundry',
      '세탁업': 'Laundry',
      
      // === 숙박업 ===
      '숙박업': 'Accommodation',
      '호텔업': 'Hotel',
      '모텔업': 'Motel',
      '여관업': 'Inn',
      '펜션업': 'Pension',
      '민박업': 'Homestay',
      
      // === 식품 관련업 ===
      '기타': 'Others',
      '일반조리판매': 'General Cooked Food Sales',
      '즉석판매제조·가공업': 'Instant Food Manufacturing',
      '식품접객업': 'Food Service',
      '집단급식소': 'Group Catering',
      '위탁급식영업': 'Catering Service',
      '식품제조·가공업': 'Food Manufacturing',
      '식품운반업': 'Food Transportation',
      '식품냉동·냉장업': 'Food Refrigeration',
      '식품첨가물제조업': 'Food Additive Manufacturing',
      '식품자동판매기영업': 'Food Vending Machine',
      
      // === 기타 ===
      '전통찻집': 'Traditional Tea House',
      '다방': 'Tea Room',
      '아이스크림': 'Ice Cream Shop'
    }
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
    detailedInfo: 'Información Detallada',
    
    // 업종별 다국어 매핑
    businessTypes: {
      // === 음식점업 ===
      '한식': 'Comida Coreana',
      '중식': 'Comida China',
      '중국식': 'Comida China',
      '일식': 'Comida Japonesa',
      '양식': 'Comida Occidental',
      '경양식': 'Comida Occidental Ligera',
      '분식': 'Bar de Snacks',
      '카페': 'Café',
      '까페': 'Café',
      '커피숍': 'Cafetería',
      '커피전문점': 'Cafetería Especializada',
      '음식점': 'Restaurante',
      '일반음식점': 'Restaurante General',
      '기타 휴게음식점': 'Otros Bares de Snacks',
      '휴게음식점': 'Bar de Snacks',
      '치킨': 'Pollo',
      '통닭(치킨)': 'Pollo Frito',
      '피자': 'Pizza',
      '햄버거': 'Hamburguesa',
      '패스트푸드': 'Comida Rápida',
      '패밀리레스토랑': 'Restaurante Familiar',
      '뷔페식': 'Buffet',
      '외국음식전문점(인도, 태국 등)': 'Restaurante Extranjero',
      '외국음식전문점(인도,태국등)': 'Restaurante Extranjero',
      '한국음식점': 'Restaurante Coreano',
      '중국음식점': 'Restaurante Chino',
      '일본음식점': 'Restaurante Japonés',
      '양식음식점': 'Restaurante Occidental',
      
      // === 주점업 ===
      '술집': 'Bar',
      '호프집': 'Casa de Cerveza',
      '정종/대포집/소주방': 'Bar Coreano Tradicional',
      '단란주점': 'Bar de Entretenimiento',
      '감성주점': 'Bar Emocional',
      '호프/통닭': 'Cerveza y Pollo',
      
      // === 제과점 및 베이커리 ===
      '베이커리': 'Panadería',
      '제과점영업': 'Negocio de Panadería',
      '제과점': 'Panadería',
      '빵집': 'Panadería',
      '떡·빵류 제조업소': 'Fabricación de Pasteles de Arroz y Pan',
      '떡카페': 'Café de Pasteles de Arroz',
      
      // === 편의점 및 소매업 ===
      '편의점': 'Tienda de Conveniencia',
      '슈퍼마켓': 'Supermercado',
      '대형마트': 'Hipermercado',
      '백화점': 'Grandes Almacenes',
      '쇼핑센터': 'Centro Comercial',
      '전문점': 'Tienda Especializada',
      '재래시장': 'Mercado Tradicional',
      '소매업': 'Venta al Por Menor',
      '기타소매업': 'Otras Ventas al Por Menor',
      '도·소매업': 'Venta al Por Mayor y Menor',
      '유통전문판매업': 'Venta de Distribución',
      
      // === 의류 및 패션 ===
      '의류': 'Ropa',
      '의류점': 'Tienda de Ropa',
      '신발': 'Zapatos',
      '신발점': 'Zapatería',
      '아동복점': 'Tienda de Ropa Infantil',
      '유아용품점': 'Tienda de Artículos para Bebés',
      '교복점': 'Tienda de Uniformes Escolares',
      '란제리점': 'Tienda de Lencería',
      '혼수용품점': 'Tienda de Artículos de Boda',
      '액세서리점': 'Tienda de Accesorios',
      '가방점': 'Tienda de Bolsos',
      '잡화점': 'Tienda de Artículos Generales',
      
      // === 미용 및 건강 ===
      '미용실': 'Salón de Belleza',
      '미용업': 'Salón de Belleza',
      '이용업': 'Barbería',
      '네일아트': 'Arte de Uñas',
      '네일미용업': 'Salón de Uñas',
      '피부미용업': 'Salón de Cuidado de la Piel',
      '화장품점': 'Tienda de Cosméticos',
      '안경업': 'Óptica',
      
      // === 의료 및 약국 ===
      '약국': 'Farmacia',
      '의료기기판매업': 'Tienda de Equipos Médicos',
      '동물병원': 'Clínica Veterinaria',
      '동물약국': 'Farmacia Veterinaria',
      '건강기능식품전문판매업': 'Tienda de Alimentos Funcionales',
      
      // === 교육 및 학원 ===
      '학원': 'Academia',
      '입시학원': 'Academia de Preparación',
      '외국어학원': 'Academia de Idiomas',
      '컴퓨터학원': 'Academia de Computación',
      '미술학원': 'Academia de Arte',
      '음악학원': 'Academia de Música',
      '댄스학원': 'Academia de Danza',
      '방과후교실': 'Programa Extraescolar',
      
      // === 운동 및 레저 ===
      '헬스장': 'Gimnasio',
      '체육관': 'Centro Deportivo',
      '수영장': 'Piscina',
      '골프연습장': 'Campo de Práctica de Golf',
      '태권도장': 'Gimnasio de Taekwondo',
      '요가스튜디오': 'Estudio de Yoga',
      '필라테스': 'Pilates',
      '볼링장업': 'Bolera',
      '당구장업': 'Billar',
      '찜질방': 'Sauna',
      
      // === 엔터테인먼트 ===
      '노래방': 'Karaoke',
      '노래연습장업': 'Karaoke',
      'PC방': 'PC Bang',
      '컴퓨터게임제공업': 'PC Bang',
      '인터넷컴퓨터게임시설제공업': 'PC Bang',
      '게임방': 'Sala de Juegos',
      '만화방': 'Café de Cómics',
      '오락실': 'Arcade',
      '키즈카페': 'Café para Niños',
      '라이브카페': 'Café en Vivo',
      
      // === 문화 및 서비스 ===
      '문구점': 'Papelería',
      '서점': 'Librería',
      '음반점': 'Tienda de Música',
      '사진관': 'Estudio Fotográfico',
      '꽃집': 'Floristería',
      '화훼장식업': 'Diseño Floral',
      '독서실': 'Sala de Estudio',
      
      // === 전자제품 및 통신 ===
      '핸드폰': 'Tienda de Móviles',
      '핸드폰대리점': 'Tienda de Móviles',
      '휴대폰판매수리업': 'Reparación de Móviles',
      '전자제품점': 'Tienda de Electrónicos',
      '컴퓨터판매점': 'Tienda de Computadoras',
      
      // === 생활서비스 ===
      '세탁소': 'Lavandería',
      '세탁업': 'Lavandería',
      
      // === 숙박업 ===
      '숙박업': 'Alojamiento',
      '호텔업': 'Hotel',
      '모텔업': 'Motel',
      '여관업': 'Posada',
      '펜션업': 'Pensión',
      '민박업': 'Casa de Huéspedes',
      
      // === 식품 관련업 ===
      '기타': 'Otros',
      '일반조리판매': 'Venta de Comida Casera',
      '즉석판매제조·가공업': 'Fabricación de Alimentos Instantáneos',
      '식품접객업': 'Servicio de Alimentos',
      '집단급식소': 'Servicio de Comidas Grupales',
      '위탁급식영업': 'Servicio de Catering',
      '식품제조·가공업': 'Fabricación de Alimentos',
      '식품운반업': 'Transporte de Alimentos',
      '식품냉동·냉장업': 'Refrigeración de Alimentos',
      '식품첨가물제조업': 'Fabricación de Aditivos Alimentarios',
      '식품자동판매기영업': 'Máquina Expendedora de Alimentos',
      
      // === 기타 ===
      '전통찻집': 'Casa de Té Tradicional',
      '다방': 'Salón de Té',
      '아이스크림': 'Heladería',
      '댄스학원': 'Academia de Danza',
      '음악학원': 'Academia de Música',
      '입시학원': 'Academia de Preparación',
      '외국어학원': 'Academia de Idiomas',
      '컴퓨터학원': 'Academia de Computación',
      '미술학원': 'Academia de Arte',
      '방과후교실': 'Programa Extraescolar'
    }
  }
};

// 현재 언어 상태
let currentShopDashLanguage = 'ko';

// 현재 언어 가져오기 - 개선된 버전
function getCurrentShopDashLanguage() {
  // 1. 네비게이션의 언어 설정 확인 (최우선)
  if (typeof window.getCurrentLanguage === 'function') {
    const navLang = window.getCurrentLanguage();
    if (navLang && SHOPDASH_LANGUAGE_TEXTS[navLang]) {
      return navLang;
    }
  }
  
  // 2. 표시되는 data-lang 요소 확인
  const visibleLangElement = document.querySelector('[data-lang]:not([style*="display: none"])');
  if (visibleLangElement) {
    const langCode = visibleLangElement.getAttribute('data-lang');
    const langMap = { 'KOR': 'ko', 'ENG': 'en', 'ESP': 'es' };
    const mappedLang = langMap[langCode];
    if (mappedLang && SHOPDASH_LANGUAGE_TEXTS[mappedLang]) {
      return mappedLang;
    }
  }
  
  // 3. localStorage에서 확인
  const saved = localStorage.getItem('preferred_language');
  if (saved && SHOPDASH_LANGUAGE_TEXTS[saved]) {
    return saved;
  }
  
  // 4. 기본값 반환
  return currentShopDashLanguage;
}

// 다국어 텍스트 가져오기
function getShopDashText(key) {
  const language = getCurrentShopDashLanguage();
  const texts = SHOPDASH_LANGUAGE_TEXTS[language] || SHOPDASH_LANGUAGE_TEXTS['ko'];
  return texts[key] || key;
}

// 업종명 번역 함수 (디버깅 강화)
function translateBusinessType(koreanBusinessType) {
  const language = getCurrentShopDashLanguage();
  const texts = SHOPDASH_LANGUAGE_TEXTS[language] || SHOPDASH_LANGUAGE_TEXTS['ko'];
  
  if (texts.businessTypes && texts.businessTypes[koreanBusinessType]) {
    const translated = texts.businessTypes[koreanBusinessType];
    console.log(`🔄 업종명 번역: "${koreanBusinessType}" → "${translated}" (${language})`);
    return translated;
  }
  
  console.warn(`⚠️ 번역 누락: "${koreanBusinessType}" (${language})`);
  return koreanBusinessType; // 번역이 없으면 원본 반환
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
  
  const previousLanguage = currentShopDashLanguage;
  currentShopDashLanguage = language;
  
  console.log(`🌍 ShopDash 언어가 변경되었습니다: ${previousLanguage} → ${language}`);
  
  // 차트들 다시 로드 (다국어 적용) - 약간의 지연을 두어 안정성 확보
  setTimeout(() => {
    if (typeof window.loadAllCharts === 'function') {
      console.log('🔄 언어 변경으로 인한 차트 재로드 시작...');
      window.loadAllCharts();
    } else {
      console.warn('⚠️ loadAllCharts 함수를 찾을 수 없습니다');
    }
  }, 300);
}

// 네비게이션 언어 변경 감지 - 전역 함수 후킹 방식
function observeShopDashLanguageChanges() {
  console.log('🔍 ShopDash 언어 변경 감지 시스템 초기화...');
  
  // 1. 전역 funcChangeLang 함수 후킹
  if (typeof window.funcChangeLang === 'function') {
    const originalFuncChangeLang = window.funcChangeLang;
    window.funcChangeLang = function(lang) {
      console.log('🌐 전역 언어 변경 감지:', lang);
      originalFuncChangeLang(lang);
      
      // 언어 코드 매핑
      const langMap = { 'KOR': 'ko', 'ENG': 'en', 'ESP': 'es' };
      const mappedLang = langMap[lang] || lang;
      
      if (mappedLang !== currentShopDashLanguage) {
        changeShopDashLanguage(mappedLang);
      }
    };
    console.log('✅ funcChangeLang 함수 후킹 완료');
  }
  
  // 2. 정기적으로 현재 언어 상태 확인 (백업 방식)
  let lastCheckedLanguage = currentShopDashLanguage;
  setInterval(() => {
    const currentLang = getCurrentShopDashLanguage();
    if (currentLang !== lastCheckedLanguage) {
      console.log('🔄 정기 검사에서 언어 변경 감지:', lastCheckedLanguage, '→', currentLang);
      lastCheckedLanguage = currentLang;
      if (currentLang !== currentShopDashLanguage) {
        changeShopDashLanguage(currentLang);
      }
    }
  }, 2000); // 2초마다 확인
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('📚 ShopDash 다국어화 시스템 초기화 시작...');
  
  // 초기 언어 설정
  currentShopDashLanguage = getCurrentShopDashLanguage();
  console.log('🌐 초기 언어 설정:', currentShopDashLanguage);
  
  // 약간의 지연 후 언어 변경 감지 시작 (DOM이 완전히 로드된 후)
  setTimeout(() => {
    observeShopDashLanguageChanges();
  }, 1000);
  
  console.log('✅ ShopDash 다국어화 초기화 완료:', currentShopDashLanguage);
  
  // 🚀 초기화 완료 이벤트 발생
  window.dispatchEvent(new CustomEvent('shopDashI18nReady', { 
    detail: { language: currentShopDashLanguage } 
  }));
});

// 🛠️ 개발자 테스트 함수 - 콘솔에서 차트 강제 재로드
function testChartTranslation() {
  console.log('🧪 차트 번역 테스트 시작...');
  console.log('현재 언어:', getCurrentShopDashLanguage());
  
  if (typeof window.loadAllCharts === 'function') {
    window.loadAllCharts();
    console.log('✅ 차트 재로드 완료');
  } else {
    console.error('❌ loadAllCharts 함수를 찾을 수 없습니다');
  }
}

// 업종명 번역 테스트 함수
function testBusinessTypeTranslations() {
  const testBusinessTypes = ['한식', '기타', '커피숍', '기타 휴게음식점', '호프/통닭', '경양식', '일식', '일반조리판매', '분식', '중국식'];
  const currentLang = getCurrentShopDashLanguage();
  
  console.log(`🧪 업종명 번역 테스트 (${currentLang}):`);
  testBusinessTypes.forEach(businessType => {
    const translated = translateBusinessType(businessType);
    console.log(`  "${businessType}" → "${translated}"`);
  });
}

// 전역 함수로 등록
window.getShopDashText = getShopDashText;
window.formatShopDashText = formatShopDashText;
window.translateBusinessType = translateBusinessType;
window.getCurrentShopDashLanguage = getCurrentShopDashLanguage;
window.getLocalizedTooltipText = getLocalizedTooltipText;
window.getLocalizedPopupTexts = getLocalizedPopupTexts;
window.changeShopDashLanguage = changeShopDashLanguage;
window.testChartTranslation = testChartTranslation;  // 🧪 테스트 함수
window.testBusinessTypeTranslations = testBusinessTypeTranslations;  // 🧪 테스트 함수 