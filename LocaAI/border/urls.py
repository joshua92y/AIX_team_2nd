from django.urls import path
from . import views

app_name = 'border'

urlpatterns = [
    # 게시글 목록
    path('inquiry/', views.post_list, {'board_type': 'inquiry'}, name='inquiry_list'), # 문의 게시판
    path('notice/', views.post_list, {'board_type': 'notice'}, name='notice_list'),    # 공지사항 게시판
    path('portfolio/', views.post_list, {'board_type': 'portfolio'}, name='portfolio_list'), # 포트폴리오 게시판
    
    # 게시글 상세
    path('post/<int:pk>/', views.post_detail, name='post_detail'),
    
    # 게시글 작성
    path('post/create/<str:board_type>/', views.post_create, name='post_create'),
    
    # 게시글 수정
    path('post/<int:pk>/update/', views.post_update, name='post_update'),
    
    # 게시글 삭제
    path('post/<int:pk>/delete/', views.post_delete, name='post_delete'),
    
    # 댓글 삭제
    path('comment/<int:pk>/delete/', views.comment_delete, name='comment_delete'),
] 