# Phase 33: 세션 기반 통합 워크플로우 개발 계획

> **목표**: 세션 생성 → 영속성 유지 → 라벨링 시 문제은행 자동 등록
> **작성일**: 2025-12-03
> **예상 소요**: 4-5시간
> **상태**: 계획 수립 완료

---

## 1. 핵심 변경 요약

### Before (현재)
```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ DualUploadCard │ ──► │  /matching/    │ ──► │   개별 작업     │
│ (드래그 앤 드롭) │     │  (매칭만)      │     │   (영속성 없음) │
└────────────────┘     └────────────────┘     └────────────────┘
         +
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ /work 대시보드  │ ──► │  3단계 분리    │ ──► │   수동 내보내기 │
│ (문제만 선택)   │     │  (labeling→    │     │                │
│                │     │   setup→match) │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
```

### After (목표)
```
┌────────────────────────────────────────────────────────────────┐
│                    RegistrationPage (/)                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  [문제 PDF 선택]           [해설 PDF 선택]                │ │
│  │  ● math_bible.pdf          ● solution.pdf                │ │
│  │  ○ exam_2024.pdf           ○ answer_key.pdf              │ │
│  │                                                          │ │
│  │              [작업 시작하기]                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │             /work/:sessionId (통합 캔버스)                │ │
│  │                                                          │ │
│  │  [문제 탭] [해설 탭]  ←── 탭 전환                         │ │
│  │  ┌────────────────────────────────────┐                  │ │
│  │  │         캔버스 (기존 유지)          │                  │ │
│  │  │    그룹 생성 = 자동 문제은행 등록   │                  │ │
│  │  └────────────────────────────────────┘                  │ │
│  │                                                          │ │
│  │  [미연결 문제: 1번 2번 3번 ...]                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. 개발 단계 (Step-by-Step)

### Phase 33-A: 문서 선택 UI 변경
**예상 시간**: 1시간

#### 33-A-1: DualDocumentSelector 컴포넌트 생성
- [ ] `frontend/src/components/session/DualDocumentSelector.tsx` 생성
- [ ] WorkSessionDashboard의 문서 선택 UI 패턴 재사용
- [ ] 양쪽 리스트 (문제/해설) 동시 표시
- [ ] 같은 문서 중복 선택 방지 로직

```tsx
// 예상 구조
interface DualDocumentSelectorProps {
  onStart: (problemDocId: string, solutionDocId: string) => void;
}

export function DualDocumentSelector({ onStart }: DualDocumentSelectorProps) {
  const { data: documents } = useDocuments();
  const [problemDocId, setProblemDocId] = useState<string | null>(null);
  const [solutionDocId, setSolutionDocId] = useState<string | null>(null);

  return (
    <Card>
      <div className="grid grid-cols-2 gap-6">
        <DocumentList
          title="문제 문서"
          documents={documents}
          selectedId={problemDocId}
          disabledId={solutionDocId}
          onSelect={setProblemDocId}
        />
        <DocumentList
          title="해설 문서"
          documents={documents}
          selectedId={solutionDocId}
          disabledId={problemDocId}
          onSelect={setSolutionDocId}
        />
      </div>
      <Button
        onClick={() => onStart(problemDocId!, solutionDocId!)}
        disabled={!problemDocId || !solutionDocId}
      >
        작업 시작하기
      </Button>
    </Card>
  );
}
```

#### 33-A-2: RegistrationPage 수정
- [ ] DualUploadCard → DualDocumentSelector로 교체
- [ ] 기존 드롭존은 하단에 별도 유지 (새 파일 업로드용)
- [ ] "작업 시작하기" → 세션 생성 + `/work/:sessionId` 이동

---

### Phase 33-B: 백엔드 API 수정
**예상 시간**: 30분

#### 33-B-1: WorkSession 모델 수정
- [ ] `backend/app/models/work_session.py` 수정
- [ ] `solutionDocumentId`를 필수로 변경 (Optional 제거)

```python
class WorkSessionCreate(BaseModel):
    problemDocumentId: str
    problemDocumentName: Optional[str] = None
    solutionDocumentId: str  # 필수!
    solutionDocumentName: Optional[str] = None
    name: Optional[str] = None
