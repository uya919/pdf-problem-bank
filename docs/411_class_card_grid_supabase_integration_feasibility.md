# 411. 수업 카드 그리드 Supabase 연동 구현 가능성 연구

> **작성일**: 2025-12-21
> **목적**: 목업 디자인을 실제 Supabase 데이터와 연동하여 시간대별·레벨별 정렬 구현

---

## 1. 요구사항 분석

### 1.1 목업 디자인 분석

`admin_dashboard_calendar_style.html` 목업 구조:

```
┌─────────────────────────────────────────────────────────────────┐
│ 12월 20일 (금) 수학 수업                          총 9개 수업    │
├─────────────────────────────────────────────────────────────────┤
│ 14:00 ~ 16:00                                        3개 수업    │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│ │ 중3 심화  │  │ 중3 정규  │  │ 중3 기초  │                       │
│ └──────────┘  └──────────┘  └──────────┘                        │
├─────────────────────────────────────────────────────────────────┤
│ 16:00 ~ 18:00                                        3개 수업    │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│ │ 중2 심화  │  │ 중2 정규  │  │ 중2 기초  │                       │
│ └──────────┘  └──────────┘  └──────────┘                        │
├─────────────────────────────────────────────────────────────────┤
│ 18:00 ~ 20:00                                        3개 수업    │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│ │ 고1 심화  │  │ 고1 정규  │  │ 고1 기초  │                       │
│ └──────────┘  └──────────┘  └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 요구사항

| 항목 | 설명 |
|------|------|
| **시간대별 그룹핑** | 동일 시간대 수업을 묶어서 표시 |
| **레벨별 정렬** | 심화 → 정규 → 기초 순서 |
| **실제 데이터** | 반 관리에서 등록한 실제 반 정보 |
| **진도/숙제 정보** | 지난 수업, 오늘 수업 데이터 |

---

## 2. Supabase 스키마 분석

### 2.1 관련 테이블

```sql
-- classes: 반 정보
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,           -- '중3 심화', '중2 기본'
  subject TEXT,                 -- '수학', '영어'
  level TEXT,                   -- 'high', 'mid', 'low' (심화/정규/기초)
  start_time TIME,              -- '14:00:00'
  end_time TIME,                -- '16:00:00'
  day_of_week INTEGER[],        -- [1, 3, 5] = 월, 수, 금
  is_active BOOLEAN,
  teacher_id UUID REFERENCES profiles(id),
  grade_id UUID REFERENCES grades(id)
);

-- progress: 진도 기록
CREATE TABLE progress (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  date DATE,
  textbook TEXT,                -- '쎈'
  start_page INTEGER,           -- 42
  end_page INTEGER,             -- 45
  topic TEXT,
  note TEXT
);

-- homework: 숙제 기록
CREATE TABLE homework (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  textbook TEXT,                -- '쎈'
  page_range TEXT,              -- 'p.42'
  description TEXT,             -- '1~15번'
  due_date DATE,
  assigned_date DATE
);
```

### 2.2 레벨 필드 분석

`classes.level` 필드:
- `'high'` = 심화
- `'mid'` = 정규
- `'low'` = 기초
- `NULL` = 미지정 (반 이름에서 추론 필요)

**현재 반 이름 패턴:**
- `중3 심화`, `중2 기본`, `고1 정규`
- 레벨이 반 이름에 포함된 경우가 많음

---

## 3. 구현 전략

### 3.1 데이터 조회 플로우

```
1. 선택된 날짜 + 요일 계산
   ↓
2. 해당 요일 수업 조회 (classes WHERE day_of_week @> [dow])
   ↓
3. 각 반의 최근 진도/숙제 조회 (progress, homework)
   ↓
4. 시간대별 그룹핑
   ↓
5. 레벨별 정렬 (심화 → 정규 → 기초)
   ↓
6. ClassScheduleDetail로 변환
```

### 3.2 새로운 훅: `useClassScheduleDetails`

```typescript
interface ClassScheduleDetail {
  id: string;
  name: string;           // 반 이름
  teacherName: string;
  studentCount: number;
  level: 'high' | 'mid' | 'low';  // 정렬용

