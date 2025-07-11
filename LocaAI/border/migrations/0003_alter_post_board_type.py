# Generated by Django 5.2.1 on 2025-06-30 05:16

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("border", "0002_alter_post_board_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="post",
            name="board_type",
            field=models.CharField(
                choices=[
                    ("inquiry", "문의 게시판"),
                    ("notice", "공지사항"),
                    ("portfolio", "포트폴리오"),
                    ("topic", "토픽 게시판"),
                ],
                max_length=10,
            ),
        ),
    ]
