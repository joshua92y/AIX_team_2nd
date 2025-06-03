from django.db import models
from django.utils.text import slugify
from django.contrib.auth import get_user_model

User = get_user_model()

class Post(models.Model):
    BOARD_TYPES = (
        ('inquiry', '문의 게시판'),
        ('notice', '공지사항'),
    )
    
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', null=True, blank=True)
    description = models.TextField()
    file = models.FileField(upload_to='uploads/', null=True, blank=True)
    board_type = models.CharField(max_length=10, choices=BOARD_TYPES)
    is_private = models.BooleanField(default=False)  # 문의 게시판용 비공개 설정
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    guest_name = models.CharField(max_length=50, null=True, blank=True)
    guest_password = models.CharField(max_length=128, null=True, blank=True)
    views = models.PositiveIntegerField(default=0)  # 조회수 필드 추가
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Post.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def display_name(self):
        return self.author.username if self.author else self.guest_name

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    guest_name = models.CharField(max_length=50, null=True, blank=True)
    guest_password = models.CharField(max_length=128, null=True, blank=True)
    content = models.TextField()
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Comment by {self.display_name} on {self.post.title}'

    @property
    def display_name(self):
        return self.author.username if self.author else self.guest_name
