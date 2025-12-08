/**
 * 페이지 캔버스 컴포넌트 (Phase 3, Phase 10-4: Group UI Improvement)
 *
 * Konva를 사용하여 페이지 이미지와 블록을 표시
 * Phase 10-4: 그룹을 하나의 큰 영역으로 표시
 * Phase 13: 성능 최적화 (throttle, memoization)
 * Phase 14-3: 점진적 이미지 로딩 (썸네일 → 원본)
 * Phase 42-A: 해설 그룹 시각화 (보라색 + 연결 라벨)
 */
import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react';
import { Stage, Layer, Image, Rect, Group, Text, Label, Tag, Line } from 'react-konva';
import Konva from 'konva';
import { api, type Block, type ProblemGroup } from '../api/client';
import { CANVAS_THROTTLE_MS, CANVAS_MIN_DRAG_SIZE } from '../constants/ui';

interface PageCanvasProps {
  documentId: string;
  pageIndex: number;
  blocks: Block[];
  groups: ProblemGroup[];
  selectedBlocks: number[];
  // Phase 53-A: isShiftSelect 추가 (크로스 컬럼 선택용)
  onBlockSelect: (blockId: number, isMultiSelect: boolean, isShiftSelect?: boolean) => void;
  onGroupCreate: (blockIds: number[]) => void;
  // Phase 31-J: 줌 기능
  zoomScale?: number;
  onZoomChange?: (scale: number) => void;
}

function isRectOverlap(
  rect1: { x1: number; y1: number; x2: number; y2: number },
  rect2: { x1: number; y1: number; x2: number; y2: number }
): boolean {
  return !(
    rect1.x2 < rect2.x1 ||
    rect1.x1 > rect2.x2 ||
    rect1.y2 < rect2.y1 ||
    rect1.y1 > rect2.y2
  );
}

/**
 * Phase 10-4: 그룹의 bounding box 계산
 * 그룹에 속한 모든 블록을 감싸는 최소 사각형 계산
 */
function calculateGroupBoundingBox(
  group: ProblemGroup,
  blocks: Block[],
  scale: number
): { x: number; y: number; width: number; height: number } | null {
  const groupBlocks = blocks.filter((b) => group.block_ids.includes(b.block_id));
  if (groupBlocks.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of groupBlocks) {
    const [x1, y1, x2, y2] = block.bbox;
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }

  return {
    x: minX * scale,
    y: minY * scale,
    width: (maxX - minX) * scale,
    height: (maxY - minY) * scale,
  };
}

/**
 * Phase 53-B-1: 블록 ID 배열로 bounding box 계산
 */
function calculateBlocksBoundingBox(
  blockIds: number[],
  blocks: Block[],
  scale: number
): { x: number; y: number; width: number; height: number } | null {
  const targetBlocks = blocks.filter((b) => blockIds.includes(b.block_id));
  if (targetBlocks.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of targetBlocks) {
    const [x1, y1, x2, y2] = block.bbox;
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }

  return {
    x: minX * scale,
    y: minY * scale,
    width: (maxX - minX) * scale,
    height: (maxY - minY) * scale,
  };
}

// Phase 31-J: 줌 상수
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const WHEEL_ZOOM_FACTOR = 0.1;

/**
 * Phase 42-A: 그룹 스타일 및 라벨 결정
 * - 해설 그룹 (link.linkType === 'solution'): 보라색 + 연결된 문제 번호
 * - 일반 그룹: 컬럼별 색상 (L=파랑, R=보라)
 */
