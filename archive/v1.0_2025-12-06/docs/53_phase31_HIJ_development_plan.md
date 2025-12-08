# Phase 31-H/I/J: 통합 개발 계획

**작성일**: 2025-12-03
**Phase**: 31 (싱글 탭 매칭 시스템 강화)
**기반 문서**:
- [51_phase31_feature_feasibility_report.md](51_phase31_feature_feasibility_report.md)
- [52_canvas_zoom_deep_research_report.md](52_canvas_zoom_deep_research_report.md)

---

## 개요

### 구현 목표

| Phase | 기능 | 우선순위 | 예상 시간 |
|-------|------|---------|----------|
| **31-H** | 문제 정보 편집 | 1순위 (필수) | 3-4시간 |
| **31-I** | 패널 리사이즈 | 2순위 (유용) | 2-3시간 |
| **31-J** | 캔버스 줌 | 3순위 (선택) | 3-4시간 |

### 의존 관계

```
Phase 31-H (문제 정보 편집)
     ↓
Phase 31-I (패널 리사이즈) ← 독립적, 병렬 가능
     ↓
Phase 31-J (캔버스 줌) ← 독립적, 병렬 가능
```

---

## Phase 31-H: 문제 정보 편집

### 목표
ProblemListPanel에서 문제번호, 책이름, 페이지 등을 직접 수정할 수 있게 함

### 기술 설계

```
┌─────────────────────────────────────────────────────────────┐
│ ProblemListPanel                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ProblemItem (편집 모드 OFF)                          │    │
│  │  [1] 베이직쎈_공통수학1_p18        [✏️] [🗑️]       │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↓ 클릭                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ProblemItem (편집 모드 ON)                           │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 책이름: [베이직쎈          ]                 │    │    │
│  │  │ 과정:   [공통수학1         ]                 │    │    │
│  │  │ 페이지: [18] 문항번호: [1  ]                 │    │    │
│  │  │              [저장] [취소]                   │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 구현 단계

#### H-1: matchingStore 확장 (30분)
```typescript
// stores/matchingStore.ts

interface MatchingStore {
  // ... 기존 상태

  // 추가: 문제 정보 업데이트
  updateProblemInfo: (groupId: string, info: {
    problemNumber?: string;
    displayName?: string;
    bookName?: string;
    course?: string;
    page?: number;
  }) => void;
}

// 구현
updateProblemInfo: (groupId, info) => {
  set((state) => ({
    problems: state.problems.map(p =>
      p.groupId === groupId
        ? { ...p, ...info, displayName: formatDisplayName(info) }
        : p
    ),
  }));
}
```

#### H-2: ProblemEditForm 컴포넌트 생성 (1시간)
```typescript
// components/unified/ProblemEditForm.tsx

interface ProblemEditFormProps {
  problem: ProblemItem;
  onSave: (updates: Partial<ProblemItem>) => void;
  onCancel: () => void;
}

