# 475. StudentsPage Supabase 에러 분석 리포트

> 작성일: 2026-01-05

---

## 1. 문제 상황

로그인 후 `/backoffice/students` 페이지 접속 시 다음 에러 발생:

```
[useMyStudents] 로그인 필요
[useMyStudents] 반 조회 에러: Object
[useMyStudents] 쿼리 실패: Object
```

**Supabase 에러 응답:**
```
GET /rest/v1/classes?select=id%2Cname%2Csubject&or=(teacher_id.eq.efc677cb-aeef-4721-92cf-a5cd1b4d858f,assistant_teacher_id.eq.efc677cb-aeef-4721-92cf-a5cd1b4d858f,homeroom_teacher_id.eq.efc677cb-aeef-4721-92cf-a5cd1b4d858f)&status=eq.active
→ 400 Bad Request
```

---

## 2. 문제 원인 분석

### 2.1 핵심 문제: `status` 컬럼 불일치

**현재 코드 (useMyStudents.ts:159):**
```typescript
.eq('status', 'active')
```

**실제 classes 테이블 스키마 (database.ts:118):**
```typescript
export interface Class {
  // ...
  is_active: boolean;       // ← Phase 7에서 추가된 필드
  status: ClassStatus;      // ClassStatus = 'active' | 'inactive'
  // ...
}
```

**문제점:**
- `status` 컬럼은 존재하지만, 실제 Supabase 테이블에서 해당 컬럼명이 다를 수 있음
- 또는 RLS(Row Level Security) 정책으로 인해 접근 거부

### 2.2 추가 문제: 인증 타이밍 이슈

**로그 순서 분석:**
```
1. Auth state changed: SIGNED_IN                    ← 로그인 성공
2. 프로필 조회 성공: Object                          ← 프로필 로드 완료
3. [useMyStudents] 로그인 필요                       ← ??? 왜 로그인 필요?
4. classes 조회 → 400 에러                          ← 쿼리 실행됨
```

**원인:**
- `useAuth()`의 `user`가 `null`로 평가되는 순간이 있음
- React Query가 먼저 실행되고, 그 후에 Auth 상태가 업데이트됨
- 두 번의 쿼리가 실행됨: 첫 번째는 `teacherId=undefined`, 두 번째는 정상 ID

### 2.3 RLS 정책 가능성

Supabase에서 400 에러가 발생하는 경우:
1. **컬럼명 오류**: 존재하지 않는 컬럼 참조
2. **RLS 정책 위반**: 해당 사용자가 테이블에 접근할 권한 없음
3. **쿼리 문법 오류**: `or()` 구문 문제

---

## 3. 콘솔 로그 상세 분석

### 3.1 정상 플로우
```
Auth state changed: INITIAL_SESSION
Auth state changed: SIGNED_IN
프로필 조회 시작: efc677cb-aeef-4721-92cf-a5cd1b4d858f
프로필 조회 성공: Object
```
→ 인증은 정상적으로 완료됨

### 3.2 문제 플로우
```
[useMyStudents] 로그인 필요
```
→ `teacherId`가 `undefined`로 평가됨
→ `useAuth()`의 `user`가 아직 `null` 상태

```
classes?select=...&status=eq.active → 400 에러
```
→ 하지만 쿼리는 실행됨 (두 번째 시도에서 teacherId가 있었음)
→ 400 에러는 **쿼리 자체의 문제**

---

## 4. 해결 방안

### 4.1 즉시 수정 필요 (우선순위 높음)

#### A. classes 테이블 쿼리 수정

**현재 코드:**
```typescript
.eq('status', 'active')
```

**수정 방안 1: is_active 사용**
```typescript
.eq('is_active', true)
```

**수정 방안 2: status 확인 후 조건부 적용**
```typescript
// status가 있으면 사용, 없으면 is_active 사용
.or('status.eq.active,is_active.eq.true')
```

#### B. class_enrollments 테이블 쿼리 수정

**현재 코드 (line 181):**
```typescript
.eq('status', 'active')
```

**실제 스키마:**
```typescript
export interface ClassEnrollment {
  status: EnrollmentStatus;  // 'active' | 'completed' | 'dropped'
}
```
→ 이 부분은 정상일 수 있음 (EnrollmentStatus에 'active' 존재)

### 4.2 인증 타이밍 문제 해결

**현재 코드:**
```typescript
export function useMyStudents(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const teacherId = user?.id;

  return useQuery({
    queryKey: ['my-students', teacherId],
    queryFn: async () => { ... },
    enabled: options?.enabled !== false,  // ← teacherId 체크 없음!
  });
}
```

**수정:**
```typescript
return useQuery({
  queryKey: ['my-students', teacherId],
  queryFn: async () => { ... },
  enabled: options?.enabled !== false && !!teacherId,  // ← teacherId 있을 때만 실행
});
```

---

## 5. 실제 테이블 스키마 확인 필요

Supabase MCP로 확인해야 할 사항:

```sql
-- 1. classes 테이블 실제 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'classes';

-- 2. 현재 로그인한 사용자로 classes 조회 가능 여부
SELECT id, name, status, is_active, teacher_id
FROM classes
LIMIT 5;

-- 3. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'classes';
```

---

## 6. 권장 수정 사항

### Phase 1: 즉시 수정 (5분)

```typescript
// useMyStudents.ts

// 1. enabled 조건에 teacherId 추가
enabled: options?.enabled !== false && !!teacherId,

// 2. classes 쿼리에서 status 대신 is_active 사용 (또는 둘 다 확인)
const { data: myClasses, error: classError } = await supabase
  .from('classes')
  .select('id, name, subject')
  .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
  .eq('is_active', true);  // ← status → is_active 변경
```

### Phase 2: 테이블 스키마 확인 후 결정

Supabase에서 실제 `classes` 테이블의 컬럼을 확인하고:
- `status` 컬럼이 있으면 그대로 유지
- `is_active`만 있으면 변경
- 둘 다 있으면 `is_active` 사용 권장 (boolean이 더 명확)

---

## 7. 추가 발견 사항

### 7.1 attendance 쿼리도 400 에러

```
attendance?select=*...&date=eq.2026-01-05 → 400 에러
```

이 쿼리는 다른 페이지(대시보드)에서 발생한 것으로 보임.
별도 조사 필요.

### 7.2 "[useMyStudents] 로그인 필요" 메시지

이 메시지가 나온 후 바로 쿼리가 실행되는 것은:
1. 첫 번째 렌더: `teacherId = undefined` → "로그인 필요" 로그 → 빈 배열 반환
2. 두 번째 렌더: `teacherId = 실제ID` → 쿼리 실행 → 400 에러

두 번 실행되는 이유: `enabled: true`가 기본값이므로 teacherId 없이도 쿼리 실행됨

---

## 8. 결론

| 문제 | 원인 | 해결책 |
|------|------|--------|
| 400 에러 | `status` vs `is_active` 컬럼 불일치 | `is_active` 로 변경 |
| 두 번 실행 | `enabled`에 `teacherId` 체크 없음 | `enabled: !!teacherId` 추가 |
| 로그인 필요 메시지 | Auth 상태 비동기 업데이트 | 위 수정으로 해결 |

**다음 단계:**
1. Supabase에서 실제 테이블 스키마 확인
2. 위 수정 사항 적용
3. 빌드 및 배포

---

*작성: Claude Code*
