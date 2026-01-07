# hyeyum → PDF Backoffice 마이그레이션 호환성 연구

> 작성일: 2025-12-12
> 목적: hyeyum 데이터를 PDF Backoffice로 안전하게 이전하기 위한 호환성 분석

---

## 1. 현재 상황

### 1.1 두 시스템 비교

| 항목 | hyeyum (현재 운영) | PDF Backoffice (개발 중) |
|------|-------------------|-------------------------|
| 상태 | 프로덕션, 실제 사용 중 | 개발 단계 |
| 사용자 | 학원 강사들 | (동일 예정) |
| DB | Supabase | Supabase (별도 프로젝트) |
| 데이터 | 실제 학생/수업 데이터 | 더미 데이터 |

### 1.2 마이그레이션 목표

```
Phase 1: 완전 분리 개발 (현재)
    ↓
Phase 2: 기능 검증 완료
    ↓
Phase 3: 데이터 마이그레이션
    ↓
Phase 4: hyeyum 종료, Backoffice로 전환
```

---

## 2. 스키마 호환성 분석

### 2.1 핵심 테이블 매핑

| hyeyum (추정) | Backoffice (설계) | 호환성 | 마이그레이션 난이도 |
|--------------|------------------|--------|-------------------|
| students | students | 동일 설계 | 쉬움 |
| classes | classes | 동일 설계 | 쉬움 |
| class_enrollments | class_enrollments | 동일 설계 | 쉬움 |
| attendance | attendance | 동일 설계 | 쉬움 |
| homework | homework | 동일 설계 | 쉬움 |
| (없음?) | progress | 신규 | N/A |
| (없음?) | exam_scores | 신규 | N/A |
| profiles | profiles | 동일 설계 | 쉬움 |

### 2.2 컬럼 레벨 호환성 (students 예시)

**설계된 스키마:**
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  grade TEXT,                    -- '초3', '중1', '고2'
  school TEXT,
  status TEXT DEFAULT 'active',  -- 'active', 'inactive', 'graduated'
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**호환성 체크리스트:**
- [ ] hyeyum의 실제 컬럼명 확인 필요
- [ ] 데이터 타입 일치 확인
- [ ] NOT NULL 제약조건 확인
- [ ] 기본값 확인

---

## 3. 마이그레이션 전략

### 3.1 Option A: 직접 마이그레이션 (권장)

```
hyeyum Supabase ───[pg_dump]───→ SQL 파일 ───[pg_restore]───→ Backoffice Supabase
```

**장점:**
- 데이터 무결성 보장
- 트랜잭션 처리 가능
- ID(UUID) 유지

**단점:**
- 다운타임 필요 (수 분)
- 스키마 완전 동일해야 함

### 3.2 Option B: ETL 파이프라인

```
hyeyum ───[API 조회]───→ 변환 스크립트 ───[API 삽입]───→ Backoffice
```

**장점:**
- 스키마 차이 대응 가능
- 점진적 마이그레이션
- 다운타임 최소화

**단점:**
- 구현 복잡도 높음
- ID 매핑 필요

### 3.3 Option C: Supabase 복제 (가장 안전)

```
hyeyum 프로젝트 ───[Supabase CLI]───→ 프로젝트 복제 ───→ Backoffice로 사용
```

**장점:**
- 완벽한 데이터 복사
- RLS, 인덱스 등 모두 유지
- 가장 간단

**단점:**
- 기존 hyeyum과 분리됨

---

## 4. 호환성 보장 원칙

### 4.1 스키마 설계 원칙

```typescript
// 1. UUID 사용 (auto-increment 금지)
id: uuid('id').primaryKey().defaultRandom()

// 2. 타임스탬프 표준화
created_at: timestamp('created_at').defaultNow()
updated_at: timestamp('updated_at').defaultNow()

// 3. Soft Delete 사용
status: text('status').default('active')  // 'active', 'deleted'

// 4. 컬럼명 snake_case 통일
parent_phone (O)
parentPhone (X)
```

### 4.2 데이터 타입 규칙

| 데이터 | hyeyum | Backoffice | 변환 |
|--------|--------|------------|------|
| ID | UUID | UUID | 그대로 |
| 날짜 | TIMESTAMPTZ | TIMESTAMPTZ | 그대로 |
| 이름 | TEXT | TEXT | 그대로 |
| 상태 | TEXT/ENUM | TEXT | ENUM → TEXT |
| JSON | JSONB | JSONB | 그대로 |

### 4.3 FK 관계 유지

```sql
-- hyeyum의 관계가 유지되도록 설계
class_enrollments.class_id → classes.id
class_enrollments.student_id → students.id
attendance.class_id → classes.id
attendance.student_id → students.id
```

---

## 5. 마이그레이션 스크립트 설계

### 5.1 데이터 추출 (hyeyum → JSON)