export function ProblemEditForm({ problem, onSave, onCancel }: ProblemEditFormProps) {
  const [form, setForm] = useState({
    problemNumber: problem.problemNumber,
    // displayName에서 파싱 또는 별도 저장된 값 사용
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(form);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="space-y-2 p-3 bg-blue-50 rounded-lg" onKeyDown={handleKeyDown}>
      {/* 폼 필드들 - GroupPanel 참고 */}
    </div>
  );
}
```

#### H-3: ProblemListPanel 수정 (1시간)
```typescript
// components/unified/ProblemListPanel.tsx

export function ProblemListPanel() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { problems, updateProblemInfo } = useMatchingStore();

  return (
    <div>
      {problems.map((problem) => (
        editingId === problem.groupId ? (
          <ProblemEditForm
            key={problem.groupId}
            problem={problem}
            onSave={(updates) => {
              updateProblemInfo(problem.groupId, updates);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <ProblemItem
            key={problem.groupId}
            problem={problem}
            onEdit={() => setEditingId(problem.groupId)}
          />
        )
      ))}
    </div>
  );
}
```

#### H-4: 그룹 JSON 동기화 (1시간)
```typescript
// MatchingCanvas.tsx 또는 별도 훅

// 문제 정보 변경 시 해당 페이지의 그룹 JSON도 업데이트
const syncProblemInfoToGroup = useCallback(async (
  groupId: string,
  problemInfo: ProblemInfo
) => {
  // 해당 그룹이 있는 페이지 찾기
  const problem = problems.find(p => p.groupId === groupId);
  if (!problem) return;

  // 해당 페이지 그룹 데이터 조회
  const pageGroups = await fetchPageGroups(problem.documentId, problem.pageIndex);

  // 해당 그룹의 problemInfo 업데이트
  const updatedGroups = pageGroups.map(g =>
    g.id === groupId ? { ...g, problemInfo } : g
  );

  // 저장
  await savePageGroups(problem.documentId, problem.pageIndex, updatedGroups);
}, [problems]);
```

#### H-5: 키보드 단축키 (30분)
```typescript
// E키로 선택된 문제 편집 모드 진입
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'e' || e.key === 'E') {
      if (selectedProblemId && !editingId) {
        setEditingId(selectedProblemId);
      }
    }
  };
  // ...
}, [selectedProblemId, editingId]);
```

### 체크리스트
- [ ] H-1: matchingStore.updateProblemInfo 구현
- [ ] H-2: ProblemEditForm 컴포넌트 생성
- [ ] H-3: ProblemListPanel 편집 모드 통합
- [ ] H-4: 그룹 JSON 동기화 로직
- [ ] H-5: E키 편집 단축키
- [ ] H-6: 테스트 및 버그 수정

---

## Phase 31-I: 패널 리사이즈

### 목표
오른쪽 문제 목록 패널의 너비를 드래그로 조절할 수 있게 함

### 기술 설계

```
┌─────────────────────────────────────────────────────────────┐
│ UnifiedMatchingPage                                          │
│                                                             │
│  ┌───────────────────────────────┬─┬──────────────────┐     │
│  │                               │▐│                  │     │
│  │    MatchingCanvas             │▐│ ProblemListPanel │     │
│  │    (flex-1)                   │▐│ (resizable)      │     │
│  │                               │▐│                  │     │
│  │                               │▐│                  │     │
│  └───────────────────────────────┴─┴──────────────────┘     │
│                                  ↑                          │
│                           ResizeHandle                       │
│                        (cursor: col-resize)                  │
└─────────────────────────────────────────────────────────────┘
```

### 구현 단계

#### I-1: 리사이즈 상태 관리 (20분)
```typescript
// pages/UnifiedMatchingPage.tsx

const MIN_PANEL_WIDTH = 240;  // 최소 너비
const MAX_PANEL_WIDTH = 480;  // 최대 너비
const DEFAULT_PANEL_WIDTH = 320;  // 기본 너비 (w-80)

const [panelWidth, setPanelWidth] = useState(() => {
  // localStorage에서 저장된 값 복원
  const saved = localStorage.getItem('matching-panel-width');
  return saved ? parseInt(saved, 10) : DEFAULT_PANEL_WIDTH;
});

// 너비 변경 시 저장
useEffect(() => {
  localStorage.setItem('matching-panel-width', String(panelWidth));
}, [panelWidth]);
```

#### I-2: ResizeHandle 컴포넌트 (40분)
```typescript
// components/unified/ResizeHandle.tsx

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
}

export function ResizeHandle({ onResize, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startXRef.current - moveEvent.clientX;
      startXRef.current = moveEvent.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`w-1 flex-shrink-0 cursor-col-resize transition-colors ${
        isDragging ? 'bg-blue-500' : 'bg-gray-200 hover:bg-blue-400'
      }`}
      onMouseDown={handleMouseDown}
    />
  );
}
```

#### I-3: UnifiedMatchingPage 통합 (30분)
```typescript
// pages/UnifiedMatchingPage.tsx

const handleResize = useCallback((delta: number) => {
  setPanelWidth(prev => {
    const newWidth = prev + delta;
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
  });
}, []);

