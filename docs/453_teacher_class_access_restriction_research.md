# 강사용 수업/기록 페이지 본인 반 열람 제한 연구리포트

## 1. 현황 분석

### 1.1 문제 정의
강사(정승원 등)가 수업 페이지(`ClassesPage`)와 기록 페이지(`RecordsPage`)에서 **다른 강사의 반**까지 열람할 수 있는 상태.

- 정승원: 정규1반(화/목 부담임), 정규3반(월/수/금 부담임), 정규4반(화/목 부담임) 담당
- 현재 문제: 이한솔 담당 반(정규2반)도 수업/기록 페이지에서 보임

### 1.2 현재 코드 분석

#### ClassesPage.tsx (라인 264)
```typescript
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({ status: 'active' });
```
- **문제**: `teacherId` 파라미터 없이 전체 활성 반 조회
- `useClasses({ status: 'active' })`는 모든 활성 반을 반환

#### RecordsPage.tsx (라인 220)
```typescript
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({ status: 'active' });
```
- **동일 문제**: `teacherId` 없이 전체 반 조회

#### BackofficeDemo.tsx (라인 259-262) - 올바른 예시
```typescript
const { data: classesData, isLoading: classesLoading, error: classesError } = useClasses({
  status: 'active',
  teacherId: isTeacherMode ? teacherId : undefined,
});
```
- **올바르게 구현됨**: `isTeacherMode`일 때 `teacherId` 전달
- 이로 인해 본인 담당 반만 조회됨

---

## 2. 원인 분석

### 2.1 useClasses 훅 분석
```typescript
export function useClasses(options?: {
  status?: 'active' | 'inactive';
  isActive?: boolean;
  teacherId?: string;  // 이 옵션이 핵심
}) {
  // ...
  // Stage 35: 담당 강사 필터 - 주담임, 부담임, 담임 모두 포함
  if (options?.teacherId) {
    query = query.or(`teacher_id.eq.${options.teacherId},assistant_teacher_id.eq.${options.teacherId},homeroom_teacher_id.eq.${options.teacherId}`);
  }
}
```

- `teacherId`가 전달되면 해당 강사가 담당하는 반만 필터링
- `teacherId`가 없으면 **전체 반** 반환

### 2.2 문제 페이지
| 페이지 | 파일 | teacherId 전달 | 현재 상태 |
|--------|------|----------------|-----------|
| 대시보드 | BackofficeDemo.tsx | O | **정상** |
| 수업 | ClassesPage.tsx | X | **버그** |
| 기록 | RecordsPage.tsx | X | **버그** |
| 학생 | StudentsPage.tsx | 확인 필요 | 확인 필요 |

---

## 3. 해결 방안

### 3.1 수정 대상 파일

#### A. ClassesPage.tsx
**현재 코드 (라인 264):**
```typescript
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({ status: 'active' });
```

**수정 코드:**
```typescript
// 로그인된 강사 ID 가져오기
const { user, profile } = useAuth();
const teacherId = profile?.id || null;

// 본인 담당 반만 조회
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({
  status: 'active',
  teacherId: teacherId || undefined,
});
```

#### B. RecordsPage.tsx
**현재 코드 (라인 220):**
```typescript
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({ status: 'active' });
```

**수정 코드:**
```typescript
// 로그인된 강사 ID 가져오기
const { user, profile } = useAuth();
const teacherId = profile?.id || null;

// 본인 담당 반만 조회
const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({
  status: 'active',
  teacherId: teacherId || undefined,
});
```

### 3.2 관리자 모드 고려사항

현재 두 페이지는 `/backoffice/` 경로에 있어 **강사 전용** 페이지입니다.
- 강사: 본인 반만 표시 (teacherId 필터)
- 관리자용 페이지는 `/admin/` 경로에 별도 존재

따라서 `ClassesPage`와 `RecordsPage`에서는 **항상 teacherId 필터 적용**이 적절합니다.

---

## 4. 추가 확인 필요 사항

### 4.1 StudentsPage.tsx 확인
학생 페이지도 동일한 패턴인지 확인 필요.

### 4.2 세션 데이터 (ClassesPage)
`useClassSessions` 훅은 `classId`를 기반으로 조회하므로, 반 목록이 올바르게 필터링되면 세션도 자동으로 필터링됨.

### 4.3 출결/진도/숙제/성적 탭 (RecordsPage)
각 탭의 데이터 훅이 `classId` 또는 `teacherId` 기반인지 확인:
- `useAttendanceByDate`: teacherId 사용 (현재 MOCK_TEACHER_ID 하드코딩됨 - 수정 필요)
- 기타 탭: Mock 데이터 사용 중

---

## 5. 수정 계획

### Phase 1: 핵심 필터링 적용
1. `ClassesPage.tsx`: `useClasses`에 `teacherId` 추가
2. `RecordsPage.tsx`: `useClasses`에 `teacherId` 추가

### Phase 2: 출결 탭 수정
1. `RecordsPage.tsx` 내 `MOCK_TEACHER_ID` → 실제 `profile.id`로 교체

### Phase 3: 검증
1. 정승원 로그인 → 수업 페이지 → 정규1반/3반/4반만 표시
2. 정승원 로그인 → 기록 페이지 → 정규1반/3반/4반만 표시
3. 이한솔 로그인 → 수업 페이지 → 정규2반만 표시

---

## 6. 영향 범위

| 항목 | 영향 |
|------|------|
| 수업 페이지 | 본인 반만 표시됨 |
| 기록 페이지 | 본인 반만 표시됨 |
| 반 선택 바텀시트 | 본인 반만 목록에 표시 |
| 기록 탭 (출결/진도/숙제/성적) | 본인 반 데이터만 표시 |

---

## 7. 구현 복잡도

| 항목 | 복잡도 | 이유 |
|------|--------|------|
| ClassesPage 수정 | **낮음** | useAuth 추가 + teacherId 파라미터만 추가 |
| RecordsPage 수정 | **낮음** | 동일 |
| 출결 탭 teacherId 수정 | **낮음** | MOCK_TEACHER_ID → profile.id |

**예상 작업 시간**: 15분

---

## 8. 결론

- **문제**: `ClassesPage`, `RecordsPage`에서 `useClasses` 호출 시 `teacherId` 미전달
- **원인**: `BackofficeDemo.tsx` 패턴을 따르지 않음
- **해결**: 두 페이지에 `useAuth` 훅으로 `teacherId` 가져와서 `useClasses`에 전달
- **복잡도**: 낮음 (기존 패턴 적용)

---

*작성일: 2025-12-30*
*작성: Claude Code*
