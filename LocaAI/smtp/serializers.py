#LocaAI/smtp/serializers.py
from rest_framework import serializers
from .models import EmailMessage,NewsletterSubscriber
from django.contrib.auth import get_user_model

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


class NewsletterSubscribeSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscriber
        fields = ['email', 'name']
        extra_kwargs = {
            'name': {'required': False},
            'email': {'validators': []},
        }

    def validate_email(self, value):
        """
        이메일이 이미 존재하는 경우, is_active 상태에 따라 판단
        """
        try:
            subscriber = NewsletterSubscriber.objects.get(email=value)
            if subscriber.is_active:
                raise serializers.ValidationError("이미 구독 중인 이메일입니다.")
            # is_active=False → 재구독 허용 → 통과
        except NewsletterSubscriber.DoesNotExist:
            pass
        return value

    def create(self, validated_data):
        email = validated_data['email']
        name = validated_data.get('name') or email.split('@')[0]

        User = get_user_model()
        matching_user = None
        try:
            matching_user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass

        try:
            subscriber = NewsletterSubscriber.objects.get(email=email)
            if matching_user:
                subscriber.user = matching_user
                
            subscriber.name = name or subscriber.name
            subscriber.subscribe()
            subscriber.save()
            return subscriber
        except NewsletterSubscriber.DoesNotExist:
            return NewsletterSubscriber.objects.create(
                email=email,
                name=name,
                user=matching_user
            )


class NewsletterUnsubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            subscriber = NewsletterSubscriber.objects.get(email=value)
            self.subscriber = subscriber
        except NewsletterSubscriber.DoesNotExist:
            raise serializers.ValidationError("해당 이메일은 구독되어 있지 않습니다.")
        return value

    def save(self, **kwargs):
        subscriber = self.subscriber
        subscriber.unsubscribe()
        return subscriber