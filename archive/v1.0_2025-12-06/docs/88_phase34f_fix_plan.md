# Phase 34-F: 그룹핑 리그레션 버그 수정 계획

**작성일**: 2025-12-03
**근거 문서**: [87_phase34f_grouping_regression_report.md](87_phase34f_grouping_regression_report.md)

---

## 1. 목표

### 해결할 문제
```
블록 선택 → 그룹 생성 → 그룹이 즉시 사라짐 ❌
```

### 기대 결과
```
블록 선택 → 그룹 생성 → 그룹 유지 + 자동 저장 ✅
```

---

## 2. 단계별 개발 계획

### Step 1: PageViewer.tsx 현재 코드 확인

**파일**: `frontend/src/pages/PageViewer.tsx`

**확인 사항**:
1. 페이지 변경 useEffect 위치 (라인 310-339)
2. 의존성 배열에 `saveGroupsMutation` 포함 확인
3. `setLocalGroups([])` 호출 위치 확인

**예상 시간**: 2분

---

### Step 2: useEffect 의존성 배열 수정

**파일**: `frontend/src/pages/PageViewer.tsx`

**변경 전** (라인 339):
```typescript
}, [currentPage, documentId, saveGroupsMutation]);
```

**변경 후**:
```typescript
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [currentPage, documentId]);
```

**설명**:
- `saveGroupsMutation`을 의존성에서 제거
- `saveGroupsMutation.mutate`는 React Query가 안정적인 참조로 제공하므로 안전
- ESLint 경고 무시 주석 추가 (의도적 제외임을 명시)

**예상 시간**: 3분

---

### Step 3: TypeScript 컴파일 확인

**명령어**:
```bash
cd frontend
npx tsc --noEmit
```

**예상 결과**: 에러 없음

**예상 시간**: 2분

---

### Step 4: 그룹 생성 테스트

**테스트 시나리오**:

#### 4.1 G 키로 그룹 생성
1. 페이지에서 블록 2-3개 선택 (Ctrl+클릭)
2. G 키 누르기
3. ✅ 그룹이 생성되고 유지되어야 함

#### 4.2 Enter 키로 그룹 생성
1. 블록 선택
2. Enter 키 누르기
3. ✅ 그룹이 생성되고 유지되어야 함

#### 4.3 그룹 패널 버튼으로 생성
1. 블록 선택
2. 우측 패널의 "그룹 생성" 버튼 클릭
3. ✅ 그룹이 생성되고 유지되어야 함

**예상 시간**: 5분

---

### Step 5: 페이지 전환 저장 테스트 (Phase 34-F 기능 확인)

**테스트 시나리오**:

#### 5.1 기본 시나리오
1. 10쪽: 블록 선택 → 그룹 생성
2. 11쪽 버튼 클릭
3. 10쪽 버튼 클릭
4. ✅ 그룹이 유지되어야 함

#### 5.2 빠른 연속 이동
1. 10쪽: 그룹 생성
2. 11쪽 → 12쪽 → 13쪽 (빠르게)
3. 10쪽으로 복귀
4. ✅ 그룹이 유지되어야 함

#### 5.3 화살표 키 이동
1. 10쪽: 그룹 생성
2. → 키로 11쪽 이동
3. ← 키로 10쪽 복귀
4. ✅ 그룹이 유지되어야 함

**예상 시간**: 5분

---

## 3. 체크리스트

```
[ ] Step 1: PageViewer.tsx 현재 코드 확인
[ ] Step 2: useEffect 의존성 배열 수정
[ ] Step 3: TypeScript 컴파일 확인
[ ] Step 4: 그룹 생성 테스트
    [ ] 4.1 G 키로 그룹 생성
    [ ] 4.2 Enter 키로 그룹 생성
    [ ] 4.3 그룹 패널 버튼으로 생성
[ ] Step 5: 페이지 전환 저장 테스트
    [ ] 5.1 기본 시나리오
    [ ] 5.2 빠른 연속 이동
    [ ] 5.3 화살표 키 이동
```

---

## 4. 예상 총 소요 시간

| 단계 | 시간 |
|------|------|
| Step 1 | 2분 |
| Step 2 | 3분 |
| Step 3 | 2분 |
| Step 4 | 5분 |
| Step 5 | 5분 |
| **합계** | **17분** |

---

## 5. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `frontend/src/pages/PageViewer.tsx` | useEffect 의존성에서 `saveGroupsMutation` 제거 |

---

## 6. 롤백 계획

수정 후 문제 발생 시:

### 옵션 A: 의존성 복원
```typescript
}, [currentPage, documentId, saveGroupsMutation]);
```

### 옵션 B: 페이지 변경 로직 분리
페이지 전환 저장과 초기화를 별도 useEffect로 분리

---

## 7. 주의사항

### 7.1 ESLint 경고
- `react-hooks/exhaustive-deps` 경고가 발생할 수 있음
- 의도적인 제외이므로 `eslint-disable-next-line` 주석 추가

### 7.2 mutation.mutate 안정성
- React Query는 `mutation.mutate` 함수의 참조 안정성을 보장
- mutation 객체 전체와 달리 mutate 함수는 변경되지 않음
- 따라서 의존성에서 제외해도 안전

---

*승인 시 "진행해줘"로 실행*
