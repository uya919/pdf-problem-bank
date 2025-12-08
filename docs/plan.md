# 개발 계획 v2.1

**최종 업데이트**: 2025-12-07 (심야)
**목적**: 현재 및 미래 개발 계획 관리

---

## 📍 현재 상태 요약

| 항목 | 상태 |
|------|------|
| 핵심 라벨링 기능 | ✅ 안정 (Phase 56-63 완료) |
| 문제은행 UI | ✅ Phase 57 완료 (해설 연결 표시) |
| TypeScript 빌드 | ✅ 0 에러 (Phase 62-A 완료) |
| UI/UX 철학 | ✅ 토스 디자인 시스템 적용 |
| 코드 안정성 | ✅ Optimistic Update, beforeunload 등 |
| 연결 배지 버그 | ✅ Phase 63 완료 (수정됨) |
| **백로그 처리** | ✅ B-1~B-6 전체 완료 (2025-12-07) |

**다음 작업 권장**: Phase 55 (AI 라벨링 자동화)

---

## 핵심 자산 (유지)

| 자산 | 위치 | 상태 |
|------|------|------|
| PDF 블록 검출 | `src/density_analyzer.py` | 완성 |
| HML 파서 | `backend/app/services/hangul/hml_parser.py` | 완성 |
| HWPX 파서 | `backend/app/services/hangul/hwpx_parser.py` | 완성 |
| 분류 체계 | `backend/app/data/classification/math_tree.json` | 완성 |
| 라벨링 시스템 | `frontend/src/pages/PageViewer.tsx` | 완성 |

---

## 현재 상태

### 완료된 Phase
- Phase 1-55: 기본 시스템 구축 완료
- Phase 56 (A-K): 모문제 워크플로우 v2 구현 완료
  - M키: 모문제 생성 + 모드 진입
  - L키: 하위문제 생성 (모문제 모드에서)
  - G키: 일반 문제 생성 (모문제 모드 자동 해제)
- Phase 56-K: displayName "고1" → "베이직쎈" 버그 수정 완료
- Phase 56-L: 자동 내보내기 안정화 완료 (100ms 지연 + 재시도 로직)
- Phase 56-M: 모문제 미연결 목록 제외 완료 (isParent 필드 추가)
- Phase 56-N: displayName 패턴 필터링 완료 (기존 데이터 호환)
- Phase 56-O: 재동기화 버튼 완료 (🔄 수동 동기화)
- Phase 56-P: 자동 백그라운드 동기화 완료 (세션 로드 시 자동)
- Phase 56-Q: 다음 문제 자동 선택 버그 수정 완료
- Phase 56-R: 해설 삭제 시 자동 연결 해제 완료
- Phase 56-S: 방어적 코딩 (undefined 에러 수정) 완료
- Phase 57: 문제은행 UI 개선 전체 완료
  - 57-A/B: [해설] 뱃지, 모달 정보 표시
  - 57-C: 문제-해설 연결 API 추가
  - 57-D: 모달 해설 이미지 통합 표시 (탭 UI)
- Phase 58: 모문제 하위문제 크로스 페이지 연결 완료
  - 58-A: Export 로직 보완 (다른 페이지 모문제 검색)
  - 58-B: XP 그룹 모문제 선택 UI (이전 페이지 모문제 표시)
- Phase 59: CRITICAL 안정성 이슈 해결 완료
  - 59-A: Race Condition 수정 (safePageChange 함수 추가)
  - 59-B: 동기화 검증 API (validate-sync 엔드포인트)
  - 59-C: API 타임아웃 추가 (기본 30초, 업로드 2분, 내보내기 1분)
- Phase 60: HIGH 안정성 이슈 해결 완료
  - 60-A: 이미지 로드 취소 처리 (PageCanvas.tsx - isLoadingFull 상태 관리 개선)
  - 60-B: 접근성 개선 (aria-label 추가 - GroupPanel, LinkedBadge)
  - 60-C: Optimistic Update (그룹 생성/삭제 롤백 로직)
  - 60-D: 페이지 이탈 방지 (beforeunload 핸들러)
- Phase 61: MEDIUM 안정성 개선 완료
  - 61-A: PageViewer 컴포넌트 분리 (usePageViewerState, PageViewerSidebar)
  - 61-B: Toast 시스템 (이미 구현됨)
  - 61-C: 상수 파일 추출 (ui.ts, timing.ts)
  - 61-D: ErrorBoundary (이미 구현됨)

---

## Phase 61-A 상세 (PageViewer 분리)

| 파일 | 역할 | 라인 수 |
|------|------|---------|
| `usePageViewerState.ts` | 상태 관리 훅 | 270줄 |
| `PageViewerSidebar.tsx` | 사이드바 UI 컴포넌트 | 104줄 |
| `PageViewer.tsx` | 메인 컴포넌트 (리팩토링) | 1311줄 (-90) |

> **참조**: [231_stability_improvement_development_plan.md](231_stability_improvement_development_plan.md)

---

## ✅ 완료: Phase 57 (문제은행 UI 개선)

> **참조**: [227_problem_bank_ui_enhancement_report.md](227_problem_bank_ui_enhancement_report.md)

### 요청 기능

| # | 기능 | 위치 | 상태 |
|---|------|------|------|
| 1 | 해설 연결된 문제에 뱃지 표시 | 오른쪽 사이드바 | ✅ |
| 2 | 모달에서 문제+해설 함께 표시 | 문제은행 이미지 탭 | ✅ |
| 3 | 교재/과정/페이지 정보 반영 | 모달 하단 정보 | ✅ |

### 구현 완료

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| **57-A** | 사이드바 해설 뱃지 추가 | ProblemListPanel.tsx | ✅ 완료 |
| **57-B** | 모달 교재/과정/페이지 정보 표시 | ProblemModal.tsx + API | ✅ 완료 |
| **57-C** | 문제-해설 연결 API 추가 | export.py | ✅ 완료 |
| **57-D** | 모달 해설 이미지 통합 표시 | ProblemModal.tsx | ✅ 완료 |

---

### Step 57-A: 사이드바 해설 뱃지

**현재**:
```
✓ 베이직쎈 · 10p · 4번
   → 해설 연결됨 (작은 텍스트)
```

**목표**:
```
✓ 베이직쎈 · 10p · 4번 [해설]  ← 뱃지
```

