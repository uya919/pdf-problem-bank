# 391. 반 관리 페이지 토글 필터 연구 리포트

> 작성일: 2025-12-19
> 참조: AdminStudentsPage.tsx 토글 필터 패턴

---

## 1. 개요

### 요청 사항
- 반 관리 페이지(`ClassManagementPage.tsx`)에 학생 페이지와 같은 **토글 필터** 적용
- 현재 `<select>` 드롭다운 → 버튼 토글 그룹으로 변경

### 현재 상태

**ClassManagementPage (현재)**
```tsx
{/* 과목 필터 - select 방식 */}
<select value={subjectFilter}>
  <option value="">전체</option>
  {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
</select>
```

**AdminStudentsPage (참조)**
```tsx
{/* 과목 필터 - 토글 방식 */}
<div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
  <button className={filterSubject === 'all' ? 'bg-white shadow-sm' : ''}>전체</button>
  <button className={filterSubject === 'math' ? 'bg-white shadow-sm' : ''}>수학</button>
  ...
</div>
```

---

## 2. 토글 필터 UI 패턴 분석

### 2.1 AdminStudentsPage 토글 스타일

```tsx
// 토글 그룹 컨테이너
<div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
  <button
    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      isActive
        ? 'bg-white text-grey-900 shadow-sm'  // 활성 상태
        : 'text-grey-500 hover:text-grey-700'  // 비활성 상태
    }`}
  >
    {label}
  </button>
</div>
```

### 2.2 스타일 요약

| 상태 | 배경 | 글자색 | 그림자 |
|------|------|--------|--------|
| **활성** | `bg-white` | `text-grey-900` | `shadow-sm` |
| **비활성** | 투명 | `text-grey-500` | 없음 |
| **컨테이너** | `bg-grey-100` | - | - |

---

## 3. 반 관리 페이지 필터 항목

### 3.1 현재 필터 구조

| 필터 | 현재 타입 | 옵션 수 | 토글 적합성 |
|------|----------|---------|-------------|
| **과목** | select | 3-4개 | ✅ 적합 |
| **학년** | select | 12개 | ⚠️ 학부로 그룹화 필요 |
| **상태** | select | 3개 | ✅ 적합 |
| **검색** | input | - | 유지 |

### 3.2 학년 필터 개선 방안

현재: 12개 학년 전체 나열 (초1~고3)
```
<select>
  <option>전체</option>
  <option>초1</option>...
  <option>고3</option>
</select>
```

개선안: **학부 → 학년 2단계 필터** (AdminStudentsPage 방식)
```
[학부] 전체 | 초등부 | 중등부 | 고등부
[학년] (학부 선택 시 표시) 전체 | 중1 | 중2 | 중3
```

---

## 4. 구현 설계

### 4.1 필터 상태 변경

```typescript
// Before
const [subjectFilter, setSubjectFilter] = useState('');
const [gradeFilter, setGradeFilter] = useState('');
const [activeFilter, setActiveFilter] = useState<boolean | ''>('');

// After
type Division = 'all' | 'elementary' | 'middle' | 'high';
type StatusFilter = 'all' | 'active' | 'inactive';

const [filterDivision, setFilterDivision] = useState<Division>('all');
const [filterGrade, setFilterGrade] = useState<string>('all');
const [filterSubject, setFilterSubject] = useState<string>('all');
const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
```

### 4.2 학부별 학년 매핑

```typescript
const DIVISION_GRADES: Record<Exclude<Division, 'all'>, string[]> = {
  elementary: ['초3', '초4', '초5', '초6'],
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
};

const DIVISION_LABELS: Record<Division, string> = {
  all: '전체',
  elementary: '초등부',
  middle: '중등부',
  high: '고등부',
};
```

### 4.3 과목 설정

```typescript
const SUBJECT_CONFIG = {
  all: { name: '전체', code: 'all' },
  math: { name: '수학', code: 'math' },
  korean: { name: '국어', code: 'korean' },
  english: { name: '영어', code: 'english' },
};
```

### 4.4 상태 설정

```typescript
const STATUS_CONFIG = {
  all: { name: '전체' },
  active: { name: '활성' },
  inactive: { name: '비활성' },
};
```

---

## 5. UI 레이아웃 설계

### 5.1 필터 영역 구조

```
┌─────────────────────────────────────────────────────────────────┐
│  [검색창]                                                        │
├─────────────────────────────────────────────────────────────────┤
│  학부  [전체] [초등부] [중등부] [고등부]                          │
│  학년  [전체] [중1] [중2] [중3]           (학부 선택 시 표시)      │
├─────────────────────────────────────────────────────────────────┤
│  과목  [전체] [수학] [국어] [영어]                                │
│  상태  [전체] [활성] [비활성]                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 반응형 레이아웃