return (
  <div className="flex-1 flex overflow-hidden">
    {/* 캔버스 영역 */}
    <div className="flex-1 overflow-hidden bg-white">
      <MatchingCanvas ... />
    </div>

    {/* 리사이즈 핸들 */}
    <ResizeHandle
      onResize={handleResize}
      onResizeEnd={() => {/* 저장은 useEffect에서 */}}
    />

    {/* 문제 목록 패널 - 고정 너비 대신 동적 너비 */}
    <div
      className="flex-shrink-0 border-l bg-white overflow-hidden"
      style={{ width: panelWidth }}
    >
      <ProblemListPanel />
    </div>
  </div>
);
```

#### I-4: 캔버스 리렌더링 최적화 (30분)
```typescript
// 디바운스로 잦은 리렌더링 방지
const debouncedWidth = useDebounce(panelWidth, 100);

// MatchingCanvas는 debouncedWidth 변경 시에만 리렌더
// (내부 containerRef.current.offsetWidth로 자동 조정됨)
```

### 체크리스트
- [ ] I-1: 리사이즈 상태 + localStorage 저장
- [ ] I-2: ResizeHandle 컴포넌트 생성
- [ ] I-3: UnifiedMatchingPage 레이아웃 수정
- [ ] I-4: 캔버스 리사이즈 최적화
- [ ] I-5: 더블클릭 리셋 (기본 너비로)
- [ ] I-6: 테스트 및 버그 수정

---

## Phase 31-J: 캔버스 줌

### 목표
PDF 캔버스를 확대/축소하여 세밀한 블록 선택 가능

### 기술 설계: Stage 스케일링 방식

```
┌─────────────────────────────────────────────────────────────┐
│ MatchingCanvas                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ZoomControls                                         │    │
│  │  [50%] [75%] [100%] [125%] [150%] [🔄]              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ PageCanvas (with Stage scaling)                      │    │
│  │                                                     │    │
│  │   Stage (scaleX={zoom}, scaleY={zoom})              │    │
│  │     └─ Layer                                        │    │
│  │         ├─ Image (원본 좌표)                         │    │
│  │         └─ Blocks (원본 좌표 - 변환 불필요!)          │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [zoom > 100%일 때: 스크롤/패닝 활성화]                      │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 원리

```typescript
// 기존 방식: 모든 블록 개별 계산
blocks.map(b => ({
  x: b.bbox[0] * scale * zoom,  // 매번 계산
  y: b.bbox[1] * scale * zoom,
}))

// Stage 스케일링: Stage만 한 번 스케일
<Stage scaleX={zoom} scaleY={zoom}>
  <Layer>
    {blocks.map(b => (
      <Rect x={b.bbox[0]} y={b.bbox[1]} />  // 원본 좌표 그대로!
    ))}
  </Layer>
</Stage>
```

### 구현 단계

#### J-1: 줌 상태 관리 (20분)
```typescript
// components/PageCanvas.tsx 또는 MatchingCanvas.tsx

interface ZoomState {
  scale: number;        // 1.0 = 100%
  position: { x: number; y: number };  // 패닝 위치
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

const [zoomState, setZoomState] = useState<ZoomState>({
  scale: 1,
  position: { x: 0, y: 0 }
});
```

#### J-2: ZoomControls 컴포넌트 (40분)
```typescript
// components/unified/ZoomControls.tsx

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onReset: () => void;
}

export function ZoomControls({ zoom, onZoomChange, onReset }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 p-2 bg-white border-b">
      {ZOOM_LEVELS.map((level) => (
        <button
          key={level}
          onClick={() => onZoomChange(level)}
          className={`px-2 py-1 text-xs rounded ${
            zoom === level
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {level * 100}%
        </button>
      ))}
      <button
        onClick={onReset}
        className="p-1 ml-2 hover:bg-gray-100 rounded"
        title="줌 리셋"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <span className="ml-auto text-xs text-gray-500">
        Ctrl+휠: 줌
      </span>
    </div>
  );
}
```

#### J-3: PageCanvas Stage 스케일링 수정 (1시간)
```typescript
// components/PageCanvas.tsx

