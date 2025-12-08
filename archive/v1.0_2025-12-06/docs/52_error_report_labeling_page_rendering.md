# 라벨링 페이지 렌더링 오류 분석 리포트

**작성일**: 2025-12-02
**Phase**: 21.8 (Bug Analysis)
**심각도**: Medium-High
**영향 범위**: 라벨링 작업 페이지의 특정 페이지 렌더링

---

## 1. 문제 요약

### 증상
- 라벨링 작업 중 특정 페이지(예: 13페이지)에서 렌더링이 깨지는 현상
- 정상 페이지(예: 12페이지)와 비정상 페이지(13페이지) 간 차이 발생
- 블록/그룹 오버레이가 비정상적으로 표시되거나 이미지가 제대로 로드되지 않음

### 발생 조건
- PDF 문서 업로드 후 라벨링 페이지로 이동
- 페이지 간 네비게이션 시 특정 페이지에서 발생
- 동일 문서 내에서도 일부 페이지만 영향받음

---

## 2. 시스템 아키텍처 분석

### 관련 컴포넌트
```
LabelingPage.tsx
    └── PageViewer.tsx (메인 뷰어)
        ├── PageCanvas.tsx (Konva 캔버스 - 이미지/블록/그룹 렌더링)
        ├── PageNavigation.tsx (페이지 이동)
        └── GroupPanel.tsx (그룹 관리)
```

### 데이터 흐름
```
1. API 호출: GET /api/blocks/documents/{doc_id}/pages/{page_index}
   → 블록 데이터 (bbox, column, pixel_density)

2. API 호출: GET /api/blocks/documents/{doc_id}/pages/{page_index}/image
   → 페이지 이미지 (WebP/PNG)

3. 프론트엔드 렌더링:
   - 이미지 로드 → 캔버스 크기 계산
   - 블록 오버레이 렌더링 (scale 적용)
   - 그룹 bounding box 계산 및 렌더링
```

---

## 3. 잠재적 원인 분석

### 3.1 이미지 로딩 문제 (가능성: 높음)

