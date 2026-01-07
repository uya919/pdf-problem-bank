# 관리자 사용자 관리 시스템 개발 계획

> 작성일: 2025-12-17
> 상태: 계획 수립

---

## 1. 목표

관리자가 강사/직원 계정을 생성하고 비밀번호를 관리하는 시스템 구축
- 이메일 인증 없이 계정 생성 (가짜 이메일 허용)
- 비밀번호 분실 시 관리자가 리셋

---

## 2. 핵심 기능

| 기능 | 설명 | 권한 |
|------|------|------|
| 계정 생성 | 새 강사/관리자 계정 생성 | owner만 |
| 계정 목록 | 전체 사용자 목록 조회 | admin, owner |
| 권한 변경 | teacher ↔ admin 변경 | owner만 |
| 비밀번호 리셋 | 임시 비밀번호 발급 | owner만 |
| 계정 비활성화 | 퇴사자 계정 비활성화 | owner만 |
| 본인 비밀번호 변경 | 로그인 상태에서 변경 | 본인 |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    사용자 관리 플로우                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [계정 생성]                                                 │
│  원장 → 사용자 관리 UI → Supabase Admin API                  │
│       ├── 이메일: teacher1@hyeyum.com (가짜 OK)             │
│       ├── 비밀번호: 임시 비밀번호 (자동 생성)                 │
│       └── 역할: teacher / admin                             │
│                                                             │
│  [비밀번호 분실]                                             │
│  강사 → 원장에게 요청 → 원장이 임시 비밀번호 발급             │
│       └── 강사 로그인 후 본인이 비밀번호 변경                 │
│                                                             │
│  [본인 비밀번호 변경]                                        │
│  강사 → 설정 → 비밀번호 변경                                 │
│       └── supabase.auth.updateUser({ password })            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 기술 스택

| 영역 | 기술 |
|------|------|
| Admin API | Supabase Admin API (Service Role Key) |
| 백엔드 | FastAPI (프록시 - Service Key 보호) |
| 프론트엔드 | React + TanStack Query |

### Service Role Key 보안

```
⚠️ Service Role Key는 절대 프론트엔드에 노출하면 안됨!

Frontend → FastAPI Backend → Supabase Admin API
              (Service Key 사용)
```

---

## 5. 단계별 개발 계획

### Phase 1: 백엔드 Admin API 라우트 (필수)

**목표**: Service Role Key를 사용한 사용자 관리 API

**파일**: `backend/app/routers/admin_users.py`

**API 엔드포인트**:

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| GET | `/api/admin/users` | 사용자 목록 | admin, owner |
| POST | `/api/admin/users` | 계정 생성 | owner |
| PATCH | `/api/admin/users/{id}/role` | 권한 변경 | owner |
| POST | `/api/admin/users/{id}/reset-password` | 비밀번호 리셋 | owner |
| PATCH | `/api/admin/users/{id}/deactivate` | 계정 비활성화 | owner |

**구현 내용**:
```python
# 계정 생성
@router.post("/users")
async def create_user(data: CreateUserRequest):
    # Supabase Admin API로 사용자 생성
    result = supabase_admin.auth.admin.create_user({
        "email": data.email,
        "password": generate_temp_password(),
        "email_confirm": True,  # 이메일 인증 건너뛰기
        "user_metadata": {"name": data.name}
    })

    # profiles 테이블에 role 설정
    supabase_admin.table("profiles").update({
        "role": data.role,
        "name": data.name
    }).eq("id", result.user.id).execute()

    return {"user_id": result.user.id, "temp_password": temp_password}

# 비밀번호 리셋
@router.post("/users/{user_id}/reset-password")
async def reset_password(user_id: str):
    temp_password = generate_temp_password()
    supabase_admin.auth.admin.update_user_by_id(
        user_id,
        {"password": temp_password}
    )
    return {"temp_password": temp_password}
```

