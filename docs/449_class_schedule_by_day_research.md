# 요일별 수업시간 분리 연구 리포트

> 작성일: 2025-12-28
> 요청: 반 관리에서 수업요일마다 수업시간이 다른 경우 해결방법 연구

---

## 1. 현황 분석

### 1.1 현재 스키마

```sql
-- classes 테이블 현재 구조
classes (
  id: uuid,
  name: varchar,
  day_of_week: integer[],     -- [1, 4] = 월, 목
  start_time: time,           -- 단일 값 (18:30)
  end_time: time,             -- 단일 값 (20:30)
  ...
)
```

**문제점**: `start_time`, `end_time`이 **단일 값**으로 저장되어, **요일별로 다른 시간**을 설정할 수 없음.

### 1.2 실제 사례

| 반 이름 | 요일 | 현재 저장 | 실제 필요 |
|---------|------|-----------|-----------|
| 고1 수학 정규 | 월, 목 | 18:30-22:30 | 월: 18:30-20:30, 목: 19:00-22:30 |
| 중2 영어 심화 | 화, 금 | 17:00-19:00 | 화: 17:00-19:00, 금: 18:00-20:00 |

---

## 2. 해결 방안 비교

### Option A: 별도 테이블 분리 (정규화)

```sql
-- 새 테이블: class_schedules
CREATE TABLE class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,

  UNIQUE(class_id, day_of_week)  -- 같은 반에 같은 요일 중복 방지
);

-- 예시 데이터
-- 고1 수학 정규
INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES
  ('class-uuid', 1, '18:30', '20:30'),  -- 월요일
  ('class-uuid', 4, '19:00', '22:30');  -- 목요일
```

**장점**:
- 정규화된 깔끔한 구조
- 확장성 좋음 (특정 요일만 휴강 등)
- 요일별 독립적인 데이터 관리

**단점**:
- 스키마 변경 필요 (마이그레이션)
- 기존 코드 수정 범위 넓음
- 조인 쿼리 복잡해짐

### Option B: JSONB 컬럼 사용

```sql
-- classes 테이블에 컬럼 추가
ALTER TABLE classes ADD COLUMN schedule jsonb;

-- 예시 데이터
UPDATE classes SET schedule = '{
  "1": {"start": "18:30", "end": "20:30"},
  "4": {"start": "19:00", "end": "22:30"}
}'::jsonb WHERE id = 'class-uuid';
```

**장점**:
- 마이그레이션 간단 (컬럼 1개 추가)
- 기존 테이블 구조 유지
- 유연한 데이터 구조

**단점**:
- 타입 안정성 떨어짐
- 인덱싱 복잡
- 쿼리 문법 복잡 (`schedule->>'1'`)

### Option C: 배열 컬럼 확장 (권장)

```sql
-- classes 테이블 컬럼 변경
-- 기존: start_time time, end_time time
-- 변경: start_times time[], end_times time[]

ALTER TABLE classes
  ADD COLUMN start_times time[],
  ADD COLUMN end_times time[];

-- 마이그레이션: 기존 데이터 복사
UPDATE classes SET
  start_times = ARRAY[start_time, start_time],
  end_times = ARRAY[end_time, end_time]
WHERE array_length(day_of_week, 1) = 2;

-- 예시 데이터
-- day_of_week: [1, 4]
-- start_times: ['18:30', '19:00']
-- end_times: ['20:30', '22:30']
-- → 월(1): 18:30-20:30, 목(4): 19:00-22:30
```

**장점**:
- 기존 구조와 유사 (배열 확장)
- 타입 안정성 유지
- 인덱싱 간단
- `day_of_week[i]` ↔ `start_times[i]` 직관적 매핑

**단점**:
- 배열 인덱스 동기화 필요
- 요일 순서가 시간 순서와 일치해야 함

---

## 3. 권장 방안: Option C (배열 컬럼 확장)

### 3.1 선택 이유

1. **최소 변경**: 기존 `day_of_week` 배열 구조 유지
2. **직관적**: `day_of_week[0]`의 시간 = `start_times[0]`
3. **타입 안정성**: PostgreSQL `time[]` 타입 사용
4. **호환성**: 기존 코드 수정 최소화

### 3.2 스키마 변경