export const PageCanvas = memo(function PageCanvas({
  documentId,
  pageIndex,
  blocks,
  groups,
  selectedBlocks,
  onBlockSelect,
  onGroupCreate,
  // 추가 props
  zoom = 1,
  onZoomChange,
}: PageCanvasProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // 휠 줌 핸들러
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    // Ctrl 키와 함께일 때만 줌
    if (!e.evt.ctrlKey) return;

    e.evt.preventDefault();

    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition()!;

    // 줌 방향 및 새 스케일 계산
    const scaleBy = 1.15;
    const newScale = e.evt.deltaY < 0
      ? Math.min(oldScale * scaleBy, MAX_ZOOM)
      : Math.max(oldScale / scaleBy, MIN_ZOOM);

    // 포인터 위치 기준 줌
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    onZoomChange?.(newScale);
    setPosition(newPos);
  }, [zoom, position, onZoomChange]);

  // 줌 > 100%일 때 드래그 패닝
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (zoom <= 1) return;
    setPosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, [zoom]);

  return (
    <Stage
      ref={stageRef}
      width={canvasSize.width}
      height={canvasSize.height}
      scaleX={zoom}
      scaleY={zoom}
      x={position.x}
      y={position.y}
      draggable={zoom > 1}
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
    >
      <Layer>
        {/* 이미지 - 원본 크기 */}
        <Image image={image} width={imageWidth} height={imageHeight} />

        {/* 블록 - 원본 좌표 그대로! */}
        {blocks.map((block) => {
          const [x1, y1, x2, y2] = block.bbox;
          return (
            <Rect
              key={block.block_id}
              x={x1}      // 스케일 곱셈 없음!
              y={y1}
              width={x2 - x1}
              height={y2 - y1}
              // ...
            />
          );
        })}
      </Layer>
    </Stage>
  );
});
```

#### J-4: 클릭 좌표 변환 (40분)
```typescript
// Stage 스케일링 사용 시 클릭 좌표 변환

const handleBlockClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
  const stage = e.target.getStage();
  if (!stage) return;

  // Stage의 getPointerPosition()은 스케일/패닝 적용 전 좌표
  const pointer = stage.getPointerPosition()!;

  // 실제 이미지 좌표로 변환
  const imageX = (pointer.x - position.x) / zoom;
  const imageY = (pointer.y - position.y) / zoom;

  // 블록 충돌 검사
  const clickedBlock = blocks.find(block => {
    const [x1, y1, x2, y2] = block.bbox;
    return imageX >= x1 && imageX <= x2 && imageY >= y1 && imageY <= y2;
  });

  if (clickedBlock) {
    onBlockSelect(clickedBlock.block_id, e.evt.ctrlKey);
  }
}, [blocks, zoom, position, onBlockSelect]);
```

#### J-5: 드래그 선택 좌표 변환 (40분)
```typescript
// 드래그 영역도 동일하게 변환

const handleDragSelect = useCallback(() => {
  if (!dragStart || !dragEnd) return;

  // 화면 좌표 → 이미지 좌표 변환
  const startImg = {
    x: (dragStart.x - position.x) / zoom,
    y: (dragStart.y - position.y) / zoom,
  };
  const endImg = {
    x: (dragEnd.x - position.x) / zoom,
    y: (dragEnd.y - position.y) / zoom,
  };

  const selectionRect = {
    x1: Math.min(startImg.x, endImg.x),
    y1: Math.min(startImg.y, endImg.y),
    x2: Math.max(startImg.x, endImg.x),
    y2: Math.max(startImg.y, endImg.y),
  };

  // 원본 좌표 기준으로 충돌 검사
  const selectedBlockIds = blocks
    .filter(block => isRectOverlap(selectionRect, {
      x1: block.bbox[0],
      y1: block.bbox[1],
      x2: block.bbox[2],
      y2: block.bbox[3],
    }))
    .map(b => b.block_id);

  // ...
}, [dragStart, dragEnd, zoom, position, blocks]);
```

#### J-6: 줌 리셋 및 키보드 단축키 (20분)
```typescript
// 더블클릭 또는 버튼으로 줌 리셋
const resetZoom = useCallback(() => {
  setZoomState({ scale: 1, position: { x: 0, y: 0 } });
}, []);