**체크리스트**:
- [ ] `backend/app/config.py`에 SUPABASE_SERVICE_KEY 추가
- [ ] `backend/app/routers/admin_users.py` 생성
- [ ] Supabase Admin 클라이언트 설정
- [ ] 권한 체크 미들웨어 (owner만 생성/리셋 가능)

---

### Phase 2: 프론트엔드 API 클라이언트

**목표**: Admin API 호출 함수

**파일**: `frontend/src/api/adminUsers.ts`

**구현 내용**:
```typescript
// 사용자 목록 조회
export async function getUsers(): Promise<User[]>

// 계정 생성
export async function createUser(data: CreateUserData): Promise<{
  userId: string;
  tempPassword: string;
}>

// 권한 변경
export async function updateUserRole(userId: string, role: UserRole): Promise<void>

// 비밀번호 리셋
export async function resetPassword(userId: string): Promise<{
  tempPassword: string;
}>

// 계정 비활성화
export async function deactivateUser(userId: string): Promise<void>
```

**체크리스트**:
- [ ] `frontend/src/api/adminUsers.ts` 생성
- [ ] `frontend/src/hooks/useAdminUsers.ts` 생성 (TanStack Query)

---

### Phase 3: 사용자 관리 페이지 UI

**목표**: 관리자용 사용자 관리 페이지

**파일**: `frontend/src/pages/admin/UsersPage.tsx`