```typescript
// migration/export-hyeyum.ts
async function exportHyeyumData() {
  const data = {
    students: await supabase.from('students').select('*'),
    classes: await supabase.from('classes').select('*'),
    class_enrollments: await supabase.from('class_enrollments').select('*'),
    attendance: await supabase.from('attendance').select('*'),
    // ...
  };

  await fs.writeFile('hyeyum-export.json', JSON.stringify(data, null, 2));
}
```

### 5.2 데이터 변환 (필요시)

```typescript
// migration/transform.ts
function transformStudent(hyeyumStudent: any): BackofficeStudent {
  return {
    id: hyeyumStudent.id,  // UUID 유지
    name: hyeyumStudent.name,
    phone: hyeyumStudent.phone || null,
    parent_phone: hyeyumStudent.parent_phone || hyeyumStudent.parentPhone,
    grade: hyeyumStudent.grade,
    school: hyeyumStudent.school || null,
    status: hyeyumStudent.status || 'active',
    notes: hyeyumStudent.notes || null,
    created_at: hyeyumStudent.created_at,
    updated_at: hyeyumStudent.updated_at || new Date().toISOString(),
  };
}
```

### 5.3 데이터 삽입 (JSON → Backoffice)

```typescript
// migration/import-backoffice.ts
async function importToBackoffice(data: ExportedData) {
  // 1. 순서대로 삽입 (FK 의존성)
  await supabase.from('students').upsert(data.students);
  await supabase.from('classes').upsert(data.classes);
  await supabase.from('class_enrollments').upsert(data.class_enrollments);
  await supabase.from('attendance').upsert(data.attendance);
  // ...
}
```

---

## 6. 검증 체크리스트

### 6.1 마이그레이션 전

- [ ] hyeyum 테이블 목록 확인
- [ ] 각 테이블 컬럼 구조 확인
- [ ] 데이터 건수 확인 (기준값)
- [ ] 스키마 차이점 문서화

### 6.2 마이그레이션 중

- [ ] 테이블별 마이그레이션 순서 결정
- [ ] FK 관계 순서 준수
- [ ] 에러 발생 시 롤백 계획

### 6.3 마이그레이션 후

- [ ] 데이터 건수 일치 확인
- [ ] FK 무결성 검증
- [ ] 샘플 데이터 비교
- [ ] 기능 테스트

---

## 7. 구현 가능성 평가

### 7.1 기술적 가능성: **높음**

| 항목 | 평가 | 이유 |
|------|------|------|
| 스키마 호환성 | 높음 | 동일한 설계 철학 |
| 데이터 타입 | 높음 | PostgreSQL → PostgreSQL |
| UUID 유지 | 높음 | 양쪽 모두 UUID 사용 |
| 관계 유지 | 높음 | FK 구조 동일 |

### 7.2 리스크

| 리스크 | 심각도 | 대응 방안 |
|--------|--------|----------|
| 스키마 불일치 | 중간 | 변환 스크립트로 대응 |
| 데이터 손실 | 높음 | 백업 후 진행, 검증 철저히 |
| 다운타임 | 낮음 | 새벽 시간 마이그레이션 |
| RLS 정책 차이 | 낮음 | 마이그레이션 후 재설정 |

### 7.3 예상 소요 시간

| 단계 | 소요 시간 |
|------|----------|
| 스키마 분석 | 1-2시간 |
| 마이그레이션 스크립트 개발 | 3-4시간 |
| 테스트 환경 마이그레이션 | 1시간 |
| 검증 | 1-2시간 |
| 프로덕션 마이그레이션 | 30분 |
| **합계** | **6-10시간** |

---

## 8. 권장 접근법

### 8.1 현재 단계 (개발)

```
1. Backoffice를 완전 분리된 새 Supabase로 개발
2. hyeyum 스키마와 동일하게 설계
3. 더미 데이터로 기능 검증
```

### 8.2 마이그레이션 단계 (미래)

```
1. hyeyum 테이블 구조 정확히 파악
2. 스키마 차이점 문서화
3. 마이그레이션 스크립트 개발
4. 테스트 환경에서 검증
5. 프로덕션 마이그레이션 실행
```

---

## 9. 필요한 정보

### hyeyum 관리자에게 요청할 것

1. **테이블 목록**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

2. **각 테이블 구조**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'students';
   ```

3. **데이터 건수**
   ```sql
   SELECT
     (SELECT COUNT(*) FROM students) as students,
     (SELECT COUNT(*) FROM classes) as classes,
     (SELECT COUNT(*) FROM attendance) as attendance;
   ```

---

## 10. 결론

### 구현 가능성: **매우 높음**

- 동일한 Supabase PostgreSQL 환경
- 유사한 스키마 설계
- 표준화된 데이터 타입

### 권장 사항

1. **지금**: 완전 분리 개발 진행
2. **나중**: hyeyum 스키마 확인 후 마이그레이션 스크립트 개발
3. **전환 시**: 테스트 환경 검증 후 프로덕션 마이그레이션

---

*작성: Claude Code | 2025-12-12*
