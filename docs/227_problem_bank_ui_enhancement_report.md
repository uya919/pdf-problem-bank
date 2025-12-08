# 문제은행 UI 개선 기능 분석 리포트

**문서 번호**: 227
**작성일**: 2025-12-07
**요청 기능**: 3가지 UI/UX 개선

---

## 요청 기능 요약

| # | 기능 | 위치 |
|---|------|------|
| 1 | 해설 연결된 문제에 뱃지 표시 | 오른쪽 사이드바 |
| 2 | 모달에서 문제+해설 함께 표시 | 문제은행 이미지 탭 |
| 3 | 교재/과정/페이지 정보 반영 | 모달 하단 정보 |

---

## 1. 해설 연결 뱃지 (사이드바)

### 1.1 현재 상태

**파일**: `components/matching/ProblemListPanel.tsx`

```
현재 연결된 문제 표시:
┌────────────────────────┐
│ ✓ 베이직쎈 · 10p · 4번  │  ← 체크 아이콘만 표시
│    → 해설 연결됨        │  ← 텍스트로 표시
└────────────────────────┘
```

**문제점**:
- "해설 연결됨" 텍스트가 별도 줄에 작게 표시됨
- 시각적으로 눈에 띄지 않음

### 1.2 구현 방안

**목표 UI**:
```
┌────────────────────────────────┐
│ ✓ 베이직쎈 · 10p · 4번 [해설] │  ← 뱃지 추가
└────────────────────────────────┘
```

**수정 위치**: `LinkedProblemItem` 컴포넌트 (라인 350-408)

```typescript
// 현재
<span className="text-xs text-grey-500">{problem.displayName}</span>

// 수정 (뱃지 추가)
<div className="flex items-center gap-1.5">
  <span className="text-xs text-grey-500">{problem.displayName}</span>
  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-toss-blue/10 text-toss-blue rounded">
    해설
  </span>
</div>
```

### 1.3 구현 가능성: ✅ 매우 쉬움

| 항목 | 평가 |
|------|------|
| 난이도 | 낮음 (CSS만 추가) |
| 예상 시간 | 10분 |
| 위험도 | 없음 |
| 데이터 변경 | 없음 |

### 1.4 우려 사항: 없음

---

## 2. 문제+해설 통합 모달 (문제은행)

### 2.1 현재 상태

**파일**: `pages/ProblemBankPage.tsx` + `components/ui/ProblemModal.tsx`

```
현재 구조:
┌─────────────────┐     ┌─────────────────┐
│  문제 리스트    │     │   해설 리스트   │
│  ├─ 문제1      │     │  ├─ 해설1      │
│  ├─ 문제2      │     │  ├─ 해설2      │
│  └─ 문제3      │     │  └─ 해설3      │
└─────────────────┘     └─────────────────┘
         ↓ 클릭
┌─────────────────────────────────────────┐
│  문제 이미지만 표시                      │
│  ┌─────────────────────────────────────┐│
│  │         문제 이미지                 ││
│  └─────────────────────────────────────┘│
│  교재: -  과정: -  페이지: -            │
└─────────────────────────────────────────┘
```

**요청 구조**:
```
┌─────────────────────────────────────────┐
│  문제 리스트 (통합)                      │
│  ├─ 문제1 [해설] ← 뱃지로 연결 여부 표시│
│  ├─ 문제2                               │
│  └─ 문제3 [해설]                        │
└─────────────────────────────────────────┘
         ↓ 클릭
┌─────────────────────────────────────────┐
│  문제 이미지                            │
│  ┌─────────────────────────────────────┐│
│  │         문제 이미지                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  연결된 해설 (있는 경우)                │
│  ┌─────────────────────────────────────┐│
│  │         해설 이미지                 ││
│  └─────────────────────────────────────┘│
│                                         │
│  교재: 베이직쎈  과정: 공통수학1        │
│  페이지: p9                             │
└─────────────────────────────────────────┘
```

### 2.2 구현 방안

#### Step 1: 문제-해설 연결 정보 조회

**문제점**: 현재 ProblemBankPage는 내보낸 PNG 이미지만 표시하며, **세션 링크 정보가 없음**

```typescript
// 현재 데이터 구조 (ExportedProblem)
{
  problem_id: string,
  document_id: string,
  page_index: number,
  group_id: string,
  image_path: string,
  created_at: string
}
// ❌ 연결된 해설 정보 없음!
```

**해결책 A: 세션 기반 조회**
```typescript
// 세션에서 links 정보 가져오기
const link = session.links.find(l => l.problemGroupId === groupId);
if (link) {
  // solutionDocumentId, solutionGroupId, solutionPageIndex로 해설 이미지 조회
}
```

**해결책 B: API 확장**
```python
# 백엔드에서 문제별 연결된 해설 정보 반환
@router.get("/problems/{problem_id}/with-solution")
async def get_problem_with_solution(problem_id: str):
    # 문제 정보 + 연결된 해설 이미지 경로 반환
```