**위치**: [PageCanvas.tsx:95-168](frontend/src/components/PageCanvas.tsx#L95-L168)

```typescript
// Phase 14-3: 점진적 이미지 로딩 (썸네일 → 원본)
useEffect(() => {
  setImage(null);
  setIsLoadingFull(false);

  // 1단계: 썸네일 먼저 로드
  const thumbImg = new window.Image();
  thumbImg.crossOrigin = 'anonymous';
  thumbImg.src = api.getPageImageUrl(documentId, pageIndex, 'thumb');

  thumbImg.onload = () => {
    if (isLoadingFull) return;  // ⚠️ 레이스 컨디션 가능성
    setImage(thumbImg);
    // ...캔버스 크기 조정

    // 2단계: 원본 이미지 로드
    setIsLoadingFull(true);
    const fullImg = new window.Image();
    // ...
  };
}, [documentId, pageIndex]);
```

**문제점**:
1. **레이스 컨디션**: 썸네일과 원본 이미지 로딩 순서가 보장되지 않음
2. **클린업 미흡**: `useEffect` 정리 함수에서 진행 중인 이미지 로드를 취소하지 않음
3. **상태 불일치**: 빠른 페이지 전환 시 이전 페이지의 이미지 로드 콜백이 현재 페이지에 영향

**예상 증상**:
- 이미지가 표시되지 않거나 잘못된 이미지 표시
- 캔버스 크기가 0이 되어 블록이 보이지 않음
- 이전 페이지 이미지가 현재 페이지에 표시

---

### 3.2 스케일 계산 오류 (가능성: 높음)

**위치**: [PageCanvas.tsx:292](frontend/src/components/PageCanvas.tsx#L292)

```typescript
const scale = image ? canvasSize.width / image.width : 1;
```

**문제점**:
1. `image.width`가 0인 경우 `Infinity` 발생
2. `canvasSize.width`가 0인 경우 scale이 0이 되어 모든 블록이 원점에 렌더링
3. 이미지 로드 전 블록 렌더링 시 잘못된 스케일 적용

**블록 렌더링에 미치는 영향**:
```typescript
// PageCanvas.tsx:341-346
<Rect
  x={x1 * scale}        // scale이 잘못되면 위치 오류
  y={y1 * scale}
  width={(x2 - x1) * scale}  // 크기가 0이 되거나 비정상
  height={(y2 - y1) * scale}
  ...
/>
```

---

### 3.3 블록 데이터 문제 (가능성: 중간)

**위치**: [blocks.py:36-70](backend/app/routers/blocks.py#L36-L70)

**가능한 문제**:
1. **블록 JSON 파일 손상**: `page_XXXX_blocks.json` 파일의 데이터 손상
2. **잘못된 bbox 좌표**:
   - 음수 좌표
   - 이미지 크기를 초과하는 좌표
   - x1 > x2 또는 y1 > y2인 경우
3. **블록 데이터 미생성**: PDF 분석 과정에서 특정 페이지 처리 실패

**확인 방법**:
```bash
# 문제 페이지의 블록 데이터 확인
cat dataset_root/{document_id}/blocks/page_0012_blocks.json | python -m json.tool
```

---

### 3.4 그룹 렌더링 문제 (가능성: 중간)

**위치**: [PageCanvas.tsx:40-67, 358-410](frontend/src/components/PageCanvas.tsx#L40-L67)

```typescript
function calculateGroupBoundingBox(
  group: ProblemGroup,
  blocks: Block[],
  scale: number
): { x: number; y: number; width: number; height: number } | null {
  const groupBlocks = blocks.filter((b) => group.block_ids.includes(b.block_id));
  if (groupBlocks.length === 0) return null;  // ⚠️ 블록 ID 불일치 시 null 반환
  // ...
}
```

**문제점**:
1. **Block ID 불일치**: 그룹에 저장된 `block_ids`가 현재 페이지의 블록 ID와 맞지 않음
2. **잘못된 그룹 파일**: `page_XXXX_groups.json`에 다른 페이지의 그룹 데이터 저장
3. **라벨 위치 계산 오류**: bounding box 외부에 라벨이 위치하여 보이지 않음

---

### 3.5 React 상태 관리 문제 (가능성: 중간)

**위치**: [PageViewer.tsx:35-44, 132-171](frontend/src/pages/PageViewer.tsx#L35-L44)

```typescript
const [currentPage, setCurrentPage] = useState(0);
const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);

// 그룹 데이터 동기화
useEffect(() => {
  if (groupsData) {
    setLocalGroups(groupsData.groups || []);
  }
}, [groupsData]);

// 페이지 변경 시 선택 초기화
useEffect(() => {
  setSelectedBlocks([]);
}, [currentPage]);
```

**문제점**:
1. **Stale Closure**: 디바운스 저장 시 이전 페이지에 저장되는 문제 (Phase 11-3에서 일부 해결)
2. **상태 동기화 지연**: React Query 캐시와 로컬 상태 간 동기화 타이밍 이슈
3. **잘못된 캐시**: 페이지 전환 시 이전 페이지의 캐시된 데이터가 잠시 표시

---

## 4. 진단 방법

### 4.1 브라우저 개발자 도구 확인

1. **Network 탭**:
   - 블록 API 응답 확인: `/api/blocks/documents/{doc_id}/pages/12` vs `/pages/13`
   - 이미지 로드 상태 확인: 404, 500 에러 여부
   - 응답 데이터 비교

2. **Console 탭**:
   - 이미지 로딩 에러 메시지
   - `[Phase 14-3]` 로그 확인
   - `[SaveGroups]`, `[Debounce]` 로그로 저장 타이밍 확인

3. **React DevTools**:
   - `PageCanvas` 컴포넌트의 props 확인
   - `image`, `canvasSize`, `blocks`, `groups` 상태 확인

### 4.2 백엔드 데이터 확인

```bash
# 문제 페이지의 블록 데이터 확인
ls -la dataset_root/{document_id}/blocks/

# 블록 JSON 유효성 검사
python -c "import json; json.load(open('dataset_root/{document_id}/blocks/page_0012_blocks.json'))"

# 이미지 파일 존재 확인
ls -la dataset_root/{document_id}/pages/
```

### 4.3 API 직접 호출 테스트

```bash
# 정상 페이지 vs 문제 페이지 비교
curl http://localhost:8000/api/blocks/documents/{doc_id}/pages/12 | jq '.blocks | length'
curl http://localhost:8000/api/blocks/documents/{doc_id}/pages/13 | jq '.blocks | length'

# 이미지 응답 확인
curl -I http://localhost:8000/api/blocks/documents/{doc_id}/pages/13/image
```

---

## 5. 해결 방안 (우선순위순)

### 5.1 이미지 로딩 안정화 (Priority: High)

**변경 파일**: `frontend/src/components/PageCanvas.tsx`

```typescript
useEffect(() => {
  // 취소 플래그
  let cancelled = false;

  setImage(null);
  setIsLoadingFull(false);

  const loadImages = async () => {
    // 썸네일 로드
    const thumbImg = new window.Image();
    thumbImg.crossOrigin = 'anonymous';
    thumbImg.src = api.getPageImageUrl(documentId, pageIndex, 'thumb');

    thumbImg.onload = () => {
      if (cancelled) return;  // 취소된 경우 무시
      setImage(thumbImg);
      updateCanvasSize(thumbImg);

      // 원본 로드
      const fullImg = new window.Image();
      fullImg.crossOrigin = 'anonymous';
      fullImg.src = api.getPageImageUrl(documentId, pageIndex, 'full');

      fullImg.onload = () => {
        if (cancelled) return;
        setImage(fullImg);
        updateCanvasSize(fullImg);
      };
    };
  };

  loadImages();

  // 정리 함수
  return () => {
    cancelled = true;
  };
}, [documentId, pageIndex]);
```

### 5.2 스케일 계산 안전 장치 (Priority: High)

```typescript
// 안전한 스케일 계산
const scale = useMemo(() => {
  if (!image || image.width === 0 || canvasSize.width === 0) {
    return 1;  // 기본값 반환
  }
  return canvasSize.width / image.width;
}, [image, canvasSize.width]);

// 이미지 로드 전 렌더링 방지
if (!image) {
  return <LoadingPlaceholder />;
}
```

### 5.3 블록 데이터 유효성 검사 (Priority: Medium)

```typescript
// 블록 유효성 검사
const validBlocks = useMemo(() => {
  return blocks.filter(block => {
    const [x1, y1, x2, y2] = block.bbox;
    return (
      x1 >= 0 && y1 >= 0 &&
      x2 > x1 && y2 > y1 &&
      x2 <= (image?.width || Infinity) &&
      y2 <= (image?.height || Infinity)
    );
  });
}, [blocks, image]);
```

### 5.4 에러 바운더리 추가 (Priority: Medium)

```typescript
// PageCanvas를 ErrorBoundary로 감싸기
<ErrorBoundary fallback={<PageCanvasError pageIndex={pageIndex} />}>
  <PageCanvas {...props} />
</ErrorBoundary>
```

---

## 6. 즉시 확인 필요 사항

1. **스크린샷 상세 분석**:
   - 12페이지와 13페이지의 정확한 차이점
   - 이미지가 안 보이는지 vs 블록이 잘못 표시되는지
   - 그룹 라벨의 위치 문제인지

2. **브라우저 콘솔 로그**:
   - 페이지 전환 시 출력되는 로그
   - 에러 메시지 유무

3. **Network 탭 확인**:
   - 13페이지 API 응답 상태
   - 이미지 로드 성공 여부

4. **문제 페이지 JSON 확인**:
   - `page_0012_blocks.json` vs `page_0013_blocks.json` 비교

---

## 7. 예방 조치

### 7.1 개발 환경 디버그 도구

```typescript
// PageCanvas에 디버그 모드 추가
{process.env.NODE_ENV === 'development' && (
  <div className="absolute top-0 left-0 bg-black/50 text-white text-xs p-1">
    Page: {pageIndex} |
    Scale: {scale.toFixed(2)} |
    Blocks: {blocks.length} |
    Groups: {groups.length} |
    Image: {image ? `${image.width}x${image.height}` : 'loading'}
  </div>
)}
```

### 7.2 단위 테스트 추가

```typescript
describe('PageCanvas', () => {
  it('handles empty blocks gracefully', () => {
    render(<PageCanvas blocks={[]} groups={[]} ... />);
    expect(screen.queryByTestId('block-rect')).not.toBeInTheDocument();
  });

  it('handles invalid bbox coordinates', () => {
    const invalidBlock = { block_id: 1, bbox: [-10, -10, 0, 0], ... };
    render(<PageCanvas blocks={[invalidBlock]} ... />);
    // 에러 없이 렌더링되어야 함
  });
});
```

---

## 8. 결론

라벨링 페이지 렌더링 오류는 **복합적인 원인**으로 발생할 가능성이 높습니다:

1. **가장 유력한 원인**: 이미지 로딩 레이스 컨디션 및 스케일 계산 오류
2. **확인 필요**: 특정 페이지의 블록 데이터 무결성
3. **권장 조치**: 이미지 로딩 안정화 및 디버그 정보 표시 추가

사용자의 스크린샷과 콘솔 로그를 확인한 후, 정확한 원인을 파악하고 해결책을 적용할 수 있습니다.

---

## 9. 수정 내역 (Phase 21.8)

### 수정된 파일

1. **PageViewer.tsx** - 그룹 데이터 동기화 버그 수정
   - 문제: 페이지 전환 시 `localGroups`가 초기화되지 않아 이전 페이지 그룹이 표시됨
   - 해결: `currentPage` 변경 시 `setLocalGroups([])` 호출 추가

```typescript
// Phase 21.8: 페이지 변경 시 선택 및 그룹 초기화 (버그 수정)
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);  // 페이지 전환 시 이전 그룹 데이터 제거
  console.log(`[PageChange] Page changed to ${currentPage}, resetting groups`);
}, [currentPage]);
```

2. **PageCanvas.tsx** - 이미지 로딩 레이스 컨디션 방지
   - 문제: 빠른 페이지 전환 시 이전 페이지의 이미지 로딩 콜백이 현재 페이지에 영향
   - 해결: `cancelled` 플래그와 정리 함수 추가

```typescript
useEffect(() => {
  let cancelled = false;  // 취소 플래그

  // ... 이미지 로딩 로직 ...

  thumbImg.onload = () => {
    if (cancelled) return;  // 취소된 경우 무시
    // ...
  };

  // 정리 함수 - 페이지 전환 시 이전 로딩 취소
  return () => {
    cancelled = true;
  };
}, [documentId, pageIndex]);
```

### 테스트 방법

1. 라벨링 페이지에서 12페이지 → 13페이지 전환
2. 확인 사항:
   - 13페이지 이미지가 정상적으로 로드되는지
   - 그룹 패널이 비어있거나 13페이지 그룹만 표시되는지
   - 콘솔에 `[PageChange]` 로그가 출력되는지

---

*작성: Claude Code*
*Phase 21.8 Bug Analysis & Fix*