```sql
-- 1. 새 컬럼 추가
ALTER TABLE classes ADD COLUMN start_times time[];
ALTER TABLE classes ADD COLUMN end_times time[];

-- 2. 기존 데이터 마이그레이션
-- 모든 요일에 동일한 시간 적용 (배열 길이 = day_of_week 길이)
UPDATE classes SET
  start_times = array_fill(start_time, ARRAY[array_length(day_of_week, 1)]),
  end_times = array_fill(end_time, ARRAY[array_length(day_of_week, 1)])
WHERE day_of_week IS NOT NULL AND array_length(day_of_week, 1) > 0;

-- 요일이 없는 경우 빈 배열
UPDATE classes SET
  start_times = '{}',
  end_times = '{}'
WHERE day_of_week IS NULL OR array_length(day_of_week, 1) = 0 OR array_length(day_of_week, 1) IS NULL;
```

### 3.3 API 타입 변경

```typescript
// 기존
interface ClassData {
  day_of_week: number[] | null;
  start_time: string | null;  // 단일
  end_time: string | null;    // 단일
}

// 변경
interface ClassData {
  day_of_week: number[] | null;
  start_time: string | null;    // 유지 (하위 호환)
  end_time: string | null;      // 유지 (하위 호환)
  start_times: string[] | null; // 요일별 시작 시간
  end_times: string[] | null;   // 요일별 종료 시간
}
```

### 3.4 UI 변경 (EditClassModal)

```
┌─────────────────────────────────────────┐
│ 수업 요일                                │
│ [월] [화] [수] [목] [금] [토] [일]        │
├─────────────────────────────────────────┤
│ 요일별 수업 시간                          │
│                                         │
│ 월요일  [18:30] ~ [20:30]               │
│ 목요일  [19:00] ~ [22:30]               │
│                                         │
│ □ 모든 요일 동일 시간 적용               │
└─────────────────────────────────────────┘
```

**동작**:
1. 요일 선택 시 해당 요일의 시간 입력 행 추가
2. "모든 요일 동일 시간 적용" 체크 시 단일 시간 입력
3. 체크 해제 시 요일별 개별 시간 입력

### 3.5 대시보드 표시 변경

```typescript
// useClassScheduleDetails 훅 수정
// 요일(dow)에 해당하는 시간 찾기
const dayIndex = cls.day_of_week?.indexOf(dow) ?? -1;
const startTime = dayIndex >= 0 && cls.start_times?.[dayIndex]
  ? cls.start_times[dayIndex]
  : cls.start_time;
const endTime = dayIndex >= 0 && cls.end_times?.[dayIndex]
  ? cls.end_times[dayIndex]
  : cls.end_time;
```

---

## 4. 개발 계획

### Phase 1: 스키마 변경 (30분)
- [ ] `start_times`, `end_times` 컬럼 추가
- [ ] 기존 데이터 마이그레이션

### Phase 2: API 수정 (30분)
- [ ] `ClassData` 타입 확장
- [ ] `getClasses`, `updateClass` 수정
- [ ] 호환성 유지 (기존 `start_time` 필드 유지)

### Phase 3: UI 수정 (1시간)
- [ ] `EditClassModal` 요일별 시간 입력 UI
- [ ] `CreateClassModal` 동일 적용
- [ ] "모든 요일 동일 시간" 토글 기능

### Phase 4: 대시보드 수정 (30분)
- [ ] `useClassScheduleDetails` 요일별 시간 조회
- [ ] 수업 카드에 정확한 시간 표시

---

## 5. 리스크 및 대응

| 리스크 | 대응 방안 |
|--------|-----------|
| 배열 인덱스 불일치 | 저장 시 검증 (day_of_week.length === start_times.length) |
| 기존 데이터 손실 | 마이그레이션 전 백업, 단계적 롤아웃 |
| UI 복잡도 증가 | "동일 시간" 토글로 간편 모드 제공 |

---

## 6. 결론

**Option C (배열 컬럼 확장)** 방식으로 구현을 권장합니다.

- 기존 구조와의 호환성 유지
- 최소한의 스키마 변경
- 직관적인 데이터 매핑
- 약 2.5시간 개발 소요 예상

---

*이 리포트는 분석 문서입니다. 실제 개발은 별도 승인 후 진행합니다.*
