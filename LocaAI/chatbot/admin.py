from django.contrib import admin
from .models import ChatSession, ChatMemory, Prompt, CollectionMemory


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_id', 'title', 'created_at', 'lastload_at')
    search_fields = ('session_id', 'title', 'user__username')
    readonly_fields = ('session_id', 'created_at', 'lastload_at')
    list_filter = ('created_at',)
    ordering = ('-created_at',)


@admin.register(ChatMemory)
class ChatMemoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'memory_type', 'role', 'created_at')
    search_fields = ('session__session_id', 'role')
    list_filter = ('memory_type', 'role', 'created_at')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(Prompt)
class PromptAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'scope', 'tag')
    search_fields = ('name', 'tag')
    list_filter = ('scope',)


@admin.register(CollectionMemory)
class CollectionMemoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'collection_name', 'prompt', 'created_at')
    search_fields = ('collection_name', 'session__session_id')
    list_filter = ('collection_name', 'created_at')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
