from django.shortcuts import render, redirect
from django.contrib.auth import login
from .forms import CustomUserCreationForm

def register(request):
    if request.method == "POST":
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)  # 자동 로그인
            return redirect('index')  # 회원가입 후 이동
    else:
        form = CustomUserCreationForm()
    return render(request, 'register.html', {'form': form})
