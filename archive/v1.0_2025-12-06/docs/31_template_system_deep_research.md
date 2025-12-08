# 템플릿 시스템 심층 연구 리포트

**날짜**: 2025-11-28
**요청**: 템플릿 시스템 설계 - 자동배치 우선, 필요시 자유캔버스
**분석 범위**: A4 레이아웃, 그리드 시스템, 자동/수동 배치, 커스텀 템플릿 생성

---

## 1. A4 용지 규격 및 기본 설계

### 1.1 A4 물리적 규격

| 단위 | 가로 | 세로 | 비고 |
|------|------|------|------|
| mm | 210 | 297 | 물리적 크기 |
| cm | 21 | 29.7 | CSS 단위 권장 |
| px (96dpi) | 794 | 1123 | 화면 표시용 |
| px (300dpi) | 2480 | 3508 | 인쇄 품질 |

### 1.2 인쇄 안전 영역

```
┌─────────────────────────────────────┐
│  ← 15mm →                ← 15mm →  │  ← 좌우 여백
│  ↑                                  │
│  15mm                               │  ← 상단 여백
│  ↓                                  │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      인쇄 가능 영역          │   │
│  │      180mm × 267mm          │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│  ↑                                  │
│  15mm                               │  ← 하단 여백
│  ↓                                  │
└─────────────────────────────────────┘
```

**권장 여백 설정**:
```css
@page {
  size: 210mm 297mm;
  margin: 15mm;  /* 상하좌우 동일 */
}
```

### 1.3 CSS에서 A4 구현

```css
/* A4 페이지 컨테이너 */
.a4-page {
  width: 210mm;
  height: 297mm;
  padding: 15mm;
  box-sizing: border-box;
  background: white;
}

/* 인쇄 가능 영역 */
.printable-area {
  width: 180mm;   /* 210 - 15*2 */
  height: 267mm;  /* 297 - 15*2 */
}
```

