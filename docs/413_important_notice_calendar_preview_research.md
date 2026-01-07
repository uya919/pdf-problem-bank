# 413. 중요 공지 캘린더 미리보기 연구 리포트

> Stage 17-B: 중요 체크 + 캘린더 날짜 셀 미리보기

---

## 1. 요구사항 분석

### 사용자 니즈
```
"모달에서 중요 체크를 할 수 있게 하고,
중요 체크를 하면 캘린더에서도 내용의 일부를 확인해서
나중에 캘린더 뷰에서 그날 그런 일이 있었구나 이런 걸 확인하고 싶어"
```

### 핵심 기능
| 기능 | 설명 |
|------|------|
| **중요 체크** | 공지 등록 시 "중요" 토글 체크박스 |
| **캘린더 미리보기** | 중요 공지가 있는 날짜에 내용 일부 표시 |
| **히스토리 확인** | 과거 날짜 클릭 시 "그날 무슨 일이 있었는지" 파악 |

---

## 2. 현재 시스템 분석

### 2.1 기존 공지 우선순위 시스템

```typescript
// types/admin.ts - 현재 구조
interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: NoticeType;
  priority: number;       // 높을수록 상단 표시 (현재 사용)
  visibility: NoticeVisibility;
  isActive: boolean;
}

// 중요 공지 유형 (현재 정의)
const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'holiday', 'absence'];
```

**현재 방식**: 공지 유형(urgent, holiday, absence)으로 중요 여부 자동 판단

**한계점**:
- 시험, 특강, 행사도 중요할 수 있음
- 사용자가 직접 중요도를 지정하고 싶을 수 있음

### 2.2 현재 캘린더 날짜 셀

```typescript
// CalendarDayCell.tsx - 현재 표시
- 날짜 숫자
- 순환수업 마커 (보라색 점)
- 휴일 마커 (빨간색)
```

**표시 공간**: 날짜 셀 하단에 1-2줄 텍스트 추가 가능

---

## 3. 설계 옵션

### 옵션 A: isImportant 플래그 추가 (권장)

```typescript
interface Notice {
  // ... 기존 필드
  isImportant: boolean;  // ✅ 새 필드: 사용자 지정 중요 체크
}
```

**장점**:
- 유형과 무관하게 사용자가 중요도 직접 지정
- 기존 IMPORTANT_NOTICE_TYPES와 병행 가능
- 간단한 토글 UI

**단점**:
- 새 필드 추가 필요

### 옵션 B: priority 값 활용

```typescript
// priority >= 100 이면 중요로 표시
const isImportant = notice.priority >= 100;
```

**장점**: 기존 필드 활용

**단점**: 직관적이지 않음, 숫자 관리 어려움

### 옵션 C: 별도 pinnedNotices 배열

```typescript
interface CalendarDay {
  pinnedNoticeIds: string[];  // 해당 날짜에 고정된 공지
}
```

**장점**: 더 세밀한 제어

**단점**: 복잡도 증가

**결론**: **옵션 A (isImportant 플래그)** 채택

---

## 4. 캘린더 미리보기 UI 설계

### 4.1 날짜 셀 레이아웃

```
┌─────────────────┐
│       21        │  ← 날짜 숫자
│  ● ●            │  ← 기존 마커 (순환, 휴일)
│ ─────────────── │
│ 📌 휴강: 강사   │  ← 중요 공지 미리보기 (NEW)
│    출장으로...  │
└─────────────────┘
```

### 4.2 미리보기 표시 규칙

| 규칙 | 내용 |
|------|------|
| **표시 조건** | `isImportant === true` 인 공지만 |
| **표시 개수** | 최대 1개 (가장 높은 priority) |
| **텍스트 길이** | 최대 15자 + ... (말줄임) |
| **표시 형식** | `[유형아이콘] 제목 일부` |

### 4.3 날짜 셀 크기 고려

```
현재 셀 크기: min-w-[40px] ~ 약 80px (PC)
텍스트 표시: 10px 폰트로 1-2줄 가능
```

**PC 전용**: 모바일은 공간 부족으로 점만 표시

---

## 5. 컴포넌트 수정 계획

### 5.1 타입 수정

```typescript
// types/admin.ts
interface Notice {
  // ... 기존 필드
  isImportant: boolean;  // 중요 체크 (캘린더 미리보기 표시)
}

interface CreateNoticeInput {
  // ... 기존 필드
  isImportant?: boolean;  // 중요 체크 (기본값: false)
}
```

### 5.2 NoticeFormModal 수정

```tsx
// 중요 체크박스 추가
<div className="flex items-center gap-2">
  <input
    type="checkbox"
    id="isImportant"
    checked={form.isImportant}
    onChange={(e) => setForm(prev => ({ ...prev, isImportant: e.target.checked }))}
  />
  <label htmlFor="isImportant" className="text-sm text-gray-700">
    📌 중요 (캘린더에 미리보기 표시)
  </label>
</div>
```

### 5.3 CalendarDayCell 수정

```tsx
interface CalendarDayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  onClick: () => void;
  isRotationDay?: boolean;
  isRotationHoliday?: boolean;
  importantNotice?: Notice | null;  // 새 prop: 중요 공지 1개
}

// 렌더링
{importantNotice && (
  <div className="mt-1 px-1 text-[10px] text-grey-600 truncate">
    <span className="text-red-500">📌</span>
    {importantNotice.title.slice(0, 12)}...
  </div>
)}
```

### 5.4 WeeklyCalendar에서 중요 공지 전달

