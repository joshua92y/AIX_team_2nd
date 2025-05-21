# Python 3.10 기반 이미지
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 필요시 requirements.txt 복사
COPY requirements.txt ./
COPY . .
# 패키지 설치
RUN pip install --no-cache-dir -r requirements.txt

# 쉘 기본 실행
CMD ["python", "app.py"]