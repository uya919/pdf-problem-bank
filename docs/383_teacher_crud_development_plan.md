# 강사 관리 CRUD 개발 계획

> 작성일: 2025-12-17
> 참조: [382_teacher_add_button_issue_report](382_teacher_add_button_issue_report.md)
> 위치: `/admin/operations` → 강사 관리

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| **목적** | 강사 추가/수정/삭제 기능 구현 |
| **현재 상태** | 조회(Read)만 구현, CUD 미구현 |
| **데이터 소스** | Mock 데이터 → Supabase 연결 예정 |

---

## 2. 개발 단계

### Phase 9-1: CreateTeacherModal 컴포넌트 생성

**목표**: 강사 추가 모달 컴포넌트 구현

**파일**: `frontend/src/components/admin/teachers/CreateTeacherModal.tsx`

**작업 내용**:
- [ ] React Portal 기반 모달 (z-index: 9999)
- [ ] 입력 필드: 이름, 과목, 연락처, 이메일, 메모
- [ ] 유효성 검사 (이름 필수)
- [ ] Mock 데이터에 추가 (useState)

**UI 참고**: `CreateClassModal.tsx` 패턴 재사용

```typescript
interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: MockTeacher) => void;
}
```

---

### Phase 9-2: TeachersManagementView 모달 연결

**목표**: 강사 추가 버튼에 onClick 핸들러 연결

**파일**: `frontend/src/pages/admin/OperationsPage.tsx`

**작업 내용**:
- [ ] `useState`로 모달 상태 관리 (`isCreateModalOpen`)
- [ ] `useState`로 강사 목록 상태 관리 (`teachers`)
- [ ] 버튼에 `onClick={() => setIsCreateModalOpen(true)}` 추가
- [ ] `CreateTeacherModal` 임포트 및 렌더링
- [ ] `onSave` 핸들러로 Mock 목록에 추가

**수정 위치**: `TeachersManagementView` 함수 (라인 450~580)

---

### Phase 9-3: EditTeacherModal 컴포넌트 생성

**목표**: 강사 수정 모달 컴포넌트 구현

**파일**: `frontend/src/components/admin/teachers/EditTeacherModal.tsx`

**작업 내용**:
- [ ] CreateTeacherModal과 유사한 구조
- [ ] 기존 데이터 pre-fill
- [ ] 수정 저장 핸들러

```typescript
interface EditTeacherModalProps {
  isOpen: boolean;
  teacher: MockTeacher;
  onClose: () => void;
  onSave: (teacher: MockTeacher) => void;
}
```

---

### Phase 9-4: 더보기(⋮) 메뉴 기능 추가

**목표**: 강사 카드의 더보기 버튼에 수정/삭제 메뉴 연결

**파일**: `frontend/src/pages/admin/OperationsPage.tsx`

**작업 내용**:
- [ ] 더보기 메뉴 드롭다운 상태 관리
- [ ] "수정" 클릭 시 EditTeacherModal 열기
- [ ] "삭제" 클릭 시 확인 후 Mock 목록에서 제거
- [ ] 외부 클릭 시 메뉴 닫기

**UI 패턴**:
```tsx
{/* 더보기 메뉴 */}
{menuOpen === teacher.id && (
  <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-50">
    <button onClick={() => handleEdit(teacher)}>수정</button>
    <button onClick={() => handleDelete(teacher.id)}>삭제</button>
  </div>
)}
```

---

### Phase 9-5: 빌드 테스트 및 폴리시

**목표**: 빌드 확인 및 UI 개선

**작업 내용**:
- [ ] TypeScript 빌드 에러 확인
- [ ] 모달 애니메이션 추가 (fade-in)
- [ ] 로딩 상태 UI
- [ ] 성공/실패 토스트 메시지 (선택)

---

## 3. 파일 구조

```
frontend/src/
├── components/admin/teachers/         # 신규 디렉토리
│   ├── CreateTeacherModal.tsx        # Phase 9-1
│   ├── EditTeacherModal.tsx          # Phase 9-3
│   └── index.ts                      # 배럴 파일
│
└── pages/admin/
    └── OperationsPage.tsx            # Phase 9-2, 9-4 수정
```

---

## 4. Mock 데이터 구조

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

// 예시
const newTeacher: MockTeacher = {
  id: `teacher-${Date.now()}`,
  name: '새 강사',
  subject: '수학',
  phone: '010-0000-0000',
  email: 'new@hyeyum.com',
  status: 'active',
  classes: [],
  joinDate: new Date().toISOString().split('T')[0],
};
```

---

## 5. 향후 계획 (Supabase 연결)

현재는 Mock 데이터 기반으로 구현하고, 추후 Supabase 연결 시:

| 작업 | 파일 |
|------|------|
| API 클라이언트 | `frontend/src/api/teachers.ts` |
| React Query 훅 | `frontend/src/hooks/useTeachers.ts` |
| RLS 정책 | `supabase/migrations/xxx_teachers_rls.sql` |

---

## 6. 예상 시간

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 9-1 | CreateTeacherModal | 30분 |
| 9-2 | 모달 연결 | 15분 |
| 9-3 | EditTeacherModal | 30분 |
| 9-4 | 더보기 메뉴 | 30분 |
| 9-5 | 빌드 테스트 | 15분 |
| **합계** | | **2시간** |

---

## 7. 명령어 가이드

```
Phase 9-1 진행해줘  # CreateTeacherModal 생성
Phase 9-2 진행해줘  # 모달 연결
Phase 9-3 진행해줘  # EditTeacherModal 생성
Phase 9-4 진행해줘  # 더보기 메뉴
Phase 9-5 진행해줘  # 빌드 테스트
```

---

## 8. 관련 미작동 버튼 (382 리포트 참조)

이 계획 완료 후 추가 작업 필요:

| 위치 | 버튼 | 우선순위 |
|------|------|----------|
| Timetable Studio | 저장하기, 불러오기 | 낮음 (Stage 5) |
| 학원 설정 | 저장하기, ✏️ 편집 | 중간 |

---

*작성: Claude Code*
