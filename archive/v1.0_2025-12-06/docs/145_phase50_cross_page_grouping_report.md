# Phase 50: 페이지간 그룹화 기능 분석 리포트

**날짜**: 2025-12-05
**요청**: 8쪽 우측 → 9쪽 좌측처럼 2페이지에 걸친 문제/해설 그룹화 방안

---

## 1. 현재 시스템 구조

### 1.1 데이터 저장 방식

```
dataset_root/documents/{document_id}/
├── pages/          # 페이지 이미지
│   ├── page_0000.png
│   └── page_0001.png
├── blocks/         # 블록 JSON (페이지별 분리)
│   ├── page_0000_blocks.json  ← 블록 ID는 페이지 내에서만 유일
│   └── page_0001_blocks.json
├── groups/         # 그룹 JSON (페이지별 분리)
│   ├── page_0000_groups.json
│   └── page_0001_groups.json
└── problems/       # 내보내기된 문제 이미지
```

### 1.2 핵심 제약사항

| 항목 | 현재 상태 | 설명 |
|------|----------|------|
| **블록 ID** | 페이지 로컬 | `block_id: 1`은 0페이지와 1페이지에서 다른 블록 |
| **그룹 저장** | 페이지별 파일 | `page_0008_groups.json`은 8페이지 그룹만 저장 |
| **UI** | 단일 페이지 뷰 | 한 번에 한 페이지만 표시 |
| **내보내기** | 단일 페이지 기반 | 한 페이지의 블록만 크롭 |

### 1.3 기존 크로스 컬럼 구현 (Phase 53)

**이미 구현된 기능**: 같은 페이지 내 좌→우 컬럼 걸침

```
┌─────────┬─────────┐
│    L    │    R    │  8페이지
│  블록1   │  블록2   │  ← 이미 지원! (column: "X")
│         │         │
└─────────┴─────────┘
```

**구현 방식**:
```typescript
// 세그먼트 기반 저장
{
  "id": "p8_X1",
  "column": "X",  // Cross-column
  "segments": [
    { "column": "L", "block_ids": [1, 2], "order": 0 },
    { "column": "R", "block_ids": [5, 6], "order": 1 }
  ]
}
```

**내보내기**: 세그먼트별 크롭 후 **세로 병합** (한국어 읽기 순서)

---

## 2. 요구사항: 페이지간 그룹화

### 2.1 시나리오

```
┌─────────┬─────────┐     ┌─────────┬─────────┐
│    L    │    R    │     │    L    │    R    │
│         │  ███████│     │███████  │         │
│         │  ███████│ →→→ │███████  │         │
│         │  문제시작│     │문제끝   │         │
└─────────┴─────────┘     └─────────┴─────────┘
       8페이지                   9페이지
```

**원하는 결과**: 8쪽 우측 블록 + 9쪽 좌측 블록 = 하나의 그룹

### 2.2 내보내기 결과

```
┌─────────────┐
│  8쪽 우측   │  ← 위
│   블록들    │
├─────────────┤
│  9쪽 좌측   │  ← 아래
│   블록들    │
└─────────────┘
   세로 병합
```

---

## 3. 구현 방안 비교

### 방안 A: 연속 그룹 시스템 (Continuation Groups)

**개념**: 별도 그룹 2개 생성 후 연결

```
8페이지: { id: "p8_R1", continuation: "next" }  ← "다음 페이지로 이어짐"
9페이지: { id: "p9_L1", continuation: "prev" }  ← "이전 페이지에서 이어짐"
         ↓
내보내기 시 자동 병합
```

**장점**:
- 기존 데이터 구조 최소 변경
- 단일 페이지 UI 유지 가능
- 직관적인 사용자 경험

**단점**:
- 2번 작업 필요 (각 페이지에서)
- 연결 관리 복잡
- 연결 끊어짐 위험

**난이도**: ⭐⭐⭐☆☆ (중간)

---

### 방안 B: 확장된 블록 참조 (Extended Block References)

**개념**: 블록 ID에 페이지 정보 포함

```typescript
// 기존
"block_ids": [1, 2, 3]

// 확장
"block_references": [
  { "page": 8, "blockId": 15 },
  { "page": 8, "blockId": 16 },
  { "page": 9, "blockId": 1 },
  { "page": 9, "blockId": 2 }
]
```

**장점**:
- 데이터 모델이 명확
- 무한 페이지 확장 가능
- 기존 단일 페이지와 호환

**단점**:
- UI 구현 복잡 (멀티 페이지 선택)
- 대규모 코드 변경 필요
- 마이그레이션 이슈

**난이도**: ⭐⭐⭐⭐☆ (어려움)

---

### 방안 C: 듀얼 페이지 뷰 모드 (Dual Page View)

**개념**: 2페이지를 나란히 표시하여 동시 선택

```
┌─────────────────────────────────────────┐
│ [8페이지]              [9페이지]         │
│ ┌─────┬─────┐   ┌─────┬─────┐          │
│ │  L  │  R  │   │  L  │  R  │          │
│ │     │ ██ │   │ ██ │     │          │
│ └─────┴─────┘   └─────┴─────┘          │
│        └──────────────┘                 │
│           선택 영역                      │
└─────────────────────────────────────────┘
```

