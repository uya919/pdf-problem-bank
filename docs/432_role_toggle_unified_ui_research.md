# 432 역할 토글 + 통합 UI 연구 리포트

> 작성일: 2025-12-25
> 목적: 강사/관리자 역할 토글 및 UI 통합 가능성 분석

---

## 1. 요청 사항 정리

### 1.1 사용자 요구

| 항목 | 내용 |
|------|------|
| **강사용 4탭 구조** | 히어로 + 4탭(출결/진도/숙제/성적)을 관리자 모바일에도 적용 |
| **관리자 모바일 폐기** | 현재 AdminMobileHome 사용 안함 (코드는 숨김 처리) |
| **역할 토글** | PC/태블릿 헤더 우측에 강사↔관리자 전환 토글 |
| **강사 모드** | 본인 수업만 표시 |
| **관리자 모드** | 현재 관리자용 UI 유지 |

### 1.2 확인된 사항

| 질문 | 답변 |
|------|------|
| 강사 모드에서 누구의 수업? | **본인 수업만** (관리자 본인이 담당하는 수업) |
| 관리자 모바일 폐기 방식? | **숨김** (라우팅 제거, 코드 유지) |
| 토글 위치? | **헤더 우측** |

---

## 2. 현재 시스템 분석

### 2.1 역할 체계

```typescript
// contexts/AuthContext.tsx
export type UserRole = 'teacher' | 'admin' | 'owner';

interface AuthContextType {
  role: UserRole | null;
  isTeacher: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}
```

### 2.2 라우팅 구조

```
/ (HomePage) → 역할+디바이스 기반 자동 분기
├── /backoffice  → 강사용 모바일/태블릿 (BackofficeDemo)
├── /admin       → 관리자용 반응형 (AdminResponsivePage)
└── /admin-mobile → 관리자용 모바일 (AdminMobileHome) ← 폐기 예정
```

### 2.3 수업 필터링

강사용 대시보드는 이미 `teacherId` 기반 필터링 구현됨:

```typescript
// useBackofficeData.ts
export function useClasses(options?: {
  teacherId?: string;
}) {
  // ...
  if (options?.teacherId) {
    query = query.eq('teacher_id', options.teacherId);
  }
}
```

### 2.4 관련 파일 목록

| 파일 | 역할 | 변경 필요 |
|------|------|---------|
| `App.tsx` | 라우팅 정의 | ✅ admin-mobile 제거 |
| `HomePage.tsx` | 역할별 리다이렉트 | ✅ 분기 수정 |
| `AuthContext.tsx` | 인증/역할 관리 | ⬜ 유지 |
| `BackofficeDemo.tsx` | 강사용 대시보드 | ⬜ 유지 |
| `AdminResponsivePage.tsx` | 관리자 반응형 | ✅ 토글 추가 |
| `AdminMobileHome.tsx` | 관리자 모바일 | ⬜ 숨김 (삭제 X) |

---

## 3. 구현 가능성 분석

### 3.1 기술적 가능성: ✅ 높음

| 항목 | 상태 | 이유 |
|------|------|------|
| 역할 토글 UI | ✅ 가능 | 단순 상태 관리 |
| 조건부 렌더링 | ✅ 가능 | React 기본 기능 |
| teacherId 필터 | ✅ 이미 구현됨 | useClasses 등 |
| 라우팅 수정 | ✅ 가능 | 간단한 변경 |

### 3.2 핵심 구현 로직

```typescript
// 새로운 상태: 현재 모드 (강사/관리자)
const [viewMode, setViewMode] = useState<'teacher' | 'admin'>('admin');

// 강사 모드일 때 본인 ID로 필터링
const teacherId = viewMode === 'teacher' ? profile?.id : undefined;

// 조건부 렌더링
{viewMode === 'teacher' ? (
  <BackofficeDemo teacherId={profile?.id} />
) : (
  <AdminDashboard />
)}
```

---

## 4. 우려되는 점

### 4.1 데이터 권한 문제

| 우려 | 설명 | 해결 방안 |
|------|------|----------|
| **관리자가 강사 데이터 접근** | 관리자가 강사 모드에서 본인 수업만 봐야 함 | `teacherId` 필터링 (클라이언트 + RLS) |
| **RLS 정책 충돌** | 관리자는 모든 데이터 조회 가능 | 클라이언트에서 필터링 (RLS는 유지) |
| **teachers 테이블 vs profiles** | 관리자가 teachers에 등록되어 있어야 함 | profile.id를 teacher_id로 사용 |

### 4.2 UX 일관성 문제

| 우려 | 설명 | 해결 방안 |
|------|------|----------|
| **모드 전환 혼란** | 어떤 모드인지 명확히 인지해야 함 | 헤더에 현재 모드 표시 + 색상 구분 |
| **데이터 새로고침** | 모드 전환 시 데이터 리로드 필요 | React Query invalidateQueries |
| **4탭 구조 차이** | 강사용과 관리자용 탭 내용이 다름 | 공통 컴포넌트 사용 |

### 4.3 모바일 분기 복잡성

| 우려 | 설명 | 해결 방안 |
|------|------|----------|
| **관리자 모바일 → 강사용** | 관리자도 모바일에서 강사용 UI 사용 | BackofficeDemo 재사용 |
| **역할별 기능 차이** | 관리자만 볼 수 있는 메뉴 | 조건부 렌더링 (role 체크) |

---

## 5. 설계 제안

### 5.1 아키텍처 개요