**수정 위치**: `ProblemListPanel.tsx` - `LinkedProblemItem` 컴포넌트

```typescript
// 뱃지 추가
<span className="px-1.5 py-0.5 text-[10px] font-medium bg-toss-blue/10 text-toss-blue rounded">
  해설
</span>
```

---

### Step 57-B: 모달 정보 표시

**현재**:
```
교재: -
과정: -
페이지: -
```

**목표**:
```
교재: 베이직쎈
과정: 공통수학1
페이지: p9
```

**수정 방안**:
1. 백엔드: 내보내기 API 응답에 `problemInfo` 포함
2. 프론트엔드: 모달에서 `problemInfo` 사용

```python
# export.py - 응답 확장
return {
  "image_path": image_path,
  "problem_info": {
    "bookName": group.get("problemInfo", {}).get("bookName"),
    "course": group.get("problemInfo", {}).get("course"),
    "page": group.get("problemInfo", {}).get("page")
  }
}
```

---

### Step 57-C: 문제-해설 연결 API

**새 엔드포인트**:
```python
GET /api/export/problems/{document_id}/{group_id}/with-solution
Response:
{
  "problem": { ... },
  "solution": {  // nullable
    "image_url": "...",
    "document_id": "...",
    "page_index": 7,
    "group_id": "..."
  }
}
```

**연결 로직**:
1. 세션에서 해당 문제의 링크 정보 조회
2. 링크 있으면 해설 이미지 URL 반환

---

### Step 57-D: 모달 해설 통합 표시

**목표 UI**:
```
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

---

### 권장 진행 순서

```
1순위: Phase 57-A + 57-B (즉시 가능, 40분)
       → 위험 없음, 즉시 효과

2순위: Phase 57-C + 57-D (2시간)
       → 데이터 연결 로직 필요
```

---

**명령어**: `Phase 57-A/B 진행해줘` 또는 `Phase 57 진행해줘`

---

## 완료됨: Phase 58 (모문제 하위문제 크로스 페이지 연결) ✅

> **참조**: [228_crosspage_child_problem_feasibility.md](228_crosspage_child_problem_feasibility.md)

### 요청 기능

모문제의 하위문제가 다음 페이지까지 이어지는 경우 크로스 페이지로 연결

```
[페이지 N]                      [페이지 N+1]
┌─────────────────┐            ┌─────────────────┐
│ 1~5의 모문제     │            │                 │
├─────────────────┤            │                 │
│ 1번, 2번, 3번   │            │                 │
├─────────────────┤            ├─────────────────┤
│ 5번 (시작)      │───XP연결───│ 5번 (계속)      │
└─────────────────┘            └─────────────────┘
```

**최종 Export 결과**:
```
┌─────────────────────────────┐
│   [모문제 이미지]           │  ← parentGroupId로 합성
├─────────────────────────────┤
│   [5번 문제 - 페이지 N]     │  ← crossPageSegments[0]
├─────────────────────────────┤
│   [5번 문제 - 페이지 N+1]   │  ← crossPageSegments[1]
└─────────────────────────────┘
```

### 현재 상태

| 기능 | 구현 상태 |
|------|----------|
| 모문제-하위문제 (parentGroupId) | ✅ 완료 |
| 크로스 페이지 (XP + crossPageSegments) | ✅ 완료 |
| 두 기능 조합 | ⚠️ 백엔드 지원, **프론트엔드 UI 없음** |

### 구현 계획

| 단계 | 내용 | 파일 | 난이도 | 예상 시간 |
|------|------|------|--------|----------|
| **58-A** | Export 로직 보완 (다른 페이지 모문제 검색) | export.py | 쉬움 | 30분 |
| **58-B** | XP 그룹 모문제 선택 UI | GroupPanel.tsx | 쉬움 | 30분 |
| **58-C** | 미리보기 확인 | - | 쉬움 | 20분 |
| **58-D** | 테스트 및 검증 | - | 쉬움 | 30분 |

**총 예상 시간**: 2시간

---

### Step 58-A: Export 로직 보완

**현재 문제**: 모문제를 같은 페이지에서만 검색

```python
# 현재 코드 (export.py)
for g in groups_data.get("groups", []):
    if g["id"] == parent_group_id:
        parent_group = g  # 같은 페이지만!
        break
```

**수정 코드**:
```python
# Phase 58-A: 다른 페이지 모문제도 검색
parent_group = None
parent_page_index = page_index

# 1. 현재 페이지에서 검색
for g in groups_data.get("groups", []):
    if g["id"] == parent_group_id:
        parent_group = g
        break

# 2. 없으면 이전 페이지들 검색 (XP 그룹의 경우)
if not parent_group and group.get("column") == "XP":
    for other_page in range(page_index - 1, -1, -1):
        other_groups_file = doc_dir / "groups" / f"page_{other_page:04d}_groups.json"
        if other_groups_file.exists():
            other_groups = load_json(other_groups_file)
            for g in other_groups.get("groups", []):
                if g["id"] == parent_group_id:
                    parent_group = g
                    parent_page_index = other_page
                    break
            if parent_group:
                break
```

---

### Step 58-B: XP 그룹 모문제 선택 UI

**위치**: `GroupPanel.tsx`

**현재**: XP 그룹에는 모문제 선택 드롭다운이 표시되지 않음

**수정**: XP 그룹에도 모문제 선택 가능하도록 UI 추가

```typescript
// GroupPanel.tsx - renderGroupItem
{/* Phase 58-B: XP 그룹도 모문제 연결 가능 */}
{!group.isParent && !group.parentGroupId && (
  <select
    className="text-xs border rounded px-1 py-0.5"
    onChange={(e) => onSetParentGroup(group.id, e.target.value)}
    defaultValue=""
  >
    <option value="">모문제 선택...</option>
    {parentGroups.map((pg) => (
      <option key={pg.id} value={pg.id}>
        {pg.problemInfo?.problemNumber || pg.id}
      </option>
    ))}
  </select>
)}
```

---

### Step 58-C: 미리보기 확인

**테스트 시나리오**:
1. 페이지 N에서 모문제 생성 (M 키)
2. 페이지 N에서 하위문제 시작 → 페이지 N+1로 XP 연결 (P 키)
3. XP 그룹에 모문제 연결 (드롭다운 선택)
4. 내보내기 후 이미지 확인

**예상 결과**: 모문제 + XP 합성 이미지 생성

---

### 제약 조건 (단순화)

| 제약 | 이유 |
|------|------|
| 모문제는 XP 소스 페이지 또는 이전 페이지에 있어야 함 | 복잡도 감소 |
| 모문제가 XP 타겟 페이지에 있는 경우 미지원 | 드문 케이스 |

---

### 권장 진행 순서

```
1순위: Phase 58-A (Export 로직) + 58-B (UI)
       → 핵심 기능 완성

