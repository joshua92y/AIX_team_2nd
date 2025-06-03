from django.shortcuts import render
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import User
import uuid

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
@require_http_methods(["POST"])
def logout_view(request):
    user = request.user
    user.session_token = None
    user.save()
    logout(request)
    return JsonResponse({'status': 'success'})

@login_required
def get_user_info(request):
    user = request.user
    return JsonResponse({
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'session_token': str(user.session_token) if user.session_token else None
    })
