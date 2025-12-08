# Phase 11 버그 수정 상세 구현 계획

**작성일**: 2025-11-26
**버그 ID**: CRITICAL-001
**버그명**: 페이지간 문항번호 연속성 실패 (React 클로저 문제)
**관련 문서**: [18_phase11_bug_report_page_continuity.md](18_phase11_bug_report_page_continuity.md)

---

## 📋 Executive Summary

### 목표
React 상태 클로저 문제로 인해 발생한 **잘못된 페이지에 데이터 저장** 버그를 안전하게 수정합니다.

### 전략
**명시적 pageIndex 전달 패턴**을 적용하여 클로저 의존성 제거

### 예상 소요 시간
- 구현: 60분
- 테스트: 60분
- 데이터 복구: 30분
- **총 2.5시간**

### 성공 기준
- ✅ 방향키로 페이지 이동 시 올바른 페이지에 저장
- ✅ 페이지간 문항번호 연속성 정상 작동 (30 → 31)
- ✅ 모든 기존 기능 정상 작동 (회귀 테스트 통과)
- ✅ 데이터 손실 없음

---

## 🎯 구현 범위

### 수정 대상 파일
1. **[frontend/src/pages/PageViewer.tsx](../frontend/src/pages/PageViewer.tsx)** (핵심)
   - `saveGroups` 함수 시그니처 변경
   - `saveImmediately` 함수 수정
   - 방향키 핸들러 수정 (ArrowLeft, ArrowRight)
   - Ctrl+S 핸들러 수정
   - 디바운스 useEffect 수정
   - `handleUpdateGroupInfo` 수정 (필요 시)

### 영향받는 기능
- ✅ Phase 10-2: 페이지간 문항번호 연속성
- ✅ Phase 11-2: 즉시 저장
- ⚠️ Phase 11-1: 자동 확정 (영향 없음, 검증 필요)
- ⚠️ 디바운스 자동 저장
- ⚠️ Ctrl+S 즉시 저장

---

## 🛠️ 상세 구현 계획

### Phase 1: 사전 준비 (10분)

#### 1.1 백업 생성
```bash
# 현재 코드 백업
cp frontend/src/pages/PageViewer.tsx frontend/src/pages/PageViewer.tsx.backup-$(date +%Y%m%d-%H%M%S)

# 현재 작업 중인 데이터 백업 (선택 사항)
# 사용자가 작업 중인 문서가 있다면 groups 폴더 백업
```

**체크리스트**:
- [ ] PageViewer.tsx 백업 완료
- [ ] 현재 git 상태 확인 (`git status`)
- [ ] 테스트 환경 준비 (dev 서버 실행 확인)

---

#### 1.2 테스트 데이터 준비
```bash
# 테스트용 PDF 문서 준비 (최소 3페이지)
# 또는 기존 문서 사용
```

**준비 사항**:
- [ ] 최소 3페이지 이상의 테스트 문서 준비
- [ ] 브라우저 개발자 도구 Network 탭 열기
- [ ] 콘솔 로그 확인 준비

---

### Phase 2: 코드 수정 (30분)

#### 2.1 `saveGroups` 함수 수정 (10분)

**현재 코드** (Line 271-295):
```typescript
const saveGroups = async (groups: ProblemGroup[]) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: currentPage,  // ❌ 클로저 문제
    groups: groups,
  };

  setIsSaving(true);
  try {
    await saveGroupsMutation.mutateAsync({
      documentId,
      pageIndex: currentPage,  // ❌ 클로저 문제
      groups: groupsData,
    });
    setLastSaved(new Date());

    // Phase 10-2: 그룹 저장 후 요약 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });
  } catch (error) {
    console.error('그룹 저장 실패:', error);
    showToast('그룹 저장에 실패했습니다', 'error');
  } finally {
    setIsSaving(false);
  }
};
```

