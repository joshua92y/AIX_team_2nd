from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import EmailMessage
from .serializers import EmailMessageSerializer, ContactEmailSerializer,NewsletterSubscribeSerializer,NewsletterUnsubscribeSerializer
from django.shortcuts import render, redirect
from smtp.utils import send_subscription_email

class EmailMessageViewSet(viewsets.ModelViewSet):
    queryset = EmailMessage.objects.all()
    serializer_class = EmailMessageSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """실패한 이메일 재전송"""
        email = self.get_object()
        try:
            email.retry()
            return Response({'detail': '이메일이 성공적으로 재전송되었습니다.'})
        except Exception as e:
            return Response(
                {'detail': '재전송 실패', 'reason': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """대기중 이메일 발송"""
        email = self.get_object()
        try:
            email.send()
            return Response({'detail': '이메일이 성공적으로 발송되었습니다.'})
        except Exception as e:
            return Response(
                {'detail': '발송 실패', 'reason': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class ContactEmailView(APIView):
    """문의 메일 전송을 위한 뷰"""
    permission_classes = [AllowAny]
    serializer_class = ContactEmailSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            try:
                # 이메일 메시지 생성
                email = EmailMessage.objects.create(
                    subject=serializer.validated_data['subject'],
                    message=serializer.validated_data['message'],
                    recipient=serializer.validated_data['recipient'],
                    sender=serializer.validated_data['sender'],
                    status='pending'
                )
                # 이메일 전송
                email.send()
                return Response({
                    'detail': '문의 메일이 성공적으로 전송되었습니다.',
                    'email_id': str(email.id)
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    'detail': '문의 메일 전송에 실패했습니다.',
                    'reason': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NewsletterSubscribeView(APIView):
    """뉴스레터 구독 신청"""
    def post(self, request):
        serializer = NewsletterSubscribeSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            subscriber = serializer.save()
            print("==== 뉴스레터 구독 처리 완료 ====")
            return Response(
                {'message': f"{subscriber.email} 님, 구독이 완료되었습니다."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NewsletterUnsubscribeView(APIView):
    """GET/POST 구독 해지 통합 뷰"""

    def get(self, request):
        return self._handle_unsubscribe(request, method="GET")

    def post(self, request):
        return self._handle_unsubscribe(request, method="POST")

    def _handle_unsubscribe(self, request, method):
        data = request.query_params if method == "GET" else request.data
        serializer = NewsletterUnsubscribeSerializer(data=data, context={"method": method})
        
        if serializer.is_valid():
            subscriber = serializer.save()

            if method == "GET":
                # ✅ 이메일 링크로 들어온 경우: 리디렉트
                return redirect("smtp:newsletter_unsubscribe_done")
            else:
                # ✅ 마이페이지에서 POST로 해지한 경우: 메시지만 JSON 응답
                return Response(
                    {'message': f"{subscriber.email} 님, 구독이 해지되었습니다."},
                    status=status.HTTP_200_OK
                )

        # 검증 실패 시
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

def unsubscribe_done(request):
    """구독 해지 완료 페이지"""
    return render(request, "newsletter/unsubscribe_done.html")