  // 지난 수업 정보
  lastProgress?: ClassProgress;
  lastHomework?: ClassHomework;

  // 오늘 수업 정보
  todayProgress?: ClassProgress;
  todayHomework?: ClassHomework;

  // 메모
  memo?: string;

  // 시간
  startTime: string;
  endTime: string;
  isCurrent: boolean;
}

interface TimeSlotGroup {
  timeSlot: string;       // '14:00 ~ 16:00'
  startTime: string;      // '14:00' (정렬용)
  classCount: number;
  classes: ClassScheduleDetail[];  // 레벨순 정렬됨
}
```

### 3.3 반 이름 형식

**현재 반 이름 형식:** `학년_과목_레벨`

예시:
- `고1 국어 심화`
- `중3 수학 정규`
- `중2 영어 기초`

### 3.4 레벨 추출 로직

```typescript
function extractLevel(className: string): 'high' | 'mid' | 'low' {
  // 반 이름 끝에서 레벨 추출
  if (className.includes('심화')) return 'high';
  if (className.includes('기초')) return 'low';
  // '정규' 또는 기타
  return 'mid';
}
```

### 3.4 레벨 정렬 순서

```typescript
const LEVEL_ORDER: Record<string, number> = {
  'high': 0,  // 심화 먼저
  'mid': 1,   // 정규
  'low': 2,   // 기초 마지막
};

// 정렬
classes.sort((a, b) =>
  (LEVEL_ORDER[a.level] || 1) - (LEVEL_ORDER[b.level] || 1)
);
```

---

## 4. 진도/숙제 데이터 처리

### 4.1 현재 상태

**진도/숙제 데이터: 비어있음** (추후 입력 예정)

### 4.2 빈 데이터 처리

```typescript
// 데이터 없으면 undefined로 처리
lastProgress: undefined,   // → UI에서 "-" 표시
lastHomework: undefined,
todayProgress: undefined,
todayHomework: undefined,
memo: undefined,
```

### 4.3 추후 데이터 연동 시

데이터가 채워지면 아래 쿼리로 조회:

```sql
-- 지난 진도: 선택일 이전 가장 최근
SELECT * FROM progress
WHERE class_id = :class_id
  AND date < :selected_date
ORDER BY date DESC LIMIT 1;

-- 오늘 진도: 선택일 당일
SELECT * FROM progress
WHERE class_id = :class_id
  AND date = :selected_date;
