# Phase 10: UX 고도화 개발 계획서

> **작성일**: 2025-11-26
> **Phase**: 10 (UX Enhancement)
> **예상 총 소요 시간**: 19-26시간 (2-3일)
> **우선순위**: Feature 4 → 1 → 2 → 3

---

## 📋 목차

1. [개요](#개요)
2. [요구사항 요약](#요구사항-요약)
3. [Feature 4: 그룹 UI 개선](#feature-4-그룹-ui-개선)
4. [Feature 1: 페이지 오프셋 단순화](#feature-1-페이지-오프셋-단순화)
5. [Feature 2: 페이지 간 문항번호 연속성](#feature-2-페이지-간-문항번호-연속성)
6. [Feature 3: 문항번호 자동 조정](#feature-3-문항번호-자동-조정)
7. [통합 테스트](#통합-테스트)
8. [롤백 계획](#롤백-계획)

---

## 개요

### 배경

Phase 9 Quick Wins 완료 후 사용자 피드백:
- ✅ 페이지 전체 통합 문항번호 (L/R 구분 없이)
- ✅ G 키로 그룹 생성
- ✅ Enter 키로 편집 확정
- ✅ 자동 편집 모드

### 추가 요구사항 (Phase 10)

4가지 UX 개선 요구사항 접수:

1. **페이지 오프셋 단순화**: 현재 페이지 = 책 X페이지로 직접 설정
2. **페이지 간 문항번호 연속성**: 15페이지 마지막이 7번이면 16페이지는 8번부터
3. **문항번호 자동 조정**: 100번을 300으로 수정하면 다음은 301, 302...
4. **그룹 UI 개선**: 블록별 중복 라벨 제거, 큰 직사각형 + 문항번호만 표시

### 구현 전략

```
순서: 4 → 1 → 2 → 3 (쉬운 것부터, 독립적인 것부터)

Feature 4 (3-4h)  ───┐
                     ├─→ 중간 배포 가능
Feature 1 (2-3h)  ───┘

Feature 2 (5-8h)  ───┐
                     ├─→ 최종 배포
Feature 3 (4-6h)  ───┘
```

---

## 요구사항 요약

| Feature | 우선순위 | 복잡도 | 시간 | 리스크 | 의존성 |
|---------|---------|-------|------|--------|--------|
| 4. UI 개선 | 1 | 4/10 | 3-4h | 낮음 | 없음 |
| 1. 오프셋 단순화 | 2 | 3/10 | 2-3h | 낮음 | 없음 |
| 2. 페이지 간 연속성 | 3 | 6/10 | 5-8h | 중간 | 없음 |
| 3. 자동 조정 | 4 | 7/10 | 4-6h | 중간 | Feature 2 권장 |

---

## Feature 4: 그룹 UI 개선

### 목표

**현재 문제점**:
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ L1      │  │ L1      │  │ L1      │  ← 중복 라벨
│ Block A │  │ Block B │  │ Block C │
└─────────┘  └─────────┘  └─────────┘
```

**원하는 결과**:
```
┌─────────────────────────────────────┐
│                                   7 │  ← 문항번호만 표시
│  Block A   Block B   Block C        │
│                                     │
└─────────────────────────────────────┘
```

### 구현 목표

- [x] 그룹의 모든 블록을 포함하는 큰 직사각형 렌더링
- [x] 문항번호만 우상단에 표시
- [x] 블록별 중복 라벨 제거
- [x] L/R 컬럼 색상 유지 (파란색/보라색)

---

### Step 1: Bounding Box 계산 함수 추가

**파일**: `frontend/src/components/PageCanvas.tsx`

**위치**: 컴포넌트 내부, renderBlocks 함수 이전

**추가할 코드**:

```typescript
// 그룹의 bounding box 계산 (Phase 10-4)
const calculateGroupBoundingBox = (
  group: ProblemGroup,
  blocks: Block[],
  scale: number
): { x: number; y: number; width: number; height: number } | null => {
  const groupBlocks = blocks.filter(b => group.block_ids.includes(b.block_id));
  if (groupBlocks.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

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
};
```

**예상 시간**: 15분

---

### Step 2: 그룹 렌더링 함수 추가

**파일**: `frontend/src/components/PageCanvas.tsx`

**위치**: Step 1 함수 이후

**추가할 코드**:

```typescript
// 그룹 오버레이 렌더링 (Phase 10-4)
const renderGroupOverlays = () => {
  return groups.map((group) => {
    const bbox = calculateGroupBoundingBox(group, blocks, scale);
    if (!bbox) return null;

    // 문항번호 또는 그룹 ID
    const problemNumber = group.problemInfo?.problemNumber || group.id;

    // 컬럼별 색상
    const colors = {
      L: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.08)' },
      R: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.08)' },
    };
    const color = colors[group.column as 'L' | 'R'] || colors.L;

    return (
      <Group key={`group-overlay-${group.id}`}>
        {/* 그룹 전체 직사각형 */}
        <Rect
          x={bbox.x}
          y={bbox.y}
          width={bbox.width}
          height={bbox.height}
          stroke={color.stroke}
          strokeWidth={3}
          fill={color.fill}
          cornerRadius={4}
        />

        {/* 문항번호 라벨 (우상단) */}
        <Label x={bbox.x + bbox.width - 50} y={bbox.y - 28}>
          <Tag
            fill={color.stroke}
            cornerRadius={4}
            pointerDirection="down"
            pointerWidth={8}
            pointerHeight={5}
          />
          <Text
            text={problemNumber}
            fontSize={14}
            fontStyle="bold"
            fill="white"
            padding={6}
          />
        </Label>
      </Group>
    );
  });
};
```

**예상 시간**: 30분

---

### Step 3: 기존 블록 렌더링 로직 수정

**파일**: `frontend/src/components/PageCanvas.tsx`

**변경 위치**: blocks.map() 부분 (현재 줄 234-283)

**변경 내용**:

```typescript
{/* 기존: 모든 블록에 라벨 표시 */}
{blocks.map((block) => {
  const group = getBlockGroup(block.block_id);
  const isSelected = isBlockSelected(block.block_id);

  // 그룹에 속한 블록은 개별 라벨 제거
  const showLabel = !group || isSelected;

  return (
    <Group key={block.block_id}>
      <Rect ... />

      {/* 라벨: 그룹에 속하지 않았거나 선택된 경우만 표시 */}
      {showLabel && group && (
        <Text
          x={x1 * scale}
          y={y1 * scale - 20}
          text={group.id}
          fontSize={12}
          fill="#dc2626"
          fontStyle="bold"
        />
      )}
    </Group>
  );
})}

{/* 새로 추가: 그룹 오버레이 */}
{renderGroupOverlays()}
```

**예상 시간**: 30분

---

### Step 4: 테스트

**테스트 체크리스트**:

- [ ] 1. 그룹 생성 후 큰 직사각형으로 표시되는가?
- [ ] 2. 문항번호가 우상단에 표시되는가?
- [ ] 3. 블록별 중복 라벨이 사라졌는가?
- [ ] 4. L 컬럼은 파란색, R 컬럼은 보라색인가?
- [ ] 5. 문항번호가 없는 그룹은 ID(L1, R2)로 표시되는가?
- [ ] 6. 블록 선택 시 개별 블록이 하이라이트되는가?
- [ ] 7. 그룹 클릭 시 모든 블록이 선택되는가?
- [ ] 8. 여러 그룹이 겹치지 않는가?
- [ ] 9. 페이지 경계 근처 그룹의 라벨이 잘리지 않는가?
- [ ] 10. 줌 인/아웃 시 정상 작동하는가?

**예상 시간**: 1시간

---

### Feature 4 총 소요 시간: 3-4시간

---

## Feature 1: 페이지 오프셋 단순화

### 목표

**현재 동작**:
- 사용자가 "PDF 1페이지 = 책 460페이지"를 설정
- 수식: `bookPage = 460 + (pdfPageIndex) * 1`

**문제점**:
- "PDF 7페이지를 책 7페이지로 설정"하려면 `460 + 6 * 1 = 466`이 나옴
- 역계산이 필요: `startPage = 7 - 6 * 1 = 1`

**원하는 동작**:
- 현재 PDF 7페이지를 보고 있을 때
- "이 페이지는 책 7페이지" 클릭 → 그대로 7페이지 설정
- 다음(PDF 8) = 책 8페이지, 이전(PDF 6) = 책 6페이지

### 구현 목표

- [x] 현재 페이지 기준 설정 UX 개선
- [x] 기존 startPage 시스템 유지 (하위 호환성)
- [x] "현재 기준" 버튼 동작 개선

---

### Step 1: UI 라벨 변경

**파일**: `frontend/src/components/PageNavigation.tsx`

**변경 위치**: 줄 131-132

**현재 코드**:
```typescript
<label className="block text-sm font-medium text-purple-700 mb-1">
  PDF 1페이지 = 책 페이지
</label>
```

**변경 후**:
```typescript
<label className="block text-sm font-medium text-purple-700 mb-1">
  현재 PDF {currentPage + 1}페이지 = 책 페이지
</label>
```

**예상 시간**: 5분

---

### Step 2: "현재 기준" 버튼 동작 개선

**파일**: `frontend/src/components/PageNavigation.tsx`

**변경 위치**: 줄 65-78 (handleSetCurrentAsStart 함수)

**현재 코드**:
```typescript
const handleSetCurrentAsStart = () => {
  const inputValue = prompt(
    `현재 PDF 페이지(${currentPage + 1})의 실제 책 페이지 번호를 입력하세요:`,
    String(bookPage || currentPage + 1)
  );
  if (inputValue) {
    const pageNum = parseInt(inputValue, 10);
    if (!isNaN(pageNum)) {
      const calculatedStartPage = pageNum - currentPage * increment;
      setTempStartPage(calculatedStartPage);
    }
  }
};
```

**변경 후** (prompt 제거, 인라인 입력):
```typescript
const handleSetCurrentAsStart = () => {
  // 현재 표시된 책 페이지를 현재 PDF 페이지로 설정
  // 예: PDF 7페이지(인덱스 6), 책 15페이지 → startPage = 15 - 6 * 1 = 9
  const calculatedStartPage = bookPage - currentPage * increment;
  setTempStartPage(calculatedStartPage);
};
```

**설명**:
- 기존: prompt로 입력받음 (번거로움)
- 개선: 현재 표시된 책 페이지를 그대로 사용 (클릭 한 번)

**예상 시간**: 10분

---

### Step 3: 버튼 텍스트 및 설명 개선

**파일**: `frontend/src/components/PageNavigation.tsx`

**변경 위치**: 줄 141-147

**현재 코드**:
```typescript
<button
  onClick={handleSetCurrentAsStart}
  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm whitespace-nowrap"
  title="현재 페이지 기준으로 설정"
>
  현재 기준
</button>
```

**변경 후**:
```typescript
<button
  onClick={handleSetCurrentAsStart}
  className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm whitespace-nowrap"
  title={`PDF ${currentPage + 1}p = 책 ${bookPage}p로 고정`}
>
  현재 고정
</button>
```

**예상 시간**: 5분

---

### Step 4: 예시 텍스트 개선

**파일**: `frontend/src/components/PageNavigation.tsx`

**변경 위치**: 줄 168-170

**현재 코드**:
```typescript
<p className="text-sm text-purple-600">
  예시: PDF {currentPage + 1}p → 책 {tempStartPage + currentPage * tempIncrement}p
</p>
```

**변경 후**:
```typescript
<p className="text-sm text-purple-600">
  설정 후: 현재 페이지(PDF {currentPage + 1}p) = 책 {tempStartPage + currentPage * tempIncrement}p
</p>
```

**예상 시간**: 5분

---

### Step 5: 테스트

**테스트 체크리스트**:

- [ ] 1. PDF 7페이지에서 "현재 고정" 클릭 → 책 7페이지로 설정되는가?
- [ ] 2. 설정 후 PDF 8페이지 이동 → 책 8페이지 표시되는가?
- [ ] 3. 설정 후 PDF 6페이지 이동 → 책 6페이지 표시되는가?
- [ ] 4. increment=2일 때 정상 동작하는가?
- [ ] 5. 기존에 설정된 startPage가 있을 때 덮어쓰기 되는가?
- [ ] 6. 음수 페이지 번호가 생성되지 않는가? (경고 필요 시)
- [ ] 7. 설정 저장 후 새로고침 시 유지되는가?
- [ ] 8. 예시 텍스트가 정확한가?

**예상 시간**: 1시간

---

### Feature 1 총 소요 시간: 2-3시간

---

## Feature 2: 페이지 간 문항번호 연속성

### 목표

**현재 동작**:
- 15페이지: 문항 1, 2, 3, 4, 5, 6, 7
- 16페이지로 이동 → 새 그룹 생성 → **"1"** 제안 (페이지 독립적)

**원하는 동작**:
- 15페이지: 문항 1, 2, 3, 4, 5, 6, 7
- 16페이지로 이동 → 새 그룹 생성 → **"8"** 제안 (이전 페이지 이어서)

### 구현 목표

- [x] 모든 페이지의 마지막 문항번호 조회 API
- [x] React Query 기반 캐싱 (30초)
- [x] 이전 페이지 번호 조회 훅
- [x] GroupPanel에 연동

---

### Step 1: 백엔드 API 추가

**파일**: `backend/app/routers/blocks.py`

**추가 위치**: 파일 끝

**추가할 코드**:

```python
@router.get("/documents/{document_id}/groups-summary")
async def get_groups_summary(document_id: str):
    """
    문서 전체 그룹 요약 조회 (문항번호 연속성용)

    Returns:
        {
            "document_id": str,
            "pages": [
                {
                    "page_index": int,
                    "last_problem_number": str | null,
                    "group_count": int
                }
            ]
        }
    """
    try:
        doc_dir = config.get_document_dir(document_id)
        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail=f"문서 '{document_id}'를 찾을 수 없습니다")

        groups_dir = doc_dir / "groups"
        summaries = []

        if groups_dir.exists():
            # 모든 페이지 그룹 파일 스캔
            for groups_file in sorted(groups_dir.glob("page_*_groups.json")):
                try:
                    # 파일명에서 페이지 번호 추출
                    page_index = int(groups_file.stem.split("_")[1])

                    # 파일 읽기
                    with groups_file.open("r", encoding="utf-8") as f:
                        data = json.load(f)

                    groups = data.get("groups", [])

                    # 마지막 문항번호 찾기 (역순으로 탐색)
                    last_number = None
                    for group in reversed(groups):
                        problem_info = group.get("problemInfo", {})
                        if problem_info.get("problemNumber"):
                            last_number = problem_info["problemNumber"]
                            break

                    summaries.append({
                        "page_index": page_index,
                        "last_problem_number": last_number,
                        "group_count": len(groups),
                    })
                except (ValueError, KeyError, json.JSONDecodeError) as e:
                    print(f"[경고] 파일 파싱 실패: {groups_file} - {str(e)}")
                    continue

        return {
            "document_id": document_id,
            "pages": summaries,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[API 오류] 그룹 요약 조회 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"그룹 요약 조회 실패: {str(e)}")
```

**예상 시간**: 1시간

---

### Step 2: API 클라이언트 함수 추가

**파일**: `frontend/src/api/client.ts`

**추가 위치**: getDocumentSettings 함수 이후

**추가할 타입**:

```typescript
export interface PageSummary {
  page_index: number;
  last_problem_number: string | null;
  group_count: number;
}

export interface GroupsSummary {
  document_id: string;
  pages: PageSummary[];
}
```

**추가할 함수**:

```typescript
// 문서 전체 그룹 요약 조회 (Phase 10-2)
export async function getGroupsSummary(documentId: string): Promise<GroupsSummary> {
  const response = await fetch(`${API_BASE_URL}/documents/${documentId}/groups-summary`);
  if (!response.ok) {
    throw new Error(`그룹 요약 조회 실패: ${response.statusText}`);
  }
  return response.json();
}
```

**예상 시간**: 15분

---

### Step 3: 문항번호 컨텍스트 훅 생성

**파일**: `frontend/src/hooks/useProblemNumberContext.ts` (신규)

**전체 코드**:

```typescript
/**
 * Phase 10-2: 페이지 간 문항번호 연속성 지원
 *
 * 모든 페이지의 마지막 문항번호를 조회하고,
 * 이전 페이지의 번호를 이어서 사용할 수 있게 지원
 */
import { useQuery } from '@tanstack/react-query';
import { getGroupsSummary } from '../api/client';
import type { PageSummary } from '../api/client';

export function useProblemNumberContext(documentId: string) {
  // 모든 페이지의 마지막 문항번호 조회
  const { data: summary, isLoading } = useQuery({
    queryKey: ['problemSummaries', documentId],
    queryFn: () => getGroupsSummary(documentId),
    staleTime: 30 * 1000,     // 30초간 신선
    cacheTime: 5 * 60 * 1000, // 5분간 캐시
    refetchOnWindowFocus: false,
  });

  /**
   * 특정 페이지 이전의 마지막 문항번호 조회
   *
   * @param currentPageIndex 현재 페이지 인덱스
   * @returns 이전 페이지의 마지막 문항번호 (없으면 null)
   */
  const getLastProblemNumberBefore = (currentPageIndex: number): string | null => {
    if (!summary?.pages) return null;

    // 현재 페이지 이전의 페이지들을 역순으로 탐색
    for (let i = currentPageIndex - 1; i >= 0; i--) {
      const pageSummary = summary.pages.find(p => p.page_index === i);
      if (pageSummary?.last_problem_number) {
        return pageSummary.last_problem_number;
      }
    }

    return null;
  };

  return {
    summary,
    isLoading,
    getLastProblemNumberBefore,
  };
}
```

**예상 시간**: 30분

---

### Step 4: problemNumberUtils 확장

**파일**: `frontend/src/utils/problemNumberUtils.ts`

**추가 위치**: 파일 끝

**추가할 함수**:

```typescript
/**
 * 페이지 간 연속성을 고려한 다음 문항번호 제안
 * Phase 10-2
 *
 * @param currentPageGroups 현재 페이지의 그룹들
 * @param previousPageLastNumber 이전 페이지의 마지막 문항번호
 * @returns 제안할 문항번호
 */
export function getNextProblemNumberWithContext(
  currentPageGroups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  previousPageLastNumber: string | null
): string {
  // 1순위: 현재 페이지에 그룹이 있으면 현재 페이지 기준
  const currentPageLast = getLastProblemNumberOnPage(currentPageGroups);
  if (currentPageLast) {
    return incrementProblemNumber(currentPageLast);
  }

  // 2순위: 현재 페이지에 그룹이 없으면 이전 페이지 기준
  if (previousPageLastNumber) {
    return incrementProblemNumber(previousPageLastNumber);
  }

  // 3순위: 아무것도 없으면 1부터
  return '1';
}
```

**예상 시간**: 15분

---

### Step 5: PageViewer에 컨텍스트 훅 연동

**파일**: `frontend/src/pages/PageViewer.tsx`

**변경 위치**: import 부분 (줄 7-15)

**추가할 import**:
```typescript
import { useProblemNumberContext } from '../hooks/useProblemNumberContext';
```

**변경 위치**: 컴포넌트 내부 (줄 28-36)

**추가할 훅 호출**:
```typescript
// Phase 10-2: 페이지 간 문항번호 연속성
const { getLastProblemNumberBefore } = useProblemNumberContext(documentId);
const previousPageLastNumber = getLastProblemNumberBefore(currentPage);
```

**변경 위치**: GroupPanel props (줄 285-297)

**추가할 prop**:
```typescript
<GroupPanel
  groups={localGroups}
  selectedBlocks={selectedBlocks}
  onCreateGroup={handleCreateGroup}
  onDeleteGroup={handleDeleteGroup}
  onGroupSelect={handleGroupSelect}
  bookPage={bookPage}
  defaultBookName={documentSettings?.defaultBookName || ''}
  defaultCourse={documentSettings?.defaultCourse || ''}
  onUpdateGroupInfo={handleUpdateGroupInfo}
  autoEditGroupId={autoEditGroupId}
  onAutoEditComplete={() => setAutoEditGroupId(null)}
  previousPageLastNumber={previousPageLastNumber}  {/* 추가 */}
/>
```

**예상 시간**: 15분

---

### Step 6: GroupPanel에 컨텍스트 적용

**파일**: `frontend/src/components/GroupPanel.tsx`

**변경 위치**: import 부분 (줄 15)

**수정할 import**:
```typescript
import { getNextProblemNumber, getNextProblemNumberWithContext } from '../utils/problemNumberUtils';
```

**변경 위치**: interface GroupPanelProps (줄 17-31)

**추가할 prop**:
```typescript
interface GroupPanelProps {
  groups: ProblemGroup[];
  selectedBlocks: number[];
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onGroupSelect: (blockIds: number[]) => void;
  // Phase 8: 문항 정보 관련
  bookPage?: number;
  defaultBookName?: string;
  defaultCourse?: string;
  onUpdateGroupInfo?: (groupId: string, problemInfo: ProblemInfo) => void;
  // Phase 9: 자동 편집 모드
  autoEditGroupId?: string | null;
  onAutoEditComplete?: () => void;
  // Phase 10-2: 페이지 간 연속성
  previousPageLastNumber?: string | null;  // 추가
}
```

**변경 위치**: 컴포넌트 파라미터 (줄 33-45)

**추가할 파라미터**:
```typescript
export function GroupPanel({
  groups,
  selectedBlocks,
  onCreateGroup,
  onDeleteGroup,
  onGroupSelect,
  bookPage,
  defaultBookName = '',
  defaultCourse = '',
  onUpdateGroupInfo,
  autoEditGroupId,
  onAutoEditComplete,
  previousPageLastNumber,  // 추가
}: GroupPanelProps) {
```

**변경 위치**: startEditing 함수 (줄 64-83)

**수정할 코드**:
```typescript
// 편집 시작
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);

  // Phase 10-2: 페이지 간 연속성을 고려한 문항번호 자동 증가
  const suggestedProblemNumber = group.problemInfo?.problemNumber
    || getNextProblemNumberWithContext(groups, previousPageLastNumber);

  setEditForm({
    bookName: group.problemInfo?.bookName || defaultBookName,
    course: group.problemInfo?.course || defaultCourse,
    page: group.problemInfo?.page || bookPage || 1,
    problemNumber: suggestedProblemNumber,
  });

  // Phase 9: 문항번호 필드 자동 포커스
  setTimeout(() => {
    problemNumberInputRef.current?.focus();
    problemNumberInputRef.current?.select();
  }, 50);
};
```

**예상 시간**: 20분

---

### Step 7: 캐시 무효화 처리

**파일**: `frontend/src/hooks/useDocuments.ts`

**변경 위치**: useSavePageGroups 함수 (줄 102-113)

**수정할 onSuccess**:

```typescript
export function useSavePageGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      pageIndex,
      groups,
    }: {
      documentId: string;
      pageIndex: number;
      groups: ProblemGroup[];
    }) => api.savePageGroups(documentId, pageIndex, groups),
    onSuccess: (_, variables) => {
      // 해당 페이지의 그룹 캐시 갱신
      queryClient.invalidateQueries({
        queryKey: ['pageGroups', variables.documentId, variables.pageIndex],
      });

      // Phase 10-2: 그룹 요약 캐시도 갱신
      queryClient.invalidateQueries({
        queryKey: ['problemSummaries', variables.documentId],
      });
    },
  });
}
```

**예상 시간**: 10분

---

### Step 8: 테스트

**테스트 체크리스트**:

- [ ] 1. 15페이지에서 문항 1~7 생성
- [ ] 2. 16페이지로 이동 → 새 그룹 생성 → "8" 제안되는가?
- [ ] 3. 문항 8, 9, 10 생성
- [ ] 4. 17페이지로 이동 → "11" 제안되는가?
- [ ] 5. 빈 페이지(그룹 없음) 건너뛰기 테스트
  - 15페이지: 1~7
  - 16페이지: 비어있음
  - 17페이지 → "8" 제안되는가?
- [ ] 6. 캐시 동작 확인 (Network 탭에서 30초 내 재요청 없음)
- [ ] 7. 그룹 저장 후 캐시 갱신 확인
- [ ] 8. 100페이지 문서에서 성능 테스트 (응답 시간 < 1초)
- [ ] 9. 문항번호 형식 불일치 (3-1 다음 4) 정상 처리되는가?
- [ ] 10. 페이지 변경 후 즉시 그룹 생성 시 정확한 번호 제안되는가?

**예상 시간**: 2시간

---

### Feature 2 총 소요 시간: 5-8시간

---

## Feature 3: 문항번호 자동 조정

### 목표

**시나리오**:
- 현재 상태: 문항 1, 2, 3, ..., 100
- 문항 101을 생성하고 "300"으로 수정
- 원하는 결과: 다음 문항부터 자동으로 301, 302, 303...

### 구현 목표

- [x] 문항번호 변경 감지
- [x] 이후 그룹 자동 조정 로직
- [x] 확인 다이얼로그 (프리뷰)
- [x] 일괄 업데이트 핸들러

---

### Step 1: 자동 조정 유틸리티 함수 추가

**파일**: `frontend/src/utils/problemNumberUtils.ts`

**추가 위치**: 파일 끝

**추가할 함수**:

```typescript
/**
 * 특정 그룹의 문항번호 변경 시 이후 그룹들의 번호 자동 조정
 * Phase 10-3
 *
 * @param groups 현재 페이지의 모든 그룹
 * @param changedGroupId 변경된 그룹 ID
 * @param newNumber 새로운 문항번호
 * @returns 업데이트된 그룹 배열
 */
