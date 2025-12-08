# Phase 30: 선택적 문제-해설 연결 시스템 타당성 보고서

**작성일**: 2025-12-03
**요청자**: 사용자
**분석 유형**: 구현 가능성 및 우려사항 분석

---

## 1. 요청 사항 요약

### 1.1 그룹 카드 형식 변경
```
현재: 1번 베이직쎈 · 18p · 76블록
목표: 베이직쎈_공통수학1_p18. 1번
```

### 1.2 문제-해설 선택적 연결 시스템
1. **문제 클릭 시**: 매칭된 해설이 있으면 표시, 없으면 "해설을 연결해주세요" 메시지
2. **해설창에서 그룹핑**: 선택된 문제와 자동으로 연결
3. **미선택 시 그룹핑 차단**: 문제가 선택되지 않으면 해설창에서 그룹핑 불가

---

## 2. 현재 시스템 분석

### 2.1 그룹 카드 표시 (GroupPanel.tsx:330-354)
```tsx
// 현재 구현
<span className="text-lg font-bold">{group.problemInfo?.problemNumber || `#${index + 1}`}</span>
<span className="truncate">{group.problemInfo.bookName}</span>
<span className="text-gray-300">·</span>
<span>{group.problemInfo.page}p</span>
<span className="text-gray-300">·</span>
<span>{group.block_ids.length}블록</span>
```

### 2.2 ProblemInfo 인터페이스 (client.ts:92-103)
```typescript
export interface ProblemInfo {
  bookName: string;        // "수학의 바이블 개념on"
  course: string;          // "공통수학2"
  page: number;            // 464
  problemNumber: string;   // "3", "예제2", "유형01"
  displayName?: string;    // 자동 생성 필드
}
```

### 2.3 현재 매칭 시스템 (FIFO 방식)
```
[현재 흐름]
문제창: 그룹 생성 → PROBLEM_LABELED 메시지 브로드캐스트 → 대기열(pendingProblems)에 추가
해설창: 그룹 생성 → SOLUTION_LABELED 수신 → 대기열의 첫 번째 문제와 자동 매칭
```

---

## 3. 구현 가능성 분석

### 3.1 그룹 카드 형식 변경

**난이도**: ⭐ (매우 쉬움)

**변경 범위**: GroupPanel.tsx 1곳

**구현 방법**:
```tsx
// 변경 후 (간단한 포맷 변경)
const formatDisplayName = (info: ProblemInfo | undefined) => {
  if (!info) return '정보 없음';
  const parts = [info.bookName];
  if (info.course) parts.push(info.course);
  parts.push(`p${info.page}`);
  return parts.join('_');
};

// 표시
<span>{formatDisplayName(group.problemInfo)}. {group.problemInfo?.problemNumber || '-'}</span>
```

**예상 결과**:
```
베이직쎈_공통수학1_p18. 1번
수학의정석_고등수학상_p125. 예제3
```

**우려사항**: 없음

---

### 3.2 문제 클릭 시 연결된 해설 표시

**난이도**: ⭐⭐ (쉬움)

**변경 범위**:
- GroupPanel.tsx (클릭 핸들러 추가)
- PageViewer.tsx (선택 상태 관리)

**구현 방법**:
```tsx
// 그룹 클릭 시
const handleGroupClick = (group: ProblemGroup) => {
  if (group.link) {
    // 연결된 해설로 이동
    onNavigateToLinked(group.link.linkedDocumentId, group.link.linkedPageIndex);
  } else {
    // 선택 상태로 설정 (해설 연결 대기)
    setSelectedProblem(group);
    showToast('해설을 연결해주세요', 'info');
  }
};
```

**우려사항**:
- ✅ 해결 가능: 기존 `onNavigateToLinked` 함수 활용 가능
- ✅ 해결 가능: GroupLink 인터페이스에 필요한 정보 이미 포함

---

### 3.3 선택된 문제와 해설 자동 연결

**난이도**: ⭐⭐⭐ (보통)

**변경 범위**:
- useSyncChannel.ts (메시지 타입 추가)
- types/matching.ts (새 타입 정의)
- PageViewer.tsx (선택 상태 동기화)
- GroupPanel.tsx (연결 로직)

**새로운 메시지 타입**:
```typescript
// 추가할 메시지 타입
| 'PROBLEM_SELECTED'    // 문제가 선택됨 (해설 연결 대기)
| 'PROBLEM_DESELECTED'  // 문제 선택 해제
| 'LINK_REQUEST'        // 해설창에서 연결 요청

