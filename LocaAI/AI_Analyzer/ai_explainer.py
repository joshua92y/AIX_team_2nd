# AI_Analyzer/ai_explainer.py
# XGBoost 모델 결과 설명을 위한 ChatGPT API 연동

import os
from openai import OpenAI
import json
from typing import Dict, Any
from django.utils.translation import get_language


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
        
        # 현재 언어 감지
        current_language = get_language()
        print(f"🌍 감지된 언어: {current_language}")
        
        # 언어 코드 매핑 (Django의 언어 코드를 우리 시스템에 맞게 변환)
        language_mapping = {
            'ko': 'ko',
            'ko-kr': 'ko', 
            'en': 'en',
            'en-us': 'en',
            'es': 'es',
            'es-es': 'es'
        }
        mapped_language = language_mapping.get(current_language.lower(), 'ko')
        print(f"🔄 매핑된 언어: {current_language} -> {mapped_language}")
        
        # 피쳐 정보를 분석하기 쉽게 정리
        feature_summary = format_features_for_analysis(features_dict, mapped_language)
        
        # 언어별 프롬프트 설정
        prompt = get_analysis_prompt(mapped_language, survival_percentage, feature_summary)

        # 언어별 시스템 메시지 설정
        system_messages = {
            'ko': "당신은 상권분석과 창업 컨설팅 전문가입니다.",
            'en': "You are a commercial area analysis and startup consulting expert.",
            'es': "Eres un experto en análisis de zonas comerciales y consultoría de startups."
        }
        
        system_message = system_messages.get(mapped_language, system_messages['ko'])

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"❌ ChatGPT API 호출 중 오류: {e}")
        
        # 언어별 오류 메시지
        error_messages = {
            'ko': f"생존 확률 {survival_percentage}%로 예측되었습니다.\n\n상세한 분석을 위해 잠시 후 다시 시도해주세요.",
            'en': f"Survival probability predicted as {survival_percentage}%.\n\nPlease try again later for detailed analysis.",
            'es': f"Probabilidad de supervivencia predicha como {survival_percentage}%.\n\nPor favor, inténtelo de nuevo más tarde para un análisis detallado."
        }
        
        # 현재 언어 다시 감지 (오류 발생 시를 위해)
        try:
            current_language = get_language()
            language_mapping = {
                'ko': 'ko', 'ko-kr': 'ko', 
                'en': 'en', 'en-us': 'en',
                'es': 'es', 'es-es': 'es'
            }
            mapped_language = language_mapping.get(current_language.lower(), 'ko')
        except:
            mapped_language = 'ko'
            
        return error_messages.get(mapped_language, error_messages['ko'])


