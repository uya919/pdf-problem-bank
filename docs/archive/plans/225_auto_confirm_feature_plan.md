# 자동 확정 및 일괄 확정 기능 개발 계획

**문서 번호**: 225
**작성일**: 2025-12-09
**관련 이슈**: 224_problem_bank_display_error_report.md

---

## 목표

라벨링 워크플로우에서 "내보내기(확정)" 단계 누락 문제 해결

---

## Phase 58: 미확정 상태 시각적 경고

### 58-A: 그룹 카드 상태 표시

**목표**: 그룹이 확정되었는지 한눈에 파악

**변경 파일**:
- `frontend/src/components/GroupPanel.tsx`

**작업 내용**:
```tsx
// 그룹 카드에 상태 뱃지 추가
<div className="group-card">
  <span className="problem-number">1번</span>

  {/* 상태 뱃지 */}
  {group.status === 'confirmed' ? (
    <Badge variant="success">확정됨</Badge>
  ) : (
    <Badge variant="warning">미확정</Badge>  // ← 노란색 경고
  )}

  {/* 해설 연결 뱃지 */}
  {hasLinkedSolution && (
    <Badge variant="info">해설</Badge>
  )}
</div>
```

**예상 소요**: 30분

---

### 58-B: 페이지 헤더에 미확정 개수 표시

**목표**: 현재 페이지에서 확정 필요한 문제 수 표시

**변경 파일**:
- `frontend/src/pages/PageViewer.tsx`

**작업 내용**:
```tsx
// 페이지 상단에 통계 표시
<div className="page-stats">
  <span>총 {totalGroups}개</span>
  <span className="text-green-600">확정 {confirmedCount}개</span>
  {pendingCount > 0 && (
    <span className="text-orange-500 animate-pulse">
      ⚠️ 미확정 {pendingCount}개
    </span>
  )}
</div>
```

**예상 소요**: 30분

---

## Phase 59: 페이지 단위 일괄 확정

### 59-A: 일괄 확정 버튼 UI

**목표**: 현재 페이지의 모든 미확정 문제를 한 번에 확정

**변경 파일**:
- `frontend/src/pages/PageViewer.tsx`
- `frontend/src/components/GroupPanel.tsx`

**작업 내용**:
```tsx
// 페이지 헤더에 일괄 확정 버튼
<div className="page-actions">
  <Button
    onClick={handleBulkConfirm}
    disabled={pendingCount === 0}
    variant="primary"
  >
    <CheckSquare className="w-4 h-4 mr-2" />
    미확정 {pendingCount}개 모두 확정
  </Button>
</div>
```

**예상 소요**: 1시간

---

### 59-B: 일괄 확정 API

**목표**: 여러 그룹을 한 번에 확정하는 백엔드 API

**변경 파일**:
- `backend/app/routers/export.py`

**새 엔드포인트**:
```python
@router.post("/documents/{document_id}/pages/{page_index}/bulk-export")
async def bulk_export_groups(
    document_id: str,
    page_index: int,
    group_ids: Optional[List[str]] = None  # None이면 전체
):
    """
    페이지 내 여러 그룹을 일괄 내보내기

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_ids: 특정 그룹만 (생략 시 전체 미확정)

    Returns:
        {
            "success": true,
            "exported_count": 12,
            "failed_count": 0,
            "results": [...]
        }
    """
```

**예상 소요**: 1시간

---

### 59-C: 프론트엔드 Hook 및 연동

**변경 파일**:
- `frontend/src/api/client.ts`
- `frontend/src/hooks/useDocuments.ts`

**작업 내용**:
```typescript
// API 클라이언트
bulkExportGroups: async (
  documentId: string,
  pageIndex: number,
  groupIds?: string[]
) => {
  const response = await apiClient.post(
    `/api/export/documents/${documentId}/pages/${pageIndex}/bulk-export`,
    { group_ids: groupIds }
  );
  return response.data;
}

// Hook
export function useBulkExportGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, pageIndex, groupIds }) =>
      api.bulkExportGroups(documentId, pageIndex, groupIds),
    onSuccess: (_, variables) => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries(['groups', variables.documentId]);
      queryClient.invalidateQueries(['allExportedProblems']);
    }
  });
}
```

**예상 소요**: 45분

---

## Phase 60: 자동 확정 옵션

### 60-A: 설정 UI 추가

**목표**: 문제번호 입력 시 자동 확정 여부를 사용자가 선택

**변경 파일**:
- `frontend/src/components/GroupPanel.tsx` (또는 설정 모달)
- `frontend/src/stores/settingsStore.ts`

**작업 내용**:
```tsx
// 설정 스토어
interface LabelingSettings {
  autoConfirmOnNumber: boolean;  // 문제번호 입력 시 자동 확정
  autoConfirmOnSolutionLink: boolean;  // 해설 연결 시 자동 확정
}

// 설정 UI
<div className="settings-section">
  <h3>자동 확정 설정</h3>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={settings.autoConfirmOnNumber}
      onChange={(e) => updateSetting('autoConfirmOnNumber', e.target.checked)}
    />
    <span>문제번호 입력 시 자동으로 문제은행에 등록</span>
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={settings.autoConfirmOnSolutionLink}
      onChange={(e) => updateSetting('autoConfirmOnSolutionLink', e.target.checked)}
    />
    <span>해설 연결 시 자동으로 문제은행에 등록</span>
  </label>
</div>
```