2순위: Phase 58-C + 58-D (테스트)
       → 검증 및 안정화
```

---

**명령어**: `Phase 58 진행해줘`

---

## 완료된 작업: Phase 56-S (방어적 코딩 - undefined 에러 수정) ✅

> **참조**: [226_undefined_length_error_report.md](226_undefined_length_error_report.md)

### 문제 분석

**에러 메시지**:
```
TypeError: Cannot read properties of undefined (reading 'length')
at UnifiedWorkPage (http://localhost:5173/src/pages/UnifiedWorkPage.tsx?t=1765065416676:35:25)
```

**원인**: `currentSession.problems.length` 접근 시 `problems`가 `undefined`일 수 있음

**발생 위치**:
| 라인 | 코드 | Null 체크 |
|------|------|-----------|
| 154 | `currentSession?.problems.length` | ⚠️ 부분적 |
| 155 | `currentSession?.links.length` | ⚠️ 부분적 |
| **454** | `currentSession.problems.length` | ❌ **없음** |
| **519** | `currentSession.problems.length` | ❌ **없음** |
| 369, 374, 379, 384, 616 | `unlinkedProblems.length` | ❌ 없음 |

### 구현 계획

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-S-1 | 조기 반환 조건 강화 (Line 412) | UnifiedWorkPage.tsx | ✅ 완료 |
| 56-S-2 | 테스트 및 검증 | - | ✅ 완료 |

---

### Step 56-S-1: 조기 반환 조건 강화

**현재 코드** (Line 412):
```typescript
if (error || !currentSession) {
  return (...);
}
```

**수정 코드**:
```typescript
// Phase 56-S: 방어적 코딩 - problems/links undefined 체크 추가
if (error || !currentSession || !currentSession.problems || !currentSession.links) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          세션을 찾을 수 없습니다
        </h2>
        <p className="text-gray-600 mb-6">
          {error || '세션 데이터가 유효하지 않습니다'}
        </p>
        <Button variant="solid" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
```

**효과**:
- Line 454, 519의 `currentSession.problems.length` 접근이 안전해짐
- API 응답 불일치나 HMR 핫 리로드 시 상태 불일치 방지

---

### Step 56-S-2: 테스트 케이스

| 테스트 | 예상 결과 |
|--------|----------|
| 정상 세션 로드 | 문제 목록 정상 표시 |
| 세션 로드 중 HMR | 에러 페이지 대신 로딩 또는 안전한 상태 |
| 잘못된 세션 ID | "세션을 찾을 수 없습니다" 표시 |
| API 응답 불완전 | "세션 데이터가 유효하지 않습니다" 표시 |

---

**명령어**: `Phase 56-S 진행해줘`

---

## 완료된 작업: Phase 56-R (해설 삭제 시 자동 연결 해제) ✅

> **참조**: [225_solution_delete_auto_unlink_feasibility.md](225_solution_delete_auto_unlink_feasibility.md)

### 문제 분석

**현재 상황**:
```
해설 탭에서 그룹 삭제 시:
┌─────────────┐    ┌─────────────┐
│ Problem A   │───►│ Solution X  │  (링크 존재)
└─────────────┘    └─────────────┘
                          ↓
                   그룹 삭제 (groups.json에서)
                          ↓
┌─────────────┐    ┌─────────────┐
│ Problem A   │───►│ Solution X  │  (고아 링크! 😱)
└─────────────┘    └─────────────┘
                   (실제 그룹 없음)
```

**요청**:
1. 해설 그룹 삭제 시 연결된 문제 자동으로 미연결 상태로 복귀
2. 고아 링크(orphan link) 삭제

### 구현 계획

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-R-1 | removeLinkBySolutionGroupId 스토어 액션 추가 | workSessionStore.ts | ✅ 완료 |
| 56-R-2 | handleGroupDeleted 해설 탭 처리 추가 | UnifiedWorkPage.tsx | ✅ 완료 |
| 56-R-3 | 테스트 및 검증 | - | ✅ 완료 |

---

### Step 56-R-1: removeLinkBySolutionGroupId 스토어 액션

**위치**: `workSessionStore.ts`

**구현**:
```typescript
// 해설 그룹 ID로 연결 찾아서 삭제
removeLinkBySolutionGroupId: async (solutionGroupId: string) => {
  const { currentSession } = get();
  if (!currentSession) return null;

  // 해설 그룹 ID로 연결 찾기 (1:N 가능성 고려)
  const linksToRemove = currentSession.links.filter(
    l => l.solutionGroupId === solutionGroupId
  );

  if (linksToRemove.length === 0) {
    console.log('[Phase 56-R] No links found for solution:', solutionGroupId);
    return [];
  }

  // 각 연결 삭제
  const unlinkedProblems: Array<{ groupId: string; problemNumber: string }> = [];
  for (const link of linksToRemove) {
    try {
      await api.deleteSessionLink(currentSession.sessionId, link.problemGroupId);
      const problem = currentSession.problems.find(p => p.groupId === link.problemGroupId);
      if (problem) {
        unlinkedProblems.push({
          groupId: link.problemGroupId,
          problemNumber: problem.problemNumber,
        });
      }
    } catch (error) {
      console.error('[Phase 56-R] Failed to remove link:', link.problemGroupId, error);
    }
  }

  // 세션 갱신
  const updated = await api.getWorkSession(currentSession.sessionId);
  set({ currentSession: updated });

  console.log('[Phase 56-R] Unlinked problems:', unlinkedProblems);
  return unlinkedProblems;
},
```

**인터페이스 추가**:
```typescript
// 해설 삭제로 인한 연결 해제
removeLinkBySolutionGroupId: (solutionGroupId: string) => Promise<
  Array<{ groupId: string; problemNumber: string }> | null
>;
```

---

### Step 56-R-2: handleGroupDeleted 해설 탭 처리

**위치**: `UnifiedWorkPage.tsx` (라인 178-190)

**현재 코드**:
```typescript
const handleGroupDeleted = useCallback(async (groupId: string, pageIndex: number) => {
  console.log('[Phase 39] Group deleted:', groupId, 'page:', pageIndex);

  if (activeTab === 'problem') {
    try {
      await removeProblem(groupId);
      showToast('문제가 삭제되었습니다', 'info');
    } catch (error) {
      console.error('[Phase 39] Failed to remove problem:', error);
    }
  }
  // 해설 탭에서 삭제 시: 연결만 끊어지면 되는데, 이미 연결이 문제 기준이므로 추가 처리 불필요
}, [activeTab, removeProblem, showToast]);
```

**수정 코드**:
```typescript
const handleGroupDeleted = useCallback(async (groupId: string, pageIndex: number) => {
  console.log('[Phase 39] Group deleted:', groupId, 'page:', pageIndex);

  if (activeTab === 'problem') {
    try {
      await removeProblem(groupId);
      showToast('문제가 삭제되었습니다', 'info');
    } catch (error) {
      console.error('[Phase 39] Failed to remove problem:', error);
    }
  } else if (activeTab === 'solution') {
    // Phase 56-R: 해설 삭제 시 연결 자동 해제
    try {
      const unlinkedProblems = await removeLinkBySolutionGroupId(groupId);
      if (unlinkedProblems && unlinkedProblems.length > 0) {
        const names = unlinkedProblems.map(p => p.problemNumber).join(', ');
        showToast(`${names}번 연결이 해제되었습니다`, 'info');

        // 첫 번째 해제된 문제 자동 선택 (빠른 재연결 가능)
        selectProblem(unlinkedProblems[0].groupId);
      }
    } catch (error) {
      console.error('[Phase 56-R] Failed to unlink:', error);
    }
  }
}, [activeTab, removeProblem, removeLinkBySolutionGroupId, selectProblem, showToast]);
```

---

### Step 56-R-3: 테스트 케이스

| 테스트 | 예상 결과 |
|--------|----------|
| 연결된 해설 삭제 | 문제 연결 해제 + Toast + 문제 자동 선택 |
| 연결 없는 해설 삭제 | 아무 일 없음 |
| 1:N (동일 해설 여러 문제) | 모든 문제 연결 해제 |
| 삭제 후 미연결 목록 확인 | 해제된 문제가 미연결 목록에 표시 |

---

**예상 시간**: 25분

---

## 완료된 작업: Phase 56-M (모문제 미연결 목록 제외) ✅

### 문제 분석
> **참조**: [223_parent_problem_cleanup_options.md](223_parent_problem_cleanup_options.md)

- **증상**: 미연결 문제 목록에 "(모문제)번" 항목들 표시됨
- **원인**: 모문제는 해설 연결이 불필요한데 미연결 목록에 표시됨
- **영향**: 114개의 불필요한 항목이 사이드바 표시

### 구현 완료

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-M-1 | ProblemReference에 isParent 필드 추가 | work_session.py | ✅ 완료 |
| 56-M-2 | sync_manager에서 isParent 동기화 | sync_manager.py | ✅ 완료 |
| 56-M-3 | getUnlinkedProblems에서 isParent 필터링 | workSessionStore.ts | ✅ 완료 |

---

## 완료된 작업: Phase 56-N/O/P (모문제 정리 기능) ✅

### 해결된 문제
> **참조**: [223_parent_problem_cleanup_options.md](223_parent_problem_cleanup_options.md)

- **문제**: 기존 세션 데이터에는 isParent 필드가 없음
- **증상**: "(모문제)번" 항목들이 미연결 목록에 표시됨
- **해결**: 3단계 정리 기능 구현 완료

### Phase 56-N: displayName 패턴 필터링 (즉시, 5분)

**목표**: "(모문제)" 패턴으로 프론트엔드에서 추가 필터링

```typescript
// workSessionStore.ts 수정
getUnlinkedProblems: () => {
  const { currentSession } = get();
  if (!currentSession) return [];
  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));
  return currentSession.problems.filter((p) =>
    !linkedIds.has(p.groupId) &&
    !p.isParent &&
    // Phase 56-N: displayName 패턴으로 추가 필터링
    !p.displayName?.includes('(모문제)') &&
    !p.problemNumber?.includes('모문제')
  );
},
```

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-N-1 | displayName "(모문제)" 패턴 필터링 | workSessionStore.ts | ✅ 완료 |

**효과**: 즉시 화면에서 숨김 (데이터는 유지)

---

### Phase 56-O: 재동기화 버튼 추가 (단기, 30분)

**목표**: 사이드바에 🔄 버튼 추가하여 isParent 필드 갱신

**UI 위치**:
```
┌─────────────────────────┐
│ 미연결 문제    114  🔄  │  ← 클릭 시 재동기화
├─────────────────────────┤
```

**API 추가**:
```python
# work_sessions.py
@router.post("/{session_id}/sync-parent-flags")
async def sync_parent_flags(session_id: str):
    """
    세션의 모든 problems에 대해 groups.json에서 isParent 읽어서 업데이트
    """
    # 1. 세션 로드
    # 2. 각 problem의 documentId, pageIndex로 groups.json 읽기
    # 3. isParent 필드 업데이트
    # 4. 세션 저장
