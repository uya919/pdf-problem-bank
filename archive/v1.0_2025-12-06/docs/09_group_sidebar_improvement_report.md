# 문제 그룹 사이드바 개선 분석 리포트

**작성일:** 2025-11-25
**요청자:** 사용자
**분석 대상:** GroupPanel.tsx, 백엔드 API, 데이터 구조

---

## 1. 현재 상태 분석

### 1.1 현재 UI 문제점

스크린샷 기준 현재 사이드바 표시 방식:

```
L1  L 컬럼
    블록 75개
    #726 #727 #728 #729 #730 #731 #732 #733 #734
    #735 #736 #737 #738 #748 #749 #750 #751 #752
    ... (75개 블록 ID 모두 나열)
```

**문제점:**
1. 블록 ID 75개가 모두 나열되어 **시각적 혼잡**
2. 그룹이 무엇을 표현하는지 **한눈에 파악 불가**
3. 문항 이름을 **사용자가 지정할 수 없음** (자동 L1, L2, R1...)
4. 문제 유형, 난이도 등 **추가 메타데이터 입력 불가**

### 1.2 현재 데이터 구조

```typescript
// Frontend: ProblemGroup 타입
interface ProblemGroup {
  id: string;        // "L1", "L2", "R1" 등
  column: string;    // "L" 또는 "R"
  block_ids: number[]; // [726, 727, 728, ...]
}
```

```json
// Backend: groups JSON 저장 형식
{
  "document_id": "1-40",
  "page_index": 7,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [726, 727, 728, ...]
    }
  ]
}
```

---

## 2. 사용자 요청 사항

### 2.1 요청 1: 블록 ID 나열 대신 그룹 시각화

**현재:**
```
L1 - 블록 75개
#726 #727 #728 ... (75개 모두 표시)
```

**원하는 형태:**
```
┌─────────────────────────────┐
│ 📝 1번 문제                  │
│ ───────────────────────────│
│ [썸네일 이미지]              │
│ 블록 75개 | L 컬럼           │
└─────────────────────────────┘
```

### 2.2 요청 2: 문항 이름 지정 기능

**현재:** 자동 넘버링 (L1, L2, R1, R2...)
**원하는 형태:** 사용자가 직접 이름 입력 가능

예시:
- "유형 01. 두 점 사이의 거리"
- "예제 3번"
- "중단원 마무리 1번"

### 2.3 요청 3: 넘버링 시스템

**현재:** 컬럼 기반 자동 넘버링 (L1, L2, R1...)
**원하는 형태:**
- 페이지 내 순서대로 1, 2, 3, 4...
- 또는 사용자 지정 번호

---

## 3. 구현 가능성 분석

### 3.1 구현 난이도 평가

| 기능 | 난이도 | 예상 작업량 | 백엔드 변경 |
|------|--------|-------------|-------------|
| 블록 ID 숨기기 | ⭐ 쉬움 | 30분 | 불필요 |
| 썸네일 이미지 표시 | ⭐⭐ 보통 | 2시간 | 필요 |
| 문항 이름 입력 | ⭐⭐ 보통 | 2시간 | 필요 |
| 사용자 지정 넘버링 | ⭐ 쉬움 | 1시간 | 필요 |
| 그룹 순서 변경 (드래그) | ⭐⭐⭐ 어려움 | 4시간 | 필요 |

### 3.2 데이터 구조 변경안

**확장된 ProblemGroup:**

```typescript
interface ProblemGroup {
  id: string;           // 고유 ID (UUID 또는 기존 L1, R2 등)
  column: string;       // "L" | "R"
  block_ids: number[];  // 블록 ID 배열

  // 새로 추가되는 필드
  name?: string;        // 사용자 지정 문항 이름
  order?: number;       // 페이지 내 순서 (1, 2, 3...)
  problem_number?: string; // 표시할 문제 번호 ("1", "예제3", "01" 등)
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    tags?: string[];
  };
}
```

### 3.3 UI 디자인안

**개선된 그룹 카드:**

```
┌────────────────────────────────────────┐
│  1    📝 유형 01. 두 점 사이의 거리      │
│ ──────────────────────────────────────│
│                                        │
│  ┌──────────┐   L 컬럼                 │
│  │ [썸네일]  │   75개 블록 포함          │
│  │          │                         │
│  └──────────┘   ✏️ 이름 편집  🗑️ 삭제   │
│                                        │
└────────────────────────────────────────┘
```

**컴팩트 모드 (토글 가능):**

```
┌────────────────────────────────────────┐
│ 1. 유형 01. 두 점 사이의 거리   75블록   │
├────────────────────────────────────────┤
│ 2. 예제 3번                    88블록   │
├────────────────────────────────────────┤
│ 3. 연습문제 1                  98블록   │
└────────────────────────────────────────┘
```

---

## 4. 상세 구현 계획

### Phase A: 즉시 구현 가능 (프론트엔드만)

**A-1. 블록 ID 나열 제거**
- `GroupPanel.tsx`에서 block_ids.map() 부분 제거
- 대신 "N개 블록 포함" 텍스트만 표시

