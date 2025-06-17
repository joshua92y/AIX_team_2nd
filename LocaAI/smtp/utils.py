from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

def send_subscription_email(subscriber):
    """구독자에게 웰컴 메일 전송 + 해지 링크 포함"""
    unsubscribe_url = f"{settings.SITE_DOMAIN}/newsletter/unsubscribe-auto?email={subscriber.email}"

    html_content = render_to_string("newsletter/email_welcome.html", {
        "subscriber": subscriber,
        "unsubscribe_url": unsubscribe_url,
    })

    subject = "Loca Ai 뉴스레터 구독 감사합니다!"
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = [subscriber.email]

    msg = EmailMultiAlternatives(subject, "", from_email, to_email)
    msg.attach_alternative(html_content, "text/html")
    msg.send()
