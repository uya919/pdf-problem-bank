# Phase 56-J: L키 하위문제 편집 모드 구현 분석

**문서 번호**: 219
**작성일**: 2025-12-06
**관련**: Phase 56-H/I

---

## 1. 요구사항 정리

### 1.1 현재 동작

```
L키 → 하위문제 생성 (자동 번호) → 바로 저장 → 완료
      편집 UI 없음 ❌
```

### 1.2 원하는 동작

```
L키 → 하위문제 생성 (자동 번호 제안) → 우측 사이드바 편집 UI 열림 ✅
      사용자가 문항번호 확인/수정 가능
```

### 1.3 참고: G키 동작 (일반 문제)

```
G키 → 그룹 생성 → setAutoEditGroupId() → 우측 사이드바 편집 UI 열림 ✅
```

---

## 2. 현재 코드 분석

### 2.1 G키 로직 (일반 문제) - 편집 모드 있음

```typescript
// handleCreateGroup 함수 내부 (778번 줄)
setAutoEditGroupId(newGroupId);  // ← 편집 모드 활성화!
```

### 2.2 L키 로직 (하위문제) - 편집 모드 없음

```typescript
// case 'l': 내부 (현재 코드)
const newChildGroup = { ... };
setLocalGroups(updatedGroupsL);
await saveImmediately(updatedGroupsL, currentPage);
setSelectedBlocks([]);
showToast(`하위문제 ${nextNumber}번 추가됨`, 'success');
// setAutoEditGroupId 호출 없음! ❌
```

---

## 3. 구현 가능성 분석

### 3.1 필요한 변경

| 항목 | 현재 | 변경 후 | 난이도 |
|------|------|---------|--------|
| `setAutoEditGroupId` 호출 | 없음 | 추가 | **매우 낮음** |
| 블록 선택 해제 | 유지 | 유지 | 없음 |
| toast 메시지 | 유지 | 선택적 제거 | 없음 |

### 3.2 구현 난이도: **매우 낮음** (5분)

**이유**:
- `setAutoEditGroupId`는 이미 존재하는 함수
- 한 줄 추가로 구현 완료
- GroupPanel의 편집 UI가 자동으로 활성화됨

---

## 4. 상세 구현

### 변경 코드

```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    // ... 기존 그룹 생성 로직 ...

    const updatedGroupsL = [...localGroups, newChildGroup];
    setLocalGroups(updatedGroupsL);
    await saveImmediately(updatedGroupsL, currentPage);

    // 5. 상태 업데이트
    setParentProblemMode(prev => ({
      ...prev,
      childNumbers: [...prev.childNumbers, nextNumber],
    }));

    // Phase 56-J: 편집 모드 활성화 (일반 문제와 동일)
    setAutoEditGroupId(newChildGroupId);

    // 6. 블록 선택 해제
    setSelectedBlocks([]);

    // toast는 편집 모드가 열리므로 제거하거나 유지
    // showToast(`하위문제 ${nextNumber}번 추가됨`, 'success');
  }
```

---

## 5. 우려되는 점

### 5.1 위험도: **매우 낮음**

| 우려사항 | 분석 | 결론 |
|----------|------|------|
| **편집 UI 호환성** | GroupPanel이 이미 모든 그룹 타입 지원 | 문제 없음 |
| **모문제 모드 영향** | 모드 상태 유지, 편집만 활성화 | 문제 없음 |
| **저장 타이밍** | 이미 저장 완료 후 편집 | 문제 없음 |

### 5.2 사용자 경험 개선

**Before**:
```
L키 → 자동 저장 → "하위문제 3번 추가됨" toast
      (수정하려면 GroupPanel에서 수동 클릭)
```

**After**:
```
L키 → 저장 → 편집 UI 자동 열림
      (바로 수정 가능, Enter로 확정)
```

---

## 6. 추가 고려사항

### 6.1 모문제 자체의 사이드바 표시

현재 구현 확인:
- `useUnlinkedProblems`: `!p.isParent` 필터링 → 모문제 제외 ✅
- 하위문제: `isParent: false` → 미연결 목록에 포함 ✅

**이미 올바르게 구현됨!**

### 6.2 사이드바 표시 형식

하위문제도 일반 문제와 동일하게 표시:
- "베이직쎈 · 10p · 1번" 형식
- `displayName`에서 파싱

**Phase 56-I에서 이미 구현됨!**

---

## 7. 구현 계획

### Phase 56-J: L키 편집 모드 추가

| 단계 | 내용 | 시간 |
|------|------|------|
| 56-J-1 | L키에 `setAutoEditGroupId` 추가 | 3분 |
| 56-J-2 | 테스트 | 2분 |

**총 예상 시간**: 5분

---

## 8. 예상 결과

### 라벨링 페이지에서

```
M키 → 모문제 생성 (노란색)
L키 → 하위문제 생성 → 우측 패널에 편집 UI 열림!
      ┌─────────────────────────┐
      │ 문항번호: [1        ]   │
      │ 책이름:   베이직쎈       │
      │ 페이지:   10            │
      │         [확인] [취소]   │
      └─────────────────────────┘
L키 → 다음 하위문제 → 편집 UI 열림
G키 → 모문제 완료 + 일반 문제
```

### 사이드바에서

```
미연결 문제                    3
○ 베이직쎈 · 10p · 1번      (하위문제)
○ 베이직쎈 · 10p · 2번      (하위문제)
○ 베이직쎈 · 10p · 3번      (하위문제)

(모문제는 목록에 없음 ✅)
```

---

## 9. 결론

| 항목 | 평가 |
|------|------|
| **구현 가능성** | ✅ 매우 높음 |
| **난이도** | 매우 낮음 (5분) |
| **위험도** | 매우 낮음 |
| **변경 범위** | 1줄 추가 |

### 핵심

```typescript
// 추가할 코드 (1줄)
setAutoEditGroupId(newChildGroupId);
```

---

*승인 후 실행: "Phase 56-J 진행해줘"*
