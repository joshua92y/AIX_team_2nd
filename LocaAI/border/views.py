from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Post, Comment
from .forms import PostForm, CommentForm, PostSearchForm

def post_list(request, board_type):
    # 검색 처리
    search_query = request.GET.get('search', '')
    posts = Post.objects.filter(board_type=board_type)
    
    if search_query:
        posts = posts.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(author__username__icontains=search_query) |
            Q(guest_name__icontains=search_query)
        )
    
    # 정렬 및 페이지네이션
    posts = posts.order_by('-created_at')
    paginator = Paginator(posts, 10)  # 페이지당 10개 게시글
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'border/post_list.html', {
        'posts': page_obj,
        'board_type': board_type,
    })

def post_detail(request, pk):
    post = get_object_or_404(Post, pk=pk)
    
    # 비공개 게시글 접근 제한
    if post.board_type == 'inquiry' and post.is_private:
        if not request.user.is_authenticated:
            # 비밀번호 확인이 필요한 경우
            if request.method == 'POST':
                password = request.POST.get('password')
                print(f"입력된 비밀번호: {password}")
                print(f"저장된 비밀번호: {post.guest_password}")
                
                # 비밀번호가 해시화되지 않은 경우를 위해 해시화
                if not post.guest_password.startswith('pbkdf2_sha256$'):
                    print("비밀번호 해시화 필요")
                    post.guest_password = make_password(post.guest_password)
                    post.save()
                    print(f"해시화된 비밀번호: {post.guest_password}")
                
                # 비밀번호 확인
                is_valid = check_password(password, post.guest_password)
                print(f"비밀번호 확인 결과: {is_valid}")
                
                if not is_valid:
                    print("비밀번호 불일치")
                    messages.error(request, '비밀번호가 일치하지 않습니다.')
                    return render(request, 'border/post_detail.html', {
                        'post': post,
                        'show_password_form': True
                    })
            else:
                # 비밀번호 입력 폼 표시
                return render(request, 'border/post_detail.html', {
                    'post': post,
                    'show_password_form': True
                })
        elif not (request.user.role == 'admin' or post.author == request.user):
            messages.error(request, '비공개 게시글에 접근할 수 없습니다.')
            return redirect('border:inquiry_list')
    
    # 조회수 증가
    post.views += 1
    post.save()
    
    # 댓글 목록 가져오기
    comments = post.comments.all().order_by('-created_at')
    
    # 댓글 폼 초기화
    comment_form = CommentForm(initial={'post': post})
    comment_form.user = request.user  # user 객체 전달
    
    if request.method == 'POST':
        comment_form = CommentForm(request.POST)
        comment_form.user = request.user  # user 객체 전달
        if comment_form.is_valid():
            comment = comment_form.save(commit=False)
            comment.post = post
            if request.user.is_authenticated:
                comment.author = request.user
            else:
                comment.guest_name = comment_form.cleaned_data['guest_name']
                comment.guest_password = comment_form.cleaned_data['guest_password']
            comment.save()
            messages.success(request, '댓글이 등록되었습니다.')
            return redirect('border:post_detail', pk=pk)
    
    return render(request, 'border/post_detail.html', {
        'post': post,
        'comments': comments,
        'comment_form': comment_form
    })

def post_create(request, board_type):
    # 공지사항 작성 권한 체크
    if board_type == 'notice' and not (request.user.is_authenticated and request.user.is_admin()):
        messages.error(request, '공지사항은 관리자만 작성할 수 있습니다.')
        return redirect('border:notice_list' if board_type == 'notice' else 'border:inquiry_list')
    
    if request.method == 'POST':
        form = PostForm(request.POST, request.FILES, user=request.user)  # user 객체를 kwargs로 전달
        if form.is_valid():
            post = form.save(commit=False)
            post.board_type = board_type
            if request.user.is_authenticated:
                post.author = request.user
            else:
                post.guest_name = form.cleaned_data['guest_name']
                post.guest_password = form.cleaned_data['guest_password']
            post.save()
            messages.success(request, '게시글이 등록되었습니다.')
            return redirect('border:post_detail', pk=post.pk)
    else:
        form = PostForm(initial={'board_type': board_type}, user=request.user)  # user 객체를 kwargs로 전달
    return render(request, 'border/post_form.html', {'form': form, 'board_type': board_type})

