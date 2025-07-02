from django.contrib.auth import authenticate
from django.contrib.auth.views import PasswordResetCompleteView
from django.contrib.auth.views import PasswordResetConfirmView
from django.utils import translation
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import User
import uuid
from django.contrib import messages
from .forms import UserRegistrationForm
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.core.mail import send_mail
from django.utils.translation import activate, gettext as _
from main.views import set_language
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator

User = get_user_model()

@require_http_methods(["POST"])
def login_view(request):
    lang_code = request.session.get('django_language')
    if lang_code:
        translation.activate(lang_code)
        request.LANGUAGE_CODE = lang_code
        
    username = request.POST.get('username')
    password = request.POST.get('password')

    try:
        user = User.objects.get(username=username)
        if user.check_password(password):
            # Generate new session token
            user.session_token = uuid.uuid4()
            user.last_login_ip = request.META.get('REMOTE_ADDR')
            user.save()
            
            login(request, user)
            return JsonResponse({
                'status': 'success',
                'session_token': str(user.session_token),
                'redirect_url': request.POST.get('next') or '/'
            })
    except User.DoesNotExist:
        pass
    
    return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)


def login_page(request):
    session_lang = request.session.get('django_language', 'ko')

    lang_map = {
        'KOR': 'ko',
        'ENG': 'en',
        'ESP': 'es',
        'ko': 'ko',
        'en': 'en',
        'es': 'es',
    }
    lang_code = lang_map.get(session_lang, 'ko')

    translation.activate(lang_code)
    request.LANGUAGE_CODE = lang_code

    return render(request, 'custom_auth/login.html')

@login_required
def logout_view(request):
    user = request.user
    user.session_token = None
    user.save()
    logout(request)
    messages.success(request, '로그아웃되었습니다.')
    return redirect('index')

@login_required
def get_user_info(request):
    user = request.user
    return JsonResponse({
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'session_token': str(user.session_token) if user.session_token else None
    })

@login_required
def mypage(request):
    """
    마이페이지 - 사용자의 모든 활동 통합 관리
    
    Args:
        request: HTTP 요청 객체
        
    Returns:
        HttpResponse: 마이페이지 렌더링
    """
    user = request.user
    
    # 1. 분석 히스토리 가져오기
    try:
        from AI_Analyzer.models import AnalysisResult, AnalysisSession
        
        # 사용자의 분석 결과 (최근 10개)
        analysis_results = AnalysisResult.objects.filter(
            user=user
        ).select_related('request').order_by('-created_at')[:10]
        
        # 분석 통계
        total_analyses = AnalysisResult.objects.filter(user=user).count()
        if total_analyses > 0:
            from django.db.models import Avg, Max, Min
            analysis_stats = AnalysisResult.objects.filter(user=user).aggregate(
                avg_survival=Avg('survival_percentage'),
                max_survival=Max('survival_percentage'),
                min_survival=Min('survival_percentage')
            )
            
            # 가장 성과가 좋은/나쁜 분석
            best_analysis = AnalysisResult.objects.filter(user=user).order_by('-survival_percentage').first()
            worst_analysis = AnalysisResult.objects.filter(user=user).order_by('survival_percentage').first()
        else:
            analysis_stats = {'avg_survival': 0, 'max_survival': 0, 'min_survival': 0}
            best_analysis = None
            worst_analysis = None
            
        # 분석 세션 (AI 상담 세션)
        analysis_sessions = AnalysisSession.objects.filter(
            user=user
        ).order_by('-lastload_at')[:5]
        
    except ImportError:
        # AI_Analyzer 앱이 없는 경우
        analysis_results = []
        analysis_stats = {'avg_survival': 0, 'max_survival': 0, 'min_survival': 0}
        best_analysis = None
        worst_analysis = None
        analysis_sessions = []
        total_analyses = 0
    
    # 2. 챗봇 세션 가져오기
    try:
        from chatbot.models import ChatSession
        
        # 일반 챗봇 세션 (최근 5개)
        chat_sessions = ChatSession.objects.filter(
            user=user
        ).order_by('-lastload_at')[:5]
        
        total_chat_sessions = ChatSession.objects.filter(user=user).count()
        
    except ImportError:
        # chatbot 앱이 없는 경우
        chat_sessions = []
        total_chat_sessions = 0
    
    # 3. 게시판 작성글 가져오기
    try:
        from border.models import Notice, Inquiry
        
        # 공지사항 (관리자만 작성 가능한 경우가 많음)
        notices = Notice.objects.filter(author=user).order_by('-created_at')[:5] if user.is_staff else []
        
        # 문의사항
        inquiries = Inquiry.objects.filter(author=user).order_by('-created_at')[:5]
        
        total_notices = Notice.objects.filter(author=user).count() if user.is_staff else 0
        total_inquiries = Inquiry.objects.filter(author=user).count()
        
    except ImportError:
        # border 앱이 없는 경우
        notices = []
        inquiries = []
        total_notices = 0
        total_inquiries = 0
    
    # 4. 최근 활동 통합 (시간순 정렬)
    recent_activities = []
    
    # 분석 활동 추가
    for analysis in analysis_results[:3]:
        recent_activities.append({
            'type': 'analysis',
            'title': f'{analysis.request.address} 상권분석',
            'subtitle': f'생존율: {analysis.survival_percentage}%',
            'date': analysis.created_at,
            'url': f'/ai_analyzer/result/{analysis.request.id}/',
            'icon': 'bi-graph-up'
        })
    
    # 챗봇 세션 추가
    for session in chat_sessions[:3]:
        recent_activities.append({
            'type': 'chat',
            'title': session.title or '챗봇 상담',
            'subtitle': f'마지막 대화: {session.lastload_at.strftime("%m월 %d일")}',
            'date': session.lastload_at,
            'url': f'/chatbot/?session={session.session_id}',
            'icon': 'bi-chat-dots'
        })
    
    # 분석 상담 세션 추가
    for session in analysis_sessions[:3]:
        recent_activities.append({
            'type': 'analysis_chat',
            'title': session.title or '분석 상담',
            'subtitle': f'마지막 대화: {session.lastload_at.strftime("%m월 %d일")}',
            'date': session.lastload_at,
            'url': f'/ai_analyzer/analysis-session-log/{user.id}/{session.session_id}/',
            'icon': 'bi-chat-square-text'
        })
    
    # 문의글 추가
    for inquiry in inquiries[:3]:
        recent_activities.append({
            'type': 'inquiry',
            'title': inquiry.title,
            'subtitle': f'상태: {inquiry.get_status_display()}',
            'date': inquiry.created_at,
            'url': f'/border/inquiry/{inquiry.id}/',
            'icon': 'bi-question-circle'
        })
    
    # 시간순 정렬
    recent_activities.sort(key=lambda x: x['date'], reverse=True)
    recent_activities = recent_activities[:10]  # 최근 10개만
    
    context = {
        # 사용자 기본 정보
        'user': user,
        
        # 분석 관련
        'analysis_results': analysis_results,
        'analysis_stats': analysis_stats,
        'best_analysis': best_analysis,
        'worst_analysis': worst_analysis,
        'analysis_sessions': analysis_sessions,
        'total_analyses': total_analyses,
        
        # 챗봇 관련
        'chat_sessions': chat_sessions,
        'total_chat_sessions': total_chat_sessions,
        
        # 게시판 관련
        'notices': notices,
        'inquiries': inquiries,
        'total_notices': total_notices,
        'total_inquiries': total_inquiries,
        
        # 통합 활동
        'recent_activities': recent_activities,
        
        # 전체 통계
        'total_activities': total_analyses + total_chat_sessions + total_inquiries + total_notices,
    }
    
    return render(request, 'custom_auth/mypage.html', context)

