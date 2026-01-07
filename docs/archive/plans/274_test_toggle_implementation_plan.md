# 시험 토글 기능 구현 계획

> 목업: `docs/mockups/progress-modal-with-test.html`, `docs/mockups/classes-page-v2.html`
> 작성일: 2025-12-11

---

## 1. 구현 개요

| 항목 | 내용 |
|------|------|
| **목표** | 대시보드 진도 모달에 시험 기록 기능 추가, 수업 페이지와 연동 |
| **핵심 기능** | 시험 토글, Daily/Weekly/Monthly 선택, 학생별 점수 입력 |
| **데이터 흐름** | ProgressModal → Store → ClassesPage |

---

## 2. Phase 분류

| Phase | 내용 | 파일 |
|-------|------|------|
| **Phase 1** | 타입 정의 | types/test.ts |
| **Phase 2** | 시험 Store 생성 | stores/testStore.ts |
| **Phase 3** | TestInputSection 컴포넌트 | components/backoffice/modals/TestInputSection.tsx |
| **Phase 4** | ProgressModal 수정 | components/backoffice/modals/ProgressModal.tsx |
| **Phase 5** | ClassesPage v2 구현 | pages/backoffice/ClassesPage.tsx |
| **Phase 6** | 통합 테스트 | - |

---

## 3. Phase 1: 타입 정의

### 파일: `frontend/src/types/test.ts` (신규)

```typescript
// 시험 유형
export type TestType = 'daily' | 'weekly' | 'monthly';

// 학생 점수
export interface StudentScore {
  studentId: string;
  studentName: string;
  score: number | null;  // null = 미입력
}

// 시험 기록
export interface TestRecord {
  id: string;
  classId: string;
  className: string;
  testType: TestType;
  date: string;           // "2024-12-11"
  range: string;          // "이차방정식 p.40-50"
  totalScore: number;     // 100
  scores: StudentScore[];
  createdAt: string;
}

// 시험 통계
export interface TestStats {
  count: number;          // 입력된 점수 수
  total: number;          // 전체 학생 수
  average: number | null;
  highest: number | null;
  lowest: number | null;
}
```

---

## 4. Phase 2: 시험 Store

### 파일: `frontend/src/stores/testStore.ts` (신규)

```typescript
import { create } from 'zustand';
import { TestRecord, TestType } from '../types/test';

interface TestStore {
  // State
  records: TestRecord[];

  // Actions
  addRecord: (record: TestRecord) => void;
  getRecordsByClass: (classId: string) => TestRecord[];
  getRecordsByType: (classId: string, type: TestType) => TestRecord[];
  getLatestRecord: (classId: string, type: TestType) => TestRecord | null;
}

export const useTestStore = create<TestStore>((set, get) => ({
  records: [],

  addRecord: (record) => set((state) => ({
    records: [...state.records, record]
  })),

  getRecordsByClass: (classId) =>
    get().records.filter(r => r.classId === classId),

  getRecordsByType: (classId, type) =>
    get().records.filter(r => r.classId === classId && r.testType === type),

  getLatestRecord: (classId, type) => {
    const records = get().getRecordsByType(classId, type);
    return records.length > 0 ? records[records.length - 1] : null;
  }
}));
```

---

## 5. Phase 3: TestInputSection 컴포넌트

### 파일: `frontend/src/components/backoffice/modals/TestInputSection.tsx` (신규)

**구조:**
```
TestInputSection
├── TestToggle (토글 스위치)
├── TestTypeSelector (Daily/Weekly/Monthly 탭)
├── TestInfoInputs (범위, 총점 입력)
├── StudentScoreGrid (학생별 점수 그리드)
└── ScoreStats (입력 통계)
```

**Props:**
```typescript
interface TestInputSectionProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  testType: TestType;
  onTestTypeChange: (type: TestType) => void;
  range: string;
  onRangeChange: (range: string) => void;
  totalScore: number;
  onTotalScoreChange: (score: number) => void;
  students: StudentScore[];
  onScoreChange: (studentId: string, score: number | null) => void;
}
```

