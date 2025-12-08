# Phase 31: 추가 기능 실현 가능성 리포트

**작성일**: 2025-12-03
**Phase**: 31 (싱글 탭 매칭 시스템)
**분석자**: Claude (opus thinkharder)

---

## 요청된 기능

1. **문제 정보 편집**: 작업창에서 문제번호, 책이름, 페이지 수정
2. **캔버스 확대/축소**: 독립적인 줌 컨트롤
3. **작업창 크기 조절**: 패널 리사이즈

---

## 1. 문제 정보 편집 기능

### 1.1 현재 상태

| 컴포넌트 | 편집 기능 | 상태 |
|---------|---------|------|
| `GroupPanel.tsx` | ✅ 완전 구현됨 | 기존 라벨링 페이지용 |
| `ProblemListPanel.tsx` | ❌ 표시만 | Phase 31용 |

**GroupPanel.tsx**에 이미 완전한 편집 UI가 있습니다:

```tsx
// GroupPanel.tsx:110-131
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);
  setEditForm({
    bookName: group.problemInfo?.bookName || defaultBookName,
    course: group.problemInfo?.course || defaultCourse,
    page: group.problemInfo?.page || bookPage || 1,
    problemNumber: suggestedProblemNumber,
  });
};

// 편집 폼 필드: 책이름, 과정, 페이지, 문항번호
```

### 1.2 구현 방안

#### 방안 A: GroupPanel 재사용 (권장)
```
ProblemListPanel에 GroupPanel의 편집 로직 통합

장점:
- 기존 코드 재사용
- 일관된 UX
- 빠른 구현 (~2시간)

단점:
- 코드 중복 발생 가능
```

#### 방안 B: 공통 훅/컴포넌트 추출
```
useProblemInfoEditor() 훅으로 로직 분리
ProblemEditForm 공통 컴포넌트 생성

장점:
- 코드 재사용성 최대화
- 유지보수 용이

단점:
- 초기 구현 시간 증가 (~4시간)
```

### 1.3 시스템 조화도

```
┌─────────────────────────────────────────────────────────┐
│ UnifiedMatchingPage                                      │
│  ├─ MatchingCanvas                                       │
│  │   └─ 그룹 생성 시 problemInfo 설정                    │
│  └─ ProblemListPanel                                     │
│      └─ [추가] 문제 클릭 → 편집 모달/인라인 폼           │
│          - matchingStore.updateProblem() 호출            │
│          - 그룹 JSON에도 반영 필요                        │
└─────────────────────────────────────────────────────────┘
```

### 1.4 구현 난이도

| 항목 | 난이도 | 이유 |
|------|--------|------|
| UI 구현 | ⭐⭐ (쉬움) | GroupPanel 참고 가능 |
| 상태 동기화 | ⭐⭐⭐ (중간) | matchingStore + groupsData 양쪽 업데이트 |
| 저장 로직 | ⭐⭐⭐ (중간) | saveGroups 연동 필요 |

**예상 구현 시간**: 3-4시간

### 1.5 우려 사항

1. **상태 이중화**: matchingStore의 ProblemItem과 그룹 JSON의 problemInfo 동기화
2. **저장 타이밍**: 편집 중 자동저장 vs 명시적 저장
3. **연결된 해설 처리**: 문제 번호 변경 시 해설 그룹도 업데이트 필요?

---

## 2. 캔버스 확대/축소 기능

### 2.1 현재 상태

```tsx
// PageCanvas.tsx:299
const scale = image ? canvasSize.width / image.width : 1;
```

현재는 **컨테이너 너비에 자동 맞춤**만 지원:
- 줌 인/아웃 없음
- 사용자 제어 불가
- 스크롤 없음

### 2.2 참고 구현: ExamPreviewModal

```tsx
// ExamPreviewModal.tsx (기존 시스템)
const [zoom, setZoom] = useState(100);
const zoomLevels = [50, 75, 100, 125, 150];
```

### 2.3 구현 방안