#### Step 2: 모달 UI 수정

**파일**: `components/ui/ProblemModal.tsx`

```typescript
// 수정안
interface ProblemModalProps {
  problem: ExportedProblem;
  linkedSolution?: {  // 새로 추가
    imageUrl: string;
    documentId: string;
    pageIndex: number;
    groupId: string;
  };
  onClose: () => void;
}

// 렌더링
<div className="space-y-4">
  {/* 문제 이미지 */}
  <div>
    <h3>문제</h3>
    <img src={problemImageUrl} />
  </div>

  {/* 연결된 해설 (있는 경우) */}
  {linkedSolution && (
    <div className="border-t pt-4">
      <h3>해설</h3>
      <img src={linkedSolution.imageUrl} />
    </div>
  )}
</div>
```

### 2.3 구현 가능성: ⚠️ 중간 난이도

| 항목 | 평가 |
|------|------|
| 난이도 | 중간 |
| 예상 시간 | 2-3시간 |
| 위험도 | 낮음 |
| 데이터 변경 | API 확장 필요 |

### 2.4 우려 사항

#### 우려 1: 데이터 연결 문제 ⚠️

```
문제은행 데이터:        세션 데이터:
┌──────────────┐       ┌──────────────┐
│ ExportedPNG  │       │ WorkSession  │
│ - document_id│       │ - links[]    │
│ - group_id   │◄─────►│   - problemGr│
└──────────────┘       │   - solutionG│
                       └──────────────┘
```

- **문제**: ExportedPNG와 WorkSession이 별도 데이터
- **연결 방법**: `document_id + group_id`로 매칭 필요
- **복잡도**: 세션 목록을 먼저 로드해야 함

#### 우려 2: 해설 문서가 다른 경우 ⚠️

```
문제: 고1_공통수학1_베이직쎈_문제 (document A)
해설: 고1_공통수학1_베이직쎈_해설 (document B)
```

- 해설 이미지 경로가 다른 문서에 있음
- API 호출이 2번 필요할 수 있음

#### 우려 3: 성능 이슈 ⚠️

```
문제 100개 표시 시:
- 각 문제마다 연결 정보 조회?
- 해설 이미지 미리 로드?

→ 해결: 모달 열 때만 해설 정보 조회 (lazy loading)
```

#### 우려 4: 현재 문제은행 페이지 구조

**현재**: `ProblemBankPage.tsx`는 **세션과 무관하게** 내보낸 이미지만 표시

```typescript
// 현재 구조
const { data: problems } = useExportedProblems(selectedDocument);
// 세션 정보 없음!
```

**수정 필요**:
- 세션 로드 로직 추가
- 또는 별도 API로 연결 정보 조회

---

## 3. 교재/과정/페이지 정보 표시

### 3.1 현재 상태

**스크린샷에서 확인**:
```
교재: -
과정: -
페이지: -
내보내기 시간: 2025. 12. 5. 오전 9:39:41
```

**데이터 저장 위치**:
```
groups.json (groups/page_0009_groups.json)
{
  "groups": [{
    "id": "p9_L1",
    "problemInfo": {
      "bookName": "베이직쎈",      // ← 여기에 저장됨
      "course": "공통수학1",        // ← 여기에 저장됨
      "page": 9,                    // ← 여기에 저장됨
      "problemNumber": "L1"
    }
  }]
}
```

### 3.2 문제점 분석

**현재 모달 코드** (`ProblemModal.tsx`):
```typescript
// 하드코딩된 "-" 표시
<InfoRow label="교재" value="-" />
<InfoRow label="과정" value="-" />
<InfoRow label="페이지" value="-" />
```

**데이터 흐름 끊김**:
```
groups.json → ❌ → ProblemModal
             │
             └─ problemInfo가 전달되지 않음
```

### 3.3 구현 방안

#### Option A: API 확장 (권장)

**백엔드 수정**: `export.py`의 내보내기 응답에 problemInfo 포함

```python
# 현재
return {"image_path": image_path}

# 수정
return {
  "image_path": image_path,
  "problem_info": {
    "bookName": group.get("problemInfo", {}).get("bookName"),
    "course": group.get("problemInfo", {}).get("course"),
    "page": group.get("problemInfo", {}).get("page"),
    "problemNumber": group.get("problemInfo", {}).get("problemNumber")
  }
}
```

**프론트엔드 수정**: 모달에서 problemInfo 사용

```typescript
<InfoRow label="교재" value={problem.problem_info?.bookName || '-'} />
<InfoRow label="과정" value={problem.problem_info?.course || '-'} />
<InfoRow label="페이지" value={problem.problem_info?.page ? `p${problem.problem_info.page}` : '-'} />
```

#### Option B: 별도 API 호출

```typescript
// 모달 열 때 groups.json에서 problemInfo 조회
const { data: groupInfo } = useQuery(
  ['groupInfo', documentId, pageIndex, groupId],
  () => api.getGroupInfo(documentId, pageIndex, groupId)
);
```

