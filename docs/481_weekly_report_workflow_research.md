# Stage 58 주간 학생 기록 시스템 - 워크플로우 연구

> 작성일: 2026-01-08
> 목적: 예상 워크플로우 및 잠재적 문제점 분석

---

## 1. 전체 워크플로우 시나리오

### 1.1 강사 로그인 → 리포트 저장 흐름

```
[Step 1] 강사 로그인
   └─ AuthContext에서 user.id (teacher_id) 획득

[Step 2] BackofficeDemo.tsx 메인 대시보드 렌더링
   └─ 히어로 섹션 아래 4개 뱃지 탭
      ├─ 공지 (notice)
      ├─ 출결 (attendance)
      ├─ 진도 (progress)
      └─ 기록 (record) ← NEW! (기존 homework)

[Step 3] "기록" 탭 클릭
   └─ 드롭다운 표시: 오늘 배정된 학생 목록
      ├─ useHomeroomStudents(teacherId) 호출
      │   └─ classes.homeroom_teacher_id = teacherId인 반만 조회
      │   └─ 해당 반들의 enrollments에서 학생 추출
      └─ useTodayReportStudents(students, dayOfWeek) 호출
          └─ Round-robin 알고리즘으로 오늘 요일의 학생만 필터

[Step 4] 학생 클릭 → WeeklyReportModal 열기
   └─ 바텀시트 모달
      ├─ 5점 척도 평가 (4개 항목)
      │   ├─ 수업 태도
      │   ├─ 이해도
      │   ├─ 숙제 완료도
      │   └─ 참여도
      └─ 텍스트 입력 (3개)
          ├─ 잘한 점
          ├─ 개선할 점
          └─ 학부모 전달사항

[Step 5] 저장 버튼 클릭
   └─ useSaveWeeklyReport.mutate()
      └─ Supabase student_weekly_reports 테이블에 UPSERT
```

---

## 2. 엣지 케이스 및 잠재적 문제점

### 2.1 학생이 여러 반에 등록된 경우

**시나리오:**
- 김민지 학생이 "수학A반"과 "영어B반"에 모두 등록됨
- 서희주 선생님이 수학A반의 주담임
- 박지원 선생님이 영어B반의 주담임

**문제점:**
- 두 선생님 모두 김민지에 대한 리포트를 작성해야 하는가?
- 아니면 한 선생님만 (예: 첫 번째 등록된 반)?

**권장 해결책:**
```sql
-- 반별로 별도 리포트 생성 (UNIQUE 제약)
UNIQUE(student_id, teacher_id, week_start)
-- → 같은 학생이라도 다른 반, 다른 주담임이면 각각 작성
```

**UI 관점:**
- 드롭다운에서 "김민지 (수학A반)"처럼 반 이름을 함께 표시
- 각 반의 주담임이 자신의 반에 속한 학생만 기록

---

### 2.2 한 반에 주담임이 없는 경우

**시나리오:**
- "수학C반"에 teacher_id는 있지만 homeroom_teacher_id가 NULL

**문제점:**
- 해당 반 학생들은 주간 리포트 작성 대상에서 제외됨
- 관리자가 실수로 배정하지 않으면 기능 미사용

**권장 해결책:**
```typescript
// 관리자 페이지에서 경고 표시
if (!cls.homeroom_teacher_id) {
  return (
    <div className="text-orange-600">
      ⚠️ 주담임 미배정
    </div>
  );
}
```

---

### 2.3 주담임이 중간에 변경된 경우

**시나리오:**
- 1월: A선생님이 주담임 → 리포트 5개 작성
- 2월: B선생님으로 변경 → 새 리포트 작성 시작

**문제점:**
- A선생님이 작성한 1월 리포트를 B선생님이 볼 수 있어야 하는가?
- 이전 주담임의 기록 열람 권한?

**권장 해결책:**
```sql
-- RLS 정책: 자신이 작성한 것만 조회
CREATE POLICY "own_reports_only"
  ON student_weekly_reports FOR SELECT
  USING (teacher_id = auth.uid());

-- 관리자는 모든 리포트 조회 가능
CREATE POLICY "admin_read_all"
  ON student_weekly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'director', 'owner')
    )
  );
```

