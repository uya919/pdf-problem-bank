# 392. 반 관리 모달 학생 목록 추가 연구 리포트

> 작성일: 2025-12-19
> 참조: EditClassModal.tsx, 255_ui_ux_design_system.md

---

## 1. 개요

### 요청 사항
- 반 수정 모달에서 **해당 반에 속한 학생 목록** 표시
- 토스 스타일 UI/UX 철학에 맞게 설계

### 현재 상태
- `EditClassModal.tsx`: 반 정보 수정만 가능 (이름, 과목, 학년, 강사, 시간)
- 학생 목록 조회 API: `enrollments` 테이블에서 `class_id`로 조회 가능

---

## 2. UI/UX 철학 적용

### 2.1 토스 UX 원칙

| 원칙 | 적용 방안 |
|------|----------|
| **1 Thing / 1 Page** | 탭으로 "정보 수정" / "학생 목록" 분리 |
| **Context First** | 상단에 반 요약 정보 (학생 수, 과목, 담당 강사) |
| **Minimum Input** | 학생 목록은 읽기 전용 (수정은 별도 페이지) |
| **Progressive Disclosure** | 학생이 많으면 접기/펼치기 |

### 2.2 정보 계층

```
Level 1: 학생 이름 → 16px, 600 (font-bold)
Level 2: 학년 → 14px, 400 (text-grey-600)
Level 3: 등록일/상태 → 12px, grey-400
```

---

## 3. 모달 구조 설계

### 3.1 Option A: 탭 방식 (권장)

```
┌────────────────────────────────────────┐
│ 고1 국어 심화반                    [×]  │
│ 🔵 수학 | 담당: 이한솔 | 학생 5명      │
├────────────────────────────────────────┤
│ [📝 정보 수정]  [👥 학생 목록]         │
├────────────────────────────────────────┤
│                                        │
│  (탭 내용)                              │
│                                        │
└────────────────────────────────────────┘
```

**장점**
- 역할 분리 명확
- 모달 크기 일정 유지
- 토스 "1 Thing / 1 Page" 원칙 준수

### 3.2 Option B: 아코디언 방식

```
┌────────────────────────────────────────┐
│ 고1 국어 심화반                    [×]  │
├────────────────────────────────────────┤
│ 📝 반 정보                         [▼] │
│   (폼 필드들...)                       │
├────────────────────────────────────────┤
│ 👥 등록 학생 (5명)                 [▶] │
│   (접혀있음)                           │
└────────────────────────────────────────┘
```

**장점**
- 한 눈에 모든 섹션 확인
- 필요한 섹션만 펼쳐서 사용

**단점**
- 모달 높이 가변 → 스크롤 필요
- 학생이 많으면 복잡해짐

### 3.3 Option C: 사이드바 방식

```
┌────────────────────────┬──────────────────────┐
│ 📝 반 정보 수정        │ 👥 등록 학생 (5명)   │
│                        │                      │
│  반 이름: [고1 국어]   │  1. 김철수 (고1)     │
│  과목: [수학 ▼]        │  2. 이영희 (고1)     │
│  ...                   │  3. 박민수 (고1)     │
│                        │  ...                 │
│                        │                      │
│ [취소] [저장하기]      │  [반 배정 관리 →]    │
└────────────────────────┴──────────────────────┘
```

**장점**
- 정보와 학생 동시 확인
- PC에서 효율적

**단점**
- 모달 너비 증가
- 모바일에서 불편

---

## 4. 학생 목록 UI 상세

### 4.1 학생 카드 레이아웃

```
┌────────────────────────────────────────┐
│ 👤 김철수                   고1 | 활성  │
│    010-1234-5678        등록: 2025.09  │
└────────────────────────────────────────┘
```

### 4.2 학생 테이블 레이아웃 (PC)

```
┌──────────┬──────┬──────────────┬──────────┐
│ 이름     │ 학년 │ 연락처       │ 등록일   │
├──────────┼──────┼──────────────┼──────────┤
│ 김철수   │ 고1  │ 010-1234-*** │ 2025.09  │
│ 이영희   │ 고1  │ 010-5678-*** │ 2025.09  │
│ 박민수   │ 고1  │ 010-9012-*** │ 2025.10  │
└──────────┴──────┴──────────────┴──────────┘
```

### 4.3 빈 상태 (Empty State)

```
┌────────────────────────────────────────┐
│                                        │
│         👥                             │
│     등록된 학생이 없습니다             │
│                                        │
│    [학생 배정하기]                     │
│                                        │
└────────────────────────────────────────┘
```

---

## 5. 데이터 조회

### 5.1 필요한 API

```typescript
// 반에 등록된 학생 목록 조회
async function getStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      is_active,
      students (
        id,
        name,
        phone,
        grades (name)
      )
    `)
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return data?.map(e => ({
    ...e.students,
    enrolled_at: e.enrolled_at,
  })) || [];
}
```

### 5.2 Hook 구현

```typescript
// hooks/useClassStudents.ts
export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => getStudentsByClass(classId!),
    enabled: !!classId,
    staleTime: 30 * 1000, // 30초 캐시
  });
}
```

---

## 6. 컴포넌트 구조

### 6.1 파일 구성

```
components/admin/classes/
├── EditClassModal.tsx        # 기존 (탭 컨테이너로 변경)
├── ClassInfoTab.tsx          # 정보 수정 탭 (기존 폼 이동)
├── ClassStudentsTab.tsx      # 학생 목록 탭 (새로 생성)
└── StudentListItem.tsx       # 학생 항목 컴포넌트
```

### 6.2 EditClassModal 변경

```tsx
// 탭 상태 추가
const [activeTab, setActiveTab] = useState<'info' | 'students'>('info');

