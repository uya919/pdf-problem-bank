# 433 역할 토글 + 통합 UI 단계별 개발 계획

> Stage 29: 역할 토글 + UI 통합
> 작성일: 2025-12-25
> 목적: 관리자가 강사 모드로 전환하여 본인 수업 확인 가능

---

## 1. 요구사항 정리

### 1.1 확인된 사항

| 항목 | 내용 |
|------|------|
| 관리자가 수업 담당? | ✅ 예 (이민혁 2개, 이한솔 1개 수업) |
| teachers 테이블 사용? | ❌ 비어있음, profiles.id 직접 사용 |
| 모드 상태 유지? | ✅ localStorage 저장 |

### 1.2 데이터 구조

```
profiles 테이블:
├── owner (1명): 원장
├── admin (2명): 이민혁, 이한솔
└── teacher (3명): 강사들

classes.teacher_id → profiles.id (직접 참조)
```

### 1.3 목표

| 플랫폼 | 현재 | 변경 후 |
|--------|------|--------|
| **모바일 (관리자)** | AdminMobileHome | BackofficeDemo (강사용 4탭) |
| **태블릿/PC (관리자)** | AdminDashboard만 | 토글로 강사↔관리자 전환 |
| **모바일/태블릿/PC (강사)** | BackofficeDemo | 변경 없음 |

---

## 2. 파일 변경 목록

| Phase | 파일 | 변경 유형 |
|-------|------|----------|
| 29-A | `frontend/src/stores/viewModeStore.ts` | 신규 |
| 29-B | `frontend/src/components/admin/RoleToggle.tsx` | 신규 |
| 29-C | `frontend/src/pages/HomePage.tsx` | 수정 |
| 29-D | `frontend/src/App.tsx` | 수정 |
| 29-E | `frontend/src/pages/admin/AdminResponsivePage.tsx` | 수정 |
| 29-F | `frontend/src/components/backoffice/tablet/TabletDashboard.tsx` | 수정 |

---

## 3. Phase 29-A: viewModeStore 생성

### 3.1 목표
역할 모드 상태를 Zustand로 관리 + localStorage 저장

### 3.2 파일 생성

**frontend/src/stores/viewModeStore.ts**

```typescript
/**
 * viewModeStore - 강사/관리자 뷰 모드 상태 관리
 *
 * - localStorage 저장으로 새로고침 시 유지
 * - 강사는 항상 'teacher' 모드
 * - 관리자/원장만 토글 가능
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'teacher' | 'admin';

interface ViewModeState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'admin', // 기본값: 관리자 모드
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleViewMode: () =>
        set((state) => ({
          viewMode: state.viewMode === 'admin' ? 'teacher' : 'admin',
        })),
    }),
    {
      name: 'hyeyum-view-mode', // localStorage 키
    }
  )
);
```

### 3.3 테스트 체크리스트
- [ ] `npm run build` 성공
- [ ] localStorage에 'hyeyum-view-mode' 저장 확인
- [ ] 새로고침 후 상태 유지 확인

---

## 4. Phase 29-B: RoleToggle 컴포넌트

### 4.1 목표
헤더 우측에 배치할 강사↔관리자 토글 버튼

### 4.2 파일 생성

**frontend/src/components/admin/RoleToggle.tsx**

```typescript
/**
 * RoleToggle - 강사/관리자 뷰 모드 전환 토글
 *
 * 위치: PC/태블릿 헤더 우측
 * 동작: 클릭 시 viewMode 전환
 */
import { useViewModeStore, type ViewMode } from '../../stores/viewModeStore';
import { User, Settings } from 'lucide-react';

interface RoleToggleProps {
  className?: string;
}

export function RoleToggle({ className = '' }: RoleToggleProps) {
  const { viewMode, setViewMode } = useViewModeStore();

  return (
    <div className={`flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => setViewMode('teacher')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'teacher'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <User size={16} />
        <span>강사</span>
      </button>
      <button
        onClick={() => setViewMode('admin')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'admin'
            ? 'bg-white text-[#3182F6] shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Settings size={16} />
        <span>관리자</span>
      </button>
    </div>
  );
}

