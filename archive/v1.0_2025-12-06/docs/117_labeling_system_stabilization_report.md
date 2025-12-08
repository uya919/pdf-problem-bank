# 라벨링 시스템 안정화 및 최적화 연구 리포트

> **작성일**: 2025-12-04
> **목적**: 라벨링 시스템 전체 분석, 문제점 식별, 안정화 계획 수립
> **범위**: Phase 32~43 기능 (통합 워크플로우, 동기화, 그룹 관리)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages                          │  Stores                       │
│  ├─ UnifiedWorkPage.tsx         │  └─ workSessionStore.ts       │
│  └─ PageViewer.tsx              │     (Zustand)                 │
├─────────────────────────────────────────────────────────────────┤
│  Components                                                     │
│  ├─ PageCanvas.tsx      (이미지 + 블록 렌더링)                   │
│  ├─ GroupPanel.tsx      (그룹 카드 + 편집)                       │
│  ├─ ProblemListPanel.tsx (문제 목록)                            │
│  └─ SyncIndicator.tsx   (동기화 상태)                            │
├─────────────────────────────────────────────────────────────────┤
│                          API Client                             │
│                    (client.ts - Axios)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│  Routers                        │  Services                     │
│  ├─ work_sessions.py            │  ├─ sync_manager.py           │
│  ├─ blocks.py                   │  └─ file_lock.py              │
│  └─ pdf.py                      │                               │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
│  dataset_root/                                                  │
│  ├─ {document_id}/                                              │
│  │   ├─ pages/          (이미지)                                │
│  │   ├─ blocks/         (블록 JSON)                             │
│  │   ├─ groups/         (그룹 JSON) ← Single Source of Truth    │
│  │   └─ problems/       (내보내기된 이미지)                      │
│  └─ work_sessions/                                              │
│      └─ ws-*.json       (세션 JSON)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   사용자     │     │  Frontend    │     │   Backend    │
│   액션       │────▶│  State       │────▶│   Storage    │
└──────────────┘     └──────────────┘     └──────────────┘
      │                    │                     │
      │                    ▼                     │
      │              ┌──────────────┐            │
      │              │workSessionStore│           │
      │              │  (Zustand)   │            │
      │              └──────────────┘            │
      │                    │                     │
      ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                     동기화 포인트                             │
├──────────────────────────────────────────────────────────────┤
│ 1. 그룹 생성 → localGroups (즉시) → groups.json (디바운스)   │
│ 2. 그룹 생성 → onGroupCreated → addProblem (세션 등록)       │
│ 3. 탭 전환 → fullSync (양방향)                              │
│ 4. 세션 로드 → syncProblems (groups.json → session)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 핵심 컴포넌트 분석

### 2.1 PageViewer.tsx (712 라인)

**역할**: 페이지 이미지, 블록, 그룹을 표시하고 관리

**상태 관리**:
| 상태 | 용도 | 문제점 |
|------|------|--------|
| `localGroups` | 현재 페이지 그룹 | 페이지 전환 시 초기화 |
| `localGroupsRef` | 페이지 전환 시 저장용 | ref 동기화 타이밍 이슈 |
| `isInitialLoadRef` | 자동 저장 방지 플래그 | 복잡한 상태 추적 |
| `debounceTimerRef` | 디바운스 타이머 | 클로저 문제 가능성 |

**저장 로직**:
```
1. saveImmediately(groups, pageIndex) - 즉시 저장
   - Ctrl+S, 페이지 이동 전
   - 디바운스 타이머 취소 후 실행

2. 자동 저장 (2초 디바운스)
   - localGroups 변경 시 트리거
   - isInitialLoadRef로 초기 로드 시 방지
```

**문제점**:
1. **그룹 ID 충돌 (Phase 43 수정 완료)**: 페이지별 순차 ID 생성 → 다른 페이지와 충돌
2. **페이지 전환 시 데이터 유실 가능**: 디바운스 중 페이지 이동 시
3. **상태 추적 복잡성**: 4개 ref + 여러 상태 → 디버깅 어려움

