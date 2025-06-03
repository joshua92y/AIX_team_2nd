# apps/chatbot/models.py
from django.db import models


class ConversationLog(models.Model):
    user_id = models.CharField(max_length=100)
    session_id = models.CharField(max_length=100)
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
    user_id = models.CharField(max_length=100)
    session_id = models.CharField(max_length=100, unique=True)
    summary = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_id} - {self.session_id}"
