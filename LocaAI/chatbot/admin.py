# apps/chatbot/admin.py
from django.contrib import admin
from .models import ConversationLog, ConversationSummary


@admin.register(ConversationLog)
class ConversationLogAdmin(admin.ModelAdmin):
    list_display = ("user_id", "session_id", "role", "timestamp")
    list_filter = ("user_id", "session_id", "role")
    search_fields = ("content",)


@admin.register(ConversationSummary)
class ConversationSummaryAdmin(admin.ModelAdmin):
    list_display = ("user_id", "session_id", "updated_at")
    search_fields = ("summary",)
