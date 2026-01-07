# 396. 순환수업 시스템 연구 리포트

> 작성일: 2025-12-19
> 목적: 혜윰학원 순환수업 시스템 분석 및 구현 가능성 검토

---

## 1. 요구사항 분석

### 1.1 수업 유형

| 유형 | 요일 | 시간 | 특징 |
|------|------|------|------|
| **정규수업** | 월목 | 18:00~20:30 | 고정 시간표, 반별 운영 |
| **순환수업** | 수요일 | 17:00~18:30 | 학년별 순환, 3주 주기 |

### 1.2 순환수업 패턴

3주 주기로 학년별 순환:

```
┌─────────┬──────────────┬──────────────┬──────────────┐
│  주차   │     중1      │     중2      │     중3      │
├─────────┼──────────────┼──────────────┼──────────────┤
│  1주차  │ 영어 수업    │ 수학 Test   │ 수학 수업    │
│  2주차  │ 수학 수업    │ 영어 수업    │ 수학 Test   │
│  3주차  │ 수학 Test   │ 수학 수업    │ 영어 수업    │
└─────────┴──────────────┴──────────────┴──────────────┘
```

### 1.3 실제 일정 예시 (2024년 12월~2025년 1월)

| 날짜 | 중1 | 중2 | 중3 |
|------|-----|-----|-----|
| 12/18 (수) | 영어 수업 | 수학 Test | 수학 수업 |
| 12/25 (수) | 수학 수업 | 영어 수업 | 수학 Test |
| 1/1 (수) | 수학 Test | 수학 수업 | 영어 수업 |
| 1/8 (수) | 영어 수업 | 수학 Test | 수학 수업 |

> **패턴**: 3주 주기로 순환 반복

---

## 2. 데이터 모델 설계

### 2.1 Option A: 별도 순환수업 테이블

```sql
-- 순환수업 정의 테이블
CREATE TABLE rotation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "수요일 순환수업"
  day_of_week INTEGER NOT NULL,          -- 3 (수요일)
  start_time TIME NOT NULL,              -- 17:00
  end_time TIME NOT NULL,                -- 18:30
  cycle_weeks INTEGER NOT NULL DEFAULT 3, -- 3주 주기
  start_date DATE NOT NULL,              -- 순환 시작 기준일
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 순환수업 패턴 정의 (어떤 학년이 어떤 주차에 무슨 수업)
CREATE TABLE rotation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID REFERENCES rotation_schedules(id),
  week_number INTEGER NOT NULL,          -- 1, 2, 3
  grade_id UUID REFERENCES grades(id),   -- 중1, 중2, 중3
  activity_type VARCHAR(50) NOT NULL,    -- 'english_class', 'math_class', 'math_test'
  subject_id UUID REFERENCES subjects(id),
  description VARCHAR(200),              -- "영어 수업", "수학 Test"
  UNIQUE(rotation_schedule_id, week_number, grade_id)
);

-- 순환수업 출결 기록
CREATE TABLE rotation_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID REFERENCES rotation_schedules(id),
  date DATE NOT NULL,
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES classes(id),  -- 원래 소속 반
  activity_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'present',  -- present, absent, late
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Option B: 기존 classes 테이블 확장

```sql
-- classes 테이블에 순환수업 필드 추가
ALTER TABLE classes ADD COLUMN is_rotation BOOLEAN DEFAULT false;
ALTER TABLE classes ADD COLUMN rotation_config JSONB;

-- rotation_config 예시:
{
  "cycle_weeks": 3,
  "start_date": "2024-12-18",
  "patterns": [
    { "week": 1, "grades": ["중1"], "activity": "english_class" },
    { "week": 1, "grades": ["중2"], "activity": "math_test" },
    { "week": 1, "grades": ["중3"], "activity": "math_class" },
    { "week": 2, "grades": ["중1"], "activity": "math_class" },
    // ...
  ]
}
```

### 2.3 권장: Option A (별도 테이블)

**이유:**
- 순환수업은 정규수업과 성격이 다름 (학년 단위 vs 반 단위)
- 복잡한 패턴 관리가 필요
- 향후 확장성 (순환 주기 변경, 다른 요일 추가 등)
- 기존 classes 로직에 영향 없음

---

## 3. 핵심 알고리즘

### 3.1 특정 날짜의 주차 계산

```typescript
/**
 * 특정 날짜가 순환수업의 몇 주차인지 계산
 * @param date - 확인할 날짜
 * @param startDate - 순환 시작 기준일
 * @param cycleWeeks - 순환 주기 (기본 3주)
 * @returns 1 ~ cycleWeeks 사이의 주차 번호
 */
