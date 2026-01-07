# Stage 8-6~7: 강사-수업 연결 및 RLS 개발 계획

> 문서 번호: 395
> 작성일: 2025-12-19
> 상태: 계획 완료

---

## 1. 현재 상태 분석

### 1.1 테이블 구조

```
profiles (Auth 연동)          teachers (기존 hyeyum)
├── id (auth.users FK)        ├── id (독립 UUID)
├── name                      ├── name
├── email                     ├── email
├── role (teacher/admin/owner)├── subject
├── subject                   ├── role
├── phone                     ├── phone
└── is_active                 └── is_active

classes
├── id
├── teacher_id → teachers.id  ❌ profiles.id와 연결 안됨
├── name
└── subject
```

### 1.2 문제점

| 문제 | 설명 |
|------|------|
| **이중 강사 테이블** | `profiles` (Auth)와 `teachers` (기존) 분리됨 |
| **수업 연결 불가** | `classes.teacher_id`가 `teachers.id` 참조 (profiles 아님) |
| **강사 관리 중복** | OperationsPage(profiles) vs 기존 classes(teachers) |
| **RLS 적용 불가** | profiles 기반 RLS를 teachers 테이블에 적용 어려움 |

### 1.3 해결 방향

**Option A: profiles-teachers 매핑 테이블** (선택)
- `profile_teacher_mapping` 테이블 생성
- profiles.id ↔ teachers.id 연결
- 기존 구조 유지하면서 점진적 마이그레이션

**Option B: teachers 테이블 폐기**
- classes.teacher_id를 profiles.id로 변경
- 대규모 마이그레이션 필요 (리스크 높음)

---

## 2. Stage 8-6: 강사-수업 연결

### 목표
- profiles(Auth)와 teachers(기존) 연결
- 로그인한 강사가 자기 수업만 조회 가능

### Phase 8-6-A: 매핑 테이블 생성

**Supabase Migration**:
```sql
-- profile_teacher_mapping 테이블 생성
CREATE TABLE profile_teacher_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id),
  UNIQUE(teacher_id)
);

-- 인덱스
CREATE INDEX idx_ptm_profile_id ON profile_teacher_mapping(profile_id);
CREATE INDEX idx_ptm_teacher_id ON profile_teacher_mapping(teacher_id);

COMMENT ON TABLE profile_teacher_mapping IS 'Auth profiles와 기존 teachers 테이블 연결';
```

### Phase 8-6-B: 기존 데이터 매핑

**수동 매핑 시나리오**:
1. profiles 테이블의 teacher 조회
2. teachers 테이블에서 이메일/이름으로 매칭
3. mapping 테이블에 INSERT

**자동 매핑 스크립트**:
```sql
-- 이메일 기반 자동 매핑
INSERT INTO profile_teacher_mapping (profile_id, teacher_id)
SELECT p.id, t.id
FROM profiles p
JOIN teachers t ON LOWER(p.email) = LOWER(t.email)
WHERE p.role = 'teacher'
  AND NOT EXISTS (
    SELECT 1 FROM profile_teacher_mapping m WHERE m.profile_id = p.id
  );
```

### Phase 8-6-C: 강사 조회 RPC 함수

**Supabase Function**:
```sql
-- 로그인한 강사의 teacher_id 조회
CREATE OR REPLACE FUNCTION get_my_teacher_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  SELECT teacher_id INTO v_teacher_id
  FROM profile_teacher_mapping
  WHERE profile_id = auth.uid();

  RETURN v_teacher_id;
END;
$$;

-- 로그인한 강사의 수업 목록 조회
CREATE OR REPLACE FUNCTION get_my_classes()
RETURNS SETOF classes
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM classes c
  JOIN profile_teacher_mapping m ON c.teacher_id = m.teacher_id
  WHERE m.profile_id = auth.uid()
    AND c.is_active = true;
END;
$$;
```

### Phase 8-6-D: 프론트엔드 연결

**파일**: `frontend/src/hooks/useMyClasses.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useMyTeacherId() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myTeacherId', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_teacher_id');
      if (error) throw error;
      return data as string | null;
    },
    enabled: !!user,
  });
}

export function useMyClasses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['myClasses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_classes');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
```

### Phase 8-6-E: 강사 관리 UI 개선

**파일**: `frontend/src/pages/admin/OperationsPage.tsx`

변경사항:
1. 강사 추가 시 teachers 테이블에도 INSERT (또는 선택적 연결)
2. 기존 teachers와 연결 버튼 추가
3. 매핑 상태 표시 (연결됨/미연결)

```typescript
// 강사 추가 시
const handleAddTeacher = async (newTeacher) => {
  // 1. profiles에 INSERT (기존)
  const profileResult = await createTeacher(input);

  // 2. teachers 테이블에도 INSERT (선택)
  const { data: teacherData } = await supabase
    .from('teachers')
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
    })
    .select()
    .single();

  // 3. 매핑 테이블 INSERT
  await supabase
    .from('profile_teacher_mapping')
    .insert({
      profile_id: profileResult.id,
      teacher_id: teacherData.id,
    });
};
```

---

## 3. Stage 8-7: RLS 데이터 필터링

### 목표
- Row Level Security 적용
- 강사: 자기 수업/학생만 조회
- 관리자: 전체 조회

### Phase 8-7-A: RLS 정책 설계

