# Generated by Django 5.2.3 on 2025-06-17 09:11

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("GeoDB", "0003_storeresult"),
    ]

    operations = [
        migrations.AddField(
            model_name="storeresult",
            name="emd_kor_nm",
            field=models.CharField(
                blank=True, max_length=100, null=True, verbose_name="행정동명"
            ),
        ),
    ]
