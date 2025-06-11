# Generated manually for AI prediction fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('locai', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysisresult',
            name='survival_probability',
            field=models.FloatField(default=0, verbose_name='생존 확률 (0-1)'),
        ),
        migrations.AddField(
            model_name='analysisresult',
            name='survival_percentage',
            field=models.FloatField(default=0, verbose_name='생존 확률 (%)'),
        ),
    ] 