function getGroupStyleAndLabel(group: ProblemGroup): {
  stroke: string;
  fill: string;
  tag: string;
  label: string;
} {
  // 해설 그룹인지 확인
  if (group.link?.linkType === 'solution') {
    // Phase 42-A-fix: 연결된 문제 번호 추출
    // linkedName 예: "베이직쎈_공통수학1_p10_4번" → "4" 추출
    const linkedName = group.link.linkedName || '';

    // 1순위: 문자열 끝의 "X번" 패턴에서 숫자 추출
    const endMatch = linkedName.match(/(\d+)번$/);
    // 2순위: 끝에 "번"이 없으면 마지막 숫자 추출 (fallback)
    const lastNumMatch = linkedName.match(/_(\d+)$/);
    // 3순위: 아무 숫자나 추출
    const anyMatch = linkedName.match(/(\d+)/);

    const problemNum = endMatch?.[1] || lastNumMatch?.[1] || anyMatch?.[1] || group.link.linkedGroupId;

    return {
      stroke: '#a855f7',  // purple-500
      fill: 'rgba(168, 85, 247, 0.12)',
      tag: '#9333ea',     // purple-600
      label: `${problemNum}번`,
    };
  }

  // 일반 그룹: 컬럼별 색상
  // Phase 47: 새 ID 형식 "p10_L1"에서도 간단한 번호 표시
  // 우선순위: problemNumber > ID에서 추출 > 전체 ID
  let problemNumber = group.problemInfo?.problemNumber;
  if (!problemNumber) {
    // "p10_L1" → "L1", "p10_X1" → "X1"
    const match = group.id.match(/_?([LRX]\d+)$/);
    problemNumber = match ? match[1] : group.id;
  }

  // Phase 53-E: 크로스 컬럼 그룹 (주황색)
  if (group.column === 'X') {
    return {
      stroke: '#f59e0b',  // amber-500
      fill: 'rgba(245, 158, 11, 0.1)',
      tag: '#f59e0b',
      label: problemNumber,
    };
  }

  if (group.column === 'R') {
    return {
      stroke: '#8b5cf6',  // violet-500
      fill: 'rgba(139, 92, 246, 0.08)',
      tag: '#8b5cf6',
      label: problemNumber,
    };
  }

  // 기본 (L 컬럼)
  return {
    stroke: '#3b82f6',  // blue-500
    fill: 'rgba(59, 130, 246, 0.08)',
    tag: '#3b82f6',
    label: problemNumber,
  };
}

