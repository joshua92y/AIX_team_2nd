# serializers.py
from rest_framework import serializers
from .models import EmailMessage, EmailTemplate
import secrets
import uuid

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'subject', 'body', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_name(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("템플릿 이름은 최소 3자 이상이어야 합니다.")
        return value

class EmailMessageSerializer(serializers.ModelSerializer):
    template = EmailTemplateSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmailMessage
        fields = [
            'id', 'template', 'subject', 'message', 'recipient', 'sender',
            'status', 'status_display', 'sent_at', 'error_message',
            'retry_count', 'is_encrypted', 'encryption_key', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'sent_at', 'error_message',
            'retry_count', 'encryption_key', 'created_at'
        ]

    def validate(self, data):
        if 'template' in data:
            if not data['template'].is_active:
                raise serializers.ValidationError("비활성화된 템플릿은 사용할 수 없습니다.")
        else:
            if not data.get('subject') or not data.get('message'):
                raise serializers.ValidationError("템플릿이 없는 경우 제목과 내용은 필수입니다.")
        
        if data.get('is_encrypted') and not data.get('encryption_key'):
            data['encryption_key'] = str(uuid.uuid4())
        
        return data

    def validate_recipient(self, value):
        return value.lower()

    def validate_sender(self, value):
        return value.lower()

class EmailMessageCreateSerializer(serializers.ModelSerializer):
    template = serializers.PrimaryKeyRelatedField(
        queryset=EmailTemplate.objects.filter(is_active=True),
        required=False
    )
    subject = serializers.CharField(required=False)
    message = serializers.CharField(required=False)
    sender = serializers.EmailField(required=False)
    is_encrypted = serializers.BooleanField(default=False)
    encryption_key = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = EmailMessage
        fields = [
            'template', 'subject', 'message', 'recipient', 'sender',
            'is_encrypted', 'encryption_key'
        ]
    
    def validate(self, data):
        if 'template' in data:
            if not data['template'].is_active:
                raise serializers.ValidationError("비활성화된 템플릿은 사용할 수 없습니다.")
        else:
            if not data.get('subject') or not data.get('message'):
                raise serializers.ValidationError("템플릿이 없는 경우 제목과 내용은 필수입니다.")
        
        if data.get('is_encrypted') and not data.get('encryption_key'):
            data['encryption_key'] = str(uuid.uuid4())
        
        return data

    def create(self, validated_data):
        # 암호화 요청 시 encryption_key 자동 생성
        is_encrypted = validated_data.get('is_encrypted', False)
        if is_encrypted:
            validated_data['encryption_key'] = secrets.token_urlsafe(32)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        is_encrypted = validated_data.get('is_encrypted', instance.is_encrypted)
        if is_encrypted and not instance.encryption_key:
            validated_data['encryption_key'] = secrets.token_urlsafe(32)
        return super().update(instance, validated_data)

class EmailMessageRetrySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMessage
        fields = ['id', 'status', 'retry_count', 'error_message']
        read_only_fields = ['id', 'status', 'retry_count', 'error_message']