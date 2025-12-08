# Phase 56-G: 모문제 워크플로우 v2 구현 가능성 분석

**문서 번호**: 211
**작성일**: 2025-12-06
**요청**: 더 직관적인 모문제-하위문제 등록 워크플로우

---

## 1. 제안된 워크플로우

### 현재 워크플로우 (v1)
```
블록 선택 → G (그룹 생성) → 그룹 블록 클릭 → M (모문제 토글)
                                            → L (모문제 연결)
```
**문제점**: 그룹 생성이 선행되어야 하고, 단계가 많음

### 제안 워크플로우 (v2)
```
┌─────────────────────────────────────────────────────────────┐
│ 1. 블록 선택 → M키                                          │
│    → 바로 모문제 그룹 생성 (이름 미지정)                     │
│    → "모문제 등록 모드" 진입                                │
│    → 시각적 표시 (노란색)                                   │
├─────────────────────────────────────────────────────────────┤
│ 2. 다른 블록 선택 → L키                                     │
│    → 하위문제 그룹 생성 + 최근 모문제에 자동 연결            │
│    → 문제번호 자동 생성 (1, 2, 3...)                        │
│    → 시각적 표시 (파란색)                                   │
├─────────────────────────────────────────────────────────────┤
│ 3. 계속 블록 선택 → L키                                     │
│    → 계속 하위문제 추가 (4, 5, 6...)                        │
├─────────────────────────────────────────────────────────────┤
│ 4. 블록 선택 → G키 (일반 그룹)                              │
│    → 모문제 등록 모드 해제                                  │
│    → 모문제 이름 자동 지정: "1~4의 모문제"                   │
│    → 새 그룹은 일반 문제로 생성                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 구현 가능성 분석

### 2.1 필요한 변경사항

| 항목 | 현재 | 변경 후 | 난이도 |
|------|------|---------|--------|
| **M키 동작** | 기존 그룹을 모문제로 토글 | 블록 선택 → 모문제 그룹 생성 | 중 |
| **L키 동작** | 기존 그룹에 모문제 연결 | 블록 선택 → 하위문제 그룹 생성 + 자동 연결 | 중 |
| **G키 동작** | 일반 그룹 생성 | 모문제 모드 해제 + 일반 그룹 생성 | 낮음 |
| **상태 관리** | 없음 | 모문제 등록 모드 상태 추가 | 낮음 |
| **이름 자동 생성** | 수동 입력 | 자동 ("1~N의 모문제") | 낮음 |

### 2.2 구현 난이도: **중간** (4~6시간)

**이유**:
- 기존 그룹 생성 로직 재사용 가능
- 상태 관리는 단순 (boolean + 참조 ID)
- UI 변경 최소화

---

## 3. 상세 구현 설계

### 3.1 새로운 상태 추가

```typescript
// PageViewer.tsx
interface ParentProblemModeState {
  isActive: boolean;           // 모문제 등록 모드 활성화 여부
  parentGroupId: string | null; // 현재 모문제 그룹 ID
  childNumbers: number[];       // 등록된 하위문제 번호들 [1, 2, 3, 4]
  nextChildNumber: number;      // 다음 하위문제 번호
}

const [parentProblemMode, setParentProblemMode] = useState<ParentProblemModeState>({
  isActive: false,
  parentGroupId: null,
  childNumbers: [],
  nextChildNumber: 1,
});
```

### 3.2 M키 로직 변경

```typescript
case 'm':
case 'M':
  if (selectedBlocks.length > 0) {
    e.preventDefault();

    // 1. 모문제 그룹 생성 (이름 임시)
    const parentGroup = createGroup(selectedBlocks, {
      isParent: true,
      displayName: '(모문제)', // 임시 이름
    });

    // 2. 모문제 등록 모드 진입
    setParentProblemMode({
      isActive: true,
      parentGroupId: parentGroup.id,
      childNumbers: [],
      nextChildNumber: 1,
    });

    showToast('모문제 등록 모드: L키로 하위문제 추가, G키로 완료', 'info');
  }
  break;
```

### 3.3 L키 로직 변경

```typescript
case 'l':
case 'L':
  if (selectedBlocks.length > 0 && parentProblemMode.isActive) {
    e.preventDefault();

    // 1. 하위문제 그룹 생성
    const childNumber = parentProblemMode.nextChildNumber;
    const childGroup = createGroup(selectedBlocks, {
      isParent: false,
      parentGroupId: parentProblemMode.parentGroupId,
      displayName: String(childNumber),
    });

    // 2. 상태 업데이트
    setParentProblemMode(prev => ({
      ...prev,
      childNumbers: [...prev.childNumbers, childNumber],
      nextChildNumber: childNumber + 1,
    }));

    showToast(`하위문제 ${childNumber}번 추가됨`, 'success');
  }
  break;
