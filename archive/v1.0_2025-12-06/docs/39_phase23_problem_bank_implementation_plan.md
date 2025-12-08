# Phase 23: 문제은행 UI 리디자인 - 단계별 개발 계획

---

## 개요

| 항목 | 내용 |
|------|------|
| 목표 | 크롭/한글 문제은행 분리 UI + 자동 등록 시스템 |
| 예상 기간 | 4단계 |
| 핵심 변경 | "확정" 버튼 도입, 탭 기반 허브 UI |

---

## Phase 23-A: 그룹 상태 모델 확장

### A-1: 백엔드 모델 수정

**파일:** `backend/app/models/block.py`

```python
class ProblemGroup(BaseModel):
    id: str
    column: str
    block_ids: list[int]
    problem_info: Optional[ProblemInfo] = None
    # 신규 필드
    status: Literal['draft', 'confirmed'] = 'draft'
    exported_at: Optional[str] = None
```

### A-2: 프론트엔드 타입 수정

**파일:** `frontend/src/api/client.ts`

```typescript
export interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];
  problemInfo?: ProblemInfo;
  // 신규 필드
  status: 'draft' | 'confirmed';
  exportedAt?: string;
}
```

### A-3: 그룹 저장 로직 수정

**파일:** `backend/app/routers/blocks.py`

- 기존 그룹 저장 시 status 필드 유지
- 신규 그룹은 기본값 'draft'

---

## Phase 23-B: 확정 버튼 및 자동 내보내기

### B-1: 개별 그룹 내보내기 API

**파일:** `backend/app/routers/export.py`

```python
@router.post("/{document_id}/page/{page_index}/group/{group_id}")
async def export_single_group(
    document_id: str,
    page_index: int,
    group_id: str
):
    """
    단일 그룹 내보내기
    1. 해당 그룹 이미지 크롭
    2. problems/ 폴더에 저장
    3. 그룹 상태 'confirmed'로 업데이트
    """
    pass
```

### B-2: 프론트엔드 API 함수 추가

**파일:** `frontend/src/api/client.ts`

```typescript
exportGroup: async (documentId: string, pageIndex: number, groupId: string) => {
  const response = await axios.post(
    `${API_URL}/export/${documentId}/page/${pageIndex}/group/${groupId}`
  );
  return response.data;
}
```

### B-3: GroupCard 컴포넌트 수정

**파일:** `frontend/src/components/GroupCard.tsx`

- 확정 상태 표시 배지 추가
- "확정하기" 버튼 추가
- 확정된 그룹은 편집 제한 (선택적)

```
┌─────────────────────────────────────┐
│ L1: 문제 1번              [미확정]  │
│ 블록: 0, 1, 2, 3                    │
│ 교재: 수학1 / 단원: 함수            │
│                                     │
│ [삭제]              [✓ 확정하기]    │
└─────────────────────────────────────┘
```

### B-4: GroupPanel 수정

**파일:** `frontend/src/components/GroupPanel.tsx`

- "전체 확정" 버튼 추가
- 확정된 그룹 수 표시

### B-5: PageViewer 확정 로직

**파일:** `frontend/src/pages/PageViewer.tsx`

```typescript
const handleConfirmGroup = async (groupId: string) => {
  // 1. 로컬 상태 업데이트
  setLocalGroups(prev => prev.map(g =>
    g.id === groupId ? { ...g, status: 'confirmed' } : g
  ));

  // 2. 서버에 저장
  await saveImmediately(updatedGroups, currentPage);

  // 3. 이미지 크롭 & 내보내기
  await api.exportGroup(documentId, currentPage, groupId);

  // 4. 알림
  showToast('문제가 문제은행에 등록되었습니다', 'success');
};

const handleConfirmAll = async () => {
  const unconfirmed = localGroups.filter(g => g.status !== 'confirmed');
  for (const group of unconfirmed) {
    await handleConfirmGroup(group.id);
  }
};
```

---

## Phase 23-C: 크롭 문제은행 개선

### C-1: 전체 문제 조회 API

**파일:** `backend/app/routers/export.py`

```python
@router.get("/all-problems")
async def list_all_exported_problems(
    search: Optional[str] = None,
    document_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    모든 문서의 내보내기된 문제 조회
    - 모든 문서 스캔
    - 필터링/검색 지원
    - 문서별 그룹화 옵션
    """
    pass
```

### C-2: 프론트엔드 훅 수정

**파일:** `frontend/src/hooks/useDocuments.ts`

```typescript
export function useAllExportedProblems(options?: {
  search?: string;
  documentId?: string;
}) {
  return useQuery({
    queryKey: ['allExportedProblems', options],
    queryFn: () => api.getAllExportedProblems(options),
  });
}
```

### C-3: CropProblemBank 컴포넌트

**파일:** `frontend/src/components/problembank/CropProblemBank.tsx`

- 전체 문제 그리드 표시
- 문서별 그룹화 토글
- 검색/필터 기능

