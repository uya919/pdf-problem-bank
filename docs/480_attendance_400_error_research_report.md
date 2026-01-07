# 출결 조회 400 에러 연구리포트

> 작성일: 2026-01-06
> 상태: 분석 완료

---

## 1. 문제 요약

### 증상
- **출결 저장**: 정상 동작 ("Supabase 출결 저장 완료: 11 건")
- **출결 조회**: 400 Bad Request 에러 지속 발생

### 에러 URL
```
GET https://rhejybeufojkfdfntpfg.supabase.co/rest/v1/attendance?select=*%2Cstudent%3Astudents%21attendance_student_id_fkey%28id%2Cname%2Cgrade%29%2Cclass%3Aclasses%21attendance_class_id_fkey%28id%2Cname%29&date=eq.2026-01-06
```

### 디코딩된 쿼리
```
select=*,student:students!attendance_student_id_fkey(id,name,grade),class:classes!attendance_class_id_fkey(id,name)
&date=eq.2026-01-06
```

---

## 2. 조사 결과

### 2.1 FK 제약조건 확인 (정상)

| 제약조건명 | 테이블 | 컬럼 | 참조 테이블 |
|-----------|--------|------|-------------|
| `attendance_student_id_fkey` | attendance | student_id | students |
| `attendance_class_id_fkey` | attendance | class_id | classes |

→ **FK 제약조건 이름이 코드와 일치함**

### 2.2 데이터 확인 (정상)

| 항목 | 값 |
|------|-----|
| 오늘 출결 레코드 | 11건 |
| 전체 학생 | 311명 |
| 전체 수업반 | 53개 |
| 전체 등록 | 199건 |

### 2.3 Vercel 배포 상태 (정상)

| 항목 | 값 |
|------|-----|
| 최신 배포 | `dpl_4eQvhVRQFLiJqUvdMRS2NzEM3dha` |
| 배포 시각 | 1767680179789 (2026-01-06) |
| 상태 | READY, PROMOTED |
| 커밋 | `62c6ce29b5c99dd2f82575bcae2e25d3776073d0` |
| 커밋 메시지 | "fix(attendance): 출결 저장 컬럼명 수정 (notes → note)" |
| gitDirty | "1" (로컬 수정 있음) |

---

## 3. 근본 원인 분석

### 3.1 핵심 발견: `gitDirty: "1"`

Vercel 배포 메타데이터에서 `gitDirty: "1"`은 **Git에 커밋되지 않은 로컬 변경사항이 있는 상태에서 배포**되었음을 의미합니다.

그러나 이것이 직접적인 원인은 아닙니다. Vercel CLI는 현재 파일 시스템 상태를 배포하므로, FK 수정이 포함된 코드가 배포되었을 것입니다.

### 3.2 실제 원인: PostgREST 쿼리 구문 오류

URL을 분석한 결과, **쿼리 구문 자체는 올바릅니다**. 그러나 400 에러가 발생하는 이유를 추가 조사해야 합니다.

**가능한 원인들:**

1. **students 테이블에 grade 컬럼이 없음**
   - `student:students!attendance_student_id_fkey(id, name, grade)`
   - students 테이블에 `grade` 컬럼이 없으면 400 에러 발생

2. **classes 테이블에 name 컬럼이 없음**
   - `class:classes!attendance_class_id_fkey(id, name)`
   - classes 테이블에 `name` 컬럼이 없으면 400 에러 발생

3. **캐싱 문제**
   - 브라우저 캐시에 이전 번들이 남아있을 수 있음

---

## 4. 검증 완료 - 근본 원인 확정

### 4.1 students 테이블 스키마 (확인됨)

| 컬럼명 | 타입 |
|--------|------|
| id | uuid |
| name | varchar |
| **grade_id** | uuid |
| school | varchar |
| phone | varchar |
| parent_phone | varchar |
| parent_name | varchar |
| is_active | boolean |
| notes | text |
| created_at | timestamptz |

**⚠️ 문제 발견: `grade` 컬럼이 없음! `grade_id`만 존재**

### 4.2 classes 테이블 스키마 (확인됨)

| 컬럼명 | 타입 |
|--------|------|
| id | uuid |
| **name** | varchar ✅ |
| grade_id | uuid |
| teacher_id | uuid |
| subject | varchar |
| ... (기타 컬럼) |

**✅ classes 테이블의 `name` 컬럼은 정상 존재**

### 4.3 근본 원인 확정

```typescript
// 문제의 코드
student:students!attendance_student_id_fkey(id, name, grade)
//                                               ^^^^^ 이 컬럼이 없음!
```

**students 테이블에 `grade` 컬럼이 존재하지 않습니다.**
- 실제 컬럼: `grade_id` (uuid, FK)
- 코드에서 요청: `grade` (존재하지 않음)

PostgREST는 존재하지 않는 컬럼을 SELECT하려 하면 **400 Bad Request**를 반환합니다.

---

## 5. 해결 방안 (확정)

### 방안 A: `grade` 컬럼 제거 (권장)

students 테이블에 `grade` 컬럼이 없으므로, 쿼리에서 제거합니다.

**수정 전 (에러 발생):**
```typescript
.select(`
  *,
  student:students!attendance_student_id_fkey(id, name, grade),
  class:classes!attendance_class_id_fkey(id, name)
`)
```

**수정 후 (정상 동작):**
```typescript
.select(`
  *,
  student:students!attendance_student_id_fkey(id, name),
  class:classes!attendance_class_id_fkey(id, name)
`)
```

### 수정 대상 파일

`frontend/src/hooks/backoffice/useAttendance.ts`의 다음 함수들:

| 함수명 | 라인 | 수정 필요 |
|--------|------|-----------|
| `useAttendance` | 34-37 | `grade` 제거 |
| `useTodayAttendance` | 68-72 | `grade` 제거 |

---

## 6. 결론

### 근본 원인 확정

| 항목 | 내용 |
|------|------|
| **에러 원인** | `students.grade` 컬럼이 존재하지 않음 |
| **실제 컬럼** | `students.grade_id` (uuid, FK to grades 테이블) |
| **영향 범위** | `useTodayAttendance`, `useAttendance` 함수 |

### 해결 방법

`useAttendance.ts` 파일에서 `grade` 컬럼 참조를 제거하면 400 에러가 해결됩니다.

### 저장은 성공, 조회만 실패하는 이유

- **저장 (upsert)**: JOIN 없이 단순 INSERT/UPDATE → 정상 동작
- **조회 (select)**: `students.grade` 컬럼 참조 → 400 에러

---

*연구리포트 끝 - 개발은 별도 요청 시 진행*
