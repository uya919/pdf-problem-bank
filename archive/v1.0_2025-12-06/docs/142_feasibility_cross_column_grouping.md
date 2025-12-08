# 기능 분석 리포트: 좌우단 걸친 문제 그룹핑

**작성일**: 2025-12-04
**요청 기능**: Shift+드래그로 좌우 컬럼에 걸친 블록을 하나의 문제로 그룹핑
**분석 방법**: Opus Thinkharder

---

## 요청 기능 요약

```
현재: 좌측단(L) 또는 우측단(R) 블록만 하나의 그룹으로 묶음
요청: L과 R에 걸친 블록을 선택하여 세로로 이어붙인 하나의 문제 이미지 생성
```

### 사용 시나리오
```
┌──────────────────┬──────────────────┐
│   좌측단 (L)      │   우측단 (R)      │
├──────────────────┼──────────────────┤
│ ┌──────────────┐ │                  │
│ │ 문제 시작    │ │                  │
│ │ (블록 1-5)   │ │                  │
│ └──────────────┘ │                  │
│                  │ ┌──────────────┐ │
│                  │ │ 문제 계속    │ │
│                  │ │ (블록 6-10)  │ │
│                  │ └──────────────┘ │
└──────────────────┴──────────────────┘

원하는 결과: 블록 1-10을 선택하여 세로로 이어붙인 이미지 생성
```

---

## 구현 가능성 분석

### 결론: **구현 가능** (난이도: 중간)

| 항목 | 난이도 | 설명 |
|------|--------|------|
| 선택 로직 | 쉬움 | Shift+클릭 이미 Ctrl+클릭과 유사하게 구현 가능 |
| 그룹 데이터 모델 | 쉬움 | `column` 필드를 `"LR"` 또는 배열로 확장 |
| 이미지 합성 | 중간 | 두 영역을 세로로 이어붙이는 로직 필요 |
| UI 피드백 | 쉬움 | 크로스 컬럼 그룹 시각화 추가 |

---

## 상세 구현 방안

### 1. 선택 로직 (Frontend)

**현재 코드** (PageViewer.tsx):
```typescript
// Ctrl+클릭: 토글
const handleBlockSelect = (blockId: number, isMultiSelect: boolean) => {
  if (isMultiSelect) {
    // 토글 선택
  } else {
    // 단일 선택
  }
};
```

**수정 방안**:
```typescript
const handleBlockSelect = (blockId: number, e: MouseEvent) => {
  if (e.ctrlKey || e.metaKey) {
    // 토글 선택 (기존)
  } else if (e.shiftKey) {
    // 범위 선택 또는 추가 선택 (신규)
    // 선택된 블록에 추가
  } else {
    // 단일 선택
  }
};
```

### 2. 그룹 데이터 모델

**현재**:
```typescript
interface ProblemGroup {
  id: string;           // "p10_L1"
  column: "L" | "R";    // 단일 컬럼
  block_ids: number[];
  // ...
}
```

**수정 방안**:
```typescript
interface ProblemGroup {
  id: string;           // "p10_X1" (X = Cross-column)
  column: "L" | "R" | "X";  // X = 크로스 컬럼
  block_ids: number[];
  // 크로스 컬럼용 추가 필드
  columnOrder?: ("L" | "R")[];  // 예: ["L", "R"] = 좌단 먼저, 우단 나중
  // ...
}
```

### 3. 이미지 합성 로직 (Backend)

**현재** (export.py):
```python
# 모든 블록의 bounding box → 하나의 큰 사각형으로 크롭
bbox = calculate_bounding_box(group_blocks)
cropped = page_image.crop((x1, y1, x2, y2))
```

**수정 방안**:
```python
def export_cross_column_group(group, blocks, page_image):
    # 1. 컬럼별로 블록 분리
    l_blocks = [b for b in blocks if b["column"] == "L"]
    r_blocks = [b for b in blocks if b["column"] == "R"]

    # 2. 각 컬럼의 bbox 계산
    l_bbox = calculate_bounding_box(l_blocks) if l_blocks else None
    r_bbox = calculate_bounding_box(r_blocks) if r_blocks else None

    # 3. 각 영역 크롭
    l_crop = page_image.crop(l_bbox) if l_bbox else None
    r_crop = page_image.crop(r_bbox) if r_bbox else None

    # 4. 세로로 이어붙이기 (columnOrder에 따라)
    images = []
    for col in group.get("columnOrder", ["L", "R"]):
        if col == "L" and l_crop:
            images.append(l_crop)
        elif col == "R" and r_crop:
            images.append(r_crop)

    # 5. 합성 이미지 생성
    total_height = sum(img.height for img in images)
    max_width = max(img.width for img in images)

    result = Image.new("RGB", (max_width, total_height), "white")
    y_offset = 0
    for img in images:
        result.paste(img, (0, y_offset))
        y_offset += img.height

    return result
```

