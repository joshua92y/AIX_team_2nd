# loca\smtp\views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from .models import EmailMessage, EmailTemplate
from .serializers import (
    EmailMessageSerializer,
    EmailMessageCreateSerializer,
    EmailTemplateSerializer,
    EmailMessageRetrySerializer
)
from django.db import models
from django.shortcuts import render, get_object_or_404
from django.views.generic import ListView, CreateView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin

class EmailTemplateViewSet(viewsets.ModelViewSet):
    """
    이메일 템플릿 관리를 위한 ViewSet
    """
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return EmailTemplate.objects.filter(is_active=True)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        template = self.get_object()
        template.is_active = not template.is_active
        template.save()
        return Response({'status': 'success', 'is_active': template.is_active})

class EmailMessageViewSet(viewsets.ModelViewSet):
    """
    이메일 메시지 관리를 위한 ViewSet
    """
    queryset = EmailMessage.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:  # 관리자는 모든 이메일 조회 가능
            return EmailMessage.objects.all()
        # 일반 사용자는 자신이 보내거나 받은 이메일만 조회 가능
        return EmailMessage.objects.filter(
            models.Q(sender=user.email) | models.Q(recipient=user.email)
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return EmailMessageCreateSerializer
        elif self.action == 'retry':
            return EmailMessageRetrySerializer
        return EmailMessageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 이메일 전송 시도
        try:
            email_data = serializer.validated_data
            subject = email_data.get('subject', '')
            message = email_data.get('message', '')
            recipient = email_data['recipient']
            sender = email_data.get('sender', settings.DEFAULT_FROM_EMAIL)
            is_encrypted = email_data.get('is_encrypted', False)
            encryption_key = email_data.get('encryption_key')
            
            # 템플릿이 있는 경우
            if 'template' in email_data:
                template = email_data['template']
                subject = template.subject
                message = template.body
            
            # 이메일 전송
            send_mail(
                subject=subject,
                message=message,
                from_email=sender,
                recipient_list=[recipient],
                fail_silently=False,
            )
            
            # 이메일 메시지 저장
            email_message = serializer.save(
                status=EmailMessage.Status.SENT,
                sent_at=timezone.now()
            )
            
            return Response({
                'id': str(email_message.id),
                'status': 'success',
                'message': '이메일이 성공적으로 전송되었습니다.'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # 실패한 경우 저장
            email_message = serializer.save(
                status=EmailMessage.Status.FAILED,
                error_message=str(e)
            )
            return Response({
                'id': str(email_message.id),
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        try:
            message = EmailMessage.objects.get(pk=pk)
        except EmailMessage.DoesNotExist:
            return Response({
                'status': 'error',
                'message': '이메일을 찾을 수 없습니다.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 권한 확인
        if not request.user.is_staff and request.user.email != message.sender:
            return Response({
                'status': 'error',
                'message': '이 이메일을 재전송할 권한이 없습니다.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        if message.status == EmailMessage.Status.SENT:
            return Response({
                'status': 'error',
                'message': '이미 전송된 이메일입니다.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 이메일 재전송 시도
            send_mail(
                subject=message.subject,
                message=message.message,
                from_email=message.sender,
                recipient_list=[message.recipient],
                fail_silently=False,
            )
            
            # 상태 업데이트
            message.status = EmailMessage.Status.SENT
            message.sent_at = timezone.now()
            message.retry_count += 1
            message.save()
            
            return Response({
                'status': 'success',
                'message': '이메일이 성공적으로 재전송되었습니다.'
            })
            
        except Exception as e:
            message.status = EmailMessage.Status.FAILED
            message.error_message = str(e)
            message.retry_count += 1
            message.save()
            
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def failed(self, request):
        # 실패한 이메일 조회 권한 확인
        if not request.user.is_staff:
            failed_messages = EmailMessage.objects.filter(
                status=EmailMessage.Status.FAILED,
                sender=request.user.email
            ).order_by('-created_at')
        else:
            failed_messages = EmailMessage.objects.filter(
                status=EmailMessage.Status.FAILED
            ).order_by('-created_at')
        
        serializer = self.get_serializer(failed_messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending(self, request):
        pending_emails = self.get_queryset().filter(status=EmailMessage.Status.PENDING)
        serializer = self.get_serializer(pending_emails, many=True)
        return Response(serializer.data)

class EmailListView(LoginRequiredMixin, ListView):
    model = EmailMessage
    template_name = 'smtp/email_list.html'
    context_object_name = 'emails'
    paginate_by = 10

    def get_queryset(self):
        queryset = super().get_queryset()
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
        return queryset.order_by('-created_at')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['status'] = self.request.GET.get('status', 'all')
        return context

class EmailCreateView(LoginRequiredMixin, CreateView):
    model = EmailMessage
    template_name = 'smtp/email_create.html'
    fields = ['recipient', 'subject', 'message', 'is_encrypted']

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['templates'] = EmailTemplate.objects.filter(is_active=True)
        return context

    def form_valid(self, form):
        form.instance.sender = self.request.user.email
        return super().form_valid(form)

class EmailDetailView(LoginRequiredMixin, DetailView):
    model = EmailMessage
    template_name = 'smtp/email_detail.html'
    context_object_name = 'email'
    pk_url_kwarg = 'pk'

    def get_queryset(self):
        return super().get_queryset().select_related('template')