#### 방안 A: 버튼 기반 줌 (권장)
```tsx
// 새로운 ZoomControls 컴포넌트
<div className="zoom-controls">
  <button onClick={() => setZoom(z => Math.max(50, z - 25))}>-</button>
  <span>{zoom}%</span>
  <button onClick={() => setZoom(z => Math.min(200, z + 25))}>+</button>
</div>

// PageCanvas scale 수정
const baseScale = containerWidth / image.width;
const userScale = zoom / 100;
const finalScale = baseScale * userScale;
```

#### 방안 B: 휠 줌 + 패닝
```tsx
// 마우스 휠로 줌
onWheel={(e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }
}}

// 드래그로 패닝 (줌 > 100% 시)
```

### 2.4 시스템 조화도

```
┌─────────────────────────────────────────────────────────┐
│ MatchingCanvas                                           │
│  ├─ [추가] ZoomControls (50%, 75%, 100%, 125%, 150%)    │
│  ├─ [수정] PageCanvas                                    │
│  │   ├─ props: zoom?: number                             │
│  │   ├─ Stage: overflow: auto (줌 > 100%)               │
│  │   └─ scale 계산 수정                                  │
│  └─ PageNavigation                                       │
└─────────────────────────────────────────────────────────┘
```

### 2.5 구현 난이도

| 항목 | 난이도 | 이유 |
|------|--------|------|
| 줌 UI | ⭐⭐ (쉬움) | 버튼 + 상태 |
| Scale 적용 | ⭐⭐ (쉬움) | 곱셈 연산 추가 |
| 스크롤/패닝 | ⭐⭐⭐⭐ (어려움) | overflow + Konva 좌표 변환 |
| 블록 좌표 변환 | ⭐⭐⭐ (중간) | 클릭/드래그 시 역변환 필요 |

**예상 구현 시간**:
- 기본 줌: 2-3시간
- 스크롤/패닝 포함: 6-8시간

### 2.6 우려 사항

1. **블록 선택 좌표**: 줌 시 마우스 좌표 → 이미지 좌표 변환 복잡
2. **드래그 선택**: 줌 + 패닝 + 드래그 선택 동시 처리
3. **성능**: 큰 이미지 + 고배율 줌 시 렌더링 성능
4. **탭 전환 시 상태**: 문제/해설 탭별 줌 레벨 유지 여부

---

## 3. 작업창 크기 조절 기능

### 3.1 현재 상태

```tsx
// UnifiedMatchingPage.tsx:142
<div className="w-80 flex-shrink-0 border-l bg-white overflow-hidden">
  <ProblemListPanel />
</div>
```

**고정 너비**: 320px (`w-80`)

### 3.2 구현 방안

#### 방안 A: CSS resize 속성 (간단)
```tsx
<div
  className="w-80 min-w-64 max-w-96 border-l bg-white overflow-hidden"
  style={{ resize: 'horizontal', overflow: 'auto' }}
>
```

**장점**: 3줄 수정으로 구현
**단점**: 리사이즈 핸들 스타일 제한, 부자연스러운 UX

#### 방안 B: 드래그 리사이즈 (권장)
```tsx
// 리사이즈 핸들
<div
  className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize"
  onMouseDown={startResize}
/>

// 리사이즈 로직
const [panelWidth, setPanelWidth] = useState(320);
const handleMouseMove = (e) => {
  const newWidth = window.innerWidth - e.clientX;
  setPanelWidth(Math.max(240, Math.min(480, newWidth)));
};
```

#### 방안 C: react-split-pane 라이브러리
```tsx
import SplitPane from 'react-split-pane';

<SplitPane split="vertical" defaultSize={320} minSize={240} maxSize={480}>
  <MatchingCanvas />
  <ProblemListPanel />
</SplitPane>
```

**장점**: 검증된 UX, 다양한 옵션
**단점**: 의존성 추가, 스타일 커스터마이징 필요

### 3.3 시스템 조화도

