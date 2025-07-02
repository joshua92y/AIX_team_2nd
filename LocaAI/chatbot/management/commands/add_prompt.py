from django.core.management.base import BaseCommand, CommandError
from chatbot.models import Prompt
import os


class Command(BaseCommand):
    help = '새로운 프롬프트를 데이터베이스에 추가합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            required=True,
            help='프롬프트 이름 (필수)',
        )
        parser.add_argument(
            '--scope',
            type=str,
            choices=['collection', 'user'],
            default='user',
            help='프롬프트 범위 (기본값: user)',
        )
        parser.add_argument(
            '--tag',
            type=str,
            default='',
            help='프롬프트 태그 (쉼표로 구분)',
        )
        parser.add_argument(
            '--content',
            type=str,
            help='프롬프트 내용 (직접 입력)',
        )
        parser.add_argument(
            '--file',
            type=str,
            help='프롬프트 내용을 파일에서 읽어오기',
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='동일한 이름의 프롬프트가 있으면 업데이트',
        )

    def handle(self, *args, **options):
        name = options['name']
        scope = options['scope']
        tag = options['tag']
        update_existing = options['update']
        
        # 기존 프롬프트 확인
        existing_prompt = Prompt.objects.filter(name=name).first()
        if existing_prompt and not update_existing:
            self.stdout.write(
                self.style.ERROR(f"❌ 프롬프트 '{name}'이 이미 존재합니다. --update 옵션을 사용하여 업데이트하세요.")
            )
            return
        
        # 프롬프트 내용 획득
        content = self.get_prompt_content(options)
        if not content:
            self.stdout.write(self.style.ERROR("❌ 프롬프트 내용이 비어있습니다."))
            return
        
        try:
            if existing_prompt:
                # 기존 프롬프트 업데이트
                existing_prompt.scope = scope
                existing_prompt.content = content
                existing_prompt.tag = tag
                existing_prompt.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f"✅ 프롬프트 '{name}' 업데이트 완료!")
                )
            else:
                # 새 프롬프트 생성
                prompt = Prompt.objects.create(
                    name=name,
                    scope=scope,
                    content=content,
                    tag=tag
                )
                
                self.stdout.write(
                    self.style.SUCCESS(f"✅ 새 프롬프트 '{name}' 생성 완료!")
                )
            
            # 프롬프트 정보 출력
            self.display_prompt_info(name, scope, tag, content)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ 프롬프트 저장 중 오류 발생: {str(e)}")
            )

    def get_prompt_content(self, options):
        """프롬프트 내용을 다양한 방법으로 획득"""
        
        # 1. 직접 입력된 내용
        if options['content']:
            return options['content']
        
        # 2. 파일에서 읽어오기
        if options['file']:
            if not os.path.exists(options['file']):
                self.stdout.write(
                    self.style.ERROR(f"❌ 파일 '{options['file']}'을 찾을 수 없습니다.")
                )
                return None
            
            try:
                with open(options['file'], 'r', encoding='utf-8') as f:
                    return f.read().strip()
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ 파일 읽기 오류: {str(e)}")
                )
                return None
        
        # 3. 모든 방법이 실패한 경우
        self.stdout.write(
            self.style.ERROR("❌ 프롬프트 내용을 가져올 수 없습니다. --content 또는 --file 옵션을 사용하세요.")
        )
        return None

    def display_prompt_info(self, name, scope, tag, content):
        """프롬프트 정보를 보기 좋게 출력"""
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("📋 프롬프트 정보")
        self.stdout.write("=" * 60)
        self.stdout.write(f"📝 이름: {name}")
        self.stdout.write(f"📂 범위: {scope}")
        if tag:
            tags = [f"#{t.strip()}" for t in tag.split(',')]
            self.stdout.write(f"🏷️  태그: {' '.join(tags)}")
        self.stdout.write(f"📄 내용 길이: {len(content)} 문자")
        self.stdout.write("-" * 60)
        
        # 내용 미리보기
        preview = content[:300] + "..." if len(content) > 300 else content
        self.stdout.write("📄 내용 미리보기:")
        self.stdout.write(preview)
        self.stdout.write("=" * 60)
        
        self.stdout.write("\n💡 Django Admin 페이지에서 프롬프트를 수정할 수 있습니다.")
        self.stdout.write("💡 python manage.py list_prompts 명령어로 모든 프롬프트를 확인할 수 있습니다.") 