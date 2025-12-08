# UI/UX 개선 구현 계획 (안정성 중심)

**작성일**: 2025-11-26
**버전**: 1.0
**기준 문서**: `13_labeling_ux_research_report.md`
**현재 상태**: Phase 8 완료 (페이지 오프셋, 그룹별 문항 정보, 자동완성, 2초 디바운스 자동 저장)

---

## 1. 개요

### 1.1 목표

`13_labeling_ux_research_report.md`에서 제안된 UI/UX 개선 사항들을 **안정적으로** 단계별 구현하여:

1. 문제당 평균 작업 시간을 18초에서 8초로 단축
2. 페이지당 평균 작업 시간을 75초에서 30초로 단축
3. 키보드 단독 작업 가능 비율을 0%에서 80%로 향상
4. 사용자 실수 복구 시간 90% 감소

### 1.2 원칙

1. **기존 기능 손상 없이 점진적 개선**
   - 각 단계는 독립적으로 테스트 가능해야 함
   - 문제 발생 시 즉시 롤백 가능한 구조 유지

2. **사용자 데이터 손실 절대 방지**
   - 모든 데이터 변경은 기존 저장 메커니즘을 통해 수행
   - Undo/Redo는 메모리에서만 동작, 저장은 기존 방식 유지

3. **백워드 호환성 유지**
   - 기존 API 인터페이스 유지
   - 기존 데이터 구조 변경 최소화

4. **테스트 우선**
   - 각 기능 구현 전 테스트 케이스 정의
   - 회귀 테스트 필수 수행

### 1.3 성공 기준

| 지표 | 현재 | Phase 9 후 | Phase 10 후 | Phase 11 후 |
|------|------|-----------|-------------|-------------|
| 문제당 평균 작업 시간 | 18초 | 12초 | 10초 | 8초 |
| 페이지당 평균 작업 시간 | 75초 | 52초 | 40초 | 30초 |
| 키보드 단독 작업 비율 | 0% | 30% | 50% | 80% |
| Undo 사용으로 시간 절감 | - | - | 실수당 30초 | 실수당 30초 |

---

## 2. Phase 별 상세 계획

---

### Phase 9: Quick Wins (1.5일)

**목표**: 최소 변경으로 체감 효과 극대화
**예상 완료**: 1.5일
**위험도**: 낮음

---

#### 9-1. 그룹 생성 시 자동 편집 모드 진입 (0.5일)

**목표**: 그룹 생성 즉시 편집 폼 자동 오픈, 문항번호 필드에 포커스

**현재 동작 분석**:
- `PageViewer.tsx` (191-225행): `handleCreateGroup()` 함수가 그룹 생성
- `GroupPanel.tsx` (42-51행): `startEditing()` 함수가 편집 모드 진입
- 현재: 그룹 생성 후 별도로 편집 버튼 클릭 필요 (2클릭 낭비)

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageViewer.tsx`, `GroupPanel.tsx` |
| 영향받는 컴포넌트 | GroupPanel의 편집 모드, PageViewer의 그룹 생성 로직 |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: GroupPanel에 외부 트리거 인터페이스 추가 (0.2일)
```typescript
// GroupPanel.tsx - Props 확장
interface GroupPanelProps {
  // ... 기존 props
  autoEditGroupId?: string | null;  // 외부에서 편집 모드 트리거용
  onAutoEditComplete?: () => void;   // 편집 모드 진입 완료 콜백
}
```

**Step 2**: useEffect로 자동 편집 트리거 처리 (0.1일)
```typescript
// GroupPanel.tsx - 자동 편집 모드 진입 로직
useEffect(() => {
  if (autoEditGroupId) {
    const targetGroup = groups.find(g => g.id === autoEditGroupId);
    if (targetGroup) {
      // 애니메이션 충돌 방지를 위한 100ms 지연
      setTimeout(() => {
        startEditing(targetGroup);
        onAutoEditComplete?.();
      }, 100);
    }
  }
}, [autoEditGroupId, groups]);
```

**Step 3**: PageViewer에서 그룹 생성 후 자동 편집 트리거 (0.1일)
```typescript
// PageViewer.tsx - 상태 추가
const [autoEditGroupId, setAutoEditGroupId] = useState<string | null>(null);

// handleCreateGroup 수정
const handleCreateGroup = () => {
  // ... 기존 로직
  const newGroupId = `${column}${maxNumber + 1}`;
  // ... 그룹 생성
  setAutoEditGroupId(newGroupId);  // 자동 편집 트리거
};

// GroupPanel에 props 전달
<GroupPanel
  // ... 기존 props
  autoEditGroupId={autoEditGroupId}
  onAutoEditComplete={() => setAutoEditGroupId(null)}
/>
```

**Step 4**: 문항번호 입력 필드 자동 포커스 (0.1일)
```typescript
// GroupPanel.tsx - 문항번호 input에 ref 추가
const problemNumberInputRef = useRef<HTMLInputElement>(null);

// startEditing 함수 내에서 포커스
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);
  setEditForm({...});
  // 다음 렌더링 사이클에서 포커스
  setTimeout(() => {
    problemNumberInputRef.current?.focus();
    problemNumberInputRef.current?.select();  // 기존 값 선택
  }, 50);
};

// input 요소에 ref 연결
<input
  ref={problemNumberInputRef}
  type="text"
  value={editForm.problemNumber || ''}
  // ...
