# FigJam 스타일 Timetable Studio 개발 계획

> Stage 5 재정의: FigJam/Miro 스타일 캔버스 기반 시간표 계획 도구

## 1. 현황 분석

### 1.1 기존 구현 상태

**OperationsPage의 TimetableStudioView (활성화 필요)**
- 위치: `frontend/src/pages/admin/OperationsPage.tsx` (210-327라인)
- FigJam 스타일 캔버스 UI
- 포스트잇, 시간표 위젯, 계산기 위젯, 회의록 위젯
- 드래그 가능한 요소들 (cursor-move)
- 점 패턴 배경

**문제점**
- 현재 `studio` 메뉴 클릭 시 `/admin/timetable-studio`로 리다이렉트
- 별도로 만든 DB 기반 Timetable Studio로 이동 (롤백 필요)

### 1.2 롤백 대상

방금 만든 DB 기반 Timetable Studio:
- `frontend/src/pages/admin/TimetableStudioPage.tsx`
- `frontend/src/components/timetable/*.tsx`
- `frontend/src/hooks/useTimetable.ts` (useMultipleSlots 등 추가분)
- `frontend/src/api/timetable.ts`
- `frontend/src/types/timetable.ts`
- App.tsx의 `/admin/timetable-studio` 라우트
- OperationsPage의 navigate('/admin/timetable-studio') 호출

### 1.3 목표

**FigJam/Miro 스타일 화이트보드**를 토스 UI/UX 스타일로 구현:
- 무한 캔버스 (줌/팬)
- 드래그&드롭 가능한 위젯들
- 실시간 협업 가능한 구조 (향후)
- 깔끔한 토스 디자인 시스템 적용

---

## 2. 단계별 개발 계획

### Phase 1: 롤백 및 기반 정리

**1-A: OperationsPage 복원**
```typescript
// handleMenuClick에서 studio 리다이렉트 제거
if (menuId === 'studio') {
  // navigate('/admin/timetable-studio'); // 삭제
  setActiveMenu(menuId);  // 기존 동작으로 복원
  return;
}
```

**1-B: App.tsx 라우트 제거**
```typescript
// 삭제
<Route path="admin/timetable-studio" element={...} />
```

**1-C: 불필요한 파일 정리 (선택적)**
- TimetableStudioPage.tsx는 삭제하거나 보관
- timetable 컴포넌트들은 향후 사용 가능 (보관 권장)

---

### Phase 2: 캔버스 엔진 구현

**2-A: 무한 캔버스 컨테이너**
```typescript
interface CanvasState {
  zoom: number;        // 0.25 ~ 4
  pan: { x: number; y: number };
  elements: CanvasElement[];
}

interface CanvasElement {
  id: string;
  type: 'sticky' | 'timetable' | 'calculator' | 'meeting' | 'text' | 'arrow';
  position: { x: number; y: number };
  size: { width: number; height: number };
  data: Record<string, any>;
  zIndex: number;
}
```

**2-B: 줌/팬 인터랙션**
- 마우스 휠: 줌 인/아웃 (캔버스 중심 기준)
- 마우스 드래그 (빈 영역): 팬 이동
- 미니맵 (선택적)

**2-C: 요소 드래그&드롭**
- 요소 선택 (클릭)
- 요소 이동 (드래그)
- 다중 선택 (Shift+클릭 / 영역 선택)

---

### Phase 3: 위젯 시스템

**3-A: 포스트잇 위젯**
```typescript
interface StickyNoteWidget {
  type: 'sticky';
  data: {
    color: 'yellow' | 'blue' | 'pink' | 'green' | 'orange';
    header: string;
    content: string;
    fontSize?: 'sm' | 'md' | 'lg';
  };
}
```
- 더블클릭 편집
- 색상 변경
- 크기 조절

**3-B: 시간표 위젯**
```typescript
interface TimetableWidget {
  type: 'timetable';
  data: {
    title: string;
    version?: string;
    rows: string[][];  // [시간][월,화,수,목,금,토]
    colorScheme?: Record<string, string>;
  };
}
```
- 셀 편집 가능
- 색상 규칙 커스터마이징

**3-C: 계산기 위젯**
```typescript
interface CalculatorWidget {
  type: 'calculator';
  data: {
    title: string;
    rows: { label: string; value: number; }[];
  };
}
```
- 자동 합계 계산
- 행 추가/삭제

**3-D: 회의록 위젯**
```typescript
interface MeetingWidget {
  type: 'meeting';
  data: {
    title: string;
    date: string;
    items: { checked: boolean; text: string; }[];
  };
}
```
- 체크리스트 토글
- 항목 추가/삭제

**3-E: 텍스트/화살표**
- 자유 텍스트 박스
- 연결 화살표 (두 요소 연결)

---

### Phase 4: 툴바 기능화

**4-A: 도구 선택**
```typescript
type Tool = 'select' | 'sticky' | 'timetable' | 'calculator' | 'meeting' | 'text' | 'arrow';
```

