from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import os
from cryptography.fernet import Fernet
from django.conf import settings


fernet = Fernet(settings.FERNET_KEY.encode())

def encrypt_email(email: str) -> str:
    """이메일을 암호화해서 토큰으로 반환"""
    return fernet.encrypt(email.encode()).decode()

def decrypt_email(token: str) -> str:
    """암호화된 토큰에서 이메일 복호화"""
    return fernet.decrypt(token.encode()).decode()

def send_subscription_email(subscriber):
    """
    뉴스레터 구독 시 웰컴 이메일 전송 + 해지 링크 포함
    """
    # 도메인은 settings 없을 경우 대비
    site_domain = getattr(settings, 'SITE_DOMAIN', os.environ.get("DEFAULT_SITE_DOMAIN", "http://localhost:8000"))
    token = encrypt_email(subscriber.email)
    # 구독 해지 URL 생성 (실제 POST 처리는 나중에 템플릿에서 폼으로 처리해야 함)
    unsubscribe_url = f"{site_domain}/api/smtp/newsletter/unsubscribe?token={token}"

    # 템플릿 렌더링
    html_content = render_to_string("newsletter/email_welcome.html", {
        "subscriber": subscriber,  # 템플릿에서 subscriber.name 사용 가능하게
        "unsubscribe_url": unsubscribe_url
    })

    subject = "Loca Ai 뉴스레터 구독 감사합니다!"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@locaai.site')
    to_email = [subscriber.email]

    # HTML 메일 생성 및 전송
    msg = EmailMultiAlternatives(subject, "", from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send()

    print(f"[메일 발송 완료] → {subscriber.email}")
