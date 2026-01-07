# 476. class_enrollments 테이블 404 에러 분석 리포트

> 작성일: 2026-01-05

---

## 1. 문제 상황

`/backoffice/students` 페이지에서 학생 목록 조회 실패.

**에러 로그:**
```
[useMyStudents] 담당 반: 5 개
GET class_enrollments?select=student_id,class_id&class_id=in.(...) → 404 Not Found
[useMyStudents] 등록 조회 에러: Object
[useMyStudents] 쿼리 실패: Object
```

---

## 2. 에러 분석

### 2.1 HTTP 404 의미

| 상태 코드 | 의미 |
|-----------|------|
| 400 | Bad Request - 쿼리 문법 오류, 컬럼 없음 |
| **404** | **Not Found - 테이블 자체가 존재하지 않음** |
| 401/403 | 인증/권한 문제 |

**핵심 발견:** `class_enrollments` 테이블이 Supabase에 **존재하지 않음**

### 2.2 이전 에러와의 차이

| 이전 에러 | 현재 에러 |
|-----------|-----------|
| `classes.status` 컬럼 없음 (400) | `class_enrollments` 테이블 없음 (404) |
| 컬럼명 불일치 | 테이블명 불일치 또는 테이블 미생성 |

---

## 3. 가능한 원인

### 3.1 테이블명이 다름

실제 Supabase 테이블명이 다를 수 있음:

| 코드에서 사용 | 가능한 실제 테이블명 |
|---------------|---------------------|
| `class_enrollments` | `enrollments` |
| `class_enrollments` | `student_classes` |
| `class_enrollments` | `class_students` |
| `class_enrollments` | `student_enrollments` |

### 3.2 테이블이 생성되지 않음

- Supabase 마이그레이션에서 `class_enrollments` 테이블이 누락됨
- 다른 스키마(예: `hyeyum`)에 있을 수 있음

### 3.3 RLS 정책으로 인한 접근 거부

- 테이블은 존재하지만 RLS 정책으로 완전 차단되어 404 반환
- (일반적으로는 403이나, 설정에 따라 404 가능)

---

## 4. 현재 코드 흐름

```
useMyStudents()
│
├─ Step 1: classes 조회 ✅ 성공 (5개 반)
│   └─ .eq('is_active', true)
│
├─ Step 2: class_enrollments 조회 ❌ 404 에러
│   └─ .in('class_id', classIds)
│
└─ Step 3: students 조회 (실행 안됨)
```

---

## 5. 확인 필요 사항

### 5.1 Supabase에서 확인

```sql
-- 1. 전체 테이블 목록 조회
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. 'enroll' 포함된 테이블 검색
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%enroll%';

-- 3. 'class' 포함된 테이블 검색
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%class%';

-- 4. 'student' 관련 테이블 검색
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%student%';
```

### 5.2 Supabase 대시보드에서 확인

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (rhejybeufojkfdfntpfg)
3. Table Editor 메뉴
4. 테이블 목록에서 학생-반 연결 테이블 확인

---

## 6. 예상 해결 방안

### 방안 A: 테이블명 수정 (가장 가능성 높음)

실제 테이블명을 확인 후 코드 수정:

```typescript
// 현재 코드
.from('class_enrollments')

// 수정 예시 (실제 테이블명으로 변경)
.from('enrollments')  // 또는
.from('student_classes')  // 또는
.from('class_students')
```

### 방안 B: 테이블 생성 (테이블이 없는 경우)

```sql
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES students(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;

-- 읽기 정책
CREATE POLICY "Allow authenticated read" ON class_enrollments
  FOR SELECT TO authenticated USING (true);
```

### 방안 C: 다른 방식으로 학생-반 연결 조회

학생 테이블에 `class_id`가 직접 있는 경우:

```typescript
// class_enrollments 없이 직접 조회
const { data: students } = await supabase
  .from('students')
  .select('*, grade_info:grades(id, name)')
  .in('class_id', classIds)
  .eq('is_active', true);
```

---

## 7. 추가 발견: attendance 쿼리도 400 에러

```
attendance?select=*,student:students(id,name,grade),class:classes(id,name)&date=eq.2026-01-05
→ 400 Bad Request
```

이 에러는 대시보드 페이지에서 발생하며, 별도 조사 필요:
- `students` 테이블에 `grade` 컬럼이 없을 수 있음 (`grade_id` 사용)
- `attendance` 테이블 구조 확인 필요

---

## 8. 결론 및 다음 단계

| 우선순위 | 작업 |
|----------|------|
| 1 | Supabase 대시보드에서 실제 테이블 목록 확인 |
| 2 | 학생-반 연결 테이블의 실제 이름 파악 |
| 3 | `useMyStudents.ts` 코드에서 테이블명 수정 |
| 4 | (필요시) 테이블 생성 마이그레이션 실행 |

---

## 9. 참고: 현재 TypeScript 타입 정의

```typescript
// frontend/src/types/database.ts

/** 반 등록 */
export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
  enrolled_by: string | null;
  status: EnrollmentStatus;  // 'active' | 'completed' | 'dropped'
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

타입 정의는 존재하지만, 실제 Supabase 테이블이 없거나 이름이 다름.

---

*작성: Claude Code*