def post_update(request, pk):
    post = get_object_or_404(Post, pk=pk)

    # 권한 체크 (existing logic remains)
    if post.board_type == 'notice':
        if not (request.user.is_authenticated and request.user.is_admin()):
            print("공지사항 수정 권한 없음")
            messages.error(request, '공지사항은 관리자만 수정할 수 있습니다.')
            return redirect('border:post_detail', pk=pk)
    else:  # inquiry
        if request.user.is_authenticated:
            if post.author != request.user and not request.user.is_admin():
                print("일반 게시글 수정 권한 없음 (인증된 사용자)")
                messages.error(request, '수정 권한이 없습니다.')
                return redirect('border:post_detail', pk=pk)
        else: # Unauthenticated user (guest)
            if not post.guest_password:
                print("비회원 게시글 비밀번호 없음 (수정 불가능)")
                messages.error(request, '비회원 게시글만 수정할 수 있습니다. 비밀번호가 설정되어 있지 않습니다.')
                return redirect('border:post_detail', pk=pk)

            # Check if this is the password verification step
            if request.method == 'POST' and 'password' in request.POST and 'guest_name' not in request.POST:
                password = request.POST.get('password')
                print("\n=== 비밀번호 확인 요청 ===")
                print(f"입력된 비밀번호: {password}")

                # Ensure stored password is hashed before comparison (defensive)
                if post.guest_password and not post.guest_password.startswith('pbkdf2_sha256$'):
                    print("비밀번호 해시화 필요 (비교 전)")
                    post.guest_password = make_password(post.guest_password)
                    post.save() # Save the hashed password to DB
                    print(f"해시화된 비밀번호 저장됨: {post.guest_password}")
                else:
                    print(f"저장된 비밀번호: {post.guest_password}")

                is_valid = check_password(password, post.guest_password)
                print(f"비밀번호 확인 결과: {is_valid}")

                if not is_valid:
                    print("비밀번호 불일치")
                    messages.error(request, '비밀번호가 일치하지 않습니다.')
                    return render(request, 'border/post_form.html', {
                        'form': PostForm(instance=post), # Still provide instance for correct form fields
                        'board_type': post.board_type,
                        'post': post,
                        'show_password_form': True,
                        'password_error': True # For displaying error message
                    })
                print("비밀번호 확인 성공. 게시글 수정 폼 로드.")
                # Password is valid, proceed to load the actual edit form (GET-like behavior)
                form = PostForm(instance=post) # ModelForm correctly populates fields from instance
                return render(request, 'border/post_form.html', {
                    'form': form,
                    'board_type': post.board_type,
                    'post': post,
                    'show_password_form': False # Hide password form
                })
            elif request.method == 'GET':
                print("비회원 게시글 수정 - 비밀번호 입력 폼 표시")
                return render(request, 'border/post_form.html', {
                    'form': PostForm(instance=post), # Instance needed to determine guest_name, etc. for form init
                    'board_type': post.board_type,
                    'post': post,
                    'show_password_form': True
                })

    # --- Main Form Handling (after any password checks and if not rendering password form) ---
    if request.method == 'POST':
        print("\n=== 메인 폼 제출 처리 ===")
        print("POST 데이터:", request.POST)
        print("FILES 데이터:", request.FILES)

        form = PostForm(request.POST, request.FILES, instance=post)
        print("PostForm 인스턴스화 완료.")

        if form.is_valid():
            print("\n=== 폼 유효성 검사 통과 ===")
            print("cleaned_data:", form.cleaned_data)

            # The guest_password handling is now entirely within PostForm's clean method.
            # form.save() will use the guest_password from form.cleaned_data.
            try:
                post = form.save() # Directly save the post
                print("\n게시글 저장 성공")
                messages.success(request, '게시글이 수정되었습니다.')
                return redirect('border:post_detail', pk=pk)
            except Exception as e:
                print(f"\n게시글 저장 실패: {str(e)}")
                messages.error(request, '게시글 수정 중 오류가 발생했습니다.')
        else:
            print("\n=== 폼 유효성 검사 실패 ===")
            print("폼 에러:", form.errors)
    else: # Initial GET request for authenticated users or after guest password validation
        print("\n=== 폼 초기화 (GET 요청 또는 비밀번호 확인 후) ===")
        form = PostForm(instance=post) # This correctly populates fields from the existing post object
        print("기존 게시글 데이터로 폼 초기화 완료")

    return render(request, 'border/post_form.html', {
        'form': form,
        'board_type': post.board_type,
        'post': post,
        'show_password_form': False # Explicitly hide if we are here
    })

