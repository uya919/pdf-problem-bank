# 강사 테이블 통합 연구리포트

**문서 번호**: 405
**작성일**: 2025-12-20
**요청**: teachers 테이블(목업)과 profiles 테이블(실제 사용자) 통합

---

## 1. 문제 정의

### 1.1 현재 상황

시스템에 **강사 데이터가 두 곳에 분리**되어 있음:

| 테이블 | 용도 | 데이터 |
|--------|------|--------|
| `teachers` | 목업/레거시 | 김수학, 박영어, 이대수, 정과학, 최국어, 원장님 |
| `profiles` | 실제 Auth 사용자 | 김소원, 서희주, 이한솔, 최샤론, 원장 |

### 1.2 발생하는 문제

```
사용자관리에서 "김소원" 등록 (profiles 테이블에 저장)
       ↓
반 관리에서 강사 선택 시 "김수학" 등 목업만 표시
       ↓
"김소원" 선택 불가능 → 원하는 강사 배정 불가
```

**근본 원인**: `classes.teacher_id` FK가 `teachers` 테이블을 참조

```sql
-- 현재 FK 구조
classes.teacher_id → teachers.id (FK)

-- profiles.id와 teachers.id는 완전히 다른 UUID
```

---

## 2. 현재 데이터 상태

### 2.1 teachers 테이블 (목업)

| id | name | subject | is_active |
|----|------|---------|-----------|
| ea271210-... | 김수학 | math | true |
| 31727a85-... | 박영어 | english | true |
| 621814e2-... | 원장님 | null | true |
| 472f3425-... | 이대수 | math | true |
| 5fb7116b-... | 정과학 | science | true |
| 0eae318a-... | 최국어 | korean | true |

### 2.2 profiles 테이블 (실제 사용자)

| id | name | role | subject | is_active |
|----|------|------|---------|-----------|
| dde48d24-... | 원장 | owner | null | true |
| 19a781dc-... | 김소원 | teacher | null | true |
| 883702cf-... | 서희주 | teacher | null | true |
| e8a5c1bd-... | 이한솔 | teacher | null | true |
| 0bdab595-... | 최샤론 | teacher | null | true |

### 2.3 현재 반-강사 연결 상태

```sql
SELECT c.name, c.teacher_id FROM classes WHERE teacher_id IS NOT NULL;
-- 결과: 0건 (현재 반에 강사 배정 안됨)
```

---

## 3. 테이블 스키마 비교

### 3.1 teachers 테이블

```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  subject VARCHAR,           -- 'math', 'english', etc.
  role VARCHAR DEFAULT 'teacher',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 profiles 테이블

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,       -- auth.users(id) 참조
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',  -- 'owner', 'admin', 'teacher'
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subject TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 핵심 차이점

| 항목 | teachers | profiles |
|------|----------|----------|
| **ID 생성** | 자동 생성 (gen_random_uuid) | Auth에서 가져옴 |
| **인증 연동** | 없음 (목업) | Supabase Auth 연동 |
| **역할 구분** | 모두 teacher | owner/admin/teacher |
| **email** | 선택적 | 필수 |

---

## 4. 해결 방안 분석

### 4.1 방안 A: FK 대상 변경 (profiles 테이블 사용)

```sql
-- 1. 기존 FK 삭제
ALTER TABLE classes DROP CONSTRAINT classes_teacher_id_fkey;

-- 2. 새 FK 생성 (profiles 참조)
ALTER TABLE classes
ADD CONSTRAINT classes_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES profiles(id);

-- 3. teachers 테이블은 유지하되 사용 안함 (나중에 삭제)
```

**장점**:
- Auth 연동된 실제 사용자만 강사로 배정 가능
- 로그인/권한 시스템과 일관성
- 코드 변경 최소화 (API만 수정)

**단점**:
- 기존 teachers 데이터 마이그레이션 필요 (현재 0건이라 문제 없음)
- profiles에 teacher가 아닌 역할도 있음 (필터 필요)

### 4.2 방안 B: teachers 테이블에 profiles 동기화

```sql
-- profiles의 teacher를 teachers 테이블로 복사
INSERT INTO teachers (id, name, email, phone, subject, is_active)
SELECT id, name, email, phone, subject, is_active
FROM profiles
WHERE role = 'teacher';
```

**장점**:
- FK 변경 불필요
- 기존 코드 유지

**단점**:
- 데이터 이중 관리 (동기화 문제)
- 사용자 추가할 때마다 teachers에도 추가해야 함
- 장기적으로 유지보수 부담

### 4.3 방안 C: teachers 테이블 완전 폐기 + View 사용

```sql
-- 1. teachers 테이블 백업 후 삭제
DROP TABLE teachers;

-- 2. View 생성 (하위 호환성)
CREATE VIEW teachers AS
SELECT id, name, email, phone, subject, is_active, created_at
FROM profiles
WHERE role IN ('teacher', 'owner', 'admin');

