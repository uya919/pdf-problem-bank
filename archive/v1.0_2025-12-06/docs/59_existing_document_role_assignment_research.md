# 기존 문서를 문제/해설 PDF로 지정하는 기능 구현 가능성 리포트

**작성일**: 2025-12-02
**요청**: "진행중인 라벨링"에서 문제 PDF로 등록하고 해설 PDF로 등록될 수 있는 UI/UX 구현 가능성 분석
**분석 수준**: Deep Research (Opus)

---

## Executive Summary

### 결론: ✅ 구현 가능

| 항목 | 평가 |
|------|------|
| 백엔드 API 변경 | 불필요 (이미 지원) |
| 프론트엔드 변경 | 필요 (UI 추가) |
| 난이도 | 중간 |
| 예상 구현 시간 | 2-3시간 |
| UX 개선 효과 | 높음 |

---

## Part 1: 현재 상태 분석

### 1.1 현재 워크플로우의 문제점

```
현재 시나리오:
1. 사용자가 "단일 파일 업로드"로 문제.pdf 업로드
2. 같은 방법으로 해설.pdf 업로드
3. 두 파일이 "진행중인 라벨링" 목록에 표시
4. ❌ 이 두 파일을 매칭하려면 → DualUploadCard에 다시 업로드해야 함
```

**문제점:**
- 이미 업로드한 파일을 다시 업로드해야 하는 비효율
- 사용자가 워크플로우를 이해하기 어려움
- 저장 공간 낭비 (중복 업로드)

### 1.2 현재 코드 구조

#### DocumentCard (진행중인 라벨링)
```typescript
// RegistrationPage.tsx:80-167
interface DocumentCardProps {
  document: DocumentItem;
  onContinue: (id: string) => void;   // 라벨링 시작
  onDelete: (document: DocumentItem) => void;  // 삭제
  // ❌ 역할 지정 콜백 없음
}
```

#### DocumentMenu (⋮ 메뉴)
```typescript
// DocumentMenu.tsx:12-17
interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;      // 삭제만 있음
  onSettings?: () => void;   // 설정 (선택적)
  // ❌ 역할 지정 옵션 없음
}
```

#### DualUploadCard
```typescript
// 현재: 새 파일 업로드만 지원
const [problemFile, setProblemFile] = useState<UploadedFile | null>(null);
const [solutionFile, setSolutionFile] = useState<UploadedFile | null>(null);

// ❌ 기존 문서 ID를 직접 설정하는 방법 없음
```

### 1.3 백엔드 API 분석

**좋은 소식:** 백엔드 API는 이미 기존 문서 ID를 지원합니다.

```typescript
// api/client.ts:420-427
createMatchingSession: async (data: {
  name?: string;
  problemDocumentId?: string;   // ✅ 기존 문서 ID 가능
  solutionDocumentId?: string;  // ✅ 기존 문서 ID 가능
}): Promise<MatchingSession>
```

---

## Part 2: UI/UX 구현 옵션

### 옵션 A: DocumentMenu에 역할 지정 추가 (권장 ⭐)

**개념:**
```
┌─────────────────────────────────────────────────────────────┐
│  진행 중인 라벨링                                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 수학의바이블_문제.pdf       [시작하기] [⋮]        │   │
│  │     라벨링 대기                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                      ↓ 클릭               │
│                              ┌──────────────────┐          │
│                              │ 📄 문제로 지정    │ ← NEW    │
│                              │ 📖 해설로 지정    │ ← NEW    │
│                              │ ⚙️ 문서 설정      │          │
│                              │ ────────────────│          │
│                              │ 🗑️ 삭제          │          │
│                              └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

**워크플로우:**
1. 문서 카드의 ⋮ 메뉴 클릭
2. "문제로 지정" 또는 "해설로 지정" 선택
3. DualUploadCard에 해당 문서가 자동 반영
4. 두 역할이 모두 지정되면 "매칭 시작" 버튼 활성화

**장점:**
- 기존 UI에 자연스럽게 통합
- 학습 비용 낮음
- Progressive Disclosure 원칙 준수

**단점:**
- DualUploadCard와 DocumentCard 간 상태 동기화 필요

---

### 옵션 B: DualUploadCard에 "기존 문서 선택" 버튼 추가

**개념:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 문제-해설 매칭                                          │
│  문제와 해설 PDF를 함께 업로드하세요                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐            │
│  │                   │    │                   │            │
│  │  📄 문제 PDF      │    │  📖 해설 PDF      │            │
│  │  드래그 앤 드롭    │    │  드래그 앤 드롭    │            │
│  │                   │    │                   │            │
│  │ [기존 문서 선택]  │    │ [기존 문서 선택]  │ ← NEW      │
│  └───────────────────┘    └───────────────────┘            │
│                                                             │
│  [ 듀얼 윈도우로 매칭 시작 ]                                 │
└─────────────────────────────────────────────────────────────┘
```

**워크플로우:**
1. "기존 문서 선택" 버튼 클릭
2. 문서 선택 모달/드롭다운 표시
3. 문서 선택 시 해당 슬롯에 반영