export default RoleToggle;
```

### 4.3 테스트 체크리스트
- [ ] 토글 클릭 시 viewMode 변경
- [ ] 활성 버튼 스타일 구분
- [ ] 아이콘 정상 표시

---

## 5. Phase 29-C: HomePage 수정

### 5.1 목표
관리자 모바일 분기 제거 → 모든 디바이스에서 `/admin`으로 통합

### 5.2 수정 내용

**frontend/src/pages/HomePage.tsx**

```typescript
// 변경 전 (Line 61-67)
// 관리자/원장 + PC → 관리자 PC
if (isDesktop) {
  return <Navigate to="/admin" replace />;
}
// 관리자/원장 + 모바일/태블릿 → 관리자 모바일
return <Navigate to="/admin-mobile" replace />;

// 변경 후
// 관리자/원장 → 모든 디바이스에서 /admin (반응형 처리)
return <Navigate to="/admin" replace />;
```

### 5.3 테스트 체크리스트
- [ ] 강사 로그인 → `/backoffice`
- [ ] 관리자 로그인 (PC) → `/admin`
- [ ] 관리자 로그인 (모바일) → `/admin`

---

## 6. Phase 29-D: App.tsx 라우팅 수정

### 6.1 목표
`/admin-mobile` 라우트 숨김 처리 (코드 유지, 주석 처리)

### 6.2 수정 내용

**frontend/src/App.tsx**

```typescript
// 변경: /admin-mobile 라우트 주석 처리
{/* Stage 29: 관리자 모바일 숨김 (강사용 UI로 통합)
<Route path="admin-mobile" element={
  <ProtectedRoute roles={['admin', 'owner']}>
    <AdminMobileHome />
  </ProtectedRoute>
} />
*/}

// 추가: /admin-mobile → /admin 리다이렉트 (기존 북마크 대응)
<Route path="admin-mobile" element={<Navigate to="/admin" replace />} />
```

### 6.3 테스트 체크리스트
- [ ] `/admin-mobile` 접근 시 `/admin`으로 리다이렉트
- [ ] 기존 북마크 동작 확인

---

## 7. Phase 29-E: AdminResponsivePage 수정

### 7.1 목표
- 헤더에 RoleToggle 추가
- viewMode에 따라 강사용/관리자용 UI 분기
- 모바일에서도 강사용 UI (BackofficeDemo) 표시

### 7.2 수정 내용

**frontend/src/pages/admin/AdminResponsivePage.tsx**

```typescript
import { useViewModeStore } from '../../stores/viewModeStore';
import { RoleToggle } from '../../components/admin/RoleToggle';
import { BackofficeDemo } from '../BackofficeDemo';
import { TabletDashboard } from '../../components/backoffice/tablet';

function AdminResponsivePage() {
  const { profile } = useAuth();
  const { isMobile } = useBreakpoint();
  const { viewMode } = useViewModeStore();

  // 강사 모드 + 모바일 → BackofficeDemo (강사용 4탭)
  if (viewMode === 'teacher' && isMobile) {
    return <BackofficeDemo />;
  }

  // 강사 모드 + 태블릿/PC → TabletDashboard (강사용)
  if (viewMode === 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* 간단한 헤더 + 토글 */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">강사 대시보드</h1>
          <RoleToggle />
        </header>
        <TabletDashboard />
      </div>
    );
  }

  // 관리자 모드 + 모바일 → BackofficeDemo (관리자 기능 추가)
  if (isMobile) {
    return <BackofficeDemo isAdminMode />;
  }

  // 관리자 모드 + 태블릿/PC → 기존 AdminDashboard
  return (
    <AdminLayout>
      {/* 기존 헤더에 RoleToggle 추가 */}
      <AdminDashboard headerExtra={<RoleToggle />} />
    </AdminLayout>
  );
}
```

### 7.3 핵심 로직

```
viewMode === 'teacher'
├── isMobile → BackofficeDemo
└── !isMobile → TabletDashboard + 헤더 토글

