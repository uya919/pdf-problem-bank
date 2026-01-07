# Phase 67-B: 더보기 버튼 고정 슬롯 - 단계별 개발 계획

**작성일**: 2025-12-09
**목표**: 8열 그리드에서 마지막 칸을 더보기 버튼 전용으로 예약

---

## 현재 동작 vs 목표 동작

### 현재 (문제점)

```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │ │  7  │ │  8  │ │ +4  │  ← 9칸 사용
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
                                                                  ↑ 더보기
```

- 8개 데이터 표시 후 더보기 버튼이 9번째에 추가됨
- 그리드가 2줄로 넘어감

### 목표

```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │ │  7  │ │ +5  │  ← 8칸 고정
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
                                                          ↑ 더보기 (예약석)
```

- 마지막 칸은 더보기 버튼 전용
- 데이터는 `열 수 - 1` 개만 표시 (8열이면 7개)

---

## 1단계: CollapsibleGrid 로직 수정

**예상 시간**: 15분
**파일**: `components/toss/CollapsibleGrid.tsx`

### 변경 내용

```tsx
// Before: 더보기가 추가 칸으로 표시됨
const maxVisible = columns * defaultRows;
const visibleCount = isExpanded ? items.length : Math.min(items.length, maxVisible);
const hiddenCount = items.length - maxVisible;
const hasMore = hiddenCount > 0;

// After: 더보기가 있으면 마지막 칸 예약
const totalSlots = columns * defaultRows;
const needsExpandButton = !isExpanded && items.length > totalSlots;
const maxVisible = needsExpandButton ? totalSlots - 1 : totalSlots;
const visibleCount = isExpanded ? items.length : Math.min(items.length, maxVisible);
const hiddenCount = items.length - maxVisible;
const hasMore = hiddenCount > 0;
```

### 로직 정리

| 상황 | 열 수 | 아이템 | 표시 개수 | 더보기 |
|------|------|--------|----------|--------|
| 아이템 < 열 수 | 8 | 5 | 5 | X |
| 아이템 = 열 수 | 8 | 8 | 8 | X |
| 아이템 > 열 수 | 8 | 12 | **7** | O (+5) |

---

## 2단계: 더보기 버튼 숨김 개수 수정

**예상 시간**: 5분
**파일**: `components/toss/CollapsibleGrid.tsx`

### 변경 내용

```tsx
// Before: 더보기에 표시되는 숨김 개수
const hiddenCount = items.length - maxVisible;  // 12 - 8 = 4

// After: 마지막 칸 제외한 개수
const hiddenCount = items.length - maxVisible;  // 12 - 7 = 5
```

자동으로 계산되므로 별도 수정 불필요 (1단계에서 maxVisible이 변경됨)

---

## 3단계: 펼침 상태 로직 확인

**예상 시간**: 5분
**파일**: `components/toss/CollapsibleGrid.tsx`

### 확인 사항

펼친 상태에서는 더보기 버튼 슬롯 예약 없이 전체 표시:

```tsx
// 펼친 상태
const visibleCount = isExpanded ? items.length : Math.min(items.length, maxVisible);
// → isExpanded=true 면 items.length (전체)
```

---

## 4단계: 빌드 테스트

**예상 시간**: 5분

```bash
cd frontend
npm run build
```

---

## 전체 요약

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | maxVisible 계산 로직 수정 | CollapsibleGrid.tsx | 15분 |
| 2 | hiddenCount 확인 (자동) | - | 5분 |
| 3 | 펼침 상태 로직 확인 | - | 5분 |
| 4 | 빌드 테스트 | - | 5분 |
| **총** | | | **~30분** |

---

## 수정 파일

```
frontend/src/components/toss/
└── CollapsibleGrid.tsx    (1단계)
```

---

## 테스트 케이스

| 케이스 | 아이템 수 | 열 수 | 기대 결과 |
|--------|----------|------|----------|
| 적음 | 5 | 8 | 5개 표시, 더보기 없음 |
| 딱 맞음 | 8 | 8 | 8개 표시, 더보기 없음 |
| 초과 | 12 | 8 | 7개 + 더보기(+5) |
| 많음 | 20 | 8 | 7개 + 더보기(+13) |
| 펼침 | 12 | 8 | 12개 전체 + 접기 버튼 |

---

**진행 명령어**: `"Phase 67-B 진행해줘"`

*계획 완료: 2025-12-09*