### 2.2 workSessionStore.ts (661 라인)

**역할**: 작업 세션 상태 관리 (Zustand)

**핵심 상태**:
```typescript
currentSession: WorkSession | null;  // 현재 세션
activeTab: 'problem' | 'solution';   // 활성 탭
problemPage: number;                  // 문제 탭 페이지
solutionPage: number;                 // 해설 탭 페이지
selectedProblemId: string | null;    // 선택된 문제
```

**동기화 메서드**:
| 메서드 | 방향 | 용도 |
|--------|------|------|
| `syncProblems()` | groups.json → session | 세션 로드 시 |
| `fullSync()` | 양방향 | 탭 전환 시 |
| `getSyncStatus()` | 읽기 전용 | 상태 확인 |

**문제점**:
1. **무한 루프 방지 처리 복잡**: useMemo, 상수 배열 등 다수의 방어 코드
2. **세션/그룹 불일치**: groups.json은 수정되었지만 session은 업데이트 안 됨

### 2.3 UnifiedWorkPage.tsx (574 라인)

**역할**: 문제 라벨링과 해설 매칭 통합 페이지

**콜백 구조**:
```
PageViewer
    │
    ├─ onGroupCreated ──▶ handleGroupCreated
    │                         │
    │                         ├─ (문제 탭) addProblem()
    │                         └─ (해설 탭) createLink()
    │
    ├─ onGroupDeleted ──▶ handleGroupDeleted
    │                         └─ removeProblem()
    │
    └─ onGroupUpdated ──▶ handleGroupUpdated
                              └─ (현재 미구현)
```

**문제점**:
1. **handleGroupUpdated 미구현**: 그룹 정보 업데이트가 세션에 반영 안 됨
2. **에러 처리 불완전**: addProblem 실패 시 UI 피드백만 있고 복구 없음

### 2.4 sync_manager.py (391 라인)

**역할**: groups.json ↔ WorkSession 양방향 동기화

**원칙**:
```
- groups.json: 그룹 정의의 원본 (Single Source of Truth)
- session.links: 연결 정보의 원본 (Single Source of Truth)
- session.problems: groups.json의 캐시
- groups.json.link: session.links의 캐시
```

**동기화 흐름**:
```
1. sync_problems_to_session
   groups.json → session.problems
   (신규 추가, 삭제, 업데이트)

2. sync_links_to_groups
   session.links → groups.json.link
   (연결 정보 저장)

3. full_sync
   1 + 2 동시 실행
```

**문제점**:
1. **파일 잠금 경합**: 동시 요청 시 잠금 대기
2. **부분 실패 처리 없음**: 일부 파일 업데이트 실패 시 롤백 없음

---

## 3. 발견된 문제점 및 에러

### 3.1 에러 목록

| 번호 | 에러 | 원인 | 상태 |
|------|------|------|------|
| E-01 | 409 Conflict (그룹 ID 충돌) | 페이지별 순차 ID | **수정 완료** (Phase 43 Upsert) |
| E-02 | HTML 중첩 버튼 경고 | `<button>` 안에 `<button>` | **수정 완료** |
| E-03 | 동기화 상태 "pending" 지속 | groups.json과 session 불일치 | **분석 필요** |
| E-04 | 페이지 전환 시 0개 그룹 저장 | 초기화 타이밍 이슈 | **분석 필요** |

### 3.2 로그 분석 (사용자 제공)

**정상 흐름**:
```
[Phase 39] Group created: L1 tab: problem page: 17
[Phase 32] Problem added: 문제 L1
✅ 성공
```

**문제 흐름**:
```
[Phase 39] Group created: L3 tab: problem page: 17
[Phase 32] Failed to add problem: {status: 409, detail: "그룹 'L3'는 이미 등록되어 있습니다"}
❌ 실패 → Phase 43에서 Upsert로 수정
```

