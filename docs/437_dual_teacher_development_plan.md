# 초등부 담임/부담임 시스템 개발 계획

> 개발 계획 #437
> 작성일: 2025-12-26
> 참조: [436_elementary_dual_teacher_research.md](436_elementary_dual_teacher_research.md)

---

## 개요

초등부 반에 담임(월/수/금)과 부담임(화/목)을 배정하는 시스템 구현

---

## Stage 31: 초등부 담임/부담임 시스템

### Phase 31-A: DB 스키마 변경

**작업 내용:**
1. classes 테이블에 4개 컬럼 추가
2. 기존 데이터 마이그레이션 (초등부만)

**파일 생성:**
- `supabase/migrations/010_dual_teacher.sql`

```sql
-- 담임/부담임 컬럼 추가
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id UUID REFERENCES profiles(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_teacher_id UUID REFERENCES profiles(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_days integer[] DEFAULT NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_days integer[] DEFAULT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_classes_homeroom_teacher ON classes(homeroom_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_assistant_teacher ON classes(assistant_teacher_id);

-- 기존 초등부 데이터 마이그레이션 (teacher_id → homeroom_teacher_id)
UPDATE classes
SET homeroom_teacher_id = teacher_id,
    homeroom_days = day_of_week
WHERE grade_id IN (SELECT id FROM grades WHERE name LIKE '초%')
  AND teacher_id IS NOT NULL;

-- RLS 정책 업데이트: 담임/부담임도 수정 가능
DROP POLICY IF EXISTS "classes_update_by_teachers" ON classes;
CREATE POLICY "classes_update_by_teachers" ON classes
FOR UPDATE TO authenticated
USING (
  teacher_id = auth.uid() OR
  homeroom_teacher_id = auth.uid() OR
  assistant_teacher_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);
```

**테스트 체크리스트:**
- [ ] 마이그레이션 실행 성공
- [ ] 기존 초등부 반의 homeroom_teacher_id에 teacher_id 값 복사 확인
- [ ] 새 컬럼 조회 가능 확인

---

### Phase 31-B: TypeScript 타입 업데이트

**작업 내용:**
1. ClassData 인터페이스 확장
2. CreateClassInput, UpdateClassInput 확장

**파일 수정:**
- `frontend/src/api/classes.ts`

```typescript
// ClassData에 추가
export interface ClassData {
  // ... 기존 필드
  homeroom_teacher_id: string | null;      // 담임
  assistant_teacher_id: string | null;     // 부담임
  homeroom_days: number[] | null;          // 담임 요일 [1,3,5]
  assistant_days: number[] | null;         // 부담임 요일 [2,4]
  // 조인 데이터 추가
  homeroom_teacher?: { id: string; name: string } | null;
  assistant_teacher?: { id: string; name: string } | null;
}

// CreateClassInput에 추가
export interface CreateClassInput {
  // ... 기존 필드
  homeroom_teacher_id?: string | null;
  assistant_teacher_id?: string | null;
  homeroom_days?: number[] | null;
  assistant_days?: number[] | null;
}

// UpdateClassInput에 추가
export interface UpdateClassInput {
  // ... 기존 필드
  homeroom_teacher_id?: string | null;
  assistant_teacher_id?: string | null;
  homeroom_days?: number[] | null;
  assistant_days?: number[] | null;
}
```

**테스트 체크리스트:**
- [ ] TypeScript 빌드 성공
- [ ] 타입 에러 없음

---

### Phase 31-C: API 쿼리 수정

**작업 내용:**
1. getClasses() - 담임/부담임 조인 추가
2. getClass() - 담임/부담임 조인 추가

**파일 수정:**
- `frontend/src/api/classes.ts`

```typescript
// getClasses 수정
export async function getClasses(filters?: ClassFilters): Promise<ClassData[]> {
  let query = supabase
    .from('classes')
    .select(`
      *,
      grades(id, name),
      teachers:profiles!classes_teacher_id_fkey(id, name),
      subjects(id, name, code, color),
      homeroom_teacher:profiles!classes_homeroom_teacher_id_fkey(id, name),
      assistant_teacher:profiles!classes_assistant_teacher_id_fkey(id, name)
    `)
    .order('name');
  // ...
}
```