def register(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return JsonResponse({
                'success': True,
                'redirect_url': '/'  # ✅ 여기에 리다이렉트할 경로 지정!
            })
        else:
            error_message = next(iter(form.errors.values()))[0]
            return JsonResponse({'success': False, 'error': error_message})
    return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})

class PasswordResetRequestView(APIView):
    """비밀번호 초기화 요청 뷰 (ID or 이메일 기반)"""

    def post(self, request):
        identifier = request.data.get('identifier')  # ID 또는 이메일
        if not identifier:
            return Response({"detail": "ID 또는 이메일을 입력해주세요."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=identifier)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email=identifier)
            except User.DoesNotExist:
                return Response({"detail": "해당 유저를 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        # 비밀번호 재설정 링크 생성
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        path = reverse('custom_auth:password_reset_confirm', kwargs={'uidb64': uid, 'token': token})
        session_lang = request.session.get('django_language', 'ko')

        lang_map = {
            'KOR': 'ko',
            'ENG': 'en',
            'ESP': 'es',
            'ko': 'ko',
            'en': 'en',
            'es': 'es',
        }
        lang = lang_map.get(session_lang, 'ko')
        reset_url = request.build_absolute_uri(f"{path}?lang={lang}")

        # 언어 활성화
        activate(lang)
        request.LANGUAGE_CODE = lang

        # 이메일 전송
        send_mail(
            subject=_("Password Reset Instructions"),
            message=_("To reset your password, click the following link:") + f"\n{reset_url}",
            from_email=None,  # 기본 이메일 설정 사용
            recipient_list=[user.email],
        )

        return Response({"detail": "비밀번호 초기화 링크가 이메일로 전송되었습니다."}, status=status.HTTP_200_OK)

def password_reset_confirm(request, uidb64, token):
    lang_param = request.GET.get('lang')
    if lang_param in ['ko', 'en', 'es']:
        activate(lang_param)
        request.LANGUAGE_CODE = lang_param
        request.session['django_language'] = lang_param
    return CustomPasswordResetConfirmView.as_view()(request, uidb64=uidb64, token=token)

class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    def dispatch(self, request, *args, **kwargs):
        lang_param = request.GET.get('lang')
        if lang_param in ['ko', 'en', 'es']:
            activate(lang_param)
            request.LANGUAGE_CODE = lang_param
            request.session['django_language'] = lang_param
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        lang = self.request.session.get('django_language', 'ko')
        if lang in ['ko', 'en', 'es']:
            activate(lang)
            self.request.LANGUAGE_CODE = lang
        return context

class CustomPasswordResetCompleteView(PasswordResetCompleteView):
    def dispatch(self, request, *args, **kwargs):
        lang_param = request.session.get('django_language', 'ko')
        if lang_param in ['ko', 'en', 'es']:
            activate(lang_param)
            request.LANGUAGE_CODE = lang_param
        return super().dispatch(request, *args, **kwargs)
    
    