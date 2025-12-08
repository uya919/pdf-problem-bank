# Phase 44: 라벨링 시스템 안정화 상세 개발 계획

**작성일**: 2025-12-04
**목표**: 데이터 유실 방지 + 동기화 안정성 + 디버깅 용이성
**총 예상 시간**: 6-8시간

---

## 개요

### 현재 상태

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 43 완료: 409 Conflict → Upsert 패턴 적용                  │
│  - 같은 그룹 ID가 다른 페이지에서 재사용되어도 업데이트로 처리     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  남은 문제:                                                      │
│  1. 페이지 전환 시 "0개 그룹 저장" 로그 (데이터 유실 위험)         │
│  2. 동기화 상태가 "pending"으로 고정 (자동 해결 안됨)             │
│  3. 페이지별 순차 ID(L1,L2,L3)가 전역 충돌 (근본 원인)            │
│  4. 디버그 로그 과다 (프로덕션에서 성능 저하)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 아키텍처 이해

```
┌──────────────────────────────────────────────────────────────────┐
│                    데이터 흐름 (SSOT 원칙)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [PageViewer]                                                     │
│       │                                                           │
│       ▼ localGroups 변경                                         │
│  ┌─────────────────────┐                                         │
│  │ saveGroups() API    │ ──────► groups.json (SSOT: 그룹 정의)   │
│  └─────────────────────┘                                         │
│       │                                                           │
│       ▼ onGroupCreated 콜백                                      │
│  ┌─────────────────────┐                                         │
│  │ UnifiedWorkPage     │                                         │
│  │   addProblem()      │ ──────► session.problems (캐시)         │
│  └─────────────────────┘                                         │
│       │                                                           │
│       ▼ 주기적 동기화                                             │
│  ┌─────────────────────┐                                         │
│  │ syncProblems()      │ ◄─────► groups.json ↔ session 동기화    │
│  └─────────────────────┘                                         │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 44-A: 페이지 전환 저장 순서 수정

### 문제 상세

**현상**: 콘솔에 "0개 그룹 저장" 출력 후 페이지 전환
**위치**: `PageViewer.tsx` 라인 219-249

```typescript
// 현재 코드 (문제점)
useEffect(() => {
  const prevPage = prevPageRef.current;
  const prevGroups = localGroupsRef.current;

  if (prevPage !== currentPage && prevGroups.length > 0 && documentId) {
    // 비동기 저장이지만 await 없음 → 저장 완료 전 상태 초기화
    saveGroupsMutation.mutate({...});
  }

  // 문제: 저장 완료 전에 새 페이지 초기화 실행
  setLocalGroups([]);  // ← 이 시점에 localGroupsRef도 [] 로 갱신
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);
```

**원인 분석**:
1. `useEffect`가 `currentPage` 변경 시 실행
2. `saveGroupsMutation.mutate()`는 비동기지만 await 없음
3. `setLocalGroups([])` 실행 → `localGroupsRef.current = []` 동기화
4. 결과: 저장 시점에 `prevGroups`가 이미 빈 배열

### 해결 방안

**방안 A (권장)**: 저장용 스냅샷 분리

```typescript
// 개선 코드
useEffect(() => {
  const prevPage = prevPageRef.current;
  // 핵심: 참조가 아닌 복사본 사용
  const groupsSnapshot = [...localGroupsRef.current];

  if (prevPage !== currentPage && groupsSnapshot.length > 0 && documentId) {
    console.log(`[Phase 44-A] Saving ${groupsSnapshot.length} groups from page ${prevPage}`);

    saveGroupsMutation.mutate({
      documentId,
      pageIndex: prevPage,
      groups: groupsSnapshot.map(g => ({...})),
    });
  }

  prevPageRef.current = currentPage;
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
}, [currentPage, documentId]);
```

**방안 B (더 안전)**: 저장 완료 후 페이지 전환

```typescript
// handlePageChange 함수를 별도 분리
const handlePageChange = async (newPage: number) => {
  if (localGroups.length > 0) {
    // 1. 현재 페이지 저장 완료 대기
    await saveImmediately(localGroups, currentPage);
  }
  // 2. 저장 완료 후 페이지 변경
  setCurrentPage(newPage);
};
```

### 구현 단계

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| A-1 | `localGroupsRef` 스냅샷 복사 로직 추가 | PageViewer.tsx:219-249 | 15분 |
| A-2 | `handlePageChange` 함수 분리 | PageViewer.tsx | 15분 |
| A-3 | `SimpleNavigation`에서 `handlePageChange` 사용 | PageViewer.tsx | 10분 |
| A-4 | 키보드 단축키에서도 동일 로직 적용 | PageViewer.tsx:304-322 | 10분 |
| A-5 | 저장 로그에 실제 그룹 수 확인 테스트 | 수동 테스트 | 10분 |

**총 예상 시간**: 1시간

### 테스트 기준

```
✅ 3개 그룹 생성 후 페이지 전환 → 콘솔에 "3개 그룹 저장" 출력
✅ 페이지 전환 후 이전 페이지 다시 방문 → 3개 그룹 유지
✅ 키보드 (←/→) 페이지 전환에서도 동일하게 저장
✅ Ctrl+S 후 페이지 전환 → 중복 저장 없음
```

---

## 44-B: 동기화 상태 자동 해결

### 문제 상세

**현상**: Toast에 "동기화 필요" 메시지 표시, 상태가 "pending"으로 유지
**원인**: `getSyncStatus()`가 충돌 감지 후 자동 해결 로직 없음

**관련 코드**:

```typescript
// workSessionStore.ts:389-404
getSyncStatus: async () => {
  const { currentSession } = get();
  if (!currentSession) throw new Error('No active session');

  try {
    const status = await api.getSyncStatus(currentSession.sessionId);
    console.log('[Phase 37-D] Sync status:', status);
    return status;  // ← 상태만 반환, 해결 없음
  } catch (error) {
    throw error;
  }
},
```

### 해결 방안

**방안 A (권장)**: 상태 확인 후 자동 동기화

```typescript
// 개선된 getSyncStatus
getSyncStatus: async () => {
  const { currentSession, fullSync } = get();
  if (!currentSession) throw new Error('No active session');

  const status = await api.getSyncStatus(currentSession.sessionId);

  // Phase 44-B: pending/conflict 시 자동 동기화
  if (status.status === 'pending' || status.status === 'conflict') {
    console.log('[Phase 44-B] Auto-resolving sync issue...');
    await fullSync();
    // 재확인
    const newStatus = await api.getSyncStatus(currentSession.sessionId);
    return newStatus;
  }

  return status;
},
```

**방안 B**: 타이머 기반 자동 동기화

```typescript
// UnifiedWorkPage 또는 App 레벨에서
useEffect(() => {
  const interval = setInterval(async () => {
    if (!session) return;

    const status = await getSyncStatus();
    if (status.status !== 'synced') {
      console.log('[Phase 44-B] Auto-sync triggered');
      await fullSync();
    }
  }, 30000);  // 30초마다

  return () => clearInterval(interval);
}, [session]);
```

### 구현 단계

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| B-1 | `getSyncStatus` 자동 해결 로직 추가 | workSessionStore.ts:389-404 | 30분 |
| B-2 | 해결 시도 횟수 제한 (무한 루프 방지) | workSessionStore.ts | 15분 |
| B-3 | Toast에 "동기화 중..." 상태 표시 | UnifiedWorkPage.tsx | 20분 |
| B-4 | "수동 동기화" 버튼 추가 | UnifiedWorkPage.tsx | 20분 |
| B-5 | 동기화 실패 시 에러 토스트 | UnifiedWorkPage.tsx | 15분 |

**총 예상 시간**: 2시간

### 테스트 기준

```
✅ pending 상태 발생 시 5초 내 자동 synced로 변경
✅ conflict 상태 발생 시 자동 해결 후 synced
✅ 동기화 중 "동기화 중..." 토스트 표시
✅ 수동 동기화 버튼 클릭 시 즉시 동기화
✅ 3회 실패 시 에러 토스트 + 수동 버튼 강조
```

---

## 44-C: 그룹 ID 생성 개선

### 문제 상세

**현상**: 다른 페이지에서 같은 ID(L1, L2, L3) 생성 → 충돌
**현재 해결**: Phase 43 Upsert로 충돌 시 업데이트

**현재 ID 생성 로직** (PageViewer.tsx):

```typescript
const generateGroupId = () => {
  const maxNum = localGroups.reduce((max, g) => {
    const match = g.id.match(/^L(\d+)$/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `L${maxNum + 1}`;  // L1, L2, L3... (페이지 내 순차)
};
```

### 해결 방안

**방안 A (권장)**: 페이지 네임스페이스 추가

```typescript
// 새로운 ID 형식: L_p{pageIndex}_{순번}
// 예: L_p17_001, L_p17_002, L_p09_001

const generateGroupId = () => {
  const pagePrefix = `L_p${String(currentPage).padStart(4, '0')}_`;
  const pageGroups = localGroups.filter(g => g.id.startsWith(pagePrefix));

  const maxNum = pageGroups.reduce((max, g) => {
    const match = g.id.match(/_(\d+)$/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);

  return `${pagePrefix}${String(maxNum + 1).padStart(3, '0')}`;
};
```

**방안 B**: 타임스탬프 기반 고유 ID

```typescript
// 형식: L_{timestamp}_{random}
// 예: L_1733312400000_a3f

const generateGroupId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 5);
  return `L_${timestamp}_${random}`;
};
```

**방안 C (최소 변경)**: 현재 Upsert 유지
- Phase 43의 Upsert 패턴이 충돌을 처리
- 추가 변경 없이 기능은 정상 동작
- 로그 메시지 개선만 진행

### 구현 단계 (방안 A 선택 시)

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| C-1 | `generateGroupId` 함수 수정 | PageViewer.tsx | 20분 |
| C-2 | 기존 그룹 마이그레이션 스크립트 작성 | 별도 스크립트 | 30분 |
| C-3 | 세션의 problems/links에서 ID 참조 업데이트 | 마이그레이션 | 30분 |
| C-4 | ID 파싱 유틸 함수 작성 | utils/groupId.ts | 20분 |
| C-5 | 테스트 및 검증 | 수동 테스트 | 20분 |

**총 예상 시간**: 2시간 (선택적)

### 테스트 기준

```
✅ 페이지 17에서 그룹 생성 → ID가 "L_p0017_001" 형식
✅ 다른 페이지에서도 독립적인 ID 생성
✅ 기존 L1, L2 형식도 하위 호환
✅ 마이그레이션 후 기존 연결(links) 유지
```

---

## 44-D: 디버그 로그 정리

### 문제 상세

**현상**: 콘솔에 수많은 `[Phase XX]` 로그 출력
**영향**:
- 개발 시 중요 로그 찾기 어려움
- 프로덕션에서 불필요한 성능 저하

### 해결 방안

**로그 레벨 시스템 도입**:

```typescript
// src/utils/logger.ts

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVEL = import.meta.env.DEV ? 'DEBUG' : 'INFO';

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

export const logger = {
  debug: (tag: string, ...args: any[]) => {
    if (LEVEL_ORDER[LOG_LEVEL] <= LEVEL_ORDER.DEBUG) {
      console.log(`[${tag}]`, ...args);
    }
  },

  info: (tag: string, ...args: any[]) => {
    if (LEVEL_ORDER[LOG_LEVEL] <= LEVEL_ORDER.INFO) {
      console.info(`[${tag}]`, ...args);
    }
  },

  warn: (tag: string, ...args: any[]) => {
    if (LEVEL_ORDER[LOG_LEVEL] <= LEVEL_ORDER.WARN) {
      console.warn(`[${tag}]`, ...args);
    }
  },

  error: (tag: string, ...args: any[]) => {
    console.error(`[${tag}]`, ...args);
  },
};
```

**사용 예**:

```typescript
// Before
console.log(`[Phase 34-F] Auto-saving page ${prevPage} groups...`);

// After
logger.debug('PageViewer', `Auto-saving page ${prevPage} groups...`);
logger.info('Sync', `Full sync completed: ${result.problems_added} added`);
```

### 구현 단계

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| D-1 | `logger.ts` 유틸 생성 | src/utils/logger.ts | 15분 |
| D-2 | PageViewer 로그 교체 | PageViewer.tsx | 15분 |
| D-3 | workSessionStore 로그 교체 | workSessionStore.ts | 10분 |
| D-4 | 기타 컴포넌트 로그 교체 | 여러 파일 | 15분 |
| D-5 | 프로덕션 빌드 테스트 | npm run build | 5분 |

**총 예상 시간**: 1시간

---

## 실행 순서 및 의존성

```
┌────────────────────────────────────────────────────────────────┐
│                      실행 순서 다이어그램                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [44-A] 페이지 전환 저장 ────► 독립 실행 가능                    │
│     │                         (가장 시급, 데이터 유실 위험)      │
│     │                                                           │
│     ▼                                                           │
│  [44-B] 동기화 자동 해결 ────► 44-A 완료 후 권장                 │
│     │                         (동기화 안정성)                    │
│     │                                                           │
│     ▼                                                           │
│  [44-D] 로그 정리 ──────────► 언제든 실행 가능                   │
│                               (우선순위 낮음)                    │
│                                                                 │
│  [44-C] 그룹 ID 개선 ───────► 선택적, 마이그레이션 필요          │
│                               (Upsert로 이미 동작 중)            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 권장 실행 순서

1. **44-A** (필수, 1시간) - 데이터 유실 방지가 최우선
2. **44-B** (필수, 2시간) - 사용자 경험 개선
3. **44-D** (권장, 1시간) - 디버깅 효율성
4. **44-C** (선택, 2시간) - Upsert가 작동하므로 나중에 해도 됨

---

## 검증 체크리스트

### 44-A 완료 조건
- [ ] 그룹 3개 생성 후 페이지 전환 → "3개 그룹 저장" 로그
- [ ] 새로고침 후 같은 페이지 → 3개 그룹 유지
- [ ] 키보드/클릭 네비게이션 모두 정상

### 44-B 완료 조건
- [ ] pending 상태 5초 내 자동 해결
- [ ] "동기화 중..." 토스트 표시
- [ ] 수동 동기화 버튼 작동
- [ ] 3회 실패 시 에러 표시

### 44-C 완료 조건 (선택)
- [ ] 새 ID 형식 생성 확인
- [ ] 기존 데이터 마이그레이션 성공
- [ ] 연결(links) 유지 확인

### 44-D 완료 조건
- [ ] 개발 모드에서 DEBUG 로그 출력
- [ ] 프로덕션에서 INFO 이상만 출력
- [ ] 기존 기능 정상 동작

---

## 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| 저장 로직 변경 시 데이터 손실 | 높음 | 변경 전 groups.json 백업 |
| 동기화 무한 루프 | 중간 | 시도 횟수 제한 (3회) |
| ID 마이그레이션 실패 | 중간 | 롤백 스크립트 준비 |
| 로그 누락으로 디버깅 어려움 | 낮음 | DEBUG 레벨 유지 가능 |

---

## 승인 후 진행

이 계획을 승인하시면 44-A부터 순차적으로 구현하겠습니다.

```
"44-A 진행해줘"  → 페이지 전환 저장 수정
"Phase 44 진행해줘"  → 전체 순차 실행
"44-A, 44-B 진행해줘"  → 선택 항목만 실행
```

---

*작성자: Claude Code*
*참조: [117_labeling_system_stabilization_report.md](117_labeling_system_stabilization_report.md)*
