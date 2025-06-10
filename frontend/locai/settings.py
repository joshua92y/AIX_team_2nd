# GDAL 및 GIS 설정
GDAL_LIBS_ROOT = os.path.join(BASE_DIR, 'gdal_libs')

# 🚀 완전 독립적인 GDAL 설정 (환경변수 의존성 제거)
def setup_gdal_libraries():
    """프로젝트 내부 GDAL 라이브러리만 사용하도록 강제 설정"""
    
    if not os.path.exists(GDAL_LIBS_ROOT):
        print(f"[ERROR] GDAL 라이브러리 폴더가 없습니다: {GDAL_LIBS_ROOT}")
        return False
    
    # 라이브러리 파일 직접 경로 설정 (환경변수 조작 없음)
    gdal_dll = os.path.join(GDAL_LIBS_ROOT, 'gdal310.dll')
    geos_dll = os.path.join(GDAL_LIBS_ROOT, 'geos_c.dll') 
    spatialite_dll = os.path.join(GDAL_LIBS_ROOT, 'mod_spatialite.dll')
    
    # 파일 존재 확인
    missing_files = []
    if not os.path.exists(gdal_dll):
        missing_files.append('gdal310.dll')
    if not os.path.exists(geos_dll):
        missing_files.append('geos_c.dll')
    if not os.path.exists(spatialite_dll):
        missing_files.append('mod_spatialite.dll')
    
    if missing_files:
        print(f"[ERROR] 필수 DLL 파일이 없습니다: {missing_files}")
        return False
    
    # Django에서 사용할 라이브러리 경로 직접 설정
    globals()['GDAL_LIBRARY_PATH'] = gdal_dll
    globals()['GEOS_LIBRARY_PATH'] = geos_dll  
    globals()['SPATIALITE_LIBRARY_PATH'] = spatialite_dll
    
    print(f"[OK] 독립 GDAL 라이브러리 설정 완료: {GDAL_LIBS_ROOT}")
    return True

# 독립적인 GDAL 라이브러리 설정 실행
if not setup_gdal_libraries():
    print("[FATAL] GDAL 라이브러리 설정에 실패했습니다.")
    print("        프로젝트의 gdal_libs 폴더와 DLL 파일들을 확인해주세요.")
    import sys
    sys.exit(1) 