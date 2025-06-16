import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.mail import send_mail
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _


class EmailMessage(models.Model):
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('sent', '전송됨'),
        ('failed', '실패'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ✅ 유저 외래키 (nullable, optional)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('사용자'),
        related_name='email_messages'
    )

    subject = models.CharField(_('제목'), max_length=255)
    message = models.TextField(_('메시지'), validators=[MinLengthValidator(10)])
    recipient = models.EmailField(_('수신자'))
    sender = models.EmailField(_('발신자'))

    status = models.CharField(
        _('상태'),
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    sent_at = models.DateTimeField(_('전송일시'), null=True, blank=True)
    failed_at = models.DateTimeField(_('실패일시'), null=True, blank=True)
    failure_reason = models.TextField(_('실패 이유'), blank=True)

    created_at = models.DateTimeField(_('생성일'), auto_now_add=True)
    updated_at = models.DateTimeField(_('수정일'), auto_now=True)

    class Meta:
        verbose_name = _('이메일')
        verbose_name_plural = _('이메일')
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['recipient']),
            models.Index(fields=['user']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"To: {self.recipient} | Subject: {self.subject} | Status: {self.status}"

    def retry(self):
        """실패한 이메일에 대해 재전송을 시도합니다."""
        if self.status != 'failed':
            raise ValueError('실패한 이메일만 재전송할 수 있습니다.')

        try:
            send_mail(
                subject=self.subject,
                message=self.message,
                from_email=self.sender,
                recipient_list=[self.recipient],
                fail_silently=False,
            )
            self.status = 'sent'
            self.sent_at = timezone.now()
            self.failure_reason = ''
        except Exception as e:
            self.status = 'failed'
            self.failed_at = timezone.now()
            self.failure_reason = str(e)

        self.save()
        
    def send(self):
        """이메일 전송 (대기중 상태에서 호출 가능)"""
        if self.status != 'pending':
            raise ValueError('대기중 상태의 이메일만 발송할 수 있습니다.')

        try:
            send_mail(
                subject=self.subject,
                message=self.message,
                from_email=self.sender,
                recipient_list=[self.recipient],
                fail_silently=False,
            )
            self.status = 'sent'
            self.sent_at = timezone.now()
            self.failure_reason = ''
        except Exception as e:
            self.status = 'failed'
            self.failed_at = timezone.now()
            self.failure_reason = str(e)

        self.save()
        
class NewsletterSubscriber(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ✅ 회원인 경우 연결 (비회원은 null 가능)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='newsletter_subscriptions',
        verbose_name=_('사용자')
    )

    email = models.EmailField(_('이메일'), unique=True)
    is_active = models.BooleanField(_('수신 동의'), default=True)
    subscribed_at = models.DateTimeField(_('구독 시작일'), auto_now_add=True)
    unsubscribed_at = models.DateTimeField(_('구독 해지일'), null=True, blank=True)

    # 선택적 이름 등 추가 메타정보
    name = models.CharField(_('이름'), max_length=100, blank=True)

    class Meta:
        verbose_name = _('뉴스레터 구독자')
        verbose_name_plural = _('뉴스레터 구독자')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.email} ({'활성' if self.is_active else '해지됨'})"

    def unsubscribe(self):
        if self.is_active:
            self.is_active = False
            self.unsubscribed_at = timezone.now()
            self.save()

    def subscribe(self):
        if not self.is_active:
            self.is_active = True
            self.unsubscribed_at = None
            self.save()