```
┌──────────────────────────────────────────────────────────┐
│                      App.tsx                              │
├──────────────────────────────────────────────────────────┤
│  /                  → HomePage (역할 분기)               │
│  /backoffice        → BackofficeDemo (강사 + 관리자)     │
│  /admin             → AdminResponsivePage + RoleToggle   │
│  /admin-mobile      → (제거)                             │
└──────────────────────────────────────────────────────────┘
```

### 5.2 역할 토글 컴포넌트

```tsx
// components/admin/RoleToggle.tsx
interface RoleToggleProps {
  currentMode: 'teacher' | 'admin';
  onChange: (mode: 'teacher' | 'admin') => void;
}

function RoleToggle({ currentMode, onChange }: RoleToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('teacher')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'teacher'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        강사
      </button>
      <button
        onClick={() => onChange('admin')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentMode === 'admin'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        관리자
      </button>
    </div>
  );
}
```

### 5.3 HomePage 수정

```tsx
// pages/HomePage.tsx (수정)
export default function HomePage() {
  const { role, isDesktop } = useAuth();

  // 강사 → 강사용 대시보드
  if (role === 'teacher') {
    return <Navigate to="/backoffice" replace />;
  }

  // 관리자/원장 → 모든 디바이스에서 /admin으로 통합
  // (모바일에서도 /admin, 반응형으로 처리)
  return <Navigate to="/admin" replace />;
}
```

### 5.4 AdminResponsivePage 수정

```tsx
// pages/admin/AdminResponsivePage.tsx (수정)
function AdminResponsivePage() {
  const { profile } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const [viewMode, setViewMode] = useState<'teacher' | 'admin'>('admin');

  // 모바일 + 강사모드 → BackofficeDemo
  if (isMobile && viewMode === 'teacher') {
    return <BackofficeDemo teacherId={profile?.id} />;
  }

  // 모바일 + 관리자모드 → BackofficeDemo (관리자 기능 추가)
  // 또는 현재 AdminMobileHome 대신 BackofficeDemo 사용
  if (isMobile) {
    return <BackofficeDemo teacherId={undefined} isAdminMode />;
  }

  // 태블릿/PC
  return (
    <AdminLayout>
      <header className="flex justify-between items-center">
        <h1>대시보드</h1>
        <RoleToggle currentMode={viewMode} onChange={setViewMode} />
      </header>

      {viewMode === 'teacher' ? (
        <TabletDashboard teacherId={profile?.id} />
      ) : (
        <AdminDashboard />
      )}
    </AdminLayout>
  );
}
```

---

## 6. 개발 단계 제안

### Phase 1: 라우팅 정리
- [ ] App.tsx에서 `/admin-mobile` 라우트 주석 처리
- [ ] HomePage.tsx에서 관리자 모바일 분기 제거
- [ ] 관리자도 모바일에서 `/admin` 접근

### Phase 2: 역할 토글 구현
- [ ] RoleToggle 컴포넌트 생성
- [ ] AdminResponsivePage에 토글 추가
- [ ] viewMode 상태 관리

### Phase 3: 강사 모드 연동
- [ ] BackofficeDemo에 teacherId prop 추가
- [ ] TabletDashboard에 teacherId prop 추가
- [ ] 조건부 렌더링 구현

### Phase 4: 관리자 모바일 UI 통합
- [ ] 관리자 모바일에서 BackofficeDemo 사용
- [ ] 관리자 전용 메뉴 조건부 표시

---

## 7. 질문/확인 사항

### 7.1 데이터 관련

| 질문 | 필요한 이유 |
|------|------------|
| 관리자가 teachers 테이블에 있나요? | 강사 모드에서 본인 수업을 조회하려면 teacher_id 필요 |
| 관리자도 수업을 담당하나요? | 담당하지 않으면 강사 모드에서 "수업 없음" 표시 |

### 7.2 UI 관련

| 질문 | 옵션 |
|------|------|
| 모드 전환 시 페이지 새로고침? | A. 새로고침 / B. 컴포넌트만 교체 |
| 모드 상태 저장? | A. localStorage 저장 / B. 세션 동안만 유지 |
| 모바일에서 관리자 기능 필요? | A. 강사용 UI만 / B. 일부 관리 기능 포함 |

### 7.3 권한 관련

| 질문 | 고려 사항 |
|------|----------|
| 강사가 토글을 볼 수 있나요? | 강사는 토글 불필요 (본인 모드만) |
| 원장(owner)도 토글 사용? | owner도 admin과 동일하게 처리? |

---

## 8. 결론

### 8.1 구현 가능성

| 항목 | 결과 |
|------|------|
| 기술적 가능성 | ✅ 높음 |
| 코드 복잡도 | 중간 (기존 컴포넌트 재사용) |
| 예상 작업량 | 2-3일 |

### 8.2 권장 사항

1. **Phase 1부터 순차 진행** - 라우팅 정리 먼저
2. **teachers 테이블 확인** - 관리자가 강사로 등록되어 있는지
3. **모드 상태 localStorage 저장** - 새로고침 시 유지

### 8.3 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 관리자가 teachers에 없음 | 강사 모드 "수업 없음" | 안내 메시지 표시 |
| 기존 admin-mobile 사용자 혼란 | 북마크 깨짐 | 리다이렉트 처리 |
| 복잡한 조건부 렌더링 | 유지보수 어려움 | 명확한 분기 구조 |

---

*v1.0 - 2025-12-25*
