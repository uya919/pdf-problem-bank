# 283. 학생 페이지 개발 계획

> 작성일: 2025-12-12
> 참조: 282번 UX 연구, students-page-v1.html 목업

---

## 1. 개발 목표

| 항목 | 설명 |
|------|------|
| 학생 목록 | 검색, 필터, 주의 알림, 카드 리스트 |
| 학생 상세 | 프로필, 통계, 성적 그래프, 타임라인, 메모 |
| 네비게이션 | 목록 ↔ 상세 전환 |

---

## 2. 파일 구조

### 신규 파일 (8개)
```
frontend/src/pages/backoffice/
├── StudentsPage.tsx              # 학생 목록 페이지
└── StudentDetailPage.tsx         # 학생 상세 페이지

frontend/src/components/backoffice/students/
├── index.ts                      # export
├── StudentCard.tsx               # 학생 카드 (목록용)
├── StudentProfileCard.tsx        # 프로필 카드 (상세용)
├── StudentStatsCard.tsx          # 통계 요약 카드
├── ScoreChart.tsx                # 성적 추이 그래프
├── ActivityTimeline.tsx          # 최근 활동 타임라인
└── StudentNotes.tsx              # 메모 섹션
```

### 수정 파일 (2개)
```
frontend/src/App.tsx                           # 라우트 추가
frontend/src/pages/backoffice/components/BottomNavBar.tsx  # 학생 탭 활성화
```

---

## 3. 단계별 구현

### Phase 1: 기본 구조 및 타입 정의

**파일**: `frontend/src/components/backoffice/students/index.ts`

```typescript
// 타입 정의
export interface Student {
  id: string;
  name: string;
  grade: string;      // "중1", "중2", "중3"
  classId: string;
  className: string;  // "중3A반"
  phone?: string;
  parentPhone?: string;
}

export interface StudentStats {
  attendanceRate: number;    // 출석률 (0-100)
  homeworkRate: number;      // 숙제 제출률 (0-100)
  averageScore: number;      // 평균 점수
  recentScore: number;       // 최근 시험 점수
  scoreTrend: number;        // 점수 변화 (+5, -15 등)
  absenceCount: number;      // 이번 달 결석 횟수
}

export interface StudentAlert {
  type: 'absence' | 'score_drop' | 'homework' | 'behavior';
  severity: 'warning' | 'critical';
  message: string;
}

export interface ScoreRecord {
  date: string;
  score: number;
  testType: 'daily' | 'weekly' | 'monthly';
  range?: string;
}

export interface ActivityRecord {
  id: string;
  date: string;
  type: 'attendance' | 'absence' | 'homework' | 'test' | 'note';
  status?: 'present' | 'absent' | 'late' | 'submitted' | 'missing';
  detail?: string;
  score?: number;
}

export interface StudentNote {
  id: string;
  date: string;
  content: string;
}

// 컴포넌트 export
export { StudentCard } from './StudentCard';
export { StudentProfileCard } from './StudentProfileCard';
export { StudentStatsCard } from './StudentStatsCard';
export { ScoreChart } from './ScoreChart';
export { ActivityTimeline } from './ActivityTimeline';
export { StudentNotes } from './StudentNotes';
```

---

### Phase 2: StudentCard 컴포넌트

**파일**: `frontend/src/components/backoffice/students/StudentCard.tsx`

```typescript
interface StudentCardProps {
  student: Student;
  stats: StudentStats;
  alerts: StudentAlert[];
  onClick: () => void;
}
```

#### 2.1 레이아웃

```
┌─────────────────────────────────────────────┐
│ [프로필]  이름 · 반                    점수  │
│  (아바타) 알림 뱃지들                        │
└─────────────────────────────────────────────┘
```

#### 2.2 경계선 색상 로직

```typescript
const getBorderColor = (alerts: StudentAlert[]) => {
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning = alerts.some(a => a.severity === 'warning');

  if (hasCritical) return 'border-l-4 border-[#EF4444]';
  if (hasWarning) return 'border-l-4 border-[#F59E0B]';
  return '';
};
```

#### 2.3 아바타 색상 로직

```typescript
const getAvatarColor = (alerts: StudentAlert[]) => {
  const hasCritical = alerts.some(a => a.severity === 'critical');
  const hasWarning = alerts.some(a => a.severity === 'warning');

  if (hasCritical) return { bg: 'bg-[#FEE2E2]', text: 'text-[#EF4444]' };
  if (hasWarning) return { bg: 'bg-[#FEF3C7]', text: 'text-[#F59E0B]' };
  return { bg: 'bg-[#E8F4FF]', text: 'text-[#3182F6]' };
};
```

---

### Phase 3: StudentsPage 목록 페이지