**역할별 권한**:

| 테이블 | teacher | admin | owner |
|--------|---------|-------|-------|
| classes | 자기 수업만 | 전체 | 전체 |
| students | 자기 수업 학생만 | 전체 | 전체 |
| enrollments | 자기 수업만 | 전체 | 전체 |
| attendance | 자기 수업만 | 전체 | 전체 |
| progress | 자기 수업만 | 전체 | 전체 |
| profiles | 본인만 | 전체 | 전체 |

### Phase 8-7-B: RLS 정책 적용

**Supabase Migration**:
```sql
-- classes 테이블 RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- 강사: 자기 수업만
CREATE POLICY "teachers_own_classes" ON classes
  FOR SELECT
  USING (
    teacher_id IN (
      SELECT teacher_id FROM profile_teacher_mapping
      WHERE profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- 관리자/원장: 전체
CREATE POLICY "admin_all_classes" ON classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- students 테이블 RLS (enrollments 통해 연결)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teachers_own_students" ON students
  FOR SELECT
  USING (
    id IN (
      SELECT e.student_id
      FROM enrollments e
      JOIN classes c ON e.class_id = c.id
      JOIN profile_teacher_mapping m ON c.teacher_id = m.teacher_id
      WHERE m.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
```

### Phase 8-7-C: 프론트엔드 RLS 적용

**변경사항**:
- `useBackofficeData.ts`: RLS 자동 적용 (쿼리 변경 불필요)
- 강사 로그인 시 자동으로 자기 데이터만 조회됨

```typescript
// 기존 코드 그대로 사용 (RLS가 자동 필터링)
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true);
      // RLS가 teacher인 경우 자기 수업만 반환
      return data;
    },
  });
}
```

### Phase 8-7-D: 테스트

**테스트 시나리오**:

| 시나리오 | 예상 결과 |
|---------|----------|
| teacher 로그인 → classes 조회 | 자기 수업만 표시 |
| teacher 로그인 → students 조회 | 자기 수업 학생만 표시 |
| admin 로그인 → classes 조회 | 전체 수업 표시 |
| owner 로그인 → 모든 테이블 | 전체 데이터 표시 |
| 미매핑 teacher → classes 조회 | 빈 배열 (0건) |

---

## 4. 구현 순서

```
Stage 8-6: 강사-수업 연결
├── Phase 8-6-A: 매핑 테이블 생성 (SQL)
├── Phase 8-6-B: 기존 데이터 매핑 (SQL)
├── Phase 8-6-C: RPC 함수 생성 (SQL)
├── Phase 8-6-D: 프론트엔드 훅 (TypeScript)
└── Phase 8-6-E: 강사 관리 UI 개선 (TypeScript)

Stage 8-7: RLS 적용
├── Phase 8-7-A: RLS 정책 설계 (문서)
├── Phase 8-7-B: RLS 정책 적용 (SQL)
├── Phase 8-7-C: 프론트엔드 확인 (TypeScript)
└── Phase 8-7-D: 통합 테스트
```

---

## 5. 파일 변경 목록

### SQL (Supabase)
| 파일/작업 | 설명 |
|----------|------|
| Migration: create_profile_teacher_mapping | 매핑 테이블 생성 |
| Migration: seed_profile_teacher_mapping | 기존 데이터 매핑 |
| Migration: create_rpc_functions | get_my_teacher_id, get_my_classes |
| Migration: enable_rls_policies | classes, students, enrollments RLS |

### Frontend
| 파일 | 설명 |
|------|------|
| `hooks/useMyClasses.ts` | 신규 - 로그인 강사 수업 조회 |
| `hooks/useTeachers.ts` | 수정 - 매핑 정보 포함 |
| `pages/admin/OperationsPage.tsx` | 수정 - 매핑 연결 UI |
| `api/teachers.ts` | 수정 - teachers 동시 생성 |

---

## 6. 예상 에러 및 대응

| 예상 에러 | 원인 | 해결 |
|----------|------|------|
| `permission denied for table` | RLS 정책 누락 | 정책 추가 |
| `get_my_teacher_id returns null` | 매핑 없음 | 매핑 UI 제공 |
| `infinite loop in RLS` | 순환 참조 | SECURITY DEFINER 함수 사용 |
| `기존 데이터 접근 불가` | RLS 적용 후 | service_role로 마이그레이션 |

---

## 7. 롤백 계획

문제 발생 시:
1. RLS 비활성화: `ALTER TABLE classes DISABLE ROW LEVEL SECURITY;`
2. 매핑 테이블 DROP: `DROP TABLE profile_teacher_mapping;`
3. RPC 함수 DROP: `DROP FUNCTION get_my_teacher_id, get_my_classes;`

---

## 8. 완료 기준

### Stage 8-6 완료 기준
- [ ] profile_teacher_mapping 테이블 생성
- [ ] 기존 강사 자동 매핑 완료
- [ ] get_my_teacher_id RPC 동작 확인
- [ ] 강사 관리에서 매핑 상태 표시

### Stage 8-7 완료 기준
- [ ] classes, students, enrollments RLS 활성화
- [ ] teacher 로그인 시 자기 데이터만 조회
- [ ] admin/owner 로그인 시 전체 데이터 조회
- [ ] 모든 테스트 시나리오 통과

---

*v1.0 - 2025-12-19*