**예상 소요**: 1시간

---

### 60-B: 자동 확정 로직 구현

**목표**: 설정에 따라 문제번호/해설 연결 시 자동으로 확정 API 호출

**변경 파일**:
- `frontend/src/components/ProblemInfoModal.tsx` (문제번호 입력)
- `frontend/src/pages/SolutionLinkingPage.tsx` (해설 연결)

**작업 내용**:
```typescript
// 문제번호 저장 시
const handleSaveProblemInfo = async (info: ProblemInfo) => {
  // 1. 문제 정보 저장
  await saveProblemInfo(info);

  // 2. 자동 확정 설정 확인
  if (settings.autoConfirmOnNumber && info.problemNumber) {
    // 3. 자동으로 확정(내보내기)
    await exportGroup({
      documentId,
      pageIndex,
      groupId: group.id
    });

    toast.success('문제가 문제은행에 등록되었습니다');
  }
};

// 해설 연결 시
const handleLinkSolution = async (link: SolutionLink) => {
  // 1. 해설 연결 저장
  await saveSolutionLink(link);

  // 2. 자동 확정 설정 확인
  if (settings.autoConfirmOnSolutionLink) {
    // 3. 자동으로 확정
    await exportGroup({
      documentId: link.problemDocumentId,
      pageIndex: link.problemPageIndex,
      groupId: link.problemGroupId
    });

    toast.success('문제가 문제은행에 등록되었습니다');
  }
};
```

**예상 소요**: 1시간 30분

---

### 60-C: 설정 영속화

**목표**: 사용자 설정을 localStorage에 저장하여 유지

**변경 파일**:
- `frontend/src/stores/settingsStore.ts`

**작업 내용**:
```typescript
// Zustand + localStorage persist
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  labelingSettings: LabelingSettings;
  updateLabelingSetting: (key: keyof LabelingSettings, value: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      labelingSettings: {
        autoConfirmOnNumber: false,  // 기본값: 꺼짐
        autoConfirmOnSolutionLink: true,  // 기본값: 켜짐 (해설 연결하면 대부분 완료)
      },
      updateLabelingSetting: (key, value) =>
        set((state) => ({
          labelingSettings: { ...state.labelingSettings, [key]: value }
        })),
    }),
    { name: 'pdf-labeling-settings' }
  )
);
```

**예상 소요**: 30분

---

## 개발 순서 및 일정

| Phase | 기능 | 예상 시간 | 우선순위 |
|-------|------|----------|---------|
| **58-A** | 그룹 카드 상태 뱃지 | 30분 | 🔴 높음 |
| **58-B** | 페이지 미확정 개수 표시 | 30분 | 🔴 높음 |
| **59-A** | 일괄 확정 버튼 UI | 1시간 | 🔴 높음 |
| **59-B** | 일괄 확정 백엔드 API | 1시간 | 🔴 높음 |
| **59-C** | 일괄 확정 프론트 연동 | 45분 | 🔴 높음 |
| **60-A** | 자동 확정 설정 UI | 1시간 | 🟡 중간 |
| **60-B** | 자동 확정 로직 | 1시간 30분 | 🟡 중간 |
| **60-C** | 설정 영속화 | 30분 | 🟡 중간 |

**총 예상 시간**: 약 7시간

---

## 구현 우선순위 권장

### 1단계: 즉시 문제 해결 (Phase 58-59)
시각적 경고 + 일괄 확정으로 현재 문제 빠르게 해결

```
Phase 58-A → 58-B → 59-B → 59-A → 59-C
(약 3시간 45분)
```

### 2단계: 장기 편의성 (Phase 60)
자동 확정 기능으로 향후 같은 문제 예방

```
Phase 60-C → 60-A → 60-B
(약 3시간)
```

---

## 테스트 체크리스트

### Phase 58 테스트
- [ ] 미확정 그룹에 노란색 "미확정" 뱃지 표시
- [ ] 확정된 그룹에 초록색 "확정됨" 뱃지 표시
- [ ] 페이지 헤더에 미확정 개수 표시
- [ ] 미확정 0개일 때 경고 숨김

### Phase 59 테스트
- [ ] 일괄 확정 버튼 클릭 시 모든 미확정 그룹 확정
- [ ] 확정 후 문제은행에 문제 표시 확인
- [ ] 실패한 그룹 에러 메시지 표시
- [ ] 확정 완료 후 캐시 갱신

### Phase 60 테스트
- [ ] 설정 UI에서 체크박스 토글 동작
- [ ] 문제번호 입력 시 자동 확정 (설정 ON)
- [ ] 해설 연결 시 자동 확정 (설정 ON)
- [ ] 브라우저 새로고침 후 설정 유지

---

*"진행해줘"로 Phase 58부터 구현 시작*