/>
```

**안전장치**:
- [x] 기존 수동 편집 버튼 동작 유지 (startEditing 함수 변경 없음)
- [x] 편집 모드 진입 실패 시 기존 동작으로 폴백 (targetGroup 체크)
- [x] 애니메이션 충돌 방지 (100ms delay)
- [x] autoEditGroupId 상태 자동 정리 (onAutoEditComplete 콜백)

**테스트 체크리스트**:
- [ ] 그룹 생성 시 편집 모드 자동 진입
- [ ] 문항번호 필드에 포커스 이동
- [ ] 기존 편집 버튼 클릭 시 정상 동작
- [ ] 여러 그룹 연속 생성 시 안정성
- [ ] ESC 키로 편집 취소 시 정상 동작
- [ ] 다른 그룹 클릭 시 편집 모드 전환 정상 동작

**롤백 계획**:
- 문제 발생 시: `autoEditGroupId` 상태 및 관련 로직 제거
- `GroupPanel`의 `autoEditGroupId`, `onAutoEditComplete` props 제거
- 데이터 영향: **없음** (UI만 변경)

---

#### 9-2. 문항번호 자동 증가 제안 (0.5일)

**목표**: 마지막 문항번호 파싱 후 다음 번호 자동 제안

**현재 동작 분석**:
- `GroupPanel.tsx` (49행): `problemNumber: group.problemInfo?.problemNumber || ''`
- 현재: 항상 빈 문자열로 시작

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `GroupPanel.tsx`, 새 파일 `frontend/src/utils/problemNumber.ts` |
| 영향받는 컴포넌트 | GroupPanel 편집 폼 |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: 문항번호 파싱 유틸 함수 작성 (0.2일)
```typescript
// frontend/src/utils/problemNumber.ts

/**
 * 문항번호 문자열을 파싱하여 다음 번호를 생성합니다.
 *
 * 지원 패턴:
 * - 단순 숫자: "3" → "4", "99" → "100"
 * - 접두어+숫자: "예제2" → "예제3", "유형01" → "유형02"
 * - 하이픈 패턴: "1-1" → "1-2", "A-1" → "A-2"
 * - 파싱 실패 시: 빈 문자열 반환
 */
export function parseAndIncrement(lastNumber: string): string {
  if (!lastNumber || lastNumber.trim() === '') {
    return '';
  }

  const trimmed = lastNumber.trim();

  // 패턴 1: 하이픈 패턴 (예: "1-1", "A-2")
  const hyphenMatch = trimmed.match(/^(.+)-(\d+)$/);
  if (hyphenMatch) {
    const prefix = hyphenMatch[1];
    const num = parseInt(hyphenMatch[2], 10);
    return `${prefix}-${num + 1}`;
  }

  // 패턴 2: 접두어+숫자 (예: "예제2", "유형01")
  const prefixMatch = trimmed.match(/^(\D+)(\d+)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const numStr = prefixMatch[2];
    const num = parseInt(numStr, 10);
    // 원본 자릿수 유지 (예: "01" → "02")
    const padLength = numStr.length;
    return `${prefix}${String(num + 1).padStart(padLength, '0')}`;
  }

  // 패턴 3: 단순 숫자 (예: "3", "99")
  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return String(num + 1);
  }

  // 패턴 4: 숫자로 끝나는 복잡한 패턴 (예: "문제A1")
  const complexMatch = trimmed.match(/^(.+?)(\d+)$/);
  if (complexMatch) {
    const prefix = complexMatch[1];
    const numStr = complexMatch[2];
    const num = parseInt(numStr, 10);
    const padLength = numStr.length;
    return `${prefix}${String(num + 1).padStart(padLength, '0')}`;
  }

  // 파싱 실패
  return '';
}

/**
 * 그룹 배열에서 마지막 문항번호를 찾아 다음 번호를 제안합니다.
 */
export function suggestNextProblemNumber(
  groups: { problemInfo?: { problemNumber?: string } }[],
  currentColumn?: string
): string {
  // 같은 컬럼의 그룹 우선, 없으면 전체에서 마지막
  const relevantGroups = currentColumn
    ? groups.filter((g: any) => g.column === currentColumn)
    : groups;

  // 문항 정보가 있는 그룹 중 마지막
  const groupsWithInfo = (relevantGroups.length > 0 ? relevantGroups : groups)
    .filter(g => g.problemInfo?.problemNumber);

  if (groupsWithInfo.length === 0) {
    return '';
  }

  const lastGroup = groupsWithInfo[groupsWithInfo.length - 1];
  const lastNumber = lastGroup.problemInfo?.problemNumber || '';

  return parseAndIncrement(lastNumber);
}
```

**Step 2**: 단위 테스트 케이스 (0.1일)
```typescript
// frontend/src/utils/__tests__/problemNumber.test.ts

import { parseAndIncrement, suggestNextProblemNumber } from '../problemNumber';

describe('parseAndIncrement', () => {
  // 단순 숫자
  test('단순 숫자 증가', () => {
    expect(parseAndIncrement('1')).toBe('2');
    expect(parseAndIncrement('99')).toBe('100');
    expect(parseAndIncrement('0')).toBe('1');
  });

  // 접두어+숫자
  test('접두어+숫자 증가', () => {
    expect(parseAndIncrement('예제1')).toBe('예제2');
    expect(parseAndIncrement('예제2')).toBe('예제3');
    expect(parseAndIncrement('유형01')).toBe('유형02');
    expect(parseAndIncrement('유형09')).toBe('유형10');
  });

  // 하이픈 패턴
  test('하이픈 패턴 증가', () => {
    expect(parseAndIncrement('1-1')).toBe('1-2');
    expect(parseAndIncrement('A-1')).toBe('A-2');
    expect(parseAndIncrement('1-9')).toBe('1-10');
  });

  // 복잡한 패턴
  test('복잡한 패턴 증가', () => {
    expect(parseAndIncrement('문제A1')).toBe('문제A2');
  });

  // 엣지 케이스
  test('파싱 실패 시 빈 문자열', () => {
    expect(parseAndIncrement('')).toBe('');
    expect(parseAndIncrement('abc')).toBe('');
    expect(parseAndIncrement('  ')).toBe('');
  });
});

describe('suggestNextProblemNumber', () => {
  test('문항 정보 없으면 빈 문자열', () => {
    expect(suggestNextProblemNumber([])).toBe('');
    expect(suggestNextProblemNumber([{ id: 'L1' }])).toBe('');
  });

  test('마지막 그룹 기준 제안', () => {
    const groups = [
      { problemInfo: { problemNumber: '1' } },
      { problemInfo: { problemNumber: '2' } },
    ];
    expect(suggestNextProblemNumber(groups)).toBe('3');
  });
});
```

**Step 3**: GroupPanel 편집 폼에 적용 (0.2일)
```typescript
// GroupPanel.tsx

import { suggestNextProblemNumber } from '../utils/problemNumber';