**수정 후**:
```typescript
// Phase 11-3: 명시적 pageIndex 전달로 클로저 문제 해결
const saveGroups = async (groups: ProblemGroup[], targetPageIndex: number) => {
  const groupsData: PageGroups = {
    document_id: documentId,
    page_index: targetPageIndex,  // ✅ 명시적 전달
    groups: groups,
  };

  // 디버깅 로그 (개발 중에만)
  console.log(`[SaveGroups] Saving to page ${targetPageIndex}, current page: ${currentPage}`);
  console.log(`[SaveGroups] Groups count: ${groups.length}`);

  setIsSaving(true);
  try {
    await saveGroupsMutation.mutateAsync({
      documentId,
      pageIndex: targetPageIndex,  // ✅ 명시적 전달
      groups: groupsData,
    });
    setLastSaved(new Date());

    // Phase 10-2: 그룹 저장 후 요약 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['problemSummaries', documentId] });

    console.log(`[SaveGroups] ✅ Successfully saved to page ${targetPageIndex}`);
  } catch (error) {
    console.error('그룹 저장 실패:', error);
    showToast('그룹 저장에 실패했습니다', 'error');
  } finally {
    setIsSaving(false);
  }
};
```

**변경 사항**:
1. 파라미터 추가: `targetPageIndex: number`
2. `currentPage` → `targetPageIndex` 사용
3. 디버깅 로그 추가 (개발 중)
4. 주석 업데이트 (Phase 11-3)

**검증 방법**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] 파라미터 타입 확인
- [ ] 모든 호출부에서 pageIndex 전달 확인 (다음 단계)

---

#### 2.2 `saveImmediately` 함수 수정 (5분)

**현재 코드** (Line 83-91):
```typescript
const saveImmediately = async (groups: ProblemGroup[]) => {
  // 대기 중인 디바운스 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
  // 즉시 저장 실행
  await saveGroups(groups);
};
```

**수정 후**:
```typescript
// Phase 11-3: 명시적 pageIndex 전달
const saveImmediately = async (groups: ProblemGroup[], targetPageIndex: number) => {
  // 대기 중인 디바운스 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }

  console.log(`[SaveImmediately] Immediate save to page ${targetPageIndex}`);

  // 즉시 저장 실행
  await saveGroups(groups, targetPageIndex);  // ✅ pageIndex 전달
};
```

**변경 사항**:
1. 파라미터 추가: `targetPageIndex: number`
2. `saveGroups` 호출 시 `targetPageIndex` 전달
3. 디버깅 로그 추가

**검증 방법**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] saveGroups 호출 시 2개 파라미터 전달 확인

---

#### 2.3 방향키 핸들러 수정 (5분)

**현재 코드** (Line 168-180):
```typescript
case 'ArrowLeft':
  // Phase 11-2: 이전 페이지 이동 전 즉시 저장
  if (currentPage > 0) {
    await saveImmediately(localGroups);  // ❌ pageIndex 없음
    setCurrentPage(currentPage - 1);
  }
  break;
case 'ArrowRight':
  // Phase 11-2: 다음 페이지 이동 전 즉시 저장
  if (currentPage < totalPages - 1) {
    await saveImmediately(localGroups);  // ❌ pageIndex 없음
    setCurrentPage(currentPage + 1);
  }
  break;
```

**수정 후**:
```typescript
case 'ArrowLeft':
  // Phase 11-3: 이전 페이지 이동 전 즉시 저장 (명시적 pageIndex)
  if (currentPage > 0) {
    const pageToSave = currentPage;  // ✅ 현재 페이지 명시적 캡처
    console.log(`[ArrowLeft] Saving page ${pageToSave} before moving to ${pageToSave - 1}`);
    await saveImmediately(localGroups, pageToSave);  // ✅ 올바른 페이지
    setCurrentPage(currentPage - 1);
  }
  break;
case 'ArrowRight':
  // Phase 11-3: 다음 페이지 이동 전 즉시 저장 (명시적 pageIndex)
  if (currentPage < totalPages - 1) {
    const pageToSave = currentPage;  // ✅ 현재 페이지 명시적 캡처
    console.log(`[ArrowRight] Saving page ${pageToSave} before moving to ${pageToSave + 1}`);
    await saveImmediately(localGroups, pageToSave);  // ✅ 올바른 페이지
    setCurrentPage(currentPage + 1);
  }
  break;
```

**변경 사항**:
1. `pageToSave` 변수로 현재 페이지 명시적 캡처
2. `saveImmediately` 호출 시 `pageToSave` 전달
3. 디버깅 로그 추가 (페이지 전환 추적)

**핵심 포인트**:
- ⚠️ **반드시 `setCurrentPage` 전에 `currentPage` 값을 변수에 저장**
- 이후 `setCurrentPage`가 상태를 변경해도 `pageToSave`는 영향받지 않음