**4-B: 실행취소/다시실행**
- Command 패턴으로 히스토리 관리
- Ctrl+Z / Ctrl+Y 단축키

**4-C: 줌 컨트롤**
- 확대/축소 버튼
- 줌 레벨 표시 (100%)
- 화면에 맞추기 (Fit to screen)

---

### Phase 5: 저장/불러오기

**5-A: 로컬 저장**
- localStorage에 캔버스 상태 저장
- 브라우저 종료 시 자동 저장

**5-B: Supabase 저장 (선택적)**
```sql
CREATE TABLE timetable_boards (
  id UUID PRIMARY KEY,
  name TEXT,
  data JSONB,  -- 캔버스 상태 전체
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**5-C: 내보내기**
- JSON 파일 다운로드
- 이미지 내보내기 (선택적)

---

### Phase 6: 토스 스타일 폴리시

**6-A: 색상 시스템**
```typescript
const TOSS_WIDGET_COLORS = {
  sticky: {
    yellow: { bg: '#FFF9C4', border: '#FFF176' },
    blue: { bg: '#BBDEFB', border: '#64B5F6' },
    pink: { bg: '#F8BBD0', border: '#F48FB1' },
    green: { bg: '#C8E6C9', border: '#81C784' },
    orange: { bg: '#FFE0B2', border: '#FFB74D' },
  },
  header: {
    blue: 'bg-toss-blue text-white',
    purple: 'bg-purple-500 text-white',
    orange: 'bg-orange-500 text-white',
  },
};
```

**6-B: 애니메이션**
- 요소 생성: scale-in
- 요소 삭제: fade-out
- 드래그: subtle shadow elevation

**6-C: 반응형**
- 태블릿: 터치 지원
- 모바일: 읽기 전용 또는 단순화된 UI

---

## 3. 파일 구조 (예상)

```
frontend/src/
├── components/
│   └── studio/
│       ├── Canvas.tsx           # 무한 캔버스 컨테이너
│       ├── CanvasToolbar.tsx    # 상단 툴바
│       ├── CanvasElement.tsx    # 요소 래퍼 (드래그/리사이즈)
│       ├── widgets/
│       │   ├── StickyNote.tsx
│       │   ├── TimetableWidget.tsx
│       │   ├── CalculatorWidget.tsx
│       │   ├── MeetingWidget.tsx
│       │   └── TextBox.tsx
│       └── index.ts
├── hooks/
│   └── useCanvas.ts             # 캔버스 상태 관리
├── stores/
│   └── canvasStore.ts           # Zustand 스토어 (선택적)
└── types/
    └── canvas.ts                # 캔버스 타입 정의
```

---

## 4. 우선순위

| 순위 | Phase | 설명 | 예상 복잡도 |
|-----|-------|------|------------|
| 1 | Phase 1 | 롤백 및 기반 정리 | 낮음 |
| 2 | Phase 2-A | 캔버스 컨테이너 기본 | 중간 |
| 3 | Phase 3-A~D | 위젯 컴포넌트 | 중간 |
| 4 | Phase 2-B,C | 줌/팬, 드래그 | 높음 |
| 5 | Phase 4 | 툴바 기능화 | 중간 |
| 6 | Phase 5 | 저장/불러오기 | 중간 |
| 7 | Phase 6 | 폴리시 | 낮음 |

---

## 5. 기술적 고려사항

### 5-1: 캔버스 구현 방식 선택

| 방식 | 장점 | 단점 |
|-----|-----|------|
| **DIV + CSS Transform** | React 친화적, 쉬운 구현 | 대량 요소 시 성능 |
| **HTML Canvas** | 높은 성능 | React와 통합 복잡 |
| **SVG** | 벡터 그래픽, 중간 성능 | 복잡한 인터랙션 |
| **라이브러리 (ReactFlow, Excalidraw)** | 빠른 개발 | 커스터마이징 제한 |

**권장: DIV + CSS Transform**
- 현재 TimetableStudioView가 이미 이 방식
- 요소 수가 적음 (수십 개 수준)
- 토스 스타일 적용 용이

### 5-2: 상태 관리

**Zustand 권장**
```typescript
interface CanvasStore {
  elements: CanvasElement[];
  selectedIds: string[];
  zoom: number;
  pan: { x: number; y: number };
  tool: Tool;

  // Actions
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElements: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
}
```

### 5-3: 드래그 라이브러리

**옵션**
- `@dnd-kit/core`: 모던, 접근성 좋음
- `react-draggable`: 간단한 경우
- 직접 구현: 세밀한 제어 필요 시

---

## 6. 다음 단계

사용자 확인 필요:
1. Phase 1 (롤백) 즉시 진행할까요?
2. 어느 Phase까지 구현할까요?
3. 추가 위젯 종류가 있나요?
4. 저장 방식 (로컬 vs Supabase)?

---

*작성일: 2025-12-23*
*버전: 1.0*