// startEditing 함수 수정
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);

  // 기존 값이 있으면 기존 값 사용, 없으면 자동 제안
  const suggestedNumber = group.problemInfo?.problemNumber
    ? group.problemInfo.problemNumber
    : suggestNextProblemNumber(groups, group.column);

  setEditForm({
    bookName: group.problemInfo?.bookName || defaultBookName,
    course: group.problemInfo?.course || defaultCourse,
    page: group.problemInfo?.page || bookPage || 1,
    problemNumber: suggestedNumber,
  });
};
```

**안전장치**:
- [x] 파싱 실패 시 빈 문자열 반환 (기존 동작과 동일)
- [x] 기존 값이 있으면 기존 값 우선 사용
- [x] 제안된 값은 수정 가능 (사용자 직접 입력 우선)
- [x] 유틸 함수는 순수 함수로 부작용 없음

**테스트 체크리스트**:
- [ ] 순차 번호 자동 증가 (1→2→3)
- [ ] 접두어 패턴 유지 (예제1→예제2)
- [ ] 복잡한 패턴 처리 (1-1→1-2)
- [ ] 첫 그룹일 때 빈 문자열
- [ ] 기존 문항번호 있을 때 기존 값 유지
- [ ] 사용자 수동 입력 정상 동작

**롤백 계획**:
- 문제 발생 시: `utils/problemNumber.ts` 파일 삭제
- `startEditing` 함수에서 `suggestNextProblemNumber` 호출 제거
- `problemNumber`를 `group.problemInfo?.problemNumber || ''`로 복원
- 데이터 영향: **없음**

---

#### 9-3. G 키 그룹 생성 단축키 (0.25일)

**목표**: 선택된 블록이 있을 때 G 키로 그룹 생성

**현재 동작 분석**:
- `PageViewer.tsx` (128-172행): `handleKeyDown` 이벤트 핸들러
- 지원 키: ArrowLeft, ArrowRight, Delete, Backspace, Escape
- G 키: 미지원

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageViewer.tsx` |
| 영향받는 컴포넌트 | 키보드 이벤트 핸들러 |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: handleKeyDown에 G 키 케이스 추가 (0.15일)
```typescript
// PageViewer.tsx - handleKeyDown 수정
const handleKeyDown = (e: KeyboardEvent) => {
  // 입력 필드에서는 단축키 무시
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (e.key) {
    // ... 기존 케이스들

    case 'g':
    case 'G':
      // G: 선택된 블록으로 그룹 생성
      if (selectedBlocks.length > 0) {
        e.preventDefault();
        handleCreateGroup();
      }
      break;
  }
};
```

**Step 2**: 키보드 힌트 업데이트 (0.1일)
```typescript
// PageNavigation.tsx - 하단 힌트 업데이트
<div className="flex items-center justify-center gap-4 text-xs text-gray-500">
  <span>← → 키로 페이지 이동</span>
  <span className="text-gray-300">|</span>
  <span>G 그룹 생성</span>
  <span className="text-gray-300">|</span>
  <span>Esc 선택 해제</span>
</div>
```

**안전장치**:
- [x] 입력 필드 포커스 시 단축키 무시 (기존 로직)
- [x] 선택된 블록 없으면 동작 안 함
- [x] e.preventDefault()로 브라우저 기본 동작 방지

**테스트 체크리스트**:
- [ ] G 키 누르면 그룹 생성 (블록 선택 상태)
- [ ] 블록 미선택 시 G 키 무시
- [ ] 입력 필드에서 G 키 입력 정상 동작
- [ ] 대소문자 모두 동작 (g, G)

**롤백 계획**:
- 문제 발생 시: switch case에서 'g', 'G' 케이스 제거
- 데이터 영향: **없음**

---

#### 9-4. Ctrl+S 즉시 저장 (0.25일)

**목표**: Ctrl+S로 즉시 저장 + 시각적 확인

**현재 동작 분석**:
- `PageViewer.tsx` (114-125행): 2초 디바운스 자동 저장
- 수동 즉시 저장 방법 없음

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageViewer.tsx` |
| 영향받는 컴포넌트 | 키보드 이벤트 핸들러, 저장 상태 표시 |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: handleKeyDown에 Ctrl+S 케이스 추가 (0.15일)
```typescript
// PageViewer.tsx - handleKeyDown 수정
const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+S 즉시 저장 (입력 필드에서도 동작)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveGroups(localGroups);
    showToast('저장되었습니다', 'success');
    return;
  }

  // 입력 필드에서는 다른 단축키 무시
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  // ... 기존 케이스들
};
```

**Step 2**: 키보드 힌트 업데이트 (0.1일)
```typescript
// PageNavigation.tsx - 하단 힌트 업데이트
<div className="flex items-center justify-center gap-4 text-xs text-gray-500">
  <span>← → 페이지 이동</span>
  <span className="text-gray-300">|</span>
  <span>G 그룹 생성</span>
  <span className="text-gray-300">|</span>
  <span>Ctrl+S 저장</span>
  <span className="text-gray-300">|</span>
  <span>Esc 선택 해제</span>
