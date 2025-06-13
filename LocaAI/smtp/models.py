# models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinLengthValidator
import uuid

class EmailTemplate(models.Model):
    name = models.CharField(_('템플릿 이름'), max_length=100, unique=True)
    subject = models.CharField(_('제목'), max_length=255)
    body = models.TextField(_('본문'))
    is_active = models.BooleanField(_('활성화 여부'), default=True)
    created_at = models.DateTimeField(_('생성일'), auto_now_add=True)
    updated_at = models.DateTimeField(_('수정일'), auto_now=True)

    class Meta:
        verbose_name = _('이메일 템플릿')
        verbose_name_plural = _('이메일 템플릿')

    def __str__(self):
        return self.name

class EmailMessage(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', _('대기중')
        SENDING = 'sending', _('전송중')
        SENT = 'sent', _('전송완료')
        FAILED = 'failed', _('전송실패')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_('이메일 템플릿')
    )
    subject = models.CharField(_('제목'), max_length=255)
    message = models.TextField(_('메시지'), validators=[MinLengthValidator(10)])
    recipient = models.EmailField(_('수신자'))
    sender = models.EmailField(_('발신자'))
    status = models.CharField(
        _('상태'),
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    sent_at = models.DateTimeField(_('전송일시'), null=True, blank=True)
    error_message = models.TextField(_('에러 메시지'), null=True, blank=True)
    retry_count = models.PositiveIntegerField(_('재시도 횟수'), default=0)
    max_retries = models.PositiveIntegerField(_('최대 재시도 횟수'), default=3)
    
    # 보안 관련 필드
    is_encrypted = models.BooleanField(_('암호화 여부'), default=False)
    encryption_key = models.CharField(_('암호화 키'), max_length=255, null=True, blank=True)
    
    created_at = models.DateTimeField(_('생성일'), auto_now_add=True)
    updated_at = models.DateTimeField(_('수정일'), auto_now=True)

    class Meta:
        verbose_name = _('이메일 메시지')
        verbose_name_plural = _('이메일 메시지')
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['recipient']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"To: {self.recipient} | Subject: {self.subject} | Status: {self.status}"

    def can_retry(self):
        return self.retry_count < self.max_retries and self.status in [self.Status.FAILED, self.Status.PENDING]