from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        USER = 'USER', 'User'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    session_token = models.UUIDField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.role})"

    def is_admin(self):
        return self.role == self.Role.ADMIN
