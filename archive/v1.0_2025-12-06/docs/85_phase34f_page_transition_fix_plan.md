# Phase 34-F: 페이지 전환 시 그룹 저장 수정 계획

**작성일**: 2025-12-03
**근거 문서**: [84_phase34e_page_transition_group_loss.md](84_phase34e_page_transition_group_loss.md)

---

## 1. 목표

### 해결할 문제
```
10쪽 그룹 생성 → 11쪽 이동 → 10쪽 복귀 → 그룹 사라짐 ❌
```

### 기대 결과
```
10쪽 그룹 생성 → 11쪽 이동 → 10쪽 복귀 → 그룹 유지 ✅
```

---

## 2. 단계별 개발 계획

### Step 1: PageViewer.tsx 분석 및 현재 코드 확인

**파일**: `frontend/src/pages/PageViewer.tsx`

**확인 사항**:
1. `currentPage` 상태 변경 useEffect 위치 확인 (라인 299-306 예상)
2. `saveGroupsMutation` 사용 방식 확인
3. `localGroups` 상태 관리 확인

**예상 시간**: 5분

---

### Step 2: prevPageRef 및 localGroupsRef 추가

**파일**: `frontend/src/pages/PageViewer.tsx`

**작업 내용**:
이전 페이지 번호와 그룹을 추적하기 위한 ref 추가

**추가 코드**:
```typescript
// 기존 ref들 근처에 추가
const prevPageRef = useRef(currentPage);
const localGroupsRef = useRef<ProblemGroup[]>([]);
```

**예상 시간**: 2분

---

### Step 3: localGroupsRef 동기화 useEffect 추가

**파일**: `frontend/src/pages/PageViewer.tsx`

**작업 내용**:
`localGroups` 상태 변경 시 ref에도 동기화

**추가 코드**:
```typescript
// localGroups 변경 시 ref 동기화
useEffect(() => {
  localGroupsRef.current = localGroups;
}, [localGroups]);
```

**예상 시간**: 2분

---

### Step 4: 페이지 변경 useEffect 수정

**파일**: `frontend/src/pages/PageViewer.tsx`

**작업 내용**:
페이지 변경 전 이전 페이지의 그룹을 저장

**변경 전 (현재 코드)**:
```typescript
useEffect(() => {
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
  console.log(`[PageChange] Page changed to ${currentPage}, resetting groups`);
}, [currentPage]);
```

**변경 후**:
```typescript
useEffect(() => {
  const prevPage = prevPageRef.current;
  const prevGroups = localGroupsRef.current;

  // Phase 34-F: 페이지가 실제로 변경되었고, 이전 그룹이 있으면 저장
  if (prevPage !== currentPage && prevGroups.length > 0 && documentId) {
    console.log(`[Phase 34-F] Auto-saving page ${prevPage} groups before switching to ${currentPage}`);

    // 이전 페이지의 그룹을 저장 (비동기, await 없음)
    saveGroupsMutation.mutate({
      documentId,
      pageIndex: prevPage,
      groups: prevGroups.map(g => ({
        id: g.id,
        blockIds: g.blockIds,
        problemInfo: g.problemInfo,
      })),
    });
  }

  // 페이지 번호 업데이트
  prevPageRef.current = currentPage;

  // 새 페이지 초기화
  setSelectedBlocks([]);
  setLocalGroups([]);
  isInitialLoadRef.current = true;
  console.log(`[PageChange] Page changed to ${currentPage}, resetting groups`);
}, [currentPage, documentId, saveGroupsMutation]);
```

**예상 시간**: 10분

---

### Step 5: TypeScript 컴파일 확인

**명령어**:
```bash
cd frontend
npx tsc --noEmit
```

**예상 결과**: 에러 없음

**예상 시간**: 2분

---

### Step 6: 브라우저 테스트

**테스트 시나리오**:

#### 6.1 기본 시나리오
1. 10쪽: 블록 선택 → 그룹 생성 → "1번 문제" 입력
2. 11쪽 버튼 클릭
3. 10쪽 버튼 클릭
4. ✅ "1번 문제" 그룹이 표시되어야 함

#### 6.2 빠른 연속 이동
1. 10쪽: 그룹 생성
2. 11쪽 → 12쪽 → 13쪽 (빠르게 연속 클릭)
3. 10쪽으로 돌아가기
4. ✅ 그룹이 유지되어야 함

#### 6.3 화살표 키 동작 확인
1. 10쪽: 그룹 생성
2. → 키로 11쪽 이동
3. ← 키로 10쪽 복귀
4. ✅ 기존 동작과 동일하게 그룹 유지

#### 6.4 새로고침 후 복구
1. 10쪽: 그룹 생성
2. 11쪽 이동
3. F5 새로고침
4. 10쪽 이동
5. ✅ 그룹 유지 (Phase 34-E 자동 동기화)

**예상 시간**: 10분

---

## 3. 체크리스트

```
[ ] Step 1: PageViewer.tsx 현재 코드 확인
[ ] Step 2: prevPageRef, localGroupsRef 추가
[ ] Step 3: localGroupsRef 동기화 useEffect 추가
[ ] Step 4: 페이지 변경 useEffect 수정
[ ] Step 5: TypeScript 컴파일 확인
[ ] Step 6: 브라우저 테스트
    [ ] 6.1 기본 시나리오
    [ ] 6.2 빠른 연속 이동
    [ ] 6.3 화살표 키 동작
    [ ] 6.4 새로고침 후 복구
```

---

## 4. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 5분 |
| Step 2 | 2분 |
| Step 3 | 2분 |
| Step 4 | 10분 |
| Step 5 | 2분 |
| Step 6 | 10분 |
| **합계** | **31분** |

---

## 5. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/pages/PageViewer.tsx` | prevPageRef, localGroupsRef 추가 + 페이지 변경 useEffect 수정 |

---

## 6. 롤백 계획

수정 후 문제 발생 시:

### 옵션 A: 저장 조건 추가
```typescript
// 저장을 더 보수적으로 (변경된 그룹만)
if (prevGroups.length > 0 && hasLocalChanges) {
  // 저장
}
```

### 옵션 B: 원래 코드로 복원
페이지 변경 useEffect를 원래대로 되돌리고, 화살표 키와 동일한 방식으로 UI 버튼에 저장 추가 (방안 1)

---

## 7. 주의사항

### 7.1 의존성 배열
- `localGroups`를 직접 의존성에 넣으면 **무한 루프 위험**
- 반드시 `localGroupsRef`를 사용하여 최신 값 캡처

### 7.2 비동기 저장
- `await` 없이 `mutate()` 사용 → 페이지 전환 즉시 진행
- 저장 실패 시 콘솔에 경고만 표시 (UX 차단 없음)

### 7.3 첫 로드 시 저장 방지
- `prevPage === currentPage`일 때는 저장하지 않음 (첫 마운트)
- `prevGroups.length === 0`일 때도 저장하지 않음

---

*승인 시 "진행해줘"로 실행*