def post_delete(request, pk):
    post = get_object_or_404(Post, pk=pk)
    
    # 권한 체크
    if post.board_type == 'notice':
        if not (request.user.is_authenticated and request.user.is_admin()):
            messages.error(request, '공지사항은 관리자만 삭제할 수 있습니다.')
            return redirect('border:post_detail', pk=pk)
    else:  # inquiry
        if request.user.is_authenticated:
            if post.author != request.user and not request.user.is_admin():
                messages.error(request, '삭제 권한이 없습니다.')
                return redirect('border:post_detail', pk=pk)
        else:
            if not post.guest_password:
                messages.error(request, '비회원 게시글만 삭제할 수 있습니다.')
                return redirect('border:post_detail', pk=pk)
            if request.method == 'POST':
                password = request.POST.get('password')
                # 비밀번호가 해시화되지 않은 경우를 위해 해시화
                if not post.guest_password.startswith('pbkdf2_sha256$'):
                    post.guest_password = make_password(post.guest_password)
                    post.save()
                
                if not check_password(password, post.guest_password):
                    messages.error(request, '비밀번호가 일치하지 않습니다.')
                    return redirect('border:post_detail', pk=pk)
    
    if request.method == 'POST':
        post.delete()
        messages.success(request, '게시글이 삭제되었습니다.')
        return redirect('border:notice_list' if post.board_type == 'notice' else 'border:inquiry_list')
    return render(request, 'border/post_confirm_delete.html', {'post': post})

def comment_delete(request, pk):
    comment = get_object_or_404(Comment, pk=pk)
    
    # 권한 체크
    if request.user.is_authenticated:
        if comment.author != request.user and not request.user.role == 'admin':
            print("댓글 삭제 권한 없음 (인증된 사용자)")
            messages.error(request, '삭제 권한이 없습니다.')
            return redirect('border:post_detail', pk=comment.post.pk)
    else:  # 비회원
        if not comment.guest_password:
            print("비회원 댓글 비밀번호 없음 (삭제 불가능)")
            messages.error(request, '비회원 댓글만 삭제할 수 있습니다. 비밀번호가 설정되어 있지 않습니다.')
            return redirect('border:post_detail', pk=comment.post.pk)
        
        # 비밀번호 확인이 필요한 경우
        if request.method == 'POST' and 'password' in request.POST:
            password = request.POST.get('password')
            print("\n=== 비밀번호 확인 요청 ===")
            print(f"입력된 비밀번호: {password}")
            
            # 비밀번호가 해시화되지 않은 경우를 위해 해시화
            if comment.guest_password and not comment.guest_password.startswith('pbkdf2_sha256$'):
                print("비밀번호 해시화 필요 (비교 전)")
                comment.guest_password = make_password(comment.guest_password)
                comment.save()
                print(f"해시화된 비밀번호 저장됨: {comment.guest_password}")
            else:
                print(f"저장된 비밀번호: {comment.guest_password}")
            
            is_valid = check_password(password, comment.guest_password)
            print(f"비밀번호 확인 결과: {is_valid}")
            
            if not is_valid:
                print("비밀번호 불일치")
                messages.error(request, '비밀번호가 일치하지 않습니다.')
                return render(request, 'border/comment_confirm_delete.html', {
                    'comment': comment,
                    'password_error': True,
                    'show_password_form': True
                })
            print("비밀번호 확인 성공. 댓글 삭제 진행.")
            comment.delete()
            messages.success(request, '댓글이 삭제되었습니다.')
            return redirect('border:post_detail', pk=comment.post.pk)
    
    # GET 요청이거나 비밀번호 확인이 필요한 경우
    if request.method == 'GET' or (not request.user.is_authenticated and not request.POST.get('password')):
        return render(request, 'border/comment_confirm_delete.html', {
            'comment': comment,
            'password_error': False,
            'show_password_form': comment.author is None and bool(comment.guest_password)
        })
    
    # 인증된 사용자의 경우
    if request.method == 'POST':
        comment.delete()
        messages.success(request, '댓글이 삭제되었습니다.')
        return redirect('border:post_detail', pk=comment.post.pk)
    
    print("인증된 사용자 - 삭제 확인 폼 표시")
    return render(request, 'border/comment_confirm_delete.html', {
        'comment': comment,
        'password_error': False,
        'show_password_form': False
    })