function getRotationWeek(
  date: Date,
  startDate: Date,
  cycleWeeks: number = 3
): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksDiff = Math.floor(
    (date.getTime() - startDate.getTime()) / msPerWeek
  );

  // 0-indexed를 1-indexed로 변환, 순환 적용
  return (weeksDiff % cycleWeeks) + 1;
}

// 예시: 12월 18일이 1주차 기준이면
// 12/18 → 1주차
// 12/25 → 2주차
// 1/1   → 3주차
// 1/8   → 1주차 (순환)
```

### 3.2 특정 날짜의 학년별 활동 조회

```typescript
interface RotationActivity {
  gradeId: string;
  gradeName: string;
  activityType: 'english_class' | 'math_class' | 'math_test';
  description: string;
  subjectId: string;
}

/**
 * 특정 날짜의 순환수업 활동 목록 조회
 */
async function getRotationActivities(
  date: Date,
  rotationScheduleId: string
): Promise<RotationActivity[]> {
  // 1. 순환수업 정보 조회
  const schedule = await getRotationSchedule(rotationScheduleId);

  // 2. 해당 날짜가 수요일인지 확인
  if (date.getDay() !== schedule.dayOfWeek) {
    return [];
  }

  // 3. 주차 계산
  const weekNumber = getRotationWeek(
    date,
    new Date(schedule.startDate),
    schedule.cycleWeeks
  );

  // 4. 해당 주차의 패턴 조회
  const patterns = await getRotationPatterns(rotationScheduleId, weekNumber);

  return patterns;
}
```

### 3.3 학생이 참여해야 할 순환수업 조회

```typescript
/**
 * 특정 학생이 특정 날짜에 참여해야 할 순환수업 조회
 */
async function getStudentRotationClass(
  studentId: string,
  date: Date
): Promise<RotationActivity | null> {
  // 1. 학생의 학년 조회
  const student = await getStudent(studentId);
  const gradeId = student.gradeId;

  // 2. 해당 날짜의 순환수업 활동 조회
  const activities = await getRotationActivities(date, ROTATION_SCHEDULE_ID);

  // 3. 학생 학년에 해당하는 활동 찾기
  return activities.find(a => a.gradeId === gradeId) || null;
}
```

---

## 4. UI/UX 설계

### 4.1 관리자 화면

#### 4.1.1 순환수업 설정 페이지

```
┌─────────────────────────────────────────────────────┐
│  순환수업 설정                              [저장]  │
├─────────────────────────────────────────────────────┤
│  기본 정보                                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ 이름: [수요일 순환수업        ]              │   │
│  │ 요일: [수요일 ▼]   시간: [17:00] ~ [18:30]  │   │
│  │ 주기: [3주 ▼]      시작일: [2024-12-18]     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  순환 패턴                                          │
│  ┌─────────────────────────────────────────────┐   │
│  │      │   중1       │   중2       │   중3    │   │
│  │ 1주차│ [영어수업▼] │ [수학Test▼] │ [수학수업▼]│   │
│  │ 2주차│ [수학수업▼] │ [영어수업▼] │ [수학Test▼]│   │
│  │ 3주차│ [수학Test▼] │ [수학수업▼] │ [영어수업▼]│   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

#### 4.1.2 순환수업 달력 보기

```
┌─────────────────────────────────────────────────────┐
│  12월 순환수업 일정                    ← 2024.12 → │
├─────────────────────────────────────────────────────┤
│  일   월   화   수   목   금   토                   │
│                     4              7                │
│                    11             14                │
│                    18 ●          21                │
│                    ├─ 중1: 영어수업                │
│                    ├─ 중2: 수학Test                │
│                    └─ 중3: 수학수업                │
│                    25 ●          28                │
│                    ├─ 중1: 수학수업                │
│                    ├─ 중2: 영어수업                │
│                    └─ 중3: 수학Test                │
└─────────────────────────────────────────────────────┘
```

