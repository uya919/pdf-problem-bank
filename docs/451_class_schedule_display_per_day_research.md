# 반 관리 페이지 요일별 수업시간 표시 구현 가능성 연구

> 작성일: 2025-12-28
> 요청: 반 관리 테이블의 "수업 시간" 열에 요일별 다른 시간 구별 표시

---

## 1. 현재 상태 분석

### 1-1. 현재 데이터 구조

Stage 34에서 `classes` 테이블에 요일별 시간 배열이 추가됨:

```sql
-- classes 테이블
day_of_week  int[]    -- 예: [1, 3, 4] (월, 수, 목)
start_times  time[]   -- 예: ['18:30', '18:30', '19:00']
end_times    time[]   -- 예: ['20:30', '20:30', '21:00']
```

**예시 데이터**:
| day_of_week | start_times | end_times |
|-------------|-------------|-----------|
| [1, 3, 4]   | ['18:30', '18:30', '19:00'] | ['20:30', '20:30', '21:00'] |

- 월(1), 수(3): 18:30~20:30
- 목(4): 19:00~21:00

### 1-2. 현재 표시 함수

**파일**: `frontend/src/hooks/useClasses.ts:221-229`

```typescript
export function formatSchedule(
  dayOfWeek: number[] | null,
  startTime: string | null,
  endTime: string | null
): string {
  if (!dayOfWeek?.length || !startTime) return '-';

  const days = dayOfWeek.map(d => DAY_NAMES[d] || '').join(',');
  const start = startTime?.slice(0, 5) || '';
  const end = endTime?.slice(0, 5) || '';

  return `${days} ${start}${end ? '~' + end : ''}`;
}
```

**현재 출력**: `월,수,목 18:30~20:30`
- 문제점: 단일 시간만 표시, 요일별 차이 미반영

### 1-3. 반 관리 페이지 테이블

**파일**: `frontend/src/pages/admin/ClassManagementPage.tsx:345-346`

```tsx
<td className="px-4 py-3 text-grey-600">
  {formatSchedule(cls.day_of_week, cls.start_time, cls.end_time)}
</td>
```

---

## 2. 구현 방안

### Option A: 단순 그룹화 (같은 시간끼리)

**표시 예시**:
```
월,수 18:30~20:30 / 목 19:00~21:00
```

**장점**:
- 간결함
- 한 줄에 표시 가능
- 같은 시간 요일 묶음

**단점**:
- 복잡한 스케줄에서 길어질 수 있음

**구현 복잡도**: ⭐⭐ (낮음)

---

### Option B: 요일별 개별 줄 표시

**표시 예시**:
```
월 18:30~20:30
수 18:30~20:30
목 19:00~21:00
```

**장점**:
- 명확한 정보
- 각 요일 시간 즉시 확인 가능

**단점**:
- 테이블 행 높이 증가
- 화면 공간 많이 차지

**구현 복잡도**: ⭐ (매우 낮음)

---

### Option C: 압축형 + 툴팁

**표시 예시**:
- 기본: `월,수,목` + 시간 아이콘
- 호버: 상세 시간 툴팁

```
월,수,목 📅 ← 호버 시:
┌─────────────────┐
│ 월 18:30~20:30  │
│ 수 18:30~20:30  │
│ 목 19:00~21:00  │
└─────────────────┘
```

**장점**:
- 테이블 레이아웃 유지
- 상세 정보 필요 시 확인 가능

**단점**:
- 호버 필요 (모바일 불편)
- 정보 즉시 확인 불가

**구현 복잡도**: ⭐⭐⭐ (중간)

---

### Option D: 하이브리드 (추천)

**로직**:
1. 모든 시간이 동일 → 기존 형식 `월,수,목 18:30~20:30`
2. 시간이 다름 → 그룹화 형식 `월,수 18:30~20:30 / 목 19:00~21:00`

**장점**:
- 간단한 경우 기존 UI 유지
- 복잡한 경우만 상세 표시
- 자연스러운 UX

**단점**:
- 없음

**구현 복잡도**: ⭐⭐ (낮음)

---

## 3. 추천 구현: Option D (하이브리드)

### 3-1. 새 함수 시그니처

