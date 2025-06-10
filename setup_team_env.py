#!/usr/bin/env python3
"""
LocaAI 팀원용 환경 설정 스크립트
Windows 환경에서 GDAL 문제 해결을 위한 자동 설정 도구
"""

import os
import sys
import subprocess
import platform

def check_python_version():
    """Python 버전 확인"""
    version = sys.version_info
    print(f"🐍 Python 버전: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 이상이 필요합니다!")
        return False
    return True

def check_virtual_env():
    """가상환경 활성화 여부 확인"""
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if in_venv:
        print("✅ 가상환경이 활성화되어 있습니다.")
    else:
        print("⚠️  가상환경이 활성화되지 않았습니다.")
        print("   권장: python -m venv venv && venv\\Scripts\\activate")
    return in_venv

def install_requirements():
    """requirements.txt 설치"""
    req_file = os.path.join(os.path.dirname(__file__), 'LocaAI', 'requirements.txt')
    if os.path.exists(req_file):
        print("📦 Python 패키지를 설치하는 중...")
        try:
            subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', req_file], check=True)
            print("✅ 패키지 설치 완료!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 패키지 설치 실패: {e}")
            return False
    else:
        print("❌ requirements.txt 파일을 찾을 수 없습니다.")
        return False

def fix_numpy_compatibility():
    """NumPy 버전 호환성 문제 해결"""
    print("🔧 NumPy 호환성 문제를 해결하는 중...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', 'numpy<2.0', '--force-reinstall'], check=True)
        print("✅ NumPy 버전 호환성 문제 해결 완료!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ NumPy 설치 실패: {e}")
        return False

def check_gdal_libs():
    """GDAL 라이브러리 폴더 확인"""
    gdal_path = os.path.join(os.path.dirname(__file__), 'LocaAI', 'gdal_libs')
    if os.path.exists(gdal_path):
        dll_files = [f for f in os.listdir(gdal_path) if f.endswith('.dll')]
        if dll_files:
            print(f"✅ GDAL 라이브러리 폴더 확인: {len(dll_files)}개 DLL 파일 발견")
            return True
        else:
            print("⚠️  GDAL 라이브러리 폴더는 있지만 DLL 파일이 없습니다.")
    else:
        print("❌ GDAL 라이브러리 폴더를 찾을 수 없습니다.")
    
    print("💡 해결 방법:")
    print("   1. 다른 팀원에게 gdal_libs 폴더를 요청하세요")
    print("   2. 또는 conda install gdal (Anaconda 사용 시)")
    print("   3. 또는 OSGeo4W 설치 후 경로 설정")
    return False

def setup_env_file():
    """환경변수 파일 설정"""
    env_file = os.path.join(os.path.dirname(__file__), 'LocaAI', '.env')
    if not os.path.exists(env_file):
        print("📝 .env 파일을 생성하는 중...")
        env_content = """# Django 기본 설정
SECRET_KEY=django-insecure-team-development-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 카카오 API 키
KAKAO_REST_API_KEY=4b3a451741a307fa3db2b9273005146a
KAKAO_JS_API_KEY=0ac2a982e676a58f9a4245749206f78b

# AI 모델 설정
MODEL_PATH=./model
BATCH_SIZE=32
LEARNING_RATE=0.001

# 로깅 설정
LOG_LEVEL=INFO

# ===== LocaAI 시스템 환경 변수 =====
OPENAI_API_KEY=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
QDRANT_URL=https://da99aa00-4ccf-4fb0-990a-1da55feb7bbb.us-west-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.Mth5o7jqYmVtma5f3nQP-c3W7ZlyLbyqQ13TZN94QTg
"""
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        print("✅ .env 파일 생성 완료!")
    else:
        print("✅ .env 파일이 이미 존재합니다.")
    return True

def test_django_setup():
    """Django 설정 테스트"""
    print("🧪 Django 설정을 테스트하는 중...")
    os.chdir(os.path.join(os.path.dirname(__file__), 'LocaAI'))
    try:
        result = subprocess.run([sys.executable, 'manage.py', 'check'], 
                              capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✅ Django 설정 테스트 통과!")
            return True
        else:
            print("❌ Django 설정 테스트 실패:")
            print(result.stderr)
            return False
    except subprocess.TimeoutExpired:
        print("⏰ Django 설정 테스트 시간 초과")
        return False
    except Exception as e:
        print(f"❌ Django 설정 테스트 중 오류: {e}")
        return False

def main():
    """메인 설정 함수"""
    print("🚀 LocaAI 팀원용 환경 설정을 시작합니다!")
    print("=" * 50)
    
    # 시스템 환경 확인
    print(f"💻 운영체제: {platform.system()} {platform.release()}")
    
    if not check_python_version():
        return False
    
    check_virtual_env()
    
    # 환경 설정
    if not setup_env_file():
        return False
    
    if not fix_numpy_compatibility():
        return False
    
    if not install_requirements():
        return False
    
    check_gdal_libs()
    
    # Django 테스트
    if test_django_setup():
        print("\n🎉 환경 설정이 완료되었습니다!")
        print("\n📋 다음 단계:")
        print("   1. cd LocaAI")
        print("   2. python manage.py runserver")
        print("   3. http://localhost:8000 에서 확인")
        print("\n💡 문제 발생 시:")
        print("   - GDAL 오류: conda install gdal 시도")
        print("   - 기타 문제: 팀 채널에 문의")
        return True
    else:
        print("\n⚠️  일부 설정에서 문제가 발생했습니다.")
        print("팀 채널에 오류 메시지를 공유해 주세요.")
        return False

if __name__ == "__main__":
    main() 