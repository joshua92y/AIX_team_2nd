from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import EmailMessage
from .serializers import EmailMessageSerializer, ContactEmailSerializer

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
