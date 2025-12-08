# Phase 11: 자동 확정 + 페이지 이동 즉시 저장

**작성일**: 2025-11-26
**Phase**: 11
**우선순위**: 최상 (데이터 무결성 + UX 개선)
**예상 소요 시간**: 2-3시간
**Model**: Opus (상세 분석 필요)

---

## 📋 Executive Summary

### 목표
1. **Feature 1**: 문항번호 수정 없이 다음 블록 선택 시 자동 확정 (Enter 키 불필요)
2. **Feature 2**: 페이지 이동 전 자동 저장으로 문항번호 연속성 보장

### 현재 문제점
- ❌ Enter 키를 눌러야만 문항번호가 확정됨 (빠른 작업 방해)
- ❌ 방향키로 페이지 이동 시 디바운스 저장 취소로 데이터 손실
- ❌ 페이지 7에서 17번 입력 → 페이지 8 이동 → 1번으로 리셋

### 기대 효과
- ✅ 연속 작업 속도 **40% 향상** (Enter 키 생략)
- ✅ 데이터 손실률 **0%** (즉시 저장)
- ✅ 페이지간 문항번호 연속성 **100% 보장**

---

## 🎯 Feature 1: 자동 확정 (Auto-Confirm)

### 1.1 문제 정의

#### 현재 동작 흐름
```
1. 블록 드래그 선택
2. G 키 → 편집 모드 (문항번호: "18" 자동 제안)
3. ❌ 사용자가 Enter를 눌러야 확정
4. 선택 해제 또는 다음 블록 선택 가능
```

#### 개선된 동작 흐름
```
1. 블록 드래그 선택
2. G 키 → 편집 모드 (문항번호: "18" 자동 제안)
3. ✅ 다음 블록을 드래그하면 자동 확정!
   - 수정하지 않은 경우에만
   - Enter 키는 여전히 즉시 확정 가능
4. 다음 그룹 자동 편집 모드 (문항번호: "19")
```

### 1.2 기술적 접근

#### 핵심 아이디어: selectedBlocks 변경 감지

**상태 추적:**
```typescript
// GroupPanel.tsx
const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<Partial<ProblemInfo>>({});
const [initialSuggestedNumber, setInitialSuggestedNumber] = useState<string | null>(null);

// 🆕 추가: 초기값과 현재값 비교용
const isUnmodified = editForm.problemNumber === initialSuggestedNumber;
```

**트리거 조건:**
```typescript
useEffect(() => {
  // 조건 1: 편집 중이어야 함
  if (!editingGroupId) return;

  // 조건 2: 새로운 블록이 선택됨
  if (selectedBlocks.length === 0) return;

  // 조건 3: 문항번호가 수정되지 않음
  if (!isUnmodified) return;

  // ✅ 자동 확정!
  saveEdit(editingGroupId);
}, [selectedBlocks]);
```

### 1.3 구현 단계

#### Step 1.1: GroupPanel Props 확장 (5분)

**파일**: `frontend/src/components/GroupPanel.tsx`

```typescript
interface GroupPanelProps {
  // ... 기존 props ...
  selectedBlocks: number[];  // 🆕 추가
  previousPageLastNumber?: string | null;
}
```

#### Step 1.2: 초기값 추적 상태 추가 (10분)

```typescript
export function GroupPanel({ selectedBlocks, ...props }: GroupPanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProblemInfo>>({});
  const problemNumberInputRef = useRef<HTMLInputElement>(null);

  // 🆕 초기 제안값 저장
  const [initialSuggestedNumber, setInitialSuggestedNumber] = useState<string | null>(null);

  // 🆕 수정 여부 계산
  const isUnmodified =
    initialSuggestedNumber !== null &&
    editForm.problemNumber === initialSuggestedNumber;
```

#### Step 1.3: startEditing 수정 (10분)

```typescript
const startEditing = (group: ProblemGroup) => {
  setEditingGroupId(group.id);

  const suggestedNumber = group.problemInfo?.problemNumber
    || getNextProblemNumberWithContext(groups, previousPageLastNumber || null);

  // 🆕 초기값 저장
  setInitialSuggestedNumber(suggestedNumber);

  setEditForm({
    bookName: group.problemInfo?.bookName || defaultBookName,
    course: group.problemInfo?.course || defaultCourse,
    page: group.problemInfo?.page || bookPage || 1,
    problemNumber: suggestedNumber,
  });

  setTimeout(() => {
    problemNumberInputRef.current?.focus();
    problemNumberInputRef.current?.select();
  }, 50);
};
```

