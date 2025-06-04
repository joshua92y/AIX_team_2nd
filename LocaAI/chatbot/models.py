# apps/chatbot/models.py
from django.db import models
from django.conf import settings


class ConversationSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_id = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=255, default="새 대화")
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)


class ConversationLog(models.Model):
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_id = models.ForeignKey(
        ConversationSession, on_delete=models.CASCADE, related_name="logs"
    )
    role = models.CharField(
        max_length=10, choices=[("user", "User"), ("assistant", "Assistant")]
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    # RAG 응답들 (Optional)
    rag_zone_1_answer = models.TextField(blank=True, null=True)
    rag_zone_2_answer = models.TextField(blank=True, null=True)
    rag_zone_3_answer = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["timestamp"]


class ConversationSummary(models.Model):
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    session_id = models.ForeignKey(
        ConversationSession, on_delete=models.CASCADE, related_name="summary"
    )
    summary = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_id} - {self.session_id}"


class ConversationMessage(models.Model):
    session = models.ForeignKey(
        ConversationSession, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(
        max_length=10, choices=[("user", "User"), ("assistant", "Assistant")]
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