**동기화 상태 지속**:
```
[Phase 37-D] Sync status: {status: 'pending', groupsCount: 9, sessionCount: 7}
⚠️ 항상 pending 상태
```

### 3.3 페이지 전환 시 데이터 유실

```
[PageChange] Page changed to 9, resetting groups, auto-save disabled
[Phase 26] Data loaded from server, auto-save enabled
...
[ArrowLeft] Saving page 9 before moving to 8
[SaveGroups] Saving to page 9
[SaveGroups] Groups count: 0  ← 문제! 7개 그룹이 0개로 저장됨
```

**원인 분석**:
1. `setLocalGroups([])` 호출 후 `saveImmediately` 실행
2. 새 데이터 로드 전에 빈 배열로 저장됨
3. `isInitialLoadRef` 체크가 페이지 이동에는 적용 안 됨

---

## 4. 안정화 계획

### 4.1 긴급 수정 (Phase 43) - 완료

| 항목 | 상태 |
|------|------|
| 그룹 ID 충돌 → Upsert 로직 | **완료** |
| HTML 중첩 버튼 경고 | **완료** |

### 4.2 단기 안정화 (Phase 44)

**목표**: 데이터 유실 방지, 동기화 안정화

#### 44-A: 페이지 전환 시 저장 순서 수정

**현재**:
```typescript
// 1. 이전 페이지 저장 (비동기, 차단 안 함)
saveGroupsMutation.mutate(...);
// 2. 상태 초기화
setLocalGroups([]);  // ← 문제: 1이 완료되기 전에 실행
```

**개선**:
```typescript
// 1. 이전 페이지 저장 (동기, 완료 대기)
await saveGroupsMutation.mutateAsync(...);
// 2. 상태 초기화
setLocalGroups([]);
```

**예상 시간**: 1시간

#### 44-B: 동기화 상태 자동 해결

**현재**: 동기화 상태가 "pending"이면 토스트만 표시

**개선**:
```typescript
// 페이지 진입 시 동기화 상태 확인
useEffect(() => {
  const checkAndSync = async () => {
    const status = await getSyncStatus();
    if (status.status === 'pending' || status.status === 'conflict') {
      await fullSync();  // 자동 해결
    }
  };
  checkAndSync();
}, [sessionId]);
```

**예상 시간**: 2시간

#### 44-C: 그룹 ID 생성 개선

**현재**: 페이지 로컬 순차 ID (`L1`, `L2`, `L3`...)

**개선 옵션**:
1. **타임스탬프 기반**: `L_1733304789_a3f2x` (충돌 0%)
2. **페이지 포함**: `L17_1`, `L17_2` (추적 용이)
3. **세션 전체 체크**: 중복 방지 후 생성

**권장**: 옵션 2 (페이지 포함)

**예상 시간**: 2시간

### 4.3 중기 최적화 (Phase 45)

#### 45-A: 상태 관리 단순화

**현재**: 4개 ref + 복잡한 useEffect 의존성

**개선**:
```typescript
// useGroupManager 훅으로 통합
const {
  groups,
  createGroup,
  deleteGroup,
  updateGroup,
  saveGroups,
  isSaving,
} = useGroupManager(documentId, pageIndex);
```

**예상 시간**: 8시간

#### 45-B: 디버깅 도구 개선

**추가 기능**:
1. 상태 스냅샷 로깅 (localStorage 또는 파일)
2. 동기화 히스토리 추적
3. 개발자 패널에 실시간 상태 표시

**예상 시간**: 4시간

### 4.4 장기 아키텍처 개선 (Phase 46+)

#### 46-A: 낙관적 업데이트 + 롤백

**현재**: 서버 응답 후 UI 업데이트

