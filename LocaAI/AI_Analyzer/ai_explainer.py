# AI_Analyzer/ai_explainer.py
# XGBoost 모델 결과 설명을 위한 ChatGPT API 연동

import os
from openai import OpenAI
import json
from typing import Dict, Any


def get_xgboost_explanation(features_dict: Dict[str, Any], survival_percentage: float) -> str:
    """
    XGBoost 모델의 예측 결과를 ChatGPT를 통해 설명
    
    Args:
        features_dict: XGBoost 모델에 입력된 28개 피쳐 딕셔너리
        survival_percentage: 모델이 예측한 생존 확률(%)
    
    Returns:
        str: ChatGPT가 생성한 설명 텍스트
    """
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # 피쳐 정보를 분석하기 쉽게 정리
        feature_summary = format_features_for_analysis(features_dict)
        
        prompt = f"""
당신은 상권분석 전문가입니다. XGBoost 모델이 예측한 음식점 생존 확률 결과를 해석해서 설명해주세요.

**매우 중요한 제약사항:**
1. 생존 확률은 반드시 {survival_percentage}%로 고정하여 사용하세요. 절대 다른 숫자를 만들어내지 마세요.
2. 첫 번째 줄은 반드시 50자 이내로 핵심 결론을 요약해주세요.

예측 결과: **{survival_percentage}%** (이 수치를 정확히 사용하세요)
입력 데이터:
{feature_summary}

다음 형식으로 답변해주세요:

1. 첫 번째 줄 (50자 이내): {survival_percentage}%를 포함한 핵심 결론 요약
2. 주요 긍정 요인 (3-4개)
3. 주요 위험 요인 (3-4개) 
4. 개선 제안사항 (2-3개)
5. 종합 의견

반드시 {survival_percentage}% 수치를 정확히 사용하고, 구체적인 데이터를 인용하여 설명해주세요.
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "당신은 상권분석과 창업 컨설팅 전문가입니다."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"❌ ChatGPT API 호출 중 오류: {e}")
        return f"생존 확률 {survival_percentage}%로 예측되었습니다.\n\n상세한 분석을 위해 잠시 후 다시 시도해주세요."


def format_features_for_analysis(features_dict: Dict[str, Any]) -> str:
    """
    XGBoost 피쳐들을 ChatGPT가 이해하기 쉽게 포매팅
    """
    try:
        formatted_lines = []
        
        # 기본 정보
        formatted_lines.append(f"• 매장 면적: {features_dict.get('Area', 0)}㎡")
        formatted_lines.append(f"• 서비스 유형: {'일반음식점' if features_dict.get('Service', 0) == 1 else '휴게음식점'}")
        formatted_lines.append(f"• 토지 가치: {features_dict.get('Total_LV', 0):,.0f}원")
        
        # 인구 분석
        formatted_lines.append(f"\n[인구 현황]")
        formatted_lines.append(f"• 300m 생활인구: {features_dict.get('1A_Total', 0):,}명")
        formatted_lines.append(f"• 300m 직장인구: {features_dict.get('Working_Pop', 0):,}명")
        formatted_lines.append(f"• 300m 주요 연령대: 20대 {features_dict.get('1A_20', 0):.1f}%, 30대 {features_dict.get('1A_30', 0):.1f}%, 40대 {features_dict.get('1A_40', 0):.1f}%")
        
        # 경쟁 현황
        formatted_lines.append(f"\n[경쟁 현황]")
        formatted_lines.append(f"• 동일업종 경쟁업체: {features_dict.get('Competitor_C', 0)}개")
        formatted_lines.append(f"• 전체 요식업체: {features_dict.get('Adjacent_BIZ', 0)}개")
        formatted_lines.append(f"• 경쟁업체 비율: {features_dict.get('Competitor_R', 0):.1f}%")
        formatted_lines.append(f"• 업종 다양성: {features_dict.get('Business_D', 0)}개 업종")
        
        # 주변 시설
        formatted_lines.append(f"\n[주변 시설]")
        formatted_lines.append(f"• 학교 수: {features_dict.get('School', 0)}개")
        formatted_lines.append(f"• 공공기관: {features_dict.get('PubBuilding', 0)}개")
        
        # 외국인 현황
        formatted_lines.append(f"\n[외국인 현황]")
        formatted_lines.append(f"• 300m 장기체류 외국인: {features_dict.get('1A_Long_Total', 0):,}명")
        formatted_lines.append(f"• 1000m 단기체류 외국인: {features_dict.get('2A_Temp_Total', 0):,}명")
        
        return "\n".join(formatted_lines)
        
    except Exception as e:
        print(f"❌ 피쳐 포매팅 중 오류: {e}")
        return "피쳐 데이터 분석 중 오류가 발생했습니다."


def extract_summary_line(explanation_text: str) -> str:
    """
    ChatGPT 응답에서 첫 번째 줄(요약)만 추출
    """
    try:
        lines = explanation_text.strip().split('\n')
        if lines:
            summary = lines[0].strip()
            # 숫자나 특수문자로 시작하는 경우 제거
            if summary.startswith(('1.', '2.', '3.', '•', '-', '*')):
                summary = summary[2:].strip()
            return summary[:50] + "..." if len(summary) > 50 else summary
        return "분석 결과를 확인해주세요."
    except:
        return "분석 결과를 확인해주세요." 