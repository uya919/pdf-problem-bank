# Phase 22-F 에러 분석 및 수정 계획

## 에러 요약

**문제**: DualUploadCard가 사용자에게 보이지 않음

**원인**: 계획서(55_phase22F_auto_dual_window_plan.md)에서 `Dashboard.tsx`를 수정하라고 명시했으나, 실제 라우팅에서는 `Dashboard.tsx`가 사용되지 않음

---

## 근본 원인 분석

### 1. 라우팅 구조 불일치

**Phase 22-F 계획서 (55번 문서)**:
```
Phase 22-F-3: 대시보드 통합
수정 파일: frontend/src/pages/Dashboard.tsx
```

**실제 App.tsx 라우팅**:
```typescript
<Route path="/" element={<MinimalLayout />}>
  <Route index element={<RegistrationPage />} />  // ← 실제 사용되는 페이지
  ...
</Route>
```

### 2. UI 리팩토링 이력

- **Phase 21.5**에서 "미니멀 UI with 3-메뉴 사이드바"로 리팩토링
- 기존 `Dashboard.tsx` → `RegistrationPage.tsx`로 대체됨
- Phase 22-F 계획 작성 시 이 변경사항을 반영하지 못함

### 3. 현재 상태

| 파일 | 상태 | 문제점 |
|------|------|--------|
| `Dashboard.tsx` | DualUploadCard 추가됨 | 라우팅에 없어 사용자 접근 불가 |
| `RegistrationPage.tsx` | 단일 PDF 드롭존만 있음 | DualUploadCard 미적용 |

---

## 수정 계획

### Step 1: RegistrationPage.tsx 분석

현재 RegistrationPage.tsx의 구조:
```
┌─────────────────────────────────────────────────────┐
│  등록 & 라벨링                                        │
│  PDF, HWP, HWPX 파일을 업로드하고 문제를 라벨링하세요  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │     📤 파일을 드래그하거나 클릭하세요           ││
│  │     PDF, HWP, HWPX, HML 파일 지원               ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  처리 중 문서 목록...                               │
│  진행 중인 라벨링 목록...                           │
│  완료된 문서 목록...                                │
└─────────────────────────────────────────────────────┘
```

### Step 2: UI 디자인 결정

**옵션 A: 듀얼 업로드 카드를 상단에 추가**
```
┌─────────────────────────────────────────────────────┐
│  등록 & 라벨링                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ╔═══════════════════════════════════════════════╗ │
│  ║  🔗 문제-해설 매칭 시작하기                     ║ │
│  ║  ┌───────────┐  ┌───────────┐                 ║ │
│  ║  │ 📄 문제   │  │ 📖 해설   │  [매칭 시작]    ║ │
│  ║  └───────────┘  └───────────┘                 ║ │
│  ╚═══════════════════════════════════════════════╝ │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  📤 단일 파일 업로드 (기존 드롭존)               ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  문서 목록...                                        │
└─────────────────────────────────────────────────────┘
```

**장점**:
- 듀얼 매칭 기능이 눈에 잘 띔
- 기존 기능과 분리되어 혼란 방지

**단점**:
- 페이지가 길어짐

---

**옵션 B: 탭으로 분리**
```
┌─────────────────────────────────────────────────────┐
│  등록 & 라벨링                                        │
├─────────────────────────────────────────────────────┤
│  [ 단일 업로드 ]  [ 문제-해설 매칭 ]                  │
│  ─────────────────────────────────────              │
│                                                     │
│  (선택된 탭에 따라 다른 UI 표시)                      │
└─────────────────────────────────────────────────────┘
```

**장점**:
- UI가 깔끔함
- 사용자가 원하는 기능만 선택

**단점**:
- 탭 전환 로직 필요
- 기존 UI 대폭 수정 필요

---

**권장: 옵션 A (듀얼 업로드 카드 상단 추가)**

이유:
1. 기존 코드 최소 수정
2. 새 기능임을 명확히 알림
3. DualUploadCard 컴포넌트 재사용 가능

---

### Step 3: 구현 계획

#### 3-1. RegistrationPage.tsx 수정

```typescript
// 추가할 import
import { DualUploadCard } from '@/components/matching/DualUploadCard';
import { PopupBlockedModal } from '@/components/matching/PopupBlockedModal';

// 상태 추가
const [showPopupBlockedModal, setShowPopupBlockedModal] = useState(false);

// 렌더링 (Header 아래, 기존 Drop Zone 위에)
<>
  {/* Header */}
  <div className="mb-8">...</div>

  {/* Phase 22-F-3: 듀얼 매칭 카드 */}
  <DualUploadCard
    onPopupBlocked={() => setShowPopupBlockedModal(true)}
    className="mb-8"
  />

  {/* 기존 단일 파일 Drop Zone */}
  <Card {...getRootProps()}>...</Card>

  {/* 문서 목록 ... */}

  {/* 팝업 차단 모달 */}
  <PopupBlockedModal
    isOpen={showPopupBlockedModal}
    onClose={() => setShowPopupBlockedModal(false)}
    onRetry={() => {...}}
    onSingleWindow={() => {...}}
  />
</>
```

#### 3-2. DualUploadCard 컴포넌트 확인/수정

현재 DualUploadCard.tsx가 Dashboard.tsx용으로 작성되어 있을 수 있음
- props 인터페이스 확인
- RegistrationPage와의 호환성 확인

#### 3-3. Dashboard.tsx 정리 (선택)

- DualUploadCard 관련 코드 제거
- 또는 파일 자체를 삭제 (라우팅에서 사용 안 함)

---

## 수정 작업 순서

| 순서 | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1 | DualUploadCard 컴포넌트 확인 | `DualUploadCard.tsx` | props, 스타일 검토 |
| 2 | RegistrationPage에 통합 | `RegistrationPage.tsx` | import 및 렌더링 추가 |
| 3 | 테스트 | 브라우저 | UI 확인 및 기능 테스트 |
| 4 | Dashboard 정리 (선택) | `Dashboard.tsx` | 불필요한 코드 제거 |

---

## 예상 변경 사항

### 변경 파일
- `frontend/src/pages/RegistrationPage.tsx` - DualUploadCard 통합

### 유지 파일 (이미 작성됨)
- `frontend/src/components/matching/DualUploadCard.tsx` ✓
- `frontend/src/components/matching/PopupBlockedModal.tsx` ✓
- `frontend/src/hooks/useDualWindowLauncher.ts` ✓

### 삭제/정리 대상 (선택)
- `frontend/src/pages/Dashboard.tsx` - DualUploadCard 관련 코드

---

## 테스트 체크리스트

- [ ] http://localhost:5173 접속 시 듀얼 매칭 카드가 보이는가?
- [ ] 문제 PDF 드롭 시 업로드되는가?
- [ ] 해설 PDF 드롭 시 업로드되는가?
- [ ] 둘 다 업로드 후 "매칭 시작" 버튼 활성화되는가?
- [ ] "매칭 시작" 클릭 시 두 창이 열리는가?
- [ ] 팝업 차단 시 안내 모달이 뜨는가?
- [ ] 기존 단일 파일 업로드도 정상 작동하는가?

---

*작성일: 2025-12-02*
