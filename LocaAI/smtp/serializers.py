#LocaAI/smtp/serializers.py
from rest_framework import serializers
from .models import EmailMessage

class EmailMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMessage
        fields = '__all__'
        read_only_fields = ['status', 'sent_at', 'failed_at', 'failure_reason', 'created_at', 'updated_at']

class ContactEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailMessage
        fields = ['subject', 'message', 'recipient', 'sender']
        extra_kwargs = {
            'subject': {'required': True},
            'message': {'required': True},
            'recipient': {'required': True},
            'sender': {'required': True}
        }

    def validate_sender(self, value):
        """발신자 이메일 주소 검증"""
        if not value or '@' not in value:
            raise serializers.ValidationError("유효한 이메일 주소를 입력해주세요.")
        return value

    def validate_recipient(self, value):
        """수신자 이메일 주소 검증"""
        if not value or '@' not in value:
            raise serializers.ValidationError("유효한 이메일 주소를 입력해주세요.")
        return value

    def validate_message(self, value):
        """메시지 길이 검증"""
        if len(value) < 10:
            raise serializers.ValidationError("메시지는 최소 10자 이상이어야 합니다.")
        return value
