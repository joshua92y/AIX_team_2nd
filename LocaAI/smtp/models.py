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