interface ProblemSelectedPayload {
  groupId: string;
  problemNumber: string;
  documentId: string;
  pageIndex: number;
}
```

**연결 흐름**:
```
[제안하는 흐름]
1. 문제창: 그룹 클릭 → PROBLEM_SELECTED 브로드캐스트
2. 해설창: 선택된 문제 정보 수신 → UI에 "연결 대기: 1번 문제" 표시
3. 해설창: 그룹핑 → 선택된 문제와 양방향 링크 생성
4. 양쪽창: MATCH_CREATED 수신 → GroupLink 업데이트
```

**우려사항**:
- ⚠️ **상태 동기화**: 두 창 간 선택 상태 동기화 필요
- ⚠️ **타이밍 이슈**: 메시지 전달 지연 시 불일치 가능
- ✅ 해결 방안: `selectedProblem` 상태를 양쪽 창에서 관리, 연결 전 재확인

---

### 3.4 미선택 시 그룹핑 차단

**난이도**: ⭐⭐⭐⭐ (어려움)

**변경 범위**:
- PageViewer.tsx (그룹핑 조건 추가)
- 상태 관리 로직 수정

**구현 방법**:
```tsx
// 해설창에서 그룹 생성 시
const handleCreateGroup = () => {
  // 매칭 모드 + 해설 역할 + 선택된 문제 없음 → 차단
  if (isMatchingMode && role === 'solution' && !selectedProblem) {
    showToast('먼저 문제창에서 연결할 문제를 선택해주세요', 'warning');
    return;
  }

  // 기존 그룹 생성 로직...
};
```

**우려사항**:
- ⚠️ **UX 혼란**: 사용자가 왜 그룹핑이 안 되는지 이해하지 못할 수 있음
- ⚠️ **워크플로우 강제**: 기존 FIFO 방식에 익숙한 사용자 불편
- ⚠️ **창 전환 빈번**: 매번 문제 선택 → 해설 작업 → 문제 선택 반복

---

## 4. 주요 우려사항 및 해결 방안

### 4.1 UX 복잡성 증가

**문제점**:
- 현재: 그룹핑하면 자동 매칭 (2단계)
- 제안: 문제 선택 → 해설 그룹핑 → 연결 확인 (3단계+)

**해결 방안**:
```
[시각적 가이드 제공]
1. 해설창 상단에 "연결 대기 중: [1번 문제]" 배너 표시
2. 미선택 시 그룹핑 버튼에 "문제를 먼저 선택하세요" 툴팁
3. 연결 완료 시 즉각적인 피드백 (토스트 + 시각적 연결선)
```

### 4.2 창 전환 피로도

**문제점**:
- 문제 10개 연결 = 문제창 클릭 10번 + 해설창 작업 10번 = 최소 20번 창 전환

**해결 방안**:
```
[키보드 단축키 도입]
- Tab: 다음 미연결 문제 자동 선택
- Shift+Tab: 이전 미연결 문제 선택
- 자동 창 포커스: 문제 선택 시 해설창으로 자동 포커스
```

### 4.3 동기화 실패 시나리오

**문제점**:
- 네트워크 지연으로 선택 상태가 다를 수 있음
- 한쪽 창을 닫았다가 다시 열면 상태 유실

**해결 방안**:
```typescript
// SYNC_STATE에 selectedProblem 포함
interface SyncStatePayload {
  pendingProblems: PendingProblem[];
  matchedPairs: ProblemSolutionMatch[];
  selectedProblem: ProblemSelectedPayload | null;  // 추가
}