```tsx
// 주간 날짜별 중요 공지 매핑
const importantNoticesByDate = useMemo(() => {
  const map: Record<string, Notice | null> = {};
  // 모든 날짜의 중요 공지 조회
  weekDays.forEach(day => {
    const notices = noticesByDate[day.dateKey] || [];
    const important = notices
      .filter(n => n.isImportant)
      .sort((a, b) => b.priority - a.priority)[0] || null;
    map[day.dateKey] = important;
  });
  return map;
}, [weekDays, noticesByDate]);

// CalendarDayCell에 전달
<CalendarDayCell
  day={day}
  importantNotice={importantNoticesByDate[day.dateKey]}
  // ... 기존 props
/>
```

---

## 6. 데이터 흐름

```
┌─────────────────────────────────────────────────────────┐
│                    공지 등록 흐름                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. NoticeFormModal                                      │
│     └─ isImportant 체크박스 토글                         │
│                                                          │
│  2. useCreateNotice                                      │
│     └─ isImportant: true 로 저장                         │
│                                                          │
│  3. useAdminNotices (조회)                               │
│     └─ 날짜별 공지 목록 반환 (isImportant 포함)          │
│                                                          │
│  4. WeeklyCalendar                                       │
│     └─ importantNoticesByDate 계산                       │
│                                                          │
│  5. CalendarDayCell                                      │
│     └─ 중요 공지 미리보기 렌더링                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 7. UI/UX 상세 설계

### 7.1 중요 체크박스 위치

```
┌─────────────────────────────────────────┐
│ 공지 등록                          ✕    │
├─────────────────────────────────────────┤
│                                         │
│ 공지 유형                               │
│ [긴급] [휴원] [결석] [시험] ...         │
│                                         │
│ ☑️ 중요 (캘린더에 표시)                 │  ← 유형 선택 바로 아래
│                                         │
│ 제목 *                                  │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ...                                     │
└─────────────────────────────────────────┘
```

### 7.2 캘린더 미리보기 스타일

**PC 뷰 (충분한 공간)**:
```
┌──────────┐
│    21    │
│  ● ●     │
│──────────│
│📌휴강:강사│  ← 10px, 회색, 1줄
└──────────┘
```

**모바일 뷰 (공간 부족)**:
```
┌────┐
│ 21 │
│ 📌 │  ← 아이콘만 표시
└────┘
```

### 7.3 색상 규칙

| 요소 | 색상 | 용도 |
|------|------|------|
| 📌 아이콘 | `text-red-500` | 중요 표시 강조 |
| 미리보기 텍스트 | `text-grey-600` | 날짜보다 덜 강조 |
| 배경 | `bg-amber-50` (옵션) | 중요 공지 있는 날 강조 |

---

## 8. 구현 Phase 계획

### Phase 17B-1: 타입 확장
- `Notice` 인터페이스에 `isImportant` 추가
- `CreateNoticeInput`에 `isImportant` 추가
- `NoticeFormState`에 `isImportant` 추가

### Phase 17B-2: NoticeFormModal 수정
- 중요 체크박스 UI 추가
- 폼 상태에 isImportant 연결
- 제출 시 isImportant 전달

### Phase 17B-3: Mock 데이터 업데이트
- `useAdminNotices`의 Mock 데이터에 isImportant 추가
- `useCreateNotice`에서 isImportant 저장

### Phase 17B-4: CalendarDayCell 확장
- `importantNotice` prop 추가
- 미리보기 렌더링 로직 추가
- PC/모바일 분기 처리

### Phase 17B-5: WeeklyCalendar 연동
- 날짜별 중요 공지 계산
- CalendarDayCell에 전달

### Phase 17B-6: 빌드 테스트

---

## 9. 예상 이슈 및 해결책

### 9.1 날짜 셀 공간 부족

**문제**: 미리보기 텍스트가 셀을 넘침

**해결**:
```tsx
// truncate + 고정 높이
<div className="h-4 overflow-hidden text-ellipsis whitespace-nowrap">
  {preview}
</div>
```

### 9.2 주간 전체 공지 조회 성능

**문제**: 7일치 공지를 한 번에 조회해야 함

**해결**:
```typescript
// 주간 범위로 한 번에 조회
const { data: weekNotices } = useNoticesByDateRange(weekRange.start, weekRange.end);
```

### 9.3 중요 공지 여러 개일 때

**문제**: 하루에 중요 공지가 2개 이상

**해결**:
- 가장 높은 priority 1개만 미리보기
- 나머지는 점(●)으로 개수 표시

---

## 10. 참고: 유사 서비스 사례

### Google Calendar
- 일정 제목이 날짜 셀에 직접 표시
- 공간 부족 시 "+2 more" 표시

### Notion Calendar
- 중요 일정은 🔴 빨간 점 + 제목 일부
- 호버 시 전체 내용 툴팁

### Toss 일정
- 날짜 아래 한 줄 요약
- 금액/항목 미리보기

---

## 11. 결론

### 채택 방안
1. **isImportant 플래그** 추가로 사용자 지정 중요 체크
2. **캘린더 날짜 셀**에 중요 공지 1개 미리보기 표시
3. **PC 전용** 텍스트 미리보기, 모바일은 아이콘만

### 예상 작업량
- 타입 수정: 10분
- 모달 수정: 20분
- 셀 수정: 30분
- 연동: 20분
- 테스트: 10분
- **총 약 1.5시간**

### 다음 단계
사용자 승인 후 Phase 17B 단계별 개발 계획 작성

---

*작성일: 2025-12-21*
*Stage: 17-B (중요 공지 캘린더 미리보기)*
