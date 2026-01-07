# Timetable Studio 버그 분석 연구 리포트

> Stage 5: FigJam 스타일 캔버스 스튜디오 문제점 분석

---

## 1. 개요

### 1.1 현재 상태

| 항목 | 상태 |
|------|------|
| 기본 캔버스 렌더링 | ✅ 정상 |
| 줌/팬 기능 | ⚠️ 부분 동작 |
| 요소 추가 | ❌ 작동 안함 |
| 요소 드래그 | ✅ 정상 |
| 요소 선택 | ✅ 정상 |
| 요소 삭제 | ✅ 정상 |
| 키보드 단축키 | ✅ 정상 |
| 저장/불러오기 | ⚠️ Supabase 테이블 없음 |

### 1.2 분석 파일 목록

- `frontend/src/pages/admin/OperationsPage.tsx` - TimetableStudioView
- `frontend/src/components/studio/Canvas.tsx` - 캔버스 컴포넌트
- `frontend/src/stores/canvasStore.ts` - Zustand 상태 관리
- `frontend/src/components/studio/CanvasElement.tsx` - 요소 래퍼
- `frontend/src/components/studio/widgets/StickyNote.tsx` - 포스트잇
- `frontend/src/api/boards.ts` - 저장/불러오기 API
- `frontend/src/types/canvas.ts` - 타입 정의

---

## 2. 발견된 버그

### 2.1 [Critical] 툴바 버튼으로 요소 생성 불가

**위치**: `CanvasToolbar.tsx:38-68`

**문제 상황**:
```tsx
// 현재 동작: 도구만 선택, 요소 생성 안함
<ToolButton
  icon={<StickyNote className="w-4 h-4" />}
  title="포스트잇 (S)"
  active={tool === 'sticky'}
  onClick={() => setTool('sticky')}  // ❌ 도구 선택만 함
/>
```

**사용자 기대**:
- 포스트잇 버튼 클릭 → 캔버스에 포스트잇 즉시 생성

**현재 동작**:
- 포스트잇 버튼 클릭 → 도구만 'sticky'로 변경
- 캔버스 클릭 필요 → 하지만 클릭 핸들러도 버그

**해결 방안**:
```tsx
// 옵션 A: 버튼 클릭 시 즉시 생성 (FigJam 스타일)
const { addElement, zoom, pan } = useCanvasStore();

const handleAddSticky = () => {
  // 캔버스 중앙에 생성
  const centerX = (window.innerWidth / 2 - pan.x) / zoom;
  const centerY = (300 - pan.y) / zoom;  // 캔버스 높이 600의 중앙

  addElement(createStickyElement(
    { x: centerX, y: centerY },
    { color: 'yellow', header: '새 메모', content: '내용을 입력하세요' }
  ));
};

<ToolButton
  icon={<StickyNote className="w-4 h-4" />}
  title="포스트잇 추가"
  onClick={handleAddSticky}  // ✅ 클릭 시 즉시 생성
/>
```

---

### 2.2 [Critical] 캔버스 클릭으로 요소 추가 작동 안함

**위치**: `OperationsPage.tsx:323-379`

**문제 상황**:
```tsx
// OperationsPage.tsx - handleCanvasClick 함수
const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (tool === 'select') return;

  // 캔버스 영역 클릭 시에만 처리
  const target = e.target as HTMLElement;
  if (!target.classList.contains('canvas-area')) return;  // ❌ 문제!

  // ... 요소 추가 로직
};
```

**원인 분석**:
1. `handleCanvasClick`은 `<div onClick={handleCanvasClick} className="canvas-area">` 에 연결됨
2. 하지만 실제 클릭은 `Canvas` 컴포넌트 내부의 자식 요소에서 발생
3. `Canvas.tsx`의 내부 div에는 `canvas-area` 클래스가 없음
4. 따라서 `target.classList.contains('canvas-area')`는 항상 `false`