**PC (lg 이상)**
```
검색 | 학부 토글 | 학년 토글 (같은 줄)
과목 토글 | 상태 토글 (같은 줄)
```

**모바일/태블릿**
```
검색 (한 줄)
학부 토글 (한 줄)
학년 토글 (한 줄, 학부 선택 시)
과목 토글 (한 줄)
상태 토글 (한 줄)
```

---

## 6. 토글 버튼 컴포넌트

### 6.1 재사용 가능한 토글 그룹

```tsx
interface ToggleOption<T> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
}

function ToggleGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-grey-500 w-10">{label}</span>
      <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              value === option.value
                ? 'bg-white text-grey-900 shadow-sm'
                : 'text-grey-500 hover:text-grey-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. 필터링 로직

### 7.1 클라이언트 사이드 필터링

```typescript
const filteredClasses = useMemo(() => {
  if (!classes) return [];

  return classes.filter(cls => {
    // 1. 학부 필터 (학년 기반)
    if (filterDivision !== 'all') {
      const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
      const divisionGrades = DIVISION_GRADES[filterDivision];
      if (!gradeName || !divisionGrades.includes(gradeName)) {
        return false;
      }
    }

    // 2. 학년 필터
    if (filterGrade !== 'all') {
      const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
      if (gradeName !== filterGrade) {
        return false;
      }
    }

    // 3. 과목 필터
    if (filterSubject !== 'all') {
      const subjectCode = cls.subjects?.code || cls.subject;
      if (subjectCode !== filterSubject) {
        return false;
      }
    }

    // 4. 상태 필터
    if (filterStatus !== 'all') {
      const isActive = cls.is_active;
      if (filterStatus === 'active' && !isActive) return false;
      if (filterStatus === 'inactive' && isActive) return false;
    }

    // 5. 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = cls.name.toLowerCase().includes(query);
      const matchTeacher = cls.teachers?.name?.toLowerCase().includes(query);
      if (!matchName && !matchTeacher) return false;
    }

    return true;
  });
}, [classes, filterDivision, filterGrade, filterSubject, filterStatus, searchQuery]);
```

---

## 8. 수정 파일 목록

| 파일 | 수정 내용 |
|------|-----------|
| `pages/admin/ClassManagementPage.tsx` | 토글 필터 UI + 필터링 로직 |

---

## 9. 개발 단계

### Phase 1: 상수 및 타입 정의
- Division, StatusFilter 타입
- DIVISION_GRADES, DIVISION_LABELS 상수
- SUBJECT_CONFIG, STATUS_CONFIG 상수

### Phase 2: 상태 변경
- select 기반 상태 → 토글 기반 상태로 변경
- 학부 변경 시 학년 리셋 로직

### Phase 3: UI 변경
- select 드롭다운 → 토글 버튼 그룹
- 반응형 레이아웃 적용

### Phase 4: 필터링 로직 수정
- 학부 기반 필터링 추가
- 기존 필터링 로직 업데이트

### Phase 5: 테스트
- 각 필터 조합 테스트
- 반응형 레이아웃 확인

---

## 10. 예상 결과

### Before (select 방식)
```
과목 [▼ 전체    ] 학년 [▼ 전체    ] 상태 [▼ 전체    ]
```

### After (토글 방식)
```
학부  [전체] [초등부] [중등부] [고등부]
학년  [전체] [중1] [중2] [중3]

과목  [전체] [수학] [국어] [영어]
상태  [전체] [활성] [비활성]
```

---

## 11. 결론

AdminStudentsPage의 토글 필터 패턴을 ClassManagementPage에 적용하면:
- **UX 향상**: 한 눈에 모든 옵션 확인 가능
- **일관성**: 관리자 페이지 간 UI 통일
- **효율성**: 클릭 한 번으로 필터 변경

