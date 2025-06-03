from django import forms
from django.contrib.auth.hashers import make_password
from .models import Post, Comment

class PostForm(forms.ModelForm):
    guest_name = forms.CharField(
        label='이름',
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    guest_password = forms.CharField(
        label='비밀번호',
        required=False,
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )
    title = forms.CharField(
        label='제목',
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    description = forms.CharField(
        label='내용',
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 10})
    )
    is_private = forms.BooleanField(
        required=False,
        label='비공개',
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})
    )
    board_type = forms.CharField(
        widget=forms.HiddenInput(),
        required=False
    )
    thumbnail = forms.ImageField(
        label='썸네일',
        required=False,
        widget=forms.FileInput(attrs={'class': 'form-control'})
    )
    file = forms.FileField(
        label='첨부파일',
        required=False,
        widget=forms.FileInput(attrs={'class': 'form-control'})
    )

    class Meta:
        model = Post
        fields = ['title', 'thumbnail', 'description', 'file', 'is_private', 'guest_name', 'guest_password', 'board_type']

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)  # user 객체를 kwargs에서 추출
        super().__init__(*args, **kwargs)
        
        if self.instance and self.instance.pk:
            
            self.fields['guest_name'].initial = self.instance.guest_name
            self.fields['title'].initial = self.instance.title
            self.fields['description'].initial = self.instance.description
            self.fields['is_private'].initial = self.instance.is_private

    def clean(self):
        print("\n=== PostForm clean 메서드 시작 ===")
        cleaned_data = super().clean()
        print("기본 cleaned_data:")
        for key, value in cleaned_data.items():
            print(f"{key}: {value}")

        board_type = cleaned_data.get('board_type')
        if not board_type and self.instance:
            board_type = self.instance.board_type
        print(f"\n게시판 유형: {board_type}")

        guest_name = cleaned_data.get('guest_name')
        new_guest_password = cleaned_data.get('guest_password')

        # 회원인 경우 게스트 정보 제거
        if self.user and self.user.is_authenticated:
            print("회원 게시글 처리")
            cleaned_data['guest_name'] = None
            cleaned_data['guest_password'] = None
            return cleaned_data

        # 비회원인 경우에만 게스트 정보 처리
        if board_type == 'inquiry':
            print("\n문의게시판 처리 (비회원)")
            if not self.instance:  # 새로운 게시글 작성
                print("새 게시글 작성")
                if not guest_name:
                    print("게스트 이름 누락")
                    self.add_error('guest_name', '비회원 게시글에서는 이름을 입력해야 합니다.')
                if not new_guest_password:
                    print("비밀번호 누락")
                    self.add_error('guest_password', '비회원 게시글에서는 비밀번호를 입력해야 합니다.')
                elif new_guest_password:
                    print("새 비밀번호 해시화")
                    cleaned_data['guest_password'] = make_password(new_guest_password)
            elif not self.instance.author:  # 비회원 게시글 수정
                print("비회원 게시글 수정")
                if not guest_name:
                    print("게스트 이름 누락")
                    self.add_error('guest_name', '비회원 게시글에서는 이름을 입력해야 합니다.')
                
                if new_guest_password:
                    print("새 비밀번호 해시화")
                    cleaned_data['guest_password'] = make_password(new_guest_password)
                else:
                    print("기존 비밀번호 유지")
                    cleaned_data['guest_password'] = self.instance.guest_password

        if board_type:
            cleaned_data['board_type'] = board_type

        print("\n최종 cleaned_data:")
        for key, value in cleaned_data.items():
            print(f"{key}: {value}")
        return cleaned_data

class CommentForm(forms.ModelForm):
    guest_name = forms.CharField(
        label='이름',
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-control'})
    )
    guest_password = forms.CharField(
        label='비밀번호',
        required=False,
        widget=forms.PasswordInput(attrs={'class': 'form-control'})
    )
    content = forms.CharField(
        label='내용',
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 3})
    )

    class Meta:
        model = Comment
        fields = ['content']

    def clean(self):
        cleaned_data = super().clean()
        post = self.initial.get('post')
        user = getattr(self, 'user', None) # Get user from self, passed from view

        # For notice board, only authenticated users can comment
        if post and post.board_type == 'notice':
            if not user or not user.is_authenticated:
                raise forms.ValidationError('공지사항에는 회원만 댓글을 작성할 수 있습니다.')

        # For inquiry board or any board if user is not authenticated, require guest info
        if not user or not user.is_authenticated:
            guest_name = cleaned_data.get('guest_name')
            guest_password = cleaned_data.get('guest_password')

            if not guest_name:
                self.add_error('guest_name', '이름을 입력해주세요.') # Use add_error for specific field
            if not guest_password:
                self.add_error('guest_password', '비밀번호를 입력해주세요.')

            if guest_password: # Hash password if provided
                cleaned_data['guest_password'] = make_password(guest_password)

        return cleaned_data


class PostSearchForm(forms.Form):
    SEARCH_CHOICES = (
        ('title', '제목'),
        ('content', '내용'),
        ('author', '작성자'),
        ('title_content', '제목+내용'),
    )
    search_type = forms.ChoiceField(choices=SEARCH_CHOICES)
    search_text = forms.CharField(required=False) 