return (
  <div className="modal">
    {/* 헤더 - 반 요약 정보 */}
    <div className="header">
      <h2>{classData.name}</h2>
      <div className="summary">
        <span>{classData.subjects?.name}</span>
        <span>담당: {classData.teachers?.name || '미배정'}</span>
        <span>학생 {studentCount}명</span>
      </div>
    </div>

    {/* 탭 */}
    <div className="tabs">
      <button onClick={() => setActiveTab('info')}>
        📝 정보 수정
      </button>
      <button onClick={() => setActiveTab('students')}>
        👥 학생 목록
      </button>
    </div>

    {/* 탭 내용 */}
    {activeTab === 'info' ? (
      <ClassInfoTab classData={classData} onClose={onClose} />
    ) : (
      <ClassStudentsTab classId={classData.id} />
    )}
  </div>
);
```

---

## 7. 탭 스타일

### 7.1 토글 버튼 스타일 (토스)

```tsx
<div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
  <button
    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
      activeTab === 'info'
        ? 'bg-white text-grey-900 shadow-sm'
        : 'text-grey-500 hover:text-grey-700'
    }`}
    onClick={() => setActiveTab('info')}
  >
    📝 정보 수정
  </button>
  <button
    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
      activeTab === 'students'
        ? 'bg-white text-grey-900 shadow-sm'
        : 'text-grey-500 hover:text-grey-700'
    }`}
    onClick={() => setActiveTab('students')}
  >
    👥 학생 ({studentCount})
  </button>
</div>
```

---

## 8. 학생 목록 탭 상세

### 8.1 레이아웃

```tsx
function ClassStudentsTab({ classId }: { classId: string }) {
  const { data: students, isLoading } = useClassStudents(classId);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!students?.length) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-grey-500">등록된 학생이 없습니다</p>
        <button className="mt-4 text-blue-500 hover:underline">
          반 배정 관리 →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 학생 수 */}
      <div className="text-sm text-grey-500 mb-3">
        총 {students.length}명
      </div>

      {/* 학생 목록 */}
      {students.map(student => (
        <StudentListItem key={student.id} student={student} />
      ))}
    </div>
  );
}
```

### 8.2 학생 항목

```tsx
function StudentListItem({ student }: { student: Student }) {
  return (
    <div className="flex items-center justify-between p-3 bg-grey-50 rounded-lg">
      <div className="flex items-center gap-3">
        {/* 아바타 */}
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
          {student.name[0]}
        </div>

        {/* 이름 + 학년 */}
        <div>
          <div className="font-medium text-grey-900">{student.name}</div>
          <div className="text-xs text-grey-400">
            {student.grade} | {formatDate(student.enrolled_at)} 등록
          </div>
        </div>
      </div>

      {/* 연락처 (마스킹) */}
      <div className="text-sm text-grey-500">
        {maskPhone(student.phone)}
      </div>
    </div>
  );
}
```

---

## 9. 추가 기능 (선택)

### 9.1 학생 검색

```tsx
const [searchQuery, setSearchQuery] = useState('');

const filteredStudents = students?.filter(s =>
  s.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

### 9.2 반 배정 관리 링크

```tsx
<button
  onClick={() => {
    onClose();
    navigate('/admin/class-assignment');
  }}
  className="text-blue-500 hover:underline text-sm"
>
  반 배정 관리 →
</button>
```

### 9.3 학생 제거 (Phase 2)

```tsx
// 나중에 추가할 수 있는 기능
<button
  onClick={() => removeStudent(student.id)}
  className="text-red-500 hover:bg-red-50 p-1 rounded"
>
  제거
</button>
```

---

## 10. 개발 단계

### Phase 1: 기본 구조
1. `useClassStudents` 훅 생성
2. `EditClassModal`에 탭 추가
3. `ClassStudentsTab` 컴포넌트 생성

### Phase 2: UI 개선
1. 학생 카드 스타일링
2. 빈 상태 UI
3. 로딩 상태

### Phase 3: 추가 기능
1. 학생 검색
2. 반 배정 관리 링크
3. 학생 제거 기능 (선택)

---

## 11. 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `api/classes.ts` | `getStudentsByClass` 함수 추가 |
| `hooks/useClasses.ts` | `useClassStudents` 훅 추가 |
| `components/admin/classes/EditClassModal.tsx` | 탭 UI 추가 |
| `components/admin/classes/ClassStudentsTab.tsx` | 학생 목록 탭 (신규) |

---

## 12. 예상 결과

### Before
```
┌────────────────────────────────────────┐
│ 반 정보 수정                      [×]  │
├────────────────────────────────────────┤
│  반 이름: [고1 국어]                   │
│  과목: [수학 ▼]                        │
│  ...                                   │
│                                        │
│  [취소] [저장하기]                     │
└────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────┐
│ 고1 국어 심화반                    [×]  │
│ 🔵 수학 | 담당: 이한솔 | 학생 5명      │
├────────────────────────────────────────┤
│ [📝 정보 수정]  [👥 학생 (5)]          │
├────────────────────────────────────────┤
│                                        │
│  총 5명                                │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ 👤 김철수     고1 | 2025.09 등록 │  │
│  │              010-1234-****      │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ 👤 이영희     고1 | 2025.09 등록 │  │
│  │              010-5678-****      │  │
│  └─────────────────────────────────┘  │
│  ...                                   │
│                                        │
│  [반 배정 관리 →]                      │
└────────────────────────────────────────┘
```

---

## 13. 결론

**권장안: Option A (탭 방식)**

- 토스 "1 Thing / 1 Page" 원칙 준수
- 정보 수정 / 학생 목록 역할 분리
- 모달 크기 일정 유지
- 확장성 좋음 (나중에 탭 추가 가능)