**테스트 체크리스트:**
- [ ] API 호출 시 담임/부담임 정보 포함 확인
- [ ] 조인 에러 없음

---

### Phase 31-D: 반관리 테이블 UI 수정

**작업 내용:**
1. 초등부 필터 시 담임/부담임 컬럼 표시
2. 중등부/고등부는 기존 "담당 강사" 유지

**파일 수정:**
- `frontend/src/pages/admin/ClassManagementPage.tsx`

```typescript
// 초등부 여부 확인 헬퍼
function isElementaryClass(cls: ClassData): boolean {
  const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
  return gradeName?.startsWith('초') || false;
}

// 테이블 헤더 조건부 렌더링
{filterDivision === 'elementary' ? (
  <>
    <th>담임 (월수금)</th>
    <th>부담임 (화목)</th>
  </>
) : (
  <th>담당 강사</th>
)}

// 테이블 바디 조건부 렌더링
{filterDivision === 'elementary' || isElementaryClass(cls) ? (
  <>
    <td>{cls.homeroom_teacher?.name || '-'}</td>
    <td>{cls.assistant_teacher?.name || '-'}</td>
  </>
) : (
  <td>{cls.teachers?.name || '미배정'}</td>
)}
```

**테스트 체크리스트:**
- [ ] 초등부 필터 시 담임/부담임 컬럼 표시
- [ ] 중등부/고등부 필터 시 "담당 강사" 컬럼 표시
- [ ] 전체 필터 시 학년별 조건부 표시

---

### Phase 31-E: EditClassModal 수정

**작업 내용:**
1. 학년이 초등부일 때 담임/부담임 UI 표시
2. 학년이 중등부/고등부일 때 기존 "담당 강사" UI 유지

**파일 수정:**
- `frontend/src/components/admin/classes/EditClassModal.tsx`

```typescript
// 상태 추가
const [homeroomTeacherId, setHomeroomTeacherId] = useState<string | null>(null);
const [assistantTeacherId, setAssistantTeacherId] = useState<string | null>(null);

// 초등부 여부 확인
const isElementary = useMemo(() => {
  if (!gradeId || !grades) return false;
  const grade = grades.find(g => g.id === gradeId);
  return grade?.name?.startsWith('초') || false;
}, [gradeId, grades]);

// 초기값 설정 추가
useEffect(() => {
  if (isOpen && classData) {
    setHomeroomTeacherId(classData.homeroom_teacher_id);
    setAssistantTeacherId(classData.assistant_teacher_id);
  }
}, [isOpen, classData]);

// 폼 제출 시 데이터 포함
const handleSubmit = async (e: React.FormEvent) => {
  // ...
  await updateMutation.mutateAsync({
    id: classData.id,
    input: {
      // ... 기존 필드
      homeroom_teacher_id: isElementary ? homeroomTeacherId : null,
      assistant_teacher_id: isElementary ? assistantTeacherId : null,
      homeroom_days: isElementary ? [1, 3, 5] : null,  // 월수금 고정
      assistant_days: isElementary ? [2, 4] : null,    // 화목 고정
    },
  });
};

// UI 조건부 렌더링
{isElementary ? (
  <>
    {/* 담임 선택 */}
    <div>
      <label className="block text-sm font-medium text-grey-700 mb-1.5">
        담임 (월/수/금)
      </label>
      <select
        value={homeroomTeacherId || ''}
        onChange={(e) => setHomeroomTeacherId(e.target.value || null)}
        className="w-full px-4 py-3 border border-grey-200 rounded-xl"
      >
        <option value="">선택 안함</option>
        {teachers?.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>

    {/* 부담임 선택 */}
    <div>
      <label className="block text-sm font-medium text-grey-700 mb-1.5">
        부담임 (화/목)
      </label>
      <select
        value={assistantTeacherId || ''}
        onChange={(e) => setAssistantTeacherId(e.target.value || null)}
        className="w-full px-4 py-3 border border-grey-200 rounded-xl"
      >
        <option value="">선택 안함</option>
        {teachers?.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </div>
  </>
) : (
  /* 기존 담당 강사 선택 UI */
  <div>
    <label>담당 강사</label>
    <select value={teacherId || ''} ...>
      ...
    </select>
  </div>
)}
```