```

#### 33-B-2: 세션 생성 API 수정
- [ ] `backend/app/routers/work_sessions.py` 수정
- [ ] 세션 생성 시 양쪽 문서 검증

---

### Phase 33-C: 자동 등록 기능
**예상 시간**: 1시간

#### 33-C-1: 그룹 저장 시 자동 export 호출
- [ ] `frontend/src/hooks/useDocuments.ts`의 `useSavePageGroups` 수정
- [ ] 그룹 저장 성공 후 `exportSingleGroup` API 호출

```typescript
// useSavePageGroups 수정
const saveGroupsMutation = useMutation({
  mutationFn: async (data) => {
    // 1. 그룹 저장
    const result = await api.savePageGroups(data);

    // 2. 새로 생성된 그룹에 대해 자동 export
    for (const group of data.groups) {
      if (group.isNew) {  // 새 그룹만
        await api.exportSingleGroup(data.documentId, data.pageIndex, group.id);
      }
    }

    return result;
  },
  // ...
});
```

#### 33-C-2: 토스트에 실행취소 버튼 추가
- [ ] `frontend/src/components/Toast.tsx` 수정
- [ ] 액션 버튼 지원 추가

```tsx
showToast('3번 문제가 문제은행에 등록되었습니다', {
  type: 'success',
  action: {
    label: '실행취소',
    onClick: () => handleUndo(groupId)
  }
});
```

#### 33-C-3: 실행취소 로직 구현
- [ ] 그룹 삭제 + export된 문제 삭제
- [ ] 최근 작업 스택 관리 (선택사항)

---

### Phase 33-D: 통합 캔버스 페이지
**예상 시간**: 1.5시간

#### 33-D-1: UnifiedWorkPage 생성
- [ ] `frontend/src/pages/UnifiedWorkPage.tsx` 생성
- [ ] 기존 WorkSessionMatchingPage 로직 재사용
- [ ] 탭 UI 추가 (문제/해설)

```tsx
export function UnifiedWorkPage() {
  const { sessionId } = useParams();
  const [activeTab, setActiveTab] = useState<'problem' | 'solution'>('problem');
  const [problemPage, setProblemPage] = useState(0);
  const [solutionPage, setSolutionPage] = useState(0);

  return (
    <div className="h-full flex flex-col">
      <Header />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <Canvas
        documentId={activeTab === 'problem' ? problemDocId : solutionDocId}
        pageIndex={activeTab === 'problem' ? problemPage : solutionPage}
        onGroupCreate={handleGroupCreate}
      />
      <PageNavigation />
      <UnlinkedProblemBar />
    </div>
  );
}
```

#### 33-D-2: TabBar 컴포넌트
- [ ] `frontend/src/components/session/TabBar.tsx` 생성
- [ ] 문제/해설 탭 전환
- [ ] 각 탭에 그룹 수 표시

#### 33-D-3: UnlinkedProblemBar 컴포넌트
- [ ] `frontend/src/components/session/UnlinkedProblemBar.tsx` 생성
- [ ] 하단에 미연결 문제 칩 표시
- [ ] 클릭 시 해당 문제 선택

#### 33-D-4: 라우트 변경
- [ ] `App.tsx` 수정

```tsx
// Before
<Route path="work/:sessionId/labeling" element={<WorkSessionLabelingPage />} />
<Route path="work/:sessionId/setup" element={<WorkSessionSetupPage />} />
<Route path="work/:sessionId/matching" element={<WorkSessionMatchingPage />} />

// After
<Route path="work/:sessionId" element={<UnifiedWorkPage />} />
```

---

### Phase 33-E: 스토어 및 상태 관리
**예상 시간**: 30분

#### 33-E-1: workSessionStore 수정
- [ ] 탭 상태 추가 (`activeTab`, `problemPage`, `solutionPage`)
- [ ] 자동 등록 관련 액션 추가

```typescript
interface WorkSessionStore {
  // 기존...

  // 탭 상태 (NEW)
  activeTab: 'problem' | 'solution';
  problemPageIndex: number;
  solutionPageIndex: number;

