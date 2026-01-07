# 인증 및 권한 시스템 개발 계획

> 작성일: 2025-12-17
> 상태: 계획 수립

---

## 1. 목표

강사/관리자 로그인 및 권한 기반 접근 제어 시스템 구축

---

## 2. 권한 체계

| 역할 | 코드 | 설명 | 접근 범위 |
|------|------|------|-----------|
| 강사 | `teacher` | 수업 담당 선생님 | **본인 수업 + 본인 학생만** |
| 관리자 | `admin` | 학원 매니저 | 전체 수업/학생 |
| 원장 | `owner` | 학원 대표 | 전체 + 설정/정산 |

### 강사 접근 제한 상세

```
강사 A가 [중1수학A반], [중2수학B반] 담당 시:

✅ 볼 수 있는 것:
- 중1수학A반, 중2수학B반 (본인 수업)
- 해당 반에 등록된 학생들만
- 해당 학생들의 진도/숙제/출결 기록

❌ 볼 수 없는 것:
- 다른 강사의 수업
- 다른 강사 수업에만 등록된 학생
- 다른 강사의 진도 기록
```

---

## 3. 기술 스택

- **인증**: Supabase Auth (이메일/비밀번호)
- **권한**: RLS (Row Level Security) + profiles 테이블
- **프론트엔드**: React Context + Protected Routes

---

## 4. 단계별 개발 계획

### Phase 1: 데이터베이스 스키마 (1단계)

**목표**: profiles 테이블 생성 및 RLS 설정

**작업 내용**:
```sql
-- 1. profiles 테이블 생성
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin', 'owner')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 인덱스
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 3. RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
-- 본인 프로필 조회
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 관리자는 모든 프로필 조회
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- 5. 트리거: auth.users 생성 시 profiles 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**체크리스트**:
- [ ] profiles 테이블 생성
- [ ] RLS 정책 설정
- [ ] 트리거 생성
- [ ] 테스트 사용자 생성

---

### Phase 2: 프론트엔드 Auth 컨텍스트 (2단계)

**목표**: 로그인 상태 관리 및 권한 체크

**파일 구조**:
```
frontend/src/
├── contexts/
│   └── AuthContext.tsx      # 인증 상태 관리
├── hooks/
│   └── useAuth.ts           # 인증 훅 (기존 파일 확장)
├── components/
│   └── auth/
│       ├── LoginForm.tsx    # 로그인 폼
│       ├── ProtectedRoute.tsx  # 권한 체크 라우트
│       └── RoleGuard.tsx    # 역할별 접근 제어
└── pages/
    └── auth/
        └── LoginPage.tsx    # 로그인 페이지
```

**AuthContext.tsx**:
```tsx
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: 'teacher' | 'admin' | 'owner' | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRole: string[]) => boolean;
}
```

**체크리스트**:
- [ ] AuthContext 생성
- [ ] useAuth 훅 확장
- [ ] 로그인 상태 persist (localStorage)

---

### Phase 3: 로그인 UI (3단계)

**목표**: 로그인 페이지 및 폼 구현

**디자인 (토스 스타일)**:
```
┌─────────────────────────────────────┐
│                                     │
│         🏫 혜윰학원                  │
│         백오피스 로그인              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📧 이메일                    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🔒 비밀번호                  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [        로그인        ]           │
│                                     │
│  비밀번호를 잊으셨나요?             │
│                                     │
└─────────────────────────────────────┘
```

**체크리스트**:
- [ ] LoginPage.tsx 생성
- [ ] LoginForm.tsx 컴포넌트
- [ ] 에러 처리 (잘못된 비밀번호 등)
- [ ] 로딩 상태 표시

---

### Phase 4: Protected Routes (4단계)

**목표**: 권한별 라우트 보호

**라우트 구조**:
```tsx
<Routes>
  {/* 공개 */}
  <Route path="/login" element={<LoginPage />} />

  {/* 강사 + 관리자 */}
  <ProtectedRoute roles={['teacher', 'admin', 'owner']}>
    <Route path="/backoffice/*" element={<BackofficeRoutes />} />
  </ProtectedRoute>

  {/* 관리자만 */}
  <ProtectedRoute roles={['admin', 'owner']}>
    <Route path="/admin/*" element={<AdminRoutes />} />
  </ProtectedRoute>

  {/* 원장만 */}
  <ProtectedRoute roles={['owner']}>
    <Route path="/settings/*" element={<SettingsRoutes />} />
  </ProtectedRoute>