### 4.2 강사 대시보드

#### 4.2.1 오늘의 순환수업 카드

```
┌─────────────────────────────────────┐
│  📅 오늘 순환수업 (17:00~18:30)     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 중1 영어수업                │   │
│  │ 참여 반: 중1A, 중1B, 중1C   │   │
│  │ 총 24명                      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 중2 수학 Test               │   │
│  │ 참여 반: 중2A, 중2B         │   │
│  │ 총 18명                      │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 중3 수학수업                │   │
│  │ 참여 반: 중3A, 중3B, 중3C   │   │
│  │ 총 22명                      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 4.3 출결 관리

#### 4.3.1 순환수업 출결 체크

```
┌─────────────────────────────────────────────────────┐
│  12/18 수요일 순환수업 출결              [저장]     │
├─────────────────────────────────────────────────────┤
│  [중1 영어수업] [중2 수학Test] [중3 수학수업]       │
│  ─────────────────────────────────────────────────  │
│  중1 영어수업 (24명)                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ 김영희 (중1A) [출석] [지각] [결석]          │   │
│  │ 이철수 (중1A) [출석] [지각] [결석]          │   │
│  │ 박지민 (중1B) [출석] [지각] [결석]          │   │
│  │ ...                                          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 5. 구현 복잡도 분석

### 5.1 난이도 평가

| 영역 | 난이도 | 설명 |
|------|--------|------|
| DB 스키마 | ★★☆☆☆ | 3개 테이블 추가 |
| 주차 계산 로직 | ★★☆☆☆ | 단순 수학 연산 |
| 패턴 매핑 | ★★★☆☆ | 학년-주차-활동 매핑 |
| 관리자 설정 UI | ★★★☆☆ | 그리드 형태 패턴 설정 |
| 출결 관리 통합 | ★★★★☆ | 기존 출결 시스템과 연동 |
| 대시보드 통합 | ★★★☆☆ | 오늘 순환수업 표시 |

### 5.2 예상 개발 공수

| Phase | 작업 내용 | 예상 공수 |
|-------|----------|----------|
| Phase 1 | DB 스키마 & API | 중 |
| Phase 2 | 관리자 설정 UI | 중 |
| Phase 3 | 주차 계산 & 조회 API | 소 |
| Phase 4 | 강사 대시보드 통합 | 중 |
| Phase 5 | 순환수업 출결 관리 | 대 |
| Phase 6 | 테스트 & QA | 소 |

---

## 6. 구현 가능성 평가

### 6.1 기술적 가능성: ✅ 높음

| 항목 | 평가 | 근거 |
|------|------|------|
| 데이터 모델 | ✅ 가능 | Supabase에서 지원하는 표준 SQL |
| 알고리즘 | ✅ 가능 | 단순한 주차 계산 로직 |
| UI 구현 | ✅ 가능 | 기존 컴포넌트 패턴 재사용 |
| 기존 시스템 연동 | ⚠️ 주의 | 출결 시스템과의 통합 필요 |

### 6.2 주요 고려사항

#### 6.2.1 휴일/공휴일 처리
```typescript
// 수요일이지만 공휴일인 경우 처리 필요
function isHoliday(date: Date): boolean {
  // 공휴일 데이터베이스 또는 API 연동
  return holidays.includes(formatDate(date));
}

// 휴일 시 다음 주로 이월? 또는 스킵?
```

#### 6.2.2 순환 주기 변경
```
시나리오: 1월부터 4주 주기로 변경
해결: rotation_schedules 테이블에 새 레코드 추가
      (기존 레코드는 is_active = false)
```

#### 6.2.3 특정 주차 스킵
```
시나리오: 1/1 신정 휴일로 순환수업 없음
해결: rotation_exceptions 테이블로 예외 관리
      또는 is_cancelled 플래그
```

### 6.3 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 요구사항 변경 | 중 | 중 | 유연한 패턴 시스템 설계 |
| 출결 동기화 문제 | 중 | 높음 | 트랜잭션 처리 |
| 사용자 혼란 | 낮음 | 중 | 명확한 UI/알림 |

---

## 7. 대안 검토