---

## 우려 사항 및 대응 방안

### 1. 기존 데이터 호환성

| 우려 | 심각도 | 대응 |
|------|--------|------|
| 기존 그룹 데이터 깨짐 | 낮음 | `column: "X"` 는 신규 필드, 기존 L/R 유지 |
| 기존 export 로직 영향 | 낮음 | `column !== "X"` 조건으로 기존 로직 유지 |

### 2. UI/UX 복잡도 증가

| 우려 | 심각도 | 대응 |
|------|--------|------|
| 사용자 혼란 | 중간 | 명확한 시각적 피드백 (크로스 컬럼 = 주황색 테두리) |
| 순서 지정 필요 | 중간 | 기본값: 선택 순서 또는 Y좌표 순서 자동 결정 |
| 실수로 크로스 컬럼 생성 | 낮음 | Shift 키 명시적 요구, 확인 토스트 메시지 |

### 3. 이미지 품질

| 우려 | 심각도 | 대응 |
|------|--------|------|
| 이어붙임 경계 부자연스러움 | 중간 | 적절한 패딩(5-10px) 추가 |
| 너비 불일치 | 낮음 | 더 넓은 쪽에 맞춤, 좁은 쪽은 중앙 정렬 또는 좌측 정렬 |
| 파일 크기 증가 | 낮음 | 두 영역 합쳐도 기존과 비슷 |

### 4. 복잡한 케이스

| 케이스 | 대응 |
|--------|------|
| L→R→L 번갈아 가며 선택 | 선택 순서대로 이어붙이기 |
| 같은 컬럼에서 떨어진 블록 | 각 영역별 bbox 계산 후 합성 (복잡) |
| 3개 이상 영역 | columnOrder 배열로 순서 관리 |

---

## 구현 범위 제안

### MVP (Minimum Viable Product)

1. **Shift+클릭 = 추가 선택** (기존 Ctrl+클릭과 동일)
2. **L+R 블록 혼합 시 자동 감지** → `column: "X"` 설정
3. **export 시 세로 합성** (L 먼저, R 나중 - Y좌표 기준 자동 정렬)
4. **시각적 표시**: 크로스 컬럼 그룹은 주황색 테두리

### 향후 확장

1. 드래그로 순서 변경 UI
2. 가로 합성 옵션 (좌우로 이어붙이기)
3. 영역 미리보기 팝업

---

## 작업량 추정

| 작업 | 예상 시간 | 파일 |
|------|----------|------|
| 선택 로직 수정 | 30분 | PageViewer.tsx, PageCanvas.tsx |
| 그룹 모델 확장 | 15분 | api/client.ts |
| 크로스 컬럼 감지 | 30분 | PageViewer.tsx |
| export 합성 로직 | 1시간 | export.py |
| UI 시각화 | 30분 | PageCanvas.tsx, GroupPanel.tsx |
| 테스트 | 30분 | - |
| **총계** | **~3시간** | - |

---

## 대안 검토

### 대안 1: 수동 이미지 편집

```
문제: 좌우 걸친 문제 발생
→ 각각 별도 그룹으로 저장
→ 외부 도구(포토샵 등)에서 수동 합성
```

**단점**: 매번 수동 작업 필요, 워크플로우 단절

### 대안 2: 전체 페이지 크롭

```
문제: 좌우 걸친 문제 발생
→ 해당 페이지 전체를 하나의 문제로 저장
```

**단점**: 불필요한 영역 포함, 파일 크기 증가

### 대안 3: 본 제안 (자동 합성)

```
문제: 좌우 걸친 문제 발생
→ Shift+클릭으로 양쪽 블록 선택
→ 시스템이 자동으로 세로 합성
```

**장점**: 자연스러운 워크플로우, 정확한 크롭

---

## 결론 및 권장 사항

### 구현 권장: **예**

1. **필요성**: 실제 교재에서 좌우단 걸친 문제가 빈번
2. **구현 복잡도**: 관리 가능한 수준 (약 3시간)
3. **위험도**: 기존 기능에 영향 최소화 가능
4. **사용자 가치**: 워크플로우 대폭 개선

### 권장 구현 순서

1. Phase 53-A: Shift+클릭 추가 선택 기능
2. Phase 53-B: 크로스 컬럼 자동 감지 및 그룹 모델 확장
3. Phase 53-C: Backend 이미지 합성 로직
4. Phase 53-D: UI 시각화 및 피드백

---

**"진행해줘"로 구현을 시작합니다.**
