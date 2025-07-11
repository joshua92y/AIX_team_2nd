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
이메일 기능은 LocaAI 시스템에서 이메일 전송 및 관리를 위한 모듈입니다. 이메일 전송, 실패한 이메일 재시도, 관리자 페이지를 통한 이메일 관리 등의 기능을 제공합니다.

## 기능 설명

### 1. 이메일 전송
- 직접 작성 이메일 전송
- 발신자 지정
- 이메일 상태 관리 (대기중, 전송됨, 실패)
- 관리자 페이지에서 수동 발송 기능

### 2. 이메일 모니터링
- 실패한 이메일 목록 조회
- 실패 이유 기록
- 실패 일시 기록
- 관리자 페이지에서 이메일 상태 필터링 및 검색

## API 엔드포인트

### 이메일 메시지 API
```
GET    /api/smtp/emails/              # 이메일 목록 조회 (인증 필요)
POST   /api/smtp/emails/              # 이메일 생성 (인증 필요)
GET    /api/smtp/emails/{id}/         # 이메일 상세 조회 (인증 필요)
PUT    /api/smtp/emails/{id}/         # 이메일 수정 (인증 필요)
DELETE /api/smtp/emails/{id}/         # 이메일 삭제 (인증 필요)
POST   /api/smtp/emails/{id}/retry/   # 실패한 이메일 재시도 (인증 필요)
POST   /api/smtp/emails/{id}/send/    # 대기중 이메일 발송 (인증 필요)
```

### 문의 메일 API
```
POST   /api/smtp/contact/             # 문의 메일 전송 (인증 불필요)
```

### API 요청 예시
```json
# 일반 이메일 생성
POST /api/smtp/emails/
{
  "user": 1,
  "subject": "테스트 메일",
  "message": "이것은 테스트 메일입니다.",
  "recipient": "to@example.com",
  "sender": "from@example.com"
}

# 문의 메일 전송
POST /api/smtp/contact/
{
  "subject": "문의사항",
  "message": "제품 사용 중 궁금한 점이 있습니다.",
  "recipient": "support@example.com",
  "sender": "customer@example.com"
}
```

## 모델 구조

### EmailMessage
```python
class EmailMessage(models.Model):
    STATUS_CHOICES = [
        ('pending', '대기중'),
        ('sent', '전송됨'),
        ('failed', '실패'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    subject = models.CharField(max_length=255)
    message = models.TextField(validators=[MinLengthValidator(10)])
    recipient = models.EmailField()
    sender = models.EmailField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## 보안

### 1. 권한 관리
- 일반 이메일 API: 인증된 사용자만 접근 가능
  - 이메일 생성
  - 이메일 조회
  - 이메일 수정
  - 이메일 삭제
  - 이메일 재전송
  - 이메일 발송
- 문의 메일 API: 인증 불필요
  - 이메일 주소 유효성 검증
  - 메시지 길이 검증
  - 필수 필드 검증
- 관리자 페이지 접근: 관리자 권한 필요

### 2. 데이터 검증
- 메시지 최소 길이 검증 (10자)
- 이메일 주소 형식 검증
- 읽기 전용 필드 보호 (status, sent_at, failed_at, failure_reason, created_at, updated_at)
- 문의 메일 필수 필드 검증 (subject, message, recipient, sender)

## 테스트

### 테스트 케이스
1. 이메일 전송 테스트
   - 이메일 생성
   - 이메일 목록 조회
   - 단일 이메일 조회
   - 이메일 상태 변경 확인

2. 재시도 기능 테스트
   - 실패한 이메일 재전송
   - 실패하지 않은 이메일 재전송 시도 (실패 확인)
   - 실패 이유 기록 확인

3. 권한 테스트
   - 인증된 사용자 권한 테스트
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
- 메시지 최소 길이(10자) 확인
- 실패 이유 확인 (failure_reason 필드)

### 2. 권한 문제
- 사용자 인증 상태 확인
- API 엔드포인트 접근 권한 확인
- 관리자 페이지 접근 권한 확인 

## 뉴스레터 구독 시스템

### 모델 구조

#### NewsletterSubscriber
뉴스레터 구독자를 관리하는 모델입니다.

**필드:**
- `id`: UUID (기본키)
- `user`: 사용자 외래키 (선택적, 비회원 구독 가능)
- `email`: 이메일 주소 (고유값)
- `is_active`: 구독 상태 (기본값: True)
- `subscribed_at`: 구독 시작일
- `unsubscribed_at`: 구독 해지일 (선택적)
- `name`: 구독자 이름 (선택적)

**인덱스:**
- `email`
- `is_active`

### API 엔드포인트

#### 1. 구독 신청
- **URL**: `/api/newsletter/subscribe/`
- **Method**: POST
- **요청 데이터:**
  ```json
  {
    "email": "user@example.com",
    "name": "홍길동"  // 선택사항
  }
  ```
- **응답:**
  ```json
  {
    "message": "user@example.com 님, 구독이 완료되었습니다."
  }
  ```

#### 2. 구독 해지
- **URL**: `/api/newsletter/unsubscribe/`
- **Method**: POST
- **요청 데이터:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **응답:**
  ```json
  {
    "message": "user@example.com 님, 구독이 해지되었습니다."
  }
  ```

### 관리자 기능

관리자 페이지(`/admin/smtp/newslettersubscriber/`)에서 다음과 같은 기능을 제공합니다:

1. **목록 보기**
   - 이메일
   - 이름
   - 사용자
   - 구독 상태
   - 구독/해지 일시
   - 구독 상태 토글 버튼

2. **필터링**
   - 구독 상태
   - 구독 시작일
   - 구독 해지일

3. **검색**
   - 이메일
   - 이름
   - 사용자명

4. **상세 보기**
   - 기본 정보 (사용자, 이메일, 이름, 구독 상태)
   - 구독 정보 (구독 시작일, 구독 해지일)

### 주요 기능

1. **구독 신청**
   - 이메일 주소 유효성 검증
   - 중복 구독 방지
   - 이름 미입력 시 이메일 앞부분 자동 설정

2. **구독 해지**
   - 이메일 주소로 구독자 확인
   - 구독 상태 변경
   - 해지 일시 기록

3. **구독 관리**
   - 구독 상태 토글
   - 구독 이력 추적
   - 회원/비회원 구독자 구분

### 사용 예시

```python
# 구독 신청
subscriber = NewsletterSubscriber.objects.create(
    email="user@example.com",
    name="홍길동"
)

# 구독 해지
subscriber.unsubscribe()

# 구독 재활성화
subscriber.subscribe()
```

### 주의사항

1. 이메일 주소는 고유값으로 설정되어 있어 중복 구독이 불가능합니다.
2. 구독 해지 후 재구독 시 기존 구독 정보를 재활성화합니다.
3. 회원인 경우 사용자 정보와 연결되며, 비회원도 구독이 가능합니다. 