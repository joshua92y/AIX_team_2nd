# AI_Analyzer/analyze.html 페이지 구조 및 스크립트 플로우

## 개요
이 페이지는 상권 분석 리스트와 상세 분석 결과를 제공하는 메인 화면입니다. Django 템플릿으로 작성되며, 프론트엔드의 모든 동작은 모듈화된 JS 구조로 관리됩니다.

## 주요 섹션
- 분석 리스트 섹션 (#analysisListSection): 사용자의 기존 상권 분석 내역을 카드 형태로 보여줌
- 분석 결과 상세 섹션 (#analysisResultsWrapper): 특정 분석을 선택하면 상세 결과 카드와 AI 챗봇 영역이 표시됨
- 상세 모달 (#analysisDetailModal): (추후 확장) 상세 분석 결과를 모달로 보여줄 수 있음

## 스크립트 플로우 (페이지 로드시)
1. USER_ID 전달: Django에서 로그인한 사용자의 ID를 전역 변수로 JS에 전달
2. 진입점 JS 로드: js/pages/analyze.js만 import (진입점 단일화)
3. 진입점: pages/analyze.js → registerAnalyzeEvents() 호출
4. 이벤트 바인딩: events/analyze_events.js에서 모든 UI 이벤트 바인딩 및 fetchAnalysisList() 호출
5. 로직 처리: logic/analyze_logic.js에서 상태(state) 객체로 데이터/페이지 관리, Ajax로 분석 리스트를 받아와 상태에 저장, renderCurrentPage()로 리스트 카드 렌더링, showAnalysisDetail(id)로 상세 데이터 Ajax 요청 및 렌더링
6. 렌더링: render/analyze_detail.js에서 상세 분석 결과 카드를 동적으로 생성하여 #analysisResults에 삽입

## 전체 플로우 요약
1. 페이지 로드
2. → pages/analyze.js → registerAnalyzeEvents()
3. → 이벤트 바인딩 및 fetchAnalysisList() 호출
4. → Ajax로 분석 리스트 데이터 수신 → 상태 저장
5. → renderCurrentPage()로 리스트 카드 렌더링
6. → "자세히 보기" 클릭 시 상세 데이터 Ajax 요청
7. → 성공 시 renderAnalysisDetail()로 상세 카드 동적 생성
8. → "목록으로 돌아가기" 클릭 시 리스트로 복귀

## 유지보수/확장 포인트
- 진입점, 이벤트, 로직, 렌더링이 명확히 분리되어 있어 각 역할별로 독립적 유지보수 가능
- 새로운 이벤트/로직/렌더링 추가 시 각 디렉토리 내에서만 작업하면 됨
- SSR(Django)와 CSR(JS) 구조가 자연스럽게 결합됨

## 참고
- 모든 주요 동작은 jQuery 기반으로 동작
- Ajax 통신은 Django REST API와 연동
- UI/UX 확장(챗봇, 모달 등)도 구조적으로 쉽게 추가 가능

이 문서는 /TemplateDocs에 마크다운으로 저장된 예시입니다.