**장점**:
- 가장 직관적인 UX
- 실제 책 넘기기와 유사
- 한 번에 그룹 생성

**단점**:
- 캔버스 완전 재설계
- 화면 공간 2배 필요
- 성능 이슈 (2페이지 동시 렌더링)

**난이도**: ⭐⭐⭐⭐⭐ (매우 어려움)

---

### 방안 D: 크로스 페이지 세그먼트 (권장)

**개념**: 기존 세그먼트 시스템 확장

```typescript
// 기존 크로스 컬럼 (Phase 53)
{
  "id": "p8_X1",
  "column": "X",
  "segments": [
    { "column": "L", "block_ids": [1, 2], "order": 0 },
    { "column": "R", "block_ids": [5, 6], "order": 1 }
  ]
}

// 확장: 크로스 페이지
{
  "id": "p8_XP1",           // XP = Cross-Page
  "column": "XP",
  "segments": [
    { "page": 8, "column": "R", "block_ids": [15, 16], "order": 0 },
    { "page": 9, "column": "L", "block_ids": [1, 2], "order": 1 }
  ]
}
```

**장점**:
- Phase 53 아키텍처 재사용
- 세그먼트 병합 로직 그대로 활용
- 점진적 구현 가능

**단점**:
- UI 개선 필요 (페이지 전환 시 선택 유지)
- 시작 페이지에만 그룹 저장 (비대칭)

**난이도**: ⭐⭐⭐☆☆ (중간)

---

## 4. 권장 방안: D (크로스 페이지 세그먼트)

### 4.1 선택 이유

| 기준 | 방안 A | 방안 B | 방안 C | **방안 D** |
|------|--------|--------|--------|------------|
| 코드 변경량 | 중 | 대 | 최대 | **중** |
| UX 품질 | 중 | 상 | 최상 | **상** |
| 구현 난이도 | 중 | 상 | 최상 | **중** |
| Phase 53 호환 | 낮음 | 낮음 | 낮음 | **높음** |
| 확장성 | 제한적 | 높음 | 높음 | **높음** |

### 4.2 워크플로우 (사용자 관점)

```
1. 8페이지에서 우측 블록들 선택
2. "다음 페이지로 이어짐" 버튼 클릭 (또는 단축키 P)
3. 선택 상태 유지 → 9페이지로 이동
4. 9페이지에서 좌측 블록들 추가 선택
5. "그룹 생성" → 크로스 페이지 그룹 완성

[결과]
- 8페이지 groups.json에 XP 그룹 저장
- 내보내기 시 2페이지 이미지 세로 병합
```

### 4.3 UI 변경사항

```
┌──────────────────────────────────────────┐
│ 그룹 생성                                 │
├──────────────────────────────────────────┤
│ [선택한 3개 블록으로 그룹 생성]            │  ← 기존
│                                          │
│ [📄 다음 페이지로 이어서 선택] (단축키: P)  │  ← 신규
└──────────────────────────────────────────┘

선택 유지 상태에서 페이지 이동 시:
┌──────────────────────────────────────────┐
│ ⚠️ 크로스 페이지 선택 모드                 │
│ 8페이지에서 3개 블록 선택됨                │
│                                          │
│ [현재 페이지 블록 추가 선택]               │
│ [크로스 페이지 그룹 생성]                  │
│ [선택 취소]                               │
└──────────────────────────────────────────┘
```

---

## 5. 구현 상세 (방안 D)

### 5.1 데이터 모델 변경

```typescript
// frontend/src/api/client.ts

// 기존 GroupSegment
export interface GroupSegment {
  column: "L" | "R";
  block_ids: number[];
  order: number;
}

// 확장: CrossPageSegment
export interface CrossPageSegment extends GroupSegment {
  page: number;  // 신규: 페이지 인덱스
}

// ProblemGroup 확장
export interface ProblemGroup {
  id: string;
  column: "L" | "R" | "X" | "XP";  // XP 추가 (Cross-Page)
  block_ids: number[];             // 단일 페이지용 (하위 호환)
  segments?: GroupSegment[];       // 크로스 컬럼용
  crossPageSegments?: CrossPageSegment[];  // 크로스 페이지용 (신규)
  // ...
}
```

### 5.2 상태 관리 변경

```typescript
// PageViewer.tsx 또는 새로운 store

// 크로스 페이지 선택 상태
interface CrossPageSelection {
  isActive: boolean;
  sourcePageIndex: number;
  sourceBlocks: Array<{
    page: number;
    column: "L" | "R";
    blockId: number;
  }>;
}

const [crossPageSelection, setCrossPageSelection] = useState<CrossPageSelection>({
  isActive: false,
  sourcePageIndex: -1,
  sourceBlocks: []
});
```

### 5.3 내보내기 로직

