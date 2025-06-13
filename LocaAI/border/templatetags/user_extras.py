from django import template

register = template.Library()

@register.filter
def is_admin_call(user):
    try:
        return user.is_authenticated and user.is_admin()
    except Exception:
        return False
