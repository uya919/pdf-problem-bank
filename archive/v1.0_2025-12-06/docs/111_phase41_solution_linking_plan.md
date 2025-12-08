# Phase 41: 해설 연결 워크플로우 개선 개발 계획

> 2025-12-04 | 연구 리포트 기반 실행 계획
> 참고: [110_solution_linking_workflow_research.md](110_solution_linking_workflow_research.md)

---

## 목표

해설 연결 시 **선택된 문제의 정보를 자동으로 맵핑**하고,
연결 완료 후 **다음 미연결 문제를 자동 선택**하여 작업 속도 향상

---

## Phase 41-A: 빠른 UX 개선 (30분)

### 목적
즉시 체감 가능한 UX 개선

### 작업 내용

```
[ ] A-1. Toast 메시지 개선
    파일: frontend/src/pages/UnifiedWorkPage.tsx
    변경:
    - 기존: "${solutionName} 연결 완료!" (예: "베이직쎈_공통수학1_p2_3번_해설 연결 완료!")
    - 변경: "${problemNumber}번 해설 연결 완료!" (예: "3번 해설 연결 완료!")

[ ] A-2. 연결 후 다음 문제 자동 선택
    파일: frontend/src/pages/UnifiedWorkPage.tsx
    변경:
    - 기존: selectProblem(null)  // 선택 해제
    - 변경: selectNextUnlinkedProblem()  // 다음 미연결 문제로 이동

[ ] A-3. 완료 시 피드백 메시지
    조건: 모든 문제 연결 완료 시
    동작: "모든 문제 연결 완료!" Toast + 축하 애니메이션
```

### 완료 조건
- 3번 문제 연결 → "3번 해설 연결 완료!" 표시 → 4번 자동 선택

---

## Phase 41-B: 자동 맵핑 (1시간)

### 목적
선택된 문제의 정보(책이름, 과정, 페이지, 문항번호)를 해설 그룹에 자동 적용

### 작업 내용

```
[ ] B-1. PageViewer에 selectedProblemInfo 전달
    파일: frontend/src/pages/UnifiedWorkPage.tsx
    변경:
    - selectedProblem 정보를 PageViewer의 props로 전달

    <PageViewer
      ...
      selectedProblemInfo={activeTab === 'solution' ? selectedProblem : undefined}
    />

[ ] B-2. PageViewer → GroupPanel props 전달
    파일: frontend/src/pages/PageViewer.tsx
    변경:
    - Props 인터페이스에 selectedProblemInfo 추가
    - GroupPanel에 전달

    interface PageViewerProps {
      ...
      selectedProblemInfo?: {
        bookName?: string;
        course?: string;
        page?: number;
        problemNumber?: string;
      };
    }

[ ] B-3. GroupPanel에서 조건부 기본값 사용
    파일: frontend/src/components/GroupPanel.tsx
    변경:
    - Props에 selectedProblemInfo 추가
    - startEditing()에서 selectedProblemInfo 있으면 그 값 사용

    const startEditing = (group: ProblemGroup) => {
      // 해설 모드: 선택된 문제 정보 사용
      const useMatchingDefaults = selectedProblemInfo != null;

      setEditForm({
        bookName: useMatchingDefaults
          ? selectedProblemInfo.bookName
          : (group.problemInfo?.bookName || defaultBookName),
        course: useMatchingDefaults
          ? selectedProblemInfo.course
          : (group.problemInfo?.course || defaultCourse),
        page: useMatchingDefaults
          ? selectedProblemInfo.page
          : (group.problemInfo?.page || bookPage || 1),
        problemNumber: useMatchingDefaults
          ? selectedProblemInfo.problemNumber
          : suggestedProblemNumber,
      });
    };

[ ] B-4. displayName 생성 시 "_해설" 미포함
    파일: frontend/src/components/GroupPanel.tsx
    확인: 저장 시 displayName에 "_해설" 없이 저장
    - UI에서는 "베이직쎈_공통수학1_p2_3번" 형식 유지
    - 백엔드에서 해설 구분은 별도 필드(linkType)로 처리
```

