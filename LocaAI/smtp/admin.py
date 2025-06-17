#LocaAI/smtp/admin.py
from django.contrib import admin
from .models import EmailMessage, NewsletterSubscriber
from django.utils.html import format_html
from django.shortcuts import redirect
from django.contrib import messages
from django.urls import path

@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = (
        'subject',
        'recipient',
        'sender',
        'status',
        'created_at',
        'sent_at',
        'failed_at',
        'send_button',
    )
    list_filter = (
        'status',
        'created_at',
        'sent_at',
        'failed_at',
    )
    search_fields = (
        'subject',
        'recipient',
        'sender',
        'failure_reason',
    )
    readonly_fields = (
        'status',
        'sent_at',
        'failed_at',
        'failure_reason',
        'created_at',
        'updated_at',
    )
    fieldsets = (
        (None, {
            'fields': ('user', 'subject', 'message', 'recipient', 'sender')
        }),
        ('상태 정보', {
            'fields': ('status', 'sent_at', 'failed_at', 'failure_reason'),
        }),
        ('기타', {
            'fields': ('created_at', 'updated_at'),
        }),
    )
    # ✅ 1. HTML 버튼 추가
    def send_button(self, obj):
        if obj.status != 'sent':
            return format_html(
                '<a class="button" href="{}">📤 발송</a>',
                f'./{obj.pk}/send/'
            )
        return "✅ 전송됨"
    send_button.short_description = '수동 발송'

    # ✅ 2. 커스텀 URL 연결
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/send/', self.admin_site.admin_view(self.send_email_view), name='smtp_emailmessage_send'),
        ]
        return custom_urls + urls

    # ✅ 3. 버튼 클릭 시 처리 뷰
    def send_email_view(self, request, object_id):
        obj = self.get_object(request, object_id)
        if obj is None:
            self.message_user(request, "대상이 존재하지 않습니다.", level=messages.ERROR)
            return redirect("..")

        try:
            if obj.status == 'pending':
                obj.send()  # 새로 발송
                self.message_user(request, f"이메일 '{obj.subject}' 정상 발송 완료", level=messages.SUCCESS)
            elif obj.status == 'failed':
                obj.retry()  # 실패한 메일 재시도
                self.message_user(request, f"이메일 '{obj.subject}' 재전송 성공", level=messages.SUCCESS)
            else:
                self.message_user(request, f"이메일은 이미 발송되었습니다.", level=messages.WARNING)
        except Exception as e:
            self.message_user(request, f"이메일 발송 실패: {str(e)}", level=messages.ERROR)

        return redirect("..")

@admin.register(NewsletterSubscriber)
class NewsletterSubscriberAdmin(admin.ModelAdmin):
    list_display = (
        'email',
        'name',
        'user',
        'is_active',
        'subscribed_at',
        'unsubscribed_at',
        'toggle_subscription',
    )
    list_filter = (
        'is_active',
        'subscribed_at',
        'unsubscribed_at',
    )
    search_fields = (
        'email',
        'name',
        'user__username',
    )
    readonly_fields = (
        'subscribed_at',
        'unsubscribed_at',
    )
    fieldsets = (
        (None, {
            'fields': ('user', 'email', 'name', 'is_active')
        }),
        ('구독 정보', {
            'fields': ('subscribed_at', 'unsubscribed_at'),
        }),
    )

    def toggle_subscription(self, obj):
        if obj.is_active:
            return format_html(
                '<a class="button" href="{}">🔕 구독 해지</a>',
                f'./{obj.pk}/unsubscribe/'
            )
        return format_html(
            '<a class="button" href="{}">🔔 구독 활성화</a>',
            f'./{obj.pk}/subscribe/'
        )
    toggle_subscription.short_description = '구독 상태 변경'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('<path:object_id>/unsubscribe/', self.admin_site.admin_view(self.unsubscribe_view), name='smtp_newslettersubscriber_unsubscribe'),
            path('<path:object_id>/subscribe/', self.admin_site.admin_view(self.subscribe_view), name='smtp_newslettersubscriber_subscribe'),
        ]
        return custom_urls + urls

    def unsubscribe_view(self, request, object_id):
        obj = self.get_object(request, object_id)
        if obj is None:
            self.message_user(request, "대상이 존재하지 않습니다.", level=messages.ERROR)
            return redirect("..")

        try:
            obj.unsubscribe()
            self.message_user(request, f"'{obj.email}' 구독이 해지되었습니다.", level=messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f"구독 해지 실패: {str(e)}", level=messages.ERROR)

        return redirect("..")

    def subscribe_view(self, request, object_id):
        obj = self.get_object(request, object_id)
        if obj is None:
            self.message_user(request, "대상이 존재하지 않습니다.", level=messages.ERROR)
            return redirect("..")

        try:
            obj.subscribe()
            self.message_user(request, f"'{obj.email}' 구독이 활성화되었습니다.", level=messages.SUCCESS)
        except Exception as e:
            self.message_user(request, f"구독 활성화 실패: {str(e)}", level=messages.ERROR)

        return redirect("..")