**파일**: `frontend/src/pages/backoffice/StudentsPage.tsx`

#### 3.1 상태 관리

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
const [showWarningOnly, setShowWarningOnly] = useState(false);
```

#### 3.2 필터링 로직

```typescript
const filteredStudents = useMemo(() => {
  let result = MOCK_STUDENTS;

  // 검색어 필터
  if (searchQuery) {
    result = result.filter(s =>
      s.name.includes(searchQuery)
    );
  }

  // 학년 필터
  if (selectedGrade) {
    result = result.filter(s => s.grade === selectedGrade);
  }

  // 주의 학생만
  if (showWarningOnly) {
    result = result.filter(s =>
      getStudentAlerts(s).length > 0
    );
  }

  return result;
}, [searchQuery, selectedGrade, showWarningOnly]);
```

#### 3.3 Mock 데이터 구조

```typescript
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '박성빈', grade: '중3', classId: '2', className: '중3A반' },
  { id: '2', name: '이사랑', grade: '중3', classId: '2', className: '중3A반' },
  // ...
];

const MOCK_STATS: Record<string, StudentStats> = {
  '1': { attendanceRate: 83, homeworkRate: 60, averageScore: 68, ... },
  '2': { attendanceRate: 100, homeworkRate: 80, averageScore: 72, ... },
};
```

#### 3.4 컴포넌트 구조

```tsx
<div className="min-h-screen bg-[#F9FAFB] pb-20">
  {/* 헤더 */}
  <Header title="학생" />

  {/* 검색 + 필터 */}
  <SearchAndFilter
    searchQuery={searchQuery}
    onSearchChange={setSearchQuery}
    selectedGrade={selectedGrade}
    onGradeChange={setSelectedGrade}
    showWarningOnly={showWarningOnly}
    onWarningToggle={setShowWarningOnly}
    counts={gradeCounts}
    warningCount={warningCount}
  />

  {/* 주의 배너 (warningCount > 0일 때) */}
  {warningCount > 0 && (
    <WarningBanner count={warningCount} />
  )}

  {/* 학생 카드 리스트 */}
  <div className="px-4 py-4 space-y-3">
    {filteredStudents.map(student => (
      <StudentCard
        key={student.id}
        student={student}
        stats={MOCK_STATS[student.id]}
        alerts={getStudentAlerts(student.id)}
        onClick={() => navigate(`/backoffice/students/${student.id}`)}
      />
    ))}
  </div>

  <BottomNavBar active="students" />
</div>
```

---

### Phase 4: 상세 페이지 컴포넌트들

#### 4.1 StudentProfileCard

```typescript
interface StudentProfileCardProps {
  student: Student;
  onCall: () => void;
  onMessage: () => void;
}
```

#### 4.2 StudentStatsCard

```typescript
interface StudentStatsCardProps {
  stats: StudentStats;
}

// 레이아웃
// ┌─────────────────────────────────┐
// │  이번 달 통계                    │
// │  83%     60%      68           │
// │  출석률   숙제제출  평균점수     │
// └─────────────────────────────────┘
```

#### 4.3 ScoreChart

```typescript
interface ScoreChartProps {
  scores: ScoreRecord[];
  classAverage?: number;
}

// 막대 그래프 (최근 5회)
// 색상: 80+ 파랑, 70-79 주황, 70미만 빨강
```

#### 4.4 ActivityTimeline

```typescript
interface ActivityTimelineProps {
  activities: ActivityRecord[];
  limit?: number;  // 기본 5개
}

// 타임라인 형태
// ● 오늘 12/11 (수)
// │   [결석] 무단 결석
// │   [시험] 68점 (↓7점)
// ● 12/9 (월)
// │   [결석] 무단 결석
```

#### 4.5 StudentNotes

```typescript
interface StudentNotesProps {
  notes: StudentNote[];
  onAddNote: (content: string) => void;
}
```

---

### Phase 5: StudentDetailPage 상세 페이지

**파일**: `frontend/src/pages/backoffice/StudentDetailPage.tsx`

#### 5.1 라우트 파라미터

```typescript
const { studentId } = useParams<{ studentId: string }>();
```

#### 5.2 컴포넌트 구조

```tsx
<div className="min-h-screen bg-[#F9FAFB] pb-20">
  {/* 헤더 (뒤로가기) */}
  <Header
    title={student.name}
    showBack
    onBack={() => navigate('/backoffice/students')}
  />

  {/* 프로필 카드 */}
  <StudentProfileCard
    student={student}
    onCall={handleCall}
    onMessage={handleMessage}
  />

  {/* 주의 알림 (있을 때만) */}
  {alerts.length > 0 && (
    <AlertBanner alerts={alerts} />
  )}

  {/* 통계 요약 */}
  <StudentStatsCard stats={stats} />

  {/* 성적 추이 */}
  <ScoreChart scores={scores} classAverage={82} />

  {/* 최근 활동 */}
  <ActivityTimeline activities={activities} />

  {/* 메모 */}
  <StudentNotes notes={notes} onAddNote={handleAddNote} />

  <BottomNavBar active="students" />