### 3.4 구현 가능성: ✅ 쉬움

| 항목 | 평가 |
|------|------|
| 난이도 | 낮음 |
| 예상 시간 | 30분 |
| 위험도 | 없음 |
| 데이터 변경 | API 응답 확장 |

### 3.5 우려 사항

#### 우려 1: 기존 데이터 호환성 ⚠️

```
기존 내보내기 데이터:
├─ problemInfo 없는 경우 → "-" 표시
└─ problemInfo 있는 경우 → 정보 표시

→ Optional 처리 필요 (?.bookName || '-')
```

#### 우려 2: displayName에서 파싱? ❌

```
displayName: "베이직쎈 · 9p · L1"

파싱 시도:
- 구분자가 일관되지 않을 수 있음
- "(모문제)" 같은 특수 케이스
- 정규식 복잡도 증가

→ 원본 problemInfo 사용 권장
```

---

## 4. 종합 구현 계획

### Phase 57: 문제은행 UI 개선

| 단계 | 내용 | 난이도 | 예상 시간 |
|------|------|--------|----------|
| **57-A** | 사이드바 해설 뱃지 추가 | 쉬움 | 10분 |
| **57-B** | 모달 교재/과정/페이지 정보 표시 | 쉬움 | 30분 |
| **57-C** | 문제-해설 연결 API 추가 | 중간 | 1시간 |
| **57-D** | 모달 해설 이미지 통합 표시 | 중간 | 1시간 |
| **57-E** | 문제 리스트 통합 (문제+해설 구분 제거) | 중간 | 30분 |

**총 예상 시간**: 3-4시간

### 권장 우선순위

```
1순위: 57-A (뱃지) + 57-B (정보 표시)
       → 즉시 효과, 위험 없음

2순위: 57-C + 57-D (해설 통합)
       → 데이터 연결 로직 필요

3순위: 57-E (리스트 통합)
       → UI 구조 변경
```

---

## 5. 기술적 고려사항

### 5.1 데이터 흐름

```
현재:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ groups.json│ ──► │ export API │ ──► │ PNG 이미지 │
│ problemInfo│     │            │     │            │
└────────────┘     └────────────┘     └────────────┘
                         ↓
                   ExportedProblem
                   (problemInfo 없음!)

목표:
┌────────────┐     ┌────────────┐     ┌────────────┐
│ groups.json│ ──► │ export API │ ──► │ PNG 이미지 │
│ problemInfo│     │ + info     │     │ + metadata │
└────────────┘     └────────────┘     └────────────┘
                         ↓
                   ExportedProblem
                   + problemInfo ✓
```

### 5.2 API 설계

```python
# 새 엔드포인트 (Option A - 권장)
GET /api/problems/exported/{problem_id}/with-solution
Response:
{
  "problem": {
    "image_url": "...",
    "problem_info": {
      "bookName": "베이직쎈",
      "course": "공통수학1",
      "page": 9,
      "problemNumber": "L1"
    }
  },
  "solution": {  // nullable
    "image_url": "...",
    "document_id": "...",
    "page_index": 7,
    "group_id": "..."
  }
}
```

### 5.3 세션 연결 전략

```typescript
// 문제은행에서 해설 연결 정보 찾기
function findLinkedSolution(
  problemDocumentId: string,
  problemGroupId: string,
  sessions: WorkSession[]
): LinkedSolution | null {
  for (const session of sessions) {
    if (session.problemDocumentId !== problemDocumentId) continue;

    const link = session.links.find(l => l.problemGroupId === problemGroupId);
    if (link) {
      return {
        documentId: link.solutionDocumentId,
        pageIndex: link.solutionPageIndex,
        groupId: link.solutionGroupId
      };
    }
  }
  return null;
}
```

---

## 6. 결론

### 구현 가능성 요약

| 기능 | 가능성 | 난이도 | 권장 |
|------|--------|--------|------|
| 해설 뱃지 | ✅ 가능 | 쉬움 | 즉시 진행 |
| 교재/과정/페이지 | ✅ 가능 | 쉬움 | 즉시 진행 |
| 해설 통합 모달 | ✅ 가능 | 중간 | 2단계 진행 |

### 주요 우려사항

1. **데이터 연결**: 내보낸 PNG와 세션 링크 정보가 분리되어 있음
2. **성능**: 모달 열 때 추가 API 호출 필요
3. **기존 데이터 호환**: problemInfo 없는 기존 데이터 처리

### 권장 진행 순서

```
Phase 57-A: 사이드바 뱃지 (10분)
Phase 57-B: 모달 정보 표시 (30분)
─────────────────────────────────
        ↓ 여기까지 즉시 가능
─────────────────────────────────
Phase 57-C/D: 해설 통합 (2시간)
```

---

## 7. 다음 단계

**즉시 진행 가능**: `Phase 57-A/B 진행해줘`

**전체 구현**: `Phase 57 진행해줘`

---

*작성: Claude Code*
