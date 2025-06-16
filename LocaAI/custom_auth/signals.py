#LocaAI/custom_auth/signals.py
from django.db.models.signals import post_save,pre_save
from django.dispatch import receiver
from smtp.models import NewsletterSubscriber  # 앱 구조에 따라 경로 수정
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(post_save, sender=User)
def link_newsletter_subscription(sender, instance, created, **kwargs):
    if not created:
        return

    try:
        subscriber = NewsletterSubscriber.objects.get(email=instance.email, user__isnull=True)
        subscriber.user = instance
        subscriber.save()
    except NewsletterSubscriber.DoesNotExist:
        pass

@receiver(pre_save, sender=User)
def sync_newsletter_email_on_user_email_change(sender, instance, **kwargs):
    if not instance.pk:
        return  # 새로 생성되는 유저는 제외

    try:
        old_user = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    if old_user.email != instance.email:
        # 유저 이메일이 변경된 경우
        try:
            subscriber = NewsletterSubscriber.objects.get(user=instance)
            subscriber.email = instance.email
            subscriber.save()
        except NewsletterSubscriber.DoesNotExist:
            pass