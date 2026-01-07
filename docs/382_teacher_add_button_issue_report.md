# 강사 추가 버튼 미작동 문제 분석 리포트

> 작성일: 2025-12-17
> 문제 페이지: `/admin/operations` → 강사 관리
> 상태: 분석 완료

---

## 1. 문제 현상

| 항목 | 내용 |
|------|------|
| 증상 | "강사 추가" 버튼 클릭 시 아무 반응 없음 |
| 위치 | `/admin/operations` 페이지 → 좌측 메뉴 "강사 관리" 선택 |
| 기대 동작 | 강사 추가 모달 또는 폼이 열려야 함 |

---

## 2. 원인 분석

### 2.1 코드 위치

**파일**: `frontend/src/pages/admin/OperationsPage.tsx`
**라인**: 531-533

```typescript
<button className="px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2">
  <span>➕</span> 강사 추가
</button>
```

### 2.2 문제점

| # | 문제 | 설명 |
|---|------|------|
| 1 | `onClick` 핸들러 없음 | 버튼에 클릭 이벤트가 연결되지 않음 |
| 2 | 모달 컴포넌트 없음 | 강사 추가 모달이 존재하지 않음 |
| 3 | 상태 관리 없음 | 모달 열기/닫기 상태(`isModalOpen`) 없음 |
| 4 | API 연결 없음 | 강사 추가 API (`createTeacher`) 없음 |

### 2.3 현재 상태

- `TeachersManagementView` 컴포넌트는 **Mock 데이터**(`MOCK_TEACHERS`) 사용
- 검색/필터 기능은 작동
- CRUD 기능 중 **조회(Read)만** 구현됨
- 생성(Create), 수정(Update), 삭제(Delete) 미구현

---

## 3. 관련 코드 분석

### 3.1 Mock 데이터 구조

```typescript
interface MockTeacher {
  id: string;
  name: string;
  subject: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  classes: string[];
  joinDate: string;
  note?: string;
}
```

### 3.2 기존 구현 현황

| 기능 | 구현 여부 | 비고 |
|------|----------|------|
| 강사 목록 조회 | ✅ 완료 | Mock 데이터 |
| 강사 검색 | ✅ 완료 | 이름/과목 |
| 상태 필터 | ✅ 완료 | 전체/재직/휴직 |
| 강사 추가 | ❌ 미구현 | onClick 없음 |
| 강사 수정 | ❌ 미구현 | ⋮ 버튼 기능 없음 |
| 강사 삭제 | ❌ 미구현 | - |

---

## 4. 해결 방안

### 4.1 옵션 A: Mock 기반 CRUD 구현 (권장)

현재 Mock 데이터 기반으로 CRUD 기능 구현 후, 나중에 Supabase 연결

**필요 작업**:
1. `CreateTeacherModal` 컴포넌트 생성
2. `TeachersManagementView`에 모달 상태 추가
3. Mock 데이터 상태 관리 (useState)
4. 수정/삭제 기능 추가

**예상 시간**: 2시간

### 4.2 옵션 B: Supabase 연결 후 구현

Supabase `teachers` 테이블 연결 후 실제 CRUD 구현

**필요 작업**:
1. `frontend/src/api/teachers.ts` 생성
2. `frontend/src/hooks/useTeachers.ts` 생성
3. `CreateTeacherModal` 컴포넌트 생성
4. `EditTeacherModal` 컴포넌트 생성
5. RLS 정책 설정

**예상 시간**: 4시간

### 4.3 옵션 C: 반 관리 패턴 재사용

기존 `/admin/classes` 페이지의 패턴을 재사용

**참고 파일**:
- `frontend/src/pages/admin/ClassManagementPage.tsx`
- `frontend/src/api/classes.ts`
- `frontend/src/hooks/useClasses.ts`
- `frontend/src/components/admin/classes/CreateClassModal.tsx`

---

## 5. 권장 구현 계획

### Phase 1: 빠른 수정 (Mock 기반)

```typescript
// TeachersManagementView 수정
function TeachersManagementView() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // ...

  return (
    <div>
      {/* 버튼에 onClick 추가 */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="..."
      >
        <span>➕</span> 강사 추가
      </button>

      {/* 모달 */}
      {isCreateModalOpen && (
        <CreateTeacherModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
}
```

### Phase 2: 모달 컴포넌트 생성

**파일**: `frontend/src/components/admin/teachers/CreateTeacherModal.tsx`

```typescript
interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (teacher: MockTeacher) => void;
}

export function CreateTeacherModal({ isOpen, onClose, onSave }: CreateTeacherModalProps) {
  // 폼 상태
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // ...
}
```

### Phase 3: Supabase 연결 (장기)

Stage 8 완료 후 `teachers` 테이블과 연결

---

## 6. 관련 이슈

### 6.1 다른 미작동 버튼들

| 위치 | 버튼 | 상태 |
|------|------|------|
| 강사 관리 | ⋮ (더보기) | onClick 없음 |
| Timetable Studio | 저장하기 | onClick 없음 |
| Timetable Studio | 불러오기 | onClick 없음 |
| 학원 설정 | 저장하기 | onClick 없음 |
| 학원 설정 | ✏️ 편집 | onClick 없음 |

### 6.2 Mock vs Supabase 결정 필요

| 뷰 | 현재 상태 | 권장 |
|----|----------|------|
| Timetable Studio | Mock | Mock 유지 (복잡도) |
| 강사 관리 | Mock | Supabase 연결 |
| 학원 설정 | Mock | Supabase 연결 |
| 메이크에듀 동기화 | Supabase | ✅ 완료 |

---

## 7. 결론

### 즉시 수정 가능

"강사 추가" 버튼이 작동하지 않는 이유는 **onClick 핸들러가 없기 때문**입니다.

**가장 빠른 수정**:
1. `useState`로 모달 상태 추가
2. 버튼에 `onClick={() => setIsCreateModalOpen(true)}` 추가
3. 간단한 모달 컴포넌트 생성 (CreateClassModal 패턴 참고)

**예상 시간**: 30분 ~ 1시간

---

## 8. 다음 단계

1. [ ] Phase 1: 빠른 수정 (모달 상태 + onClick 추가)
2. [ ] Phase 2: CreateTeacherModal 컴포넌트 생성
3. [ ] Phase 3: EditTeacherModal 컴포넌트 생성
4. [ ] Phase 4: Supabase 연결 (선택)

---

*작성: Claude Code*