</div>
```

**안전장치**:
- [x] e.preventDefault()로 브라우저 저장 다이얼로그 방지
- [x] 저장 결과 토스트로 시각적 피드백
- [x] Mac의 Cmd+S도 지원 (metaKey)

**테스트 체크리스트**:
- [ ] Ctrl+S 누르면 즉시 저장
- [ ] Mac에서 Cmd+S 동작
- [ ] 저장 완료 토스트 표시
- [ ] 입력 필드에서도 Ctrl+S 동작
- [ ] 브라우저 저장 다이얼로그 차단

**롤백 계획**:
- 문제 발생 시: Ctrl+S 핸들링 코드 제거
- 데이터 영향: **없음**

---

### Phase 9 완료 체크리스트

#### 시작 전
- [ ] 현재 코드 Git 커밋 (백업)
- [ ] 개발 브랜치 생성 (`feature/phase9-quick-wins`)
- [ ] 테스트 환경 준비

#### 완료 조건
- [ ] 9-1. 그룹 생성 시 자동 편집 모드 진입 ✓
- [ ] 9-2. 문항번호 자동 증가 제안 ✓
- [ ] 9-3. G 키 그룹 생성 단축키 ✓
- [ ] 9-4. Ctrl+S 즉시 저장 ✓
- [ ] 모든 Step 테스트 통과
- [ ] 기존 기능 회귀 테스트 통과
- [ ] 1일 이상 실사용 테스트

---

### Phase 10: 안정성 강화 (2일)

**목표**: 작업 실수 복구 및 상태 시각화
**예상 완료**: 2일
**위험도**: 중간
**의존성**: Phase 9 완료 필수

---

#### 10-1. Undo/Redo 시스템 (1.5일)

**목표**: 그룹 생성/삭제/수정 작업 되돌리기 지원

**현재 동작 분석**:
- `PageViewer.tsx`: `localGroups` 상태로 그룹 관리
- 실수 시 삭제 후 재생성 필요 (약 30초 소요)

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageViewer.tsx`, 새 파일 `hooks/useHistory.ts` |
| 영향받는 데이터 | `localGroups` 상태 (메모리) |
| API 변경 | 없음 |
| 데이터 구조 변경 | **없음** (메모리만 사용) |

**상세 구현 단계**:

**Step 1**: History Hook 설계 및 구현 (0.5일)
```typescript
// frontend/src/hooks/useHistory.ts

import { useState, useCallback } from 'react';

interface HistoryEntry<T> {
  state: T;
  description: string;
  timestamp: Date;
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (newState: T, description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyDescription: string | null;  // 현재 상태 설명
}

export function useHistory<T>(
  initialState: T,
  maxHistory: number = 20
): UseHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryEntry<T>[]>([
    { state: initialState, description: '초기 상태', timestamp: new Date() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const state = history[currentIndex].state;
  const historyDescription = history[currentIndex].description;

  const setState = useCallback((newState: T, description: string) => {
    setHistory(prev => {
      // 현재 위치 이후의 히스토리 제거 (redo 스택 클리어)
      const newHistory = prev.slice(0, currentIndex + 1);

      // 새 상태 추가
      newHistory.push({
        state: newState,
        description,
        timestamp: new Date(),
      });

      // 최대 히스토리 제한
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyDescription,
  };
}
```

**Step 2**: PageViewer에 통합 (0.5일)
```typescript
// PageViewer.tsx

import { useHistory } from '../hooks/useHistory';

export function PageViewer({ documentId, totalPages }: PageViewerProps) {
  // 기존 localGroups 대신 useHistory 사용
  const {
    state: localGroups,
    setState: setLocalGroupsWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<ProblemGroup[]>([]);

  // 기존 setLocalGroups 호출을 setLocalGroupsWithHistory로 교체
  // 그룹 생성
  const handleCreateGroup = () => {
    // ... 기존 로직
    setLocalGroupsWithHistory(updatedGroups, `그룹 ${newGroupId} 생성`);
  };

  // 그룹 삭제
  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = localGroups.filter((g) => g.id !== groupId);
    setLocalGroupsWithHistory(updatedGroups, `그룹 ${groupId} 삭제`);
  };

  // 그룹 정보 업데이트
  const handleUpdateGroupInfo = async (groupId: string, problemInfo: ProblemInfo) => {
    // ... 기존 로직
    setLocalGroupsWithHistory(updatedGroups, `그룹 ${groupId} 정보 수정`);
  };
```

**Step 3**: 키보드 단축키 연결 (0.2일)
```typescript
// PageViewer.tsx - handleKeyDown 수정

const handleKeyDown = (e: KeyboardEvent) => {
  // Ctrl+Z: Undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    if (canUndo) {
      undo();
      showToast('실행 취소', 'info');
    }
    return;
  }

  // Ctrl+Shift+Z 또는 Ctrl+Y: Redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    if (canRedo) {
      redo();
      showToast('다시 실행', 'info');
    }
    return;
  }

  // ... 기존 케이스들
};
```

**Step 4**: Undo/Redo 후 자동 저장 트리거 (0.2일)
```typescript
// PageViewer.tsx - useEffect로 히스토리 변경 시 저장 트리거

// 기존 자동 저장 로직은 localGroups 의존성으로 동작
// useHistory의 state가 변경되면 자동으로 2초 후 저장됨
```

**Step 5**: UI에 Undo/Redo 버튼 추가 (선택사항, 0.1일)
```typescript
// 상단 툴바에 Undo/Redo 버튼 추가 (선택적)
<div className="flex items-center gap-2">
  <button
    onClick={undo}
    disabled={!canUndo}
    className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
    title="실행 취소 (Ctrl+Z)"
  >
    <Undo className="w-4 h-4" />
  </button>
  <button
    onClick={redo}
    disabled={!canRedo}
    className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"
    title="다시 실행 (Ctrl+Shift+Z)"
  >
    <Redo className="w-4 h-4" />
  </button>
</div>
```

**안전장치**:
- [x] 히스토리 최대 20개로 제한 (메모리 관리)
- [x] Undo 후 새 작업 시 Redo 스택 자동 클리어
- [x] 페이지 변경 시 히스토리 초기화 (의도적)
- [x] Undo/Redo 후에도 자동 저장 트리거 (데이터 일관성)
- [x] 저장된 데이터는 변경 없음 (메모리에서만 히스토리 관리)

**테스트 체크리스트**:
- [ ] 그룹 생성 → Undo → 그룹 사라짐
- [ ] Undo → Redo → 다시 나타남
- [ ] 여러 작업 Undo/Redo 반복
- [ ] 20개 제한 초과 시 오래된 항목 삭제
- [ ] Undo/Redo 후 자동 저장 동작
- [ ] 페이지 이동 시 히스토리 초기화
- [ ] Ctrl+Z, Ctrl+Shift+Z 동작
- [ ] Mac에서 Cmd+Z, Cmd+Shift+Z 동작

**롤백 계획**:
- 문제 발생 시: `useHistory` 훅 제거
- `localGroups`를 기존 `useState`로 복원
- `setLocalGroupsWithHistory`를 `setLocalGroups`로 복원
- 데이터 영향: **없음** (저장된 데이터는 변경 없음)

---

#### 10-2. 페이지 상태 인디케이터 (0.5일)

