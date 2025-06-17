import os
import pandas as pd
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from AI_Analyzer.models import BusinessType, AnalysisRequest, AnalysisResult
from custom_auth.models import User
from decimal import Decimal
import re


class Command(BaseCommand):
    help = 'CSV 파일에서 상점 예측 데이터를 가져와 데이터베이스에 저장합니다.'

    def safe_float(self, value, default=0.0):
        """안전한 float 변환"""
        try:
            if pd.isna(value) or value == '' or str(value).strip() in ['nan', '-', ' - ', 'NaN', 'null']:
                return default
            return float(value)
        except (ValueError, TypeError):
            return default
    
    def safe_int(self, value, default=0):
        """안전한 int 변환"""
        try:
            if pd.isna(value) or value == '' or str(value).strip() in ['nan', '-', ' - ', 'NaN', 'null']:
                return default
            return int(float(value))
        except (ValueError, TypeError):
            return default

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default='store_data_with_predictions.csv',
            help='가져올 CSV 파일 경로 (기본값: store_data_with_predictions.csv)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='배치 처리 크기 (기본값: 1000)'
        )

    def handle(self, *args, **options):
        file_path = options['file']
        batch_size = options['batch_size']
        
        # 파일 경로 설정
        if not os.path.isabs(file_path):
            file_path = os.path.join(settings.BASE_DIR, file_path)
        
        if not os.path.exists(file_path):
            raise CommandError(f'파일을 찾을 수 없습니다: {file_path}')
        
        self.stdout.write(f'CSV 파일 로드 중: {file_path}')
        
        try:
            # CSV 파일 읽기
            df = pd.read_csv(file_path, low_memory=False)
            self.stdout.write(f'총 {len(df)}개의 레코드를 발견했습니다.')
            
            # 기본 사용자 생성 또는 가져오기
            admin_user, created = User.objects.get_or_create(
                username='system_import',
                defaults={
                    'email': 'system@example.com',
                    'is_staff': False,
                    'is_active': True
                }
            )
            if created:
                self.stdout.write('시스템 사용자를 생성했습니다.')
            
            # 기본 업종 생성 또는 가져오기
            business_types = {}
            
            # 데이터 처리 및 저장
            success_count = 0
            error_count = 0
            
            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        # 업종명 처리 (한글 깨짐 문제 해결)
                        uptaenm = str(row.get('UPTAENM', '기타')).strip()
                        if uptaenm == 'nan' or not uptaenm or '?' in uptaenm:
                            uptaenm = '기타'
                        
                        # 업종 생성 또는 가져오기
                        if uptaenm not in business_types:
                            business_type, created = BusinessType.objects.get_or_create(
                                name=uptaenm,
                                defaults={'id': len(business_types) + 1}
                            )
                            business_types[uptaenm] = business_type
                            if created:
                                self.stdout.write(f'새 업종 생성: {uptaenm}')
                        
                        business_type = business_types[uptaenm]
                        
                        # 좌표 변환 (WGS84로 변환 필요시)
                        x_coord = self.safe_float(row.get('X', 0))
                        y_coord = self.safe_float(row.get('Y', 0))
                        
                        # 간단한 좌표 변환 (EPSG:5186 -> WGS84 근사치)
                        # 실제 프로젝트에서는 정확한 좌표 변환 라이브러리 사용 권장
                        longitude = x_coord / 100000  # 임시 변환
                        latitude = y_coord / 100000   # 임시 변환
                        
                        # 주소 생성 (좌표 기반)
                        address = f"서울시 좌표({x_coord:.0f}, {y_coord:.0f})"
                        
                        # AnalysisRequest 생성
                        analysis_request = AnalysisRequest.objects.create(
                            user=admin_user,
                            address=address,
                            area=self.safe_float(row.get('Area', 0)),
                            business_type=business_type,
                            service_type=self.safe_int(row.get('Service', 0)),
                            longitude=longitude,
                            latitude=latitude,
                            x_coord=x_coord,
                            y_coord=y_coord
                        )
                        
                        # AnalysisResult 생성
                        result_value = row.get('result', 0)
                        survival_prob = self.safe_float(result_value)
                        survival_percentage = survival_prob * 100
                        
                        AnalysisResult.objects.create(
                            request=analysis_request,
                            user=admin_user,
                            
                            # 생활인구 관련 (1000m 반경)
                            life_pop_300m=self.safe_int(row.get('1A_Total', 0)),
                            life_pop_20_300m=self.safe_float(row.get('1A_20', 0)) * 100,
                            life_pop_30_300m=self.safe_float(row.get('1A_30', 0)) * 100,
                            life_pop_40_300m=self.safe_float(row.get('1A_40', 0)) * 100,
                            life_pop_50_300m=self.safe_float(row.get('1A_50', 0)) * 100,
                            life_pop_60_300m=self.safe_float(row.get('1A_60', 0)) * 100,
                            
                            # 생활인구 관련 (300m 반경)
                            life_pop_20_1000m=self.safe_float(row.get('2A_20', 0)) * 100,
                            life_pop_30_1000m=self.safe_float(row.get('2A_30', 0)) * 100,
                            life_pop_40_1000m=self.safe_float(row.get('2A_40', 0)) * 100,
                            life_pop_50_1000m=self.safe_float(row.get('2A_50', 0)) * 100,
                            life_pop_60_1000m=self.safe_float(row.get('2A_60', 0)) * 100,
                            
                            # 외국인 관련
                            temp_foreign_1000m=self.safe_int(row.get('2A_Temp_Total', 0)),
                            temp_foreign_cn_300m=self.safe_float(row.get(' 1A_Temp_CN ', 0)) * 100,
                            temp_foreign_cn_1000m=self.safe_float(row.get(' 2A_Temp_CN ', 0)) * 100,
                            
                            long_foreign_300m=self.safe_int(row.get('1A_Long_Total', 0)),
                            long_foreign_1000m=self.safe_int(row.get('2A_Long_Total', 0)),
                            long_foreign_cn_1000m=self.safe_float(row.get(' 2A_Long_CN ', 0)) * 100,
                            
                            # 직장인구
                            working_pop_300m=self.safe_int(row.get('Working_Pop', 0)),
                            
                            # 주변 시설
                            public_building_250m=self.safe_int(row.get('PubBuilding', 0)),
                            school_250m=self.safe_int(row.get('School', 0)),
                            
                            # 상권 분석
                            competitor_300m=self.safe_int(row.get('Competitor_C', 0)),
                            adjacent_biz_300m=self.safe_int(row.get('Adjacent_BIZ', 0)),
                            competitor_ratio_300m=self.safe_float(row.get(' Competitor_R ', 0)) * 100,
                            business_diversity_300m=self.safe_int(row.get('Business_D', 0)),
                            
                            # 면적 및 서비스
                            area=self.safe_float(row.get('Area', 0)),
                            service_type=self.safe_int(row.get('Service', 0)),
                            
                            # 공시지가
                            total_land_value=self.safe_float(row.get('Total_LV', 0)),
                            
                            # AI 예측 결과
                            survival_probability=survival_prob,
                            survival_percentage=survival_percentage
                        )
                        
                        success_count += 1
                        
                        if success_count % batch_size == 0:
                            self.stdout.write(f'{success_count}개 레코드 처리 완료...')
                    
                    except Exception as e:
                        error_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'행 {index + 1} 처리 중 오류: {str(e)}')
                        )
                        continue
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'데이터 가져오기 완료!\n'
                    f'성공: {success_count}개\n'
                    f'실패: {error_count}개\n'
                    f'총 업종: {len(business_types)}개'
                )
            )
            
        except Exception as e:
            raise CommandError(f'CSV 파일 처리 중 오류 발생: {str(e)}') 