```

### 3.4 G키 로직 변경

```typescript
case 'g':
case 'G':
case 'Enter':
  if (selectedBlocks.length > 0) {
    e.preventDefault();

    // 모문제 모드 종료 처리
    if (parentProblemMode.isActive) {
      // 모문제 이름 자동 생성
      const childNums = parentProblemMode.childNumbers;
      const parentName = childNums.length > 0
        ? `${childNums[0]}~${childNums[childNums.length - 1]}의 모문제`
        : '모문제';

      // 모문제 그룹 이름 업데이트
      updateGroupDisplayName(parentProblemMode.parentGroupId, parentName);

      // 모드 해제
      setParentProblemMode({
        isActive: false,
        parentGroupId: null,
        childNumbers: [],
        nextChildNumber: 1,
      });

      showToast(`모문제 "${parentName}" 등록 완료`, 'success');
    }

    // 일반 그룹 생성 (기존 로직)
    handleCreateGroup();
  }
  break;
```

### 3.5 시각적 표시

```
┌─────────────────────────────────────────────────────┐
│ 📄 모문제 등록 모드                                  │
│ ─────────────────────────────────────────────────── │
│ 🟡 (모문제)        ← 임시 이름                      │
│ 🔵 1               ← L키로 추가                     │
│ 🔵 2               ← L키로 추가                     │
│ 🔵 3               ← L키로 추가                     │
│ ─────────────────────────────────────────────────── │
│ [G키: 완료하고 다음 그룹 생성]                       │
│ [ESC: 모드 취소]                                    │
└─────────────────────────────────────────────────────┘
```

---

## 4. 우려되는 점

### 4.1 위험도: 낮음

| 우려사항 | 심각도 | 해결책 |
|----------|--------|--------|
| **ESC로 취소 시 처리** | 낮음 | 모문제+하위문제 모두 삭제 or 유지 선택 |
| **페이지 이동 시** | 중간 | 자동 저장 후 모드 유지 or 해제 |
| **기존 데이터 호환성** | 없음 | 새 필드만 추가, 기존 데이터 영향 없음 |
| **Undo 기능 필요성** | 중간 | 추후 구현 가능 (Ctrl+Z) |

### 4.2 상세 우려사항

#### (1) ESC로 취소 시
**문제**: 모문제+하위문제 여러 개 등록 후 취소하면?
**해결 옵션**:
- A) 모두 삭제 (깔끔하지만 작업 손실)
- B) 모문제만 일반 그룹으로 변환 (하위문제 연결 해제)
- C) 확인 모달 표시 ("취소하시겠습니까?")
**권장**: C) 확인 모달

#### (2) 페이지 이동 시
**문제**: 모문제 모드 중 다른 페이지로 이동하면?
**해결 옵션**:
- A) 자동 완료 후 이동 (모문제 이름 자동 생성)
- B) 경고 후 이동 차단
- C) 크로스페이지처럼 모드 유지
**권장**: A) 자동 완료 (가장 자연스러움)

#### (3) 모문제가 여러 개인 경우
**문제**: 한 페이지에 모문제가 2개 이상이면?
**해결**: 새 M키 입력 시 기존 모문제 완료 후 새 모문제 시작
```
M → 모문제1 시작 → L,L,L → M → 모문제1 완료 → 모문제2 시작
```

#### (4) 하위문제 번호 충돌
**문제**: 이미 1,2,3번이 있는데 새 모문제에서 1번 사용
**해결**: 모문제별 독립적 번호 체계 (충돌 없음)
- 모문제A: 1, 2, 3
- 모문제B: 1, 2, 3, 4

---

## 5. 장점

| 장점 | 설명 |
|------|------|
| **빠른 워크플로우** | 3단계 → 연속 키 입력 |
| **직관적** | M=모문제, L=하위(Link), G=일반 |
| **이름 자동화** | "1~4의 모문제" 자동 생성 |
| **오류 감소** | 연결 실수 방지 |

---

## 6. 구현 계획

### Phase 56-G: 모문제 워크플로우 v2

| 단계 | 내용 | 시간 |
|------|------|------|
| 56-G-1 | 모문제 모드 상태 추가 | 30분 |
| 56-G-2 | M키 로직 변경 (모문제 생성 + 모드 진입) | 1시간 |
| 56-G-3 | L키 로직 변경 (하위문제 생성 + 자동 연결) | 1시간 |
| 56-G-4 | G키 로직 변경 (모드 종료 + 이름 자동 생성) | 1시간 |
| 56-G-5 | ESC 처리 (취소 확인 모달) | 30분 |
| 56-G-6 | 시각적 표시 (모드 인디케이터) | 30분 |
| 56-G-7 | 테스트 및 버그 수정 | 1시간 |

**총 예상 시간**: 5.5시간

---

## 7. 결론

| 항목 | 평가 |
|------|------|
| **구현 가능성** | ✅ 높음 |
| **난이도** | 중간 (5.5시간) |
| **위험도** | 낮음 |
| **사용성 개선** | 높음 (워크플로우 대폭 간소화) |

### 권장사항

**구현을 권장합니다.**

- 기존 코드 구조와 잘 맞음
- 사용자 경험 크게 개선
- 위험 요소가 적고 관리 가능

---

## 8. 최종 워크플로우 비교

### Before (v1)
```
블록선택 → G → 블록클릭 → M → 블록선택 → G → 블록클릭 → L → ...
(8+ 단계)
```

### After (v2)
```
블록선택 → M → 블록선택 → L → 블록선택 → L → 블록선택 → G
(연속 키 입력, 4단계)
```

**효율 향상**: 약 50% 단계 감소

---

*승인 후 실행: "Phase 56-G 진행해줘"*