**테스트 체크리스트:**
- [ ] 초등부 반 수정 시 담임/부담임 드롭다운 표시
- [ ] 중등부/고등부 반 수정 시 기존 "담당 강사" 표시
- [ ] 저장 후 DB에 담임/부담임 정보 저장 확인

---

### Phase 31-F: CreateClassModal 수정

**작업 내용:**
1. 학년 선택 시 초등부면 담임/부담임 UI 표시
2. 반 생성 시 담임/부담임 정보 저장

**파일 수정:**
- `frontend/src/components/admin/classes/CreateClassModal.tsx`

```typescript
// EditClassModal과 유사하게 구현
// - 상태 추가: homeroomTeacherId, assistantTeacherId
// - isElementary 계산
// - 조건부 UI 렌더링
// - 폼 제출 시 데이터 포함
```

**테스트 체크리스트:**
- [ ] 초등부 학년 선택 시 담임/부담임 UI 표시
- [ ] 새 반 생성 시 담임/부담임 정보 저장 확인

---

### Phase 31-G: 강사용 대시보드 필터링 (선택적)

**작업 내용:**
1. 오늘 요일 기준 담당 수업만 표시
2. 초등부는 담임/부담임 요일 확인

**파일 수정:**
- `frontend/src/pages/BackofficeDemo.tsx` (또는 관련 훅)

```typescript
// 초등부 반 필터링 로직
function filterMyClasses(classes: ClassData[], userId: string): ClassData[] {
  const today = new Date().getDay(); // 0=일, 1=월, ..., 6=토

  return classes.filter(cls => {
    // 초등부가 아니면 기존 로직 (teacher_id로 매칭)
    const gradeName = cls.grades?.name || '';
    if (!gradeName.startsWith('초')) {
      return cls.teacher_id === userId;
    }

    // 초등부면 요일별 강사 확인
    if (cls.homeroom_days?.includes(today)) {
      return cls.homeroom_teacher_id === userId;
    }
    if (cls.assistant_days?.includes(today)) {
      return cls.assistant_teacher_id === userId;
    }
    return false;
  });
}
```

**테스트 체크리스트:**
- [ ] 월/수/금에 담임 반만 표시
- [ ] 화/목에 부담임 반만 표시
- [ ] 중등부/고등부는 기존처럼 표시

---

## 실행 순서

```
Phase 31-A (DB 스키마)
    ↓
Phase 31-B (TypeScript 타입)
    ↓
Phase 31-C (API 쿼리)
    ↓
Phase 31-D (테이블 UI)
    ↓
Phase 31-E (EditClassModal)
    ↓
Phase 31-F (CreateClassModal)
    ↓
Phase 31-G (강사 대시보드 필터링) [선택적]
```

---

## 예상 에러 및 해결책

| 에러 | 원인 | 해결 |
|-----|-----|-----|
| FK 제약 조건 실패 | profiles 테이블에 없는 ID 참조 | 마이그레이션 전 데이터 정리 |
| 조인 에러 | Supabase 다중 FK 조인 문법 | `!table_column_fkey` 문법 사용 |
| 타입 에러 | 새 필드 undefined | 옵셔널 체이닝 사용 (`?.`) |

---

## 완료 기준

- [ ] 초등부 반관리에서 담임/부담임 배정 가능
- [ ] 초등부 반 목록에 담임/부담임 컬럼 표시
- [ ] 중등부/고등부는 기존 "담당 강사" 방식 유지
- [ ] TypeScript 빌드 성공
- [ ] 수동 테스트 완료

---

*작성: Claude Code | 2025-12-26*