```

---

## 5. 구현 계획

### Phase 1: 타입 및 훅 수정 (30분)

1. `ClassScheduleDetail` 타입에 `level` 필드 추가
2. `TimeSlotGroup` 타입 정의
3. `useClassScheduleDetails` 훅 생성

**파일:**
- `frontend/src/types/admin.ts`
- `frontend/src/hooks/useAdminData.ts`

### Phase 2: 시간대별 그룹핑 로직 (20분)

```typescript
function groupByTimeSlot(classes: ClassScheduleDetail[]): TimeSlotGroup[] {
  const groups = new Map<string, ClassScheduleDetail[]>();

  classes.forEach(cls => {
    const key = `${cls.startTime}-${cls.endTime}`;
    const group = groups.get(key) || [];
    group.push(cls);
    groups.set(key, group);
  });

  return Array.from(groups.entries())
    .map(([key, classes]) => ({
      timeSlot: formatTimeSlot(key),
      startTime: key.split('-')[0],
      classCount: classes.length,
      classes: classes.sort((a, b) =>
        LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]
      ),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
```

### Phase 3: 컴포넌트 수정 (30분)

1. `TimeSlotSection` 컴포넌트 생성 (시간대 헤더)
2. `ClassCard` 수정 (레벨 뱃지 추가)
3. `AdminDashboard` 수정 (시간대별 렌더링)

**파일:**
- `frontend/src/components/admin/dashboard/TimeSlotSection.tsx`
- `frontend/src/components/admin/dashboard/ClassCard.tsx`
- `frontend/src/pages/admin/AdminDashboard.tsx`

### Phase 4: 진도/숙제 데이터 연동 (40분)

1. `useClassProgressAndHomework` 훅 생성
2. 배치 쿼리로 성능 최적화
3. 캐싱 전략 적용

### Phase 5: 테스트 및 스타일 조정 (20분)

---

## 6. 쿼리 최적화

### 6.1 문제점

각 반마다 개별 쿼리 시 N+1 문제 발생:
- 10개 반 × 2 쿼리 (progress + homework) = 20개 쿼리

### 6.2 해결책: 배치 쿼리

```typescript
// 모든 반의 진도를 한번에 조회
const { data: allProgress } = await supabase
  .from('progress')
  .select('class_id, date, textbook, start_page, end_page, note')
  .in('class_id', classIds)
  .lte('date', selectedDate)
  .order('date', { ascending: false });

// 클라이언트에서 반별 최신 기록 추출
const progressMap = new Map<string, ProgressRow>();
allProgress.forEach(p => {
  if (!progressMap.has(p.class_id)) {
    progressMap.set(p.class_id, p);
  }
});
```

### 6.3 예상 쿼리 수

| 기존 방식 | 최적화 후 |
|-----------|-----------|
| N개 반 × 4 쿼리 | 4개 쿼리 |
| 40개 쿼리 (10반) | 4개 쿼리 |

---

## 7. 예상 결과

### 7.1 화면 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ ● 14:00 ~ 16:00                                      3개 수업    │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│ │ 중3 심화      │ │ 중3 정규      │ │ 중3 기초      │             │
│ │ 김선생 · 5명  │ │ 박선생 · 6명  │ │ 이선생 · 4명  │             │
│ │              │ │              │ │              │              │
│ │ ◀ 지난 수업  │ │ ◀ 지난 수업  │ │ ◀ 지난 수업  │              │
│ │ 쎈_p.42~45   │ │ 개념원리...   │ │ 라이트쎈...  │              │
│ │ ...          │ │ ...          │ │ ...          │              │
│ │              │ │              │ │              │              │
│ │ ▶ 오늘 수업  │ │ ▶ 오늘 수업  │ │ ▶ 오늘 수업  │              │
│ │ ...          │ │ ...          │ │ ...          │              │
│ └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 데이터 흐름

```
Supabase
  │
  ├── classes (요일 필터)
  │     └── teacher, enrollments, grade 조인
  │
  ├── progress (최근 + 당일)
  │
  └── homework (최근 + 당일)
         │
         ▼
    useClassScheduleDetails()
         │
         ▼
    groupByTimeSlot()
         │
         ▼
    TimeSlotSection × N
         │
         ▼
    ClassCard × M
```

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 진도/숙제 데이터 없음 | "-" 표시 (추후 입력 예정) |
| 레벨 추출 | 반 이름에서 "심화/정규/기초" 추출 |
| 시간대 겹침 | 동일 시간대 그룹 처리 |

---

## 9. 결론

### 9.1 구현 가능성: ✅ 가능

| 항목 | 상태 | 비고 |
|------|------|------|
| 시간대별 그룹핑 | ✅ | start_time, end_time 활용 |
| 레벨별 정렬 | ✅ | level 필드 + 이름 추론 |
| 실제 반 데이터 | ✅ | classes 테이블 연동 |
| 진도/숙제 데이터 | ✅ | progress, homework 테이블 |

### 9.2 필요한 작업

1. **타입 확장**: `level` 필드 추가
2. **훅 생성**: `useClassScheduleDetails`
3. **컴포넌트**: `TimeSlotSection` 생성
4. **쿼리 최적화**: 배치 쿼리 적용

### 9.3 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | 타입 및 훅 | 30분 |
| 2 | 그룹핑 로직 | 20분 |
| 3 | 컴포넌트 수정 | 30분 |
| 4 | 데이터 연동 | 40분 |
| 5 | 테스트 | 20분 |
| **합계** | | **약 2시간 20분** |

---

*연구 완료 - 개발은 별도 요청 시 진행*
