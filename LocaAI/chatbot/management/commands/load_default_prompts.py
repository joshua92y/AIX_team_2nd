from django.core.management.base import BaseCommand
from chatbot.models import Prompt


class Command(BaseCommand):
    help = '하드코딩된 기본 프롬프트들을 데이터베이스에 저장합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--update',
            action='store_true',
            help='기존 프롬프트가 있으면 업데이트합니다.',
        )

    def handle(self, *args, **options):
        update_existing = options['update']
        
        # 기본 프롬프트 데이터 정의
        default_prompts = [
            # RAG 응답 조합 프롬프트들
            {
                'name': 'rag_combine_answers_ko',
                'scope': 'collection',
                'content': """다음은 여러 출처의 답변입니다:

{answers}

위의 여러 답변들을 종합하여 사용자에게 도움이 되는 최종 요약된 답변을 작성해 주세요. 각 출처의 핵심 정보를 통합하고, 일관성 있고 명확한 답변을 제공해 주세요.""",
                'tag': 'rag,combine,korean'
            },
            {
                'name': 'rag_combine_answers_en',
                'scope': 'collection',
                'content': """Based on the following multiple sources:

{answers}

Please synthesize the above answers to provide a final, comprehensive summary that will be helpful to the user. Integrate key information from each source and provide a consistent and clear response.""",
                'tag': 'rag,combine,english'
            },
            {
                'name': 'rag_combine_answers_es',
                'scope': 'collection',
                'content': """Basado en las siguientes fuentes múltiples:

{answers}

Por favor, sintetiza las respuestas anteriores para proporcionar un resumen final y completo que sea útil para el usuario. Integra la información clave de cada fuente y proporciona una respuesta consistente y clara.""",
                'tag': 'rag,combine,spanish'
            },
            
            # LLM 상담 프롬프트들
            {
                'name': 'llm_consultation',
                'scope': 'user',
                'content': """당신은 상권 분석 및 창업 상담 전문 AI입니다. 사용자가 제공한 정보와 질문을 바탕으로 전문적인 상담을 제공해주세요.

## 역할
- 상권 분석 전문가
- 창업 및 사업 운영 컨설턴트
- 실용적이고 구체적인 조언 제공자

## 답변 원칙
1. 전문적이고 실용적인 조언 제공
2. 구체적인 데이터나 수치가 없더라도 일반적인 업계 지식과 경험을 바탕으로 답변
3. 사용자의 상황을 고려한 맞춤형 조언
4. 가능한 위험 요소나 주의사항도 함께 안내
5. 추가적인 정보 수집이나 전문가 상담이 필요한 경우 안내

질문: {question}

대화 히스토리:
{chat_history}

위 내용을 바탕으로 상권 분석, 창업, 사업 운영에 대한 전문적이고 실용적인 조언을 제공해 주세요.""",
                'tag': 'llm,consultation,korean,business'
            },
            {
                'name': 'llm_consultation_en',
                'scope': 'user',
                'content': """You are a professional AI consultant specializing in commercial area analysis and business consulting. Please provide expert consultation based on the information and questions provided by the user.

## Role
- Commercial area analysis expert
- Business startup and operations consultant
- Provider of practical and specific advice

## Response Principles
1. Provide professional and practical advice
2. Give helpful answers based on general industry knowledge and experience, even without specific data or figures
3. Provide customized advice considering the user's situation
4. Also guide potential risk factors or precautions
5. Guide when additional information gathering or professional consultation is needed

Question: {question}

Chat History:
{chat_history}

Based on the above content, please provide professional and practical advice on commercial area analysis, business startup, and business operations.""",
                'tag': 'llm,consultation,english,business'
            },
            {
                'name': 'llm_consultation_es',
                'scope': 'user',
                'content': """Eres un consultor de IA profesional especializado en análisis de áreas comerciales y consultoría empresarial. Proporciona consultoría experta basada en la información y preguntas proporcionadas por el usuario.

## Rol
- Experto en análisis de áreas comerciales
- Consultor de inicio de negocios y operaciones
- Proveedor de consejos prácticos y específicos

## Principios de Respuesta
1. Proporcionar consejos profesionales y prácticos
2. Dar respuestas útiles basadas en conocimiento general de la industria y experiencia, incluso sin datos o cifras específicas
3. Proporcionar consejos personalizados considerando la situación del usuario
4. También guiar sobre factores de riesgo potenciales o precauciones
5. Orientar cuando se necesite recopilación de información adicional o consulta profesional

Pregunta: {question}

Historial de chat:
{chat_history}

Basado en el contenido anterior, proporciona consejos profesionales y prácticos sobre análisis de áreas comerciales, creación de empresas y operaciones comerciales.""",
                'tag': 'llm,consultation,spanish,business'
            },
        ]

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for prompt_data in default_prompts:
            try:
                prompt, created = Prompt.objects.get_or_create(
                    name=prompt_data['name'],
                    defaults={
                        'scope': prompt_data['scope'],
                        'content': prompt_data['content'],
                        'tag': prompt_data['tag']
                    }
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"✅ 새 프롬프트 생성: {prompt_data['name']}")
                    )
                elif update_existing:
                    # 기존 프롬프트 업데이트
                    prompt.scope = prompt_data['scope']
                    prompt.content = prompt_data['content']
                    prompt.tag = prompt_data['tag']
                    prompt.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f"🔄 기존 프롬프트 업데이트: {prompt_data['name']}")
                    )
                else:
                    skipped_count += 1
                    self.stdout.write(
                        self.style.HTTP_INFO(f"⏭️  이미 존재하는 프롬프트 건너뜀: {prompt_data['name']}")
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ 프롬프트 '{prompt_data['name']}' 처리 중 오류: {str(e)}")
                )

        # 결과 요약
        self.stdout.write("\n" + "="*50)
        self.stdout.write(self.style.SUCCESS(f"📊 작업 완료 요약:"))
        self.stdout.write(f"  • 새로 생성된 프롬프트: {created_count}개")
        self.stdout.write(f"  • 업데이트된 프롬프트: {updated_count}개")
        self.stdout.write(f"  • 건너뛴 프롬프트: {skipped_count}개")
        self.stdout.write("="*50)
        
        if created_count > 0 or updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\n🎉 총 {created_count + updated_count}개의 프롬프트가 데이터베이스에 저장되었습니다!"
                )
            )
            self.stdout.write("💡 Django Admin 페이지에서 프롬프트를 관리할 수 있습니다.")
        else:
            self.stdout.write(
                self.style.HTTP_INFO(
                    "\n💡 모든 기본 프롬프트가 이미 존재합니다. --update 옵션을 사용하여 업데이트할 수 있습니다."
                )
            ) 