# 인증 기능 기술 문서

## 목차
1. [개요](#개요)
2. [기능 설명](#기능-설명)
3. [API 엔드포인트](#api-엔드포인트)
4. [모델 구조](#모델-구조)
5. [폼 구조](#폼-구조)
6. [보안](#보안)
7. [테스트](#테스트)
8. [문제 해결](#문제-해결)

## 개요
인증 기능은 LocaAI 시스템의 사용자 인증 및 권한 관리를 위한 모듈입니다. 로그인, 회원가입, 비밀번호 관리, 세션 관리 등의 기능을 제공합니다.

## 기능 설명

### 1. 사용자 관리
- 회원가입
  - 사용자명, 이메일, 비밀번호 입력
  - 이메일 필수 입력
  - 비밀번호 유효성 검증
- 로그인/로그아웃
  - 사용자명/비밀번호 기반 인증
  - 세션 토큰 발급
  - IP 주소 기록
- 사용자 정보 조회
  - 기본 정보 (사용자명, 이메일)
  - 역할 정보
  - 세션 정보
- 역할 기반 권한 관리
  - 관리자 (ADMIN)
  - 일반 사용자 (USER)

### 2. 비밀번호 관리
- 비밀번호 변경
  - 현재 비밀번호 확인
  - 새 비밀번호 유효성 검증
- 비밀번호 초기화
  - 이메일 기반 초기화
  - 토큰 기반 인증
  - 안전한 재설정 프로세스

### 3. 세션 관리
- 세션 토큰 생성 및 관리
  - UUID 기반 토큰
  - 로그인 시 자동 갱신
- IP 주소 추적
  - 마지막 로그인 IP 기록
  - 보안 모니터링
- 자동 로그아웃
  - 세션 만료 처리
  - 토큰 무효화

## API 엔드포인트

### 인증 API
```
POST   /auth/login/                    # 로그인
POST   /auth/logout/                   # 로그아웃
POST   /auth/register/                 # 회원가입
GET    /auth/user-info/                # 사용자 정보 조회
POST   /auth/password_change/          # 비밀번호 변경
POST   /auth/password-reset/           # 비밀번호 초기화 요청
POST   /auth/password-reset-confirm/   # 비밀번호 초기화 확인
```

### API 요청 예시
```json
# 로그인
POST /auth/login/
{
  "username": "user@example.com",
  "password": "password123"
}

# 회원가입
POST /auth/register/
{
  "username": "newuser",
  "email": "user@example.com",
  "password1": "password123",
  "password2": "password123"
}

# 비밀번호 초기화 요청
POST /auth/password-reset/
{
  "identifier": "user@example.com"  // 이메일 또는 사용자명
}
```

## 모델 구조

### User
```python
class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        USER = 'USER', 'User'

    id = models.AutoField(primary_key=True)
    uuid_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    session_token = models.UUIDField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## 폼 구조

### UserRegistrationForm
```python
class UserRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
```

#### 필드 설명
- username: 사용자명 (필수)
- email: 이메일 주소 (필수)
- password1: 비밀번호 (필수)
- password2: 비밀번호 확인 (필수)

#### 유효성 검증
- 이메일 형식 검증
- 비밀번호 일치 여부 확인
- 비밀번호 복잡성 검증
  - 최소 길이
  - 특수문자 포함
  - 숫자 포함
  - 대소문자 포함

#### 저장 프로세스
1. 사용자 객체 생성
2. 이메일 주소 설정
3. 비밀번호 해싱
4. 데이터베이스 저장

## 보안

### 1. 인증 보안
- 비밀번호 해싱
  - PBKDF2 알고리즘 사용
  - 솔트 적용
- 세션 토큰 관리
  - UUID 기반 토큰
  - 로그인 시 갱신
- IP 주소 추적
  - 로그인 IP 기록
  - 보안 모니터링
- CSRF 보호
  - 토큰 기반 보호
  - POST 요청 검증

### 2. 권한 관리
- 역할 기반 접근 제어 (RBAC)
  - 관리자 권한
  - 일반 사용자 권한
- API 엔드포인트 접근 제어
  - 인증 필요 엔드포인트
  - 권한 기반 접근 제한

### 3. 비밀번호 정책
- 최소 길이 요구사항
- 복잡성 요구사항
  - 특수문자 포함
  - 숫자 포함
  - 대소문자 포함
- 이메일 기반 재설정
  - 토큰 기반 인증
  - 제한된 유효 시간

## 테스트

### 테스트 케이스
1. 인증 테스트
   - 로그인 성공/실패
   - 로그아웃
   - 세션 토큰 검증

2. 회원가입 테스트
   - 유효한 데이터로 가입
   - 중복 이메일/사용자명
   - 비밀번호 유효성 검사
   - 이메일 필수 입력 검증

3. 비밀번호 관리 테스트
   - 비밀번호 변경
   - 비밀번호 초기화 요청
   - 이메일 전송 확인
   - 토큰 유효성 검증

4. 권한 테스트
   - 관리자 권한 확인
   - 일반 사용자 권한 확인
   - API 접근 제어 확인

### 테스트 실행
```bash
python manage.py test custom_auth
```

## 문제 해결

### 1. 로그인 문제
- 사용자명/비밀번호 확인
- 계정 잠금 상태 확인
- 세션 토큰 유효성 확인
- IP 주소 확인

### 2. 비밀번호 문제
- 이메일 전송 상태 확인
- 토큰 유효성 확인
- 비밀번호 정책 준수 확인
- 비밀번호 해싱 확인

### 3. 권한 문제
- 사용자 역할 확인
- API 접근 권한 확인
- 세션 상태 확인
- 토큰 유효성 확인 