```
┌─────────────────────────────────────────────────────────┐
│ UnifiedMatchingPage                                      │
│  ├─ Main Area (flex-1)                                  │
│  │   ├─ MatchingCanvas (flex-1)                         │
│  │   │   └─ 캔버스 크기 자동 조정                        │
│  │   ├─ [추가] ResizeHandle (w-1, cursor-col-resize)    │
│  │   └─ ProblemListPanel (width: panelWidth)            │
│  └─ Footer                                               │
└─────────────────────────────────────────────────────────┘

패널 너비 변경 시:
- 캔버스 containerWidth 변경
- PageCanvas 자동 리사이즈 (기존 로직 활용)
- 반응형 레이아웃 유지
```

### 3.4 구현 난이도

| 방안 | 난이도 | 시간 |
|------|--------|------|
| CSS resize | ⭐ (매우 쉬움) | 30분 |
| 커스텀 드래그 | ⭐⭐⭐ (중간) | 2-3시간 |
| 라이브러리 | ⭐⭐ (쉬움) | 1-2시간 |

### 3.5 우려 사항

1. **캔버스 리렌더링**: 패널 크기 변경 시 잦은 리렌더링 → 디바운스 필요
2. **상태 저장**: 사용자 선호 너비 localStorage 저장 여부
3. **모바일 대응**: 작은 화면에서 최소 너비 충돌

---

## 4. 종합 권장 사항

### 4.1 우선순위 매트릭스

| 기능 | 필요성 | 구현 난이도 | 시스템 영향 | 우선순위 |
|------|--------|------------|------------|---------|
| 문제 정보 편집 | ⭐⭐⭐⭐⭐ 필수 | ⭐⭐⭐ 중간 | 중간 | **1순위** |
| 패널 리사이즈 | ⭐⭐⭐ 유용 | ⭐⭐ 쉬움 | 낮음 | **2순위** |
| 캔버스 줌 | ⭐⭐⭐ 유용 | ⭐⭐⭐⭐ 어려움 | 높음 | **3순위** |

### 4.2 권장 구현 순서

```
Phase 31-H: 문제 정보 편집
├─ H-1: ProblemListPanel에 편집 버튼 추가
├─ H-2: 인라인 편집 폼 구현 (GroupPanel 참고)
├─ H-3: matchingStore.updateProblem 연동
└─ H-4: 그룹 JSON 동기화

Phase 31-I: 패널 리사이즈
├─ I-1: 커스텀 리사이즈 핸들 추가
├─ I-2: 드래그 리사이즈 로직
└─ I-3: localStorage 상태 저장

Phase 31-J: 캔버스 줌 (선택)
├─ J-1: 줌 컨트롤 UI
├─ J-2: 스케일 계산 수정
├─ J-3: 스크롤 처리
└─ J-4: 좌표 변환 수정
```

### 4.3 결론

| 기능 | 구현 가능성 | 권장 여부 |
|------|------------|----------|
| 문제 정보 편집 | ✅ 높음 (기존 코드 활용) | **강력 권장** |
| 패널 리사이즈 | ✅ 높음 (간단한 구현) | 권장 |
| 캔버스 줌 | ⚠️ 중간 (복잡도 높음) | 조건부 권장 |

**문제 정보 편집**은 GroupPanel의 검증된 코드를 활용하여 빠르게 구현 가능합니다.
**패널 리사이즈**는 간단한 구현으로 UX 개선 효과가 큽니다.
**캔버스 줌**은 좌표 변환 복잡도가 높아 신중한 접근이 필요합니다.

---

## 5. 빠른 구현 시작점

### 5.1 문제 정보 편집 (즉시 시작 가능)

```tsx
// ProblemListPanel.tsx에 추가할 핵심 코드

const [editingId, setEditingId] = useState<string | null>(null);
const { updateProblem } = useMatchingStore();

// 문제 아이템 렌더링 수정
{!editingId || editingId !== problem.groupId ? (
  // 기존 표시 UI + 편집 버튼
  <button onClick={() => setEditingId(problem.groupId)}>
    <Edit2 className="w-4 h-4" />
  </button>
) : (
  // 편집 폼 (GroupPanel 참고)
  <ProblemEditForm
    problem={problem}
    onSave={(updates) => {
      updateProblem(problem.groupId, updates);
      setEditingId(null);
    }}
    onCancel={() => setEditingId(null)}
  />
)}
```

---

*리포트 끝*