def get_analysis_prompt(language: str, survival_percentage: float, feature_summary: str) -> str:
    """
    언어별 분석 프롬프트 생성
    """
    if language == 'en':
        return f"""
You are a commercial area analysis expert. Please interpret and explain the restaurant survival probability results predicted by the XGBoost model.

**Very Important Constraints:**
1. You must use the survival probability as exactly {survival_percentage}%. Never create different numbers.
2. The first line must summarize the key conclusion within 50 characters.

Prediction Result: **{survival_percentage}%** (Use this number exactly)
Input Data:
{feature_summary}

Please answer in the following format:

1. First line (within 50 characters): Key conclusion summary including {survival_percentage}%
2. Main positive factors (3-4 items)
3. Main risk factors (3-4 items)
4. Improvement suggestions (2-3 items)
5. Overall opinion

Please use the {survival_percentage}% figure exactly and explain by citing specific data.
"""
    elif language == 'es':
        return f"""
Eres un experto en análisis de zonas comerciales. Por favor, interpreta y explica los resultados de probabilidad de supervivencia de restaurantes predichos por el modelo XGBoost.

**Restricciones Muy Importantes:**
1. Debes usar la probabilidad de supervivencia exactamente como {survival_percentage}%. Nunca crees números diferentes.
2. La primera línea debe resumir la conclusión clave en menos de 50 caracteres.

Resultado de Predicción: **{survival_percentage}%** (Usa este número exactamente)
Datos de Entrada:
{feature_summary}

Por favor responde en el siguiente formato:

1. Primera línea (menos de 50 caracteres): Resumen de conclusión clave incluyendo {survival_percentage}%
2. Principales factores positivos (3-4 elementos)
3. Principales factores de riesgo (3-4 elementos)
4. Sugerencias de mejora (2-3 elementos)
5. Opinión general

Por favor usa la cifra {survival_percentage}% exactamente y explica citando datos específicos.
"""
    else:  # Korean (default)
        return f"""
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


def format_features_for_analysis(features_dict: Dict[str, Any], language: str = 'ko') -> str:
    """
    XGBoost 피쳐들을 ChatGPT가 이해하기 쉽게 포매팅 (다국어 지원)
    """
    try:
        formatted_lines = []
        
        if language == 'en':
            # Basic Information
            formatted_lines.append(f"• Store Area: {features_dict.get('Area', 0)}㎡")
            formatted_lines.append(f"• Service Type: {'General Restaurant' if features_dict.get('Service', 0) == 1 else 'Snack Bar'}")
            formatted_lines.append(f"• Land Value: {features_dict.get('Total_LV', 0):,.0f} KRW")
            
            # Population Analysis
            formatted_lines.append(f"\n[Population Status]")
            formatted_lines.append(f"• 300m Resident Population: {features_dict.get('1A_Total', 0):,} people")
            formatted_lines.append(f"• 300m Working Population: {features_dict.get('Working_Pop', 0):,} people")
            formatted_lines.append(f"• 300m Main Age Groups: 20s {features_dict.get('1A_20', 0):.1f}%, 30s {features_dict.get('1A_30', 0):.1f}%, 40s {features_dict.get('1A_40', 0):.1f}%")
            
            # Competition Status
            formatted_lines.append(f"\n[Competition Status]")
            formatted_lines.append(f"• Same Industry Competitors: {features_dict.get('Competitor_C', 0)} stores")
            formatted_lines.append(f"• Total Food Businesses: {features_dict.get('Adjacent_BIZ', 0)} stores")
            formatted_lines.append(f"• Competitor Ratio: {features_dict.get('Competitor_R', 0):.1f}%")
            formatted_lines.append(f"• Business Diversity: {features_dict.get('Business_D', 0)} business types")
            
            # Surrounding Facilities
            formatted_lines.append(f"\n[Surrounding Facilities]")
            formatted_lines.append(f"• Number of Schools: {features_dict.get('School', 0)}")
            formatted_lines.append(f"• Public Buildings: {features_dict.get('PubBuilding', 0)}")
            
            # Foreign Population
            formatted_lines.append(f"\n[Foreign Population]")
            formatted_lines.append(f"• 300m Long-term Foreign Residents: {features_dict.get('1A_Long_Total', 0):,} people")
            formatted_lines.append(f"• 1000m Short-term Foreign Visitors: {features_dict.get('2A_Temp_Total', 0):,} people")
            
        elif language == 'es':
            # Información Básica
            formatted_lines.append(f"• Área de la Tienda: {features_dict.get('Area', 0)}㎡")
            formatted_lines.append(f"• Tipo de Servicio: {'Restaurante General' if features_dict.get('Service', 0) == 1 else 'Bar de Snacks'}")
            formatted_lines.append(f"• Valor del Terreno: {features_dict.get('Total_LV', 0):,.0f} KRW")
            
            # Análisis de Población
            formatted_lines.append(f"\n[Estado de la Población]")
            formatted_lines.append(f"• Población Residente 300m: {features_dict.get('1A_Total', 0):,} personas")
            formatted_lines.append(f"• Población Trabajadora 300m: {features_dict.get('Working_Pop', 0):,} personas")
            formatted_lines.append(f"• Grupos de Edad Principales 300m: 20s {features_dict.get('1A_20', 0):.1f}%, 30s {features_dict.get('1A_30', 0):.1f}%, 40s {features_dict.get('1A_40', 0):.1f}%")
            
            # Estado de la Competencia
            formatted_lines.append(f"\n[Estado de la Competencia]")
            formatted_lines.append(f"• Competidores de la Misma Industria: {features_dict.get('Competitor_C', 0)} tiendas")
            formatted_lines.append(f"• Total de Negocios de Comida: {features_dict.get('Adjacent_BIZ', 0)} tiendas")
            formatted_lines.append(f"• Ratio de Competidores: {features_dict.get('Competitor_R', 0):.1f}%")
            formatted_lines.append(f"• Diversidad de Negocios: {features_dict.get('Business_D', 0)} tipos de negocio")
            
            # Instalaciones Circundantes
            formatted_lines.append(f"\n[Instalaciones Circundantes]")
            formatted_lines.append(f"• Número de Escuelas: {features_dict.get('School', 0)}")
            formatted_lines.append(f"• Edificios Públicos: {features_dict.get('PubBuilding', 0)}")
            
            # Población Extranjera
            formatted_lines.append(f"\n[Población Extranjera]")
            formatted_lines.append(f"• Residentes Extranjeros de Largo Plazo 300m: {features_dict.get('1A_Long_Total', 0):,} personas")
            formatted_lines.append(f"• Visitantes Extranjeros de Corto Plazo 1000m: {features_dict.get('2A_Temp_Total', 0):,} personas")
            
        else:  # Korean (default)
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
        error_messages = {
            'en': "An error occurred while analyzing feature data.",
            'es': "Ocurrió un error al analizar los datos de características.",
            'ko': "피쳐 데이터 분석 중 오류가 발생했습니다."
        }
        print(f"❌ 피쳐 포매팅 중 오류: {e}")
        return error_messages.get(language, error_messages['ko'])


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