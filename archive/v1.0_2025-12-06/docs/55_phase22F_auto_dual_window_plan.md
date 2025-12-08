# Phase 22-F: 자동 듀얼 윈도우 매칭 시스템

## 개요

문제 PDF와 해설 PDF를 업로드하면 자동으로 두 개의 브라우저 창이 열리고, 매칭 세션으로 연결되는 기능 구현

---

## 목표

1. 문제/해설 PDF 동시 업로드 UI
2. 버튼 클릭 시 자동으로 두 번째 창 열기
3. 두 창이 자동으로 매칭 세션에 연결
4. 팝업 차단 대응

---

## 단계별 구현 계획

### Phase 22-F-1: 듀얼 업로드 UI 컴포넌트

**파일:** `frontend/src/components/matching/DualUploadCard.tsx`

```
┌─────────────────────────────────────────────────────┐
│           문제-해설 매칭 시작하기                    │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐      │
│  │   📄 문제 PDF     │  │   📖 해설 PDF     │      │
│  │                   │  │                   │      │
│  │  드래그 앤 드롭   │  │  드래그 앤 드롭   │      │
│  │  또는 클릭       │  │  또는 클릭       │      │
│  └───────────────────┘  └───────────────────┘      │
│                                                     │
│  문제: math_bible_problems.pdf  ✓                  │
│  해설: math_bible_solutions.pdf ✓                  │
│                                                     │
│         [ 🔗 듀얼 윈도우로 매칭 시작 ]              │
└─────────────────────────────────────────────────────┘
```

**구현 내용:**
- 두 개의 PDF 드롭존
- 업로드 상태 표시
- 둘 다 업로드되면 "매칭 시작" 버튼 활성화

**예상 시간:** 1시간

---

### Phase 22-F-2: 자동 창 열기 로직

**파일:** `frontend/src/hooks/useDualWindowLauncher.ts`

```typescript
interface UseDualWindowLauncherOptions {
  problemDocId: string;
  solutionDocId: string;
}

interface UseDualWindowLauncherReturn {
  launchDualWindows: () => Promise<void>;
  isLaunching: boolean;
  error: string | null;
}
```

**핵심 로직:**
```typescript
const launchDualWindows = async () => {
  // 1. 팝업 차단 우회: 클릭 컨텍스트에서 먼저 빈 창 열기
  const solutionWindow = window.open('about:blank', '_blank',
    'width=960,height=1080,left=960,top=0'
  );

  if (!solutionWindow) {
    throw new Error('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
  }

  // 2. 매칭 세션 생성
  const session = await api.createMatchingSession({
    name: `매칭 ${new Date().toLocaleDateString()}`,
    problemDocumentId: problemDocId,
    solutionDocumentId: solutionDocId
  });

  // 3. 해설 창 URL 설정
  solutionWindow.location.href =
    `/viewer/${solutionDocId}?session=${session.sessionId}&role=solution`;

  // 4. 현재 창을 문제 창으로
  window.location.href =
    `/viewer/${problemDocId}?session=${session.sessionId}&role=problem`;
};
```

**예상 시간:** 1시간

---

### Phase 22-F-3: 대시보드 통합

**수정 파일:** `frontend/src/pages/Dashboard.tsx`

**변경 내용:**
- 기존 단일 PDF 업로드 카드 유지
- 새로운 "듀얼 매칭" 카드 추가

```
┌──────────────────────────────────────────────────────────────┐
│  대시보드                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │  PDF 업로드     │  │  문제-해설 매칭                  │   │
│  │  (단일 문서)    │  │  (듀얼 윈도우)                  │   │
│  │                 │  │                                  │   │
│  │  📄 드래그앤드롭│  │  📄 문제 PDF  📖 해설 PDF      │   │
│  │                 │  │  [매칭 시작]                    │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
│                                                              │
│  최근 문서 목록...                                          │
└──────────────────────────────────────────────────────────────┘
```

**예상 시간:** 30분

---

### Phase 22-F-4: PageViewer 자동 연결

**수정 파일:** `frontend/src/pages/PageViewer.tsx`

**변경 내용:**
- URL 파라미터 자동 감지 개선
- `session` + `role` 있으면 자동으로 매칭 모드 진입
- RoleSelector 모달 스킵

```typescript
// 기존 코드
const { sessionId, role, isMatchingMode } = useMatchingSession();

// 개선: URL에 role이 있으면 RoleSelector 스킵
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const urlRole = params.get('role') as WindowRole;

  if (urlRole && sessionId) {
    // 자동으로 역할 설정 (모달 없이)
    setRole(urlRole);
  }
}, [sessionId]);
```

**예상 시간:** 30분

---

### Phase 22-F-5: 팝업 차단 안내 UI

**파일:** `frontend/src/components/matching/PopupBlockedModal.tsx`

```
┌─────────────────────────────────────────┐
│  ⚠️ 팝업이 차단되었습니다               │
├─────────────────────────────────────────┤
│                                         │
│  듀얼 윈도우 매칭을 위해서는            │
│  팝업 허용이 필요합니다.                │
│                                         │
│  브라우저 주소창 오른쪽의              │
│  🚫 아이콘을 클릭하여 허용해주세요     │
│                                         │
│  [ 다시 시도 ]  [ 단일 창으로 진행 ]   │
└─────────────────────────────────────────┘
```

**예상 시간:** 30분

---

### Phase 22-F-6: 창 동기화 상태 표시

**수정 파일:** `frontend/src/components/matching/MatchingHeader.tsx`

**추가 기능:**
- 상대 창 연결 상태 표시
- 연결 끊김 시 재연결 버튼

```
┌─────────────────────────────────────────────────────────┐
│ 📄 문제 창 | session-abc123 | 👥 2개 창 연결 | [종료] │
└─────────────────────────────────────────────────────────┘

// 연결 끊김 시
┌─────────────────────────────────────────────────────────┐
│ 📄 문제 창 | ⚠️ 해설 창 연결 끊김 | [재연결] | [종료]  │
└─────────────────────────────────────────────────────────┘
```

**예상 시간:** 30분

---

## 구현 순서 요약

| 단계 | 내용 | 예상 시간 |
|------|------|----------|
| F-1 | DualUploadCard 컴포넌트 | 1시간 |
| F-2 | useDualWindowLauncher 훅 | 1시간 |
| F-3 | Dashboard 통합 | 30분 |
| F-4 | PageViewer 자동 연결 | 30분 |
| F-5 | 팝업 차단 안내 모달 | 30분 |
| F-6 | 연결 상태 표시 개선 | 30분 |
| **합계** | | **4시간** |

---

## 파일 생성/수정 목록

### 새로 생성
- `frontend/src/components/matching/DualUploadCard.tsx`
- `frontend/src/hooks/useDualWindowLauncher.ts`
- `frontend/src/components/matching/PopupBlockedModal.tsx`

### 수정
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/PageViewer.tsx`
- `frontend/src/components/matching/MatchingHeader.tsx`
- `frontend/src/components/matching/index.ts`

---

## 테스트 시나리오

1. **정상 플로우**
   - 문제 PDF 업로드
   - 해설 PDF 업로드
   - "매칭 시작" 클릭
   - 두 창이 열리고 자동 연결 확인

2. **팝업 차단 시**
   - 팝업 차단 모달 표시
   - "다시 시도" → 수동으로 허용 후 재시도
   - "단일 창으로 진행" → 기존 방식 fallback

3. **창 닫힘 시**
   - 한 창이 닫히면 다른 창에 알림
   - "재연결" 버튼으로 새 창 열기

---

*작성일: 2025-12-02*