**검증 방법**:
- [ ] `pageToSave` 변수가 정확히 현재 페이지 인덱스인지 확인
- [ ] `saveImmediately` 호출 시 올바른 값 전달 확인

---

#### 2.4 Ctrl+S 핸들러 수정 (3분)

**현재 코드** (Line 154-160):
```typescript
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  await saveImmediately(localGroups);  // ❌ pageIndex 없음
  showToast('변경사항이 즉시 저장되었습니다', 'success');
  return;
}
```

**수정 후**:
```typescript
// Phase 11-3: Ctrl+S 즉시 저장 (명시적 pageIndex)
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  console.log(`[Ctrl+S] Saving current page ${currentPage}`);
  await saveImmediately(localGroups, currentPage);  // ✅ 현재 페이지 전달
  showToast('변경사항이 즉시 저장되었습니다', 'success');
  return;
}
```

**변경 사항**:
1. `saveImmediately` 호출 시 `currentPage` 전달
2. 디버깅 로그 추가

**참고**:
- Ctrl+S는 페이지 이동 없이 즉시 저장하므로, 현재 `currentPage` 값을 직접 사용해도 안전
- 하지만 일관성을 위해 명시적 전달

**검증 방법**:
- [ ] Ctrl+S 시 현재 페이지에 저장되는지 확인

---

#### 2.5 디바운스 useEffect 수정 (5분)

**현재 코드** (Line 128-149):
```typescript
useEffect(() => {
  // 초기 로드 시 저장하지 않음
  if (!groupsData) return;

  // 기존 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // 2초 후 자동 저장
  debounceTimerRef.current = setTimeout(() => {
    saveGroups(localGroups);  // ❌ pageIndex 없음
    debounceTimerRef.current = null;
  }, 2000);

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };
}, [localGroups]);
```

**수정 후**:
```typescript
// 자동 저장 (디바운스: 2초)
// Phase 11-3: 디바운스 타이머를 ref로 추적, 명시적 pageIndex 전달
useEffect(() => {
  // 초기 로드 시 저장하지 않음
  if (!groupsData) return;

  // 기존 타이머 취소
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // ✅ 현재 페이지를 클로저 외부에서 캡처
  const pageToSave = currentPage;

  // 2초 후 자동 저장
  debounceTimerRef.current = setTimeout(() => {
    console.log(`[Debounce] Auto-saving page ${pageToSave}`);
    saveGroups(localGroups, pageToSave);  // ✅ 명시적 pageIndex 전달
    debounceTimerRef.current = null;
  }, 2000);

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };
}, [localGroups]);
```

**변경 사항**:
1. `pageToSave` 변수로 현재 페이지 캡처 (클로저 외부)
2. `saveGroups` 호출 시 `pageToSave` 전달
3. 디버깅 로그 추가

**핵심 포인트**:
- ⚠️ **useEffect의 의존성이 `[localGroups]`이므로, 그룹 변경 시마다 실행됨**
- `currentPage`가 변경되어도 이 useEffect는 재실행되지 않음
- 따라서 `currentPage`를 타이머 설정 시점에 캡처해야 함

**잠재적 이슈**:
- localGroups 변경 후 currentPage가 변경되는 경우 (거의 없음)
- → 이 경우 방향키 핸들러의 즉시 저장이 먼저 실행되므로 문제 없음

**검증 방법**:
- [ ] 그룹 추가/수정 후 2초 후 올바른 페이지에 저장 확인
- [ ] 페이지 이동 시 디바운스 타이머가 취소되는지 확인

---

#### 2.6 `handleUpdateGroupInfo` 수정 (선택 사항, 2분)

**현재 코드** (Line 94-112):
```typescript
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

  // Phase 11-2: 문항 정보 업데이트 시 즉시 저장
  await saveImmediately(updatedGroups);  // ❌ pageIndex 없음
  showToast('문항 정보가 저장되었습니다', 'success');
};
```

