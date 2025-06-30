// ===========================================
// AI Analyzer 데이터 관리 모듈
// ===========================================

// 업종 데이터 (38개 업종)
const businessTypes = [
  {id: 0, kor: "감성주점", eng: "Sentimental pub", esp: "Pub sentimental"},
  {id: 1, kor: "경양식", eng: "Western restaurant", esp: "Restaurante occidental"},
  {id: 2, kor: "관광호텔", eng: "Tourist hotel", esp: "Hotel turístico"},
  {id: 3, kor: "극장", eng: "Theatre", esp: "Teatro"},
  {id: 4, kor: "기타", eng: "Others", esp: "Otros"},
  {id: 5, kor: "기타 휴게음식점", eng: "Other refreshment food", esp: "Otra comida de refrigerio"},
  {id: 6, kor: "김밥(도시락)", eng: "Kimbap(lunchbox)", esp: "Kimbap(fiambrera)"},
  {id: 7, kor: "까페", eng: "Cafe", esp: "Café"},
  {id: 8, kor: "냉면집", eng: "Cold noodle restaurant", esp: "Restaurante de fideos fríos"},
  {id: 9, kor: "다방", eng: "Teahouse", esp: "Casa de té"},
  {id: 10, kor: "떡카페", eng: "Rice cake cafe", esp: "Café de pasteles de arroz"},
  {id: 11, kor: "라이브카페", eng: "Live cafe", esp: "Café en vivo"},
  {id: 12, kor: "백화점", eng: "Department store", esp: "Grandes almacenes"},
  {id: 13, kor: "복어취급", eng: "Pufferfish handling", esp: "Manejo de pez globo"},
  {id: 14, kor: "분식", eng: "Snack bar", esp: "Bar de aperitivos"},
  {id: 15, kor: "뷔페식", eng: "Buffet", esp: "Buffet"},
  {id: 16, kor: "식육(숯불구이)", eng: "Meat(charcoal grill)", esp: "Carne(parrilla de carbón)"},
  {id: 17, kor: "아이스크림", eng: "Ice cream", esp: "Helado"},
  {id: 18, kor: "외국음식전문점(인도, 태국 등)", eng: "Foreign food specialty(Indian, Thai, etc.)", esp: "Especialidad de comida extranjera(India, Tailandia, etc.)"},
  {id: 19, kor: "유원지", eng: "Amusement park", esp: "Parque de diversiones"},
  {id: 20, kor: "일반조리판매", eng: "General cooking sales", esp: "Ventas de cocina general"},
  {id: 21, kor: "일식", eng: "Japanese food", esp: "Comida japonesa"},
  {id: 22, kor: "전통찻집", eng: "Traditional tea house", esp: "Casa de té tradicional"},
  {id: 23, kor: "정종/대포집/소주방", eng: "Rice wine/draft beer/soju bar", esp: "Vino de arroz/cerveza de barril/bar de soju"},
  {id: 24, kor: "중국식", eng: "Chinese food", esp: "Comida china"},
  {id: 25, kor: "철도역구내", eng: "Railway station", esp: "Estación de ferrocarril"},
  {id: 26, kor: "출장조리", eng: "Catering", esp: "Catering"},
  {id: 27, kor: "커피숍", eng: "Coffee shop", esp: "Cafetería"},
  {id: 28, kor: "키즈카페", eng: "Kids cafe", esp: "Café para niños"},
  {id: 29, kor: "탕류(보신용)", eng: "Soup(health food)", esp: "Sopa(comida saludable)"},
  {id: 30, kor: "통닭(치킨)", eng: "Whole chicken(fried chicken)", esp: "Pollo entero(pollo frito)"},
  {id: 31, kor: "패밀리레스토랑", eng: "Family restaurant", esp: "Restaurante familiar"},
  {id: 32, kor: "패스트푸드", eng: "Fast food", esp: "Comida rápida"},
  {id: 33, kor: "편의점", eng: "Convenience store", esp: "Tienda de conveniencia"},
  {id: 34, kor: "푸드트럭", eng: "Food truck", esp: "Camión de comida"},
  {id: 35, kor: "한식", eng: "Korean food", esp: "Comida coreana"},
  {id: 36, kor: "호프/통닭", eng: "Beer/chicken pub", esp: "Pub de cerveza/pollo"},
  {id: 37, kor: "횟집", eng: "Raw fish restaurant", esp: "Restaurante de pescado crudo"}
];

// 다국어 텍스트
const i18nTexts = {
  placeholders: {
    selectIndustry: {kor: "업종을 선택해주세요", eng: "Please select an industry", esp: "Por favor seleccione un tipo de negocio"},
    enterAddress: {kor: "주소를 입력해주세요", eng: "Please enter your address", esp: "Por favor ingrese su dirección"}
  },
  buttons: {
    search: {kor: "검색", eng: "Search", esp: "Buscar"},
    analyze: {kor: "상권 분석하기", eng: "Analyze Commercial Area", esp: "Analizar Área Comercial"},
    savePDF: {kor: "PDF로 저장", eng: "Save as PDF", esp: "Guardar como PDF"}
  },
  options: {
    choose: {kor: "선택", eng: "Choose", esp: "Seleccionar"},
    yes: {kor: "판매함", eng: "Yes", esp: "Sí"},
    no: {kor: "판매 안함", eng: "No", esp: "No"}
  }
};

// 현재 언어는 analyze-i18n.js에서 관리

// 업종 이름 가져오기
function getBusinessTypeName(id, lang = 'kor') {
  const businessType = businessTypes.find(type => type.id == id);
  return businessType ? businessType[lang] : `업종 ${id}`;
}

// 업종 select 옵션 생성 (언어별)
function generateBusinessOptions(lang = 'kor') {
  let placeholder = i18nTexts.placeholders.selectIndustry[lang] || i18nTexts.placeholders.selectIndustry.kor;
  let options = `<option selected disabled>${placeholder}</option>`;
  businessTypes.forEach(type => {
    const name = type[lang] || type.kor;
    options += `<option value="${type.id}">${name}</option>`;
  });
  return options;
}

// 업종 선택 드롭다운 업데이트
function updateBusinessSelect(lang = 'kor') {
  const businessSelect = document.getElementById('business_type_id');
  if (businessSelect) {
    const currentValue = businessSelect.value;
    businessSelect.innerHTML = generateBusinessOptions(lang);
    if (currentValue && currentValue !== '') {
      businessSelect.value = currentValue;
    }
  }
}

// 페이지 로드 시 업종 옵션 생성
function initializeBusinessSelect() {
  const businessSelect = document.getElementById('business_type_id');
  if (businessSelect) {
    businessSelect.innerHTML = generateBusinessOptions();
  }
}

// 전역 함수 노출
window.businessTypes = businessTypes;
window.getBusinessTypeName = getBusinessTypeName;
window.generateBusinessOptions = generateBusinessOptions;
window.updateBusinessSelect = updateBusinessSelect;
window.initializeBusinessSelect = initializeBusinessSelect;
window.i18nTexts = i18nTexts;

// DOM 로드 시 자동 초기화는 analyze-i18n.js에서 처리
// document.addEventListener('DOMContentLoaded', initializeBusinessSelect);
