# Phase 53-B: 크로스 컬럼 시각화 개선 계획

**작성일**: 2025-12-05
**선행 문서**: [144_phase53_bug_report_cross_column_export.md](144_phase53_bug_report_cross_column_export.md)
**핵심 원칙**: 기존 L/R 그룹 로직 100% 보존, X 그룹에만 새 로직 적용

---

## 목표

### 현재 (문제)
```
┌─────────────────────────────────────────┐
│█████████████████████████████████████████│  ← 하나의 큰 직사각형
│          L + 빈공간 + R                 │    (중간 빈 공간 포함)
└─────────────────────────────────────────┘
```

### 목표 (해결)
```
┌─────────────┐           ┌─────────────┐
│█████████████│ · · · · · │█████████████│  ← 두 개의 분리된 영역
│  L (위)     │           │  R (아래)   │    점선으로 연결
└─────────────┘           └─────────────┘

Export 결과:
┌─────────────┐
│  L 영역     │
├─────────────┤
│  R 영역     │
└─────────────┘
```

---

## 단계별 계획

### Phase 53-B-1: X 그룹 분리 렌더링

**목표**: PageCanvas에서 X 그룹의 segments를 각각 별도 Rect로 표시

**변경 파일**: `frontend/src/components/PageCanvas.tsx`

**현재 코드** (그룹 렌더링):
```typescript
// 모든 block_ids로 하나의 bbox 계산
const groupBlocks = blocks.filter(b => group.block_ids.includes(b.block_id));
const bbox = calculateBoundingBox(groupBlocks);
// 하나의 Rect 렌더링
<Rect x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height} />
```

**수정 코드**:
```typescript
// X 그룹: segments별로 분리 렌더링
if (group.column === 'X' && group.segments) {
  return group.segments.map((segment, idx) => {
    const segmentBlocks = blocks.filter(b => segment.block_ids.includes(b.block_id));
    const segBbox = calculateBoundingBox(segmentBlocks);
    return (
      <React.Fragment key={`${group.id}-seg-${idx}`}>
        <Rect
          x={segBbox.x} y={segBbox.y}
          width={segBbox.width} height={segBbox.height}
          stroke="#f59e0b" strokeWidth={2}
          fill="rgba(245, 158, 11, 0.1)"
        />
        {/* 세그먼트 라벨 */}
        <Text x={segBbox.x + 4} y={segBbox.y + 4} text={segment.column} />
      </React.Fragment>
    );
  });
} else {
  // 기존 L/R 로직 유지
}
```

**테스트 체크리스트**:
- [ ] 기존 L 그룹 정상 표시 (파란색)
- [ ] 기존 R 그룹 정상 표시 (보라색)
- [ ] X 그룹: L 영역 주황색 표시
- [ ] X 그룹: R 영역 주황색 표시
- [ ] 두 영역이 분리되어 표시됨

**위험도**: 낮음 (조건 분기로 기존 로직 격리)

---

### Phase 53-B-2: 세그먼트 연결선

**목표**: L과 R 영역 사이에 점선 연결

**변경 파일**: `frontend/src/components/PageCanvas.tsx`

**추가 코드**:
```typescript
// X 그룹의 세그먼트 간 연결선
if (group.column === 'X' && group.segments && group.segments.length >= 2) {
  const seg1Blocks = blocks.filter(b => group.segments[0].block_ids.includes(b.block_id));
  const seg2Blocks = blocks.filter(b => group.segments[1].block_ids.includes(b.block_id));

  const bbox1 = calculateBoundingBox(seg1Blocks);
  const bbox2 = calculateBoundingBox(seg2Blocks);

  // L의 우측 중앙 → R의 좌측 중앙
  const x1 = bbox1.x + bbox1.width;
  const y1 = bbox1.y + bbox1.height / 2;
  const x2 = bbox2.x;
  const y2 = bbox2.y + bbox2.height / 2;

  return (
    <Line
      points={[x1, y1, x2, y2]}
      stroke="#f59e0b"
      strokeWidth={2}
      dash={[5, 5]}
      opacity={0.6}
    />
  );
}
```

**테스트 체크리스트**:
- [ ] L과 R 영역 사이 점선 표시
- [ ] 점선이 주황색으로 일관성 유지
- [ ] 기존 L/R 그룹에는 연결선 없음

