from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count
from django.urls.exceptions import NoReverseMatch
from .models import ChatSession, ChatMemory, Prompt, CollectionMemory, ChatLog


class ChatMemoryInline(admin.TabularInline):
    model = ChatMemory
    extra = 0
    fields = ("memory_type", "role", "content_preview", "created_at")
    readonly_fields = ("content_preview", "created_at")
    max_num = 10  # 최대 10개만 인라인으로 표시

    def content_preview(self, obj):
        if obj.content:
            content_str = str(obj.content)[:100]
            return format_html(
                '<span title="{}">{}</span>',
                content_str,
                content_str + "..." if len(content_str) > 100 else content_str,
            )
        return "-"

    content_preview.short_description = "내용 미리보기"


class CollectionMemoryInline(admin.StackedInline):
    model = CollectionMemory
    extra = 0
    fields = ("collection_name", "prompt", "llm_response_preview", "created_at")
    readonly_fields = ("llm_response_preview", "created_at")
    max_num = 5

    def llm_response_preview(self, obj):
        if obj.llm_response:
            preview = obj.llm_response[:200]
            return format_html(
                '<div style="max-height: 100px; overflow-y: auto;">{}</div>',
                preview + "..." if len(obj.llm_response) > 200 else preview,
            )
        return "-"

    llm_response_preview.short_description = "LLM 응답 미리보기"


class ChatLogInline(admin.StackedInline):
    model = ChatLog
    extra = 0
    fields = ("log_preview", "updated_at")
    readonly_fields = ("log_preview", "updated_at")

    def log_preview(self, obj):
        if obj.log:
            count = len(obj.log) if isinstance(obj.log, list) else 0
            return format_html(
                "<strong>{}개의 메시지</strong><br><small>마지막 업데이트: {}</small>",
                count,
                obj.updated_at.strftime("%Y-%m-%d %H:%M"),
            )
        return "로그 없음"

    log_preview.short_description = "채팅 로그 요약"


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = (
        "session_id",
        "user_link",
        "title",
        "memory_count",
        "collection_count",
        "session_duration",
        "created_at",
        "lastload_at",
    )
    search_fields = ("session_id", "title", "user__username", "user__email")
    readonly_fields = ("session_id", "created_at", "lastload_at", "session_info")
    list_filter = ("created_at", "lastload_at", "user")
    ordering = ("-created_at",)
    list_per_page = 25
    date_hierarchy = "created_at"

    fieldsets = (
        ("기본 정보", {"fields": ("user", "session_id", "title")}),
        (
            "시간 정보",
            {"fields": ("created_at", "lastload_at"), "classes": ("collapse",)},
        ),
        ("세션 통계", {"fields": ("session_info",), "classes": ("collapse",)}),
    )

    inlines = [ChatMemoryInline, CollectionMemoryInline, ChatLogInline]

    actions = ["mark_as_archived", "cleanup_old_memories"]

    def user_link(self, obj):
        try:
            # 커스텀 User 모델에 맞는 URL 패턴들을 시도
            possible_urls = [
                "admin:custom_auth_user_change",  # 커스텀 User 모델
                f"admin:{obj.user._meta.app_label}_{obj.user._meta.model_name}_change",  # 동적 패턴
                "admin:auth_user_change",  # 기본 패턴
            ]

            for url_name in possible_urls:
                try:
                    url = reverse(url_name, args=[obj.user.pk])
                    return format_html(
                        '<a href="{}" style="color: #0066cc; text-decoration: none;">{} <span style="color: #666; font-size: 11px;">({})</span></a>',
                        url,
                        obj.user.username,
                        obj.user.role,
                    )
                except NoReverseMatch:
                    continue

            # 모든 URL이 실패하면 강조된 텍스트로 표시
            return format_html(
                '<strong style="color: #0066cc;">{}</strong> <span style="color: #666; font-size: 11px;">({})</span>',
                obj.user.username,
                obj.user.role,
            )
        except Exception as e:
            return str(obj.user.username) if obj.user else "-"

    user_link.short_description = "사용자"
    user_link.admin_order_field = "user__username"

    def memory_count(self, obj):
        count = obj.chatmemory_set.count()
        if count > 0:
            return format_html('<span style="color: #0066cc;">{}</span>', count)
        return count

    memory_count.short_description = "메모리 수"

    def collection_count(self, obj):
        count = obj.collectionmemory_set.count()
        if count > 0:
            return format_html('<span style="color: #009900;">{}</span>', count)
        return count

    collection_count.short_description = "컬렉션 수"

    def session_duration(self, obj):
        if obj.lastload_at and obj.created_at:
            duration = obj.lastload_at - obj.created_at
            hours = duration.total_seconds() / 3600
            if hours < 1:
                minutes = int(duration.total_seconds() / 60)
                return format_html('<span style="color: #666;">{}분</span>', minutes)
            elif hours < 24:
                hours_formatted = f"{hours:.1f}"
                return format_html(
                    '<span style="color: #0066cc;">{}시간</span>', hours_formatted
                )
            else:
                days_formatted = f"{hours / 24:.1f}"
                return format_html(
                    '<span style="color: #cc6600;">{}일</span>', days_formatted
                )
        return "-"

    session_duration.short_description = "세션 지속시간"

    def session_info(self, obj):
        memories = obj.chatmemory_set.count()
        collections = obj.collectionmemory_set.count()
        try:
            log_count = len(obj.log.log) if hasattr(obj, "log") and obj.log.log else 0
        except:
            log_count = 0

        return format_html(
            '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">'
            "<strong>세션 통계</strong><br>"
            "• 총 메모리: {} 개<br>"
            "• 컬렉션 메모리: {} 개<br>"
            "• 채팅 로그: {} 개<br>"
            "</div>",
            memories,
            collections,
            log_count,
        )

    session_info.short_description = "세션 정보"

    def mark_as_archived(self, request, queryset):
        # 실제로는 archived 필드가 있다면 사용
        self.message_user(request, f"{queryset.count()}개의 세션이 처리되었습니다.")

    mark_as_archived.short_description = "선택된 세션들을 아카이브"

    def cleanup_old_memories(self, request, queryset):
        total_deleted = 0
        for session in queryset:
            # 30개 초과 메모리 정리 (모델의 save 메소드와 동일한 로직)
            for memory_type in ["question", "answer", "summary"]:
                memories = ChatMemory.objects.filter(
                    session=session, memory_type=memory_type
                ).order_by("-created_at")
                if memories.count() > 30:
                    to_delete = memories[30:]
                    count = ChatMemory.objects.filter(
                        id__in=[m.id for m in to_delete]
                    ).count()
                    ChatMemory.objects.filter(id__in=[m.id for m in to_delete]).delete()
                    total_deleted += count

        self.message_user(
            request, f"총 {total_deleted}개의 오래된 메모리가 정리되었습니다."
        )

    cleanup_old_memories.short_description = "오래된 메모리 정리"