```typescript
/**
 * 요일별 수업 시간 포맷팅 (Stage 34)
 * - 모든 시간 동일: "월,수,목 18:30~20:30"
 * - 시간 다름: "월,수 18:30~20:30 / 목 19:00~21:00"
 */
export function formatScheduleWithTimes(
  dayOfWeek: number[] | null,
  startTimes: string[] | null,
  endTimes: string[] | null,
  startTime: string | null,  // fallback
  endTime: string | null     // fallback
): string;
```

### 3-2. 구현 로직

```typescript
export function formatScheduleWithTimes(
  dayOfWeek: number[] | null,
  startTimes: string[] | null,
  endTimes: string[] | null,
  startTime: string | null,
  endTime: string | null
): string {
  if (!dayOfWeek?.length) return '-';

  // 배열이 없으면 기존 방식
  if (!startTimes || !endTimes || startTimes.length === 0) {
    return formatSchedule(dayOfWeek, startTime, endTime);
  }

  // 시간별 요일 그룹화
  const timeGroups = new Map<string, number[]>();

  dayOfWeek.forEach((day, idx) => {
    const start = startTimes[idx]?.slice(0, 5) || startTime?.slice(0, 5) || '00:00';
    const end = endTimes[idx]?.slice(0, 5) || endTime?.slice(0, 5) || '00:00';
    const key = `${start}~${end}`;

    if (!timeGroups.has(key)) {
      timeGroups.set(key, []);
    }
    timeGroups.get(key)!.push(day);
  });

  // 그룹이 1개면 기존 형식
  if (timeGroups.size === 1) {
    const [timeRange, days] = [...timeGroups.entries()][0];
    const dayStr = days.map(d => DAY_NAMES[d]).join(',');
    return `${dayStr} ${timeRange}`;
  }

  // 그룹이 여러 개면 "요일 시간 / 요일 시간" 형식
  return [...timeGroups.entries()]
    .sort((a, b) => Math.min(...a[1]) - Math.min(...b[1])) // 요일 순 정렬
    .map(([timeRange, days]) => {
      const dayStr = days.map(d => DAY_NAMES[d]).join(',');
      return `${dayStr} ${timeRange}`;
    })
    .join(' / ');
}
```

### 3-3. 테이블 적용

```tsx
// ClassManagementPage.tsx
<td className="px-4 py-3 text-grey-600 whitespace-nowrap">
  {formatScheduleWithTimes(
    cls.day_of_week,
    cls.start_times,
    cls.end_times,
    cls.start_time,
    cls.end_time
  )}
</td>
```

---

## 4. 예상 출력

| 케이스 | day_of_week | start_times | end_times | 출력 |
|--------|-------------|-------------|-----------|------|
| 동일 시간 | [1, 3] | ['18:30', '18:30'] | ['20:30', '20:30'] | `월,수 18:30~20:30` |
| 다른 시간 | [1, 3, 4] | ['18:30', '18:30', '19:00'] | ['20:30', '20:30', '21:00'] | `월,수 18:30~20:30 / 목 19:00~21:00` |
| 모두 다름 | [1, 4] | ['18:00', '19:00'] | ['20:00', '21:00'] | `월 18:00~20:00 / 목 19:00~21:00` |
| 배열 없음 | [1, 3] | null | null | `월,수 18:30~20:30` (기존 방식) |

---

## 5. 구현 계획

| Phase | 작업 | 예상 시간 |
|-------|------|-----------|
| 1 | `formatScheduleWithTimes` 함수 구현 | 10분 |
| 2 | ClassManagementPage 적용 | 5분 |
| 3 | useClasses에서 export | 5분 |
| 4 | 빌드 테스트 | 5분 |
| **합계** | | **~25분** |

---

## 6. 결론

**구현 가능성**: ✅ 매우 높음

- 데이터는 이미 Stage 34에서 `start_times[]`, `end_times[]`로 저장됨
- UI 변경만 필요 (새 포맷 함수 1개 추가)
- 기존 레이아웃 유지, 추가 공간 불필요
- 하위 호환성 완벽 (배열 없으면 기존 방식 사용)

**권장**: Option D (하이브리드 방식) 구현 진행

---

*승인 시 바로 개발 진행 가능합니다.*