**목표**: 페이지 네비게이션에 작업 상태 표시 (미작업/진행중/완료)

**현재 동작 분석**:
- `PageNavigation.tsx`: 현재 페이지 번호와 진행률만 표시
- 각 페이지의 작업 상태 알 수 없음

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageNavigation.tsx`, `PageViewer.tsx` |
| 영향받는 컴포넌트 | 페이지 네비게이션 UI |
| API 변경 | 없음 (기존 데이터 활용) |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: 페이지 상태 계산 로직 (0.2일)
```typescript
// frontend/src/utils/pageStatus.ts

import type { ProblemGroup } from '../api/client';

export type PageStatus = 'not_started' | 'in_progress' | 'completed';

/**
 * 페이지 작업 상태 판단
 * - not_started: 그룹 0개
 * - in_progress: 그룹 있으나 문항정보 미입력 그룹 존재
 * - completed: 모든 그룹에 문항정보 입력됨
 */
export function getPageStatus(groups: ProblemGroup[]): PageStatus {
  if (groups.length === 0) {
    return 'not_started';
  }

  const allHaveInfo = groups.every(g =>
    g.problemInfo?.bookName && g.problemInfo?.problemNumber
  );

  return allHaveInfo ? 'completed' : 'in_progress';
}

export function getStatusColor(status: PageStatus): string {
  switch (status) {
    case 'not_started': return 'bg-gray-300';
    case 'in_progress': return 'bg-yellow-400';
    case 'completed': return 'bg-green-500';
  }
}

export function getStatusLabel(status: PageStatus): string {
  switch (status) {
    case 'not_started': return '미작업';
    case 'in_progress': return '진행중';
    case 'completed': return '완료';
  }
}
```

**Step 2**: PageNavigation에 상태 표시 추가 (0.3일)
```typescript
// PageNavigation.tsx - Props 확장

interface PageNavigationProps {
  // ... 기존 props
  currentPageStatus?: PageStatus;  // 현재 페이지 상태
}

// 페이지 번호 옆에 상태 인디케이터 표시
<div className="flex items-center gap-2">
  <span className="text-sm font-medium text-gray-700">PDF</span>
  <input ... />
  {currentPageStatus && (
    <span
      className={`w-3 h-3 rounded-full ${getStatusColor(currentPageStatus)}`}
      title={getStatusLabel(currentPageStatus)}
    />
  )}
</div>
```

**Step 3**: PageViewer에서 상태 전달 (0.1일)
```typescript
// PageViewer.tsx

import { getPageStatus } from '../utils/pageStatus';

// ...

const currentPageStatus = getPageStatus(localGroups);

<PageNavigation
  // ... 기존 props
  currentPageStatus={currentPageStatus}
/>
```

**안전장치**:
- [x] 기존 UI 레이아웃 최소 변경 (인디케이터만 추가)
- [x] 상태 계산은 클라이언트에서 수행 (API 호출 없음)
- [x] 옵셔널 prop으로 하위 호환성 유지

**테스트 체크리스트**:
- [ ] 그룹 없을 때 회색 인디케이터
- [ ] 그룹 있고 문항정보 미입력 시 주황색
- [ ] 모든 그룹 문항정보 입력 시 초록색
- [ ] 페이지 이동 시 인디케이터 업데이트

**롤백 계획**:
- 문제 발생 시: `currentPageStatus` prop 및 인디케이터 UI 제거
- 데이터 영향: **없음**

---

### Phase 10 완료 체크리스트

#### 시작 조건
- [ ] Phase 9 완전히 안정화
- [ ] 1일 이상 프로덕션 테스트 완료

#### 완료 조건
- [ ] 10-1. Undo/Redo 시스템 ✓
- [ ] 10-2. 페이지 상태 인디케이터 ✓
- [ ] 모든 Step 테스트 통과
- [ ] 기존 기능 회귀 테스트 통과
- [ ] 1일 이상 실사용 테스트

---

### Phase 11: 시각적 개선 (1주)

**목표**: 사용성 및 학습 곡선 개선
**예상 완료**: 1주
**위험도**: 낮음
**의존성**: Phase 10 완료 권장

---

#### 11-1. 그룹별 색상 구분 (0.5일)

**목표**: 여러 그룹이 서로 다른 색상으로 표시

**현재 동작 분석**:
- `PageCanvas.tsx` (239-251행): 모든 그룹이 동일한 초록색 (#10b981)

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageCanvas.tsx`, 새 파일 `utils/groupColors.ts` |
| 영향받는 컴포넌트 | PageCanvas 블록 오버레이 |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: 그룹 색상 유틸 함수 (0.2일)
```typescript
// frontend/src/utils/groupColors.ts

// 구분 가능한 색상 팔레트 (10개)
const GROUP_COLORS = [
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)' },   // 파랑
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)' },   // 초록
  { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.2)' },   // 보라
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)' },   // 주황
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.2)' },   // 분홍
  { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.2)' },   // 청록
  { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.2)' },    // 빨강
  { stroke: '#84cc16', fill: 'rgba(132, 204, 22, 0.2)' },   // 라임
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)' },    // 시안
  { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.2)' },   // 퍼플
];

/**
 * 그룹 인덱스 기반 색상 반환
 */
export function getGroupColor(groupIndex: number): { stroke: string; fill: string } {
  return GROUP_COLORS[groupIndex % GROUP_COLORS.length];
}

/**
 * 그룹 ID 기반 색상 반환 (일관성 유지)
 */
export function getGroupColorById(groupId: string, groups: { id: string }[]): { stroke: string; fill: string } {
  const index = groups.findIndex(g => g.id === groupId);
  return getGroupColor(index >= 0 ? index : 0);
}
```