// Phase 13-5: React.memo로 불필요한 리렌더링 방지
export const PageCanvas = memo(function PageCanvas({
  documentId,
  pageIndex,
  blocks,
  groups,
  selectedBlocks,
  onBlockSelect,
  onGroupCreate,
  zoomScale = 1,
  onZoomChange,
}: PageCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 1000 });
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Phase 13-1: Throttle을 위한 ref
  const lastUpdateRef = useRef<number>(0);
  // Phase 61-C: CANVAS_THROTTLE_MS moved to constants/ui.ts

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);

  // Phase 14-3: 점진적 이미지 로딩 (썸네일 → 원본)
  // Phase 21.8: 취소 플래그 추가로 레이스 컨디션 방지
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  useEffect(() => {
    // Phase 21.8: 취소 플래그 - 페이지 전환 시 이전 콜백 무시
    let cancelled = false;

    // 리셋
    setImage(null);
    setIsLoadingFull(false);

    console.log(`[Phase 21.8] Loading image for page ${pageIndex}`);

    // 캔버스 크기 업데이트 헬퍼
    const updateCanvasSize = (img: HTMLImageElement) => {
      if (cancelled) return;
      if (containerRef.current && img.width > 0) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = containerWidth / img.width;
        setCanvasSize({
          width: containerWidth,
          height: img.height * scale,
        });
      }
    };

    // 1단계: 썸네일 먼저 로드 (빠른 표시)
    const thumbImg = new window.Image();
    thumbImg.crossOrigin = 'anonymous';
    thumbImg.src = api.getPageImageUrl(documentId, pageIndex, 'thumb');

    thumbImg.onload = () => {
      if (cancelled) return;  // 취소된 경우 무시

      setImage(thumbImg);
      updateCanvasSize(thumbImg);

      // 2단계: 원본 이미지 로드 시작
      setIsLoadingFull(true);
      const fullImg = new window.Image();
      fullImg.crossOrigin = 'anonymous';
      fullImg.src = api.getPageImageUrl(documentId, pageIndex, 'full');

      fullImg.onload = () => {
        if (cancelled) return;  // 취소된 경우 무시
        setImage(fullImg);
        updateCanvasSize(fullImg);
        setIsLoadingFull(false);  // Phase 60-A: 로딩 완료 상태 업데이트
        console.log(`[Phase 21.8] Full image loaded for page ${pageIndex}`);
      };

      fullImg.onerror = () => {
        if (cancelled) return;
        setIsLoadingFull(false);  // Phase 60-A: 실패 시에도 로딩 상태 해제
        console.warn('[Phase 14-3] 원본 이미지 로딩 실패, 썸네일 유지:', fullImg.src);
      };
    };

    thumbImg.onerror = () => {
      if (cancelled) return;  // 취소된 경우 무시

      // 썸네일 실패시 원본 직접 로드
      console.warn('[Phase 14-3] 썸네일 로딩 실패, 원본 직접 로드');
      const fullImg = new window.Image();
      fullImg.crossOrigin = 'anonymous';
      fullImg.src = api.getPageImageUrl(documentId, pageIndex, 'full');

      fullImg.onload = () => {
        if (cancelled) return;  // 취소된 경우 무시
        setImage(fullImg);
        updateCanvasSize(fullImg);
        setIsLoadingFull(false);  // Phase 60-A: 로딩 완료 상태 업데이트
      };

      fullImg.onerror = () => {
        if (cancelled) return;
        setIsLoadingFull(false);  // Phase 60-A: 실패 시에도 로딩 상태 해제
        console.error('[Phase 14-3] 이미지 로딩 완전 실패:', fullImg.src);
      };
    };

    // Phase 21.8: 정리 함수 - 페이지 전환 시 이전 로딩 취소
    return () => {
      cancelled = true;
      console.log(`[Phase 21.8] Cancelled image loading for page ${pageIndex}`);
    };
  }, [documentId, pageIndex]);

  // Phase 13-4: 블록 클릭 핸들러 메모이제이션
  // Phase 53-A: Shift 키 감지 추가 (크로스 컬럼 선택)
  // Phase 62-A: Event | MouseEvent 호환 타입으로 변경
  const handleBlockClick = useCallback((blockId: number, e: Konva.KonvaEventObject<MouseEvent | Event>) => {
    const evt = e.evt as MouseEvent;
    const isMultiSelect = evt.ctrlKey || evt.metaKey;
    const isShiftSelect = evt.shiftKey;
    onBlockSelect(blockId, isMultiSelect, isShiftSelect);
  }, [onBlockSelect]);

  // Phase 13-2: 블록-그룹 매핑 캐시 (O(n) → O(1))
  const blockToGroupMap = useMemo(() => {
    const map = new Map<number, ProblemGroup>();
    for (const group of groups) {
      for (const blockId of group.block_ids) {
        map.set(blockId, group);
      }
    }
    return map;
  }, [groups]);

  // Phase 13-3: selectedBlocks를 Set으로 변환 (O(n) → O(1))
  const selectedBlocksSet = useMemo(() => new Set(selectedBlocks), [selectedBlocks]);

  // 블록이 선택되었는지 확인 - O(1)
  const isBlockSelected = useCallback((blockId: number) => {
    return selectedBlocksSet.has(blockId);
  }, [selectedBlocksSet]);

  // 블록이 그룹에 속해있는지 확인 - O(1)
  const getBlockGroup = useCallback((blockId: number): ProblemGroup | undefined => {
    return blockToGroupMap.get(blockId);
  }, [blockToGroupMap]);

  // Phase 31-J: 포인터 좌표를 줌 스케일 고려하여 변환
  const getScaledPointerPosition = useCallback((stage: Konva.Stage) => {
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return null;
    // zoomScale이 적용된 Stage에서 실제 콘텐츠 좌표로 변환
    return {
      x: pointerPosition.x / zoomScale,
      y: pointerPosition.y / zoomScale,
    };
  }, [zoomScale]);

  // Phase 13-4: MouseDown 핸들러 메모이제이션
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // 수정된 조건: Image나 Stage를 클릭했을 때 드래그 시작
    const targetType = e.target.getType();
    if (targetType === 'Stage' || targetType === 'Image') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointerPosition = getScaledPointerPosition(stage);
      if (!pointerPosition) return;

      setIsDragging(true);
      setDragStart(pointerPosition);
      setDragEnd(pointerPosition);
    }
  }, [getScaledPointerPosition]);

  // Phase 13-1: Throttle 적용된 mousemove 핸들러
  // Phase 31-J: 줌 스케일 고려
  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDragging) return;

    // Throttle: 16ms(~60fps) 이내 호출은 무시
    const now = performance.now();
    if (now - lastUpdateRef.current < CANVAS_THROTTLE_MS) return;
    lastUpdateRef.current = now;

    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPosition = getScaledPointerPosition(stage);
    if (!pointerPosition) return;

    setDragEnd(pointerPosition);
  }, [isDragging, getScaledPointerPosition]);

  // Phase 13-4: MouseUp 핸들러 메모이제이션
  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDragging || !dragStart || !dragEnd) {
      return;
    }

    setIsDragging(false);
    // Phase 61-C: minDragSize moved to constants/ui.ts
    const dragWidth = Math.abs(dragEnd.x - dragStart.x);
    const dragHeight = Math.abs(dragEnd.y - dragStart.y);

    if (dragWidth < CANVAS_MIN_DRAG_SIZE && dragHeight < CANVAS_MIN_DRAG_SIZE) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    const selectionRect = {
      x1: Math.min(dragStart.x, dragEnd.x),
      y1: Math.min(dragStart.y, dragEnd.y),
      x2: Math.max(dragStart.x, dragEnd.x),
      y2: Math.max(dragStart.y, dragEnd.y),
    };

    const scale = image ? canvasSize.width / image.width : 1;
    const selectedBlockIds = blocks
      .filter((block) => {
        const [x1, y1, x2, y2] = block.bbox;
        const blockRect = {
          x1: x1 * scale,
          y1: y1 * scale,
          x2: x2 * scale,
          y2: y2 * scale,
        };
        return isRectOverlap(selectionRect, blockRect);
      })
      .map((block) => block.block_id);

    // Phase 13-6: 드래그 선택 일괄 처리 (개별 호출 대신)
    // Phase 53-A: Shift 드래그 선택 추가
    if (selectedBlockIds.length > 0) {
      const isMultiSelect = e.evt.ctrlKey || e.evt.metaKey;
      const isShiftSelect = e.evt.shiftKey;

      if (isMultiSelect || isShiftSelect) {
        // Ctrl 또는 Shift 드래그: 모든 블록 추가 선택
        selectedBlockIds.forEach((id) => {
          onBlockSelect(id, true, isShiftSelect);
        });
      } else {
        // 일반 드래그: 첫 블록 단일 선택, 나머지 추가
        onBlockSelect(selectedBlockIds[0], false, false);
        selectedBlockIds.slice(1).forEach((id) => {
          onBlockSelect(id, true, false);
        });
      }
    }

    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, image, canvasSize.width, blocks, onBlockSelect]);

  // 스케일 계산
  const scale = image ? canvasSize.width / image.width : 1;

  // Phase 31-J: 휠 줌 핸들러
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    // Ctrl+휠만 줌으로 처리 (일반 휠은 스크롤)
    if (!e.evt.ctrlKey) return;

    e.evt.preventDefault();

    const delta = e.evt.deltaY > 0 ? -WHEEL_ZOOM_FACTOR : WHEEL_ZOOM_FACTOR;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomScale + delta));

    if (onZoomChange && newScale !== zoomScale) {
      onZoomChange(newScale);
    }
  }, [zoomScale, onZoomChange]);

  return (
    <div ref={containerRef} className="w-full bg-grey-100 rounded-lg overflow-hidden">
      <Stage
        ref={stageRef}
        width={canvasSize.width * zoomScale}
        height={canvasSize.height * zoomScale}
        scaleX={zoomScale}
        scaleY={zoomScale}
        className={isDragging ? 'cursor-crosshair' : 'cursor-default'}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
      >
        <Layer>
          {/* 페이지 이미지 */}
          {image && (
            <Image
              image={image}
              width={canvasSize.width}
              height={canvasSize.height}
              listening={false}
            />
          )}

          {/* 블록 오버레이 */}
          {blocks.map((block) => {
            const [x1, y1, x2, y2] = block.bbox;
            const group = getBlockGroup(block.block_id);
            const isSelected = isBlockSelected(block.block_id);

            // Phase 10-4: 색상 결정
            let strokeColor = '#3b82f6'; // 기본: 파란색
            let fillColor = 'rgba(59, 130, 246, 0.1)';
            let strokeWidth = 2;

            if (group) {
              // 그룹에 속한 블록은 매우 연하게 표시 (그룹 오버레이가 메인)
              strokeColor = '#d1d5db'; // 회색
              fillColor = 'rgba(209, 213, 219, 0.05)';
              strokeWidth = 1;
            }

            if (isSelected) {
              strokeColor = '#f59e0b'; // 선택: 주황색
              fillColor = 'rgba(245, 158, 11, 0.3)';
              strokeWidth = 3;
            }

            return (
              <Rect
                key={block.block_id}
                x={x1 * scale}
                y={y1 * scale}
                width={(x2 - x1) * scale}
                height={(y2 - y1) * scale}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill={fillColor}
                onClick={(e) => handleBlockClick(block.block_id, e)}
                onTap={(e) => handleBlockClick(block.block_id, e)}
                shadowColor={isSelected ? strokeColor : undefined}
                shadowBlur={isSelected ? 10 : 0}
              />
            );
          })}

          {/* Phase 10-4: 그룹 오버레이 */}
          {/* Phase 42-A: 해설 그룹 시각화 개선 */}
          {/* Phase 53-B: 크로스 컬럼 그룹 분리 렌더링 */}
          {groups.map((group) => {
            // Phase 42-A: 그룹 스타일 및 라벨 결정
            const style = getGroupStyleAndLabel(group);
            const isSolutionGroup = group.link?.linkType === 'solution';

            // Phase 53-B-1: X 그룹 (크로스 컬럼) 분리 렌더링
            if (group.column === 'X' && group.segments && group.segments.length >= 2) {
              // 각 세그먼트의 bbox 계산
              const segmentBboxes = group.segments
                .sort((a, b) => a.order - b.order)
                .map(seg => calculateBlocksBoundingBox(seg.block_ids, blocks, scale))
                .filter((bbox): bbox is NonNullable<typeof bbox> => bbox !== null);

              if (segmentBboxes.length === 0) return null;

              // Phase 53-B-2: 연결선 좌표 계산 (L 우측 중앙 → R 좌측 중앙)
              const firstBbox = segmentBboxes[0];
              const lastBbox = segmentBboxes[segmentBboxes.length - 1];

              return (
                <Group key={`group-overlay-${group.id}`}>
                  {/* Phase 53-B-1: 각 세그먼트별 사각형 */}
                  {segmentBboxes.map((bbox, idx) => (
                    <Rect
                      key={`${group.id}-seg-${idx}`}
                      x={bbox.x}
                      y={bbox.y}
                      width={bbox.width}
                      height={bbox.height}
                      stroke={style.stroke}
                      strokeWidth={3}
                      fill={style.fill}
                      listening={false}
                      dash={[8, 4]}
                    />
                  ))}

                  {/* Phase 53-B-2: 세그먼트 연결선 */}
                  {segmentBboxes.length >= 2 && (
                    <Line
                      points={[
                        firstBbox.x + firstBbox.width,  // L 우측
                        firstBbox.y + firstBbox.height / 2,  // L 중앙 Y
                        lastBbox.x,  // R 좌측
                        lastBbox.y + lastBbox.height / 2,  // R 중앙 Y
                      ]}
                      stroke={style.stroke}
                      strokeWidth={2}
                      dash={[6, 4]}
                      opacity={0.7}
                      listening={false}
                    />
                  )}

                  {/* 그룹 라벨 - 첫 번째 세그먼트에 표시 */}
                  <Label
                    x={firstBbox.x + firstBbox.width - 70}
                    y={firstBbox.y + 8}
                    listening={false}
                  >
                    <Tag
                      fill={style.tag}
                      cornerRadius={4}
                      shadowColor="rgba(0, 0, 0, 0.3)"
                      shadowBlur={4}
                      shadowOffsetY={2}
                    />
                    <Text
                      text={`${style.label} ⇅`}
                      fontSize={16}
                      fontStyle="bold"
                      fill="white"
                      padding={8}
                    />
                  </Label>
                </Group>
              );
            }

            // 기존 로직: L/R 그룹 (단일 bbox)
            const bbox = calculateGroupBoundingBox(group, blocks, scale);
            if (!bbox) return null;

            return (
              <Group key={`group-overlay-${group.id}`}>
                {/* 그룹 영역 사각형 */}
                <Rect
                  x={bbox.x}
                  y={bbox.y}
                  width={bbox.width}
                  height={bbox.height}
                  stroke={style.stroke}
                  strokeWidth={isSolutionGroup ? 4 : 3}
                  fill={style.fill}
                  listening={false}
                  dash={isSolutionGroup ? [12, 6] : [8, 4]}
                />

                {/* 그룹 라벨 - Phase 45-D: 그룹 내부 우상단으로 이동 */}
                <Label
                  x={bbox.x + bbox.width - (isSolutionGroup ? 70 : 60)}
                  y={bbox.y + 8}
                  listening={false}
                >
                  <Tag
                    fill={style.tag}
                    cornerRadius={4}
                    shadowColor="rgba(0, 0, 0, 0.3)"
                    shadowBlur={4}
                    shadowOffsetY={2}
                  />
                  <Text
                    text={style.label}
                    fontSize={16}
                    fontStyle="bold"
                    fill="white"
                    padding={8}
                  />
                </Label>
              </Group>
            );
          })}

          {/* 드래그 선택 사각형 */}
          {isDragging && dragStart && dragEnd && (
            <Rect
              x={Math.min(dragStart.x, dragEnd.x)}
              y={Math.min(dragStart.y, dragEnd.y)}
              width={Math.abs(dragEnd.x - dragStart.x)}
              height={Math.abs(dragEnd.y - dragStart.y)}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#3b82f6"
              strokeWidth={2}
              dash={[10, 5]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* 하단 안내 */}
      <div className="p-2 bg-white border-t text-xs text-grey-600">
        <div className="flex items-center gap-4">
          <span>💡 Tip:</span>
          <span>블록 클릭/드래그로 선택</span>
          <span>Ctrl+휠: 줌</span>
          <span>+/-/0: 줌 조절</span>
          <span className="ml-auto">
            선택됨: {selectedBlocks.length}개 블록
          </span>
        </div>
      </div>
    </div>
  );
});