</div>
```

---

### Phase 6: 라우팅 및 네비게이션

#### 6.1 App.tsx 라우트 추가

```tsx
// 기존 라우트들...
<Route path="/backoffice/students" element={<StudentsPage />} />
<Route path="/backoffice/students/:studentId" element={<StudentDetailPage />} />
```

#### 6.2 BottomNavBar 수정

```tsx
// active prop에 'students' 추가
type NavItem = 'home' | 'classes' | 'students' | 'settings';

// 학생 아이콘 활성화 처리
```

---

## 4. 구현 순서 체크리스트

| # | 작업 | 파일 | 상태 |
|---|------|------|------|
| 1 | 타입 정의 및 index.ts | students/index.ts | ⬜ |
| 2 | StudentCard 컴포넌트 | students/StudentCard.tsx | ⬜ |
| 3 | StudentsPage 기본 구조 | StudentsPage.tsx | ⬜ |
| 4 | 검색/필터 UI | (위와 동일) | ⬜ |
| 5 | Mock 데이터 | (위와 동일) | ⬜ |
| 6 | StudentProfileCard | students/StudentProfileCard.tsx | ⬜ |
| 7 | StudentStatsCard | students/StudentStatsCard.tsx | ⬜ |
| 8 | ScoreChart | students/ScoreChart.tsx | ⬜ |
| 9 | ActivityTimeline | students/ActivityTimeline.tsx | ⬜ |
| 10 | StudentNotes | students/StudentNotes.tsx | ⬜ |
| 11 | StudentDetailPage | StudentDetailPage.tsx | ⬜ |
| 12 | 라우팅 설정 | App.tsx | ⬜ |
| 13 | BottomNavBar 수정 | BottomNavBar.tsx | ⬜ |
| 14 | 빌드 테스트 | - | ⬜ |

---

## 5. 알림 판단 로직

```typescript
function getStudentAlerts(studentId: string): StudentAlert[] {
  const stats = MOCK_STATS[studentId];
  const alerts: StudentAlert[] = [];

  // 결석 2회 이상 → critical
  if (stats.absenceCount >= 2) {
    alerts.push({
      type: 'absence',
      severity: 'critical',
      message: `결석 ${stats.absenceCount}회`
    });
  }

  // 성적 10점 이상 하락 → critical
  if (stats.scoreTrend <= -10) {
    alerts.push({
      type: 'score_drop',
      severity: 'critical',
      message: `성적 ↓${Math.abs(stats.scoreTrend)}점`
    });
  }

  // 숙제 미제출률 50% 이상 → warning
  if (stats.homeworkRate < 50) {
    alerts.push({
      type: 'homework',
      severity: 'warning',
      message: '숙제 미제출'
    });
  }

  // 결석 1회 → warning
  if (stats.absenceCount === 1) {
    alerts.push({
      type: 'absence',
      severity: 'warning',
      message: '결석 1회'
    });
  }

  return alerts;
}
```

---

## 6. 색상 체계

| 상태 | 배경색 | 텍스트 | 용도 |
|------|--------|--------|------|
| Critical | `#FEE2E2` | `#DC2626` | 결석 2회+, 성적 급락 |
| Warning | `#FEF3C7` | `#B45309` | 숙제 미제출, 결석 1회 |
| Normal | `#E8F4FF` | `#3182F6` | 정상 상태 |
| Success | `#E8F5E9` | `#2E7D32` | 성적 상승 |

---

## 7. 주의사항

### 7.1 검색 디바운싱
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchQuery(value), 300),
  []
);
```

### 7.2 빈 상태 처리
```tsx
{filteredStudents.length === 0 && (
  <div className="text-center py-12 text-[#8B95A1]">
    검색 결과가 없습니다
  </div>
)}
```

### 7.3 로딩 상태
```tsx
// 실제 API 연동 시 추가
const [isLoading, setIsLoading] = useState(false);
```

---

## 8. 예상 결과

### 완료 후 동작

1. **하단 네비 "학생" 클릭** → StudentsPage 이동
2. **검색** → 실시간 이름 필터링
3. **필터 칩** → 학년별, 주의 학생 필터
4. **학생 카드 클릭** → StudentDetailPage 이동
5. **전화/문자 버튼** → 연락처 액션 (링크)
6. **메모 추가** → 새 메모 저장

---

*구현 시작 명령: "진행해줘"*