**UI 구성**:
```
┌─────────────────────────────────────────────────────────────┐
│ 사용자 관리                              [+ 새 사용자 추가]  │
├─────────────────────────────────────────────────────────────┤
│ 🔍 검색...                    [전체 ▾] [활성 ▾]             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 김원장          owner@hyeyum.com       원장       │   │
│  │    활성            2025-01-15 가입                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 박관리          admin@hyeyum.com       관리자     │   │
│  │    활성            2025-02-01 가입        [···]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 이수학          math@hyeyum.com        강사       │   │
│  │    활성            2025-03-10 가입        [···]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**[···] 메뉴 (owner만 표시)**:
- 권한 변경
- 비밀번호 리셋
- 계정 비활성화

**체크리스트**:
- [ ] `UsersPage.tsx` 생성
- [ ] 사용자 목록 테이블
- [ ] 검색 + 필터 (역할, 활성 상태)
- [ ] [···] 드롭다운 메뉴

---

### Phase 4: 새 사용자 생성 모달

**목표**: 계정 생성 모달 UI

**파일**: `frontend/src/components/admin/users/CreateUserModal.tsx`

**UI 구성**:
```
┌─────────────────────────────────────────┐
│ 새 사용자 추가                      [X] │
├─────────────────────────────────────────┤
│                                         │
│  이름 *                                 │
│  ┌─────────────────────────────────┐   │
│  │ 홍길동                           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  이메일 (로그인 ID) *                   │
│  ┌─────────────────────────────────┐   │
│  │ hong                            │   │
│  └───────────────────┬─────────────┘   │
│                      │ @hyeyum.com     │
│                                         │
│  역할 *                                 │
│  ○ 강사 (teacher)                       │
│  ○ 관리자 (admin)                       │
│                                         │
│  ℹ️ 임시 비밀번호가 자동 생성됩니다.     │
│                                         │
│  [취소]              [사용자 생성]      │
│                                         │
└─────────────────────────────────────────┘
```

**생성 완료 후**:
```
┌─────────────────────────────────────────┐
│ ✅ 사용자 생성 완료                 [X] │
├─────────────────────────────────────────┤
│                                         │
│  👤 홍길동                              │
│  📧 hong@hyeyum.com                     │
│                                         │
│  🔑 임시 비밀번호                       │
│  ┌─────────────────────────────────┐   │
│  │ Temp#2847!                      │ 📋│
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️ 이 비밀번호는 다시 확인할 수 없습니다│
│     강사에게 전달 후 변경하도록 안내하세요│
│                                         │
│              [확인]                     │
│                                         │
└─────────────────────────────────────────┘
```

**체크리스트**:
- [ ] `CreateUserModal.tsx` 생성
- [ ] 폼 validation (이름, 이메일 필수)
- [ ] 이메일 자동 완성 (@hyeyum.com)
- [ ] 임시 비밀번호 표시 + 복사 버튼

---

### Phase 5: 비밀번호 리셋 모달

**목표**: 비밀번호 리셋 확인 및 임시 비밀번호 표시

**파일**: `frontend/src/components/admin/users/ResetPasswordModal.tsx`

**UI 구성**:
```
┌─────────────────────────────────────────┐
│ 비밀번호 리셋                       [X] │
├─────────────────────────────────────────┤
│                                         │
│  👤 이수학 (math@hyeyum.com)            │
│                                         │
│  이 사용자의 비밀번호를 리셋하시겠습니까?│
│  기존 비밀번호는 더 이상 사용할 수 없습니다│
│                                         │
│  [취소]           [비밀번호 리셋]       │
│                                         │
└─────────────────────────────────────────┘
```

**리셋 완료 후**:
```
┌─────────────────────────────────────────┐
│ ✅ 비밀번호 리셋 완료               [X] │
├─────────────────────────────────────────┤
│                                         │
│  🔑 새 임시 비밀번호                    │
│  ┌─────────────────────────────────┐   │
│  │ Reset#9182!                     │ 📋│
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️ 강사에게 전달 후 변경하도록 안내하세요│
│                                         │
│              [확인]                     │
│                                         │
└─────────────────────────────────────────┘
```

**체크리스트**:
- [ ] `ResetPasswordModal.tsx` 생성
- [ ] 확인 단계 UI
- [ ] 임시 비밀번호 표시 + 복사

---

### Phase 6: 본인 비밀번호 변경 UI

**목표**: 로그인한 사용자가 본인 비밀번호 변경

**파일**: `frontend/src/components/auth/ChangePasswordModal.tsx`

**위치**: 설정 페이지 또는 프로필 드롭다운

**UI 구성**:
```
┌─────────────────────────────────────────┐
│ 비밀번호 변경                       [X] │
├─────────────────────────────────────────┤
│                                         │
│  현재 비밀번호 *                        │
│  ┌─────────────────────────────────┐   │
│  │ ••••••••                        │ 👁│
│  └─────────────────────────────────┘   │
│                                         │
│  새 비밀번호 *                          │
│  ┌─────────────────────────────────┐   │
│  │ ••••••••                        │ 👁│
│  └─────────────────────────────────┘   │
│  ✓ 8자 이상  ✓ 영문+숫자+특수문자       │
│                                         │
│  새 비밀번호 확인 *                     │
│  ┌─────────────────────────────────┐   │
│  │ ••••••••                        │ 👁│
│  └─────────────────────────────────┘   │
│                                         │
│  [취소]              [비밀번호 변경]    │
│                                         │
└─────────────────────────────────────────┘
```

**구현**:
```typescript
// 현재 비밀번호 확인 후 변경
const handleChangePassword = async () => {
  // 1. 현재 비밀번호로 재인증 (선택적)
  // 2. 새 비밀번호로 변경
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
};
```

**체크리스트**:
- [ ] `ChangePasswordModal.tsx` 생성
- [ ] 비밀번호 강도 검증
- [ ] 비밀번호 확인 일치 검증
- [ ] 성공/실패 토스트 메시지

---

### Phase 7: 라우트 및 네비게이션 연결

**목표**: 사용자 관리 페이지 접근 경로 설정

**작업 내용**:

1. **App.tsx에 라우트 추가**:
```tsx
<Route path="admin/users" element={
  <ProtectedRoute roles={['owner']}>
    <UsersPage />
  </ProtectedRoute>
} />
```

2. **AdminTopNav에 메뉴 추가**:
```tsx
// 운영 드롭다운에 "사용자 관리" 추가
{ label: '사용자 관리', path: '/admin/users', roles: ['owner'] }
```

3. **MorePage에 비밀번호 변경 버튼 추가** (강사용)

**체크리스트**:
- [ ] App.tsx 라우트 추가
- [ ] AdminTopNav 메뉴 추가
- [ ] MorePage 비밀번호 변경 버튼

---

## 6. 파일 구조

```
backend/app/
├── config.py                    # SUPABASE_SERVICE_KEY 추가
├── routers/
│   └── admin_users.py           # 사용자 관리 API (신규)
└── utils/
    └── supabase_admin.py        # Admin 클라이언트 (신규)

