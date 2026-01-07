# Phase 4: 기록 페이지 단계별 개발 계획

> 작성일: 2025-12-12
> 현재 상태: 출결 탭만 구현됨
> 목표: 4개 탭 (출결/진도/숙제/성적) 완전 구현

---

## 현재 상태 분석

### 완료된 기능
- [x] 탭 네비게이션 UI (출결/진도/숙제/성적)
- [x] 출결 탭 기본 구현
  - 주간 요약 카드 (출석/지각/결석/출석률)
  - 날짜 이동 (이전/다음)
  - 수업별 출결 카드 (접기/펼치기)

### 미구현 기능
- [ ] 진도 탭
- [ ] 숙제 탭
- [ ] 성적 탭

---

## 개발 단계

### Phase 4-A: 진도 탭 (1시간)

**목표**: 반별 진도 현황 및 히스토리 표시

**UI 구조**:
```
┌──────────────────────────────────────────────────────────┐
│  이번 주 진도 현황                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  중3A반  █████████████░░░░░░░  68%  (17/25단원)    │  │
│  │  중2A반  ████████████████░░░  80%  (20/25단원)    │  │
│  │  중1A반  ██████████░░░░░░░░░  40%  (10/25단원)    │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  최근 진도 기록                         [반 선택 ▼]       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  12/11  중3A반  "이차함수의 그래프" (17단원)        │  │
│  │  12/11  중2A반  "연립방정식 풀이" (20단원)          │  │
│  │  12/9   중3A반  "이차함수의 정의" (16단원)          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**작업 내용**:
| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | ProgressRecord 타입 정의 | RecordsPage.tsx |
| 2 | DUMMY_PROGRESS 데이터 생성 | RecordsPage.tsx |
| 3 | ProgressSummaryCard 컴포넌트 | RecordsPage.tsx |
| 4 | ProgressHistoryList 컴포넌트 | RecordsPage.tsx |
| 5 | 진도 탭 컨텐츠 연결 | RecordsPage.tsx |

**코드 스니펫**:
```typescript
interface ProgressRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  unitNumber: number;
  unitTitle: string;
  totalUnits: number;
  note?: string;
}

interface ClassProgress {
  classId: string;
  className: string;
  currentUnit: number;
  totalUnits: number;
  recentTopic: string;
}
```

---

### Phase 4-B: 숙제 탭 (1시간)

**목표**: 숙제 제출 현황 및 미제출 학생 관리

**UI 구조**:
```
┌──────────────────────────────────────────────────────────┐
│  이번 주 숙제 현황                                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  제출: 45    미제출: 8    제출률: 85%              │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  미제출 학생 (주의)                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🔴 박성빈 (중3A)  - 3회 연속 미제출               │  │
│  │  🟡 이사랑 (중3A)  - 2회 연속 미제출               │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  최근 숙제 기록                         [반 선택 ▼]       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  12/11  중3A반  p.42~45  |  제출 7/8              │  │
│  │  12/9   중3A반  p.38~41  |  제출 6/8              │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**작업 내용**:
| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | HomeworkRecord 타입 정의 | RecordsPage.tsx |
| 2 | DUMMY_HOMEWORK 데이터 생성 | RecordsPage.tsx |
| 3 | HomeworkSummaryCard 컴포넌트 | RecordsPage.tsx |
| 4 | UnsubmittedStudentsList 컴포넌트 | RecordsPage.tsx |
| 5 | HomeworkHistoryList 컴포넌트 | RecordsPage.tsx |
| 6 | 숙제 탭 컨텐츠 연결 | RecordsPage.tsx |

**코드 스니펫**:
```typescript
interface HomeworkRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  assignment: string;  // "p.42~45"
  submittedCount: number;
  totalCount: number;
}

interface UnsubmittedStudent {
  studentId: string;
  studentName: string;
  className: string;
  consecutiveMissCount: number;  // 연속 미제출 횟수
}
```

---

### Phase 4-C: 성적 탭 (1.5시간)

**목표**: 시험 성적 추이 및 반별/개인별 분석