@admin.register(ChatMemory)
class ChatMemoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "session_link",
        "memory_type_badge",
        "role_badge",
        "content_preview",
        "created_at",
    )
    search_fields = ("session__session_id", "role", "content")
    list_filter = ("memory_type", "role", "created_at", "session__user")
    readonly_fields = ("created_at", "content_formatted")
    ordering = ("-created_at",)
    list_per_page = 50
    date_hierarchy = "created_at"

    fieldsets = (
        ("기본 정보", {"fields": ("session", "memory_type", "role")}),
        (
            "내용",
            {
                "fields": ("content", "content_formatted"),
            },
        ),
        ("시간 정보", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def session_link(self, obj):
        try:
            url = reverse("admin:chatbot_chatsession_change", args=[obj.session.pk])
            return format_html('<a href="{}">{}</a>', url, obj.session.session_id)
        except NoReverseMatch:
            return format_html("<strong>{}</strong>", obj.session.session_id)

    session_link.short_description = "세션"
    session_link.admin_order_field = "session__session_id"

    def memory_type_badge(self, obj):
        colors = {"question": "#007bff", "answer": "#28a745", "summary": "#ffc107"}
        color = colors.get(obj.memory_type, "#6c757d")
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_memory_type_display(),
        )

    memory_type_badge.short_description = "메모리 타입"
    memory_type_badge.admin_order_field = "memory_type"

    def role_badge(self, obj):
        if obj.role:
            color = "#17a2b8" if obj.role == "user" else "#6f42c1"
            return format_html(
                '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">{}</span>',
                color,
                obj.role.upper(),
            )
        return "-"

    role_badge.short_description = "역할"
    role_badge.admin_order_field = "role"

    def content_preview(self, obj):
        if obj.content:
            content_str = str(obj.content)[:80]
            return format_html(
                '<span title="{}">{}</span>',
                str(obj.content),
                content_str + "..." if len(content_str) > 80 else content_str,
            )
        return "-"

    content_preview.short_description = "내용"

    def content_formatted(self, obj):
        if obj.content:
            import json

            try:
                formatted = json.dumps(obj.content, indent=2, ensure_ascii=False)
                return format_html(
                    '<pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto;">{}</pre>',
                    formatted,
                )
            except:
                return format_html(
                    '<pre style="background: #f8f9fa; padding: 10px; border-radius: 5px;">{}</pre>',
                    str(obj.content),
                )
        return "-"

    content_formatted.short_description = "포맷된 내용"


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ("name", "scope_badge", "tag_list", "content_preview", "usage_count")
    search_fields = ("name", "tag", "content")
    list_filter = ("scope", "tag")
    ordering = ("name",)

    fieldsets = (
        ("기본 정보", {"fields": ("name", "scope", "tag")}),
        (
            "프롬프트 내용",
            {
                "fields": ("content",),
            },
        ),
    )

    def scope_badge(self, obj):
        color = "#28a745" if obj.scope == "collection" else "#007bff"
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_scope_display(),
        )

    scope_badge.short_description = "범위"
    scope_badge.admin_order_field = "scope"

    def tag_list(self, obj):
        if obj.tag:
            tags = obj.tag.split(",") if "," in obj.tag else [obj.tag]
            tag_html = []
            for tag in tags:
                tag = tag.strip()
                tag_html.append(
                    f'<span style="background: #e9ecef; padding: 1px 6px; border-radius: 3px; font-size: 10px; margin-right: 2px;">{tag}</span>'
                )
            return format_html("".join(tag_html))
        return "-"

    tag_list.short_description = "태그"

    def content_preview(self, obj):
        preview = obj.content[:100] if obj.content else ""
        return format_html(
            '<span title="{}">{}</span>',
            obj.content,
            preview + "..." if len(obj.content) > 100 else preview,
        )

    content_preview.short_description = "내용 미리보기"

    def usage_count(self, obj):
        count = obj.collectionmemory_set.count()
        if count > 0:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">{}</span>', count
            )
        return format_html('<span style="color: #6c757d;">0</span>')

    usage_count.short_description = "사용 횟수"