**Step 2**: PageCanvas에 적용 (0.3일)
```typescript
// PageCanvas.tsx

import { getGroupColorById } from '../utils/groupColors';

// 블록 렌더링 부분 수정
{blocks.map((block) => {
  const group = getBlockGroup(block.block_id);
  const isSelected = isBlockSelected(block.block_id);

  // 색상 결정
  let strokeColor = '#3b82f6'; // 기본: 파란색
  let fillColor = 'rgba(59, 130, 246, 0.1)';

  if (group) {
    // 그룹별 다른 색상 사용
    const groupColor = getGroupColorById(group.id, groups);
    strokeColor = groupColor.stroke;
    fillColor = groupColor.fill;
  }

  if (isSelected) {
    strokeColor = '#f59e0b'; // 선택: 주황색 (고정)
    fillColor = 'rgba(245, 158, 11, 0.3)';
  }

  // ... 기존 렌더링 로직
})}
```

**안전장치**:
- [x] 선택 상태는 항상 주황색으로 고정 (일관성)
- [x] 색상 순환으로 그룹 수 제한 없음
- [x] 기존 초록색도 팔레트에 포함

**테스트 체크리스트**:
- [ ] 각 그룹이 다른 색상으로 표시
- [ ] 선택 상태는 여전히 주황색
- [ ] 10개 이상 그룹 시 색상 순환
- [ ] 그룹 추가/삭제 시 색상 일관성

**롤백 계획**:
- 문제 발생 시: `getGroupColorById` 호출 제거, 기존 고정 색상 복원
- 데이터 영향: **없음**

---

#### 11-2. 키보드 단축키 힌트 바 (0.5일)

**목표**: 현재 상황에서 가능한 단축키 화면 하단 표시

**현재 동작 분석**:
- `PageNavigation.tsx` (284-288행): 기본 힌트만 표시
- 상황별 힌트 없음

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `PageViewer.tsx`, 새 컴포넌트 `components/ShortcutBar.tsx` |
| 영향받는 컴포넌트 | 페이지 하단 UI |
| API 변경 | 없음 |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: ShortcutBar 컴포넌트 생성 (0.3일)
```typescript
// frontend/src/components/ShortcutBar.tsx

interface ShortcutBarProps {
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isEditing: boolean;
}

export function ShortcutBar({ hasSelection, canUndo, canRedo, isEditing }: ShortcutBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white py-2 px-4 text-sm flex items-center justify-center gap-6">
      {/* 항상 표시 */}
      <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">←</kbd> <kbd className="bg-gray-700 px-1.5 py-0.5 rounded">→</kbd> 페이지 이동</span>
      <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Ctrl+S</kbd> 저장</span>

      {/* 선택 있을 때 */}
      {hasSelection && !isEditing && (
        <>
          <span className="text-green-400"><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">G</kbd> 그룹 생성</span>
          <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Esc</kbd> 선택 해제</span>
        </>
      )}

      {/* 편집 모드일 때 */}
      {isEditing && (
        <span className="text-blue-400"><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Esc</kbd> 편집 취소</span>
      )}

      {/* Undo/Redo 가능할 때 */}
      {canUndo && <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Ctrl+Z</kbd> 취소</span>}
      {canRedo && <span><kbd className="bg-gray-700 px-1.5 py-0.5 rounded">Ctrl+Shift+Z</kbd> 다시</span>}
    </div>
  );
}
```

**Step 2**: PageViewer에 통합 (0.2일)
```typescript
// PageViewer.tsx

import { ShortcutBar } from '../components/ShortcutBar';

// 컴포넌트 하단에 추가
<ShortcutBar
  hasSelection={selectedBlocks.length > 0}
  canUndo={canUndo}
  canRedo={canRedo}
  isEditing={!!autoEditGroupId}  // 편집 모드 여부
/>
```

**안전장치**:
- [x] fixed 위치로 기존 레이아웃 영향 없음
- [x] 조건부 렌더링으로 관련 힌트만 표시
- [x] 색상으로 강조 (초록=주요 액션)

**테스트 체크리스트**:
- [ ] 기본 상태에서 기본 힌트 표시
- [ ] 블록 선택 시 G 키 힌트 추가
- [ ] 편집 모드 시 Esc 힌트 변경
- [ ] Undo/Redo 가능 시 힌트 추가

**롤백 계획**:
- 문제 발생 시: ShortcutBar 컴포넌트 제거
- 데이터 영향: **없음**

---

#### 11-3. 크롭 미리보기 패널 (1.5일)

**목표**: 그룹 선택 시 크롭될 이미지 미리보기

**현재 동작 분석**:
- 그룹의 최종 결과물 확인을 위해 내보내기 필요
- 실시간 미리보기 없음

**영향 범위 분석**:
| 항목 | 상세 |
|------|------|
| 수정 파일 | `GroupPanel.tsx`, `PageViewer.tsx` |
| 영향받는 컴포넌트 | GroupPanel 우측 영역 |
| API 변경 | 없음 (클라이언트 측 캔버스 사용) |
| 데이터 구조 변경 | 없음 |

**상세 구현 단계**:

**Step 1**: 크롭 미리보기 컴포넌트 생성 (0.5일)
```typescript
// frontend/src/components/CropPreview.tsx

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

interface CropPreviewProps {
  documentId: string;
  pageIndex: number;
  bbox: [number, number, number, number] | null;  // [x1, y1, x2, y2]
}

export function CropPreview({ documentId, pageIndex, bbox }: CropPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!bbox || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsLoading(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = api.getPageImageUrl(documentId, pageIndex);

    img.onload = () => {
      const [x1, y1, x2, y2] = bbox;
      const cropWidth = x2 - x1;
      const cropHeight = y2 - y1;

      // 캔버스 크기 조정 (최대 너비 300px)
      const scale = Math.min(300 / cropWidth, 1);
      canvas.width = cropWidth * scale;
      canvas.height = cropHeight * scale;

      // 크롭 영역 그리기
      ctx.drawImage(
        img,
        x1, y1, cropWidth, cropHeight,  // 소스 영역
        0, 0, canvas.width, canvas.height  // 대상 영역
      );

      setIsLoading(false);
    };

    img.onerror = () => setIsLoading(false);
  }, [documentId, pageIndex, bbox]);

  if (!bbox) {
    return (
      <div className="text-center text-gray-500 py-8">
        그룹을 선택하면 미리보기가 표시됩니다
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          로딩 중...
        </div>
      )}
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
}
```

