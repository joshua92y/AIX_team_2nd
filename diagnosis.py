#!/usr/bin/env python
"""
LocaAI GDAL 라이브러리 진단 스크립트
팀원들이 서버 실행 문제를 진단할 수 있도록 도와줍니다.
"""

import os
import sys
import platform
from pathlib import Path

def print_header(title):
    print(f"\n{'='*50}")
    print(f" {title}")
    print(f"{'='*50}")

def print_section(title):
    print(f"\n📋 {title}")
    print("-" * 30)

def check_system_info():
    print_section("시스템 정보")
    print(f"OS: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Python 버전: {sys.version}")
    print(f"Python 실행 경로: {sys.executable}")

def check_project_structure():
    print_section("프로젝트 구조 확인")
    
    base_dir = Path(__file__).resolve().parent
    print(f"프로젝트 루트: {base_dir}")
    
    # LocaAI 폴더 확인
    locaai_dir = base_dir / 'LocaAI'
    print(f"LocaAI 폴더: {'✅' if locaai_dir.exists() else '❌'} {locaai_dir}")
    
    # gdal_libs 폴더 확인
    gdal_dir = locaai_dir / 'gdal_libs'
    print(f"GDAL 라이브러리 폴더: {'✅' if gdal_dir.exists() else '❌'} {gdal_dir}")
    
    if gdal_dir.exists():
        dll_files = list(gdal_dir.glob("*.dll"))
        print(f"DLL 파일 수: {len(dll_files)}개")
        
        # 핵심 DLL 확인
        required_dlls = ['gdal310.dll', 'geos_c.dll', 'mod_spatialite.dll']
        for dll_name in required_dlls:
            dll_path = gdal_dir / dll_name
            size = dll_path.stat().st_size if dll_path.exists() else 0
            status = "✅" if dll_path.exists() else "❌"
            print(f"  {dll_name}: {status} ({size:,} bytes)")

def check_environment_variables():
    print_section("환경변수 확인")
    
    important_vars = ['PATH', 'PROJ_LIB', 'GDAL_DATA', 'PYTHONPATH']
    for var in important_vars:
        value = os.environ.get(var, 'Not Set')
        print(f"{var}: {value[:100]}{'...' if len(value) > 100 else ''}")

def check_visual_cpp():
    print_section("Visual C++ 재배포 가능 패키지 확인")
    
    # Windows 레지스트리에서 Visual C++ 설치 확인 (간접적 방법)
    possible_paths = [
        r"C:\Windows\System32\msvcp140.dll",
        r"C:\Windows\System32\vcruntime140.dll",
        r"C:\Windows\System32\vcomp140.dll"
    ]
    
    for dll_path in possible_paths:
        if os.path.exists(dll_path):
            print(f"✅ {os.path.basename(dll_path)} 발견")
        else:
            print(f"❌ {os.path.basename(dll_path)} 없음")

def test_django_setup():
    print_section("Django 설정 테스트")
    
    try:
        # Django 설정 경로 추가
        locaai_path = Path(__file__).resolve().parent / 'LocaAI'
        if str(locaai_path) not in sys.path:
            sys.path.insert(0, str(locaai_path))
        
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        
        import django
        django.setup()
        print("✅ Django 설정 로드 성공")
        
    except Exception as e:
        print(f"❌ Django 설정 오류: {e}")
        return False
    
    return True

def test_gdal():
    print_section("GDAL 라이브러리 테스트")
    
    try:
        from django.contrib.gis.gdal import check
        print("✅ GDAL 라이브러리 로드 성공")
        
        # GDAL 버전 확인
        try:
            version = check.gdal_version()
            print(f"GDAL 버전: {version}")
        except:
            print("⚠️ GDAL 버전 확인 실패")
            
    except Exception as e:
        print(f"❌ GDAL 로드 실패: {e}")
        return False
    
    return True

def test_geos():
    print_section("GEOS 라이브러리 테스트")
    
    try:
        from django.contrib.gis.geos import check
        print("✅ GEOS 라이브러리 로드 성공")
        
        # GEOS 버전 확인
        try:
            version = check.geos_version()
            print(f"GEOS 버전: {version}")
        except:
            print("⚠️ GEOS 버전 확인 실패")
            
    except Exception as e:
        print(f"❌ GEOS 로드 실패: {e}")
        return False
    
    return True

def test_spatialite():
    print_section("SpatiaLite 테스트")
    
    try:
        from django.db import connection
        cursor = connection.cursor()
        cursor.execute("SELECT spatialite_version()")
        version = cursor.fetchone()[0]
        print(f"✅ SpatiaLite 로드 성공: v{version}")
        cursor.close()
        
    except Exception as e:
        print(f"❌ SpatiaLite 로드 실패: {e}")
        return False
    
    return True

def provide_solutions(failed_tests):
    print_section("해결 방법 제안")
    
    if not failed_tests:
        print("🎉 모든 테스트가 성공했습니다!")
        print("서버를 실행해보세요: python LocaAI/manage.py runserver")
        return
    
    print("다음 해결 방법들을 순서대로 시도해보세요:")
    
    if 'django' in failed_tests:
        print("\n1️⃣ Django 설정 문제:")
        print("   - 가상환경이 활성화되었는지 확인")
        print("   - pip install -r requirements.txt 재실행")
    
    if any(test in failed_tests for test in ['gdal', 'geos', 'spatialite']):
        print("\n2️⃣ GDAL 라이브러리 문제:")
        print("   - Visual C++ 2015-2022 재배포 가능 패키지 설치")
        print("     https://docs.microsoft.com/ko-kr/cpp/windows/latest-supported-vc-redist")
        print("   - LocaAI/gdal_libs/ 폴더가 완전한지 확인")
        print("   - Docker 사용 권장: docker run -p 8000:8000 -v \"${PWD}:/app\" joshua92y/aix2nd")
    
    print(f"\n📖 자세한 해결 방법은 TROUBLESHOOTING.md 파일을 참조하세요.")

def main():
    print_header("LocaAI GDAL 라이브러리 진단 도구")
    
    # 기본 정보 수집
    check_system_info()
    check_project_structure()
    check_environment_variables()
    check_visual_cpp()
    
    # 테스트 실행
    failed_tests = []
    
    if not test_django_setup():
        failed_tests.append('django')
        print("\n⚠️ Django 설정 실패로 인해 추가 테스트를 건너뜁니다.")
    else:
        if not test_gdal():
            failed_tests.append('gdal')
        if not test_geos():
            failed_tests.append('geos')
        if not test_spatialite():
            failed_tests.append('spatialite')
    
    # 해결 방법 제안
    provide_solutions(failed_tests)
    
    print_header("진단 완료")

if __name__ == "__main__":
    main() 