---

### 2.4 학생 수가 5의 배수가 아닌 경우

**시나리오:**
- 반에 학생 12명
- 월~금 5일에 나눠야 함

**Round-robin 결과:**
```
월(0): 김민지, 한지민, 윤서아  (3명) - idx 0, 5, 10
화(1): 박서준, 황도윤         (2명) - idx 1, 6
수(2): 이수현, 강예린         (2명) - idx 2, 7
목(3): 정다은, 조민수         (2명) - idx 3, 8
금(4): 최준호, 강예린         (3명) - idx 4, 9, 11 (×)
```

**문제점:**
- 불균등 배정 (2명 vs 3명)
- 어떤 요일은 일이 더 많음

**권장 해결책:**
```typescript
// 이름순 정렬 후 Round-robin
const sortedStudents = students.sort((a, b) =>
  a.name.localeCompare(b.name, 'ko')
);

// 배정 결과 (12명 기준)
// 월: 0,5,10 → 3명
// 화: 1,6,11 → 3명
// 수: 2,7    → 2명
// 목: 3,8    → 2명
// 금: 4,9    → 2명
```

**UI에서 명확히 표시:**
```
오늘의 기록 (수요일)
━━━━━━━━━━━━━━━━━━━━
이수현, 강예린 (2명)
```

---

### 2.5 토/일요일에 접속한 경우

**시나리오:**
- 토요일에 앱 접속
- "오늘 작성할 학생"이 없음 (월~금만 배정)

**문제점:**
- 주말에는 기록 탭이 비어 보임
- 사용자 혼란 가능

**권장 해결책:**

**Option A: 다음 주 월요일로 자동 이동**
```typescript
const getTodayDayOfWeek = () => {
  const day = new Date().getDay();
  if (day === 0) return 0;  // 일요일 → 월요일로 처리
  if (day === 6) return 0;  // 토요일 → 월요일로 처리
  return day - 1;  // 월=0, 화=1, ..., 금=4
};
```

**Option B: "주말에는 작성할 학생이 없습니다" 메시지**
```typescript
if (dayOfWeek === 6 || dayOfWeek === 0) {
  return (
    <EmptyState message="주말에는 기록할 학생이 없습니다." />
  );
}
```

**권장: Option A** - 자동으로 다음 월요일 보여주기

---

### 2.6 주간 계산 (월요일 기준)

**현재 날짜에서 주의 시작일(월요일) 계산:**
```typescript
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();  // 0=일, 1=월, ..., 6=토
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// 테스트
getWeekStart(new Date('2026-01-08'));  // 수요일 → 2026-01-06 (월)
getWeekStart(new Date('2026-01-11'));  // 토요일 → 2026-01-06 (월)
getWeekStart(new Date('2026-01-12'));  // 일요일 → 2026-01-06 (월)
```

---

## 3. Supabase 쿼리 최적화

### 3.1 주담임 학생 조회 쿼리

```typescript
// Step 1: 주담임인 반 목록
const { data: classes } = await supabase
  .from('classes')
  .select('id, name')
  .eq('homeroom_teacher_id', teacherId)
  .eq('is_active', true);

// Step 2: 해당 반들의 학생 조회
const classIds = classes?.map(c => c.id) || [];
const { data: enrollments } = await supabase
  .from('enrollments')
  .select(`
    student_id,
    class_id,
    students!inner(id, name, grade_id, school, phone, parent_phone)
  `)
  .in('class_id', classIds)
  .eq('is_active', true);
```

### 3.2 추천 인덱스

```sql
-- 주담임 반 조회 최적화
CREATE INDEX idx_classes_homeroom_teacher
  ON classes(homeroom_teacher_id, is_active)
  WHERE is_active = true;

-- 주간 리포트 조회 최적화
CREATE INDEX idx_weekly_reports_teacher_week
  ON student_weekly_reports(teacher_id, week_start DESC);
```

---

## 4. UI/UX 고려사항

### 4.1 기록 탭 뱃지 상태