**수정 후**:
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

  // Phase 11-3: 문항 정보 업데이트 시 즉시 저장 (명시적 pageIndex)
  console.log(`[UpdateGroupInfo] Saving group ${groupId} to page ${currentPage}`);
  await saveImmediately(updatedGroups, currentPage);  // ✅ 현재 페이지 전달
  showToast('문항 정보가 저장되었습니다', 'success');
};
```

**변경 사항**:
1. `saveImmediately` 호출 시 `currentPage` 전달
2. 디버깅 로그 추가

**참고**:
- 그룹 정보는 항상 현재 페이지에서 업데이트되므로 `currentPage` 직접 사용 안전

**검증 방법**:
- [ ] 문항 정보 수정 시 올바른 페이지에 저장 확인

---

### Phase 3: 컴파일 및 1차 검증 (10분)

#### 3.1 TypeScript 컴파일 확인
```bash
cd frontend
npm run build
# 또는 dev 서버에서 자동 컴파일 확인
```

**체크리스트**:
- [ ] TypeScript 에러 없음
- [ ] 모든 `saveGroups` 호출부에 2개 파라미터 전달 확인
- [ ] 모든 `saveImmediately` 호출부에 2개 파라미터 전달 확인

---

#### 3.2 코드 리뷰 (Self-Review)

**확인 사항**:
1. **saveGroups 함수**:
   - [ ] `targetPageIndex` 파라미터 추가됨
   - [ ] `currentPage` 대신 `targetPageIndex` 사용
   - [ ] 디버깅 로그 추가됨

2. **saveImmediately 함수**:
   - [ ] `targetPageIndex` 파라미터 추가됨
   - [ ] `saveGroups` 호출 시 `targetPageIndex` 전달

3. **방향키 핸들러**:
   - [ ] `pageToSave` 변수로 명시적 캡처
   - [ ] `setCurrentPage` 전에 캡처됨
   - [ ] `saveImmediately` 호출 시 `pageToSave` 전달

4. **Ctrl+S 핸들러**:
   - [ ] `saveImmediately` 호출 시 `currentPage` 전달

5. **디바운스 useEffect**:
   - [ ] `pageToSave` 변수로 명시적 캡처
   - [ ] `saveGroups` 호출 시 `pageToSave` 전달

6. **handleUpdateGroupInfo**:
   - [ ] `saveImmediately` 호출 시 `currentPage` 전달

---

#### 3.3 디버깅 로그 검증

**브라우저 콘솔에서 확인할 로그**:
```
[SaveGroups] Saving to page 0, current page: 0
[SaveGroups] Groups count: 2
[SaveGroups] ✅ Successfully saved to page 0

[ArrowRight] Saving page 0 before moving to 1
[SaveImmediately] Immediate save to page 0
[SaveGroups] Saving to page 0, current page: 0
[SaveGroups] ✅ Successfully saved to page 0
```

**예상되는 로그 흐름** (방향키 → 시):
```
1. [ArrowRight] Saving page 0 before moving to 1
2. [SaveImmediately] Immediate save to page 0
3. [SaveGroups] Saving to page 0, current page: 0  ← 아직 0
4. [SaveGroups] ✅ Successfully saved to page 0
   (이후 currentPage가 1로 변경됨)
```

---

### Phase 4: 단위 테스트 (20분)

#### Test 1: 기본 저장 (디바운스)
```
1. Page 0에서 블록 드래그하여 그룹 생성
2. 문항번호 "1" 입력 → Enter
3. 2초 대기
4. ✅ 콘솔 로그 확인: [Debounce] Auto-saving page 0
5. ✅ Network 탭 확인: POST /api/blocks/documents/{id}/groups/0
6. ✅ 파일 확인: page_0000_groups.json에 데이터 존재
```

**예상 결과**:
- [ ] Page 0에 올바르게 저장됨
- [ ] 문항번호 1 포함

---

#### Test 2: Ctrl+S 즉시 저장
```
1. Page 0에서 그룹 추가 (디바운스 대기 중)
2. Ctrl+S 누르기
3. ✅ 콘솔 로그 확인: [Ctrl+S] Saving current page 0
4. ✅ Network 탭 확인: POST /api/blocks/documents/{id}/groups/0
5. ✅ 토스트 메시지: "변경사항이 즉시 저장되었습니다"
```

**예상 결과**:
- [ ] 즉시 저장됨
- [ ] 디바운스 타이머 취소됨

---

#### Test 3: 방향키 → 이동 (핵심 테스트)
```
1. Page 0에서 문항번호 "1" 생성
2. 방향키 → 누르기
3. ✅ 콘솔 로그 확인:
   [ArrowRight] Saving page 0 before moving to 1
   [SaveImmediately] Immediate save to page 0
   [SaveGroups] Saving to page 0, current page: 0
   [SaveGroups] ✅ Successfully saved to page 0
