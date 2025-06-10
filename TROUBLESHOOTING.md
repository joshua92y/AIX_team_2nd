# LocaAI 트러블슈팅 가이드

## 🚨 "지정된 프로시저를 사용할 수 없습니다" 오류

이 오류는 주로 GDAL/GEOS 라이브러리와 관련된 Windows DLL 문제입니다.

### 📋 해결 방법들 (우선순위 순)

#### 1. **Visual C++ 재배포 가능 패키지 설치** ⭐
많은 DLL 오류의 근본 원인입니다.

```bash
# Microsoft Visual C++ 2015-2022 재배포 가능 패키지 설치
# 다운로드 링크: https://docs.microsoft.com/ko-kr/cpp/windows/latest-supported-vc-redist
```

**설치해야 할 패키지:**
- Microsoft Visual C++ 2015-2022 Redistributable (x64)
- Microsoft Visual C++ 2015-2022 Redistributable (x86) - 32비트 호환성용

#### 2. **GDAL 라이브러리 폴더 확인**

```bash
# 프로젝트 루트에서 실행
python -c "
import os
gdal_path = 'LocaAI/gdal_libs'
print(f'GDAL 폴더 존재: {os.path.exists(gdal_path)}')
if os.path.exists(gdal_path):
    files = os.listdir(gdal_path)
    print(f'DLL 파일 수: {len([f for f in files if f.endswith(\".dll\")])}')
    required_dlls = ['gdal310.dll', 'geos_c.dll', 'mod_spatialite.dll']
    for dll in required_dlls:
        exists = dll in files
        print(f'{dll}: {\"✅\" if exists else \"❌\"}')
"
```

#### 3. **환경변수 수동 설정**

만약 자동 설정이 실패하면 수동으로 설정:

```python
# settings.py에 추가 (기존 GDAL 설정 이후)
import sys
import ctypes

# Windows DLL 로드 경로 추가
if sys.platform == 'win32':
    # Python 3.8+에서는 add_dll_directory 사용
    if hasattr(os, 'add_dll_directory'):
        os.add_dll_directory(GDAL_LIBS_ROOT)
    
    # 또는 ctypes로 직접 로드
    try:
        ctypes.CDLL(os.path.join(GDAL_LIBS_ROOT, 'gdal310.dll'))
        print("✅ GDAL DLL 직접 로드 성공")
    except Exception as e:
        print(f"❌ GDAL DLL 로드 실패: {e}")
```

#### 4. **OSGeo4W 임시 폴백 (긴급용)**

프로젝트 완전성을 위해 권장하지 않지만, 긴급 시 사용:

```python
# settings.py에 추가 (GDAL_LIBS_ROOT 설정 이후)
# 🚨 임시 해결책: OSGeo4W 폴백
if not os.path.exists(GDAL_LIBS_ROOT):
    OSGEO4W_PATHS = [
        r'C:\OSGeo4W\bin',
        r'C:\OSGeo4W64\bin',
        r'D:\OSGeo4W\bin',
        r'D:\OSGeo4W64\bin'
    ]
    
    for osgeo_path in OSGEO4W_PATHS:
        if os.path.exists(osgeo_path):
            os.environ['PATH'] = osgeo_path + ';' + os.environ.get('PATH', '')
            GDAL_LIBRARY_PATH = os.path.join(osgeo_path, 'gdal310.dll')
            GEOS_LIBRARY_PATH = os.path.join(osgeo_path, 'geos_c.dll')
            SPATIALITE_LIBRARY_PATH = os.path.join(osgeo_path, 'mod_spatialite.dll')
            print(f"⚠️ 임시 OSGeo4W 사용: {osgeo_path}")
            break
```

#### 5. **Conda 환경 사용**

프로젝트를 conda 환경에서 실행:

```bash
# conda 환경 생성 및 활성화
conda create -n locaai python=3.11
conda activate locaai

# conda-forge에서 GDAL 설치
conda install -c conda-forge gdal geos proj spatialite

# 프로젝트 의존성 설치
pip install -r requirements.txt

# Django 실행
python manage.py runserver
```

#### 6. **Docker 사용** (가장 안정적)

환경 독립적인 실행:

```bash
# Docker 이미지 빌드 및 실행
docker build -t locaai .
docker run -p 8000:8000 -v "${PWD}:/app" locaai

# 또는 기존 이미지 사용
docker pull joshua92y/aix2nd
docker run -it --rm -v "${PWD}:/app" -p 8000:8000 joshua92y/aix2nd
```

### 🔍 오류 진단 스크립트

다음 스크립트로 문제를 진단할 수 있습니다:

```python
# diagnosis.py
import os
import sys
import django
from pathlib import Path

# Django 설정
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / 'LocaAI'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    django.setup()
    print("✅ Django 설정 로드 성공")
except Exception as e:
    print(f"❌ Django 설정 오류: {e}")

try:
    from django.contrib.gis.gdal import check
    print("✅ GDAL 라이브러리 로드 성공")
    print(f"GDAL 버전: {check.gdal_version()}")
except Exception as e:
    print(f"❌ GDAL 로드 실패: {e}")

try:
    from django.contrib.gis.geos import check
    print("✅ GEOS 라이브러리 로드 성공")
    print(f"GEOS 버전: {check.geos_version()}")
except Exception as e:
    print(f"❌ GEOS 로드 실패: {e}")

try:
    from django.db import connection
    cursor = connection.cursor()
    cursor.execute("SELECT spatialite_version()")
    version = cursor.fetchone()[0]
    print(f"✅ SpatiaLite 로드 성공: {version}")
except Exception as e:
    print(f"❌ SpatiaLite 로드 실패: {e}")
```

### 📞 추가 도움

위 방법으로도 해결되지 않으면:

1. **시스템 정보 수집**:
   - Windows 버전 (32bit/64bit)
   - Python 버전
   - 설치된 Visual C++ 버전들

2. **오류 로그 전체 내용** 공유

3. **환경변수 확인**:
   ```cmd
   echo %PATH%
   echo %PROJ_LIB%
   ```

4. **DLL 종속성 확인** (고급):
   ```bash
   # Dependency Walker 또는 다음 명령어 사용
   dumpbin /dependents LocaAI/gdal_libs/gdal310.dll
   ```

---

**💡 팁**: 개발 환경에서는 Docker 사용을 강력히 권장합니다. 환경 독립성과 배포 일관성을 보장할 수 있습니다. 