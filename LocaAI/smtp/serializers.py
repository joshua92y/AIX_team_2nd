from rest_framework import serializers
from .models import EmailMessage,NewsletterSubscriber
from django.contrib.auth import get_user_model
from .utils import send_subscription_email, decrypt_email # ⬅ 추가

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

        print(f"📩 [START] 구독 프로세스 시작 for {email}")

        try:
            matching_user = User.objects.get(email=email)
            print(f"🔗 기존 유저와 연결됨: {matching_user}")
        except User.DoesNotExist:
            print(f"👤 해당 이메일로 등록된 유저 없음: {email}")

        try:
            subscriber = NewsletterSubscriber.objects.get(email=email)
            print("♻️ 기존 구독자 정보 있음, 재구독 처리 중")

            if matching_user:
                subscriber.user = matching_user

            subscriber.name = name or subscriber.name
            subscriber.subscribe()
            subscriber.save()

            print("✅ 재구독 정보 저장 완료")

            request = self.context.get("request")
            send_subscription_email(request, subscriber)
            print("📬 환영 메일 전송 시도 완료")

            return subscriber

        except NewsletterSubscriber.DoesNotExist:
            print("🆕 신규 구독자 생성 중")
            new_subscriber = NewsletterSubscriber.objects.create(
                email=email,
                name=name,
                user=matching_user
            )
            request = self.context.get("request")
            send_subscription_email(request, new_subscriber)
            print("📬 환영 메일 전송 완료 (신규)")

            return new_subscriber



class NewsletterUnsubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    token = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        # 1. POST 요청일 경우: email 기반
        if self.context.get("method") == "POST":
            email = attrs.get("email")
            if not email:
                raise serializers.ValidationError("이메일을 입력해 주세요.")
        # 2. GET 요청일 경우: token 복호화 → email 추출
        elif self.context.get("method") == "GET":
            token = attrs.get("token")
            if not token:
                raise serializers.ValidationError("토큰이 없습니다.")
            try:
                email = decrypt_email(token)
                attrs['email'] = email  # 내부 email 필드에 설정
            except Exception:
                raise serializers.ValidationError("유효하지 않은 토큰입니다.")
        else:
            raise serializers.ValidationError("지원되지 않는 요청 방식입니다.")

        # 3. 구독자 조회
        try:
            subscriber = NewsletterSubscriber.objects.get(email=email)
        except NewsletterSubscriber.DoesNotExist:
            raise serializers.ValidationError("해당 이메일은 구독되어 있지 않습니다.")

        self.subscriber = subscriber
        attrs['email'] = email  # 최종적으로 email 세팅

        return attrs

    def save(self, **kwargs):
        self.subscriber.unsubscribe()  # 또는 self.subscriber.delete()
        return self.subscriber