4. ✅ Network 탭 확인: POST /api/blocks/documents/{id}/groups/0 (NOT 1!)
5. ✅ 파일 확인: page_0000_groups.json에 문항번호 1 포함
6. Page 1에서 블록 드래그하여 그룹 생성
7. ✅ 문항번호 "2" 자동 제안됨 확인
```

**예상 결과**:
- [ ] Page 0에 올바르게 저장됨 (Page 1이 아님!)
- [ ] Page 1에서 문항번호 2 제안됨
- [ ] **이것이 버그 수정의 핵심 테스트!**

---

#### Test 4: 빠른 연속 페이지 이동
```
1. Page 0: 문항번호 "1" 생성
2. 방향키 → → → (빠르게 3번)
3. ✅ 콘솔 로그 확인 (각 페이지마다):
   [ArrowRight] Saving page 0 before moving to 1
   [ArrowRight] Saving page 1 before moving to 2
   [ArrowRight] Saving page 2 before moving to 3
4. ✅ Network 탭 확인:
   POST /groups/0
   POST /groups/1
   POST /groups/2
5. Page 3에서 블록 드래그하여 그룹 생성
6. ✅ 문항번호 "2" 제안됨 (Page 0에만 데이터 있으므로)
```

**예상 결과**:
- [ ] 각 페이지에 올바르게 저장됨
- [ ] 경쟁 조건 없음

---

#### Test 5: 방향키 ← 이동
```
1. Page 2로 이동
2. 문항번호 "5" 생성
3. 방향키 ← 누르기
4. ✅ 콘솔 로그 확인:
   [ArrowLeft] Saving page 2 before moving to 1
   [SaveGroups] Saving to page 2
5. ✅ Network 탭: POST /groups/2
6. Page 1로 이동됨
```

**예상 결과**:
- [ ] Page 2에 올바르게 저장됨
- [ ] Page 1로 정상 이동

---

### Phase 5: 통합 테스트 (20분)

#### Integration Test 1: 페이지간 문항번호 연속성 (Phase 10-2)
```
시나리오: 12페이지에서 30번까지 작성 → 다음 페이지에서 31번 제안

1. Page 12로 이동 (실제 페이지 인덱스 12)
2. 그룹 30개 생성 (1번부터 30번까지)
   - 자동 확정 기능 사용 (Phase 11-1)
3. 방향키 → 누르기
4. ✅ 콘솔 로그:
   [ArrowRight] Saving page 12 before moving to 13
   [SaveGroups] Saving to page 12
   [SaveGroups] ✅ Successfully saved to page 12