**장점:**
- DualUploadCard 내에서 모든 작업 완료
- 명확한 행동 유도

**단점:**
- 드롭존 내 추가 버튼으로 UI 복잡해짐
- 작은 화면에서 버튼 배치 어려움

---

### 옵션 C: 드래그 앤 드롭으로 역할 지정

**개념:**
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 문제-해설 매칭                                          │
│  문제와 해설 PDF를 함께 업로드하세요                         │
│  또는 아래 문서를 여기로 드래그하세요                        │ ← NEW
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐    ┌───────────────────┐            │
│  │  📄 문제 PDF      │    │  📖 해설 PDF      │            │
│  │  드래그 앤 드롭    │    │  드래그 앤 드롭    │            │
│  └───────────────────┘    └───────────────────┘            │
└─────────────────────────────────────────────────────────────┘

  ↑ 드래그                    ↑ 드래그

┌─────────────────────────────────────────────────────────────┐
│  진행 중인 라벨링                                            │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ 📄 문제.pdf     │  │ 📖 해설.pdf     │                  │
│  │ [드래그하여     │  │ [드래그하여     │                  │
│  │  역할 지정]     │  │  역할 지정]     │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**장점:**
- 직관적인 인터랙션
- 토스 UX 원칙 "Velocity" 부합

**단점:**
- 모바일에서 드래그 어려움
- 구현 복잡도 높음
- 터치 디바이스 대응 필요

---

### 옵션 D: 선택 모드 활성화

**개념:**
```
┌─────────────────────────────────────────────────────────────┐
│  진행 중인 라벨링                    [문서 선택 모드] ← NEW  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️ 📄 수학의바이블_문제.pdf                          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️ 📖 수학의바이블_해설.pdf                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  선택된 문서: 2개                                           │
│  [ 문제로 지정 ] [ 해설로 지정 ] [ 취소 ]                    │
└─────────────────────────────────────────────────────────────┘
```

**장점:**
- 여러 문서 일괄 처리 가능
- 명확한 상태 표시

**단점:**
- 모드 전환 필요 (복잡성 증가)
- 일반적인 사용 케이스에 과함

---

## Part 3: 권장 구현 방안

### 3.1 하이브리드 접근법 (옵션 A + B)

**Phase 22-G: 기존 문서 역할 지정 기능**

#### 구현 1: DocumentMenu 확장

```typescript
// DocumentMenu.tsx 수정
interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;
  onSettings?: () => void;
  onSetAsProblem?: () => void;    // NEW
  onSetAsSolution?: () => void;   // NEW
  disableProblem?: boolean;       // 이미 지정된 경우
  disableSolution?: boolean;
}
```

```
┌──────────────────┐
│ 📄 문제로 지정    │
│ 📖 해설로 지정    │
│ ────────────────│
│ ⚙️ 문서 설정      │
│ ────────────────│
│ 🗑️ 삭제          │
└──────────────────┘
```

#### 구현 2: DualUploadCard 상태 공유

```typescript
// 새로운 Context 또는 Props
interface DualUploadCardProps {
  onPopupBlocked?: () => void;
  selectedProblemDocId?: string;    // NEW: 외부에서 주입
  selectedSolutionDocId?: string;   // NEW: 외부에서 주입
  onProblemClear?: () => void;      // NEW: 선택 해제 콜백
  onSolutionClear?: () => void;
}
```

#### 구현 3: RegistrationPage 상태 관리

```typescript
// RegistrationPage.tsx
const [selectedProblemDoc, setSelectedProblemDoc] = useState<string | null>(null);
const [selectedSolutionDoc, setSelectedSolutionDoc] = useState<string | null>(null);

// DocumentCard에 콜백 전달
<DocumentCard
  document={doc}
  onContinue={handleContinueLabeling}
  onDelete={handleDeleteClick}
  onSetAsProblem={() => setSelectedProblemDoc(doc.id)}    // NEW
  onSetAsSolution={() => setSelectedSolutionDoc(doc.id)}  // NEW
/>

// DualUploadCard에 선택된 문서 전달
<DualUploadCard
  onPopupBlocked={() => setShowPopupBlockedModal(true)}
  selectedProblemDocId={selectedProblemDoc}    // NEW
  selectedSolutionDocId={selectedSolutionDoc}  // NEW
/>
```

---

## Part 4: 상세 UI/UX 디자인

### 4.1 문서 메뉴 확장

```
┌──────────────────────────────────────────────────────────────┐
│  수학의바이블_문제.pdf                                        │
│  라벨링 대기                           [시작하기] [⋮]        │
└──────────────────────────────────────────────────────────────┘
                                                  ↓
                                    ┌────────────────────┐
                                    │ 🔗 매칭에 사용      │ ← 서브메뉴 헤더
                                    │ ────────────────── │
                                    │   📄 문제로 지정    │
                                    │   📖 해설로 지정    │
                                    │ ────────────────── │
                                    │ ⚙️ 문서 설정        │
                                    │ ────────────────── │
                                    │ 🗑️ 삭제            │
                                    └────────────────────┘
```