**Step 2**: 그룹의 전체 bbox 계산 로직 (0.3일)
```typescript
// frontend/src/utils/groupBbox.ts

import type { Block, ProblemGroup } from '../api/client';

/**
 * 그룹에 속한 블록들의 전체 바운딩 박스 계산
 */
export function calculateGroupBbox(
  group: ProblemGroup,
  blocks: Block[]
): [number, number, number, number] | null {
  const groupBlocks = blocks.filter(b => group.block_ids.includes(b.block_id));

  if (groupBlocks.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const block of groupBlocks) {
    const [x1, y1, x2, y2] = block.bbox;
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }

  // 여백 추가 (10px)
  const padding = 10;
  return [
    Math.max(0, minX - padding),
    Math.max(0, minY - padding),
    maxX + padding,
    maxY + padding
  ];
}
```

**Step 3**: GroupPanel에 미리보기 통합 (0.4일)
```typescript
// GroupPanel.tsx - 선택된 그룹의 미리보기 표시

interface GroupPanelProps {
  // ... 기존 props
  documentId: string;
  pageIndex: number;
  blocks: Block[];
  selectedGroupId?: string;
}

// 컴포넌트 내에서
const selectedGroup = selectedGroupId
  ? groups.find(g => g.id === selectedGroupId)
  : null;

const previewBbox = selectedGroup
  ? calculateGroupBbox(selectedGroup, blocks)
  : null;

// UI에 추가
{selectedGroup && (
  <div className="mt-4 border-t pt-4">
    <h4 className="text-sm font-semibold mb-2">크롭 미리보기</h4>
    <CropPreview
      documentId={documentId}
      pageIndex={pageIndex}
      bbox={previewBbox}
    />
  </div>
)}
```

**Step 4**: PageViewer에서 선택 그룹 ID 전달 (0.3일)
```typescript
// PageViewer.tsx

// 선택된 블록에 해당하는 그룹 찾기
const selectedGroupId = localGroups.find(g =>
  g.block_ids.length === selectedBlocks.length &&
  g.block_ids.every(id => selectedBlocks.includes(id))
)?.id;

<GroupPanel
  // ... 기존 props
  documentId={documentId}
  pageIndex={currentPage}
  blocks={blocksData.blocks}
  selectedGroupId={selectedGroupId}
/>
```

**안전장치**:
- [x] bbox가 없으면 안내 메시지 표시
- [x] 이미지 로딩 실패 시 에러 처리
- [x] 캔버스 크기 제한 (최대 300px)
- [x] 여백 추가로 잘림 방지

**테스트 체크리스트**:
- [ ] 그룹 선택 시 미리보기 표시
- [ ] 그룹 선택 해제 시 안내 메시지
- [ ] 이미지 로딩 중 로딩 표시
- [ ] 큰 그룹도 적절한 크기로 표시

**롤백 계획**:
- 문제 발생 시: CropPreview 컴포넌트 및 관련 props 제거
- 데이터 영향: **없음**

---

#### 11-4. 도움말 오버레이 (? 키) (0.5일)

**목표**: ? 키로 전체 단축키 및 기능 목록 표시

**상세 구현 단계**:

**Step 1**: HelpOverlay 컴포넌트 생성 (0.3일)
```typescript
// frontend/src/components/HelpOverlay.tsx

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '← →', description: '페이지 이동' },
  { key: 'G', description: '선택된 블록으로 그룹 생성' },
  { key: 'Delete', description: '선택된 그룹 삭제' },
  { key: 'Esc', description: '선택 해제 / 편집 취소' },
  { key: 'Ctrl+S', description: '즉시 저장' },
  { key: 'Ctrl+Z', description: '실행 취소 (Undo)' },
  { key: 'Ctrl+Shift+Z', description: '다시 실행 (Redo)' },
  { key: '?', description: '이 도움말 표시/닫기' },
];

export function HelpOverlay({ isOpen, onClose }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">키보드 단축키</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b">
              <kbd className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">{key}</kbd>
              <span className="text-gray-700">{description}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-gray-500 text-center">
          아무 곳이나 클릭하거나 ? 키를 눌러 닫기
        </p>
      </div>
    </div>
  );
}
```

**Step 2**: PageViewer에 통합 (0.2일)
```typescript
// PageViewer.tsx

const [showHelp, setShowHelp] = useState(false);

// handleKeyDown에 ? 키 추가
case '?':
  setShowHelp(prev => !prev);
  break;

// 컴포넌트 하단에 추가
<HelpOverlay isOpen={showHelp} onClose={() => setShowHelp(false)} />
```

**안전장치**:
- [x] 배경 클릭으로 닫기
- [x] ? 키 토글로 열기/닫기
- [x] z-index로 다른 UI 위에 표시

**테스트 체크리스트**:
- [ ] ? 키로 도움말 열기
- [ ] ? 키로 도움말 닫기
- [ ] 배경 클릭으로 닫기
- [ ] X 버튼으로 닫기
- [ ] 입력 필드에서 ? 키 입력 시 도움말 안 열림

**롤백 계획**:
- 문제 발생 시: HelpOverlay 컴포넌트 및 관련 상태 제거
- 데이터 영향: **없음**

---

### Phase 11 완료 체크리스트

#### 시작 조건
- [ ] Phase 10 완전히 안정화
- [ ] 1일 이상 프로덕션 테스트 완료

#### 완료 조건
- [ ] 11-1. 그룹별 색상 구분 ✓
- [ ] 11-2. 키보드 단축키 힌트 바 ✓
- [ ] 11-3. 크롭 미리보기 패널 ✓
- [ ] 11-4. 도움말 오버레이 ✓
- [ ] 모든 Step 테스트 통과
- [ ] 기존 기능 회귀 테스트 통과
- [ ] 1일 이상 실사용 테스트

---

## 3. 각 Phase별 체크리스트 요약

### Phase 9 (Quick Wins)

| 단계 | 체크리스트 |
|------|-----------|
| 시작 전 | Git 커밋, 브랜치 생성, 테스트 환경 |
| 9-1 | 자동 편집 모드 테스트 6항목 |
| 9-2 | 문항번호 자동 증가 테스트 6항목 |
| 9-3 | G 키 단축키 테스트 4항목 |
| 9-4 | Ctrl+S 저장 테스트 5항목 |
| 완료 후 | 회귀 테스트, 1일 실사용 |

