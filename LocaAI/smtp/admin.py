# admin.py
from django.contrib import admin
from .models import EmailTemplate, EmailMessage

@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'subject', 'body')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)

    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'subject', 'body')
        }),
        ('상태', {
            'fields': ('is_active',)
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'subject', 'status', 'sent_at', 'retry_count', 'created_at')
    list_filter = ('status', 'sent_at', 'created_at', 'is_encrypted')
    search_fields = ('recipient', 'subject', 'message', 'error_message')
    readonly_fields = ('id', 'status', 'sent_at', 'error_message', 'retry_count', 'created_at', 'updated_at')
    ordering = ('-created_at',)

    fieldsets = (
        ('기본 정보', {
            'fields': ('template', 'subject', 'message', 'recipient', 'sender')
        }),
        ('상태 정보', {
            'fields': ('status', 'sent_at', 'error_message', 'retry_count', 'max_retries')
        }),
        ('보안', {
            'fields': ('is_encrypted', 'encryption_key')
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        return False  # 관리자 페이지에서 직접 생성 불가

    def has_change_permission(self, request, obj=None):
        if obj and obj.status in [EmailMessage.Status.SENT, EmailMessage.Status.FAILED]:
            return False  # 전송 완료되거나 실패한 메시지는 수정 불가
        return super().has_change_permission(request, obj)