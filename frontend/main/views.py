import os
from django.conf import settings
from django.shortcuts import render

# Create your views here.
from django.shortcuts import render

def index(request):
    print("Template DIRS:", settings.TEMPLATES[0]['DIRS'])
    return render(request, 'index.html')

def blog(request):
    return render(request, 'blog.html')

def blog_detail(request):
    return render(request, 'blog-details.html')