> **중요**: 픽셀(px) 대신 물리 단위(mm, cm) 사용을 권장. 브라우저 확대/축소에도 일관된 인쇄 결과 보장.
> 출처: [Stack Overflow - CSS Grid layout in mm](https://stackoverflow.com/questions/52485899/css-grid-layout-in-mm-for-printing)

---

## 2. 그리드 레이아웃 설계

### 2.1 4문제 레이아웃 (2×2)

```
┌─────────────────────────────────────┐
│           A4 (210×297mm)            │
│  ┌───────────────┬───────────────┐  │
│  │               │               │  │
│  │   문제 1      │   문제 2      │  │
│  │   85×125mm    │   85×125mm    │  │
│  │               │               │  │
│  ├───────────────┼───────────────┤  │
│  │               │               │  │
│  │   문제 3      │   문제 4      │  │
│  │   85×125mm    │   85×125mm    │  │
│  │               │               │  │
│  └───────────────┴───────────────┘  │
└─────────────────────────────────────┘
```

**치수 계산**:
```
가용 너비: 180mm (210 - 15*2)
가용 높이: 267mm (297 - 15*2)

열 수: 2
행 수: 2
거터(간격): 10mm

셀 너비: (180 - 10) / 2 = 85mm
셀 높이: (267 - 10) / 2 = 128.5mm ≈ 125mm (여유 공간)
```

**CSS 구현**:
```css
.grid-2x2 {
  display: grid;
  grid-template-columns: repeat(2, 85mm);
  grid-template-rows: repeat(2, 125mm);
  gap: 10mm;
  justify-content: center;
}
```

### 2.2 6문제 레이아웃 (2×3)

```
┌─────────────────────────────────────┐
│           A4 (210×297mm)            │
│  ┌───────────────┬───────────────┐  │
│  │   문제 1      │   문제 2      │  │
│  │   85×80mm     │   85×80mm     │  │
│  ├───────────────┼───────────────┤  │
│  │   문제 3      │   문제 4      │  │
│  │   85×80mm     │   85×80mm     │  │
│  ├───────────────┼───────────────┤  │
│  │   문제 5      │   문제 6      │  │
│  │   85×80mm     │   85×80mm     │  │
│  └───────────────┴───────────────┘  │
└─────────────────────────────────────┘
```

**치수 계산**:
```
열 수: 2
행 수: 3
거터: 10mm (가로), 8mm (세로)

셀 너비: (180 - 10) / 2 = 85mm
셀 높이: (267 - 8*2) / 3 = 83.6mm ≈ 80mm
```

**CSS 구현**:
```css
.grid-2x3 {
  display: grid;
  grid-template-columns: repeat(2, 85mm);
  grid-template-rows: repeat(3, 80mm);
  gap: 8mm 10mm;  /* row-gap column-gap */
  justify-content: center;
}
```

### 2.3 다양한 레이아웃 프리셋

| 프리셋 | 그리드 | 셀 크기 | 용도 |
|--------|--------|---------|------|
| 2문제 | 1×2 | 180×125mm | 큰 문제/서술형 |
| 4문제 | 2×2 | 85×125mm | 표준 객관식 |
| 6문제 | 2×3 | 85×80mm | 단답형/소문항 |
| 8문제 | 2×4 | 85×60mm | 간단한 문제 |
| 9문제 | 3×3 | 55×80mm | 작은 문제 |

---

## 3. 자동 배치 알고리즘

### 3.1 기본 자동 배치 로직

```typescript
interface Problem {
  id: string;
  imageWidth: number;   // 원본 이미지 너비 (px)
  imageHeight: number;  // 원본 이미지 높이 (px)
  imagePath: string;
}

interface LayoutSlot {
  x: number;      // mm 단위
  y: number;      // mm 단위
  width: number;  // mm 단위
  height: number; // mm 단위
}

interface Template {
  name: string;
  columns: number;
  rows: number;
  slots: LayoutSlot[];
}

/**
 * 자동 배치 알고리즘
 * 선택한 문제들을 템플릿 슬롯에 순차적으로 배치
 */
function autoPlace(
  problems: Problem[],
  template: Template
): PlacementResult[] {
  const results: PlacementResult[] = [];
  const slotsPerPage = template.slots.length;

  problems.forEach((problem, index) => {
    const pageIndex = Math.floor(index / slotsPerPage);
    const slotIndex = index % slotsPerPage;
    const slot = template.slots[slotIndex];

    // 이미지를 슬롯에 맞게 스케일링
    const scale = calculateFitScale(
      problem.imageWidth,
      problem.imageHeight,
      slot.width,
      slot.height
    );

    results.push({
      problemId: problem.id,
      pageIndex,
      slotIndex,
      position: { x: slot.x, y: slot.y },
      scaledSize: {
        width: problem.imageWidth * scale,
        height: problem.imageHeight * scale
      }
    });
  });

  return results;
}

/**
 * 이미지를 슬롯에 맞추는 스케일 계산
 * 가로세로 비율 유지하면서 슬롯 안에 fit
 */
function calculateFitScale(
  imgWidth: number,
  imgHeight: number,
  slotWidth: number,
  slotHeight: number
): number {
  const widthRatio = slotWidth / imgWidth;
  const heightRatio = slotHeight / imgHeight;
  return Math.min(widthRatio, heightRatio);  // 더 작은 비율 선택
}
```

> 출처: [Stack Overflow - jsPDF image fit](https://stackoverflow.com/questions/36472094/how-to-set-image-to-fit-width-of-the-page-using-jspdf)

### 3.2 스마트 자동 배치 (크기 기반)

```typescript
/**
 * 문제 크기에 따라 최적 템플릿 자동 선택
 */
function selectOptimalTemplate(problems: Problem[]): Template {
  // 평균 문제 크기 계산
  const avgAspectRatio = problems.reduce((sum, p) =>
    sum + (p.imageWidth / p.imageHeight), 0) / problems.length;

  const avgHeight = problems.reduce((sum, p) =>
    sum + p.imageHeight, 0) / problems.length;

  // 문제 수에 따른 기본 템플릿
  const count = problems.length;

  if (count <= 2) return TEMPLATES['1x2'];      // 2문제
  if (count <= 4) return TEMPLATES['2x2'];      // 4문제
  if (count <= 6) return TEMPLATES['2x3'];      // 6문제
  if (count <= 8) return TEMPLATES['2x4'];      // 8문제
  return TEMPLATES['3x3'];                       // 9문제+
}

/**
 * 빈 공간 최소화하는 배치
 */
function optimizedAutoPlace(
  problems: Problem[],
  template: Template
): PlacementResult[] {
  // 문제를 높이 기준으로 정렬 (큰 것부터)
  const sorted = [...problems].sort((a, b) =>
    b.imageHeight - a.imageHeight
  );

  // First-Fit Decreasing 알고리즘 적용
  return autoPlace(sorted, template);
}
```

### 3.3 페이지 분할 로직

```typescript
/**
 * 여러 페이지로 문제 분배
 */
function distributeToPages(
  problems: Problem[],
  template: Template
): Page[] {
  const slotsPerPage = template.columns * template.rows;
  const totalPages = Math.ceil(problems.length / slotsPerPage);

  const pages: Page[] = [];

  for (let i = 0; i < totalPages; i++) {
    const startIdx = i * slotsPerPage;
    const pageProblems = problems.slice(startIdx, startIdx + slotsPerPage);

    pages.push({
      pageNumber: i + 1,
      problems: autoPlace(pageProblems, template)
    });
  }

  return pages;
}
```

---

## 4. 자유 캔버스 모드

### 4.1 자유 배치 vs 그리드 배치

| 특성 | 자동 배치 (그리드) | 자유 캔버스 |
|------|-------------------|-------------|
| 진입 장벽 | 낮음 | 높음 |
| 일관성 | 높음 | 낮음 |
| 유연성 | 낮음 | 높음 |
| 작업 속도 | 빠름 | 느림 |
| 사용 시나리오 | 표준 시험지 | 특수 레이아웃 |

### 4.2 자유 캔버스 UI 설계

```
┌─────────────────────────────────────────────────────────┐
│  [그리드 모드] [자유 캔버스]        [스냅: ON] [가이드]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│    ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐             │
│    │  ┌──────────┐                       │             │
│    │  │ 문제 1   │←─── 드래그로 이동     │             │
│    │  │          │     ○ 크기 조절 핸들  │             │
│    │  └──────────○                       │             │
│    │                   ┌──────────┐      │             │
│    │                   │ 문제 2   │      │  ← A4 영역  │
│    │                   └──────────┘      │             │
│    │         ┌──────────┐                │             │
│    │         │ 문제 3   │                │             │
│    │         └──────────┘                │             │
│    └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  위치: X=45mm Y=32mm | 크기: 80×60mm | 회전: 0°        │
└─────────────────────────────────────────────────────────┘
```

### 4.3 자유 캔버스 기능 목록

| 기능 | 설명 | 구현 |
|------|------|------|
| **드래그 이동** | 문제를 자유롭게 이동 | dnd-kit 라이브러리 |
| **크기 조절** | 코너 핸들로 크기 변경 | react-resizable |
| **스냅 가이드** | 정렬 보조선 표시 | 커스텀 구현 |
| **그리드 스냅** | 격자에 맞춤 | 좌표 반올림 |
| **회전** | 문제 회전 (선택적) | CSS transform |
| **정렬 도구** | 좌/우/중앙 정렬 | 계산 로직 |
| **Z-order** | 앞으로/뒤로 보내기 | z-index 조절 |

### 4.4 스냅 가이드 알고리즘

```typescript
/**
 * 드래그 중 스냅 가이드라인 계산
 */
function calculateSnapGuides(
  draggingItem: Rect,
  otherItems: Rect[],
  threshold: number = 5  // mm
): SnapGuide[] {
  const guides: SnapGuide[] = [];

  otherItems.forEach(item => {
    // 좌측 정렬
    if (Math.abs(draggingItem.left - item.left) < threshold) {
      guides.push({ type: 'vertical', position: item.left });
    }
    // 우측 정렬
    if (Math.abs(draggingItem.right - item.right) < threshold) {
      guides.push({ type: 'vertical', position: item.right });
    }
    // 상단 정렬
    if (Math.abs(draggingItem.top - item.top) < threshold) {
      guides.push({ type: 'horizontal', position: item.top });
    }
    // 하단 정렬
    if (Math.abs(draggingItem.bottom - item.bottom) < threshold) {
      guides.push({ type: 'horizontal', position: item.bottom });
    }
    // 중앙 정렬 (가로)
    if (Math.abs(draggingItem.centerX - item.centerX) < threshold) {
      guides.push({ type: 'vertical', position: item.centerX });
    }
    // 중앙 정렬 (세로)
    if (Math.abs(draggingItem.centerY - item.centerY) < threshold) {
      guides.push({ type: 'horizontal', position: item.centerY });
    }
  });

  return guides;
}
```

---

## 5. 커스텀 템플릿 시스템

### 5.1 템플릿 데이터 구조

```typescript
interface CustomTemplate {
  id: string;
  name: string;
  description?: string;

  // 페이지 설정
  page: {
    size: 'A4' | 'A3' | 'Letter' | 'Custom';
    orientation: 'portrait' | 'landscape';
    width?: number;   // mm (Custom일 때)
    height?: number;  // mm (Custom일 때)
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };

  // 그리드 설정 (자동 배치용)
  grid: {
    columns: number;
    rows: number;
    columnGap: number;  // mm
    rowGap: number;     // mm
  };

  // 슬롯 정의 (자유 배치용)
  slots: TemplateSlot[];

  // 헤더/푸터
  header?: {
    height: number;
    content: string;  // HTML 또는 텍스트
  };
  footer?: {
    height: number;
    content: string;
  };

  // 메타데이터
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface TemplateSlot {
  id: string;
  label?: string;  // "문제 1", "문제 2" 등
  x: number;       // mm
  y: number;       // mm
  width: number;   // mm
  height: number;  // mm

  // 선택적 설정
  padding?: number;
  border?: {
    width: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  numberPosition?: 'top-left' | 'top-right' | 'none';
}
```

### 5.2 기본 제공 템플릿

```typescript
const DEFAULT_TEMPLATES: CustomTemplate[] = [
  {
    id: 'preset-4',
    name: '4문제 (2×2)',
    page: {
      size: 'A4',
      orientation: 'portrait',
      margin: { top: 15, right: 15, bottom: 15, left: 15 }
    },
    grid: { columns: 2, rows: 2, columnGap: 10, rowGap: 10 },
    slots: [
      { id: 's1', x: 15, y: 15, width: 85, height: 125 },
      { id: 's2', x: 110, y: 15, width: 85, height: 125 },
      { id: 's3', x: 15, y: 150, width: 85, height: 125 },
      { id: 's4', x: 110, y: 150, width: 85, height: 125 }
    ],
    isDefault: true
  },
  {
    id: 'preset-6',
    name: '6문제 (2×3)',
    page: {
      size: 'A4',
      orientation: 'portrait',
      margin: { top: 15, right: 15, bottom: 15, left: 15 }
    },
    grid: { columns: 2, rows: 3, columnGap: 10, rowGap: 8 },
    slots: [
      { id: 's1', x: 15, y: 15, width: 85, height: 80 },
      { id: 's2', x: 110, y: 15, width: 85, height: 80 },
      { id: 's3', x: 15, y: 103, width: 85, height: 80 },
      { id: 's4', x: 110, y: 103, width: 85, height: 80 },
      { id: 's5', x: 15, y: 191, width: 85, height: 80 },
      { id: 's6', x: 110, y: 191, width: 85, height: 80 }
    ],
    isDefault: true
  }
];
```

### 5.3 템플릿 에디터 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  템플릿 편집기                                    [저장] [취소]  │
├────────────────────┬────────────────────────────────────────────┤
│                    │                                            │
│  ■ 페이지 설정     │         ┌─────────────────────┐           │
│  크기: [A4 ▾]     │         │ ╔═══════╦═══════╗ │           │
│  방향: [세로 ▾]   │         │ ║ 슬롯1 ║ 슬롯2 ║ │           │
│                    │         │ ╠═══════╬═══════╣ │  ← 미리보기│
│  ■ 여백 (mm)      │         │ ║ 슬롯3 ║ 슬롯4 ║ │           │
│  상: [15]         │         │ ╠═══════╬═══════╣ │           │
│  하: [15]         │         │ ║ 슬롯5 ║ 슬롯6 ║ │           │
│  좌: [15]         │         │ ╚═══════╩═══════╝ │           │
│  우: [15]         │         └─────────────────────┘           │
│                    │                                            │
│  ■ 그리드         │         클릭하여 슬롯 선택                  │
│  열: [2] [+][-]   │         드래그하여 크기 조절                │
│  행: [3] [+][-]   │                                            │
│  간격: [10]mm     │  ───────────────────────────────           │
│                    │                                            │
│  ■ 선택된 슬롯    │  선택: 슬롯 1                              │
│  너비: [85]mm     │  위치: X=15mm, Y=15mm                      │
│  높이: [80]mm     │  크기: 85×80mm                             │
│  번호표시: [좌상▾]│                                            │
│                    │                                            │
└────────────────────┴────────────────────────────────────────────┘
```

### 5.4 템플릿 에디터 기능

| 기능 | 설명 |
|------|------|
| **그리드 설정** | 열/행 수 조절로 자동 슬롯 생성 |
| **슬롯 수동 편집** | 개별 슬롯 위치/크기 직접 조정 |
| **슬롯 추가/삭제** | 자유롭게 슬롯 추가/제거 |
| **실시간 미리보기** | 변경사항 즉시 반영 |
| **여백 조절** | 페이지 여백 설정 |
| **템플릿 저장** | JSON으로 저장/불러오기 |
| **복제** | 기존 템플릿 복사 후 수정 |

---

## 6. 기술 구현 가이드

### 6.1 프론트엔드 구조

```
frontend/src/
├── components/
│   └── template-editor/
│       ├── TemplateEditor.tsx       # 메인 에디터
│       ├── TemplateCanvas.tsx       # A4 캔버스
│       ├── SlotEditor.tsx           # 슬롯 편집
│       ├── GridSettings.tsx         # 그리드 설정 패널
│       ├── PageSettings.tsx         # 페이지 설정 패널
│       └── TemplatePreview.tsx      # 미리보기
│
├── components/
│   └── worksheet-builder/
│       ├── WorksheetBuilder.tsx     # 시험지 빌더 메인
│       ├── ProblemSelector.tsx      # 문제 선택 패널
│       ├── CanvasView.tsx           # 자유 캔버스
│       ├── GridView.tsx             # 그리드 뷰
│       └── PDFExport.tsx            # PDF 출력
│
├── hooks/
│   ├── useTemplate.ts               # 템플릿 상태 관리
│   ├── useAutoLayout.ts             # 자동 배치 로직
│   └── useDragDrop.ts               # 드래그 앤 드롭
│
└── types/
    └── template.ts                  # 타입 정의
```

### 6.2 핵심 라이브러리

| 라이브러리 | 용도 | 선택 이유 |
|-----------|------|----------|
| `@dnd-kit/core` | 드래그 앤 드롭 | React 친화적, 접근성 우수, 커스터마이징 용이 |
| `@react-pdf/renderer` | PDF 생성 | React 컴포넌트 기반, 서버/클라이언트 모두 지원 |
| `react-resizable` | 크기 조절 | 간단하고 가벼움 |
| `zustand` | 상태 관리 | 가볍고 직관적 |

> 출처: [Puck Editor - Top 5 DnD Libraries](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)

### 6.3 React-PDF 템플릿 렌더링

```tsx
import { Document, Page, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    width: '210mm',
    height: '297mm',
    padding: '15mm',
  },
  grid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '10mm',
  },
  slot: {
    width: '85mm',
    height: '125mm',
    border: '1px solid #ccc',
    padding: '2mm',
  },
  problemImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  }
});