### Phase 10 (안정성 강화)

| 단계 | 체크리스트 |
|------|-----------|
| 시작 전 | Phase 9 안정화 확인 |
| 10-1 | Undo/Redo 테스트 8항목 |
| 10-2 | 상태 인디케이터 테스트 4항목 |
| 완료 후 | 회귀 테스트, 1일 실사용 |

### Phase 11 (시각적 개선)

| 단계 | 체크리스트 |
|------|-----------|
| 시작 전 | Phase 10 안정화 확인 |
| 11-1 | 색상 구분 테스트 4항목 |
| 11-2 | 힌트 바 테스트 4항목 |
| 11-3 | 미리보기 테스트 4항목 |
| 11-4 | 도움말 테스트 5항목 |
| 완료 후 | 회귀 테스트, 1일 실사용 |

---

## 4. 위험 관리

### 주요 위험 요소

| 위험 | 원인 | 확률 | 영향 | 완화 방안 |
|------|------|------|------|----------|
| 데이터 손실 | Undo/Redo 버그 | 낮음 | 높음 | 히스토리는 메모리만 사용, 저장은 기존 방식 유지 |
| 기존 기능 손상 | 공유 컴포넌트 수정 | 중간 | 중간 | 단위 테스트, 회귀 테스트 필수 |
| 성능 저하 | 히스토리 스택, 미리보기 | 낮음 | 낮음 | 히스토리 20개 제한, 캔버스 크기 제한 |
| 사용자 혼란 | 새 단축키 학습 | 낮음 | 낮음 | 힌트 바, 도움말 오버레이 |

### 각 Phase별 롤백 계획

| Phase | 롤백 방법 | 소요 시간 | 데이터 영향 |
|-------|----------|----------|------------|
| Phase 9 | Props 제거, 유틸 함수 제거 | 30분 | 없음 |
| Phase 10 | useHistory 훅 제거, useState 복원 | 1시간 | 없음 |
| Phase 11 | 컴포넌트 및 관련 로직 제거 | 1시간 | 없음 |

---

## 5. 테스트 전략

### 단위 테스트

| 대상 | 파일 | 테스트 항목 |
|------|------|------------|
| 문항번호 파싱 | `utils/problemNumber.ts` | 패턴별 증가, 엣지 케이스 |
| 히스토리 훅 | `hooks/useHistory.ts` | Undo/Redo, 제한, 초기화 |
| 페이지 상태 | `utils/pageStatus.ts` | 상태 판단 로직 |
| 그룹 bbox | `utils/groupBbox.ts` | bbox 계산 |

### 통합 테스트

| 시나리오 | 검증 항목 |
|----------|----------|
| 그룹 생성 플로우 | 블록 선택 → G 키 → 자동 편집 → 번호 제안 → 저장 |
| Undo/Redo 플로우 | 그룹 생성 → Undo → Redo → 저장 확인 |
| 키보드 워크플로우 | 전체 작업을 키보드만으로 수행 |

### 회귀 테스트

| 영역 | 체크 항목 |
|------|----------|
| 그룹 관리 | 생성, 삭제, 수정, 저장 |
| 블록 선택 | 클릭, Ctrl+클릭, 드래그 |
| 페이지 이동 | 화살표 키, 버튼, 입력 |
| 자동 저장 | 2초 디바운스 동작 |
| 문항 정보 | 편집, 자동완성 |

---

## 6. 일정 및 마일스톤

| Phase | 기간 | 예상 시작 | 예상 종료 | 버퍼 |
|-------|------|----------|----------|------|
| Phase 9 | 1.5일 | D+0 | D+2 | 0.5일 |
| 안정화 | 1일 | D+2 | D+3 | - |
| Phase 10 | 2일 | D+3 | D+5 | 0.5일 |
| 안정화 | 1일 | D+5 | D+6 | - |
| Phase 11 | 3일 | D+6 | D+9 | 1일 |
| 안정화 | 1일 | D+9 | D+10 | - |

**총 예상 기간**: 10일 (버퍼 포함)

---

## 7. 성공 지표

### Phase 9 완료 시 (D+3)

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| 그룹당 클릭 수 | 수동 측정 | 2회 감소 |
| 문항번호 입력 시간 | 수동 측정 | 50% 감소 |
| G 키 사용률 | 사용자 피드백 | 50% 이상 |

### Phase 10 완료 시 (D+6)

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| Undo 사용 빈도 | 사용자 피드백 | 측정 시작 |
| 실수 복구 시간 | 수동 측정 | 90% 감소 |

### Phase 11 완료 시 (D+10)

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| 페이지당 작업 시간 | 수동 측정 | 75초 → 52초 |
| 키보드 단독 작업 비율 | 사용자 피드백 | 50% 이상 |
| 사용자 만족도 | 설문 | 80% 이상 만족 |

---

## 부록: 코드 컨벤션

### TypeScript

- 모든 함수에 타입 명시
- 복잡한 타입은 `types/` 또는 관련 파일 상단에 정의
- `interface` 선호 (확장 가능성)

### React

- 커스텀 훅: `hooks/` 디렉토리
- 유틸 함수: `utils/` 디렉토리
- 컴포넌트: `components/` 디렉토리
- 페이지: `pages/` 디렉토리

### 파일 명명

- 컴포넌트: PascalCase (`GroupPanel.tsx`)
- 유틸/훅: camelCase (`useHistory.ts`, `problemNumber.ts`)
- 테스트: `__tests__/` 하위 또는 `.test.ts` 접미사

### 커밋 메시지

```
[Phase 9-1] 그룹 생성 시 자동 편집 모드 진입 구현

- GroupPanel에 autoEditGroupId prop 추가
- PageViewer에서 그룹 생성 후 자동 편집 트리거
- 문항번호 필드 자동 포커스 구현
```

### PR 제목

```
[Phase 9] Quick Wins 구현 (자동 편집, 문항번호 자동 증가, G키, Ctrl+S)
```

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2025-11-26 | Claude | 초안 작성 |

---

*본 문서는 `13_labeling_ux_research_report.md` 기반으로 작성되었습니다.*