**UI 구조**:
```
┌──────────────────────────────────────────────────────────┐
│  최근 시험 결과                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  12/11  중3A반 월간 테스트                          │  │
│  │  평균: 78점  |  최고: 95점  |  최저: 52점           │  │
│  │  ┌─────────────────────────────────────────────┐   │  │
│  │  │         성적 분포 막대 그래프               │   │  │
│  │  └─────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  주의 학생 (성적 하락)                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🔻 박성빈 (중3A)  68점  (-15점)                   │  │
│  │  🔻 이준혁 (중1A)  62점  (-8점)                    │  │
│  └────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│  시험 기록                              [반 선택 ▼]       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  12/11  중3A반  월간 테스트  |  평균 78점          │  │
│  │  12/4   중3A반  주간 퀴즈    |  평균 82점          │  │
│  │  11/27  중3A반  월간 테스트  |  평균 75점          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**작업 내용**:
| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | TestRecord, StudentScore 타입 정의 | RecordsPage.tsx |
| 2 | DUMMY_TESTS 데이터 생성 | RecordsPage.tsx |
| 3 | TestResultCard 컴포넌트 (분포 그래프 포함) | RecordsPage.tsx |
| 4 | ScoreWarningList 컴포넌트 | RecordsPage.tsx |
| 5 | TestHistoryList 컴포넌트 | RecordsPage.tsx |
| 6 | 성적 탭 컨텐츠 연결 | RecordsPage.tsx |

**코드 스니펫**:
```typescript
interface TestRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  testName: string;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  scores: StudentScore[];
}

interface StudentScore {
  studentId: string;
  studentName: string;
  score: number;
  previousScore?: number;
  scoreDiff?: number;
}

// 성적 분포 계산 (0-59, 60-69, 70-79, 80-89, 90-100)
function getScoreDistribution(scores: StudentScore[]): number[] {
  const distribution = [0, 0, 0, 0, 0];
  scores.forEach(s => {
    if (s.score < 60) distribution[0]++;
    else if (s.score < 70) distribution[1]++;
    else if (s.score < 80) distribution[2]++;
    else if (s.score < 90) distribution[3]++;
    else distribution[4]++;
  });
  return distribution;
}
```

---

### Phase 4-D: 반 필터 기능 (30분)

**목표**: 모든 탭에서 반별 필터링 기능 추가

**작업 내용**:
| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | ClassFilter 컴포넌트 생성 | RecordsPage.tsx |
| 2 | selectedClassId 상태 추가 | RecordsPage.tsx |
| 3 | 각 탭 컨텐츠에 필터 적용 | RecordsPage.tsx |

**코드 스니펫**:
```typescript
function ClassFilter({
  classes,
  selectedId,
  onChange
}: {
  classes: { id: string; name: string }[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <select
      value={selectedId || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="px-3 py-2 bg-[#F2F4F6] rounded-lg text-sm"
    >
      <option value="">전체 반</option>
      {classes.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}
```

---

### Phase 4-E: 컴포넌트 분리 (선택, 30분)

**목표**: RecordsPage.tsx가 300줄 초과 시 분리

**분리 기준**:
- `records/AttendanceTab.tsx` - 출결 탭
- `records/ProgressTab.tsx` - 진도 탭
- `records/HomeworkTab.tsx` - 숙제 탭
- `records/GradeTab.tsx` - 성적 탭
- `records/index.ts` - export 통합

---

## 개발 순서 요약

```
Phase 4-A (진도 탭)      ████████████████████  1시간
         ↓
Phase 4-B (숙제 탭)      ████████████████████  1시간
         ↓
Phase 4-C (성적 탭)      ██████████████████████████████  1.5시간
         ↓
Phase 4-D (반 필터)      ██████████  30분
         ↓
Phase 4-E (분리, 선택)   ██████████  30분

총 예상 시간: 4~4.5시간
```

---

## 품질 체크리스트

### 각 탭 공통
- [ ] 타입 정의 완료
- [ ] 더미 데이터 생성
- [ ] 요약 카드 UI
- [ ] 리스트 UI
- [ ] 빌드 테스트 통과

### UI/UX 철학
- [ ] 토스 스타일 색상 사용
- [ ] 일관된 카드 스타일 (rounded-2xl, shadow-sm)
- [ ] 적절한 여백 (p-4, gap-3)
- [ ] 상태별 색상 구분 (성공=초록, 경고=주황, 위험=빨강)

---

## 명령어

```
Phase 4-A 진행해줘     # 진도 탭 구현
Phase 4-B 진행해줘     # 숙제 탭 구현
Phase 4-C 진행해줘     # 성적 탭 구현
Phase 4-D 진행해줘     # 반 필터 기능
Phase 4-E 진행해줘     # 컴포넌트 분리
Phase 4 진행해줘       # 전체 순차 진행
```

---

*작성: Claude Code | 2025-12-12*