interface WorksheetPDFProps {
  template: CustomTemplate;
  problems: PlacedProblem[];
}

function WorksheetPDF({ template, problems }: WorksheetPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.grid}>
          {template.slots.map((slot, index) => (
            <View key={slot.id} style={styles.slot}>
              {problems[index] && (
                <Image
                  src={problems[index].imagePath}
                  style={styles.problemImage}
                />
              )}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
```

> 참고: react-pdf는 CSS Grid를 완전히 지원하지 않으므로 Flexbox로 구현
> 출처: [GitHub - react-pdf CSS Grid Support Issue](https://github.com/diegomura/react-pdf/issues/1207)

### 6.4 자동 배치 + 자유 캔버스 모드 전환

```tsx
type EditorMode = 'auto' | 'free';

function WorksheetBuilder() {
  const [mode, setMode] = useState<EditorMode>('auto');
  const [template, setTemplate] = useState<CustomTemplate>(DEFAULT_TEMPLATE);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);

  // 모드에 따른 배치 계산
  useEffect(() => {
    if (mode === 'auto') {
      // 자동 배치: 템플릿 슬롯에 순차 배치
      const autoPlaced = autoPlace(problems, template);
      setPlacements(autoPlaced);
    }
    // 'free' 모드는 사용자가 직접 조정
  }, [mode, problems, template]);

  // 모드 전환
  const switchToFreeMode = () => {
    // 현재 자동 배치 상태를 유지하면서 자유 모드로 전환
    setMode('free');
  };

  const switchToAutoMode = () => {
    // 경고: 자유 배치가 초기화됨
    if (confirm('자동 배치로 전환하면 현재 배치가 초기화됩니다.')) {
      setMode('auto');
    }
  };

  return (
    <div className="worksheet-builder">
      <ModeToggle mode={mode} onSwitch={mode === 'auto' ? switchToFreeMode : switchToAutoMode} />

      {mode === 'auto' ? (
        <GridView
          template={template}
          placements={placements}
        />
      ) : (
        <FreeCanvas
          placements={placements}
          onPlacementChange={setPlacements}
        />
      )}
    </div>
  );
}
```

---

## 7. 워크플로우 설계

### 7.1 사용자 시나리오

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. 문제 선택                                                   │
│     └─ 필터링 → 문제 카드 클릭 → 선택 목록에 추가               │
│                                                                 │
│  2. 템플릿 선택                                                 │
│     ├─ 프리셋 선택: [4문제] [6문제] [8문제]                    │
│     └─ 또는: [커스텀 템플릿 만들기]                             │
│                                                                 │
│  3. 자동 배치 (기본)                                            │
│     └─ 시스템이 선택한 문제를 템플릿에 자동 배치                │
│                                                                 │
│  4. 미세 조정 (선택)                                            │
│     ├─ [자유 캔버스로 전환] → 드래그로 위치 조정                │
│     └─ 또는: 자동 배치 상태 유지                                │
│                                                                 │
│  5. PDF 출력                                                    │
│     └─ [PDF 다운로드] 또는 [인쇄]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 모드별 UI 차이

**자동 배치 모드**:
```
┌────────────────────────────────────────────┐
│ 템플릿: [4문제 ▾]        [자유 캔버스로 →] │
├────────────────────────────────────────────┤
│  ┌──────────┬──────────┐                  │
│  │ 문제 1   │ 문제 2   │   ← 자동 배치됨  │
│  ├──────────┼──────────┤                  │
│  │ 문제 3   │ [빈 슬롯]│                  │
│  └──────────┴──────────┘                  │
│                                            │
│  [← 이전 페이지] 1/1 [다음 페이지 →]       │
└────────────────────────────────────────────┘
```

**자유 캔버스 모드**:
```
┌────────────────────────────────────────────┐
│ [← 자동 배치로]   [스냅: ON] [가이드: ON]  │
├────────────────────────────────────────────┤
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐          │
│  │  ┌──────────┐               │          │
│  │  │ 문제 1 ●│←─ 리사이즈   │          │
│  │  └──────────┘               │          │
│  │       ┌──────────┐          │          │
│  │       │ 문제 2   │          │  ← A4   │
│  │       └──────────┘          │          │
│  │  ┌──────────┐               │          │
│  │  │ 문제 3   │               │          │
│  │  └──────────┘               │          │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘          │
└────────────────────────────────────────────┘
```

---

## 8. 구현 우선순위 및 단계

### Phase 1: 기본 자동 배치 (MVP)
```
1-1. 기본 템플릿 데이터 구조 정의
1-2. 4문제/6문제 프리셋 템플릿 구현
1-3. 자동 배치 알고리즘 구현
1-4. PDF 출력 (react-pdf)
```

### Phase 2: 템플릿 선택 UI
```
2-1. 템플릿 선택 드롭다운/카드
2-2. 템플릿 미리보기
2-3. 페이지 네비게이션 (다중 페이지)
```

### Phase 3: 커스텀 템플릿
```
3-1. 템플릿 에디터 UI
3-2. 그리드 설정 (열/행)
3-3. 슬롯 수동 편집
3-4. 템플릿 저장/불러오기
```

### Phase 4: 자유 캔버스
```
4-1. dnd-kit 통합
4-2. 드래그로 위치 조정
4-3. 리사이즈 핸들
4-4. 스냅 가이드라인
4-5. 모드 전환
```

---

## 9. 결론 및 권장사항

### 핵심 설계 원칙

1. **자동 배치 우선**
   - 대부분의 사용자는 표준 레이아웃으로 충분
   - 복잡한 편집 없이 빠른 결과물 제공
   - 프리셋 템플릿으로 진입 장벽 최소화

2. **점진적 복잡성**
   - 기본: 프리셋 템플릿 + 자동 배치
   - 중급: 커스텀 템플릿 생성
   - 고급: 자유 캔버스 모드

3. **실시간 미리보기**
   - 모든 변경사항 즉시 반영
   - "보이는 대로" 출력 (WYSIWYG)

4. **물리 단위 사용**
   - CSS에서 mm/cm 단위 사용
   - 화면 확대에도 인쇄 결과 일관성 보장

### 기술 스택 권장

| 영역 | 권장 기술 |
|------|----------|
| 드래그 앤 드롭 | @dnd-kit/core |
| PDF 생성 | @react-pdf/renderer |
| 상태 관리 | zustand 또는 Context API |
| 리사이즈 | react-resizable |
| 스타일링 | Tailwind CSS |

### 예상 작업량

| Phase | 예상 작업 |
|-------|----------|
| Phase 1 (MVP) | 기본 자동 배치 + PDF |
| Phase 2 | 템플릿 선택 UI |
| Phase 3 | 커스텀 템플릿 에디터 |
| Phase 4 | 자유 캔버스 |

---

## 참고 자료

- [Stack Overflow - CSS Grid in mm for printing](https://stackoverflow.com/questions/52485899/css-grid-layout-in-mm-for-printing)
- [Stack Overflow - A4 page in HTML](https://stackoverflow.com/questions/3341485/how-to-make-a-html-page-in-a4-paper-size-pages)
- [GitHub - react-pdf CSS Grid Support](https://github.com/diegomura/react-pdf/issues/1207)
- [GitHub - react-grid-layout](https://github.com/react-grid-layout/react-grid-layout)
- [Puck Editor - Top 5 DnD Libraries](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [Stack Overflow - jsPDF image fit](https://stackoverflow.com/questions/36472094/how-to-set-image-to-fit-width-of-the-page-using-jspdf)
- [MDN - CSS Grid Auto-placement](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Auto-placement_in_grid_layout)
- [Overleaf - LaTeX Exam Templates](https://www.overleaf.com/latex/templates/tagged/exam)

---

*리포트 작성: Claude Code (Opus)*
*날짜: 2025-11-28*
