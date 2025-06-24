// ===========================================
// AI Analyzer 데이터 관리 모듈
// ===========================================

// 업종 데이터 (38개 업종)
const businessTypes = [
  {id: 0, kor: "감성주점", eng: "Sentimental pub"},
  {id: 1, kor: "경양식", eng: "Western restaurant"},
  {id: 2, kor: "관광호텔", eng: "Tourist hotel"},
  {id: 3, kor: "극장", eng: "Theatre"},
  {id: 4, kor: "기타", eng: "Others"},
  {id: 5, kor: "기타 휴게음식점", eng: "Other refreshment food"},
  {id: 6, kor: "김밥(도시락)", eng: "Kimbap(lunchbox)"},
  {id: 7, kor: "까페", eng: "Cafe"},
  {id: 8, kor: "냉면집", eng: "Cold noodle restaurant"},
  {id: 9, kor: "다방", eng: "Teahouse"},
  {id: 10, kor: "떡카페", eng: "Rice cake cafe"},
  {id: 11, kor: "라이브카페", eng: "Live cafe"},
  {id: 12, kor: "백화점", eng: "Department store"},
  {id: 13, kor: "복어취급", eng: "Pufferfish handling"},
  {id: 14, kor: "분식", eng: "Snack bar"},
  {id: 15, kor: "뷔페식", eng: "Buffet"},
  {id: 16, kor: "식육(숯불구이)", eng: "Meat(charcoal grill)"},
  {id: 17, kor: "아이스크림", eng: "Ice cream"},
  {id: 18, kor: "외국음식전문점(인도, 태국 등)", eng: "Foreign food specialty(Indian, Thai, etc.)"},
  {id: 19, kor: "유원지", eng: "Amusement park"},
  {id: 20, kor: "일반조리판매", eng: "General cooking sales"},
  {id: 21, kor: "일식", eng: "Japanese food"},
  {id: 22, kor: "전통찻집", eng: "Traditional tea house"},
  {id: 23, kor: "정종/대포집/소주방", eng: "Rice wine/draft beer/soju bar"},
  {id: 24, kor: "중국식", eng: "Chinese food"},
  {id: 25, kor: "철도역구내", eng: "Railway station"},
  {id: 26, kor: "출장조리", eng: "Catering"},
  {id: 27, kor: "커피숍", eng: "Coffee shop"},
  {id: 28, kor: "키즈카페", eng: "Kids cafe"},
  {id: 29, kor: "탕류(보신용)", eng: "Soup(health food)"},
  {id: 30, kor: "통닭(치킨)", eng: "Whole chicken(fried chicken)"},
  {id: 31, kor: "패밀리레스토랑", eng: "Family restaurant"},
  {id: 32, kor: "패스트푸드", eng: "Fast food"},
  {id: 33, kor: "편의점", eng: "Convenience store"},
  {id: 34, kor: "푸드트럭", eng: "Food truck"},
  {id: 35, kor: "한식", eng: "Korean food"},
  {id: 36, kor: "호프/통닭", eng: "Beer/chicken pub"},
  {id: 37, kor: "횟집", eng: "Raw fish restaurant"}
];

// 다국어 텍스트
const i18nTexts = {
  placeholders: {
    selectIndustry: {kor: "업종을 선택해주세요", eng: "Please select an industry"},
    enterAddress: {kor: "주소를 입력해주세요", eng: "Please enter your address"}
  },
  buttons: {
    search: {kor: "검색", eng: "Search"},
    analyze: {kor: "상권 분석하기", eng: "Analyze Commercial Area"},
    savePDF: {kor: "PDF로 저장", eng: "Save as PDF"}
  },
  options: {
    choose: {kor: "선택", eng: "Choose"},
    yes: {kor: "판매함", eng: "Yes"},
    no: {kor: "판매 안함", eng: "No"}
  }
};

// 현재 언어 (기본: 한국어)
let currentLanguage = 'kor';

// 업종 이름 가져오기
function getBusinessTypeName(id, lang = 'kor') {
  const businessType = businessTypes.find(type => type.id == id);
  return businessType ? businessType[lang] : `업종 ${id}`;
}

// 업종 select 옵션 생성
function generateBusinessOptions() {
  let options = '<option selected disabled>업종을 선택해주세요</option>';
  businessTypes.forEach(type => {
    options += `<option value="${type.id}">${type.kor}</option>`;
  });
  return options;
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
window.initializeBusinessSelect = initializeBusinessSelect;

// DOM 로드 시 자동 초기화
document.addEventListener('DOMContentLoaded', initializeBusinessSelect);
