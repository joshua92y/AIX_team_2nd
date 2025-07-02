from django.core.management.base import BaseCommand
from chatbot.models import Prompt
from django.utils import timezone


class Command(BaseCommand):
    help = 'DB에 저장된 프롬프트들을 조회하고 관리합니다.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--name',
            type=str,
            help='특정 프롬프트 이름으로 필터링',
        )
        parser.add_argument(
            '--scope',
            type=str,
            choices=['collection', 'user'],
            help='범위로 필터링 (collection 또는 user)',
        )
        parser.add_argument(
            '--tag',
            type=str,
            help='태그로 필터링',
        )
        parser.add_argument(
            '--show-content',
            action='store_true',
            help='프롬프트 내용도 함께 표시',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='프롬프트들을 JSON 파일로 내보내기 (파일 경로 지정)',
        )

    def handle(self, *args, **options):
        # 필터링 조건 적용
        queryset = Prompt.objects.all()
        
        if options['name']:
            queryset = queryset.filter(name__icontains=options['name'])
        
        if options['scope']:
            queryset = queryset.filter(scope=options['scope'])
        
        if options['tag']:
            queryset = queryset.filter(tag__icontains=options['tag'])
        
        prompts = queryset.order_by('scope', 'name')
        
        if not prompts:
            self.stdout.write(self.style.WARNING("❌ 조건에 맞는 프롬프트가 없습니다."))
            return

        # 내보내기 기능
        if options['export']:
            self.export_prompts(prompts, options['export'])
            return

        # 프롬프트 목록 표시
        self.stdout.write(f"\n🔍 총 {prompts.count()}개의 프롬프트를 찾았습니다:")
        self.stdout.write("=" * 80)
        
        current_scope = None
        for prompt in prompts:
            # 스코프별 구분
            if current_scope != prompt.scope:
                current_scope = prompt.scope
                scope_display = "📂 컬렉션" if prompt.scope == "collection" else "👤 사용자"
                self.stdout.write(f"\n{scope_display} ({prompt.scope})")
                self.stdout.write("-" * 40)
            
            # 프롬프트 기본 정보
            self.stdout.write(f"📝 {prompt.name}")
            if prompt.tag:
                tags = [tag.strip() for tag in prompt.tag.split(',')]
                tag_display = " ".join([f"#{tag}" for tag in tags])
                self.stdout.write(f"   🏷️  {tag_display}")
            
            # 내용 표시 (옵션)
            if options['show_content']:
                content_preview = prompt.content[:200] + "..." if len(prompt.content) > 200 else prompt.content
                self.stdout.write(f"   📄 {content_preview}")
                self.stdout.write("")
        
        self.stdout.write("=" * 80)
        
        # 사용 가능한 프롬프트 이름들 요약
        collection_prompts = [p.name for p in prompts if p.scope == 'collection']
        user_prompts = [p.name for p in prompts if p.scope == 'user']
        
        if collection_prompts:
            self.stdout.write("\n📂 컬렉션 프롬프트들:")
            for name in collection_prompts:
                self.stdout.write(f"   • {name}")
        
        if user_prompts:
            self.stdout.write("\n👤 사용자 프롬프트들:")
            for name in user_prompts:
                self.stdout.write(f"   • {name}")
        
        self.stdout.write(f"\n💡 팁: --show-content 옵션으로 프롬프트 내용을 확인할 수 있습니다.")
        self.stdout.write(f"💡 팁: --export 옵션으로 프롬프트들을 JSON 파일로 내보낼 수 있습니다.")

    def export_prompts(self, prompts, file_path):
        import json
        
        data = []
        for prompt in prompts:
            data.append({
                'name': prompt.name,
                'scope': prompt.scope,
                'content': prompt.content,
                'tag': prompt.tag,
                'exported_at': timezone.now().isoformat()
            })
        
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            self.stdout.write(
                self.style.SUCCESS(f"✅ {len(data)}개의 프롬프트를 '{file_path}'로 내보냈습니다.")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ 내보내기 실패: {str(e)}")
            ) 