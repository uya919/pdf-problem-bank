# 공지 유형 확장 및 캘린더 미리보기 개선 연구 리포트

> 작성일: 2025-12-28
> 요청: 신규등원 공지 유형 추가 + 중요 유형 디폴트 체크 + 캘린더 우선순위 표시

---

## 1. 요청 사항 정리

| 항목 | 내용 |
|------|------|
| **신규등원 유형 추가** | 공지 유형에 '신규등원(enrollment)' 추가 |
| **중요 체크 디폴트** | 긴급, 신규등원, 결석, 휴원 → `isImportant: true` 기본값 |
| **캘린더 우선순위** | 긴급 → 신규등원 → 결석 → 휴원 순으로 표시 |
| **미리보기 제한** | 최대 2개 표시 + "+N개" 오버플로우 표시 |

---

## 2. 현재 구조 분석

### 2.1 공지 유형 (NoticeType)

```typescript
// frontend/src/types/admin.ts
export type NoticeType =
  | 'urgent'    // 긴급 (빨강)
  | 'holiday'   // 휴원 (주황)
  | 'absence'   // 결석 (빨강)
  | 'exam'      // 시험 (파랑)
  | 'special'   // 특강 (초록)
  | 'event'     // 행사 (보라)
  | 'operation'; // 운영 (노랑)
```

### 2.2 현재 캘린더 미리보기 구조

```
CalendarDayCell.tsx
├── notices (공지 뱃지) - 최대 2개
├── importantNotice (중요 공지 미리보기) - 1개만
└── enrollments (등원 예정) - 별도 섹션
```

**현재 문제점:**
- `importantNotice`는 1개만 표시
- `enrollments`는 별도 데이터 소스 (consultations 테이블)
- 공지와 등원 예정이 분리되어 우선순위 통합 불가

---

## 3. 구현 방안

### 3.1 신규등원 공지 유형 추가

```typescript
// 변경: types/admin.ts
export type NoticeType =
  | 'urgent'      // 긴급 (빨강)
  | 'enrollment'  // 신규등원 (초록) ← 추가
  | 'holiday'     // 휴원 (주황)
  | 'absence'     // 결석 (빨강)
  | 'exam'        // 시험 (파랑)
  | 'special'     // 특강 (초록)
  | 'event'       // 행사 (보라)
  | 'operation';  // 운영 (노랑)

// 스타일 추가
enrollment: {
  label: '신규등원',
  bgColor: 'bg-green-50',
  borderColor: 'border-green-200',
  iconBgColor: 'bg-green-100',
  textColor: 'text-green-600',
  badgeBgColor: 'bg-green-500',
  badgeTextColor: 'text-white',
}
```

### 3.2 중요 유형 디폴트 설정

```typescript
// 변경: NoticeFormModal.tsx
const AUTO_IMPORTANT_TYPES: NoticeType[] = ['urgent', 'enrollment', 'absence', 'holiday'];

const handleTypeChange = (type: NoticeType) => {
  setForm((prev) => ({
    ...prev,
    type,
    // 자동 중요 체크
    isImportant: AUTO_IMPORTANT_TYPES.includes(type) ? true : prev.isImportant,
  }));
};
```

### 3.3 캘린더 우선순위 정렬

```typescript
// 새로 추가: 우선순위 순서
const CALENDAR_PRIORITY_ORDER: NoticeType[] = [
  'urgent',      // 1. 긴급
  'enrollment',  // 2. 신규등원
  'absence',     // 3. 결석
  'holiday',     // 4. 휴원
  // 나머지...
];

// CalendarDayCell 또는 WeeklyCalendar에서 정렬
const sortedImportantNotices = useMemo(() => {
  return notices
    .filter(n => n.isImportant)
    .sort((a, b) => {
      const aIdx = CALENDAR_PRIORITY_ORDER.indexOf(a.type);
      const bIdx = CALENDAR_PRIORITY_ORDER.indexOf(b.type);
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });
}, [notices]);
```

### 3.4 캘린더 셀 미리보기 개선

```typescript
// 변경: CalendarDayCell.tsx

// 기존: importantNotice (1개)
// 변경: importantNotices (배열, 최대 2개 + overflow)

interface CalendarDayCellProps {
  // ...
  importantNotices?: Notice[];  // 복수형으로 변경
}

// 렌더링
{importantNotices.slice(0, 2).map((notice, idx) => (
  <div key={notice.id} className={`text-[10px] ${getNoticeColor(notice.type)}`}>
    {getNoticeIcon(notice.type)} {notice.title.slice(0, 8)}...
  </div>
))}
{importantNotices.length > 2 && (
  <div className="text-[10px] text-grey-500">
    +{importantNotices.length - 2}개
  </div>
)}
```

---

## 4. 구현 가능성 평가

| 항목 | 난이도 | 예상 작업량 | 평가 |
|------|--------|-------------|------|
| 신규등원 유형 추가 | ⭐ 쉬움 | 30분 | 타입과 스타일만 추가 |
| 중요 체크 디폴트 | ⭐ 쉬움 | 15분 | 조건문 1개 추가 |
| 우선순위 정렬 | ⭐⭐ 보통 | 45분 | 정렬 로직 + 타입 변경 |
| 캘린더 미리보기 개선 | ⭐⭐ 보통 | 1시간 | 기존 구조 변경 필요 |