frontend/src/
├── api/
│   └── adminUsers.ts            # Admin API 클라이언트 (신규)
├── hooks/
│   └── useAdminUsers.ts         # TanStack Query 훅 (신규)
├── pages/admin/
│   └── UsersPage.tsx            # 사용자 관리 페이지 (신규)
└── components/
    ├── admin/users/
    │   ├── UserList.tsx         # 사용자 목록 (신규)
    │   ├── UserCard.tsx         # 사용자 카드 (신규)
    │   ├── CreateUserModal.tsx  # 계정 생성 모달 (신규)
    │   └── ResetPasswordModal.tsx  # 비밀번호 리셋 모달 (신규)
    └── auth/
        └── ChangePasswordModal.tsx  # 본인 비밀번호 변경 (신규)
```

---

## 7. 우선순위 및 일정

| Phase | 내용 | 우선순위 | 예상 작업량 |
|-------|------|----------|-------------|
| **1** | 백엔드 Admin API | 🔴 필수 | 중간 |
| **2** | 프론트엔드 API 클라이언트 | 🔴 필수 | 작음 |
| **3** | 사용자 관리 페이지 | 🔴 필수 | 중간 |
| **4** | 계정 생성 모달 | 🔴 필수 | 중간 |
| **5** | 비밀번호 리셋 모달 | 🔴 필수 | 작음 |
| **6** | 본인 비밀번호 변경 | 🟡 중요 | 작음 |
| **7** | 라우트 연결 | 🔴 필수 | 작음 |

**MVP (최소 기능)**:
- Phase 1~5 완료 시 관리자가 계정 생성/리셋 가능

---

## 8. 보안 고려사항

### Service Role Key 보호

```
⚠️ 절대 프론트엔드에 노출 금지!

✅ 올바른 방법:
- 백엔드 환경변수로만 저장
- 백엔드 API를 통해서만 Admin 기능 호출

❌ 잘못된 방법:
- 프론트엔드 .env에 저장
- 프론트엔드에서 직접 Admin API 호출
```

### 권한 체크

```python
# 백엔드에서 이중 체크
@router.post("/users")
async def create_user(
    data: CreateUserRequest,
    current_user: User = Depends(get_current_user)  # JWT 검증
):
    # 1. JWT에서 사용자 ID 추출
    # 2. profiles 테이블에서 role 확인
    # 3. owner가 아니면 403 에러
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="권한 없음")
```

---

## 9. 임시 비밀번호 생성 규칙

```python
def generate_temp_password() -> str:
    """
    임시 비밀번호 생성
    형식: Prefix#NNNN!
    예시: Temp#2847!, Reset#9182!
    """
    import random
    prefix = random.choice(["Temp", "Reset", "Init"])
    numbers = random.randint(1000, 9999)
    return f"{prefix}#{numbers}!"
```

**규칙**:
- 8자 이상
- 영문 + 숫자 + 특수문자 포함
- 기억하기 쉬운 형식

---

## 10. 다음 단계

Phase 1부터 시작할까요?

1. `backend/app/config.py`에 SUPABASE_SERVICE_KEY 추가
2. `backend/app/routers/admin_users.py` 생성
3. Supabase Admin 클라이언트 설정

---

*작성: Claude Code*