**A-2. 그룹 카드 디자인 개선**
- 더 깔끔한 카드 레이아웃
- 호버 시에만 상세 정보 표시

### Phase B: 백엔드 수정 필요 (중기)

**B-1. 데이터 스키마 확장**
```python
# backend/app/routers/blocks.py
# groups_data 구조 확장
{
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [...],
      "name": "유형 01. 두 점 사이의 거리",  # 새 필드
      "order": 1,                           # 새 필드
      "problem_number": "01"                # 새 필드
    }
  ]
}
```

**B-2. 문항 이름 편집 API**
- PUT `/api/blocks/documents/{id}/groups/{page}/name`

**B-3. 그룹 순서 변경 API**
- PUT `/api/blocks/documents/{id}/groups/{page}/reorder`

### Phase C: 고급 기능 (장기)

**C-1. 그룹 썸네일 이미지**
- 그룹 생성 시 크롭된 이미지의 썸네일 자동 생성
- 썸네일 캐싱 및 lazy loading

**C-2. 드래그 앤 드롭 순서 변경**
- react-beautiful-dnd 또는 dnd-kit 사용
- 실시간 순서 동기화

---

## 5. 권장 구현 순서

### Step 1: 즉시 (30분)
```
GroupPanel.tsx 수정:
- block_ids 나열 제거
- "N개 블록 포함" 텍스트로 대체
- 카드 레이아웃 정리
```

### Step 2: 단기 (2-3시간)
```
1. ProblemGroup 타입에 name, order 필드 추가
2. 그룹 카드에 이름 편집 input 추가
3. 백엔드 groups 저장 로직 수정
4. 순서 번호 자동 부여 로직 추가
```

### Step 3: 중기 (1일)
```
1. 그룹 썸네일 생성 로직
2. 드래그 앤 드롭 구현
3. 문제 유형/난이도 메타데이터 UI
```

---

## 6. 코드 변경 예시

### 6.1 GroupPanel.tsx 수정안 (Phase A)

**Before (현재):**
```tsx
{/* Block IDs */}
<div className="flex flex-wrap gap-1">
  {group.block_ids.map((blockId) => (
    <span key={blockId} className="px-2 py-0.5 text-xs ...">
      #{blockId}
    </span>
  ))}
</div>
```

**After (개선):**
```tsx
{/* 간단한 요약만 표시 */}
<div className="flex items-center justify-between">
  <span className="text-sm text-gray-600">
    {group.block_ids.length}개 블록 포함
  </span>
  <button onClick={() => onEditName(group.id)}
          className="text-xs text-blue-500 hover:underline">
    이름 편집
  </button>
</div>
```

### 6.2 확장된 ProblemGroup 타입

```typescript
// api/client.ts
export interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];

  // 새 필드 (optional로 하위 호환성 유지)
  name?: string;
  order?: number;
  problem_number?: string;
}
```

### 6.3 이름 편집 UI 추가

```tsx
// GroupPanel.tsx - 그룹 카드 내부
<div className="flex items-center gap-2">
  {isEditing ? (
    <input
      type="text"
      value={editingName}
      onChange={(e) => setEditingName(e.target.value)}
      onBlur={() => handleSaveName(group.id)}
      onKeyDown={(e) => e.key === 'Enter' && handleSaveName(group.id)}
      className="flex-1 px-2 py-1 border rounded"
      placeholder="문항 이름 입력"
      autoFocus
    />
  ) : (
    <span
      onClick={() => startEditing(group.id, group.name)}
      className="font-medium cursor-pointer hover:text-blue-600"
    >
      {group.name || `문제 ${group.order || index + 1}`}
    </span>
  )}
</div>
```

---

## 7. 결론 및 의견

### 7.1 구현 가능성: ✅ 매우 높음

모든 요청 사항이 현재 아키텍처 내에서 구현 가능합니다.

### 7.2 권장 우선순위

1. **즉시 구현**: 블록 ID 나열 제거, 카드 UI 정리 (30분)
2. **이번 주**: 문항 이름 편집 기능 (2시간)
3. **다음 주**: 순서 번호링, 드래그 정렬 (4시간)

### 7.3 예상 효과

| 개선 항목 | 효과 |
|-----------|------|
| 블록 ID 숨김 | 시각적 혼잡 90% 감소 |
| 문항 이름 | 작업 효율 50% 향상 |
| 순서 번호링 | 일관성 있는 문제 관리 |
| 썸네일 | 빠른 그룹 식별 |

### 7.4 추가 제안

1. **키보드 단축키**:
   - `Enter`: 새 그룹 생성
   - `Delete`: 선택된 그룹 삭제
   - `1-9`: 빠른 그룹 선택

2. **자동 이름 추출**:
   - 그룹 내 첫 번째 블록의 텍스트 OCR
   - "유형 01", "예제 3" 등 자동 감지

3. **그룹 복사**:
   - 비슷한 구조의 문제를 다른 페이지에 빠르게 적용

---

**다음 단계**: 사용자 승인 후 Phase A (즉시 구현) 진행