viewMode === 'admin'
├── isMobile → BackofficeDemo (isAdminMode)
└── !isMobile → AdminDashboard + 헤더 토글
```

### 7.4 테스트 체크리스트
- [ ] 토글로 모드 전환 시 UI 변경
- [ ] 모바일에서 강사 모드 → 4탭 구조
- [ ] 태블릿/PC에서 강사 모드 → TabletDashboard

---

## 8. Phase 29-F: BackofficeDemo teacherId 연동

### 8.1 목표
강사 모드에서 로그인한 사용자(profile.id)의 수업만 표시

### 8.2 현재 상태

`BackofficeDemo.tsx`는 이미 `useAuth()`로 profile 접근 가능:

```typescript
// 현재 코드 (Line 45-48)
import { useAuth } from '../hooks/useAuth';
// ...
const { profile } = useAuth();
```

### 8.3 수정 내용

수업 조회 시 `teacherId` 파라미터 추가:

```typescript
// 현재
const { data: classes } = useClasses({ isActive: true });

// 변경
const { data: classes } = useClasses({
  isActive: true,
  teacherId: profile?.id,  // 본인 수업만
});
```

**주의**: 관리자 모드에서는 `teacherId` 없이 전체 수업 조회 필요

```typescript
// 조건부 필터링
const isTeacherMode = useViewModeStore(state => state.viewMode) === 'teacher';
const { data: classes } = useClasses({
  isActive: true,
  teacherId: isTeacherMode ? profile?.id : undefined,
});
```

### 8.4 테스트 체크리스트
- [ ] 강사 모드 → 본인 수업만 표시
- [ ] 관리자 모드 → 전체 수업 표시 (기존 동작)
- [ ] 토글 전환 시 수업 목록 갱신

---

## 9. 예상 에러 및 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| `useViewModeStore` not found | import 누락 | `import { useViewModeStore } from '@/stores/viewModeStore'` |
| localStorage 접근 오류 (SSR) | 서버 렌더링 시 | zustand/persist가 자동 처리 |
| 모드 전환 시 데이터 미갱신 | React Query 캐시 | `queryClient.invalidateQueries(['classes'])` |
| RoleToggle 미표시 | 헤더 구조 차이 | 각 레이아웃별 위치 조정 |

---

## 10. 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                     viewModeStore                            │
│                 (zustand + localStorage)                     │
│                                                              │
│  viewMode: 'teacher' | 'admin'                              │
│  setViewMode(mode)                                          │
│  toggleViewMode()                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│   AdminResponsive   │           │    BackofficeDemo   │
│                     │           │                     │
│ if (teacher) →      │           │ teacherId =         │
│   TabletDashboard   │           │   isTeacher ?       │
│ else →              │           │   profile.id :      │
│   AdminDashboard    │           │   undefined         │
└─────────────────────┘           └─────────────────────┘
```

---

## 11. 개발 순서 요약

```
Phase 29-A: viewModeStore 생성 (15분)
    └─ zustand store + localStorage persist

Phase 29-B: RoleToggle 컴포넌트 (15분)
    └─ 헤더 우측 토글 버튼

Phase 29-C: HomePage 수정 (10분)
    └─ 관리자 모바일 분기 제거

Phase 29-D: App.tsx 라우팅 수정 (10분)
    └─ admin-mobile 숨김 + 리다이렉트

Phase 29-E: AdminResponsivePage 수정 (30분)
    └─ viewMode 기반 조건부 렌더링

Phase 29-F: BackofficeDemo teacherId 연동 (20분)
    └─ 강사 모드에서 본인 수업만 표시
```

**총 예상 시간: 1.5~2시간**

---

## 12. 향후 고려사항

### 12.1 Phase 29-G (선택): 관리자 전용 메뉴

강사 모드에서도 일부 관리 기능 접근 필요 시:

```typescript
// 강사 모드에서 숨길 메뉴
const adminOnlyMenus = ['학생 관리', '정산', '설정'];

// 조건부 표시
{viewMode === 'admin' && <AdminMenu items={adminOnlyMenus} />}
```

### 12.2 Phase 29-H (선택): 모드별 헤더 색상

```typescript
// 강사 모드: 파란색 헤더
// 관리자 모드: 흰색 헤더
const headerBg = viewMode === 'teacher' ? 'bg-[#3182F6]' : 'bg-white';
```

---

*v1.0 - 2025-12-25*