```

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-O-1 | sync-parent-flags API 엔드포인트 추가 | work_sessions.py | ✅ 완료 |
| 56-O-2 | API 클라이언트 추가 | client.ts, workSessionStore.ts | ✅ 완료 |
| 56-O-3 | 사이드바에 🔄 버튼 추가 | ProblemListPanel.tsx | ✅ 완료 |

**효과**: 사용자가 수동으로 데이터 정리 가능

---

### Phase 56-P: 자동 백그라운드 동기화 (장기, 1시간)

**목표**: 세션 로드 시 자동으로 isParent 동기화

```typescript
// workSessionStore.ts - loadSession 수정
loadSession: async (sessionId: string) => {
  set({ isLoading: true });
  try {
    const session = await api.getWorkSession(sessionId);

    // Phase 56-P: 자동으로 isParent 동기화
    await api.syncParentFlags(sessionId);
    const refreshedSession = await api.getWorkSession(sessionId);

    set({ currentSession: refreshedSession, error: null });
  } finally {
    set({ isLoading: false });
  }
},
```

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-P-1 | loadSession에서 자동 동기화 호출 | workSessionStore.ts | ✅ 완료 |
| 56-P-2 | 성능 최적화 (변경사항 있을 때만 저장) | work_sessions.py | ✅ 완료 |

**효과**: 사용자 개입 없이 완벽한 UX

---

## 완료된 작업: Phase 56-Q (다음 문제 자동 선택 버그 수정) ✅

> **참조**: [224_auto_next_problem_bug_report.md](224_auto_next_problem_bug_report.md)

### 문제
- **증상**: 문제-해설 연결 후 **다음 문제가 아닌 첫 번째 문제**로 이동
- **원인**: `selectNextUnlinkedProblem()`에서 연결 완료된 문제를 찾지 못해 index=-1

### 버그 원인 분석
```
호출 순서:
┌──────────────────────────────────────────────────────────────┐
│ 1. createLink() 호출                                         │
│    → links에 새 연결 추가됨                                   │
│    → selectedProblemId는 연결된 문제 ID 유지                   │
├──────────────────────────────────────────────────────────────┤
│ 2. selectNextUnlinkedProblem() 호출                           │
│    → unlinked 배열에서 현재 문제 검색                          │
│    → findIndex() = -1 (❌ 이미 연결되어 못 찾음!)              │
│    → nextIndex = 0 (항상 첫 번째로 이동)                       │
└──────────────────────────────────────────────────────────────┘
```

### 수정 계획

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-Q-1 | selectNextUnlinkedProblem 로직 수정 | workSessionStore.ts | ✅ 완료 |
| 56-Q-2 | Phase 56-M/N 필터링 추가 | workSessionStore.ts | ✅ 완료 |
| 56-Q-3 | 테스트 및 검증 | - | ✅ 완료 |

---

### Step 56-Q-1: selectNextUnlinkedProblem 로직 수정

**문제**: 연결 후 `unlinked` 배열에서 현재 문제를 찾지 못함

**해결**: 전체 `problems` 배열에서 현재 위치 기준으로 다음 미연결 문제 찾기

```typescript
// workSessionStore.ts - selectNextUnlinkedProblem 수정
selectNextUnlinkedProblem: () => {
  const { currentSession, selectedProblemId } = get();
  if (!currentSession) return;

  const linkedIds = new Set(currentSession.links.map((l) => l.problemGroupId));

  // Phase 56-Q: 유효한 문제 판별 함수 (모문제 제외)
  const isValidProblem = (p: ProblemReference) =>
    !linkedIds.has(p.groupId) &&
    !p.isParent &&
    !p.displayName?.includes('(모문제)') &&
    !p.problemNumber?.includes('모문제');

  const allProblems = currentSession.problems;

  // 전체 배열에서 현재 위치 찾기 (연결된 문제도 찾을 수 있음)
  const currentIndex = allProblems.findIndex((p) => p.groupId === selectedProblemId);

  if (currentIndex === -1) {
    // 현재 문제를 못 찾으면 첫 번째 미연결로
    const first = allProblems.find(isValidProblem);
    set({ selectedProblemId: first?.groupId || null });
    return;
  }

  // 현재 위치 이후에서 첫 번째 미연결 문제 찾기
  for (let i = currentIndex + 1; i < allProblems.length; i++) {
    if (isValidProblem(allProblems[i])) {
      set({ selectedProblemId: allProblems[i].groupId });
      console.log('[Phase 56-Q] Next problem:', allProblems[i].problemNumber);
      return;
    }
  }

  // 끝까지 못 찾으면 처음부터 검색 (순환)
  for (let i = 0; i < currentIndex; i++) {
    if (isValidProblem(allProblems[i])) {
      set({ selectedProblemId: allProblems[i].groupId });
      console.log('[Phase 56-Q] Next problem (wrapped):', allProblems[i].problemNumber);
      return;
    }
  }

  // 모든 문제가 연결됨
  set({ selectedProblemId: null });
  console.log('[Phase 56-Q] All problems linked!');
},
```

---

### Step 56-Q-2: Phase 56-M/N 필터링 통합

**문제**: `selectNextUnlinkedProblem`에서 모문제 필터링 누락

**해결**: `isValidProblem` 헬퍼 함수로 필터링 로직 통합

이미 Step 56-Q-1 코드에 포함됨:
```typescript
const isValidProblem = (p: ProblemReference) =>
  !linkedIds.has(p.groupId) &&
  !p.isParent &&                              // Phase 56-M
  !p.displayName?.includes('(모문제)') &&      // Phase 56-N
  !p.problemNumber?.includes('모문제');        // Phase 56-N