### 완료 조건
- 3번 문제 선택 → 해설 그룹 생성 → 편집폼에 자동으로:
  - 책이름: "베이직쎈" (문제와 동일)
  - 과정: "공통수학1" (문제와 동일)
  - 페이지: 2 (문제의 페이지)
  - 문항번호: "3" (문제 번호)

---

## Phase 41-C: 고급 기능 (선택, 1시간)

### 목적
추가 편의 기능

### 작업 내용

```
[ ] C-1. 해설 페이지 자동 이동 (선택)
    조건: 다음 문제 선택 시
    동작: 해설 캔버스를 해당 문제의 예상 페이지로 이동
    로직: 문제 페이지 ±1 범위 또는 동일 페이지

[ ] C-2. 자동 선택 설정 옵션 (선택)
    파일: frontend/src/stores/workSessionStore.ts
    추가: autoAdvanceOnLink: boolean (기본값: true)
    UI: 설정 패널에서 토글 가능

[ ] C-3. 키보드 단축키 개선 (선택)
    - Shift+Enter: 현재 문제 유지하며 확정
    - Enter: 확정 + 다음 문제 이동
```

---

## 파일 변경 요약

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `UnifiedWorkPage.tsx` | A, B | Toast 메시지, 자동 선택, props 전달 |
| `PageViewer.tsx` | B | Props 추가, GroupPanel에 전달 |
| `GroupPanel.tsx` | B | selectedProblemInfo props, 조건부 기본값 |
| `workSessionStore.ts` | A | selectNextUnlinkedProblem 호출 확인 |

---

## 테스트 시나리오

### 시나리오 1: 기본 흐름
```
1. 문제 탭에서 1, 2, 3번 문제 생성
2. 해설 탭으로 전환
3. 미연결 목록에서 1번 선택
4. 해설 블록 선택 → G키 → 그룹 생성
5. 확인: 편집폼에 1번 문제 정보 자동 입력됨
6. Enter로 확정
7. 확인: "1번 해설 연결 완료!" Toast
8. 확인: 2번 문제 자동 선택됨
```

### 시나리오 2: 마지막 문제
```
1. 3번(마지막) 문제 선택, 해설 연결
2. Enter로 확정
3. 확인: "모든 문제 연결 완료!" Toast
4. 확인: 축하 메시지 또는 완료 화면
```

### 시나리오 3: 정보 수정
```
1. 자동 입력된 정보 중 페이지만 수정 (2 → 3)
2. Enter로 확정
3. 확인: 수정된 값으로 저장됨
```

---

## 예상 결과 UI

```
┌──────────────────────────────────────────────────────────────────┐
│  [미연결 문제]              │        [해설 캔버스]               │
│                             │                                    │
│  ✓ 1번 - 베이직쎈 p2       │   ┌─────────────────────────────┐  │
│  ✓ 2번 - 베이직쎈 p2       │   │  문항 정보 편집              │  │
│  ● 3번 - 베이직쎈 p2 ←선택 │   │                              │  │
│  ○ 4번 - 베이직쎈 p3       │   │  책이름:  [베이직쎈    ] ←자동│  │
│  ○ 5번 - 베이직쎈 p3       │   │  과정:    [공통수학1   ] ←자동│  │
│                             │   │  페이지:  [2          ] ←자동│  │
│  진행률: 40%                │   │  문항번호:[3          ] ←자동│  │
│  ████████░░░░░░░░           │   │                              │  │
│                             │   │  [Enter: 저장+다음]          │  │
│                             │   └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

Enter 누르면:
┌─────────────────────────────────────────┐
│  ✅ 3번 해설 연결 완료!                  │  ← 간결한 Toast
└─────────────────────────────────────────┘
→ 자동으로 4번 선택됨
```

---

## 승인 후 진행 순서

1. **Phase 41-A** 먼저 진행 (즉시 효과)
2. **Phase 41-B** 진행 (핵심 기능)
3. **Phase 41-C** 필요시 진행 (선택)

---

*작성: Claude Code | 2025-12-04*