**개선**:
```typescript
// 1. UI 즉시 업데이트 (낙관적)
setLocalGroups([...localGroups, newGroup]);

// 2. 서버 요청
try {
  await api.saveGroups(...);
} catch {
  // 3. 실패 시 롤백
  setLocalGroups(previousGroups);
  showToast('저장 실패', 'error');
}
```

#### 46-B: 오프라인 지원

**범위**:
1. IndexedDB에 로컬 캐시
2. 온라인 복귀 시 동기화
3. 충돌 해결 UI

---

## 5. 테스트 시나리오

### 5.1 회귀 테스트

| 시나리오 | 예상 결과 | 검증 방법 |
|----------|----------|----------|
| 그룹 생성 (같은 ID) | 업데이트 성공 | 로그에 "upsert" 표시 |
| 페이지 이동 (←→) | 그룹 유지 | 돌아왔을 때 그룹 수 확인 |
| 탭 전환 (문제↔해설) | 동기화 완료 | status: "synced" |
| 세션 재로드 | 데이터 복원 | 모든 그룹/연결 유지 |

### 5.2 스트레스 테스트

| 시나리오 | 예상 결과 |
|----------|----------|
| 빠른 페이지 이동 (10회/초) | 데이터 유실 없음 |
| 동시 그룹 생성 (5개) | 모든 그룹 저장 |
| 대용량 문서 (100페이지) | 성능 저하 없음 |

---

## 6. 파일 구조 정리

### 6.1 핵심 파일 (건드릴 때 주의)

```
Frontend:
├─ src/pages/PageViewer.tsx        # 라벨링 핵심
├─ src/pages/UnifiedWorkPage.tsx   # 통합 페이지
├─ src/stores/workSessionStore.ts  # 상태 관리
├─ src/components/PageCanvas.tsx   # 캔버스 렌더링
└─ src/components/GroupPanel.tsx   # 그룹 편집

Backend:
├─ app/routers/work_sessions.py    # 세션 API
├─ app/routers/blocks.py           # 그룹 API
└─ app/services/sync_manager.py    # 동기화
```

### 6.2 데이터 파일

```
dataset_root/
├─ {document_id}/
│   ├─ meta.json                   # 문서 메타데이터
│   ├─ settings.json               # 문서 설정
│   ├─ pages/                      # 페이지 이미지
│   ├─ blocks/
│   │   └─ page_XXXX_blocks.json   # 블록 데이터
│   ├─ groups/
│   │   └─ page_XXXX_groups.json   # 그룹 데이터 (SSOT)
│   └─ problems/                   # 내보내기된 이미지
└─ work_sessions/
    └─ ws-*.json                   # 세션 데이터
```

---

## 7. 결론 및 권장사항

### 7.1 즉시 조치 완료

| 항목 | 상태 |
|------|------|
| 그룹 ID 충돌 (409 에러) | ✅ Phase 43 Upsert 적용 |
| HTML 중첩 버튼 경고 | ✅ div role="button"으로 변경 |

### 7.2 다음 단계 권장

1. **Phase 44-A**: 페이지 전환 시 저장 순서 수정 (1시간)
2. **Phase 44-B**: 동기화 상태 자동 해결 (2시간)
3. **Phase 44-C**: 그룹 ID 생성 개선 (2시간)

### 7.3 장기 권장

1. **useGroupManager 훅 도입**: 상태 관리 단순화
2. **낙관적 업데이트 적용**: UX 개선
3. **테스트 자동화**: 회귀 방지

---

## 8. 용어 정리

| 용어 | 설명 |
|------|------|
| **그룹 (Group)** | 블록들의 묶음 = 문제 1개 |
| **세션 (Session)** | 작업 단위 (문제 문서 + 해설 문서) |
| **문제 (Problem)** | 세션 내 그룹 참조 |
| **연결 (Link)** | 문제-해설 매칭 |
| **SSOT** | Single Source of Truth (원본) |
| **Upsert** | Insert or Update |

---

*작성: Claude Code | 2025-12-04*
