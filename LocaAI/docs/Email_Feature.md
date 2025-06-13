# 이메일 기능 기술 문서

## 목차
1. [개요](#개요)
2. [기능 설명](#기능-설명)
3. [API 엔드포인트](#api-엔드포인트)
4. [모델 구조](#모델-구조)
5. [보안](#보안)
6. [테스트](#테스트)
7. [문제 해결](#문제-해결)

## 개요
이메일 기능은 LocaAI 시스템에서 이메일 전송 및 관리를 위한 모듈입니다. 이메일 템플릿 관리, 암호화된 이메일 전송, 실패한 이메일 재시도 등의 기능을 제공합니다.

## 기능 설명

### 1. 이메일 템플릿 관리
- 템플릿 생성, 수정, 삭제
- 템플릿 활성화/비활성화
- 관리자 전용 기능

### 2. 이메일 전송
- 템플릿 기반 이메일 전송
- 직접 작성 이메일 전송
- 암호화된 이메일 전송
- 발신자 지정

### 3. 이메일 모니터링
- 실패한 이메일 목록 조회
- 재시도 횟수 추적
- 에러 메시지 기록

## API 엔드포인트

### 이메일 템플릿 API
```
GET    /api/smtp/templates/          # 템플릿 목록 조회 (관리자 전용)
POST   /api/smtp/templates/          # 템플릿 생성 (관리자 전용)
GET    /api/smtp/templates/{id}/     # 템플릿 상세 조회 (관리자 전용)
PUT    /api/smtp/templates/{id}/     # 템플릿 수정 (관리자 전용)
DELETE /api/smtp/templates/{id}/     # 템플릿 삭제 (관리자 전용)
POST   /api/smtp/templates/{id}/toggle_active/  # 템플릿 활성화/비활성화 (관리자 전용)
```

### 이메일 메시지 API
```
GET    /api/smtp/messages/           # 이메일 목록 조회 (자신의 이메일만)
POST   /api/smtp/messages/           # 이메일 전송 (인증된 사용자)
GET    /api/smtp/messages/{id}/      # 이메일 상세 조회 (자신의 이메일만)
POST   /api/smtp/messages/{id}/retry/  # 실패한 이메일 재시도 (발신자 또는 관리자)
GET    /api/smtp/messages/failed/    # 실패한 이메일 목록 조회 (자신의 이메일만)
```

## 모델 구조

### EmailTemplate
```python
class EmailTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### EmailMessage
```python
class EmailMessage(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', '대기중'
        SENDING = 'sending', '전송중'
        SENT = 'sent', '전송완료'
        FAILED = 'failed', '전송실패'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(EmailTemplate, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.CharField(max_length=200, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    recipient = models.EmailField()
    sender = models.EmailField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    is_encrypted = models.BooleanField(default=False)
    encryption_key = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## 보안

### 1. 이메일 암호화
- `is_encrypted=True`로 설정 시 자동 암호화
- UUID 기반 암호화 키 자동 생성
- 암호화 키는 데이터베이스에 안전하게 저장

### 2. 권한 관리
- 템플릿 관리: 관리자 전용
- 이메일 전송: 인증된 사용자
- 이메일 조회: 
  - 관리자: 모든 이메일 조회 가능
  - 일반 사용자: 자신이 보내거나 받은 이메일만 조회 가능
- 이메일 재전송: 
  - 관리자: 모든 이메일 재전송 가능
  - 일반 사용자: 자신이 보낸 이메일만 재전송 가능

## 테스트

### 테스트 케이스
1. 템플릿 관리 테스트
   - 템플릿 생성
   - 템플릿 활성화/비활성화
   - 템플릿 목록 조회

2. 이메일 전송 테스트
   - 템플릿 기반 이메일 전송
   - 직접 작성 이메일 전송
   - 암호화된 이메일 전송

3. 재시도 기능 테스트
   - 실패한 이메일 재전송
   - 재시도 횟수 증가 확인

4. 권한 테스트
   - 관리자 권한 테스트
   - 일반 사용자 권한 테스트
   - 이메일 조회 권한 테스트
   - 이메일 재전송 권한 테스트

### 테스트 실행
```bash
python manage.py test smtp
```

## 문제 해결

### 1. 이메일 전송 실패
- SMTP 서버 설정 확인
- 발신자 이메일 주소 유효성 검사
- 템플릿 활성화 상태 확인

### 2. 암호화 관련 문제
- 암호화 키 생성 실패 시 로그 확인
- 암호화된 이메일 복호화 실패 시 키 유효성 검사

### 3. 권한 문제
- 사용자 인증 상태 확인
- 관리자 권한 확인
- API 엔드포인트 접근 권한 확인
- 이메일 조회 권한 확인
  - 관리자: 모든 이메일 조회 가능
  - 일반 사용자: 자신의 이메일만 조회 가능 