```

---

### Step 56-Q-3: 테스트 케이스

| 테스트 | 예상 결과 |
|--------|----------|
| 중간 문제(10번) 연결 | 11번으로 이동 (다음 미연결) |
| 마지막 문제 연결 | 첫 번째 미연결로 순환 |
| 모문제 다음 문제 연결 | 모문제 건너뛰고 다음으로 |
| 모든 문제 연결 | selectedProblemId = null |

---

**예상 시간**: 20분

---

## 완료된 작업: Phase 56-L (자동 내보내기 안정화) ✅

### 문제 분석
> **참조**: [221_auto_export_failure_analysis.md](221_auto_export_failure_analysis.md)

- **증상**: 가끔 "자동 등록에 실패했습니다" 토스트 표시
- **원인**: `saveImmediately()`와 `exportGroup()` API 호출 사이의 Race Condition
- **영향**: 그룹 데이터는 보존됨, 이미지만 미생성

### 구현 완료

| 단계 | 내용 | 파일 | 상태 |
|------|------|------|------|
| 56-L-1 | 저장 후 100ms 지연 추가 | PageViewer.tsx | ✅ 완료 |
| 56-L-2 | 재시도 로직 추가 (3회, 지수 백오프) | PageViewer.tsx | ✅ 완료 |
| 56-L-3 | 에러 메시지 개선 (404 구분) | PageViewer.tsx | ✅ 완료 |

### 상세 구현 계획

#### Step 56-L-1: 저장 후 지연 추가
```typescript
// PageViewer.tsx handleCreateGroup 수정 (라인 786-788)
try {
  await saveImmediately(updatedGroups, currentPage);

  // Phase 56-L: 파일 시스템 반영 대기 (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  await api.exportGroup(documentId, currentPage, newGroupId);
  // ...
}
```

#### Step 56-L-2: 재시도 로직 (선택)
```typescript
// client.ts - exportWithRetry 함수 추가
const exportWithRetry = async (
  documentId: string,
  page: number,
  groupId: string,
  maxRetries = 3
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await api.exportGroup(documentId, page, groupId);
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 200 * (i + 1)));
      } else {
        throw error;
      }
    }
  }
};
```

#### Step 56-L-3: 에러 메시지 개선
```typescript
// PageViewer.tsx catch 블록 수정 (라인 809-813)
} catch (error) {
  console.error('[Phase 33-C] Auto-export failed:', error);

  // Phase 56-L: 구체적인 에러 메시지
  const errorMessage = error.response?.status === 404
    ? '그룹 저장 지연으로 실패했습니다. 잠시 후 다시 시도해주세요.'
    : '자동 등록에 실패했습니다. 수동으로 확정해주세요.';

  showToast(errorMessage, { type: 'warning' });
}
```

---

## 진행 예정: Phase 59-61 (안정성 개선)

> **리뷰 보고서**: [230_uiux_stability_comprehensive_review.md](230_uiux_stability_comprehensive_review.md)
> **상세 계획**: [231_stability_improvement_development_plan.md](231_stability_improvement_development_plan.md)

### Phase 59: CRITICAL 이슈 해결 (2.5시간)

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| **59-A** | Race Condition 수정 (페이지 전환 시) | PageViewer.tsx | 1시간 |
| **59-B** | 동기화 검증 API | work_sessions.py | 1시간 |
| **59-C** | API 타임아웃 추가 | api/client.ts | 30분 |

### Phase 60: HIGH 이슈 해결 (4시간)

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| **60-A** | 이미지 로드 취소 처리 | PageCanvas.tsx | 30분 |
| **60-B** | 접근성 개선 (aria-label) | 전체 버튼/모달 | 2시간 |
| **60-C** | Optimistic Update | 그룹 CRUD | 1시간 |
| **60-D** | 페이지 이탈 방지 | PageViewer.tsx | 30분 |

### Phase 61: MEDIUM 이슈 해결 (6시간)

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| **61-A** | PageViewer 컴포넌트 분리 | PageViewer.tsx → 5개 파일 | 3시간 |
| **61-B** | Toast 메시지 표준화 | 전체 | 1시간 |
| **61-C** | 상수 파일 추출 | 전체 | 1시간 |
| **61-D** | ErrorBoundary 추가 | App.tsx | 1시간 |

---

**명령어**: `Phase 59 진행해줘` 또는 `Phase 59-A 진행해줘`

---

## 🚀 진행 예정: Phase 62 (코드 품질 개선)

> **기반**: 2025-12-07 UI/UX 및 안정성 검토 결과
> **상세 계획**: [232_phase62cd_file_separation_plan.md](232_phase62cd_file_separation_plan.md)

### ✅ Phase 62-A: TypeScript 에러 수정 완료

**결과**: 50개 → 0개 (전체 수정 완료)

---

### ✅ Phase 62-B: 색상 통일 완료

**결과**: `gray-` → `grey-` (63개 파일, ~1,090개 수정)

---

### ✅ Phase 62-C: PageViewer 추가 분리 완료

**결과**: 3개 훅 생성 완료 (빌드 테스트 통과)

| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `usePageViewerKeyboard.ts` | 키보드 단축키 (Ctrl+S, Arrow, G, M, L 등) | ~300줄 |
| `usePageViewerCrossPage.ts` | 크로스페이지 그룹 생성 로직 | ~270줄 |
| `usePageViewerGroups.ts` | 그룹 CRUD (생성/삭제/수정/확정) | ~300줄 |
| `hooks/index.ts` | 훅 export 통합 | ~25줄 |

> **참조**: [232_phase62cd_file_separation_plan.md](232_phase62cd_file_separation_plan.md)

---

### ✅ Phase 62-D: GroupPanel 분리 완료

**결과**: 2개 컴포넌트 생성 완료 (빌드 테스트 통과)

| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `GroupEditForm.tsx` | 문항 정보 편집 폼 | ~140줄 |
| `GroupCard.tsx` | 그룹 카드 표시 컴포넌트 | ~290줄 |
| `group/index.ts` | 컴포넌트 export 통합 | ~12줄 |

---

### 권장 진행 순서

```
1순위: Phase 62-A (TypeScript 에러) - 30분
       → 빌드 안정성