| 상태 | 표시 |
|------|------|
| 오늘 작성할 학생 있음 (미완료) | 빨간 점 + 숫자 (예: 2) |
| 모두 작성 완료 | 초록 체크 |
| 주말 (작성 대상 없음) | 회색 |

### 4.2 드롭다운 UI

```
┌─────────────────────────────────┐
│ 오늘의 기록                  [×] │
│ 수요일 배정 학생 2명             │
├─────────────────────────────────┤
│ [🔵김] 김민지         미작성 → │
│        중2 · 수학A반            │
├─────────────────────────────────┤
│ [🟢박] 박서준         ✓ 완료 → │
│        중2 · 수학B반            │
├─────────────────────────────────┤
│ 전체: 10명 (월~금 2명씩 배정)   │
└─────────────────────────────────┘
```

### 4.3 리포트 모달 UI

```
┌─────────────────────────────────┐
│ ─── (핸들)                      │
│                                 │
│ [김] 김민지                 [×] │
│ 중2 · 수학A반 · 1월 2주차       │
├─────────────────────────────────┤
│ ⭐ 평가 점수                    │
│                                 │
│ 수업 태도      ★★★★☆         │
│ 이해도         ★★★☆☆         │
│ 숙제 완료도    ★★★★★         │
│ 참여도         ★★★★☆         │
├─────────────────────────────────┤
│ ✏️ 상세 평가                    │
│                                 │
│ 잘한 점                         │
│ ┌─────────────────────────────┐ │
│ │ 함수 개념 빠르게 이해...     │ │
│ └─────────────────────────────┘ │
│                                 │
│ 개선할 점                       │
│ ┌─────────────────────────────┐ │
│ │ 계산 실수 잦음...            │ │
│ └─────────────────────────────┘ │
│                                 │
│ 학부모 전달사항 (앱에 표시)     │
│ ┌─────────────────────────────┐ │
│ │ 이번 주 함수 단원 잘...      │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│       [    저장하기    ]        │
└─────────────────────────────────┘
```

---

## 5. 데이터 모델

### 5.1 student_weekly_reports 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| student_id | UUID | FK → students |
| teacher_id | UUID | FK → profiles (작성자) |
| class_id | UUID | FK → classes (어느 반 기준) |
| report_date | DATE | 작성 날짜 |
| week_start | DATE | 주 시작일 (월요일) |
| attitude_score | INTEGER(1-5) | 수업 태도 |
| understanding_score | INTEGER(1-5) | 이해도 |
| homework_completion_score | INTEGER(1-5) | 숙제 완료도 |
| participation_score | INTEGER(1-5) | 참여도 |
| strengths | TEXT | 잘한 점 |
| improvements | TEXT | 개선할 점 |
| parent_message | TEXT | 학부모 전달사항 |
| teacher_note | TEXT | 강사 메모 (내부) |
| created_at | TIMESTAMPTZ | 생성일 |
| updated_at | TIMESTAMPTZ | 수정일 |

**UNIQUE 제약:**
```sql
UNIQUE(student_id, teacher_id, week_start)
```

---

## 6. 구현 체크리스트

### Phase 58-A: DB
- [ ] student_weekly_reports 테이블 생성
- [ ] RLS 정책 설정
- [ ] 인덱스 생성

### Phase 58-B: 훅
- [ ] useHomeroomStudents() - 주담임 학생 조회
- [ ] useTodayReportStudents() - 오늘 배정 학생
- [ ] useSaveWeeklyReport() - 저장 mutation
- [ ] useWeeklyReports() - 주간 리포트 조회

### Phase 58-C: UI
- [ ] TaskBadgeCard.tsx - homework → record 변경
- [ ] RecordDropdown.tsx - 오늘 학생 드롭다운
- [ ] WeeklyReportModal.tsx - 리포트 작성 모달
- [ ] ScoreSlider.tsx - 5점 척도 입력

### Phase 58-D: 정리
- [ ] 기존 HomeworkDropdown 제거
- [ ] 빌드 테스트
- [ ] Vercel 배포

---

## 7. 목업 파일

- [weekly_report_workflow.html](./mockups/weekly_report_workflow.html)

---

*Plan v2.3 - Stage 58 Workflow Research - 2026-01-08*