### 7.1 Option 1: 수동 관리 (최소 구현)

**구현 방식:**
- 별도 시스템 없이 기존 반 기능 활용
- 관리자가 매주 수동으로 출결 명단 관리

**장점:**
- 개발 비용 없음
- 즉시 사용 가능

**단점:**
- 관리 부담 큼
- 실수 가능성

### 7.2 Option 2: 캘린더 이벤트 방식

**구현 방식:**
- 순환수업을 캘린더 이벤트로 생성
- 매주 수요일 이벤트 자동 생성

**장점:**
- 간단한 구현
- 기존 캘린더 UI 활용

**단점:**
- 패턴 관리 어려움
- 대량 이벤트 관리 문제

### 7.3 Option 3: 완전 자동화 시스템 (권장)

**구현 방식:**
- 본 리포트에서 제안한 방식
- 순환 패턴 정의 → 자동 일정 생성

**장점:**
- 한 번 설정하면 자동 관리
- 패턴 변경 용이
- 이력 추적 가능

**단점:**
- 개발 공수 필요

---

## 8. 결론 및 권장사항

### 8.1 구현 가능성: ✅ 충분히 구현 가능

순환수업 시스템은 기술적으로 구현 가능하며, 다음 우선순위로 개발을 권장합니다:

### 8.2 권장 개발 순서

```
Phase 1: 기본 인프라 (필수)
├── rotation_schedules 테이블
├── rotation_patterns 테이블
├── 주차 계산 유틸리티
└── 기본 조회 API

Phase 2: 관리자 설정 (필수)
├── 순환수업 CRUD
├── 패턴 설정 UI (그리드)
└── 미리보기 기능

Phase 3: 대시보드 통합 (권장)
├── 오늘 순환수업 카드
├── 학년별 참여 반/학생 표시
└── 다음 순환수업 예고

Phase 4: 출결 관리 (선택)
├── 순환수업 전용 출결 UI
├── 기존 출결과 분리/통합 선택
└── 리포트 생성
```

### 8.3 MVP (최소 기능)

첫 단계로 다음만 구현해도 충분히 활용 가능:

1. **순환 패턴 정의** (DB + Admin UI)
2. **오늘 순환수업 조회** (대시보드)
3. **참여 학생 목록 표시**

출결 관리는 기존 방식(수기/엑셀)으로 유지하다가 추후 통합 가능.

---

## 9. 참고: 순환 패턴 시각화

### 12주 순환 예시 (3주 주기 × 4회)

```
Week  │ Date   │ 중1          │ 중2          │ 중3
──────┼────────┼──────────────┼──────────────┼──────────────
  1   │ 12/18  │ 🇬🇧 영어수업  │ 📝 수학Test │ 📐 수학수업
  2   │ 12/25  │ 📐 수학수업  │ 🇬🇧 영어수업 │ 📝 수학Test
  3   │  1/1   │ 📝 수학Test │ 📐 수학수업  │ 🇬🇧 영어수업
──────┼────────┼──────────────┼──────────────┼──────────────
  4   │  1/8   │ 🇬🇧 영어수업  │ 📝 수학Test │ 📐 수학수업
  5   │  1/15  │ 📐 수학수업  │ 🇬🇧 영어수업 │ 📝 수학Test
  6   │  1/22  │ 📝 수학Test │ 📐 수학수업  │ 🇬🇧 영어수업
──────┼────────┼──────────────┼──────────────┼──────────────
  7   │  1/29  │ 🇬🇧 영어수업  │ 📝 수학Test │ 📐 수학수업
  8   │  2/5   │ 📐 수학수업  │ 🇬🇧 영어수업 │ 📝 수학Test
  9   │  2/12  │ 📝 수학Test │ 📐 수학수업  │ 🇬🇧 영어수업
──────┼────────┼──────────────┼──────────────┼──────────────
 10   │  2/19  │ 🇬🇧 영어수업  │ 📝 수학Test │ 📐 수학수업
 11   │  2/26  │ 📐 수학수업  │ 🇬🇧 영어수업 │ 📝 수학Test
 12   │  3/5   │ 📝 수학Test │ 📐 수학수업  │ 🇬🇧 영어수업
```

---

*작성: Claude Code*
*버전: 1.0*