**위험도**: 낮음 (추가 렌더링만, 기존 영향 없음)

---

### Phase 53-B-3: 그룹 선택 시 하이라이트

**목표**: X 그룹 클릭 시 모든 세그먼트 동시 하이라이트

**변경 파일**: `frontend/src/components/PageCanvas.tsx`

**현재 코드**:
```typescript
const isSelected = selectedGroupId === group.id;
// 하나의 Rect에 선택 스타일 적용
```

**수정 코드**:
```typescript
// X 그룹: 모든 세그먼트에 동일한 선택 스타일
group.segments.map(segment => (
  <Rect
    ...
    stroke={isSelected ? "#ea580c" : "#f59e0b"}  // 선택 시 더 진한 주황
    strokeWidth={isSelected ? 3 : 2}
    fill={isSelected ? "rgba(234, 88, 12, 0.2)" : "rgba(245, 158, 11, 0.1)"}
  />
));
```

**테스트 체크리스트**:
- [ ] X 그룹 클릭 시 L, R 영역 모두 하이라이트
- [ ] 선택 해제 시 원래 스타일로 복귀

**위험도**: 낮음

---

### Phase 53-B-4: Export 미리보기 모달

**목표**: Export 버튼 클릭 시 합성 결과 미리보기

**변경 파일**:
- `frontend/src/components/GroupPanel.tsx`
- `backend/app/routers/export.py` (선택적)

**구현 방안**:

```typescript
// GroupPanel.tsx
const [previewImage, setPreviewImage] = useState<string | null>(null);

const handleExportPreview = async (group: ProblemGroup) => {
  if (group.column === 'X') {
    // Backend에서 합성된 이미지 가져오기
    const response = await api.exportGroupPreview(documentId, pageIndex, group.id);
    setPreviewImage(response.imageUrl);  // Base64 또는 URL
  }
};

// 모달 표시
{previewImage && (
  <Modal onClose={() => setPreviewImage(null)}>
    <img src={previewImage} alt="Export Preview" />
    <Button onClick={confirmExport}>확인 후 저장</Button>
  </Modal>
)}
```

**테스트 체크리스트**:
- [ ] X 그룹 Export 버튼 → 미리보기 모달
- [ ] 모달에 L 위, R 아래로 합성된 이미지 표시
- [ ] "확인 후 저장" 버튼으로 실제 저장

**위험도**: 중간 (새 API 엔드포인트 필요 가능)

---

## 롤백 계획

| Phase | 롤백 방법 |
|-------|----------|
| 53-B-1 | `group.column === 'X'` 조건 제거 |
| 53-B-2 | Line 컴포넌트 제거 |
| 53-B-3 | 선택 스타일 조건 제거 |
| 53-B-4 | 미리보기 모달 비활성화 |

---

## 구현 순서 및 예상 시간

| Phase | 작업 | 시간 | 의존성 |
|-------|------|------|--------|
| 53-B-1 | 분리 렌더링 | 40분 | 없음 |
| 53-B-2 | 연결선 | 20분 | 53-B-1 |
| 53-B-3 | 선택 하이라이트 | 15분 | 53-B-1 |
| 53-B-4 | Export 미리보기 | 45분 | 선택적 |
| - | 테스트 | 20분 | 전체 |
| **총계** | | **~2시간** | |

---

## 완료 기준

### 필수
- [ ] X 그룹의 L, R 영역이 분리되어 표시
- [ ] 두 영역 사이 점선 연결
- [ ] 클릭 시 전체 영역 동시 하이라이트
- [ ] 기존 L/R 그룹 100% 정상 동작

### 선택 (향후)
- [ ] Export 미리보기 모달
- [ ] 합성 결과 확인 후 저장

---

## 참고: 파일 구조

```
frontend/src/components/
├── PageCanvas.tsx      ← Phase 53-B-1, B-2, B-3
├── GroupPanel.tsx      ← Phase 53-B-4
└── ui/Modal.tsx        ← 기존 또는 신규

backend/app/routers/
└── export.py           ← 미리보기 API (선택적)
```

---

**"진행해줘"로 Phase 53-B-1부터 시작합니다.**
