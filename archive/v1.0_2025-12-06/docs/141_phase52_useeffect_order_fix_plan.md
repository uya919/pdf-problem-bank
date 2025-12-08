# Phase 52: useEffect 실행 순서 버그 수정 계획

**작성일**: 2025-12-04
**분석 문서**: [140_error_report_useeffect_order_bug.md](140_error_report_useeffect_order_bug.md)
**예상 작업 시간**: 15분

---

## 문제 요약

페이지 재방문 시 `setLocalGroups([])` 호출이 `groupsData` effect가 설정한 그룹을 덮어써서 0개로 표시됨.

```
groupsData effect: setLocalGroups(7개) ✅
     ↓ (직후)
page transition effect: setLocalGroups([]) ❌ ← 덮어씀!
```

---

## 수정 전략

### 핵심 원칙
**groupsData effect가 그룹 로딩을 전담하고, page transition effect는 저장만 담당**

### 변경 사항

| 항목 | 현재 | 수정 후 |
|------|------|---------|
| `setLocalGroups([])` | page transition effect에서 호출 | 제거 |
| 그룹 초기화 | page transition effect | groupsData effect (조건부) |
| 저장 로직 | page transition effect | 유지 (변경 없음) |

---

## 단계별 계획

### Step 1: setLocalGroups([]) 제거
- [ ] 파일: `frontend/src/pages/PageViewer.tsx`
- [ ] 위치: 라인 291
- [ ] 내용: `setLocalGroups([]);` 라인 삭제
- [ ] 주석 업데이트: Phase 52 수정 내용 기록

### Step 2: groupsData effect 보완
- [ ] 조건 실패 시 빈 배열 설정 로직 추가 (새 페이지 방문 시)
- [ ] 캐시된 페이지 복귀 시 올바른 데이터 설정 유지

### Step 3: 디버깅 로그 정리
- [ ] Phase 51 디버깅 로그를 logger.debug로 변환
- [ ] console.log 호출 제거 또는 조건부 실행

### Step 4: 테스트
- [ ] 기본 시나리오: 페이지 9 → 17 → 9 (7개 그룹 유지)
- [ ] 새 페이지 방문: 캐시 없는 페이지 → 0개로 시작
- [ ] 빠른 전환: 9 → 10 → 11 → 9 빠르게 이동
- [ ] 저장 확인: 페이지 전환 시 이전 그룹 저장됨

---

## 상세 코드 변경

### 변경 1: page transition effect (라인 284-293)

**현재 코드:**
```typescript
// 새 페이지 초기화
console.log('[DEBUG-51] 🔄 Resetting page state:', {
  currentPage,
  settingLocalGroupsTo: '[]',
  settingIsInitialLoadTo: true,
});
setSelectedBlocks([]);
setLocalGroups([]);  // ← 삭제 대상
isInitialLoadRef.current = true;
```

**수정 후:**
```typescript
// Phase 52: 페이지 전환 시 선택만 초기화
// localGroups는 groupsData effect에서 처리 (덮어쓰기 버그 방지)
setSelectedBlocks([]);
isInitialLoadRef.current = true;
logger.debug('PageViewer', `Page ${currentPage} ready for data...`);
```

### 변경 2: groupsData effect (라인 220-242)

**현재 코드:**
```typescript
useEffect(() => {
  // Phase 51: 디버깅
  console.log('[DEBUG-51] groupsData effect triggered:', {...});

  if (groupsData && groupsData.page_index === currentPage) {
    console.log('[DEBUG-51] ✅ Condition PASSED');
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
  } else {
    console.log('[DEBUG-51] ❌ Condition FAILED');
  }
}, [groupsData, currentPage]);
```

**수정 후:**
```typescript
useEffect(() => {
  // Phase 52: groupsData 동기화 - 그룹 로딩의 단일 책임점
  if (groupsData && groupsData.page_index === currentPage) {
    // 캐시된 페이지 복귀 또는 새 데이터 로드 완료
    setLocalGroups(groupsData.groups || []);
    isInitialLoadRef.current = false;
    logger.debug('PageViewer', `Loaded ${groupsData.groups?.length || 0} groups for page ${currentPage}`);
  } else if (!groupsData && isInitialLoadRef.current) {
    // 새 페이지로 이동 중 (데이터 로딩 전)
    // localGroups 유지 - 이전 페이지 데이터가 잠시 보일 수 있지만
    // Phase 49 조건으로 인해 적용되지 않음
    logger.debug('PageViewer', `Waiting for data for page ${currentPage}...`);
  }
}, [groupsData, currentPage]);
```

---

## 위험 분석

### 잠재적 부작용

| 시나리오 | 위험 | 대응 |
|---------|------|------|
| 이전 페이지 그룹이 잠시 표시 | 낮음 | Phase 49 조건으로 차단됨 |
| 새 페이지에서 그룹 유지 | 없음 | groupsData가 다른 page_index이므로 조건 실패 |
| 저장 시 잘못된 데이터 | 없음 | localGroupsRef는 저장 전 업데이트됨 |

### 롤백 계획

문제 발생 시 `setLocalGroups([]);` 라인 복원:
```typescript
setSelectedBlocks([]);
setLocalGroups([]);  // 롤백 시 복원
isInitialLoadRef.current = true;
```

---

## 완료 기준

- [ ] 페이지 9 → 17 → 9 이동 시 7개 그룹 유지
- [ ] 새 페이지 방문 시 0개로 시작
- [ ] 페이지 전환 시 이전 그룹 정상 저장
- [ ] 콘솔에 에러 없음
- [ ] 빌드 성공

---

## 추가 개선 (선택)

### 디버깅 로그 정리 (Step 3)

Phase 51에서 추가한 console.log를 조건부 실행으로 변경:

```typescript
// 개발 모드에서만 상세 로그
if (import.meta.env.DEV) {
  console.log('[DEBUG] ...');
}
```

또는 완전히 제거하고 logger.debug만 유지.

---

**"진행해줘"로 수정을 시작합니다.**