---

## 6. Phase 4: ProgressModal 수정

### 파일: `frontend/src/components/backoffice/modals/ProgressModal.tsx` (수정)

**변경 사항:**
1. TestInputSection import 추가
2. 시험 관련 state 추가
3. onSave에 시험 데이터 포함
4. 레이아웃에 TestInputSection 추가

**추가 State:**
```typescript
// 시험 토글 상태
const [testEnabled, setTestEnabled] = useState(false);
const [testType, setTestType] = useState<TestType>('daily');
const [testRange, setTestRange] = useState('');
const [totalScore, setTotalScore] = useState(100);
const [studentScores, setStudentScores] = useState<StudentScore[]>([]);
```

**Props 확장:**
```typescript
interface ProgressModalProps {
  // 기존 props...
  students?: Array<{ id: string; name: string }>;  // 학생 목록 추가
  onSaveTest?: (testRecord: Omit<TestRecord, 'id' | 'createdAt'>) => void;
}
```

---

## 7. Phase 5: ClassesPage v2

### 파일: `frontend/src/pages/backoffice/ClassesPage.tsx` (전체 수정)

**구조:**
```
ClassesPage v2
├── Header (페이지 제목)
├── ClassTabBar (반 탭 바)
├── ClassDetailAccordion
│   ├── AttendanceSection (출석률)
│   ├── ProgressSection (최근 진도 - 단원/진도/숙제)
│   ├── StudentsSection (학생 목록)
│   └── TestSection (시험 - NEW!)
│       ├── TestTypeTabs (Daily/Weekly/Monthly)
│       ├── LatestTestCard (최근 시험 결과)
│       └── TestStatsBar (평균/최고/최저)
└── BottomNavBar
```

**TestSection 세부:**
- testStore에서 해당 반의 시험 기록 조회
- Daily/Weekly/Monthly 탭 전환
- 최근 시험 결과 카드 표시
- 점수 분포 바 (상/중/하)

---

## 8. Phase 6: 통합 테스트

### 테스트 시나리오

1. **시험 기록 플로우**
   - 대시보드 → 수업 카드 → 진도 버튼 클릭
   - ProgressModal 열림
   - 시험 토글 ON
   - Daily 선택, 범위 입력, 점수 입력
   - 저장 클릭

2. **시험 조회 플로우**
   - 수업 페이지 이동
   - 해당 반 탭 클릭
   - 시험 섹션 펼치기
   - Daily 탭에서 방금 입력한 시험 결과 확인

3. **데이터 일관성**
   - 대시보드에서 입력한 데이터가 수업 페이지에 정확히 표시되는지 확인

---

## 9. 파일 목록 요약

### 신규 파일 (3개)
```
frontend/src/types/test.ts
frontend/src/stores/testStore.ts
frontend/src/components/backoffice/modals/TestInputSection.tsx
```

### 수정 파일 (3개)
```
frontend/src/components/backoffice/modals/ProgressModal.tsx
frontend/src/components/backoffice/modals/index.ts
frontend/src/pages/backoffice/ClassesPage.tsx
```

---

## 10. 구현 순서

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
  타입      Store    컴포넌트   Modal수정  Classes   테스트
```

**의존성:**
- Phase 3은 Phase 1, 2 완료 후
- Phase 4는 Phase 3 완료 후
- Phase 5는 Phase 2 완료 후 (병렬 가능)
- Phase 6은 전체 완료 후

---

## 11. 예상 결과물

### 대시보드 ProgressModal
- 기존 진도 기록 기능 유지
- 하단에 시험 토글 추가
- 토글 ON 시 점수 입력 폼 표시

### 수업 페이지 (ClassesPage v2)
- 반 탭 바로 반 전환
- 각 반별 시험 섹션에서 결과 조회
- Daily/Weekly/Monthly별 필터링

---

*Phase 1부터 순차적으로 구현 진행*