5. ✅ Network 탭: POST /groups/12 (NOT 13!)
6. Page 13에서 블록 드래그하여 그룹 생성
7. ✅ 자동으로 편집 모드 진입 (Phase 9)
8. ✅ 문항번호 "31" 자동 제안됨 확인!
```

**예상 결과**:
- [ ] Page 12에 30개 그룹 저장됨
- [ ] Page 13에서 문항번호 31 제안됨
- [ ] **사용자 보고 버그 수정 확인!**

---

#### Integration Test 2: 자동 확정 + 즉시 저장 (Phase 11-1 + 11-2)
```
1. Page 0에서 블록 드래그하여 그룹 생성
2. ✅ 자동으로 편집 모드 진입
3. ✅ 문항번호 "1" 자동 입력
4. **수정하지 않고** 다음 블록 드래그
5. ✅ 자동 확정됨 (Phase 11-1)
6. ✅ 즉시 저장됨 (handleUpdateGroupInfo → saveImmediately)
7. ✅ 콘솔 로그: [UpdateGroupInfo] Saving group L1 to page 0
8. ✅ Network 탭: POST /groups/0
9. 방향키 → 누르기
10. ✅ Page 1에서 문항번호 "2" 제안됨
```

**예상 결과**:
- [ ] 자동 확정 정상 작동
- [ ] 즉시 저장 정상 작동
- [ ] 페이지간 연속성 정상 작동

---

#### Integration Test 3: 디바운스 vs 즉시 저장 우선순위
```
1. Page 0에서 그룹 생성 (디바운스 타이머 시작)
2. 1초 대기 (아직 저장 안 됨)
3. 방향키 → 누르기 (즉시 저장 트리거)
4. ✅ 디바운스 타이머 취소 확인
5. ✅ 즉시 저장 실행 확인
6. ✅ Page 0에 저장됨 (Page 1이 아님!)
```

**예상 결과**:
- [ ] 디바운스가 즉시 저장으로 대체됨
- [ ] 올바른 페이지에 저장됨

---

### Phase 6: 회귀 테스트 (10분)

#### 기존 기능 검증

**Phase 9 기능**:
- [ ] 그룹 생성 시 자동 편집 모드 진입
- [ ] 문항번호 자동 증가 (같은 페이지 내)
- [ ] G 키로 그룹 생성
- [ ] Enter 키로 저장

**Phase 10 기능**:
- [ ] 페이지 오프셋 설정
- [ ] 책 페이지 번호 표시

**Phase 11-1 기능**:
- [ ] 자동 확정 (수정하지 않고 다음 블록 선택 시)
- [ ] 수정 시 자동 확정 안 됨

**기타 기능**:
- [ ] 블록 선택 (클릭, Ctrl+클릭, 드래그)
- [ ] 그룹 삭제 (Delete/Backspace)
- [ ] ESC로 선택 해제
- [ ] 페이지 내보내기

---

### Phase 7: 에러 시나리오 테스트 (10분)

#### Error Test 1: 네트워크 실패
```
1. 백엔드 서버 중지
2. Page 0에서 그룹 생성
3. 방향키 → 누르기
4. ✅ 에러 토스트: "그룹 저장에 실패했습니다"
5. ✅ 콘솔 에러 로그 확인
6. 백엔드 서버 재시작
7. Ctrl+S로 재시도
8. ✅ 저장 성공
```

**예상 결과**:
- [ ] 에러 처리 정상
- [ ] 재시도 가능

---

#### Error Test 2: 빈 그룹 저장
```
1. Page 0에서 그룹 생성
2. 그룹 삭제
3. 방향키 → 누르기 (빈 배열 저장)
4. ✅ 정상적으로 빈 배열 저장됨
5. Page 1에서 문항번호 "1" 제안됨 (이전 페이지에 데이터 없으므로)
```

**예상 결과**:
- [ ] 빈 배열 저장 가능
- [ ] 에러 없음

---

### Phase 8: 데이터 복구 (선택 사항, 10분)

#### 8.1 잘못 저장된 데이터 확인

사용자가 이미 버그로 인해 잘못된 페이지에 데이터를 저장했을 수 있습니다.

**확인 방법**:
```bash
# 문서 폴더 확인
cd dataset_root/documents/{document_id}/groups

# 모든 그룹 파일 확인
ls -la page_*_groups.json

# 각 파일의 내용 확인 (JSON pretty-print)
for f in page_*_groups.json; do
  echo "=== $f ==="
  cat "$f" | python -m json.tool
done
```

**잘못된 데이터 패턴**:
- Page N의 파일이 비어있는데, Page N+1에 데이터가 있는 경우
- 문항번호가 비연속적인 경우 (1, 2, 3, ... 30, 1, 2 ← 버그!)

---

#### 8.2 데이터 복구 스크립트 (필요 시)

**백업 먼저!**:
```bash
# groups 폴더 전체 백업
cp -r dataset_root/documents/{document_id}/groups \
      dataset_root/documents/{document_id}/groups_backup_$(date +%Y%m%d-%H%M%S)
```

**수동 복구** (간단한 경우):
```bash
# Page 12의 데이터가 Page 13에 잘못 저장된 경우
mv dataset_root/documents/{document_id}/groups/page_0013_groups.json \
   dataset_root/documents/{document_id}/groups/page_0012_groups.json
```

**자동 복구 스크립트** (복잡한 경우):
```python
# scripts/fix_misplaced_groups.py
import json
import sys
from pathlib import Path