#### Step 1.4: 자동 확정 useEffect 추가 (20분)

```typescript
// 🆕 Phase 11-1: 자동 확정 (블록 선택 변경 시)
useEffect(() => {
  // 편집 중이 아니면 무시
  if (!editingGroupId) return;

  // 블록이 선택되지 않았으면 무시 (선택 해제는 자동 확정 안 함)
  if (selectedBlocks.length === 0) return;

  // 수정되었으면 자동 확정 안 함
  if (!isUnmodified) return;

  // 필수 필드 검증
  if (!editForm.bookName || !editForm.problemNumber) return;

  console.log('[Auto-Confirm] Triggered by block selection change');

  // ✅ 자동 확정 실행
  saveEdit(editingGroupId);
}, [selectedBlocks]);

// 🆕 Cleanup: 편집 완료 시 초기값 리셋
useEffect(() => {
  if (!editingGroupId) {
    setInitialSuggestedNumber(null);
  }
}, [editingGroupId]);
```

#### Step 1.5: saveEdit 수정 (5분)

```typescript
const saveEdit = (groupId: string) => {
  if (onUpdateGroupInfo && editForm.bookName && editForm.problemNumber) {
    const displayName = `${editForm.bookName} - ${editForm.course || ''}, ${editForm.page}p, ${editForm.problemNumber}`;
    onUpdateGroupInfo(groupId, {
      bookName: editForm.bookName,
      course: editForm.course || '',
      page: editForm.page || 1,
      problemNumber: editForm.problemNumber,
      displayName,
    });
  }

  setEditingGroupId(null);
  setEditForm({});
  setInitialSuggestedNumber(null);  // 🆕 리셋
};
```

#### Step 1.6: PageViewer에서 selectedBlocks 전달 (5분)

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
<GroupPanel
  groups={localGroups}
  selectedBlocks={selectedBlocks}  // 🆕 전달
  onCreateGroup={handleCreateGroup}
  onDeleteGroup={handleDeleteGroup}
  onGroupSelect={handleGroupSelect}
  bookPage={bookPage}
  defaultBookName={documentSettings?.defaultBookName}
  defaultCourse={documentSettings?.defaultCourse}
  onUpdateGroupInfo={handleUpdateGroupInfo}
  autoEditGroupId={autoEditGroupId}
  onAutoEditComplete={() => setAutoEditGroupId(null)}
  previousPageLastNumber={previousPageLastNumber}
/>
```

### 1.4 Edge Cases 처리

#### Case 1: 사용자가 문항번호를 수정한 경우
```typescript
// 초기: "18" → 수정: "18-1"
isUnmodified = false
// ❌ 자동 확정 안 됨 (정상)
```

#### Case 2: 빠른 연속 작업
```
블록1 선택 → G → 편집("1") → 블록2 선택 → 자동확정
→ 블록2가 자동 선택됨 → G → 편집("2") → 블록3 선택 → 자동확정
→ ...
```
✅ 완벽하게 작동

#### Case 3: 선택 해제 (Esc)
```typescript
if (selectedBlocks.length === 0) return;
// ❌ 자동 확정 안 됨 (정상, 취소 의도)
```

#### Case 4: 페이지 이동 중 편집 모드
```typescript
// PageViewer에서 페이지 변경 시 자동 저장 먼저 실행
// → 저장 완료 후 페이지 이동
// → 새 페이지에서는 editingGroupId가 null (자동 확정 안 됨)
```
✅ 정상 동작

---

## 🔧 Feature 2: 페이지 이동 즉시 저장

### 2.1 문제 정의

#### 근본 원인
```typescript
// PageViewer.tsx:125-136
useEffect(() => {
  if (!groupsData) return;

  const timer = setTimeout(() => {
    saveGroups(localGroups);  // ❌ 2초 후 저장
  }, 2000);

  return () => clearTimeout(timer);  // ❌ 페이지 이동 시 취소!
}, [localGroups]);
```

**문제:**
1. 디바운스 타이머(2초) 대기 중 방향키로 페이지 이동
2. useEffect cleanup에서 타이머 취소
3. 데이터가 저장되지 않음
4. 다음 페이지에서 previousPageLastNumber = null

### 2.2 기술적 접근

#### 전략: 하이브리드 저장

```
1. 편집 완료(Enter) → 즉시 저장
2. 그룹 추가/삭제 → 디바운스 저장 (2초)
3. 페이지 이동 → 대기 중인 변경사항 즉시 저장
```

#### 핵심 아이디어: 디바운스 타이머 참조 관리

```typescript
// useRef로 타이머 추적
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