**총 예상 작업량: 2~3시간**

---

## 5. 우려되는 점

### 5.1 기존 enrollments와 enrollment 공지 중복

**현재 상태:**
- `consultations.enrollment_date` → 캘린더에 등원 예정 표시 (Stage 33)
- 새로운 `enrollment` 공지 → 별도로 또 표시

**우려:**
- 같은 학생 등원이 **2번 표시**될 수 있음
- 관리자가 상담에서 등원 확정 → 자동으로 공지도 생성? vs 수동?

**해결 방안:**
| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 자동 생성** | 등원 확정 시 enrollment 공지 자동 생성 | 관리 편함 | 중복 표시 우려, 공지 테이블 증가 |
| **B. 수동 생성** | 관리자가 별도로 신규등원 공지 작성 | 유연함 | 번거로움, 누락 가능 |
| **C. 통합 표시** | 기존 enrollments를 공지처럼 표시 | 기존 기능 활용 | 데이터 소스 통합 복잡 |

**권장: 옵션 C (통합 표시)**
- 기존 `useEnrollmentCalendar` 데이터를 공지 형태로 변환하여 통합 정렬
- 별도 `enrollment` 공지 유형은 추가하되, 상담 등원과는 연동하지 않음

### 5.2 캘린더 공간 부족

**현재 CalendarDayCell 구조:**
```
[날짜 숫자]
[공지 뱃지 1]
[공지 뱃지 2]
[+N개 더]
[순환수업 마커]
[중요 공지 미리보기]  ← 현재 1개
[등원 예정]
```

**우려:**
- 중요 공지 2개 + 등원 예정이 모두 표시되면 셀 높이가 늘어남
- 모바일/태블릿에서 레이아웃 깨질 수 있음

**해결 방안:**
- `min-h-[100px]` → `min-h-[120px]` 또는 동적 높이
- 또는 중요 공지와 등원을 **통합 영역**으로 합쳐서 2개만 표시

### 5.3 우선순위 정렬 기준

**질문:** 같은 유형이 여러 개일 때 어떤 순서?

예: 긴급 공지 2개 + 결석 공지 1개
- 긴급A, 긴급B, 결석C → 긴급A, 긴급B 표시? (유형 우선)
- 아니면 priority 값으로 정렬?

**권장:**
1. 유형 우선순위 (urgent > enrollment > absence > holiday)
2. 같은 유형 내에서는 `priority` 값으로 정렬
3. 같은 priority면 생성일시 순

---

## 6. 질문 사항

### Q1. 신규등원 공지와 consultations 등원의 관계?

| 옵션 | 설명 |
|------|------|
| **독립** | 서로 별개로 운영 (수동 공지 작성) |
| **연동** | 상담에서 등원 확정 시 자동 공지 생성 |
| **통합** | 등원 데이터를 공지처럼 표시만 함 |

→ **현재 권장: 통합 (등원 데이터를 공지와 함께 정렬)**

### Q2. 캘린더 셀 최대 표시 개수?

현재 제안: **중요 항목 2개 + "+N개"**

→ 이게 맞는지 확인 필요

### Q3. 등원 예정도 우선순위에 포함?

예: 긴급 > 신규등원(공지) > 결석 > **등원예정(consultations)** > 휴원?

→ 등원예정을 신규등원과 동일 순위로?

---

## 7. 제안 구현 계획

### Phase A: 기본 구조 (1시간)
1. `NoticeType`에 `enrollment` 추가
2. `NOTICE_TYPE_STYLES`에 신규등원 스타일 추가
3. `NoticeTypeSelector`에 신규등원 옵션 추가

### Phase B: 중요 체크 디폴트 (30분)
1. `AUTO_IMPORTANT_TYPES` 상수 정의
2. `NoticeFormModal`에서 유형 변경 시 자동 체크

### Phase C: 캘린더 우선순위 (1.5시간)
1. `CALENDAR_PRIORITY_ORDER` 상수 정의
2. `importantNoticeByDate` → `importantNoticesByDate` (배열) 변경
3. 정렬 로직 추가
4. `CalendarDayCell` props 변경 및 렌더링 수정

### Phase D: 등원 통합 (선택, 1시간)
1. `enrollments`를 가상 Notice로 변환
2. 중요 공지와 통합 정렬
3. 캘린더 셀에서 통합 표시

---

## 8. 결론

| 항목 | 가능성 | 권장 |
|------|--------|------|
| 신규등원 유형 추가 | ✅ 매우 쉬움 | 바로 진행 |
| 중요 체크 디폴트 | ✅ 매우 쉬움 | 바로 진행 |
| 우선순위 정렬 | ✅ 가능 | Phase C로 진행 |
| 캘린더 2개 표시 | ✅ 가능 | 구조 변경 필요 |
| 등원+공지 통합 | ⚠️ 복잡 | 논의 후 결정 |

**우려 사항:**
1. 등원 예정(consultations)과 신규등원 공지의 중복 표시 가능성
2. 캘린더 셀 공간 부족으로 레이아웃 깨짐 우려
3. 같은 유형 내 정렬 기준 명확화 필요

**권장 접근:**
- Phase A~C 먼저 진행 (신규등원 유형, 디폴트, 우선순위)
- 등원 통합(Phase D)은 동작 확인 후 결정

---

*v1.0 - 2025-12-28*
