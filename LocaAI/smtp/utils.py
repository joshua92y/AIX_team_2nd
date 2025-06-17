from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
import os


def send_subscription_email(subscriber):
    """
    뉴스레터 구독 시 웰컴 이메일 전송 + 해지 링크 포함
    """
    # 도메인은 settings 없을 경우 대비
    site_domain = getattr(settings, 'SITE_DOMAIN', os.environ.get("DEFAULT_SITE_DOMAIN", "http://localhost:8000"))

    # 구독 해지 URL 생성 (실제 POST 처리는 나중에 템플릿에서 폼으로 처리해야 함)
    unsubscribe_url = f"{site_domain}/newsletter/unsubscribe-auto?email={subscriber.email}"

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