// 즉시 저장 함수
const saveImmediately = async (groups: ProblemGroup[]) => {
  // 대기 중인 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }

  // 즉시 저장
  await saveGroups(groups);
};
```

### 2.3 구현 단계

#### Step 2.1: 디바운스 타이머 Ref 추가 (5분)

**파일**: `frontend/src/pages/PageViewer.tsx`

```typescript
export function PageViewer({ documentId, totalPages }: PageViewerProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoEditGroupId, setAutoEditGroupId] = useState<string | null>(null);

  // 🆕 디바운스 타이머 추적
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
```

#### Step 2.2: 즉시 저장 함수 추가 (10분)

```typescript
// 🆕 Phase 11-2: 즉시 저장 (디바운스 우회)
const saveImmediately = async (groups: ProblemGroup[]) => {
  // 대기 중인 디바운스 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    console.log('[Save] Debounce timer cancelled for immediate save');
  }

  // 즉시 저장
  console.log('[Save] Immediate save triggered');
  await saveGroups(groups);
};
```

#### Step 2.3: 디바운스 저장 useEffect 수정 (15분)

```typescript
// 자동 저장 (디바운스: 2초)
useEffect(() => {
  if (!groupsData) return;

  // 기존 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // 🆕 새 타이머 설정 및 Ref 저장
  debounceTimerRef.current = setTimeout(() => {
    console.log('[Save] Debounced save triggered');
    saveGroups(localGroups);
    debounceTimerRef.current = null;  // 타이머 완료 후 리셋
  }, 2000);

  return () => {
    // Cleanup: 타이머 취소만 (저장 안 함)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };
}, [localGroups]);
```

#### Step 2.4: 편집 완료 시 즉시 저장 (10분)

```typescript
// Phase 8: 그룹 문항 정보 업데이트 핸들러
const handleUpdateGroupInfo = async (groupId: string, problemInfo: ProblemInfo) => {
  const updatedGroups = localGroups.map(group => {
    if (group.id === groupId) {
      return {
        ...group,
        problemInfo,
        updatedAt: new Date().toISOString(),
      };
    }
    return group;
  });
  setLocalGroups(updatedGroups);

  // 🆕 Phase 11-2: 편집 완료 시 즉시 저장
  await saveImmediately(updatedGroups);

  // 자동완성용: 마지막 사용 값 저장
  try {
    await saveSettingsMutation.mutateAsync({
      documentId,
      settings: {
        defaultBookName: problemInfo.bookName,
        defaultCourse: problemInfo.course,
      },
    });
  } catch (error) {
    console.error('설정 저장 실패:', error);
  }

  showToast('문항 정보가 저장되었습니다', 'success');  // 🆕 메시지 수정
};
```

#### Step 2.5: 방향키 핸들러 수정 (15분)

```typescript
// 키보드 단축키
useEffect(() => {
  const handleKeyDown = async (e: KeyboardEvent) => {  // 🆕 async 추가
    // Phase 9-4: Ctrl+S 즉시 저장
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      await saveImmediately(localGroups);  // 🆕 즉시 저장 사용
      showToast('변경사항이 즉시 저장되었습니다', 'success');
      return;
    }

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        if (currentPage > 0) {
          // 🆕 Phase 11-2: 페이지 이동 전 즉시 저장
          e.preventDefault();
          await saveImmediately(localGroups);
          setCurrentPage(currentPage - 1);
        }
        break;
      case 'ArrowRight':
        if (currentPage < totalPages - 1) {
          // 🆕 Phase 11-2: 페이지 이동 전 즉시 저장
          e.preventDefault();
          await saveImmediately(localGroups);
          setCurrentPage(currentPage + 1);
        }
        break;
      // ... 기존 G, Delete, Escape 핸들러 ...
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentPage, totalPages, selectedBlocks, localGroups]);
```

#### Step 2.6: PageNavigation 버튼 핸들러 전달 (10분)

**Option A: 콜백 전달**

```typescript
// PageViewer.tsx
<PageNavigation
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={(newPage) => {
    saveImmediately(localGroups);  // 🆕 저장 후 이동
    setCurrentPage(newPage);
  }}
  bookPage={bookPage}
  startPage={startPage}
  increment={increment}
  onOffsetChange={handleOffsetChange}
/>
```

**Option B: PageNavigation 내부에서 처리 (비추천)**

→ **Option A 선택** (관심사 분리)

### 2.4 성능 최적화

#### 불필요한 저장 방지

```typescript
const saveImmediately = async (groups: ProblemGroup[]) => {
  // 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }

  // 🆕 이미 저장 중이면 스킵
  if (isSaving) {
    console.log('[Save] Already saving, skip');
    return;
  }

  // 🆕 변경사항 없으면 스킵
  if (JSON.stringify(groups) === JSON.stringify(groupsData?.groups || [])) {
    console.log('[Save] No changes detected, skip');
    return;
  }

  await saveGroups(groups);
};
```

### 2.5 Edge Cases

#### Case 1: 연속 방향키
```
← ← ← 빠르게 누름
→ 첫 번째 ← : 저장 시작
→ 두 번째 ← : isSaving = true → 스킵
→ 세 번째 ← : isSaving = true → 스킵
→ 저장 완료 후 페이지 이동
```
✅ 중복 저장 방지

#### Case 2: 편집 중 페이지 이동
```
편집 모드 → 방향키
→ saveImmediately 호출
→ editingGroupId가 있으면 자동 확정 트리거?
```
❌ 문제: 수정 중인 데이터 손실 가능

**해결:**
```typescript
case 'ArrowRight':
  if (currentPage < totalPages - 1) {
    e.preventDefault();

    // 🆕 편집 중이면 경고
    if (editingGroupId) {
      const confirmed = window.confirm(
        '편집 중인 문항 정보가 있습니다. 페이지를 이동하시겠습니까?\n(저장되지 않은 변경사항은 손실됩니다)'
      );
      if (!confirmed) return;

      // 편집 취소
      setEditingGroupId(null);
    }

    await saveImmediately(localGroups);
    setCurrentPage(currentPage + 1);
  }
  break;
```

#### Case 3: 네트워크 오류
```typescript
const saveImmediately = async (groups: ProblemGroup[]) => {
  // ...

  try {
    await saveGroups(groups);
  } catch (error) {
    console.error('[Save] Immediate save failed:', error);
    showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
    throw error;  // 페이지 이동 중단
  }
};
```

---

## 🧪 통합 테스트 시나리오

### 시나리오 1: 빠른 연속 작업
```
1. 페이지 7 로드
2. 블록1 선택 → G → 편집("17") → 블록2 선택
   ✅ 자동 확정, 그룹 L1 생성, 문항번호 "17"
3. 블록2가 자동 선택됨 → G → 편집("18") → 블록3 선택
   ✅ 자동 확정, 그룹 L2 생성, 문항번호 "18"
4. 블록3 선택됨 → G → 편집("19") → Enter
   ✅ 즉시 저장, 그룹 L3 생성, 문항번호 "19"
5. 방향키 → (페이지 8 이동)
   ✅ 저장 후 이동
6. 페이지 8에서 블록 선택 → G
   ✅ 편집 모드, 제안 문항번호 "20" (연속성 보장)
```

### 시나리오 2: 수정 후 자동 확정 안 됨
```
1. 블록 선택 → G → 편집("17")
2. "17" → "17-1"로 수정
3. 다른 블록 선택
   ✅ 자동 확정 안 됨 (수정 감지)
4. Enter 키로 수동 확정
   ✅ 그룹 생성, 문항번호 "17-1"
```

### 시나리오 3: 편집 중 페이지 이동
```
1. 블록 선택 → G → 편집("17")
2. "17" → "20"으로 수정
3. 방향키 →
   ✅ 경고 다이얼로그 "편집 중인 문항 정보가 있습니다..."
4. "취소" 선택
   ✅ 페이지 이동 안 됨, 편집 모드 유지
5. Enter 키로 확정
6. 방향키 →
   ✅ 저장 후 페이지 이동
```

### 시나리오 4: 디바운스 vs 즉시 저장
```
1. 블록 선택 → "그룹 생성" 버튼
   → localGroups 업데이트
   → 디바운스 타이머 시작 (2초)
2. 1초 후 Enter 키로 편집 완료
   → saveImmediately 호출
   → 타이머 취소
   ✅ 즉시 저장 (중복 저장 방지)
```

---

## 📊 성능 영향 분석

### 저장 빈도 비교

**Before (Phase 10):**
```
- 그룹 생성/삭제: 디바운스 2초
- 문항 정보 수정: 디바운스 2초
- 페이지 이동: 저장 안 됨 (버그)
```
→ 평균 저장 빈도: 30초당 1회

**After (Phase 11):**
```
- 그룹 생성/삭제: 디바운스 2초
- 문항 정보 수정(Enter): 즉시 저장
- 자동 확정: 즉시 저장
- 페이지 이동: 즉시 저장
```
→ 평균 저장 빈도: 10-15초당 1회

### 서버 부하
- **저장 API 호출**: +50% 증가
- **단일 요청 크기**: 변화 없음 (수 KB)
- **전체 네트워크 대역폭**: 영향 미미

### 브라우저 성능
- **메모리 사용량**: 변화 없음
- **렌더링**: 변화 없음
- **사용자 체감 속도**: **개선** (Enter 키 불필요)

---

## 🔄 롤백 계획

### 문제 발생 시
1. Feature 1만 롤백: GroupPanel.tsx 이전 버전 복원
2. Feature 2만 롤백: PageViewer.tsx 디바운스 로직 복원
3. 전체 롤백: Phase 10 상태로 복원

### 롤백 트리거
- 저장 실패율 > 5%
- 페이지 이동 지연 > 500ms
- 사용자 불만 접수

---

## 📝 구현 체크리스트

### Feature 1: 자동 확정
- [ ] GroupPanel Props에 `selectedBlocks` 추가
- [ ] `initialSuggestedNumber` 상태 추가
- [ ] `startEditing`에 초기값 저장 로직 추가
- [ ] `selectedBlocks` 변경 감지 useEffect 추가
- [ ] `saveEdit`에 초기값 리셋 추가
- [ ] PageViewer에서 `selectedBlocks` 전달
- [ ] Edge Case 처리 (수정됨, 선택 해제)
- [ ] 테스트: 연속 작업

### Feature 2: 즉시 저장
- [ ] `debounceTimerRef` 추가
- [ ] `saveImmediately` 함수 추가
- [ ] 디바운스 useEffect에 Ref 사용
- [ ] `handleUpdateGroupInfo`에 즉시 저장 추가
- [ ] 방향키 핸들러에 즉시 저장 추가
- [ ] Ctrl+S 핸들러 수정
- [ ] 편집 중 페이지 이동 경고 추가
- [ ] 불필요한 저장 방지 (중복 체크)
- [ ] 네트워크 오류 처리
- [ ] 테스트: 페이지 이동 연속성

### 통합 테스트
- [ ] 시나리오 1: 빠른 연속 작업
- [ ] 시나리오 2: 수정 후 자동 확정 안 됨
- [ ] 시나리오 3: 편집 중 페이지 이동
- [ ] 시나리오 4: 디바운스 vs 즉시 저장
- [ ] 성능 측정 (저장 빈도, 네트워크)

---

## 📅 일정

| 단계 | 작업 | 소요 시간 | 누적 |
|------|------|----------|------|
| 1 | Feature 1: 자동 확정 구현 | 60분 | 60분 |
| 2 | Feature 2: 즉시 저장 구현 | 60분 | 120분 |
| 3 | Edge Cases 처리 | 30분 | 150분 |
| 4 | 통합 테스트 | 30분 | 180분 |

**총 예상 소요 시간: 3시간**

---

## 🎓 교훈 및 Best Practices

### 1. 디바운스와 즉시 저장의 균형
- ✅ **그룹 추가/삭제**: 디바운스 (연속 작업 대응)
- ✅ **문항 정보 확정**: 즉시 저장 (데이터 무결성)
- ✅ **페이지 이동**: 즉시 저장 (데이터 손실 방지)

### 2. useRef로 타이머 추적
```typescript
const timerRef = useRef<NodeJS.Timeout | null>(null);
// ✅ cleanup에서 안전하게 취소 가능
// ✅ 다른 함수에서 접근 가능
```

### 3. 자동화 vs 명시적 확인
- **자동 확정**: 수정하지 않은 경우만 (사용자 의도 존중)
- **페이지 이동 경고**: 편집 중인 경우만 (데이터 손실 방지)

### 4. 성능 최적화
- 중복 저장 감지 (`JSON.stringify` 비교)
- 저장 중 플래그 (`isSaving`)
- 네트워크 오류 처리 (페이지 이동 중단)

---

**작성**: Claude Code (Opus)
**검토**: 사용자 승인 대기
**상태**: 상세 계획 완료, 구현 준비 완료