def fix_groups(document_id: str):
    """잘못 저장된 그룹 파일 수정"""
    doc_dir = Path(f"dataset_root/documents/{document_id}")
    groups_dir = doc_dir / "groups"

    for groups_file in sorted(groups_dir.glob("page_*_groups.json")):
        with groups_file.open("r", encoding="utf-8") as f:
            data = json.load(f)

        # 파일명에서 page_index 추출
        file_page_index = int(groups_file.stem.split("_")[1])

        # JSON 데이터의 page_index 확인
        json_page_index = data.get("page_index")

        if json_page_index != file_page_index:
            print(f"⚠️ Mismatch: {groups_file.name}")
            print(f"   File page_index: {file_page_index}")
            print(f"   JSON page_index: {json_page_index}")

            # JSON 데이터의 page_index 수정
            data["page_index"] = file_page_index

            with groups_file.open("w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"   ✅ Fixed: page_index → {file_page_index}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fix_misplaced_groups.py <document_id>")
        sys.exit(1)

    fix_groups(sys.argv[1])
```

**실행**:
```bash
python scripts/fix_misplaced_groups.py {document_id}
```

---

### Phase 9: 디버깅 로그 제거 (Production 준비, 5분)

수정이 완료되고 안정성이 확인되면 디버깅 로그를 제거합니다.

**제거할 로그**:
```typescript
// 제거
console.log(`[SaveGroups] Saving to page ${targetPageIndex}, current page: ${currentPage}`);
console.log(`[SaveGroups] Groups count: ${groups.length}`);
console.log(`[SaveGroups] ✅ Successfully saved to page ${targetPageIndex}`);

console.log(`[SaveImmediately] Immediate save to page ${targetPageIndex}`);

console.log(`[ArrowLeft] Saving page ${pageToSave} before moving to ${pageToSave - 1}`);
console.log(`[ArrowRight] Saving page ${pageToSave} before moving to ${pageToSave + 1}`);

console.log(`[Ctrl+S] Saving current page ${currentPage}`);

console.log(`[Debounce] Auto-saving page ${pageToSave}`);

console.log(`[UpdateGroupInfo] Saving group ${groupId} to page ${currentPage}`);
```

**또는 개발 환경에서만 로그 출력**:
```typescript
const DEBUG = import.meta.env.DEV;

if (DEBUG) {
  console.log(`[SaveGroups] Saving to page ${targetPageIndex}`);
}
```

---

### Phase 10: 최종 검증 및 배포 (10분)

#### 10.1 최종 체크리스트

**코드 품질**:
- [ ] TypeScript 컴파일 에러 없음
- [ ] ESLint 경고 없음
- [ ] 코드 포맷팅 완료 (Prettier)

**기능 검증**:
- [ ] 방향키 페이지 이동 시 올바른 페이지에 저장
- [ ] 페이지간 문항번호 연속성 작동 (30 → 31)
- [ ] 자동 확정 기능 정상 작동
- [ ] 디바운스 자동 저장 정상 작동
- [ ] Ctrl+S 즉시 저장 정상 작동
- [ ] 모든 회귀 테스트 통과

**데이터 검증**:
- [ ] 모든 그룹 파일이 올바른 페이지에 저장됨
- [ ] page_index 값이 파일명과 일치
- [ ] 데이터 손실 없음

**문서화**:
- [ ] 주석 업데이트 (Phase 11-3)
- [ ] 버그 리포트 완료
- [ ] 구현 계획 완료

---

#### 10.2 Git Commit

```bash
cd frontend

# 변경 사항 확인
git diff src/pages/PageViewer.tsx

# 스테이징
git add src/pages/PageViewer.tsx

# 커밋
git commit -m "Fix: Phase 11-3 - 페이지간 문항번호 연속성 버그 수정

[버그 설명]
- React 상태 클로저 문제로 인해 방향키로 페이지 이동 시
  잘못된 페이지에 데이터 저장되는 버그 수정

[수정 내용]
- saveGroups 함수에 명시적 targetPageIndex 파라미터 추가
- saveImmediately 함수 수정 (pageIndex 전달)
- 방향키 핸들러에서 pageToSave 변수로 명시적 캡처
- Ctrl+S, 디바운스, handleUpdateGroupInfo 모두 수정

[검증]
- 방향키 페이지 이동 시 올바른 페이지에 저장 확인
- 페이지간 문항번호 연속성 정상 작동 (30 → 31)
- 모든 회귀 테스트 통과

Related: #CRITICAL-001
Closes: Phase 11-3"
```

---

## 📊 성공 기준 (Acceptance Criteria)

### 필수 (Must Have):
- ✅ 방향키로 페이지 이동 시 **현재 페이지**에 저장됨
- ✅ Page 12에서 문항번호 30 작성 → Page 13에서 31 제안됨
- ✅ TypeScript 컴파일 에러 없음
- ✅ 모든 기존 기능 정상 작동

### 권장 (Should Have):
- ✅ 디버깅 로그로 페이지 인덱스 추적 가능
- ✅ 네트워크 탭에서 올바른 API 엔드포인트 호출 확인
- ✅ 빠른 연속 페이지 이동 시 경쟁 조건 없음

### 선택 (Nice to Have):
- ✅ 잘못 저장된 데이터 복구 스크립트
- ✅ E2E 테스트 추가
- ✅ Git commit 메시지 상세화

---

## 🚨 롤백 계획

### 롤백 조건
다음 중 하나라도 발생하면 즉시 롤백:
- 회귀 테스트 실패 (기존 기능 손상)
- 새로운 버그 발생
- 성능 저하
- 데이터 손실

### 롤백 절차

#### 1. 코드 롤백
```bash
# 백업 파일로 복원
cp frontend/src/pages/PageViewer.tsx.backup-* frontend/src/pages/PageViewer.tsx

# 또는 Git 롤백
git checkout HEAD~1 frontend/src/pages/PageViewer.tsx
```

#### 2. 서버 재시작
```bash
# 프론트엔드 dev 서버 재시작
Ctrl+C
npm run dev
```

#### 3. 데이터 롤백 (필요 시)
```bash
# groups 폴더 백업에서 복원
rm -rf dataset_root/documents/{document_id}/groups
cp -r dataset_root/documents/{document_id}/groups_backup_* \
      dataset_root/documents/{document_id}/groups
```

#### 4. 검증
- [ ] 백업된 코드로 정상 작동 확인
- [ ] 사용자에게 롤백 안내

---

## 📝 체크리스트 요약

### 구현 전
- [ ] 백업 완료 (PageViewer.tsx, groups 폴더)
- [ ] 테스트 데이터 준비 (최소 3페이지 문서)
- [ ] 브라우저 개발자 도구 준비

### 구현 중
- [ ] saveGroups 함수 수정
- [ ] saveImmediately 함수 수정
- [ ] 방향키 핸들러 수정 (ArrowLeft, ArrowRight)
- [ ] Ctrl+S 핸들러 수정
- [ ] 디바운스 useEffect 수정
- [ ] handleUpdateGroupInfo 수정 (선택)
- [ ] TypeScript 컴파일 확인

### 테스트
- [ ] 단위 테스트 5개 통과
- [ ] 통합 테스트 3개 통과
- [ ] 회귀 테스트 통과
- [ ] 에러 시나리오 테스트 통과

### 배포 전
- [ ] 디버깅 로그 제거 또는 DEV 모드 전용
- [ ] 코드 리뷰 완료
- [ ] Git commit 완료
- [ ] 문서 업데이트 완료

### 배포 후
- [ ] 사용자 테스트 요청
- [ ] 데이터 복구 (필요 시)
- [ ] 모니터링 (24시간)

---

## 🎓 학습 포인트

이 버그를 통해 배운 교훈:

1. **React 클로저 이해하기**
   - `useEffect`, `setTimeout` 내부에서 상태 값 캡처 주의
   - 최신 값이 필요하면 `useRef` 또는 명시적 전달

2. **비동기 상태 업데이트**
   - `setState`는 즉시 반영되지 않음
   - 상태 변경 전에 값을 변수에 저장

3. **명시적 vs 암묵적**
   - 파라미터로 명시적 전달 > 클로저로 암묵적 캡처
   - 코드가 길어지더라도 명확성이 우선

4. **디버깅 전략**
   - 로그로 실제 값 추적
   - Network 탭으로 API 호출 검증
   - 파일 시스템으로 최종 결과 확인

---

## 📚 참고 자료

- [React Hooks - Closures](https://react.dev/learn/understanding-your-ui-as-a-tree#closures-in-event-handlers)
- [useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies)
- [JavaScript Closures - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures)

---

**작성자**: Claude Code (Opus)
**검토자**: 사용자
**최종 업데이트**: 2025-11-26
**예상 완료일**: 2025-11-26 (동일일)
