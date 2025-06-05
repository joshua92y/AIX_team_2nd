# AI Analyzer: 서울시 상권분석 AI 서비스

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [시스템 아키텍처](#시스템-아키텍처)
5. [설치 및 설정](#설치-및-설정)
6. [API 문서](#api-문서)
7. [데이터 모델](#데이터-모델)
8. [핵심 로직](#핵심-로직)
9. [데이터 소스](#데이터-소스)
10. [배포 가이드](#배포-가이드)
11. [문제 해결](#문제-해결)

---

## 🎯 프로젝트 개요

AI Analyzer는 서울시 상권 데이터를 기반으로 특정 위치의 상업적 잠재력을 분석하고, AI 모델을 통해 해당 점포의 장기 생존 확률을 예측하는 웹 서비스입니다.

### 주요 특징
- **정확한 위치 기반 분석**: EPSG:5186 좌표계 사용으로 한국 지역에 최적화
- **다층적 상권 분석**: 인구, 시설, 경쟁업체, 지가 등 종합 분석
- **AI 기반 예측**: XGBoost 모델을 통한 생존 확률 예측
- **직관적 사용자 인터페이스**: 카카오 API 연동 주소 입력 및 시각화

---

## 🚀 주요 기능

### 1. GIS 기반 상권 분석
- **인구 분석**
  - 생활인구: 반경 300m/1000m 내 연령대별 인구 분포
  - 직장인구: 반경 300m 내 직장인구 수
  - 외국인 인구: 단기/장기 체류별, 국적별 분석

- **시설 분석**
  - 교육시설: 반경 250m 내 학교 수
  - 공공시설: 반경 250m 내 공공건물 수

- **경쟁 환경 분석**
  - 동일 업종 경쟁업체 수
  - 전체 요식업체 수
  - 업종 다양성 지수
  - 경쟁 비율 계산

- **부동산 분석**
  - 공시지가 기반 토지 가치 평가
  - 면적별 총 토지가치 산출

### 2. AI 기반 생존 확률 예측
- **모델**: XGBoost 분류 모델
- **입력 피쳐**: 27~28개 상권 분석 지표
- **출력**: 장기 생존 확률 (0~100%)
- **신뢰성**: Feature shape mismatch 대응 fallback 로직

### 3. 사용자 인터페이스
- **주소 입력**: 카카오 Local API 연동 자동 좌표 변환
- **시각화**: Chart.js 기반 분석 결과 차트
- **결과 요약**: 강점 및 주의사항 요약 제공

---

## 🛠 기술 스택

### Backend
- **Framework**: Django 5.2
- **Language**: Python 3.x
- **Database**: SpatiaLite (SQLite + Spatial Extensions)
- **GIS**: GeoDjango, GDAL/OGR

### AI/ML
- **Model**: XGBoost
- **Libraries**: Scikit-learn, Pandas, NumPy
- **Coordinate System**: pyproj (좌표계 변환)

### Frontend
- **UI Framework**: Bootstrap 5
- **Charting**: Chart.js
- **Maps**: Kakao Local API

### Infrastructure
- **Spatial Engine**: OSGeo4W
- **Data Format**: GPKG (GeoPackage)

---

## 🏗 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Django App    │    │   Data Layer    │
│                 │    │                 │    │                 │
│ • HTML/CSS/JS   │◄──►│ • Views         │◄──►│ • SpatiaLite    │
│ • Bootstrap     │    │ • Models        │    │ • GPKG Files    │
│ • Chart.js      │    │ • URL Routes    │    │ • AI Model      │
│ • Kakao API     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   External APIs │◄─────────────┘
                        │                 │
                        │ • Kakao Local   │
                        │ • OSGeo4W       │
                        └─────────────────┘
```

---

## ⚙️ 설치 및 설정

### 사전 요구사항
- Python 3.x
- Git

### 1. 프로젝트 클론 및 환경 설정
```bash
# 프로젝트 클론
git clone <repository-url>
cd AI-Analyzer

# 가상환경 생성 및 활성화
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

### 2. OSGeo4W 설정
```bash
# 프로젝트 루트에 spatialite 폴더 생성
mkdir spatialite
mkdir spatialite/bin

# OSGeo4W bin 디렉토리 내용을 spatialite/bin으로 복사
# 필수 파일: mod_spatialite.dll, ogr2ogr.exe, 관련 DLL들
```

### 3. 데이터 준비
```bash
# data 폴더 생성 및 GPKG 파일 배치
mkdir data
# 8개 GPKG 파일을 data/ 폴더에 복사
```

### 4. 데이터베이스 설정
```bash
# 마이그레이션 생성 및 적용
python manage.py makemigrations locai
python manage.py migrate

# GPKG 데이터 로드
python load_gpkg_data.py
```

### 5. 서버 실행
```bash
python manage.py runserver
```

서비스는 `http://127.0.0.1:8000`에서 접근 가능합니다.

---

## 📡 API 문서

### 1. 좌표 변환 API
```http
POST /get_coordinates/
Content-Type: application/json

{
    "address": "서울특별시 강남구 역삼동 123-45"
}
```

**응답:**
```json
{
    "longitude": 127.0276,
    "latitude": 37.4979,
    "x_coord": 958123.45,
    "y_coord": 1943567.89
}
```

### 2. 상권 분석 API
```http
POST /analyze/
Content-Type: application/json

{
    "address": "서울특별시 강남구 역삼동 123-45",
    "area": 50.0,
    "business_type_id": 1,
    "service_type": 0,
    "longitude": 127.0276,
    "latitude": 37.4979,
    "x_coord": 958123.45,
    "y_coord": 1943567.89
}
```

**응답:**
```json
{
    "success": true,
    "request_id": 123,
    "results": {
        "1A_Total": 1500,
        "Working_Pop": 800,
        "survival_percentage": 75.3,
        // ... 기타 분석 결과
    }
}
```

### 3. 결과 조회 API
```http
GET /result/<int:request_id>/
```

---

## 🗃 데이터 모델

### BusinessType
```python
class BusinessType(models.Model):
    id = models.IntegerField(primary_key=True)  # 업종 ID
    name = models.CharField(max_length=100)     # 업종명
```

### AnalysisRequest
```python
class AnalysisRequest(models.Model):
    address = models.CharField(max_length=500)           # 분석 주소
    area = models.FloatField()                          # 점포 면적(㎡)
    business_type = models.ForeignKey(BusinessType)     # 선택 업종
    service_type = models.IntegerField()                # 서비스 유형
    longitude = models.FloatField()                     # WGS84 경도
    latitude = models.FloatField()                      # WGS84 위도
    x_coord = models.FloatField()                       # EPSG:5186 X좌표
    y_coord = models.FloatField()                       # EPSG:5186 Y좌표
    created_at = models.DateTimeField(auto_now_add=True)
```

### AnalysisResult
```python
class AnalysisResult(models.Model):
    request = models.OneToOneField(AnalysisRequest)
    
    # 생활인구 관련
    life_pop_300m = models.IntegerField()               # 300m 총 생활인구
    life_pop_20_300m = models.FloatField()              # 300m 20대 비율
    # ... 연령대별 비율 필드들
    
    # 외국인 관련
    temp_foreign_1000m = models.IntegerField()          # 1000m 단기체류 외국인
    long_foreign_300m = models.IntegerField()           # 300m 장기체류 외국인
    # ... 기타 외국인 관련 필드들
    
    # 직장인구
    working_pop_300m = models.IntegerField()            # 300m 직장인구
    
    # 주변시설
    public_building_250m = models.IntegerField()        # 250m 공공건물 수
    school_250m = models.IntegerField()                 # 250m 학교 수
    
    # 상권분석
    competitor_300m = models.IntegerField()             # 300m 경쟁업체 수
    adjacent_biz_300m = models.IntegerField()           # 300m 전체 요식업체 수
    business_diversity_300m = models.FloatField()       # 업종 다양성
    competitor_ratio_300m = models.FloatField()         # 경쟁 비율
    
    # 공시지가
    total_land_value = models.FloatField()              # 총 토지가치
    
    # AI 예측
    survival_probability = models.FloatField()          # 생존 확률 (0.0~1.0)
    survival_percentage = models.FloatField()           # 생존 확률 (0~100%)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 🧠 핵심 로직

### 1. 공간 분석 엔진 (`perform_spatial_analysis`)

이 함수는 AI Analyzer의 핵심 분석 엔진으로, 6단계의 공간 분석을 순차적으로 수행합니다.

#### 입력 파라미터
- `analysis_request`: AnalysisRequest 객체 (사용자 입력 정보)

#### 분석 단계

**1단계: 생활인구 분석**
```sql
-- 반경 300m/1000m 내 연령대별 생활인구 분석
SELECT SUM(population_20s), SUM(population_30s), ..., SUM(total_population)
FROM life_pop_grid_10m_5186 
WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT(x y)', 5186), radius))
```

**2단계: 직장인구 분석**
```sql
-- 반경 300m 내 직장인구 수
SELECT SUM(working_population)
FROM workgrid_10m_5186 
WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT(x y)', 5186), 300))
```

**3단계: 외국인 분석**
```sql
-- 단기/장기 체류 외국인 분석 (다중 테이블 확인)
SELECT SUM("총생활인구수"), SUM("중국인체류인구수")
FROM {temp_table_name} 
WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT(x y)', 5186), radius))
```

**4단계: 주변시설 분석**
```sql
-- 반경 250m 내 교육/공공시설 수
SELECT COUNT(*) 
FROM public_5186/school_5186 
WHERE ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT(x y)', 5186), 250))
```

**5단계: 경쟁업체 분석**
```sql
-- 반경 300m 내 동일업종 경쟁업체 및 전체 요식업체 분석
SELECT COUNT(*) as competitor_count
FROM store_point_5186 
WHERE uptaenm = '{business_type_name}' 
AND ST_Intersects(geom, ST_Buffer(ST_GeomFromText('POINT(x y)', 5186), 300))
```

**6단계: 공시지가 분석**
```sql
-- 해당 지점의 공시지가 조회 및 총 토지가치 계산
SELECT "A9" as land_price 
FROM ltv_5186 
WHERE ST_Contains(geom, ST_GeomFromText('POINT(x y)', 5186))
-- total_land_value = area * land_price
```

#### 결과 처리
1. 각 단계의 결과를 `results` 딕셔너리에 저장
2. AI 모델용 피쳐 딕셔너리 구성
3. `predict_survival_probability()` 호출
4. 모든 결과를 `AnalysisResult` 객체로 DB 저장

### 2. AI 예측 엔진 (`predict_survival_probability`)

#### 모델 특징
- **알고리즘**: XGBoost Classifier
- **입력 피쳐**: 27~28개 상권 분석 지표
- **출력**: 생존 확률 (0.0~1.0)

#### 피쳐 구성 (28개 기준)
```python
features = [
    'Area', 'Adjacent_BIZ', '1A_Total', 'Total_LV', 'Business_D',
    'Working_Pop', '2A_20', '2A_30', '2A_40', '2A_50', '2A_60',
    '1A_20', '1A_30', '1A_40', '1A_50', '1A_60',
    '1A_Long_Total', '2A_Long_Total', '1A_Temp_CN', '2A_Temp_CN',
    '2A_Temp_Total', '2A_Long_CN', 'Competitor_C', 'Competitor_R',
    'Service', 'School', 'PubBuilding', 'UPTAENM_ID'
]
```

#### Fallback 로직
```python
try:
    # 28개 피쳐로 예측 시도 (업종 ID 포함)
    prediction = model.predict_proba(features_28)
except:
    # 27개 피쳐로 재시도 (업종 ID 제외)
    prediction = model.predict_proba(features_27)
```

### 3. 좌표 변환 시스템 (`get_coordinates`)

#### 변환 과정
1. **주소 → WGS84**: 카카오 Local API 사용
2. **WGS84 → EPSG:5186**: pyproj 라이브러리 사용

```python
# WGS84 → EPSG:5186 변환
transformer = pyproj.Transformer.from_crs(
    'EPSG:4326',  # WGS84
    'EPSG:5186',  # Korea 2000 / Central Belt 2010
    always_xy=True
)
x_coord, y_coord = transformer.transform(longitude, latitude)
```

---

## 📊 데이터 소스

### GPKG 파일 목록
| 파일명 | 테이블명 | 용도 | 주요 컬럼 |
|--------|----------|------|-----------|
| `life_pop_grid_10m_5186.gpkg` | life_pop_grid_10m_5186 | 생활인구 분석 | 연령대별 인구수 |
| `workgrid_10m_5186.gpkg` | workgrid_10m_5186 | 직장인구 분석 | 직장인구수 |
| `temp_25m_5186.gpkg` | temp_25m_5186 | 단기체류 외국인 | "총생활인구수", "중국인체류인구수" |
| `long_25m_5186.gpkg` | long_25m_5186 | 장기체류 외국인 | "총생활인구수", "중국인체류인구수" |
| `store_point_5186.gpkg` | store_point_5186 | 상점 정보 | uptaenm (업종명) |
| `school_5186.gpkg` | school_5186 | 학교 정보 | 학교 위치 |
| `ltv_5186.gpkg` | ltv_5186 | 공시지가 | "A9" (지가) |
| `public_5186.gpkg` | public_5186 | 공공건물 | 공공건물 위치 |

### 데이터 로딩 스크립트
```bash
# GPKG → SpatiaLite 변환
python load_gpkg_data.py

# 외국인 데이터 업데이트
python update_foreign_data.py

# 테스트 데이터 생성
python create_test_foreign_data.py
```

---

## 🚀 배포 가이드

### 1. 프로덕션 환경 설정

#### 환경 변수 설정
```bash
# .env 파일 생성
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECRET_KEY=your-secret-key
KAKAO_API_KEY=your-kakao-api-key
```

#### 정적 파일 설정
```bash
# settings.py 추가
STATIC_ROOT = '/path/to/static/'
MEDIA_ROOT = '/path/to/media/'

# 정적 파일 수집
python manage.py collectstatic
```

### 2. 웹서버 설정 (Nginx + Gunicorn)

#### Gunicorn 설정
```bash
# Gunicorn 설치
pip install gunicorn

# Gunicorn 실행
gunicorn geoproject.wsgi:application --bind 0.0.0.0:8000
```

#### Nginx 설정
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /static/ {
        alias /path/to/static/;
    }
}
```

### 3. Docker 배포 (선택사항)

#### Dockerfile
```dockerfile
FROM python:3.11

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "geoproject.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 🔧 문제 해결

### 일반적인 문제들

#### 1. SpatiaLite 설정 오류
**증상**: `OSError: cannot load library 'mod_spatialite': error`

**해결방법**:
```bash
# 1. spatialite 폴더 구조 확인
spatialite/
└── bin/
    ├── mod_spatialite.dll
    ├── ogr2ogr.exe
    └── [기타 DLL 파일들]

# 2. settings.py 경로 확인
OSGEO4W_ROOT = os.path.join(BASE_DIR, 'spatialite')
SPATIALITE_LIBRARY_PATH = os.path.join(OSGEO4W_ROOT, 'bin', 'mod_spatialite.dll')
```

#### 2. GPKG 데이터 로딩 실패
**증상**: `ogr2ogr: command not found`

**해결방법**:
```bash
# 1. ogr2ogr.exe 위치 확인
ls spatialite/bin/ogr2ogr.exe

# 2. PATH 환경변수 확인 (settings.py)
if os.path.exists(os.path.join(OSGEO4W_ROOT, 'bin')):
    os.environ['PATH'] = os.path.join(OSGEO4W_ROOT, 'bin') + ';' + os.environ['PATH']
```

#### 3. 외국인 데이터 컬럼 오류
**증상**: `no such column: 총생활인구수`

**해결방법**:
```python
# 테이블 컬럼 확인
cursor.execute("PRAGMA table_info(temp_25m_5186)")
columns = cursor.fetchall()
print(columns)

# 올바른 컬럼명 사용
cursor.execute("SELECT SUM(\"총생활인구수\") FROM temp_25m_5186 WHERE ...")
```

#### 4. AI 모델 로딩 실패
**증상**: `FileNotFoundError: model/best_xgb_model.pkl`

**해결방법**:
```bash
# 1. 모델 파일 존재 확인
ls model/best_xgb_model.pkl

# 2. 파일 권한 확인
chmod 644 model/best_xgb_model.pkl
```

#### 5. 좌표 변환 오류
**증상**: `InvalidTransformDefinition: Invalid coordinate system`

**해결방법**:
```python
# pyproj 버전 확인 및 업데이트
pip install --upgrade pyproj

# 좌표계 정의 확인
from pyproj import CRS
crs = CRS.from_epsg(5186)
print(crs.is_valid)
```

### 성능 최적화

#### 1. 데이터베이스 인덱스
```sql
-- 공간 인덱스 생성
CREATE INDEX idx_life_pop_geom ON life_pop_grid_10m_5186(geom);
CREATE INDEX idx_store_geom ON store_point_5186(geom);
CREATE INDEX idx_store_uptaenm ON store_point_5186(uptaenm);
```

#### 2. 캐싱 설정
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# views.py에서 캐싱 사용
from django.core.cache import cache

def load_xgboost_model():
    model = cache.get('xgboost_model')
    if model is None:
        model = pickle.load(open('model/best_xgb_model.pkl', 'rb'))
        cache.set('xgboost_model', model, 3600)  # 1시간 캐싱
    return model
```

---

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

---

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 등록해주세요.

**개발팀 연락처**: [support@locai.com](mailto:support@locai.com)