**Canvas.tsx 구조**:
```tsx
// Canvas.tsx - 실제 구조
<div
  ref={containerRef}
  className="h-[600px] relative overflow-hidden select-none"  // ❌ canvas-area 없음
  style={{...}}
  onWheel={handleWheel}
  onMouseDown={handleMouseDown}
  ...
>
  <div style={{ transform: ... }}>  // 내부 변환 컨테이너
    {elements.map(...)}
  </div>
</div>
```

**해결 방안**:
```tsx
// 옵션 A: Canvas.tsx에 className 추가
<div
  ref={containerRef}
  className="h-[600px] relative overflow-hidden select-none canvas-area"  // ✅
  ...
>

// 옵션 B: 클릭 핸들러 조건 변경
const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (tool === 'select') return;

  // e.currentTarget === 클릭 래퍼 확인
  if (e.target !== e.currentTarget) return;  // ✅ 더 안전한 방법
  ...
};
```

---

### 2.2 [Critical] 요소 생성 위치가 줌/팬을 고려하지 않음

**위치**: `OperationsPage.tsx:330-333`

**문제 상황**:
```tsx
const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
  ...
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // ❌ zoom, pan 값을 고려하지 않음!
  addElement(createStickyElement({ x, y }, { ... }));
};
```

**원인 분석**:
- 화면 좌표를 그대로 캔버스 좌표로 사용
- 줌이 50%일 때 클릭 위치와 실제 생성 위치가 2배 차이
- 팬(스크롤)된 상태에서 오프셋 무시

**해결 방안**:
```tsx
const { zoom, pan } = useCanvasStore();

const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
  ...
  const rect = e.currentTarget.getBoundingClientRect();

  // 화면 좌표 → 캔버스 좌표 변환
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  const canvasX = (screenX - pan.x) / zoom;  // ✅ 줌/팬 보정
  const canvasY = (screenY - pan.y) / zoom;

  addElement(createStickyElement({ x: canvasX, y: canvasY }, { ... }));
};
```

---

### 2.3 [High] Supabase 테이블 미생성

**위치**: `api/boards.ts`, Supabase 콘솔

**문제 상황**:
- `timetable_boards` 테이블이 Supabase에 존재하지 않음
- 저장 시 에러 발생 (현재는 localStorage fallback으로 동작)

**필요한 마이그레이션**:
```sql
-- supabase/migrations/YYYYMMDD_create_timetable_boards.sql

CREATE TABLE timetable_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE timetable_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users"
ON timetable_boards
FOR ALL
USING (true)
WITH CHECK (true);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timetable_boards_updated_at
BEFORE UPDATE ON timetable_boards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### 2.4 [Medium] 휠 이벤트 passive 경고

**위치**: `Canvas.tsx:48-82`

**문제 상황**:
```tsx
onWheel={handleWheel}  // React의 passive 이벤트 처리
```

**원인 분석**:
- React 17+에서 wheel 이벤트는 기본적으로 passive
- `e.preventDefault()`가 콘솔 경고를 발생시킬 수 있음

**해결 방안**:
```tsx
// useEffect로 직접 이벤트 리스너 추가
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    // ... 줌/팬 로직
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => container.removeEventListener('wheel', handleWheel);
}, [zoom, pan, setZoom, setPan]);
```

---

### 2.5 [Medium] 자동 저장 의존성 문제

**위치**: `OperationsPage.tsx:235-243`

**문제 상황**:
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (elements.length > 0) {
      autoSave(getState());
    }
  }, 30000);

  return () => clearInterval(interval);
}, [elements, autoSave, getState]);  // ⚠️ elements 변경마다 리셋
```

**원인 분석**:
- `elements`가 의존성에 포함되어 있어 요소 추가/수정 시 타이머가 리셋됨
- 빈번한 변경 시 자동 저장이 30초보다 늦어질 수 있음