  // 액션 (NEW)
  setActiveTab: (tab: 'problem' | 'solution') => void;
  setProblemPage: (page: number) => void;
  setSolutionPage: (page: number) => void;
}
```

---

### Phase 33-F: 키보드 단축키
**예상 시간**: 30분

#### 33-F-1: 통합 단축키 설정
- [ ] `1` / `2`: 문제/해설 탭 전환
- [ ] `Tab`: 탭 토글
- [ ] `↑` / `↓`: 미연결 문제 선택
- [ ] `G`: 그룹 생성 (+ 자동 등록)

---

### Phase 33-G: 테스트 및 버그 수정
**예상 시간**: 1시간

#### 33-G-1: 기능 테스트
- [ ] 세션 생성 → 재개 테스트
- [ ] 그룹 생성 → 자동 등록 확인
- [ ] 탭 전환 → 페이지 상태 유지 확인
- [ ] 문제-해설 연결 테스트

#### 33-G-2: 엣지 케이스
- [ ] 문서 없을 때 UI
- [ ] 같은 문서 중복 선택 방지
- [ ] 세션 삭제 시 처리

---

## 3. 파일 변경 요약

### 신규 파일
```
frontend/src/
  components/
    session/
      DualDocumentSelector.tsx   # 문서 선택 UI
      TabBar.tsx                 # 탭 UI
      UnlinkedProblemBar.tsx     # 하단 미연결 문제
  pages/
    UnifiedWorkPage.tsx          # 통합 캔버스 페이지
```

### 수정 파일
```
frontend/src/
  pages/
    RegistrationPage.tsx         # DualDocumentSelector 사용
  App.tsx                        # 라우트 변경
  stores/
    workSessionStore.ts          # 탭 상태 추가
  hooks/
    useDocuments.ts              # 자동 export 호출
  components/
    Toast.tsx                    # 액션 버튼 지원

backend/app/
  models/
    work_session.py              # solutionDocumentId 필수
  routers/
    work_sessions.py             # 세션 생성 수정
```

### 삭제/Deprecated 파일 (선택)
```
frontend/src/
  pages/
    WorkSessionLabelingPage.tsx  # (통합 페이지로 대체)
    WorkSessionSetupPage.tsx     # (제거 - 시작 시 지정)
    WorkSessionMatchingPage.tsx  # (통합 페이지로 대체)
  components/
    matching/
      DualUploadCard.tsx         # (DualDocumentSelector로 대체)
```

---

## 4. 마일스톤

| 단계 | 작업 | 예상 시간 | 체크 |
|------|------|-----------|------|
| **33-A** | 문서 선택 UI | 1시간 | ⬜ |
| **33-B** | 백엔드 API 수정 | 30분 | ⬜ |
| **33-C** | 자동 등록 기능 | 1시간 | ⬜ |
| **33-D** | 통합 캔버스 페이지 | 1.5시간 | ⬜ |
| **33-E** | 스토어 수정 | 30분 | ⬜ |
| **33-F** | 키보드 단축키 | 30분 | ⬜ |
| **33-G** | 테스트 | 1시간 | ⬜ |
| | **총계** | **6시간** | |

---

## 5. 의존성 순서

```
33-B (백엔드) ─────────────────────────────────────────┐
                                                       │
33-A (문서 선택 UI) ──┬──► 33-D (통합 캔버스) ──┬──► 33-G (테스트)
                     │                         │
33-C (자동 등록) ────┘                         │
                                               │
33-E (스토어) ────────────────────────────────┘
                                               │
33-F (단축키) ────────────────────────────────┘
```

**권장 순서**:
1. 33-B (백엔드) - API 먼저 준비
2. 33-A (문서 선택 UI) - 프론트 시작점
3. 33-E (스토어) - 상태 관리 기반
4. 33-D (통합 캔버스) - 메인 페이지
5. 33-C (자동 등록) - 핵심 기능
6. 33-F (단축키) - UX 개선
7. 33-G (테스트) - 마무리

---

## 6. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 기존 세션 호환성 | 중간 | 중간 | 마이그레이션 스크립트 준비 |
| 자동 등록 성능 | 낮음 | 낮음 | 비동기 처리 |
| 탭 전환 시 상태 손실 | 중간 | 높음 | 스토어에 페이지 상태 분리 저장 |

---

## 7. 롤백 계획

문제 발생 시:
1. 기존 3페이지 라우트 유지 (삭제하지 않고 deprecated)
2. DualUploadCard 유지 (DualDocumentSelector와 병행)
3. 자동 등록 off 옵션 추가

---

*계획 작성: Claude Code (Opus)*
*마지막 업데이트: 2025-12-03*
