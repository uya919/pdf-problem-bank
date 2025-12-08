# 세션 기반 자동 등록 워크플로우 분석

> **요청**: 세션 생성 → 영속성 유지 → 라벨링 시 문제은행 자동 등록
> **분석일**: 2025-12-03
> **상태**: 심층 분석

---

## 1. 요청 사항 정리

### 사용자가 원하는 것

| 항목 | 현재 | 요청 |
|------|------|------|
| **세션 생성** | 문제 PDF만 선택 | 문제+해설 PDF 동시 선택 |
| **세션 영속성** | 부분적 (step 저장) | 완전 (언제든 재개 가능) |
| **문제 등록** | 별도 "내보내기" 필요 | 라벨링 시 자동 등록 |
| **워크플로우** | 라벨링 → 내보내기 → 문제은행 | 라벨링 = 문제은행 등록 |

---

## 2. 현재 아키텍처 분석

### 현재 데이터 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │ ──► │   Labeling  │ ──► │   Export    │
│   PDF       │     │   (groups)  │     │   (problems)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │
       ▼                  ▼                   ▼
  documents/         documents/          documents/
  {id}/pages/       {id}/groups/        {id}/problems/
                    page_XXX_groups.json   *.png + *.json
```

### 현재 문제점

1. **2단계 작업**: 라벨링(그룹 생성) → 내보내기(이미지 크롭)
2. **수동 트리거**: `/export` API를 별도로 호출해야 함
3. **세션 연결 없음**: 그룹과 문제은행이 독립적

---

## 3. 요청된 아키텍처

### 새로운 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      Work Session                           │
│  (sessionId, problemDocId, solutionDocId, status)          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                  그룹 생성 (G키)                             │
│                        │                                    │
│           ┌────────────┴────────────┐                      │
│           ▼                         ▼                      │
│    groups/에 저장            problems/에 자동 크롭          │
│    (라벨링 데이터)           (문제은행 등록)                 │
│                                     │                      │
│                                     ▼                      │
│                            /api/problems에서              │
│                            바로 조회 가능                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 구현 가능성 분석

### 4.1 세션 영속성: ✅ 이미 구현됨

**현재 Phase 32의 WorkSession**:
```typescript
interface WorkSession {
  sessionId: string;
  problemDocumentId: string;
  solutionDocumentId: string | null;
  step: 'labeling' | 'setup' | 'matching' | 'completed';
  problems: ProblemReference[];  // 등록된 문제 목록
  links: ProblemSolutionLink[];  // 문제-해설 연결
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}
```

- 세션이 JSON 파일로 저장됨 (`work_sessions/ws-*.json`)
- 언제든 재개 가능
- **수정 필요**: `solutionDocumentId`를 처음부터 필수로

### 4.2 자동 등록: ⚠️ 수정 필요

**현재 흐름**:
```
그룹 생성 (PageCanvas) → groups.json 저장 → (수동) Export API 호출 → problems/ 저장
```

**변경 필요**:
```
그룹 생성 (PageCanvas) → groups.json 저장 → 자동 export_single_group 호출 → problems/ 저장
```

**구현 방법**:
```typescript
// PageCanvas.tsx 또는 workSessionStore.ts
const handleGroupCreate = async (blockIds: number[]) => {
  // 1. 그룹 저장 (기존)
  await saveGroups(documentId, pageIndex, groups);

  // 2. 자동 내보내기 (NEW)
  await api.exportSingleGroup(documentId, pageIndex, newGroup.id);

  // 3. 세션에 문제 등록 (기존)
  await addProblemToSession(newGroup.id, ...);
};
```

### 4.3 기술적 복잡도

| 작업 | 난이도 | 예상 시간 |
|------|--------|-----------|
| 세션 생성 시 양쪽 문서 필수 | 쉬움 | 30분 |
| 그룹 생성 시 자동 export | 중간 | 1시간 |
| UI 통합 (리스트 선택) | 쉬움 | 1시간 |
| 테스트 및 버그 수정 | 중간 | 1시간 |

**총 예상**: 3-4시간

---

## 5. UI/UX 철학 우려점

### 5.1 토스 원칙 적용

| 원칙 | 현재 | 변경 후 | 평가 |
|------|------|---------|------|
| **자동화** | 내보내기 수동 | 자동 등록 | ✅ 개선 |
| **시각적 단순화** | 드롭존 2개 | 리스트 선택 | ✅ 개선 |
| **속도감** | 2단계 작업 | 1단계 작업 | ✅ 개선 |

### 5.2 주요 우려점

#### ⚠️ 우려 1: 실수로 등록되면 되돌리기 어려움

**시나리오**:
- 사용자가 잘못된 블록을 그룹으로 만듦
- 자동으로 문제은행에 등록됨
- "아차, 잘못 선택했다" → 삭제 필요

**현재 (2단계)**:
```
그룹 생성 → (검토) → 내보내기
         ↑
     여기서 수정 가능
```

**변경 후 (1단계)**:
```
그룹 생성 = 즉시 등록
         ↓
   잘못되면 삭제 필요
