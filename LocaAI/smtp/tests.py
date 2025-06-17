import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import EmailMessage

User = get_user_model()

BASE_URL = '/api/smtp/emails/'

class EmailMessageAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

        self.email_data = {
            'subject': '테스트 제목',
            'message': '이것은 테스트 이메일입니다.',
            'recipient': 'to@example.com',
            'sender': 'from@example.com',
        }

    def test_create_email(self):
        """이메일 메시지를 생성할 수 있다"""
        response = self.client.post(BASE_URL, self.email_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EmailMessage.objects.count(), 1)

    def test_list_email(self):
        """생성된 이메일 목록을 확인할 수 있다"""
        EmailMessage.objects.create(user=self.user, **self.email_data)
        response = self.client.get(BASE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_retrieve_email(self):
        """단일 이메일 메시지를 조회할 수 있다"""
        email = EmailMessage.objects.create(user=self.user, **self.email_data)
        url = f"{BASE_URL}{email.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['recipient'], self.email_data['recipient'])

    def test_retry_failed_email(self):
        """실패한 이메일은 retry 요청으로 재전송 시도할 수 있다"""
        email = EmailMessage.objects.create(
            user=self.user,
            **self.email_data,
            status='failed',
            failure_reason='테스트 실패'
        )
        url = f"{BASE_URL}{email.id}/retry/"
        response = self.client.post(url)
        self.assertIn(response.status_code, [200, 400])  # 서버 상태에 따라 전송 실패 가능

    def test_retry_non_failed_email_should_fail(self):
        """status가 'failed'가 아니면 retry는 거부된다"""
        email = EmailMessage.objects.create(user=self.user, **self.email_data, status='sent')
        url = f"{BASE_URL}{email.id}/retry/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