### 4.2 DualUploadCard 선택 상태 표시

```
┌─────────────────────────────────────────────────────────────┐
│  🔗 문제-해설 매칭                                          │
│  문제와 해설 PDF를 함께 업로드하세요                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐    ┌───────────────────┐            │
│  │ ✅ 문제 PDF       │    │  📖 해설 PDF      │            │
│  │                   │    │                   │            │
│  │ 수학의바이블_문제 │    │  드래그 앤 드롭    │            │
│  │    .pdf     [✕]  │    │  또는 클릭        │            │
│  │                   │    │                   │            │
│  │  기존 문서에서    │    │  기존 문서에서    │            │
│  │    선택됨        │    │    선택           │            │
│  └───────────────────┘    └───────────────────┘            │
│                                                             │
│  [ 듀얼 윈도우로 매칭 시작 ]                                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 피드백 토스트 메시지

```typescript
// 역할 지정 시
showToast('수학의바이블_문제.pdf가 문제 PDF로 지정되었습니다', { type: 'success' });

// 이미 지정된 경우
showToast('이미 문제 PDF가 지정되어 있습니다. 먼저 해제해주세요.', { type: 'warning' });

// 역할 해제 시
showToast('문제 PDF 지정이 해제되었습니다', { type: 'info' });
```

---

## Part 5: 구현 계획

### 5.1 Phase 22-G 단계별 계획

| 단계 | 내용 | 파일 | 예상 시간 |
|------|------|------|----------|
| G-1 | DocumentMenu 역할 지정 메뉴 추가 | `DocumentMenu.tsx` | 30분 |
| G-2 | RegistrationPage 상태 관리 | `RegistrationPage.tsx` | 30분 |
| G-3 | DualUploadCard 외부 선택 지원 | `DualUploadCard.tsx` | 45분 |
| G-4 | 선택 상태 시각적 표시 | `DualUploadCard.tsx` | 30분 |
| G-5 | 토스트 피드백 추가 | 여러 파일 | 15분 |
| G-6 | 테스트 및 버그 수정 | - | 30분 |
| **합계** | | | **3시간** |

### 5.2 파일 수정 목록

**수정:**
- `frontend/src/components/DocumentMenu.tsx`
- `frontend/src/pages/RegistrationPage.tsx`
- `frontend/src/components/matching/DualUploadCard.tsx`

**새로 생성:**
- (없음 - 기존 파일 수정으로 충분)

---

## Part 6: 기술적 고려사항

### 6.1 상태 동기화

```typescript
// DualUploadCard에서 기존 문서 사용 시 상태 구조
interface SelectedDocument {
  source: 'upload' | 'existing';  // 업로드 vs 기존 문서
  documentId: string;
  fileName: string;
}

// 기존 UploadedFile과 통합
type DocumentSelection = UploadedFile | SelectedDocument;
```

### 6.2 기존 문서 정보 조회

```typescript
// 기존 문서 선택 시 문서명 표시를 위해
// documents 배열에서 찾기
const selectedDocInfo = mappedDocs.find(d => d.id === selectedProblemDocId);
```

### 6.3 충돌 처리

```typescript
// 같은 문서를 문제와 해설로 동시 지정 방지
const handleSetAsProblem = (docId: string) => {
  if (selectedSolutionDocId === docId) {
    showToast('이 문서는 이미 해설로 지정되어 있습니다', { type: 'warning' });
    return;
  }
  setSelectedProblemDocId(docId);
};
```

---

## Part 7: 결론

### 7.1 구현 가능성: ✅ 높음

- 백엔드 API 변경 불필요
- 프론트엔드 UI 확장으로 충분
- 기존 코드 구조와 잘 맞음

### 7.2 권장 구현 방식: 옵션 A + 부분 B

1. **DocumentMenu에 역할 지정 메뉴 추가** (핵심)
2. **DualUploadCard에 외부 선택 상태 표시** (시각적 피드백)
3. **RegistrationPage에서 상태 관리** (연결)

### 7.3 예상 효과

| 측면 | 개선 효과 |
|------|----------|
| UX | 기존 문서 재업로드 불필요 → 효율성 향상 |
| 저장공간 | 중복 업로드 방지 |
| 학습곡선 | 기존 UI에 자연스럽게 통합 → 낮은 학습비용 |
| 유연성 | 두 가지 방식 모두 지원 (새 업로드 + 기존 선택) |

---

## 부록: 대안 검토

### 이 기능이 필요 없을 수 있는 경우

1. **사용자가 항상 DualUploadCard로 시작하는 경우** → 기존 문서 선택 불필요
2. **단일 파일 업로드가 드문 경우** → 기능 우선순위 낮음

### 구현하지 않을 경우 대안

- 사용 가이드에 "매칭하려면 DualUploadCard에서 업로드하세요" 안내
- 기존 업로드한 파일 삭제 후 DualUploadCard로 재업로드 유도

---

*리포트 작성: Claude Code (Opus)*
*날짜: 2025-12-02*