```python
# backend/app/routers/export.py

async def export_cross_page_group(group: dict, document_id: str):
    """크로스 페이지 그룹 내보내기"""
    cropped_images = []

    for segment in sorted(group["crossPageSegments"], key=lambda s: s["order"]):
        page_index = segment["page"]

        # 해당 페이지 이미지 로드
        page_image = load_page_image(document_id, page_index)

        # 해당 페이지 블록 데이터 로드
        blocks_data = load_blocks(document_id, page_index)

        # 세그먼트 블록들 크롭
        segment_blocks = [
            b for b in blocks_data["blocks"]
            if b["block_id"] in segment["block_ids"]
        ]
        bbox = calculate_bounding_box(segment_blocks)
        cropped = page_image.crop(bbox)
        cropped_images.append(cropped)

    # 세로 병합 (Phase 53과 동일)
    final_image = merge_images_vertically(cropped_images, padding=10)
    return final_image
```

### 5.4 단계별 구현 계획

| 단계 | 내용 | 예상 시간 |
|------|------|----------|
| **Step 1** | 데이터 모델 확장 (TypeScript + Python) | 2시간 |
| **Step 2** | 크로스 페이지 선택 상태 관리 | 3시간 |
| **Step 3** | "다음 페이지로 이어서" UI 추가 | 2시간 |
| **Step 4** | 크로스 페이지 그룹 생성 로직 | 3시간 |
| **Step 5** | 내보내기 로직 확장 | 2시간 |
| **Step 6** | GroupPanel 크로스 페이지 표시 | 2시간 |
| **Step 7** | 테스트 및 버그 수정 | 2시간 |
| **총계** | | **16시간** |

---

## 6. 우려 사항 및 해결 방안

### 6.1 선택 상태 유실 위험 ⚠️

**문제**: 페이지 전환 시 선택 상태가 리셋될 수 있음

**해결**:
```typescript
// 페이지 전환 시 크로스 페이지 모드이면 선택 유지
useEffect(() => {
  if (!crossPageSelection.isActive) {
    setSelectedBlocks([]);  // 일반 모드: 리셋
  }
  // 크로스 페이지 모드: 유지
}, [currentPage]);
```

### 6.2 그룹 저장 위치 혼란 ⚠️

**문제**: 8-9페이지 그룹은 어디에 저장?

**해결**: 항상 **시작 페이지**에 저장
```
page_0008_groups.json → XP 그룹 저장
page_0009_groups.json → 참조 없음 (또는 "linked from p8" 마커)
```

### 6.3 삭제 시 동기화 ⚠️

**문제**: 크로스 페이지 그룹 삭제 시 9페이지 blocks가 orphan이 될 수 있음

**해결**: 그룹 삭제 시 관련 페이지 그룹 파일 모두 업데이트

### 6.4 시각적 피드백 부족 ⚠️

**문제**: 9페이지에서 "이 블록들은 8페이지 그룹에 속함"을 알기 어려움

**해결**:
```tsx
// 다른 페이지 그룹에 속한 블록 표시
{isPartOfCrossPageGroup && (
  <div className="absolute -top-2 -left-2 bg-purple-500 text-white text-xs px-1 rounded">
    ← p8
  </div>
)}
```

### 6.5 내보내기 순서 ⚠️

**문제**: 8쪽 우측 → 9쪽 좌측 순서가 맞는지?

**해결**: segment의 `order` 필드로 명시적 지정
- 생성 시점에 사용자가 선택한 순서 그대로 저장

---

## 7. 대안: 수동 이미지 병합 (단기 해결책)

구현 전까지 임시 방안:

```
1. 8페이지 우측 블록들로 그룹 생성 → 내보내기
2. 9페이지 좌측 블록들로 그룹 생성 → 내보내기
3. 외부 도구로 이미지 병합 (예: Photoshop, Preview)
```

**또는 스크립트 제공**:
```python
# merge_problems.py
from PIL import Image

def merge_problem_images(image1_path, image2_path, output_path):
    img1 = Image.open(image1_path)
    img2 = Image.open(image2_path)

    # 세로 병합
    merged = Image.new('RGB', (max(img1.width, img2.width), img1.height + img2.height + 10))
    merged.paste(img1, (0, 0))
    merged.paste(img2, (0, img1.height + 10))
    merged.save(output_path)
```

---

## 8. 결론

### 구현 가능성: ✅ 높음

| 항목 | 평가 |
|------|------|
| 기술적 실현 가능성 | ✅ 가능 (Phase 53 아키텍처 활용) |
| 데이터 모델 확장성 | ✅ 세그먼트 모델로 자연스럽게 확장 |
| UX 복잡도 | ⚠️ 중간 (새로운 워크플로우 학습 필요) |
| 예상 개발 기간 | 약 2-3일 (16시간) |

### 권장 사항

1. **방안 D (크로스 페이지 세그먼트)** 채택
2. **단축키 기반 워크플로우** 설계 (P = 다음 페이지로 이어서)
3. **시각적 피드백** 강화 (크로스 페이지 상태 명확히 표시)
4. **기존 단일 페이지 호환성** 유지

### 다음 단계

1. 사용자 승인 → 개발 계획 수립
2. 데이터 모델 먼저 확장 (Step 1)
3. UI 프로토타입 제작 (Step 2-3)
4. 나머지 구현 진행

---

*작성일: 2025-12-05*