</Routes>
```

**체크리스트**:
- [ ] ProtectedRoute 컴포넌트
- [ ] RoleGuard 컴포넌트
- [ ] 미인증 시 로그인 리다이렉트
- [ ] 권한 부족 시 403 페이지

---

### Phase 5: 사용자 관리 UI (5단계)

**목표**: 관리자가 강사 계정 생성/관리

**기능**:
- 강사 계정 생성 (이메일 초대)
- 권한 변경 (teacher ↔ admin)
- 계정 비활성화
- 비밀번호 초기화

**페이지**:
```
/admin/users
├── 사용자 목록 (테이블)
├── 새 사용자 초대 (모달)
└── 사용자 상세/수정 (사이드패널)
```

**체크리스트**:
- [ ] AdminUsersPage.tsx
- [ ] UserInviteModal.tsx
- [ ] UserDetailPanel.tsx
- [ ] 이메일 초대 기능

---

### Phase 6: 강사-수업 연결 (6단계)

**목표**: 강사별 담당 수업 설정

**스키마 확장**:
```sql
-- teachers 테이블 또는 profiles에 추가
-- 강사-수업 연결 테이블
CREATE TABLE public.teacher_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id),
  class_id UUID REFERENCES public.classes(id),
  is_primary BOOLEAN DEFAULT false,  -- 주담당 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id)
);
```

**체크리스트**:
- [ ] teacher_classes 테이블 생성
- [ ] 강사별 수업 필터링 RLS
- [ ] 수업 배정 UI

---

### Phase 7: 데이터 필터링 RLS (7단계)

**목표**: 역할별 데이터 접근 제어

**RLS 정책**:
```sql
-- students: 강사는 본인 수업 학생만
CREATE POLICY "Teachers see own class students"
  ON public.students FOR SELECT
  USING (
    -- 관리자는 모두 조회
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR
    -- 강사는 본인 수업 학생만
    EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.teacher_classes tc ON e.class_id = tc.class_id
      WHERE tc.teacher_id = auth.uid() AND e.student_id = students.id
    )
  );

-- classes: 강사는 본인 수업만
CREATE POLICY "Teachers see own classes"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.teacher_classes
      WHERE teacher_id = auth.uid() AND class_id = classes.id
    )
  );
```

**체크리스트**:
- [ ] students RLS
- [ ] classes RLS
- [ ] enrollments RLS
- [ ] progress_records RLS

---

## 5. 우선순위 및 일정

| Phase | 내용 | 우선순위 | 예상 작업량 |
|-------|------|----------|-------------|
| **1** | DB 스키마 | 🔴 필수 | 작음 |
| **2** | Auth Context | 🔴 필수 | 중간 |
| **3** | 로그인 UI | 🔴 필수 | 중간 |
| **4** | Protected Routes | 🔴 필수 | 작음 |
| **5** | 사용자 관리 | 🟡 중요 | 큼 |
| **6** | 강사-수업 연결 | 🟡 중요 | 중간 |
| **7** | RLS 정책 | 🟢 권장 | 중간 |

**MVP (최소 기능)**:
- Phase 1~4 완료 시 로그인/권한 분리 가능

---

## 6. 테스트 계정 (Phase 1에서 생성)

| 이메일 | 비밀번호 | 역할 | 용도 |
|--------|----------|------|------|
| owner@hyeyum.com | Test1234! | owner | 원장 테스트 |
| admin@hyeyum.com | Test1234! | admin | 관리자 테스트 |
| teacher@hyeyum.com | Test1234! | teacher | 강사 테스트 |

---

## 7. 다음 단계

Phase 1부터 시작할까요?

1. profiles 테이블 생성
2. RLS 정책 설정
3. 테스트 사용자 생성

---

*작성: Claude Code*