2순위: Phase 62-B (색상 통일) - 15분
       → 디자인 일관성

3순위: Phase 62-C/D (분리) - 3시간
       → 필요 시 진행
```

---

**명령어**: `Phase 62 진행해줘` 또는 `Phase 62-A 진행해줘`

---

## ✅ 완료: Phase 63 (문제 그룹 연결 표시 수정)

> **발견일**: 2025-12-07
> **원인 분석**: 리포트 참조

### 문제 현상

문제 문서 페이지에서 사이드바에 **1번 문제만** 연결 배지가 표시되고, **2~12번 문제는** 연결 배지 미표시

### 원인 분석

```
[데이터 저장 위치]
session.links[]           ← 모든 연결 정보 저장됨 (12개 모두 존재) ✅
문제 groups.json          ← link 필드 없음 ❌
해설 groups.json          ← link 필드 동기화됨 ✅

[동기화 프로세스]
sync_links_to_groups()    → 해설 문서만 동기화
                          → 문제 문서 동기화 없음

[UI 표시]
GroupCard → group.link    → undefined → 배지 미표시
```

### 해결 방안

| 옵션 | 방식 | 장점 | 단점 |
|------|------|------|------|
| **A** | 백엔드에서 문제 groups.json에도 link 동기화 | 데이터 영구 저장 | 데이터 중복, SSOT 위반 |
| **B (권장)** | 프론트엔드에서 session.links로 실시간 enrichment | SSOT 유지, 간단 | 세션 없으면 미표시 |

### 구현 계획 (옵션 B)

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| **63-A** | enrichGroupsWithLinks 유틸 함수 생성 | utils/groupUtils.ts | 20분 |
| **63-B** | PageViewer에서 그룹 enrichment 적용 | PageViewer.tsx | 15분 |
| **63-C** | 테스트 및 검증 | - | 10분 |

**총 예상 시간**: 45분

---

### Step 63-A: enrichGroupsWithLinks 유틸 함수

```typescript
// utils/groupUtils.ts
import type { ProblemGroup, WorkSession } from '../api/client';

