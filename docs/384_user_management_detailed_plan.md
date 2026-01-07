# Stage 10: 사용자 관리 시스템 상세 개발 계획

> 작성일: 2025-12-17
> 상태: 분석 완료, 개발 준비
> 참조: [377_admin_user_management_plan.md](377_admin_user_management_plan.md)

---

## 1. 현재 구현 상태 분석

### ✅ 이미 완료된 항목

| 항목 | 파일 | 상태 |
|------|------|------|
| 백엔드 Admin API | `backend/app/routers/admin_users.py` | ✅ 완료 (446줄) |
| Supabase Admin 클라이언트 | `backend/app/utils/supabase_admin.py` | ✅ 완료 |
| 환경변수 설정 | `backend/app/config.py` | ✅ 완료 (SUPABASE_SERVICE_KEY) |
| 프론트엔드 API 클라이언트 | `frontend/src/api/adminUsers.ts` | ✅ 완료 (183줄) |
| TanStack Query 훅 | `frontend/src/hooks/useAdminUsers.ts` | ✅ 완료 (141줄) |
| 사용자 목록 페이지 | `frontend/src/pages/admin/UsersPage.tsx` | ✅ 완료 (208줄) |
| 사용자 생성 모달 | `frontend/src/components/admin/users/CreateUserModal.tsx` | ✅ 완료 (284줄) |
| 비밀번호 리셋 모달 | `frontend/src/components/admin/users/ResetPasswordModal.tsx` | ✅ 완료 |
| 사용자 액션 메뉴 | `frontend/src/components/admin/users/UserActionsMenu.tsx` | ✅ 완료 |

### ⚠️ 확인 필요 항목

| 항목 | 상태 | 확인 방법 |
|------|------|----------|
| 라우트 등록 | ❓ 미확인 | App.tsx에서 `/admin/users` 확인 |
| ProtectedRoute 적용 | ❓ 미확인 | owner 권한 체크 확인 |
| 네비게이션 메뉴 | ❓ 미확인 | AdminTopNav/사이드바에 링크 확인 |
| 본인 비밀번호 변경 | ⬜ 미구현 | ChangePasswordModal 필요 |

---

## 2. 남은 작업 상세 분석

### Phase 10-1: 라우트 및 네비게이션 확인 (예상 15분)

**목표**: UsersPage가 정상 접근 가능한지 확인

**확인 항목**:

```typescript
// App.tsx에서 확인할 내용
<Route path="admin/users" element={
  <ProtectedRoute roles={['owner']}>
    <UsersPage />
  </ProtectedRoute>
} />
```

**예상 에러**:
- 라우트 미등록: 404 페이지 표시
- ProtectedRoute 미적용: 권한 없는 사용자도 접근 가능

**테스트 체크리스트**:
- [ ] http://localhost:3000/admin/users 접근 가능
- [ ] owner 계정으로 로그인 시 페이지 표시
- [ ] teacher 계정으로 접근 시 403 또는 리다이렉트

---

### Phase 10-2: 네비게이션 메뉴 연결 (예상 20분)

**목표**: 관리자 메뉴에서 사용자 관리 페이지 접근 가능

**수정 파일**:
- `frontend/src/components/admin/layout/AdminTopNav.tsx` 또는
- `frontend/src/components/admin/layout/AdminLayoutV5.tsx`

**추가할 메뉴 항목**:
```typescript
{
  label: '사용자 관리',
  path: '/admin/users',
  icon: '👥',
  roles: ['owner']  // owner만 표시
}
```

**예상 에러**:
- 메뉴 타입 불일치
- roles 필드 미지원

**테스트 체크리스트**:
- [ ] owner 로그인 시 메뉴에 "사용자 관리" 표시
- [ ] admin 로그인 시 메뉴 숨김
- [ ] 메뉴 클릭 시 /admin/users로 이동

---

### Phase 10-3: 본인 비밀번호 변경 UI (예상 40분)

**목표**: 로그인한 사용자가 본인 비밀번호 변경 가능

**신규 파일**: `frontend/src/components/auth/ChangePasswordModal.tsx`

**타입 정의**:
```typescript
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

**Supabase API 호출**:
```typescript
// 비밀번호 변경 (로그인 상태에서만 가능)
const { error } = await supabase.auth.updateUser({
  password: newPassword
});
```

**유효성 검사**:
- 새 비밀번호 8자 이상
- 영문 + 숫자 + 특수문자 포함
- 새 비밀번호 확인 일치

**예상 에러**:
- `supabase.auth.updateUser` 타입 에러
- 세션 만료 시 401 에러

**테스트 체크리스트**:
- [ ] 모달 열기/닫기
- [ ] 유효성 검사 메시지 표시
- [ ] 비밀번호 변경 성공
- [ ] 에러 시 메시지 표시

---

### Phase 10-4: 설정 페이지에 비밀번호 변경 버튼 추가 (예상 15분)

**목표**: 강사/관리자가 설정에서 비밀번호 변경 접근 가능

**수정 파일**:
- `frontend/src/pages/admin/AdminMobileSettings.tsx` (모바일)
- 또는 프로필 드롭다운 메뉴

**추가 내용**:
```tsx
<button onClick={() => setIsChangePasswordOpen(true)}>
  🔑 비밀번호 변경