```

**해결책**:
```
옵션 A: Undo 기능 (Ctrl+Z로 마지막 작업 취소)
옵션 B: 그룹 생성 후 확인 토스트 + "실행취소" 버튼
옵션 C: 문제은행에 "임시" 상태로 등록 → 나중에 확정
```

**권장**: 옵션 B
```tsx
showToast(
  '3번 문제가 문제은행에 등록되었습니다',
  {
    type: 'success',
    action: {
      label: '실행취소',
      onClick: () => undoLastGroup()
    }
  }
);
```

---

#### ⚠️ 우려 2: 해설 없이 문제만 등록하면?

**시나리오**:
- 문제 탭에서 그룹 생성 → 문제은행 등록
- 해설은 아직 연결 안 함
- 문제은행에 "해설 없는" 문제가 쌓임

**질문**: 해설 없는 문제도 문제은행에 등록해도 되나요?

**옵션**:
| 옵션 | 장점 | 단점 |
|------|------|------|
| A: 문제만 먼저 등록 | 유연함 | 해설 누락 가능 |
| B: 해설 연결해야 등록 | 완결성 | 작업 흐름 복잡 |
| C: "해설 대기" 상태로 등록 | 절충안 | 상태 관리 필요 |

**권장**: 옵션 A + 필터링
- 문제만 먼저 등록 허용
- 문제은행에서 "해설 없음" 필터로 미완성 문제 확인

---

#### ⚠️ 우려 3: 중복 등록 방지

**시나리오**:
- 같은 그룹을 다시 생성하면?
- 같은 문제가 두 번 등록되나?

**해결책**: 그룹 ID 기반 중복 체크
```python
# export.py
if (problems_dir / f"{group_id}.json").exists():
    # 이미 등록된 그룹 → 덮어쓰기 또는 스킵
    return existing_problem
```

---

#### ✅ 장점 1: 작업 흐름 단순화

**Before**:
```
1. PDF 업로드
2. 라벨링 페이지에서 그룹 생성
3. 그룹 생성 완료
4. "내보내기" 버튼 클릭
5. 문제은행에서 확인
```

**After**:
```
1. 세션 생성 (문제+해설 선택)
2. 라벨링 = 자동 등록
3. 끝
```

---

#### ✅ 장점 2: 세션 기반 추적

- 어떤 세션에서 등록된 문제인지 추적 가능
- 세션 삭제 시 관련 문제도 정리 가능 (옵션)
- 작업 히스토리 관리 용이

---

#### ✅ 장점 3: 일관된 UX 패턴

- WorkSessionDashboard의 세션 리스트 패턴
- 재개 가능한 작업 흐름
- 진행률 시각화

---

## 6. 데이터 모델 변경

### 현재 WorkSession

```typescript
interface WorkSession {
  sessionId: string;
  problemDocumentId: string;
  solutionDocumentId: string | null;  // ← null 허용
  // ...
}
```

### 변경 후

```typescript
interface WorkSession {
  sessionId: string;
  problemDocumentId: string;
  solutionDocumentId: string;  // ← 필수!
  autoExport: boolean;  // 자동 등록 on/off (기본: true)
  // ...
}
```

---

## 7. API 변경

### 세션 생성 API

```python
# Before
POST /api/work-sessions
{
  "problemDocumentId": "math.pdf",
  "name": "optional"
}

# After
POST /api/work-sessions
{
  "problemDocumentId": "math.pdf",
  "solutionDocumentId": "solution.pdf",  # 필수!
  "name": "optional"
}
```

### 그룹 저장 API (변경 없음, 호출 순서만 변경)

```
POST /api/documents/{id}/pages/{page}/groups → 그룹 저장
POST /api/documents/{id}/pages/{page}/groups/{groupId}/export → 자동 호출
```

---

## 8. 구현 체크리스트

### 백엔드
- [ ] `WorkSessionCreate` 모델: `solutionDocumentId` 필수로 변경
- [ ] 그룹 저장 API에 자동 export 옵션 추가 (또는 프론트에서 연속 호출)

### 프론트엔드
- [ ] 세션 생성 모달: 양쪽 문서 동시 선택
- [ ] `DualDocumentSelector` 컴포넌트 (리스트 선택 UI)
- [ ] 그룹 생성 시 `exportSingleGroup` 자동 호출
- [ ] 토스트에 "실행취소" 버튼 추가
- [ ] 라우트 통합 (`/work/:sessionId` 하나로)

---

## 9. 결론

### 구현 가능성: ✅ 높음

- 기존 코드 대부분 재사용 가능
- 핵심 변경은 "자동 export 호출" 추가
- 예상 작업량: 3-4시간

### UI/UX 우려: ⚠️ 중간 (해결 가능)

| 우려 | 심각도 | 해결책 |
|------|--------|--------|
| 실수로 등록 | 중간 | 토스트 + 실행취소 버튼 |
| 해설 없는 문제 | 낮음 | 허용 + 필터링 |
| 중복 등록 | 낮음 | 그룹 ID 중복 체크 |

### 최종 권장

**진행 권장** - 토스 철학(자동화, 속도감)에 부합하며, 우려점은 모두 해결 가능

---

### 워크플로우 최종 비교

**Before (5단계)**:
```
PDF 업로드 → 라벨링 시작 → 그룹 생성 → 내보내기 → 문제은행
```

**After (3단계)**:
```
세션 생성 → 그룹 생성 (= 자동 등록) → 문제은행
```

---

*리포트 작성: Claude Code (Opus)*
*마지막 업데이트: 2025-12-03*
