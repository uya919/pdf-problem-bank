# PDF 그리드 단일 열 표시 에러 리포트

> 작성일: 2025-12-22
> 상태: 분석 완료

---

## 1. 문제 현상

스크린샷에서 확인된 문제:
- PDF 뷰어에서 **1열만 표시**됨
- 화면 너비가 충분히 넓음에도 불구하고 여러 열이 나오지 않음
- 페이지 높이는 화면을 적절히 채우고 있음

---

## 2. 현재 코드 분석

### 2.1 크기 계산 로직 (PdfThumbnailGrid.tsx)

```typescript
// 1. 높이 기준 페이지 크기 계산 (세로 꽉 채움)
const maxPageHeight = availableHeight - labelHeight;
const heightBasedWidth = maxPageHeight / 1.414; // A4 비율

// 2. 이 크기로 몇 열이 들어가는지 계산
const maxColumns = Math.floor((availableWidth + gap) / (heightBasedWidth + gap));
const finalColumns = Math.max(1, Math.min(6, maxColumns));
```

### 2.2 계산 시뮬레이션

**스크린샷 추정 크기**:
- 컨테이너 너비: ~680px (우측 사이드바 제외)
- 컨테이너 높이: ~400px

**계산 과정**:
```
availableWidth = 680 - 16 = 664px
availableHeight = 400 - 16 = 384px

maxPageHeight = 384 - 28 = 356px
heightBasedWidth = 356 / 1.414 = 251.8px

maxColumns = floor((664 + 12) / (251.8 + 12))
           = floor(676 / 263.8)
           = floor(2.56)
           = 2
```

**이론적으로 2열이 나와야 함**, 하지만 1열만 표시되고 있음.

---

## 3. 가능한 원인

### 3.1 원인 1: 컨테이너 높이가 예상보다 큼

스크린샷에서 PDF 이미지가 상당히 크게 보임 → 실제 컨테이너 높이가 500px 이상일 수 있음.

**재계산** (높이 600px 가정):
```
availableHeight = 600 - 16 = 584px
maxPageHeight = 584 - 28 = 556px
heightBasedWidth = 556 / 1.414 = 393px

maxColumns = floor((664 + 12) / (393 + 12))
           = floor(676 / 405)
           = floor(1.67)
           = 1  ← 1열!
```

**결론**: 컨테이너 높이가 크면 페이지 너비도 커져서 1열만 들어감.

### 3.2 원인 2: 컨테이너 너비가 예상보다 좁음

우측에 사이드바 아이콘들이 있어서 실제 사용 가능 너비가 더 좁을 수 있음.

### 3.3 원인 3: 그리드 CSS 문제

```typescript
className={isLoading ? '' : 'grid gap-3 p-2 justify-items-center'}
style={isLoading ? undefined : {
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
}}
```

`columns`가 1로 계산되면 `repeat(1, minmax(0, 1fr))`이 되어 1열 표시.

---

## 4. 핵심 문제

**높이를 꽉 채우면 페이지가 너무 커져서 가로에 1개만 들어감**

현재 로직:
```
높이 꽉 채움 → 페이지 너비 계산 → 열 수 계산
```

이 로직은 **높이가 충분히 낮을 때만** 여러 열이 나옴.
화면이 세로로 긴 경우 (PC 모니터) 1열만 나오게 됨.

---

## 5. 해결 방안

### 5.1 방안 A: 최대 페이지 높이 제한

```typescript
// 높이 기준 페이지 크기 계산 (최대 높이 제한)
const maxPageHeight = Math.min(availableHeight - labelHeight, 500); // 최대 500px
const heightBasedWidth = maxPageHeight / 1.414;
```

**장점**: 간단
**단점**: 화면 높이를 완전히 활용하지 못함

### 5.2 방안 B: 최소 열 수 보장 (권장)

