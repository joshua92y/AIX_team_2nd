from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'dong_store 테이블 상태 확인'
    
    def handle(self, *args, **options):
        cursor = connection.cursor()
        
        # 총 레코드 수
        cursor.execute('SELECT COUNT(*) FROM dong_store')
        total_count = cursor.fetchone()[0]
        self.stdout.write(f'총 레코드 수: {total_count:,}')
        
        # EMD_KOR_NM이 있는 레코드 수
        cursor.execute('SELECT COUNT(*) FROM dong_store WHERE "EMD_KOR_NM" IS NOT NULL')
        with_emd_count = cursor.fetchone()[0]
        self.stdout.write(f'행정동 이름이 있는 레코드: {with_emd_count:,}')
        
        # 샘플 행정동 이름들
        cursor.execute('SELECT "EMD_KOR_NM" FROM dong_store WHERE "EMD_KOR_NM" IS NOT NULL LIMIT 5')
        results = cursor.fetchall()
        self.stdout.write('샘플 행정동 이름들:')
        for i, result in enumerate(results, 1):
            self.stdout.write(f'  {i}. {result[0]}')
        
        # 행정동별 점포 수 (상위 5개)
        cursor.execute('''
            SELECT "EMD_KOR_NM", COUNT(*) 
            FROM dong_store 
            WHERE "EMD_KOR_NM" IS NOT NULL 
            GROUP BY "EMD_KOR_NM" 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
        ''')
        results = cursor.fetchall()
        self.stdout.write('\n행정동별 점포 수 (상위 5개):')
        for dong, count in results:
            self.stdout.write(f'  {dong}: {count:,}개')
        
        # 좌표 정보 확인
        cursor.execute('SELECT COUNT(*) FROM dong_store WHERE "X" IS NOT NULL AND "Y" IS NOT NULL')
        coord_count = cursor.fetchone()[0]
        self.stdout.write(f'\n좌표 정보가 있는 레코드: {coord_count:,}')
        
        # 샘플 레코드 확인
        cursor.execute('''
            SELECT "BPLCNM", "UPTAENM", "EMD_KOR_NM", "X", "Y" 
            FROM dong_store 
            WHERE "EMD_KOR_NM" IS NOT NULL 
            LIMIT 3
        ''')
        results = cursor.fetchall()
        self.stdout.write('\n샘플 레코드:')
        for i, (상호명, 업종, 행정동, x, y) in enumerate(results, 1):
            self.stdout.write(f'  {i}. {상호명} ({업종}) - {행정동} ({x}, {y})') 