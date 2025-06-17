from django.core.management.base import BaseCommand
from django.db import connection, transaction
from AI_Analyzer.models import AnalysisRequest, AnalysisResult
import re


class Command(BaseCommand):
    help = '주소가 "서울시 좌표(n.n, n.n)" 형식인 44,122개 데이터를 삭제'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 삭제하지 않고 테스트만 실행'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='확인 없이 바로 삭제 실행'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        auto_confirm = options['confirm']
        
        self.stdout.write("주소가 '서울시 좌표(n.n, n.n)' 형식인 데이터 삭제 작업 시작")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN 모드 - 실제 삭제하지 않음"))
        
        # 현재 데이터 상태 확인
        total_requests = AnalysisRequest.objects.count()
        total_results = AnalysisResult.objects.count()
        
        self.stdout.write(f"현재 데이터 상태:")
        self.stdout.write(f"  - AnalysisRequest: {total_requests:,}개")
        self.stdout.write(f"  - AnalysisResult: {total_results:,}개")
        
        # 좌표 형식 주소를 가진 데이터 찾기
        coordinate_pattern = r'서울시\s+좌표\([0-9.]+,\s*[0-9.]+\)'
        
        # AnalysisRequest에서 해당 패턴 찾기
        coordinate_requests = AnalysisRequest.objects.filter(
            address__regex=r'서울시.*좌표\([0-9.]+,\s*[0-9.]+\)'
        )
        
        coordinate_count = coordinate_requests.count()
        self.stdout.write(f"좌표 형식 주소를 가진 AnalysisRequest: {coordinate_count:,}개")
        
        if coordinate_count == 0:
            self.stdout.write(self.style.WARNING("삭제할 데이터가 없습니다."))
            return
        
        # 샘플 주소 표시
        sample_addresses = coordinate_requests.values_list('address', flat=True)[:5]
        self.stdout.write("샘플 주소:")
        for addr in sample_addresses:
            self.stdout.write(f"  - {addr}")
        
        # 관련된 AnalysisResult 개수 확인
        coordinate_request_ids = coordinate_requests.values_list('id', flat=True)
        related_results = AnalysisResult.objects.filter(request_id__in=coordinate_request_ids)
        related_results_count = related_results.count()
        
        self.stdout.write(f"관련된 AnalysisResult: {related_results_count:,}개")
        
        # 삭제 확인
        if not dry_run and not auto_confirm:
            self.stdout.write(self.style.WARNING(
                f"\n다음 데이터가 삭제됩니다:"
                f"\n  - AnalysisRequest: {coordinate_count:,}개"
                f"\n  - AnalysisResult: {related_results_count:,}개"
            ))
            
            confirm = input("정말 삭제하시겠습니까? (DELETE 입력): ")
            if confirm != "DELETE":
                self.stdout.write(self.style.ERROR("작업 취소"))
                return
        
        # 삭제 실행
        if not dry_run:
            try:
                with transaction.atomic():
                    # AnalysisResult 먼저 삭제 (외래키 제약 때문)
                    deleted_results = related_results.delete()
                    self.stdout.write(f"AnalysisResult 삭제 완료: {deleted_results[0]:,}개")
                    
                    # AnalysisRequest 삭제
                    deleted_requests = coordinate_requests.delete()
                    self.stdout.write(f"AnalysisRequest 삭제 완료: {deleted_requests[0]:,}개")
                    
                    self.stdout.write(self.style.SUCCESS("모든 데이터 삭제 완료!"))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"삭제 중 오류 발생: {str(e)}"))
                return
        else:
            self.stdout.write(self.style.SUCCESS("DRY RUN 완료 - 실제 삭제되지 않음"))
        
        # 삭제 후 상태 확인
        if not dry_run:
            remaining_requests = AnalysisRequest.objects.count()
            remaining_results = AnalysisResult.objects.count()
            
            self.stdout.write(f"\n삭제 후 데이터 상태:")
            self.stdout.write(f"  - AnalysisRequest: {remaining_requests:,}개")
            self.stdout.write(f"  - AnalysisResult: {remaining_results:,}개")
            
            deleted_request_count = total_requests - remaining_requests
            deleted_result_count = total_results - remaining_results
            
            self.stdout.write(f"\n실제 삭제된 데이터:")
            self.stdout.write(f"  - AnalysisRequest: {deleted_request_count:,}개")
            self.stdout.write(f"  - AnalysisResult: {deleted_result_count:,}개") 