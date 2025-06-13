from django.test import TestCase
from django.core import mail
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import EmailTemplate, EmailMessage
from django.conf import settings

User = get_user_model()

class EmailTemplateTests(APITestCase):
    def setUp(self):
        # 테스트용 관리자 사용자 생성
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin1234'
        )
        self.client.force_authenticate(user=self.admin_user)
        
        # 테스트용 템플릿 생성
        self.template = EmailTemplate.objects.create(
            name='테스트 템플릿',
            subject='테스트 제목',
            body='테스트 본문입니다.',
            is_active=True
        )

    def test_create_template(self):
        """템플릿 생성 테스트"""
        url = reverse('smtp:template-list')
        data = {
            'name': '새 템플릿',
            'subject': '새 제목',
            'body': '새 본문입니다.',
            'is_active': True
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EmailTemplate.objects.count(), 2)

    def test_list_templates(self):
        """템플릿 목록 조회 테스트"""
        url = reverse('smtp:template-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_toggle_template_active(self):
        """템플릿 활성화/비활성화 테스트"""
        url = reverse('smtp:template-toggle-active', args=[self.template.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.template.refresh_from_db()
        self.assertFalse(self.template.is_active)

    def test_non_admin_template_access(self):
        """일반 사용자의 템플릿 접근 테스트"""
        # 일반 사용자 생성
        normal_user = User.objects.create_user(
            username='normal',
            email='normal@example.com',
            password='normal1234'
        )
        self.client.force_authenticate(user=normal_user)
        
        # 템플릿 목록 조회 시도
        url = reverse('smtp:template-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

class EmailMessageTests(APITestCase):
    def setUp(self):
        # 테스트용 사용자 생성
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='test1234'
        )
        self.client.force_authenticate(user=self.user)
        
        # 테스트용 관리자 생성
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin1234'
        )
        
        # 테스트용 템플릿 생성
        self.template = EmailTemplate.objects.create(
            name='테스트 템플릿',
            subject='테스트 제목',
            body='테스트 본문입니다.',
            is_active=True
        )

    def test_send_email_with_template(self):
        """템플릿을 사용한 이메일 전송 테스트"""
        url = reverse('smtp:message-list')
        data = {
            'template': self.template.id,
            'recipient': 'recipient@example.com',
            'sender': settings.DEFAULT_FROM_EMAIL,
            'is_encrypted': False
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, self.template.subject)
        self.assertEqual(mail.outbox[0].body, self.template.body)

    def test_send_email_without_template(self):
        """템플릿 없이 이메일 전송 테스트"""
        url = reverse('smtp:message-list')
        data = {
            'subject': '직접 작성한 제목',
            'message': '직접 작성한 본문입니다.',
            'recipient': 'recipient@example.com',
            'sender': settings.DEFAULT_FROM_EMAIL,
            'is_encrypted': False
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, data['subject'])
        self.assertEqual(mail.outbox[0].body, data['message'])

    def test_retry_failed_email(self):
        """실패한 이메일 재전송 테스트"""
        # 실패한 이메일 생성
        message = EmailMessage.objects.create(
            template=self.template,
            recipient='recipient@example.com',
            sender=self.user.email,  # 현재 사용자의 이메일로 설정
            status=EmailMessage.Status.FAILED,
            error_message='테스트 에러',
            retry_count=0
        )
        
        url = reverse('smtp:message-retry', args=[message.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        message.refresh_from_db()
        self.assertEqual(message.retry_count, 1)

    def test_list_failed_emails(self):
        """실패한 이메일 목록 조회 테스트"""
        # 실패한 이메일 생성
        EmailMessage.objects.create(
            template=self.template,
            recipient='recipient@example.com',
            sender=self.user.email,  # 현재 사용자의 이메일로 설정
            status=EmailMessage.Status.FAILED,
            error_message='테스트 에러'
        )
        
        url = reverse('smtp:message-failed')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_email_encryption(self):
        """이메일 암호화 테스트"""
        url = reverse('smtp:message-list')
        data = {
            'template': self.template.id,
            'recipient': 'recipient@example.com',
            'sender': settings.DEFAULT_FROM_EMAIL,
            'is_encrypted': True
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        message = EmailMessage.objects.get(id=response.data['id'])
        self.assertTrue(message.is_encrypted)
        self.assertIsNotNone(message.encryption_key)

    def test_email_access_permissions(self):
        """이메일 접근 권한 테스트"""
        # 다른 사용자의 이메일 생성
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='other1234'
        )
        
        message = EmailMessage.objects.create(
            template=self.template,
            recipient='recipient@example.com',
            sender=other_user.email,
            status=EmailMessage.Status.SENT
        )
        
        # 현재 사용자로 이메일 조회 시도
        url = reverse('smtp:message-detail', args=[message.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 관리자로 이메일 조회 시도
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retry_permissions(self):
        """이메일 재전송 권한 테스트"""
        # 다른 사용자의 이메일 생성
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='other1234'
        )
        
        message = EmailMessage.objects.create(
            template=self.template,
            recipient='recipient@example.com',
            sender=other_user.email,
            status=EmailMessage.Status.FAILED
        )
        
        # 현재 사용자로 재전송 시도
        url = reverse('smtp:message-retry', args=[message.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 관리자로 재전송 시도
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_failed_emails_list_permissions(self):
        """실패한 이메일 목록 조회 권한 테스트"""
        # 다른 사용자의 실패한 이메일 생성
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='other1234'
        )
        
        EmailMessage.objects.create(
            template=self.template,
            recipient='recipient@example.com',
            sender=other_user.email,
            status=EmailMessage.Status.FAILED
        )
        
        # 현재 사용자로 실패한 이메일 목록 조회
        url = reverse('smtp:message-failed')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)  # 다른 사용자의 이메일은 보이지 않아야 함
        
        # 관리자로 실패한 이메일 목록 조회
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # 관리자는 모든 실패한 이메일을 볼 수 있어야 함