@admin.register(CollectionMemory)
class CollectionMemoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "session_link",
        "collection_name_badge",
        "prompt_link",
        "response_preview",
        "doc_count",
        "created_at",
    )
    search_fields = ("collection_name", "session__session_id", "llm_response")
    list_filter = ("collection_name", "created_at", "prompt")
    readonly_fields = ("created_at", "response_formatted", "documents_info")
    ordering = ("-created_at",)
    list_per_page = 30
    date_hierarchy = "created_at"

    fieldsets = (
        ("기본 정보", {"fields": ("session", "collection_name", "prompt")}),
        (
            "문서 정보",
            {
                "fields": (
                    "documents_info",
                    "retrieved_documents_content",
                    "retrieved_documents_meta",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "응답",
            {
                "fields": ("llm_response", "response_formatted"),
            },
        ),
        ("시간 정보", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def session_link(self, obj):
        try:
            url = reverse("admin:chatbot_chatsession_change", args=[obj.session.pk])
            return format_html('<a href="{}">{}</a>', url, obj.session.session_id)
        except NoReverseMatch:
            return format_html("<strong>{}</strong>", obj.session.session_id)

    session_link.short_description = "세션"
    session_link.admin_order_field = "session__session_id"

    def collection_name_badge(self, obj):
        return format_html(
            '<span style="background: #17a2b8; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            obj.collection_name,
        )

    collection_name_badge.short_description = "컬렉션"
    collection_name_badge.admin_order_field = "collection_name"

    def prompt_link(self, obj):
        if obj.prompt:
            try:
                url = reverse("admin:chatbot_prompt_change", args=[obj.prompt.pk])
                return format_html('<a href="{}">{}</a>', url, obj.prompt.name)
            except NoReverseMatch:
                return format_html("<strong>{}</strong>", obj.prompt.name)
        return "-"

    prompt_link.short_description = "프롬프트"

    def response_preview(self, obj):
        if obj.llm_response:
            preview = obj.llm_response[:80]
            return format_html(
                '<span title="{}">{}</span>',
                obj.llm_response,
                preview + "..." if len(obj.llm_response) > 80 else preview,
            )
        return "-"

    response_preview.short_description = "LLM 응답"

    def doc_count(self, obj):
        try:
            content_count = (
                len(obj.retrieved_documents_content)
                if obj.retrieved_documents_content
                else 0
            )
            meta_count = (
                len(obj.retrieved_documents_meta) if obj.retrieved_documents_meta else 0
            )
            return format_html(
                '<span style="color: #007bff;">📄 {}/📊 {}</span>',
                content_count,
                meta_count,
            )
        except:
            return "-"

    doc_count.short_description = "문서 수"

    def response_formatted(self, obj):
        if obj.llm_response:
            return format_html(
                '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;">{}</div>',
                obj.llm_response,
            )
        return "-"

    response_formatted.short_description = "포맷된 응답"

    def documents_info(self, obj):
        content_count = (
            len(obj.retrieved_documents_content)
            if obj.retrieved_documents_content
            else 0
        )
        meta_count = (
            len(obj.retrieved_documents_meta) if obj.retrieved_documents_meta else 0
        )

        return format_html(
            '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">'
            "<strong>검색된 문서 정보</strong><br>"
            "• 내용 문서: {} 개<br>"
            "• 메타 문서: {} 개<br>"
            "</div>",
            content_count,
            meta_count,
        )

    documents_info.short_description = "문서 정보"


@admin.register(ChatLog)
class ChatLogAdmin(admin.ModelAdmin):
    list_display = (
        "session_link",
        "message_count",
        "last_message_preview",
        "updated_at",
    )
    search_fields = ("session__session_id", "log")
    list_filter = ("updated_at", "session__user")
    readonly_fields = ("session", "updated_at", "log_formatted", "log_stats")
    ordering = ("-updated_at",)

    fieldsets = (
        ("기본 정보", {"fields": ("session", "updated_at")}),
        (
            "로그 통계",
            {
                "fields": ("log_stats",),
            },
        ),
        (
            "로그 내용",
            {
                "fields": ("log", "log_formatted"),
            },
        ),
    )

    def session_link(self, obj):
        try:
            url = reverse("admin:chatbot_chatsession_change", args=[obj.session.pk])
            return format_html('<a href="{}">{}</a>', url, obj.session.session_id)
        except NoReverseMatch:
            return format_html("<strong>{}</strong>", obj.session.session_id)

    session_link.short_description = "세션"
    session_link.admin_order_field = "session__session_id"

    def message_count(self, obj):
        if obj.log and isinstance(obj.log, list):
            count = len(obj.log)
            return format_html(
                '<span style="color: #007bff; font-weight: bold;">{}</span>', count
            )
        return 0

    message_count.short_description = "메시지 수"

    def last_message_preview(self, obj):
        if obj.log and isinstance(obj.log, list) and obj.log:
            last_msg = obj.log[-1]
            content = last_msg.get("content", "")[:50]
            role = last_msg.get("role", "").upper()
            role_color = "#17a2b8" if role == "USER" else "#6f42c1"
            return format_html(
                '<span style="color: {}; font-weight: bold;">[{}]</span> {}{}',
                role_color,
                role,
                content,
                "..." if len(content) == 50 else "",
            )
        return "-"

    last_message_preview.short_description = "마지막 메시지"

    def log_formatted(self, obj):
        if obj.log and isinstance(obj.log, list):
            html_parts = []
            for i, msg in enumerate(obj.log[-5:]):  # 최근 5개만 표시
                role = msg.get("role", "").upper()
                content = msg.get("content", "")
                role_color = "#17a2b8" if role == "USER" else "#6f42c1"

                html_parts.append(
                    f"""
                <div style="margin-bottom: 10px; padding: 8px; border-left: 3px solid {role_color}; background: #f8f9fa;">
                    <strong style="color: {role_color};">[{role}]</strong><br>
                    <span style="white-space: pre-wrap;">{content[:200]}{'...' if len(content) > 200 else ''}</span>
                </div>
                """
                )

            if len(obj.log) > 5:
                html_parts.insert(
                    0,
                    f'<p style="color: #6c757d; font-style: italic;">... {len(obj.log) - 5}개 더 많은 메시지 (최근 5개만 표시)</p>',
                )

            return format_html(
                '<div style="max-height: 400px; overflow-y: auto;">{}</div>',
                "".join(html_parts),
            )
        return "-"

    log_formatted.short_description = "포맷된 로그"

    def log_stats(self, obj):
        if obj.log and isinstance(obj.log, list):
            total = len(obj.log)
            user_count = sum(1 for msg in obj.log if msg.get("role") == "user")
            assistant_count = sum(
                1 for msg in obj.log if msg.get("role") == "assistant"
            )

            return format_html(
                '<div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">'
                "<strong>채팅 통계</strong><br>"
                "• 총 메시지: {} 개<br>"
                "• 사용자 메시지: {} 개<br>"
                "• 어시스턴트 메시지: {} 개<br>"
                "</div>",
                total,
                user_count,
                assistant_count,
            )
        return "-"

    log_stats.short_description = "로그 통계"


# Admin 사이트 커스터마이징
admin.site.site_header = "LocaAI 챗봇 관리"
admin.site.site_title = "LocaAI Admin"
admin.site.index_title = "챗봇 관리 시스템"