</button>

<ChangePasswordModal
  isOpen={isChangePasswordOpen}
  onClose={() => setIsChangePasswordOpen(false)}
/>
```

**예상 에러**:
- import 경로 오류
- 상태 관리 충돌

---

### Phase 10-5: 통합 테스트 및 빌드 (예상 20분)

**테스트 시나리오**:

```
1. owner 계정 로그인
   ↓
2. /admin/users 페이지 접근
   ↓
3. 새 사용자 생성 (teacher)
   - 이름: 테스트강사
   - 이메일: test@hyeyum.com
   - 역할: teacher
   ↓
4. 임시 비밀번호 확인 및 복사
   ↓
5. 로그아웃 후 새 계정으로 로그인
   ↓
6. 비밀번호 변경 테스트
   ↓
7. 로그아웃 후 새 비밀번호로 로그인
```

**빌드 테스트**:
```bash
cd frontend
npm run build
```

**체크리스트**:
- [ ] TypeScript 에러 없음
- [ ] 빌드 성공
- [ ] 모든 시나리오 통과

---

## 3. 파일별 의존성 순서

```
1. App.tsx (라우트 등록 확인)
   ↓
2. AdminLayoutV5.tsx / AdminTopNav.tsx (메뉴 연결)
   ↓
3. ChangePasswordModal.tsx (신규 생성)
   ↓
4. AdminMobileSettings.tsx (비밀번호 변경 버튼)
   ↓
5. 빌드 테스트
```

---

## 4. 타입 정의 (미리 확정)

### ChangePasswordModal 타입

```typescript
// frontend/src/components/auth/ChangePasswordModal.tsx

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 폼 상태
interface PasswordFormState {
  newPassword: string;
  confirmPassword: string;
}

// 유효성 검사 결과
interface ValidationResult {
  isValid: boolean;
  errors: {
    newPassword?: string;
    confirmPassword?: string;
  };
}
```

### 비밀번호 규칙

```typescript
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: false,  // 간소화
  requireLowercase: false,
  requireNumber: true,
  requireSpecial: true,
};

function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('8자 이상이어야 합니다');
  }
  if (!/\d/.test(password)) {
    errors.push('숫자를 포함해야 합니다');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('특수문자를 포함해야 합니다');
  }

  return errors;
}
```

---

## 5. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `Route not found` | App.tsx에 라우트 미등록 | 라우트 추가 |
| `Property 'roles' does not exist` | 메뉴 타입에 roles 미정의 | 타입 확장 또는 조건부 렌더링 |
| `updateUser is not a function` | Supabase 타입 오류 | 타입 캐스팅 |
| `Session expired` | 토큰 만료 | 에러 처리 후 로그인 리다이렉트 |
| `Password too weak` | Supabase 비밀번호 정책 | 클라이언트 유효성 검사 강화 |

---

## 6. 환경변수 확인

### 백엔드 (.env)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # Service Role Key
```

### 프론트엔드 (.env.local)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  # Anon Key
VITE_API_URL=http://localhost:8000
```

---

## 7. 개발 순서 요약

| Phase | 작업 | 예상 시간 | 필수 |
|-------|------|----------|------|
| 10-1 | 라우트 확인 및 수정 | 15분 | ✅ |
| 10-2 | 네비게이션 메뉴 연결 | 20분 | ✅ |
| 10-3 | ChangePasswordModal 생성 | 40분 | 🟡 |
| 10-4 | 설정 페이지 연결 | 15분 | 🟡 |
| 10-5 | 통합 테스트 및 빌드 | 20분 | ✅ |

**총 예상 시간**: 약 2시간

---

## 8. 명령어 가이드

```
Phase 10-1 진행해줘  # 라우트 확인
Phase 10-2 진행해줘  # 메뉴 연결
Phase 10-3 진행해줘  # 비밀번호 변경 모달
Phase 10-4 진행해줘  # 설정 페이지 연결
Phase 10-5 진행해줘  # 빌드 테스트
```

---

## 9. 다음 단계

Phase 10-1부터 시작할까요?

1. App.tsx 확인
2. AdminLayoutV5.tsx 확인
3. 라우트/메뉴 수정 (필요시)

---

*작성: Claude Code*