// 창 참여 시 상태 동기화 요청
channel.postMessage({ type: 'REQUEST_SYNC_STATE' });
```

### 4.4 기존 워크플로우와의 호환성

**문제점**:
- 기존 FIFO 방식에 익숙한 사용자
- 마이그레이션 중 혼란

**해결 방안**:
```
[모드 전환 옵션]
1. 설정에서 "매칭 모드" 선택 가능
   - 자동 매칭 (FIFO) - 기존 방식
   - 선택적 매칭 - 새 방식
2. 기본값은 "자동 매칭"으로 유지
```

---

## 5. 구현 우선순위 권장

### Phase 30-A: 그룹 카드 형식 변경 (30분)
```
- GroupPanel.tsx 수정
- 형식: "베이직쎈_공통수학1_p18. 1번"
```

### Phase 30-B: 문제 클릭 시 해설 표시 (1시간)
```
- 기존 link 정보 활용
- 연결 없으면 토스트 메시지
```

### Phase 30-C: 선택적 연결 시스템 (4-6시간)
```
- PROBLEM_SELECTED 메시지 타입 추가
- 양방향 선택 상태 동기화
- 해설 그룹핑 시 자동 연결
```

### Phase 30-D: 미선택 시 차단 + UX 개선 (2-3시간)
```
- 그룹핑 조건 추가
- 시각적 가이드 (배너, 툴팁)
- 키보드 단축키
```

---

## 6. 대안적 접근 방식

### 6.1 드래그 앤 드롭 연결
```
[방식]
- 문제 카드를 해설 카드로 드래그하여 연결
- 직관적이고 자유로움

[장점]
- 순서에 구애받지 않음
- 시각적으로 명확

[단점]
- 듀얼 윈도우에서 창 간 드래그 불가능 (브라우저 제한)
- 구현 복잡도 높음
```

### 6.2 번호 매칭 (반자동)
```
[방식]
- 문제 번호와 해설 번호가 같으면 자동 제안
- 사용자가 확인/거부

[장점]
- 정확도 높음 (같은 번호끼리 매칭)
- 수동 작업 최소화

[단점]
- 번호 체계가 다르면 작동 안 함
- 추가 로직 필요
```

---

## 7. 최종 권고

### 7.1 구현 가능성: ✅ 가능

| 기능 | 난이도 | 예상 시간 | 리스크 |
|------|--------|----------|--------|
| 카드 형식 변경 | ⭐ | 30분 | 없음 |
| 해설 표시/메시지 | ⭐⭐ | 1시간 | 낮음 |
| 선택적 연결 | ⭐⭐⭐ | 4-6시간 | 중간 |
| 그룹핑 차단 | ⭐⭐⭐⭐ | 2-3시간 | 높음 |

### 7.2 주요 우려사항 요약

1. **UX 복잡성**: 단계 증가로 인한 사용성 저하 우려
2. **창 전환 피로**: 빈번한 창 전환 필요
3. **동기화 안정성**: 두 창 간 상태 불일치 가능성
4. **학습 곡선**: 기존 방식에서 전환 시 혼란

### 7.3 권장 접근 방식

```
[단계적 구현 권장]

1단계 (즉시): Phase 30-A (카드 형식)
   → 간단하고 즉각적인 개선

2단계 (이번 주): Phase 30-B (클릭 시 해설 표시)
   → 기존 기능 활용, 리스크 낮음

3단계 (검토 후): Phase 30-C, 30-D (선택적 연결)
   → 사용자 피드백 후 진행 여부 결정
   → 기존 FIFO 방식과 병행 옵션 제공
```

---

## 8. 결론

**카드 형식 변경**은 즉시 구현 가능하며 리스크가 없습니다.

**선택적 연결 시스템**은 기술적으로 구현 가능하나, UX 관점에서 신중한 접근이 필요합니다. 특히 "그룹핑 차단" 기능은 사용자 워크플로우를 강제하므로, 충분한 시각적 가이드와 함께 옵션으로 제공하는 것을 권장합니다.

**권장**: 먼저 Phase 30-A, 30-B를 구현하여 즉각적인 개선을 제공하고, 선택적 연결 시스템은 사용자 피드백을 수집한 후 결정하는 것이 안전합니다.

---

*보고서 끝*