-- 3. FK는 profiles로 변경
```

**장점**:
- 단일 데이터 소스
- 하위 호환성 유지 (View로)
- 가장 깔끔한 아키텍처

**단점**:
- View에 INSERT 불가 (INSTEAD OF 트리거 필요)
- 마이그레이션 복잡도

---

## 5. 권장 방안: A (FK 대상 변경)

### 5.1 선택 이유

1. **현재 classes.teacher_id 연결이 0건** → 마이그레이션 부담 없음
2. **teachers 테이블 목업 데이터** → 삭제해도 무방
3. **코드 변경 최소화** → API 쿼리만 수정
4. **Auth 시스템과 일관성** → 로그인한 사용자만 강사 가능

### 5.2 구현 단계

#### Phase 1: DB 마이그레이션

```sql
-- 1. 기존 FK 삭제
ALTER TABLE classes DROP CONSTRAINT classes_teacher_id_fkey;

-- 2. 새 FK 생성 (profiles 참조)
ALTER TABLE classes
ADD CONSTRAINT classes_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES profiles(id);

-- 3. teachers 테이블 비활성화 (삭제는 나중에)
-- DROP TABLE teachers; -- 확인 후 실행
```

#### Phase 2: 프론트엔드 수정

```typescript
// api/classes.ts - getTeachers() 수정
export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, subject, is_active')
    .in('role', ['teacher', 'admin', 'owner'])  // 모든 강사 역할
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}
```

#### Phase 3: 기존 목업 데이터 정리

```sql
-- teachers 테이블 데이터 삭제 (선택적)
DELETE FROM teachers;

-- 또는 테이블 자체 삭제
DROP TABLE teachers;
```

---

## 6. 영향 분석

### 6.1 영향 받는 코드

| 파일 | 변경 내용 |
|------|----------|
| `api/classes.ts` | getTeachers() - profiles 조회로 변경 |
| `components/admin/classes/*.tsx` | 변경 없음 (API만 수정) |
| `hooks/useClasses.ts` | 변경 없음 |
| DB 마이그레이션 | FK 제약조건 변경 |

### 6.2 영향 받지 않는 기능

- 반 목록 조회 (teachers 조인 → profiles 조인)
- 학생 관리
- 출결/진도/숙제 기능
- 순환수업

### 6.3 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| FK 변경 실패 | 낮음 | 높음 | 트랜잭션 + 롤백 준비 |
| 조인 쿼리 깨짐 | 중간 | 중간 | classes 조회 시 profiles 조인 확인 |
| View 성능 저하 | 낮음 | 낮음 | 인덱스 확인 |

---

## 7. 상세 개발 계획

### Phase 1: DB 마이그레이션 (5분)

```sql
-- 마이그레이션 스크립트
BEGIN;

-- Step 1: 기존 FK 삭제
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

-- Step 2: 새 FK 생성 (profiles 참조)
ALTER TABLE classes
ADD CONSTRAINT classes_teacher_id_fkey
FOREIGN KEY (teacher_id) REFERENCES profiles(id)
ON DELETE SET NULL;

-- Step 3: 검증
SELECT
  tc.constraint_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'classes'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'classes_teacher_id_fkey';

COMMIT;
```

### Phase 2: 프론트엔드 수정 (2분)

```typescript
// api/classes.ts
export async function getTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, subject, is_active')
    .in('role', ['teacher', 'admin', 'owner'])
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}
```

### Phase 3: 조인 쿼리 수정 (3분)

```typescript
// api/classes.ts - getClasses() 수정
export async function getClasses(filters?: ClassFilters): Promise<ClassData[]> {
  let query = supabase
    .from('classes')
    .select(`
      *,
      grades(id, name),
      teachers:profiles(id, name),   // ← teachers → profiles 변경
      subjects(id, name, code, color)
    `)
    .order('name');
  // ...
}
```

### Phase 4: 목업 데이터 정리 (2분)

```sql
-- teachers 테이블 비활성화 또는 삭제
TRUNCATE TABLE teachers;
-- 또는
DROP TABLE teachers;
```

### Phase 5: 빌드 및 테스트 (3분)

1. 빌드 테스트
2. 반 관리 페이지에서 강사 드롭다운 확인
3. 김소원, 서희주 등 실제 사용자 표시 확인
4. 반 생성/수정 시 강사 배정 테스트

---

## 8. 예상 결과

### 8.1 Before (현재)

```
강사 드롭다운: 김수학, 박영어, 이대수, 정과학, 최국어, 원장님
→ 모두 목업 데이터 (로그인 불가)
```

### 8.2 After (수정 후)

```
강사 드롭다운: 김소원, 서희주, 이한솔, 최샤론, 원장
→ 실제 등록된 사용자 (로그인 가능)
```

---

## 9. 결론

| 항목 | 내용 |
|------|------|
| **문제** | teachers(목업)와 profiles(실제) 테이블 분리 |
| **해결** | FK를 profiles로 변경 + getTeachers() 수정 |
| **난이도** | 낮음 (현재 연결 데이터 0건) |
| **예상 시간** | 15분 |
| **리스크** | 낮음 |

---

## 10. 체크리스트

개발 진행 시 확인 사항:

- [ ] Phase 1: FK 제약조건 변경 (classes → profiles)
- [ ] Phase 2: getTeachers() 함수 수정
- [ ] Phase 3: getClasses() 조인 쿼리 수정
- [ ] Phase 4: teachers 테이블 정리 (선택적)
- [ ] Phase 5: 빌드 테스트
- [ ] Phase 6: 기능 테스트 (반 생성 → 강사 배정)

---

*연구리포트 작성 완료. 개발 진행은 사용자 요청 시 수행.*