**해결 방안**:
```tsx
// 의존성에서 elements 제거, ref로 처리
const elementsRef = useRef(elements);
elementsRef.current = elements;

useEffect(() => {
  const interval = setInterval(() => {
    if (elementsRef.current.length > 0) {
      autoSave(getState());
    }
  }, 30000);

  return () => clearInterval(interval);
}, [autoSave, getState]);  // ✅ elements 제거
```

---

### 2.6 [Low] 초기 요소 중복 로드 가능성

**위치**: `OperationsPage.tsx:227-232`

**문제 상황**:
```tsx
useEffect(() => {
  if (elements.length === 0) {
    loadInitialElements();  // ⚠️ 빠른 리렌더링 시 중복 호출 가능
  }
}, []);
```

**원인 분석**:
- React Strict Mode에서 useEffect가 두 번 실행될 수 있음
- `elements.length === 0` 체크가 첫 번째 호출 후 변경되기 전 두 번째 호출 발생 가능

**해결 방안**:
```tsx
const isInitialized = useRef(false);

useEffect(() => {
  if (!isInitialized.current && elements.length === 0) {
    isInitialized.current = true;
    loadInitialElements();
  }
}, []);
```

---

### 2.7 [Low] 리사이즈 핸들 기능 미구현

**위치**: `CanvasElement.tsx:109-117`

**문제 상황**:
```tsx
{/* 선택 시 리사이즈 핸들 */}
{isSelected && (
  <>
    <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-se-resize" />
    {/* ❌ 리사이즈 이벤트 핸들러 없음 */}
  </>
)}
```

**상태**: 시각적 표시만 있고 실제 리사이즈 기능은 미구현
**우선순위**: Low (MVP 기능 아님)

---

## 3. 버그 심각도 요약

| 심각도 | 버그 | 영향 |
|--------|------|------|
| Critical | 요소 추가 클릭 작동 안함 | 핵심 기능 불가 |
| Critical | 줌/팬 좌표 계산 오류 | 요소 위치 불일치 |
| High | Supabase 테이블 없음 | 저장 기능 제한 |
| Medium | 휠 이벤트 passive 경고 | 콘솔 경고 |
| Medium | 자동 저장 타이머 리셋 | 저장 지연 |
| Low | 초기 요소 중복 가능 | 드문 케이스 |
| Low | 리사이즈 미구현 | 기능 부재 |

---

## 4. 권장 수정 순서

### Phase 1: Critical 버그 수정 (즉시)
1. Canvas.tsx에 `canvas-area` 클래스 추가
2. 좌표 계산에 줌/팬 보정 적용

### Phase 2: High 버그 수정
3. Supabase 마이그레이션 생성 및 적용

### Phase 3: Medium 버그 수정
4. 휠 이벤트 passive 처리
5. 자동 저장 의존성 수정

### Phase 4: Low 버그 수정 (선택)
6. 초기화 ref 패턴 적용
7. 리사이즈 기능 구현 (향후)

---

## 5. 테스트 체크리스트

### 수정 후 검증 항목

- [ ] S 키 누르고 캔버스 클릭 → 포스트잇 생성
- [ ] T 키 누르고 캔버스 클릭 → 시간표 생성
- [ ] C 키 누르고 캔버스 클릭 → 계산기 생성
- [ ] M 키 누르고 캔버스 클릭 → 회의록 생성
- [ ] Ctrl+휠로 줌 후 요소 생성 → 올바른 위치
- [ ] Alt+드래그로 팬 후 요소 생성 → 올바른 위치
- [ ] 저장 버튼 클릭 → 정상 저장 (Supabase 또는 localStorage)
- [ ] 불러오기 → 저장된 보드 목록 표시

---

## 6. 참고

### 관련 문서
- Stage 5 캔버스 구현: 이전 세션 참조
- Toss 디자인 시스템: `/docs/reference/` 참조

### 기술 스택
- React 18 + TypeScript
- Zustand (상태 관리)
- Lucide React (아이콘)
- Tailwind CSS (스타일링)

---

*작성일: 2025-12-23*
*분류: 버그 분석 리포트*