```typescript
const gap = 12;
const padding = 8;
const labelHeight = 28;
const MIN_COLUMNS = 2; // 최소 2열 보장

const availableWidth = containerSize.width - padding * 2;
const availableHeight = containerSize.height - padding * 2;

// 1. 높이 기준 페이지 크기 계산
const maxPageHeight = availableHeight - labelHeight;
let heightBasedWidth = maxPageHeight / 1.414;

// 2. 이 크기로 몇 열이 들어가는지 계산
let maxColumns = Math.floor((availableWidth + gap) / (heightBasedWidth + gap));

// 3. 최소 열 수 보장: 열 수가 부족하면 페이지 크기 축소
if (maxColumns < MIN_COLUMNS && availableWidth >= 400) {
  // 최소 2열이 들어가도록 페이지 너비 재계산
  heightBasedWidth = (availableWidth - gap * (MIN_COLUMNS - 1)) / MIN_COLUMNS;
  maxColumns = MIN_COLUMNS;
}

const finalColumns = Math.max(1, Math.min(6, maxColumns));

return {
  pageWidth: heightBasedWidth,
  columns: finalColumns,
};
```

**장점**: 최소 2열 보장, 화면이 좁으면 1열도 허용
**단점**: 화면 높이를 완전히 활용하지 못할 수 있음

### 5.3 방안 C: 높이와 열 수 동시 최적화 (가장 권장)

```typescript
const gap = 12;
const padding = 8;
const labelHeight = 28;

const availableWidth = containerSize.width - padding * 2;
const availableHeight = containerSize.height - padding * 2;

// 1. 2열~4열 각각에 대해 페이지 크기 계산
const candidates = [2, 3, 4].map(cols => {
  const width = (availableWidth - gap * (cols - 1)) / cols;
  const height = width * 1.414 + labelHeight;
  const fitsHeight = height <= availableHeight;
  return { cols, width, height, fitsHeight };
});

// 2. 높이에 맞으면서 가장 큰 페이지 크기 선택
const best = candidates
  .filter(c => c.fitsHeight)
  .sort((a, b) => b.width - a.width)[0];

// 3. 모두 초과하면 높이 기준으로 계산
if (!best) {
  const maxPageHeight = availableHeight - labelHeight;
  const heightBasedWidth = maxPageHeight / 1.414;
  const maxColumns = Math.max(1, Math.floor((availableWidth + gap) / (heightBasedWidth + gap)));
  return { pageWidth: heightBasedWidth, columns: maxColumns };
}

return { pageWidth: best.width, columns: best.cols };
```

---

## 6. 권장 해결책

**방안 B (최소 열 수 보장)** 적용:

```typescript
// 최적 페이지 크기 및 열 수 계산 (최소 2열 보장)
const { pageWidth, columns } = useMemo(() => {
  if (containerSize.width === 0 || containerSize.height === 0) {
    return { pageWidth: 300, columns: 2 };
  }

  const gap = 12;
  const padding = 8;
  const labelHeight = 28;
  const MIN_COLUMNS = 2;

  const availableWidth = containerSize.width - padding * 2;
  const availableHeight = containerSize.height - padding * 2;

  // 1. 높이 기준 페이지 크기 계산
  const maxPageHeight = availableHeight - labelHeight;
  let heightBasedWidth = maxPageHeight / 1.414;

  // 2. 열 수 계산
  let maxColumns = Math.floor((availableWidth + gap) / (heightBasedWidth + gap));

  // 3. 최소 2열 보장 (너비 400px 이상일 때)
  if (maxColumns < MIN_COLUMNS && availableWidth >= 400) {
    heightBasedWidth = (availableWidth - gap * (MIN_COLUMNS - 1)) / MIN_COLUMNS;
    maxColumns = MIN_COLUMNS;
  }

  const finalColumns = Math.max(1, Math.min(6, maxColumns));

  return {
    pageWidth: heightBasedWidth,
    columns: finalColumns,
  };
}, [containerSize]);
```

---

## 7. 예상 결과

| 화면 크기 | Before | After |
|-----------|--------|-------|
| 넓고 높음 (PC) | 1열 | 2열 이상 |
| 좁고 낮음 (모바일) | 1열 | 1열 |
| 넓고 낮음 (태블릿 가로) | 2-3열 | 2-3열 |

---

## 8. 결론

**근본 원인**: 높이 우선 계산 시 화면이 세로로 길면 페이지가 너무 커져서 1열만 표시됨.

**해결책**: 최소 열 수(2열)를 보장하고, 그에 맞춰 페이지 크기를 조정.

---

*v1.0 - 2025-12-22*