---

## Phase 23-D: 문제은행 허브 UI

### D-1: ProblemBankHub 페이지 생성

**파일:** `frontend/src/pages/ProblemBankHub.tsx`

```typescript
type TabType = 'crop' | 'hangul' | 'trash';

export function ProblemBankHub() {
  const [activeTab, setActiveTab] = useState<TabType>('crop');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Header title="문제은행" />

      {/* 통계 카드 */}
      <StatsCards />

      {/* 탭 바 */}
      <TabBar
        tabs={[
          { id: 'crop', label: '이미지 크롭', count: cropCount },
          { id: 'hangul', label: '한글 파일', count: hangulCount },
          { id: 'trash', label: '휴지통', count: trashCount },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 탭 컨텐츠 */}
      {activeTab === 'crop' && <CropProblemBank />}
      {activeTab === 'hangul' && <HangulProblemBank />}
      {activeTab === 'trash' && <TrashTab />}
    </div>
  );
}
```

### D-2: 라우팅 수정

**파일:** `frontend/src/App.tsx`

```typescript
// 기존
<Route path="/problem-bank" element={<ProblemBankPage />} />
<Route path="/integrated-problem-bank" element={<IntegratedProblemBankPage />} />

// 변경
<Route path="/problem-bank" element={<ProblemBankHub />} />
// 기존 페이지는 유지 (하위 호환)
<Route path="/problem-bank/crop" element={<ProblemBankPage />} />
<Route path="/problem-bank/hangul" element={<IntegratedProblemBankPage />} />
```

### D-3: 사이드바 메뉴 수정

**파일:** `frontend/src/components/Sidebar.tsx`

```typescript
// 기존: 문제은행, 통합 문제은행 (2개 메뉴)
// 변경: 문제은행 (1개 메뉴, 허브로 이동)
```

---

## 구현 순서 및 체크리스트

### 1단계: 모델 확장 (Phase 23-A)
- [ ] A-1: 백엔드 ProblemGroup 모델에 status, exportedAt 필드 추가
- [ ] A-2: 프론트엔드 타입 정의 수정
- [ ] A-3: 그룹 저장/로드 시 새 필드 처리

### 2단계: 확정 시스템 (Phase 23-B)
- [ ] B-1: 개별 그룹 내보내기 API 구현
- [ ] B-2: 프론트엔드 API 함수 추가
- [ ] B-3: GroupCard에 확정 버튼 및 상태 표시
- [ ] B-4: GroupPanel에 전체 확정 버튼
- [ ] B-5: PageViewer 확정 로직 구현
- [ ] B-6: 기존 "페이지 내보내기" 버튼 유지 (하위 호환)

### 3단계: 크롭 문제은행 개선 (Phase 23-C)
- [ ] C-1: 전체 문제 조회 API
- [ ] C-2: useAllExportedProblems 훅
- [ ] C-3: CropProblemBank 컴포넌트

### 4단계: 허브 UI (Phase 23-D)
- [ ] D-1: ProblemBankHub 페이지
- [ ] D-2: 라우팅 수정
- [ ] D-3: 사이드바 메뉴 통합

---

## 파일 변경 요약

| 단계 | 파일 | 변경 유형 |
|------|------|----------|
| A-1 | `backend/app/models/block.py` | 수정 |
| A-2 | `frontend/src/api/client.ts` | 수정 |
| A-3 | `backend/app/routers/blocks.py` | 수정 |
| B-1 | `backend/app/routers/export.py` | 수정 |
| B-2 | `frontend/src/api/client.ts` | 수정 |
| B-3 | `frontend/src/components/GroupCard.tsx` | 수정 |
| B-4 | `frontend/src/components/GroupPanel.tsx` | 수정 |
| B-5 | `frontend/src/pages/PageViewer.tsx` | 수정 |
| C-1 | `backend/app/routers/export.py` | 수정 |
| C-2 | `frontend/src/hooks/useDocuments.ts` | 수정 |
| C-3 | `frontend/src/components/problembank/CropProblemBank.tsx` | **신규** |
| D-1 | `frontend/src/pages/ProblemBankHub.tsx` | **신규** |
| D-2 | `frontend/src/App.tsx` | 수정 |
| D-3 | `frontend/src/components/Sidebar.tsx` | 수정 |

---

## 테스트 계획

### 기능 테스트
1. 그룹 생성 → 확정 버튼 클릭 → 문제은행에 표시 확인
2. 전체 확정 버튼 동작 확인
3. 확정된 그룹 상태 유지 확인 (페이지 새로고침 후)
4. 허브 탭 전환 동작 확인

### 하위 호환성
1. 기존 저장된 그룹 (status 필드 없음) 정상 로드
2. 기존 내보내기 버튼 정상 동작
3. 기존 URL 접근 시 리다이렉트

---

*작성: Claude Code*
*날짜: 2025-12-02*