export function enrichGroupsWithLinks(
  groups: ProblemGroup[],
  session: WorkSession | null
): ProblemGroup[] {
  if (!session?.links) return groups;

  // problemGroupId → link 맵핑
  const linkMap = new Map(
    session.links.map(l => [l.problemGroupId, {
      linkType: 'problem' as const,
      linkedGroupId: l.solutionGroupId,
      linkedDocumentId: l.solutionDocumentId,
      linkedPageIndex: l.solutionPageIndex,
      linkedName: `해설 ${l.solutionGroupId}`,
      linkedAt: l.linkedAt,
    }])
  );

  return groups.map(g => ({
    ...g,
    link: linkMap.get(g.id) || g.link,
  }));
}
```

---

### Step 63-B: PageViewer 적용

```typescript
// PageViewer.tsx
import { enrichGroupsWithLinks } from '../utils/groupUtils';

// localGroups를 enriched 버전으로 전달
const enrichedGroups = useMemo(() =>
  enrichGroupsWithLinks(localGroups, currentSession),
  [localGroups, currentSession]
);

// GroupPanel에 전달
<GroupPanel groups={enrichedGroups} ... />
```

---

**명령어**: `Phase 63 진행해줘`

---

## 백로그 (우선순위순)

### 완료됨 (2025-12-07)
| ID | 작업 | 설명 | 결과 |
|----|------|------|------|
| ~~B-1~~ | ✅ 모문제 이미지 export 분석 | 모문제 export 동작 검토 | **개선 불필요** - 현재 동작 적절 |
| ~~B-2~~ | ✅ 세션 동기화 최적화 | 페이지 이동 시 동기화 지연 | 체크 간격 15초, 포커스 시 즉시 체크 |
| ~~B-3~~ | ✅ Axios 타임아웃 설정 | 무한 대기 방지 | Phase 59-C에서 이미 구현됨 |
| ~~B-4~~ | ✅ 에러 로깅 개선 | Backend 에러 상세 로깅 | `main.py` logging + error_id |
| ~~B-5~~ | ✅ 통합 API 설계 | save-and-export 단일 엔드포인트 | `blocks.py` + `client.ts` |
| ~~B-6~~ | ✅ 오프라인 모드 | 네트워크 끊김 시 로컬 저장 | 훅 + 스토리지 + UI 구현 |

### 낮음
| ID | 작업 | 설명 | 예상 시간 |
|----|------|------|----------|
| B-7 | 배치 내보내기 | 여러 그룹 한번에 export | 1시간 |

---

## 미래 개발 로드맵

### Phase 55: AI 즉시 자동화 - Gemini/Claude API

> **참조**: [208_ai_auto_labeling_plan.md](208_ai_auto_labeling_plan.md)

**선행 조건**: 없음 (지금 바로 가능)
**예상 시간**: 12시간
**비용**: 책 1권당 ~1,000원

| 단계 | 내용 | 시간 | 상태 |
|------|------|------|------|
| 55-A | AI 문제 분석 API 연동 (Gemini/Claude) | 4시간 | 대기 |
| 55-B | AI 해설 분석 API 연동 | 2시간 | 대기 |
| 55-C | 자동 매칭 로직 (문제-해설 연결) | 2시간 | 대기 |
| 55-D | 검토/수정 UI | 4시간 | 대기 |

**효과**: 라벨링 시간 80분 → 12분 (85% 절약)

---

### Phase 60: 딥러닝 자체 학습 (미래)

> **참조**: [reference/ai_automation/](reference/ai_automation/)

**선행 조건**: 100+ 페이지 라벨링 완료
**현재 상태**: 70+ 페이지 라벨링됨

| 단계 | 내용 | 상태 |
|------|------|------|
| 60-A | YOLO 내보내기 스크립트 | 대기 |
| 60-B | Roboflow 연동 | 대기 |
| 60-C | YOLOv8 모델 학습 | 대기 |
| 60-D | AI 자동화 웹앱 | 대기 |

---

### Phase 61-64: 코드 모듈화 (미래)

> **참조**: [reference/architecture/158_modularization_feasibility_report.md](reference/architecture/158_modularization_feasibility_report.md)

**목표**: 대형 파일 분리 (41개 파일 300줄 초과)

| 단계 | 내용 | 상태 |
|------|------|------|
| 61 | Frontend P0 모듈화 (client.ts, PageViewer.tsx) | 대기 |
| 62 | Backend P0 모듈화 (export.py, hangul.py) | 대기 |
| 63 | Frontend P1-P2 모듈화 | 대기 |
| 64 | Backend P1-P2 모듈화 | 대기 |

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [220_phase56k_bookname_bug_report.md](220_phase56k_bookname_bug_report.md) | displayName 버그 분석 |
| [221_auto_export_failure_analysis.md](221_auto_export_failure_analysis.md) | 자동 내보내기 실패 분석 |
| [208_ai_auto_labeling_plan.md](208_ai_auto_labeling_plan.md) | AI 자동 라벨링 계획 |
| [209_phase56_parent_problem_manual_plan.md](209_phase56_parent_problem_manual_plan.md) | 모문제 수동 연결 계획 |

---

## 명령어 가이드

| 명령어 | 용도 |
|--------|------|
| `Phase 55 진행해줘` | AI 자동 라벨링 (12시간) |
| `B-1 진행해줘` | 백로그 항목 작업 시작 |
| `에러야 + 로그` | 디버깅 요청 |
| `opus thinkharder` | 깊은 분석, 리포트 작성 |

---

## 실행 로그

### 2025-12-07 (심야)
- [x] 문제 연결 표시 버그 조사 및 리포트 작성
  - 증상: 문제 1번만 연결 배지 표시, 2~12번 미표시
  - 원인: session.links에는 12개 모두 저장됨 (연결 정상)
  - 근본 원인: sync_links_to_groups()가 해설 문서만 동기화
  - 문제 문서 groups.json에 link 필드 미동기화
- [x] Phase 63 개발 계획 수립 (연결 배지 버그 수정)
  - 옵션 B 권장: 프론트엔드에서 session.links로 실시간 enrichment
  - 예상 시간: 45분
- [x] **Phase 63 구현 완료** (연결 배지 버그 수정)
  - 63-A: `utils/groupUtils.ts` 생성 (enrichGroupsWithLinks 함수)
  - 63-B: PageViewer.tsx에서 그룹 enrichment 적용
  - 63-C: TypeScript 빌드 테스트 통과
- [x] plan.md 업데이트
- [x] **백로그 B-1~B-6 전체 처리 완료**
  - B-1: 모문제 export 분석 → 개선 불필요 확인
  - B-2: 세션 동기화 최적화 → useAutoSync 체크 간격 15초, 포커스 체크
  - B-3: Axios 타임아웃 → Phase 59-C에서 이미 구현 확인
  - B-4: 에러 로깅 개선 → main.py logging 설정 + error_id
  - B-5: 통합 API → save-and-export 엔드포인트 추가
  - B-6: 오프라인 모드 구현 완료
    - `useOnlineStatus.ts` - 온라인/오프라인 감지 훅
    - `offlineStorage.ts` - LocalStorage/IndexedDB 서비스
    - `useOfflineQueue.ts` - 오프라인 작업 큐 관리 훅
    - `OfflineIndicator.tsx` - 상태 표시 UI 컴포넌트

### 2025-12-07 (밤)
- [x] Phase 62-A: TypeScript 에러 수정 완료 (18개 → 0개)
- [x] Phase 62-B: 색상 통일 완료 (gray → grey, 63개 파일 수정)
- [x] Phase 57-C: 문제-해설 연결 API 추가 (export.py)
- [x] Phase 57-D: 모달 해설 이미지 통합 표시
  - 탭 UI (문제/해설 전환)
  - 해설 연결 뱃지 표시
  - 해설 상세정보 표시
- [x] Phase 62-C: PageViewer 훅 분리 완료
  - usePageViewerKeyboard.ts (키보드 단축키)
  - usePageViewerCrossPage.ts (크로스페이지 로직)
  - usePageViewerGroups.ts (그룹 CRUD)
  - hooks/index.ts (export 통합)
  - 빌드 테스트 통과
- [x] Phase 62-D: GroupPanel 컴포넌트 분리 완료
  - GroupEditForm.tsx (편집 폼)
  - GroupCard.tsx (그룹 카드)
  - group/index.ts (export 통합)
  - 빌드 테스트 통과

### 2025-12-07 (저녁)
- [x] TypeScript 에러 수정 (50개 → 18개)
  - Button.tsx: primary, secondary, warning 변형 추가
  - Badge.tsx: color → colorScheme 변경
  - workSessionStore.ts: WorkSession 타입 재export
  - ProblemBankHub.tsx: import 경로 대소문자 수정
  - GroupPanel.tsx: pageIndex null 체크
- [x] UI/UX 철학 및 안정성 전체 검토
  - 잘 된 부분: 토스 디자인, Optimistic Update, beforeunload 등
  - 개선 가능: 색상 통일 (gray/grey), 파일 분리
- [x] Phase 62 개발 계획 수립 (코드 품질 개선)
- [x] plan.md v2.1 업데이트

### 2025-12-07 (오전)
- [x] Phase 56-K: displayName "고1" → "베이직쎈" 버그 수정
- [x] 221_auto_export_failure_analysis.md 작성
- [x] Phase 56-L: 자동 내보내기 안정화 완료
  - 100ms 지연 추가 (파일 시스템 반영 대기)
  - 3회 재시도 로직 (지수 백오프: 150ms, 300ms)
  - 구체적인 에러 메시지 (404 에러 구분)
- [x] 222_server_start_failure_analysis.md 작성
- [x] start_dev.bat, stop_dev.bat 배치 파일 생성
- [x] Phase 56-M: 모문제 미연결 목록 제외 완료
  - ProblemReference에 isParent 필드 추가
  - sync_manager에서 isParent 동기화
  - getUnlinkedProblems에서 isParent 필터링
- [x] 223_parent_problem_cleanup_options.md 작성
- [x] Phase 56-N/O/P 개발 계획 수립
- [x] Phase 56-N: displayName 패턴 필터링 완료
  - getUnlinkedProblems에 "(모문제)" 패턴 필터링 추가
  - useUnlinkedProblems 훅에도 동일 필터링 추가
- [x] Phase 56-O: 재동기화 버튼 추가 완료
  - sync-parent-flags API 엔드포인트 (work_sessions.py)
  - API 클라이언트 (client.ts, workSessionStore.ts)
  - 사이드바 🔄 버튼 (ProblemListPanel.tsx)
- [x] Phase 56-P: 자동 백그라운드 동기화 완료
  - loadSession에서 syncParentFlags 자동 호출
  - 성능 최적화 (변경사항 있을 때만 저장)
- [x] 224_auto_next_problem_bug_report.md 작성
- [x] Phase 56-Q: 다음 문제 자동 선택 버그 수정 완료
  - selectNextUnlinkedProblem 로직 전면 수정
  - 전체 problems 배열 기준 다음 문제 찾기
  - Phase 56-M/N 필터링 통합 (모문제 건너뛰기)
- [x] 225_solution_delete_auto_unlink_feasibility.md 작성
- [x] Phase 56-R: 해설 삭제 시 자동 연결 해제 완료
  - removeLinkBySolutionGroupId 스토어 액션 추가
  - handleGroupDeleted 해설 탭 처리 추가
  - 1:N 연결 지원 (동일 해설 여러 문제 연결 시 모두 해제)
  - 해제된 문제 자동 선택 (빠른 재연결 가능)
- [x] 226_undefined_length_error_report.md 작성
- [x] Phase 56-S: 방어적 코딩 (undefined 에러 수정) 완료
  - 조기 반환 조건에 !currentSession.problems || !currentSession.links 추가
  - Line 454, 519의 currentSession.problems.length 접근 안전화
- [x] 227_problem_bank_ui_enhancement_report.md 작성
- [ ] Phase 57 개발 계획 수립 (문제은행 UI 개선)

### 2025-12-06
- [x] Phase 56 (A-J): 모문제 워크플로우 v2 구현
- [x] v2.0 프로젝트 구조 정리

---

*다음 단계: Phase 56-P (자동 백그라운드 동기화) 또는 다른 작업*
