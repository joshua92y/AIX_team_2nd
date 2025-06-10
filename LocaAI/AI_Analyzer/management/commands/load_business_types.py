from django.core.management.base import BaseCommand
from AI_Analyzer.models import BusinessType


class Command(BaseCommand):
    help = '업종 마스터 데이터를 로드합니다'

    def handle(self, *args, **options):
        business_types = [
            (0, '감성주점'),
            (1, '경양식'),
            (2, '관광호텔'),
            (3, '극장'),
            (4, '기타'),
            (5, '기타 휴게음식점'),
            (6, '김밥(도시락)'),
            (7, '까페'),
            (8, '냉면집'),
            (9, '다방'),
            (10, '떡카페'),
            (11, '라이브카페'),
            (12, '백화점'),
            (13, '복어취급'),
            (14, '분식'),
            (15, '뷔페식'),
            (16, '식육(숯불구이)'),
            (17, '아이스크림'),
            (18, '외국음식전문점(인도,태국등)'),
            (19, '유원지'),
            (20, '일반조리판매'),
            (21, '일식'),
            (22, '전통찻집'),
            (23, '정종/대포집/소주방'),
            (24, '중국식'),
            (25, '철도역구내'),
            (26, '출장조리'),
            (27, '커피숍'),
            (28, '키즈카페'),
            (29, '탕류(보신용)'),
            (30, '통닭(치킨)'),
            (31, '패밀리레스트랑'),
            (32, '패스트푸드'),
            (33, '편의점'),
            (34, '푸드트럭'),
            (35, '한식'),
            (36, '호프/통닭'),
            (37, '횟집'),
        ]

        for business_id, name in business_types:
            business_type, created = BusinessType.objects.get_or_create(
                id=business_id,
                defaults={'name': name}
            )
            if created:
                self.stdout.write(f'✅ 업종 추가: {name}')
            else:
                self.stdout.write(f'⏭️  업종 존재: {name}')

        self.stdout.write(
            self.style.SUCCESS('업종 마스터 데이터 로드 완료!')
        ) 