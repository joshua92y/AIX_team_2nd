from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import User
import uuid
from django.contrib import messages
from .forms import UserRegistrationForm

# Create your views here.

@require_http_methods(["POST"])
def login_view(request):
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
                'session_token': str(user.session_token)
            })
    except User.DoesNotExist:
        pass
    
    return JsonResponse({'status': 'error', 'message': 'Invalid credentials'}, status=401)

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