export function adjustSubsequentProblemNumbers(
  groups: ProblemGroup[],
  changedGroupId: string,
  newNumber: string
): ProblemGroup[] {
  const changedIndex = groups.findIndex(g => g.id === changedGroupId);
  if (changedIndex === -1) return groups;

  const updatedGroups = [...groups];

  // 변경된 그룹 업데이트
  if (updatedGroups[changedIndex].problemInfo) {
    updatedGroups[changedIndex] = {
      ...updatedGroups[changedIndex],
      problemInfo: {
        ...updatedGroups[changedIndex].problemInfo!,
        problemNumber: newNumber,
        displayName: generateDisplayName(
          updatedGroups[changedIndex].problemInfo!,
          newNumber
        ),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  // 이후 그룹들 자동 증가
  let currentNumber = newNumber;
  for (let i = changedIndex + 1; i < updatedGroups.length; i++) {
    currentNumber = incrementProblemNumber(currentNumber);

    if (updatedGroups[i].problemInfo) {
      updatedGroups[i] = {
        ...updatedGroups[i],
        problemInfo: {
          ...updatedGroups[i].problemInfo!,
          problemNumber: currentNumber,
          displayName: generateDisplayName(
            updatedGroups[i].problemInfo!,
            currentNumber
          ),
        },
        updatedAt: new Date().toISOString(),
      };
    }
  }

  return updatedGroups;
}

/**
 * displayName 생성 헬퍼 함수
 */
function generateDisplayName(
  problemInfo: { bookName: string; course: string; page: number },
  problemNumber: string
): string {
  return `${problemInfo.bookName} - ${problemInfo.course}, ${problemInfo.page}p, ${problemNumber}`;
}

/**
 * 자동 조정 프리뷰
 * Phase 10-3
 */
export interface AdjustmentPreview {
  groupId: string;
  oldNumber: string;
  newNumber: string;
}

export function previewAdjustment(
  groups: ProblemGroup[],
  changedGroupId: string,
  newNumber: string
): {
  updatedGroups: ProblemGroup[];
  affectedCount: number;
  preview: AdjustmentPreview[];
} {
  const preview: AdjustmentPreview[] = [];
  const changedIndex = groups.findIndex(g => g.id === changedGroupId);

  if (changedIndex === -1) {
    return { updatedGroups: groups, affectedCount: 0, preview: [] };
  }

  // 이후 그룹들의 변경 사항 미리 계산
  let currentNumber = newNumber;
  for (let i = changedIndex + 1; i < groups.length; i++) {
    currentNumber = incrementProblemNumber(currentNumber);
    const group = groups[i];
    if (group.problemInfo?.problemNumber) {
      preview.push({
        groupId: group.id,
        oldNumber: group.problemInfo.problemNumber,
        newNumber: currentNumber,
      });
    }
  }

  return {
    updatedGroups: adjustSubsequentProblemNumbers(groups, changedGroupId, newNumber),
    affectedCount: preview.length,
    preview,
  };
}
```

**예상 시간**: 1시간

---

### Step 2: PageViewer에 일괄 업데이트 핸들러 추가

**파일**: `frontend/src/pages/PageViewer.tsx`

**추가 위치**: handleUpdateGroupInfo 함수 이후 (줄 103 이후)

**추가할 함수**:

```typescript
// Phase 10-3: 그룹 일괄 업데이트 핸들러
const handleUpdateGroupInfoBatch = (updatedGroups: ProblemGroup[]) => {
  setLocalGroups(updatedGroups);

  const count = updatedGroups.filter(g =>
    localGroups.find(orig => orig.id === g.id)?.problemInfo?.problemNumber !==
    g.problemInfo?.problemNumber
  ).length;

  showToast(`${count}개 문항번호가 자동 조정되었습니다`, 'success');
};
```

**변경 위치**: GroupPanel props (줄 285-297)

**추가할 prop**:
```typescript
<GroupPanel
  // ... 기존 props
  onUpdateGroupInfo={handleUpdateGroupInfo}
  onUpdateGroupInfoBatch={handleUpdateGroupInfoBatch}  {/* 추가 */}
  autoEditGroupId={autoEditGroupId}
  onAutoEditComplete={() => setAutoEditGroupId(null)}
  previousPageLastNumber={previousPageLastNumber}
/>
```

**예상 시간**: 15분

---

### Step 3: GroupPanel에 자동 조정 로직 추가

**파일**: `frontend/src/components/GroupPanel.tsx`

**변경 위치**: import 부분 (줄 15)

**수정할 import**:
```typescript
import {
  getNextProblemNumber,
  getNextProblemNumberWithContext,
  previewAdjustment,
} from '../utils/problemNumberUtils';
```

**변경 위치**: interface GroupPanelProps (줄 17-31)

**추가할 prop**:
```typescript
interface GroupPanelProps {
  // ... 기존 props
  onUpdateGroupInfo?: (groupId: string, problemInfo: ProblemInfo) => void;
  onUpdateGroupInfoBatch?: (updatedGroups: ProblemGroup[]) => void;  // 추가
  // ...
}
```

**변경 위치**: 컴포넌트 파라미터 (줄 33-45)

**추가할 파라미터**:
```typescript
export function GroupPanel({
  // ... 기존 파라미터
  onUpdateGroupInfo,
  onUpdateGroupInfoBatch,  // 추가
  autoEditGroupId,
  onAutoEditComplete,
  previousPageLastNumber,
}: GroupPanelProps) {
```

**변경 위치**: saveEdit 함수 (줄 85-99)

**완전히 새로 작성**:

```typescript
// 편집 저장 (Phase 10-3: 자동 조정 포함)
const saveEdit = (groupId: string) => {
  if (!onUpdateGroupInfo || !editForm.bookName || !editForm.problemNumber) {
    return;
  }

  const targetGroup = groups.find(g => g.id === groupId);
  if (!targetGroup) return;

  const oldNumber = targetGroup.problemInfo?.problemNumber;
  const newNumber = editForm.problemNumber;

  const displayName = `${editForm.bookName} - ${editForm.course || ''}, ${editForm.page}p, ${newNumber}`;
  const problemInfo: ProblemInfo = {
    bookName: editForm.bookName,
    course: editForm.course || '',
    page: editForm.page || 1,
    problemNumber: newNumber,
    displayName,
  };

  // 문항번호가 변경되었고 이후 그룹이 있는 경우
  const hasSubsequent = groups.findIndex(g => g.id === groupId) < groups.length - 1;

  if (oldNumber !== newNumber && hasSubsequent && onUpdateGroupInfoBatch) {
    const { affectedCount, preview, updatedGroups } = previewAdjustment(
      groups,
      groupId,
      newNumber
    );

    if (affectedCount > 0) {
      // 확인 다이얼로그
      const previewText = preview
        .slice(0, 3)
        .map(p => `  ${p.oldNumber} → ${p.newNumber}`)
        .join('\n');

      const moreText = affectedCount > 3 ? `\n  ... 외 ${affectedCount - 3}개` : '';

      const confirmed = window.confirm(
        `문항번호를 "${newNumber}"으로 변경하면 이후 ${affectedCount}개 문항의 번호가 자동 조정됩니다.\n\n` +
        `변경 내용:\n${previewText}${moreText}\n\n` +
        `계속하시겠습니까?`
      );

      if (confirmed) {
        // 일괄 업데이트
        onUpdateGroupInfoBatch(updatedGroups);
      } else {
        // 단일 그룹만 업데이트
        onUpdateGroupInfo(groupId, problemInfo);
      }
    } else {
      // 이후 그룹이 없거나 문항번호가 없음
      onUpdateGroupInfo(groupId, problemInfo);
    }
  } else {
    // 번호 변경 없음 또는 마지막 그룹
    onUpdateGroupInfo(groupId, problemInfo);
  }

  setEditingGroupId(null);
  setEditForm({});
};
```

**예상 시간**: 45분

---

### Step 4: 테스트

**테스트 체크리스트**:

- [ ] 1. 문항 1~10 생성
- [ ] 2. 문항 5를 "100"으로 수정
  - [ ] 2-1. 확인 다이얼로그 표시되는가?
  - [ ] 2-2. 프리뷰에 "6→101, 7→102, 8→103" 표시되는가?
  - [ ] 2-3. "계속" 선택 시 자동 조정되는가?
  - [ ] 2-4. "취소" 선택 시 해당 그룹만 변경되는가?
- [ ] 3. 마지막 그룹 변경 시 확인 다이얼로그 안 나타나는가?
- [ ] 4. 문항번호가 없는 그룹 건너뛰기 정상 동작하는가?
- [ ] 5. 복합 패턴 테스트
  - [ ] "3-1" → "10-1" 변경 → 다음 "10-2"
  - [ ] "3~5" → "10~12" 변경 → 다음 "13~15"
  - [ ] "3-(가)" → "10-(가)" 변경 → 다음 "10-(나)"
- [ ] 6. 10개 이상 그룹 조정 시 "... 외 N개" 표시되는가?
- [ ] 7. 자동 저장 (2초 후) 정상 동작하는가?
- [ ] 8. 번호를 더 작은 값으로 변경 시 경고 없이 동작하는가?
  - 예: "100" → "50" (이후 51, 52, ...)
- [ ] 9. UI 반영 즉시 되는가?
- [ ] 10. 새로고침 후 변경 사항 유지되는가?

**예상 시간**: 2시간

---

### Feature 3 총 소요 시간: 4-6시간

---

## 통합 테스트

### 목표

4가지 기능이 함께 동작할 때 충돌 없이 정상 작동하는지 확인

---

### 시나리오 1: 전체 워크플로우

**순서**:

1. **Feature 1 테스트**:
   - PDF 문서 열기 → 7페이지 이동
   - "현재 고정" 클릭 → PDF 7p = 책 7p 설정
   - 다음 페이지(PDF 8) → 책 8p 확인

2. **Feature 4 + 2 테스트**:
   - 7페이지에서 블록 선택 → G → 문항 1, 2, 3 생성
   - 캔버스에서 큰 직사각형 + 문항번호만 표시 확인
   - 8페이지 이동 → 새 그룹 생성 → **"4"** 제안 확인 (Feature 2)
   - 문항 4, 5, 6 생성

3. **Feature 3 테스트**:
   - 문항 5를 "100"으로 수정
   - 확인 다이얼로그: "문항 6이 101로 변경됩니다"
   - 확인 → 자동 조정
   - 캔버스에서 "100", "101" 표시 확인 (Feature 4)

4. **Feature 2 재검증**:
   - 9페이지 이동 → 새 그룹 생성
   - **"102"** 제안 확인 (이전 페이지 101 이어서)

**예상 시간**: 1시간

---

### 시나리오 2: 엣지 케이스

1. **빈 페이지 건너뛰기**:
   - 7p: 문항 1~3
   - 8p: 비어있음
   - 9p: 비어있음
   - 10p: 새 그룹 → "4" 제안되는가?

2. **대량 조정**:
   - 20개 그룹 생성 (1~20)
   - 문항 10을 "100"으로 변경
   - 10개 그룹이 101~110으로 조정되는가?
   - 확인 다이얼로그에 "... 외 7개" 표시되는가?

3. **페이지 오프셋 + 문항번호**:
   - PDF 1p = 책 460p 설정
   - 문항 1 생성 → page=460 확인
   - PDF 2p = 책 461p 확인
   - 문항 2 생성 → page=461, problemNumber=2 확인

4. **increment=2 테스트**:
   - increment를 2로 설정
   - PDF 7p = 책 7p 고정
   - PDF 8p → 책 9p (7 + 1*2)
   - PDF 9p → 책 11p (7 + 2*2)

**예상 시간**: 2시간

---

### 시나리오 3: 성능 테스트

1. **대용량 문서**:
   - 100페이지 문서
   - 그룹 요약 API 호출 시간 < 1초
   - 캐싱 동작 확인 (30초 내 재요청 없음)

2. **대량 그룹**:
   - 한 페이지에 50개 그룹
   - UI 렌더링 정상 (버벅임 없음)
   - 문항번호 조정 시간 < 500ms

**예상 시간**: 1시간

---

### 시나리오 4: Phase 9 회귀 테스트

**Phase 9 Quick Wins 정상 동작 확인**:

- [ ] 9-1: 그룹 생성 시 자동 편집 모드 진입
- [ ] 9-2: 문항번호 자동 증가 (페이지 전체 기준)
  - "3" → "4"
  - "3-1" → "3-2"
  - "3~5" → "6~8"
  - "3-(가)" → "3-(나)"
- [ ] 9-3: G 키로 그룹 생성
- [ ] 9-4: Ctrl+S 즉시 저장
- [ ] 9-5: Enter 키로 편집 확정 (Phase 9+)

**예상 시간**: 30분

---

### 통합 테스트 총 소요 시간: 4-5시간

---

## 롤백 계획

### Feature 4: 그룹 UI 개선

**롤백 시간**: 5분

**롤백 단계**:
1. `PageCanvas.tsx`에서 Step 1~3 변경 제거
2. 기존 블록 렌더링 로직 복원

**확인**:
- 블록별 라벨 다시 표시
- 그룹 오버레이 제거

---

### Feature 1: 페이지 오프셋 단순화

**롤백 시간**: 5분

**롤백 단계**:
1. `PageNavigation.tsx`의 Step 1~4 변경 복원
2. 기존 prompt 기반 로직 복원

**확인**:
- "현재 기준" 버튼 클릭 시 prompt 표시
- 라벨 "PDF 1페이지 = 책 페이지"로 복원

---

### Feature 2: 페이지 간 문항번호 연속성

**롤백 시간**: 10분

**롤백 단계**:
1. `GroupPanel.tsx`에서 `previousPageLastNumber` prop 제거
2. `PageViewer.tsx`에서 `useProblemNumberContext` 훅 제거
3. `startEditing`에서 `getNextProblemNumber(groups)` 사용 (기존 방식)
4. 백엔드 API는 그대로 두어도 무방 (호출되지 않음)

**확인**:
- 페이지 변경 시 항상 "1"부터 제안
- API 호출 없음

---

### Feature 3: 문항번호 자동 조정

**롤백 시간**: 10분

**롤백 단계**:
1. `GroupPanel.tsx`의 `saveEdit` 함수를 기존 버전으로 복원
2. `onUpdateGroupInfoBatch` 호출 제거
3. `PageViewer.tsx`에서 `handleUpdateGroupInfoBatch` 함수 제거

**확인**:
- 문항번호 수정 시 해당 그룹만 변경
- 확인 다이얼로그 표시 안 됨
- 자동 조정 안 됨

---

## 구현 체크리스트

### Feature 4: 그룹 UI 개선

- [ ] Step 1: Bounding box 계산 함수
- [ ] Step 2: 그룹 렌더링 함수
- [ ] Step 3: 블록 렌더링 수정
- [ ] Step 4: 테스트 (10개 항목)

### Feature 1: 페이지 오프셋 단순화

- [ ] Step 1: UI 라벨 변경
- [ ] Step 2: "현재 기준" 버튼 개선
- [ ] Step 3: 버튼 텍스트 개선
- [ ] Step 4: 예시 텍스트 개선
- [ ] Step 5: 테스트 (8개 항목)

### Feature 2: 페이지 간 문항번호 연속성

- [ ] Step 1: 백엔드 API 추가
- [ ] Step 2: API 클라이언트 함수
- [ ] Step 3: 컨텍스트 훅 생성
- [ ] Step 4: problemNumberUtils 확장
- [ ] Step 5: PageViewer 연동
- [ ] Step 6: GroupPanel 적용
- [ ] Step 7: 캐시 무효화
- [ ] Step 8: 테스트 (10개 항목)

### Feature 3: 문항번호 자동 조정

- [ ] Step 1: 자동 조정 유틸리티
- [ ] Step 2: PageViewer 핸들러
- [ ] Step 3: GroupPanel 로직
- [ ] Step 4: 테스트 (10개 항목)

### 통합 테스트

- [ ] 시나리오 1: 전체 워크플로우
- [ ] 시나리오 2: 엣지 케이스
- [ ] 시나리오 3: 성능 테스트
- [ ] 시나리오 4: Phase 9 회귀 테스트

---

## 예상 일정

### Day 1 (8시간)

- **09:00-12:00**: Feature 4 구현 + 테스트 (3시간)
- **13:00-15:00**: Feature 1 구현 + 테스트 (2시간)
- **15:00-18:00**: Feature 2 시작 (백엔드 API, 프론트엔드 훅) (3시간)

### Day 2 (8시간)

- **09:00-13:00**: Feature 2 완료 + 테스트 (4시간)
- **13:00-17:00**: Feature 3 구현 (4시간)

### Day 3 (6시간)

- **09:00-11:00**: Feature 3 테스트 (2시간)
- **11:00-15:00**: 통합 테스트 (4시간)

**총 소요 시간**: 22시간 (예상: 19-26시간 범위 내)

---

## 참고사항

### 안전장치

1. **점진적 배포**:
   - Feature 4, 1 구현 후 중간 배포 가능
   - Feature 2, 3은 함께 배포 권장

2. **빠른 롤백**:
   - 각 Feature별 5-10분 내 롤백 가능
   - Git 커밋을 Feature별로 분리

3. **테스트 우선**:
   - 각 Feature마다 상세한 테스트 체크리스트
   - 통합 테스트 시나리오 4개

4. **성능 모니터링**:
   - Feature 2의 API 응답 시간 측정
   - Feature 4의 렌더링 성능 확인

### 문서화

- 각 Feature별로 주석 추가
- Phase 10 완료 후 README 업데이트
- 사용자 가이드 작성 (선택적)

---

**작성자**: Claude Code
**최종 수정**: 2025-11-26
**문서 버전**: 1.0
