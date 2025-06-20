from django.core.management.base import BaseCommand
from django.db import connection, transaction
import geopandas as gpd
import pandas as pd
import os

class Command(BaseCommand):
    help = 'dong_store.gpkg 파일을 dong_store 테이블로 가져오기 (행정동별 업체 집계 데이터)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--file-path',
            type=str,
            default='dong_store.gpkg',
            help='GPKG 파일 경로 (기본값: dong_store.gpkg)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 저장하지 않고 테스트만 실행'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='기존 테이블이 있으면 삭제 후 재생성'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        dry_run = options['dry_run']
        force = options['force']
        
        # 파일 존재 확인
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"파일을 찾을 수 없습니다: {file_path}"))
            return
        
        self.stdout.write(f"dong_store.gpkg 파일 분석 시작: {file_path}")
        
        try:
            # GPKG 파일 읽기
            self.stdout.write("GPKG 파일 읽는 중...")
            gdf = gpd.read_file(file_path)
            
            self.stdout.write(f"GPKG 파일 정보:")
            self.stdout.write(f"  - 총 레코드 수: {len(gdf):,}개")
            self.stdout.write(f"  - 컬럼 수: {len(gdf.columns)}개")
            self.stdout.write(f"  - CRS: {gdf.crs}")
            self.stdout.write(f"  - 컬럼 목록: {list(gdf.columns)}")
            
            # 샘플 데이터 표시
            if len(gdf) > 0:
                sample = gdf.iloc[0]
                self.stdout.write(f"\n샘플 데이터 (첫 번째 레코드):")
                for col in gdf.columns:
                    self.stdout.write(f"  {col}: {sample[col]}")
            
            if dry_run:
                self.stdout.write(self.style.SUCCESS("DRY RUN 완료 - 데이터 구조 확인됨"))
                return
            
            # 데이터베이스 작업
            with connection.cursor() as cursor:
                # 기존 테이블 확인
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'dong_store'
                    );
                """)
                table_exists = cursor.fetchone()[0]
                
                if table_exists and force:
                    self.stdout.write(self.style.WARNING('기존 dong_store 테이블 삭제 중...'))
                    cursor.execute('DROP TABLE IF EXISTS dong_store;')
                    table_exists = False
                elif table_exists:
                    self.stdout.write(self.style.ERROR('dong_store 테이블이 이미 존재합니다. --force 옵션을 사용하세요.'))
                    return
                
                # dong_store 테이블 생성
                self.stdout.write(self.style.SUCCESS('dong_store 테이블 생성 중...'))
                
                # 컬럼 정보를 바탕으로 동적으로 테이블 생성
                create_table_sql = """
                    CREATE TABLE dong_store (
                        id SERIAL PRIMARY KEY,
                        emd_cd VARCHAR(8) UNIQUE,
                        emd_kor_nm VARCHAR(100),
                """
                
                # GPKG 컬럼을 기반으로 테이블 구조 생성
                for col in gdf.columns:
                    if col not in ['geometry', 'emd_cd', 'emd_kor_nm']:
                        if gdf[col].dtype in ['int64', 'int32']:
                            create_table_sql += f'        "{col}" INTEGER,\n'
                        elif gdf[col].dtype in ['float64', 'float32']:
                            create_table_sql += f'        "{col}" REAL,\n'
                        else:
                            create_table_sql += f'        "{col}" TEXT,\n'
                
                create_table_sql += """
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """
                
                cursor.execute(create_table_sql)
                self.stdout.write(self.style.SUCCESS('dong_store 테이블 생성 완료'))
                
                # 데이터 삽입
                self.stdout.write('데이터 삽입 중...')
                
                success_count = 0
                error_count = 0
                
                for idx, row in gdf.iterrows():
                    try:
                        # 컬럼과 값 준비
                        columns = ['emd_cd', 'emd_kor_nm']
                        values = [
                            row.get('emd_cd') or row.get('EMD_CD'),
                            row.get('emd_kor_nm') or row.get('EMD_KOR_NM')
                        ]
                        
                        # 나머지 컬럼 추가
                        for col in gdf.columns:
                            if col not in ['geometry', 'emd_cd', 'emd_kor_nm', 'EMD_CD', 'EMD_KOR_NM']:
                                columns.append(f'"{col}"')
                                value = row[col]
                                if pd.isna(value):
                                    values.append(None)
                                else:
                                    values.append(value)
                        
                        # SQL 실행
                        placeholders = ', '.join(['%s'] * len(values))
                        columns_str = ', '.join(columns)
                        
                        insert_sql = f"""
                            INSERT INTO dong_store ({columns_str})
                            VALUES ({placeholders})
                            ON CONFLICT (emd_cd) DO UPDATE SET
                                emd_kor_nm = EXCLUDED.emd_kor_nm,
                                updated_at = CURRENT_TIMESTAMP
                        """
                        
                        cursor.execute(insert_sql, values)
                        success_count += 1
                        
                        if success_count % 100 == 0:
                            self.stdout.write(f"처리 중: {success_count:,}개 완료")
                    
                    except Exception as e:
                        error_count += 1
                        if error_count <= 5:
                            self.stdout.write(self.style.WARNING(f"오류 (행 {idx}): {str(e)}"))
                
                self.stdout.write(self.style.SUCCESS(f"데이터 삽입 완료: 성공 {success_count:,}개, 오류 {error_count:,}개"))
                
                # 인덱스 생성
                self.stdout.write('인덱스 생성 중...')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_dong_store_emd_cd ON dong_store(emd_cd);')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_dong_store_emd_kor_nm ON dong_store(emd_kor_nm);')
                
                # 테이블 정보 확인
                cursor.execute('SELECT COUNT(*) FROM dong_store;')
                total_count = cursor.fetchone()[0]
                
                self.stdout.write(self.style.SUCCESS(f"dong_store 테이블 생성 완료: 총 {total_count:,}개 레코드"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"오류 발생: {str(e)}"))
            raise 