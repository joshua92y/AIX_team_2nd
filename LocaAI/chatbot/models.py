# LocaAI/chatbot/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from django.utils.text import slugify

User = get_user_model()


class ChatSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session_id = models.CharField(max_length=100, unique=True, editable=False)
    title = models.SlugField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    lastload_at = models.DateTimeField(default=now)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # 최초 저장 후 PK가 확정된 후 session_id 설정
        if is_new and not self.session_id:
            self.session_id = f"{now().strftime('%Y%m%d')}-{self.pk}"
            super().save(update_fields=["session_id"])
        
        # 제목이 비어 있으면 슬러그 처리
        if not self.title:
            self.title = slugify(f"session-{self.session_id}")
            super().save(update_fields=["title"])


class ChatMemory(models.Model):
    MEMORY_TYPE_CHOICES = [
        ('question', '질문'),
        ('answer', '답변'),
        ('summary', '요약'),
    ]

    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE)
    memory_type = models.CharField(max_length=20, choices=MEMORY_TYPE_CHOICES)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, blank=True, null=True)
    content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # 윈도우 방식: 같은 세션 + 메모리 타입 기준으로 30개 초과 시 삭제
        max_history = 30
        memories = ChatMemory.objects.filter(
            session=self.session,
            memory_type=self.memory_type
        ).order_by('-created_at')

        if memories.count() > max_history:
            to_delete = memories[max_history:]
            ChatMemory.objects.filter(id__in=[m.id for m in to_delete]).delete()

    def __str__(self):
        return f"[{self.memory_type}] ({self.role}) {self.created_at}"

class Prompt(models.Model):
    SCOPE_CHOICES = [
        ('collection', '컬렉션'),
        ('user', '사용자'),
    ]

    name = models.CharField(max_length=100)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    content = models.TextField()
    tag = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.name} ({self.scope})"


class CollectionMemory(models.Model):
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE)
    collection_name = models.CharField(max_length=100)
    retrieved_documents_content = models.JSONField()
    retrieved_documents_meta = models.JSONField()
    llm_response = models.TextField()
    prompt = models.ForeignKey(Prompt, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ChatLog(models.Model):
    session = models.OneToOneField(ChatSession, on_delete=models.CASCADE, related_name="log")
    log = models.JSONField(default=list)  # [{role: "user", content: "..."}, {role: "assistant", content: "..."} ...]
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"💬 ChatLog for {self.session.session_id}"