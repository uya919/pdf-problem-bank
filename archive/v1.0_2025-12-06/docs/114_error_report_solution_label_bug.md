# 에러 리포트: 해설 그룹 라벨 버그

> 2025-12-04 | Phase 42-A 구현 직후 발생

---

## 1. 에러 요약

| 항목 | 내용 |
|------|------|
| **증상** | 해설 그룹 라벨이 모두 "1번"으로 표시됨 |
| **예상 동작** | 4번→R1, 5번→R2 등 연결된 문제 번호로 표시 |
| **실제 동작** | 모든 해설 그룹이 "1번"으로 동일하게 표시 |
| **심각도** | 높음 (사용자 혼란 유발) |
| **원인** | 정규식이 잘못된 숫자를 추출 |

---

## 2. 스크린샷 분석

```
좌측 패널 (올바른 데이터):
  4번 → R1  ✓
  5번 → R2  ✓
  6번 → R3  ✓
  7번 → R4  ✓

캔버스 (버그):
  [1번] ← 4번이어야 함
  [1번] ← 5번이어야 함
  [1번] ← 6번이어야 함
  [1번] ← 7번이어야 함
```

---

## 3. 원인 분석

### 3.1 버그 위치

**파일**: `frontend/src/components/PageCanvas.tsx`
**함수**: `getGroupStyleAndLabel()`
**라인**: 89-100

```typescript
// 버그 코드
if (group.link?.linkType === 'solution') {
  const linkedName = group.link.linkedName || '';
  const match = linkedName.match(/(\d+)/);  // ← 버그 원인
  const problemNum = match ? match[1] : group.link.linkedGroupId;

  return {
    // ...
    label: `${problemNum}번`,
  };
}
```

### 3.2 문제점

`linkedName`의 실제 값:
```
"베이직쎈_공통수학1_p10_4번"
```

정규식 `/(\d+)/`의 동작:
- **첫 번째 숫자**를 찾음
- `p10`에서 `10`을 추출 (또는 `_1`이 있다면 `1`을 추출)
- 실제 문제번호 `4`가 아닌 `10` 또는 `1`이 추출됨

### 3.3 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│ Backend: create_link()                                      │
│ linkedName = problem.displayName                            │
│ 예: "베이직쎈_공통수학1_p10_4번"                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ group.link.linkedName = "베이직쎈_공통수학1_p10_4번"          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 정규식: /(\d+)/                                              │
│ "베이직쎈_공통수학1_p10_4번".match(/(\d+)/)                   │
│                      ↑                                       │
│                      첫 번째 매치: "10" (또는 "1")            │
└──────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 결과: label = "10번" 또는 "1번"                              │
│ 기대값: label = "4번"                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 해결 방안

### 4.1 방안 A: 정규식 수정 (권장)

문자열 끝의 `X번` 패턴에서 숫자 추출:

```typescript
// 수정된 코드
const linkedName = group.link.linkedName || '';
// "4번" 또는 "_4번" 패턴에서 숫자 추출
const match = linkedName.match(/(\d+)번$/);
const problemNum = match ? match[1] : linkedName.match(/(\d+)/)?.[1] || group.id;
```

**장점**: 기존 displayName 형식 유지
**단점**: displayName 형식이 변경되면 다시 버그 발생 가능

### 4.2 방안 B: problemNumber 직접 사용 (더 안전)

백엔드에서 `linkedName`에 `problemNumber`를 직접 저장:

```python
# backend/app/routers/work_sessions.py
link_data = {
    "linkedGroupId": request.problemGroupId,
    "linkedDocumentId": session.problemDocumentId,
    "linkedPageIndex": problem.pageIndex,
    "linkedName": problem.problemNumber,  # displayName 대신 problemNumber
    "linkType": "solution",
    "linkedAt": link.linkedAt
}
```

**장점**: 정규식 없이 깔끔
**단점**: 백엔드 수정 필요, 기존 데이터와 호환성 고려 필요

### 4.3 방안 C: 프론트엔드에서 세션 데이터 참조

`group.link.linkedGroupId`로 세션의 problems에서 찾기:

```typescript
// UnifiedWorkPage에서 problemsMap을 PageViewer에 전달
const problemsMap = useMemo(() => {
  const map = new Map<string, ProblemReference>();
  currentSession?.problems.forEach(p => map.set(p.groupId, p));
  return map;
}, [currentSession?.problems]);

// PageCanvas에서
const linkedProblem = problemsMap.get(group.link.linkedGroupId);
const problemNum = linkedProblem?.problemNumber || '?';
```

**장점**: 가장 정확한 데이터 참조
**단점**: props 추가 필요, 복잡도 증가

---

## 5. 권장 해결 방안

### 즉시 수정 (프론트엔드만)

**방안 A** 적용 - 정규식을 문자열 끝에서 추출하도록 수정:

```typescript
function getGroupStyleAndLabel(group: ProblemGroup): {...} {
  if (group.link?.linkType === 'solution') {
    const linkedName = group.link.linkedName || '';

    // 수정: 문자열 끝의 "X번" 패턴에서 숫자 추출
    const endMatch = linkedName.match(/(\d+)번$/);
    const problemNum = endMatch
      ? endMatch[1]
      : linkedName.match(/(\d+)/)?.[1] || group.link.linkedGroupId;

    return {
      stroke: '#a855f7',
      fill: 'rgba(168, 85, 247, 0.12)',
      tag: '#9333ea',
      label: `${problemNum}번`,
    };
  }
  // ...
}
```

---

## 6. 테스트 케이스

| linkedName | 현재 결과 | 수정 후 결과 |
|------------|----------|-------------|
| `"베이직쎈_공통수학1_p10_4번"` | "10번" ❌ | "4번" ✓ |
| `"수학의정석_p2_15번"` | "2번" ❌ | "15번" ✓ |
| `"4번"` | "4번" ✓ | "4번" ✓ |
| `"4"` | "4번" ✓ | "4번" ✓ |
| `"문제 4"` | "4번" ✓ | "4번" ✓ |

---

## 7. 재발 방지

### 7.1 단위 테스트 추가

```typescript
describe('getGroupStyleAndLabel', () => {
  it('should extract problem number from end of linkedName', () => {
    const group = {
      link: {
        linkType: 'solution',
        linkedName: '베이직쎈_공통수학1_p10_4번',
      }
    };
    const result = getGroupStyleAndLabel(group);
    expect(result.label).toBe('4번');
  });
});
```

### 7.2 타입 강화

```typescript
interface GroupLink {
  // ...
  /** 연결된 문제의 문항번호 (예: "4", "15") */
  linkedProblemNumber?: string;  // 새 필드 추가 고려
}
```

---

## 8. 결론

| 항목 | 내용 |
|------|------|
| **원인** | 정규식이 첫 번째 숫자를 추출 (p10의 10 또는 _1의 1) |
| **해결** | 정규식을 `/(\d+)번$/`로 수정하여 끝에서 추출 |
| **수정 파일** | `PageCanvas.tsx` 1개 |
| **예상 시간** | 5분 |
| **위험도** | 낮음 (로컬 변경만 필요) |

---

*작성: Claude Code | 2025-12-04*