// 키보드 단축키
// Ctrl++ : 줌 인
// Ctrl+- : 줌 아웃
// Ctrl+0 : 줌 리셋
```

### 체크리스트
- [ ] J-1: 줌 상태 관리 (scale, position)
- [ ] J-2: ZoomControls UI 컴포넌트
- [ ] J-3: PageCanvas Stage 스케일링 적용
- [ ] J-4: 클릭 좌표 변환 로직
- [ ] J-5: 드래그 선택 좌표 변환
- [ ] J-6: 줌 리셋 + 키보드 단축키
- [ ] J-7: 페이지/탭 전환 시 줌 리셋
- [ ] J-8: 테스트 및 버그 수정

---

## 전체 구현 순서

```
Day 1: Phase 31-H (문제 정보 편집)
├─ H-1 ~ H-3: 기본 편집 UI (2시간)
├─ H-4: 그룹 JSON 동기화 (1시간)
└─ H-5 ~ H-6: 단축키 및 테스트 (1시간)

Day 2: Phase 31-I (패널 리사이즈)
├─ I-1 ~ I-2: 리사이즈 핸들 (1시간)
├─ I-3 ~ I-4: 레이아웃 통합 (1시간)
└─ I-5 ~ I-6: 마무리 (0.5시간)

Day 2~3: Phase 31-J (캔버스 줌) - 선택
├─ J-1 ~ J-2: 줌 UI (1시간)
├─ J-3: Stage 스케일링 (1시간)
├─ J-4 ~ J-5: 좌표 변환 (1.5시간)
└─ J-6 ~ J-8: 마무리 (0.5시간)
```

---

## 수정 대상 파일

| 파일 | Phase H | Phase I | Phase J |
|------|---------|---------|---------|
| `stores/matchingStore.ts` | ✅ 수정 | - | - |
| `components/unified/ProblemListPanel.tsx` | ✅ 수정 | - | - |
| `components/unified/ProblemEditForm.tsx` | ✅ 신규 | - | - |
| `components/unified/ResizeHandle.tsx` | - | ✅ 신규 | - |
| `components/unified/ZoomControls.tsx` | - | - | ✅ 신규 |
| `pages/UnifiedMatchingPage.tsx` | - | ✅ 수정 | - |
| `components/PageCanvas.tsx` | - | - | ✅ 수정 |
| `components/unified/MatchingCanvas.tsx` | ⚠️ 연동 | - | ✅ 수정 |

---

## 테스트 시나리오

### Phase 31-H 테스트
1. 문제 아이템 클릭 → 편집 모드 진입
2. 문제번호 수정 → Enter → 저장 확인
3. ESC로 취소 → 원래 값 유지
4. E키로 선택된 문제 편집 모드 진입
5. 저장 후 그룹 JSON 동기화 확인

### Phase 31-I 테스트
1. 리사이즈 핸들 드래그 → 패널 너비 변경
2. 최소/최대 너비 제한 확인
3. 새로고침 후 너비 복원 확인
4. 더블클릭으로 기본 너비 복원

### Phase 31-J 테스트
1. 줌 버튼 클릭 → 스케일 변경
2. Ctrl+휠 → 포인터 기준 줌
3. 줌 > 100%에서 드래그 패닝
4. 블록 클릭 정확도 (좌표 변환)
5. 드래그 선택 정확도
6. 페이지 전환 시 줌 리셋

---

## 위험 요소 및 대응

| 위험 | 확률 | 대응 |
|------|------|------|
| 그룹 JSON 동기화 실패 | 중간 | 비동기 저장 + 재시도 로직 |
| 리사이즈 시 캔버스 깜빡임 | 낮음 | 디바운스 + CSS transition |
| 줌 시 좌표 변환 오류 | 중간 | 단위 테스트 + 시각적 디버깅 |
| 성능 저하 (큰 줌) | 낮음 | 이미지 캐싱 + 레이어 최적화 |

---

*계획 끝*
