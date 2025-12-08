# 캔버스 줌 시스템: 심층 연구 리포트

**작성일**: 2025-12-03
**Phase**: 31 연구
**분석자**: Claude (opus thinkharder)
**요청**: 캔버스 줌 구현 시 좌표 계산 방식 및 성능 최적화 연구

---

## 연구 배경

### 사용자 제안
> "블록을 그때그때 계산하는게 아니라 백엔드에서 이미 계산은 다하고, 선택을 할때는 계산한걸 보여줘서 블록들을 선택만 하는 형식은 어떨까"

이 제안의 핵심:
1. **프론트엔드 실시간 계산** → **백엔드 사전 계산**으로 전환
2. 렌더링/속도 개선 기대
3. 클라이언트 부담 감소

---

## 1. 업계 표준 분석

### 1.1 주요 이미지 라벨링 도구들의 접근법

| 도구 | 좌표 시스템 | 줌 처리 방식 |
|------|------------|-------------|
| **[Label Studio](https://labelstud.io/)** | 정규화 좌표 (0-100%) | 클라이언트 실시간 변환 |
| **[CVAT](https://www.cvat.ai/)** | 절대 픽셀 + 내보내기 시 변환 | 클라이언트 캔버스 스케일링 |
| **[Roboflow](https://docs.roboflow.com/)** | 정규화 좌표 | 줌 잠금 + 퍼센트 기반 |
| **[VGG Image Annotator](https://gitlab.com/vgg/via)** | 정규화 좌표 요청됨 | 클라이언트 변환 |
| **[Supervisely](https://docs.supervisely.com/)** | 절대 + 정규화 둘 다 | 클라이언트 변환 |

### 1.2 핵심 발견: 정규화 좌표 시스템

**정규화 좌표 (Normalized Coordinates)란?**

```
절대 좌표: bbox = [150px, 200px, 300px, 400px]  // 이미지 크기 의존
정규화 좌표: bbox = [0.15, 0.20, 0.30, 0.40]   // 0~1 비율, 크기 무관
```

**[Label Studio 방식](https://labelstud.io/guide/export)**:
```json
{
  "x": 50,      // 이미지 너비의 50% 위치
  "y": 60,      // 이미지 높이의 60% 위치
  "width": 10,  // 이미지 너비의 10%
  "height": 20  // 이미지 높이의 20%
}
```

**장점**:
- 줌에 **완전히 독립적** - 계산 불필요
- 이미지 리사이즈해도 좌표 유효
- 저장/전송 용량 최소화

### 1.3 YOLO/TensorFlow 포맷 비교

| 포맷 | 표현 방식 | 정규화 | 출처 |
|------|----------|--------|------|
| **YOLO** | (center_x, center_y, w, h) | ✅ 0~1 | [ultralytics](https://github.com/ultralytics/yolov3/issues/1543) |
| **Pascal VOC** | (x_min, y_min, x_max, y_max) | ❌ 픽셀 | [learnml.io](https://www.learnml.io/posts/a-guide-to-bounding-box-formats/) |
| **COCO** | (x_min, y_min, w, h) | ❌ 픽셀 | [nanonets](https://nanonets.com/blog/image-processing-and-bounding-boxes-for-ocr/) |
| **albumentations** | (x_min, y_min, x_max, y_max) | ✅ 0~1 | [bboxconverter](https://bboxconverter.readthedocs.io/en/latest/explanation/bounding_box_ultimate_guide.html) |

---

## 2. 기술적 접근법 분석

### 2.1 접근법 A: 실시간 클라이언트 변환 (현재 방식)

```typescript
// 현재 PageCanvas.tsx 방식
const scale = containerWidth / image.width;  // 매 렌더마다 계산

// 블록 렌더링
{blocks.map((block) => {
  const [x1, y1, x2, y2] = block.bbox;  // 절대 픽셀 좌표
  return (
    <Rect
      x={x1 * scale}      // 매번 곱셈
      y={y1 * scale}
      width={(x2 - x1) * scale}
      height={(y2 - y1) * scale}
    />
  );
})}
```

**장점**:
- 구현 단순
- 백엔드 수정 불필요

**단점**:
- 줌 시 모든 블록 재계산 (O(n) 곱셈)
- 클릭 시 역변환 필요 (screen → image 좌표)

### 2.2 접근법 B: 정규화 좌표 + CSS Transform (권장)

```typescript
// 블록을 0~1 정규화 좌표로 저장
const normalizedBlocks = blocks.map(b => ({
  ...b,
  normBbox: [
    b.bbox[0] / imageWidth,
    b.bbox[1] / imageHeight,
    b.bbox[2] / imageWidth,
    b.bbox[3] / imageHeight,
  ]
}));

// 렌더링: 100% 기준으로 배치 후 CSS transform으로 스케일
<div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
  {normalizedBlocks.map((block) => (
    <div
      style={{
        position: 'absolute',
        left: `${block.normBbox[0] * 100}%`,
        top: `${block.normBbox[1] * 100}%`,
        width: `${(block.normBbox[2] - block.normBbox[0]) * 100}%`,
        height: `${(block.normBbox[3] - block.normBbox[1]) * 100}%`,
      }}
    />
  ))}
</div>
```

**장점**:
- 줌 변경 시 **재계산 불필요**
- GPU 가속 (CSS transform)
- 클릭 좌표 변환 단순화

**단점**:
- Konva 대신 DOM 기반 필요
- 초기 마이그레이션 필요

### 2.3 접근법 C: 백엔드 사전 계산 + 타일링 (사용자 제안)

```
┌─────────────────────────────────────────────────────────────┐
│ 백엔드 (Python)                                              │
│                                                             │
│  PDF 페이지 로드                                             │
│       ↓                                                     │
│  블록 검출 (density_analyzer.py)                            │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 사전 계산 & 캐싱                                      │    │
│  │  - 줌 50%용 좌표: [(75, 100, 150, 200), ...]        │    │
│  │  - 줌 100%용 좌표: [(150, 200, 300, 400), ...]      │    │
│  │  - 줌 150%용 좌표: [(225, 300, 450, 600), ...]      │    │
│  │  - 정규화 좌표: [(0.15, 0.2, 0.3, 0.4), ...]        │    │
│  └─────────────────────────────────────────────────────┘    │
│       ↓                                                     │
│  JSON 응답                                                  │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ 프론트엔드 (React)                                           │
│                                                             │
│  줌 레벨 선택 (50%, 100%, 150%)                              │
│       ↓                                                     │
│  해당 줌용 사전 계산 좌표 사용                                │
│       ↓                                                     │
│  블록 직접 렌더링 (계산 없음!)                               │
└─────────────────────────────────────────────────────────────┘
```

**장점**:
- 프론트엔드 계산 **완전 제거**
- 서버 캐싱으로 반복 요청 빠름
- 복잡한 변환 로직 서버에 집중

**단점**:
- 줌 레벨별 데이터 전송량 증가
- 연속 줌 (슬라이더) 불가 → 고정 레벨만
- 네트워크 왕복 지연
- 백엔드 API 변경 필요

### 2.4 접근법 D: 타일 기반 렌더링 (지도 시스템 방식)

**[OpenStreetMap 방식](https://stackoverflow.com/questions/51358533/)**:

```
┌─────────────────────────────────────────────────────────────┐
│ 타일 시스템                                                  │
│                                                             │
│  원본 이미지 (3000x4000px)                                   │
│       ↓                                                     │
│  줌 레벨별 타일 생성:                                        │
│    Level 1: 1개 타일 (750x1000)                             │
│    Level 2: 4개 타일 (1500x2000 / 4)                        │
│    Level 3: 16개 타일 (3000x4000 / 16)                      │
│       ↓                                                     │
│  필요한 타일만 로드 (Lazy Loading)                           │
│       ↓                                                     │
│  블록은 타일 좌표 기준으로 매핑                              │
└─────────────────────────────────────────────────────────────┘
```

**장점**:
- 초고해상도 이미지 지원
- 필요한 영역만 로드
- 메모리 효율적

**단점**:
- 구현 복잡도 매우 높음
- PDF 페이지에는 과도한 엔지니어링
- 블록-타일 매핑 복잡

---

## 3. Konva.js 성능 최적화 가이드

### 3.1 공식 권장사항 ([Konva Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html))

| 최적화 | 설명 | 적용 가능성 |
|--------|------|------------|
| `layer.listening(false)` | 이벤트 리스닝 비활성화 | ⚠️ 블록 선택 필요 |
| `shape.perfectDrawEnabled(false)` | 완벽한 드로잉 비활성화 | ✅ 즉시 적용 가능 |
| `Konva.pixelRatio = 1` | Retina 스케일링 비활성화 | ⚠️ 선명도 감소 |
| 레이어 최소화 | 3-5개 이내 | ✅ 현재 1개 |
| 캐싱 | 자주 변경되지 않는 요소 | ✅ 이미지, 그룹 |

### 3.2 줌 구현 패턴 ([react-konva 줌 가이드](https://colinwren.medium.com/adding-zoom-and-panning-to-your-react-konva-stage-3e0a38c31d38))

```typescript
// Stage 스케일링 방식 (권장)
<Stage
  scaleX={zoom}
  scaleY={zoom}
  x={panX}
  y={panY}
  onWheel={(e) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const newScale = e.evt.deltaY < 0
      ? oldScale * scaleBy
      : oldScale / scaleBy;

    // 포인터 위치 기준 줌
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    setZoom(newScale);
    setPanX(pointer.x - mousePointTo.x * newScale);
    setPanY(pointer.y - mousePointTo.y * newScale);
  }}
>
```

**핵심**: Stage 전체를 스케일링하면 **개별 블록 좌표 재계산 불필요**

### 3.3 고해상도 이미지 성능 문제 ([Stack Overflow](https://stackoverflow.com/questions/71936224/))

**문제**: 고해상도 이미지 드래그/줌 시 성능 저하

**해결책**:
1. 이미지 캐싱: `image.cache()`
2. 스트로크/그림자 비활성화
3. 저해상도 썸네일로 조작 → 완료 시 고해상도 렌더링

---

## 4. PDF.js 줌 아키텍처 분석

### 4.1 Viewport 시스템 ([PDF.js Examples](https://mozilla.github.io/pdf.js/examples/))

```javascript
// PDF.js의 접근법
const viewport = page.getViewport({ scale: 1.0 });

// 스케일 변경 시 새 뷰포트 생성
const scaledViewport = page.getViewport({ scale: zoom });

// 렌더링
page.render({
  canvasContext: ctx,
  viewport: scaledViewport,
  transform: [outputScale, 0, 0, outputScale, 0, 0]
});
```

**특징**:
- 줌마다 **전체 재렌더링** 필요
- 초기 변환 행렬이 좌표계 자동 처리
- 고DPI 화면 지원 내장

### 4.2 핀치 줌 최적화 ([Pinch Zoom Gist](https://gist.github.com/larsneo/bb75616e9426ae589f50e8c8411020f6))

```javascript
// 최적화 패턴: 줌 중에는 변환만, 완료 시 렌더링
onPinchStart() {
  // CSS transform으로 임시 스케일
  this.container.style.transform = `scale(${pendingZoom})`;
}

onPinchEnd() {
  // 실제 렌더링은 완료 시에만
  this.render(finalZoom);
  this.container.style.transform = '';
}
```

---

## 5. 대안 비교 매트릭스

| 접근법 | 구현 난이도 | 성능 | 유연성 | 백엔드 변경 | 권장도 |
|--------|-----------|------|--------|------------|--------|
| A: 현재 방식 (실시간 계산) | ⭐ 완료 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 불필요 | - |
| B: 정규화 좌표 + CSS | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 불필요 | ⭐⭐⭐⭐ |
| C: 백엔드 사전 계산 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 필요 | ⭐⭐ |
| D: 타일 시스템 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 대폭 필요 | ⭐ |
| E: Stage 스케일링 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 불필요 | ⭐⭐⭐⭐⭐ |

---

## 6. 권장 솔루션: Stage 스케일링 + 최적화

### 6.1 왜 이 방식인가?

**사용자 제안 분석**:
> "백엔드에서 이미 계산은 다하고"

이 아이디어의 본질은 **"프론트엔드 계산 부담 제거"**입니다.

**핵심 통찰**:
Stage 스케일링을 사용하면 **백엔드 변경 없이** 동일한 효과를 얻을 수 있습니다.

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 스케일링의 원리                                        │
│                                                             │
│  Stage (scaleX=2, scaleY=2)                                 │
│    └─ Layer                                                 │
│        ├─ Image (원본 좌표 그대로)                           │
│        └─ Blocks (원본 좌표 그대로!)                         │
│                                                             │
│  → Stage 전체가 2배로 확대되므로                             │
│    개별 블록 좌표 계산이 필요 없음!                          │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 구현 설계

```typescript
// MatchingCanvas.tsx 수정안

interface ZoomState {
  scale: number;
  position: { x: number; y: number };
}

const [zoomState, setZoomState] = useState<ZoomState>({
  scale: 1,
  position: { x: 0, y: 0 }
});

// 휠 줌 핸들러
const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
  e.evt.preventDefault();

  const stage = e.target.getStage();
  if (!stage) return;

  const oldScale = zoomState.scale;
  const pointer = stage.getPointerPosition()!;

  // 줌 방향 결정
  const direction = e.evt.deltaY > 0 ? -1 : 1;
  const scaleBy = 1.15;
  const newScale = direction > 0
    ? Math.min(oldScale * scaleBy, 3)   // 최대 300%
    : Math.max(oldScale / scaleBy, 0.5); // 최소 50%

  // 포인터 위치 기준 줌
  const mousePointTo = {
    x: (pointer.x - zoomState.position.x) / oldScale,
    y: (pointer.y - zoomState.position.y) / oldScale,
  };

  setZoomState({
    scale: newScale,
    position: {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }
  });
}, [zoomState]);

// Stage 렌더링
<Stage
  width={containerWidth}
  height={containerHeight}
  scaleX={zoomState.scale}
  scaleY={zoomState.scale}
  x={zoomState.position.x}
  y={zoomState.position.y}
  onWheel={handleWheel}
  draggable={zoomState.scale > 1}  // 줌 시 패닝 활성화
>
  <Layer>
    <Image image={image} />

    {/* 블록은 원본 좌표 그대로! 변환 불필요! */}
    {blocks.map((block) => {
      const [x1, y1, x2, y2] = block.bbox;
      return (
        <Rect
          x={x1}      // 곱셈 없음!
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
        />
      );
    })}
  </Layer>
</Stage>
```

### 6.3 클릭 좌표 변환

```typescript
// Stage 스케일링 사용 시 좌표 변환이 자동화됨
const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
  const stage = e.target.getStage();
  if (!stage) return;

  // getPointerPosition()은 Stage 좌표계 기준
  // 스케일/패닝이 이미 적용된 좌표 반환
  const pos = stage.getPointerPosition();

  // 원본 이미지 좌표로 변환
  const imageX = (pos.x - zoomState.position.x) / zoomState.scale;
  const imageY = (pos.y - zoomState.position.y) / zoomState.scale;

  // 이 좌표로 블록 충돌 검사
};
```

### 6.4 성능 최적화 체크리스트

```typescript
// 1. 이미지 캐싱
useEffect(() => {
  if (image) {
    const konvaImage = imageRef.current;
    konvaImage?.cache();
  }
}, [image]);

// 2. 블록 레이어 이벤트 최적화
<Layer listening={true}>
  {blocks.map((block) => (
    <Rect
      perfectDrawEnabled={false}  // 성능 향상
      shadowForStrokeEnabled={false}
    />
  ))}
</Layer>

// 3. 휠 이벤트 쓰로틀링 (이미 적용됨)
// requestAnimationFrame 기반 업데이트
```

---

## 7. 결론 및 권장사항

### 7.1 사용자 제안에 대한 평가

| 측면 | 백엔드 사전 계산 | Stage 스케일링 |
|------|-----------------|---------------|
| 프론트 계산 부담 | ✅ 제거 | ✅ 제거 |
| 구현 복잡도 | 높음 (API 변경) | 낮음 (프론트만) |
| 네트워크 비용 | 증가 | 동일 |
| 줌 유연성 | 제한적 (고정 레벨) | 연속 줌 가능 |
| 유지보수 | 백엔드+프론트 | 프론트만 |

**결론**: 사용자의 핵심 아이디어(계산 부담 제거)는 **Stage 스케일링**으로 더 효과적으로 달성 가능

### 7.2 최종 권장안

```
1순위: Stage 스케일링 (접근법 E)
  - 백엔드 변경 없음
  - 블록 좌표 계산 완전 제거
  - 연속 줌 지원
  - 예상 구현 시간: 3-4시간

2순위 (향후): 정규화 좌표 시스템 도입 (접근법 B)
  - 백엔드에서 0~1 정규화 좌표 함께 반환
  - 다양한 해상도/디스플레이 지원 강화
  - 내보내기 호환성 향상 (YOLO, COCO 등)
```

### 7.3 구현 로드맵

```
Phase 31-J: 캔버스 줌 (Stage 스케일링)
├─ J-1: 줌 상태 관리 (scale, position)
├─ J-2: 휠 줌 핸들러 구현
├─ J-3: 줌 UI 컨트롤 (50%, 100%, 150%, 200%)
├─ J-4: 패닝 (드래그로 이동)
├─ J-5: 줌 리셋 (더블클릭 or 버튼)
└─ J-6: 클릭 좌표 변환 테스트
```

---

## 참고 자료

- [Konva.js Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Adding Zoom to react-konva](https://colinwren.medium.com/adding-zoom-and-panning-to-your-react-konva-stage-3e0a38c31d38)
- [Label Studio Export Format](https://labelstud.io/guide/export)
- [Bounding Box Format Guide](https://www.learnml.io/posts/a-guide-to-bounding-box-formats/)
- [PDF.js Viewport](https://mozilla.github.io/pdf.js/examples/)
- [Konva Large Canvas Scrolling](https://konvajs.org/docs/sandbox/Canvas_Scrolling.html)
- [CVAT vs Label Studio](https://www.cvat.ai/resources/blog/cvat-or-label-studio-which-one-to-choose)
- [Normalized Coordinates Guide](https://paulxiong.medium.com/how-to-normalized-coordinates-of-the-bounding-box-ymin-xmin-ymax-xmax-for-tfds-tensorflow-5f7fcafc149d)

---

*리포트 끝*
