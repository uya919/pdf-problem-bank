# hyeyum vs Backoffice 스키마 비교 분석 리포트

> 작성일: 2025-12-12
> MCP로 hyeyum 실제 스키마 조회 후 비교

---

## 1. 요약

| 구분 | hyeyum | Backoffice (설계) | 호환성 |
|------|--------|------------------|--------|
| 총 테이블 수 | 44개 | 15개 | - |
| 핵심 테이블 | 15개 | 15개 | 90% |
| 데이터 타입 | ENUM 사용 | TEXT CHECK 혼용 | 변환 필요 |

---

## 2. 핵심 테이블 상세 비교

### 2.1 students (학생)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| name | TEXT NOT NULL | TEXT NOT NULL | **동일** |
| phone | TEXT (nullable) | TEXT (nullable) | **동일** |
| parent_phone | TEXT NOT NULL | TEXT (nullable) | hyeyum이 더 엄격 |
| parent_name | TEXT (nullable) | ❌ 없음 | **추가 필요** |
| grade | TEXT (nullable) | TEXT (nullable) | **동일** |
| school | TEXT (nullable) | TEXT (nullable) | **동일** |
| status | **ENUM** | TEXT CHECK | 변환 필요 |
| notes | TEXT (nullable) | TEXT (nullable) | **동일** |
| created_by | UUID (nullable) | ❌ 없음 | **추가 필요** |
| synced_at | TIMESTAMPTZ | ❌ 없음 | hyeyum 전용 |
| created_at | TIMESTAMPTZ | TIMESTAMPTZ | **동일** |
| updated_at | TIMESTAMPTZ | TIMESTAMPTZ | **동일** |

**마이그레이션 난이도: 쉬움** (2개 컬럼 추가만 필요)

---

### 2.2 classes (반)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| name | TEXT NOT NULL | TEXT NOT NULL | **동일** |
| subject | TEXT NOT NULL | TEXT (nullable) | hyeyum이 더 엄격 |
| teacher_id | UUID (nullable) | UUID (nullable) | **동일** |
| day_of_week | **INT[] 배열** | ❌ 없음 (JSONB) | 구조 다름 |
| start_time | **TIME** | ❌ 없음 (JSONB) | 구조 다름 |
| end_time | **TIME** | ❌ 없음 (JSONB) | 구조 다름 |
| room | TEXT (nullable) | ❌ 없음 | **추가 필요** |
| capacity | INT (nullable) | ❌ 없음 | **추가 필요** |
| status | **ENUM** | ❌ 없음 | **추가 필요** |
| textbooks | TEXT[] | ❌ 없음 | **추가 필요** |
| notes | TEXT (nullable) | ❌ 없음 | **추가 필요** |
| schedule | ❌ 없음 | JSONB | Backoffice 전용 |

**마이그레이션 난이도: 중간** (스케줄 구조 변환 필요)

---

### 2.3 attendance (출결)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| class_id | UUID NOT NULL | UUID NOT NULL | **동일** |
| student_id | UUID NOT NULL | UUID NOT NULL | **동일** |
| date | DATE NOT NULL | DATE NOT NULL | **동일** |
| status | **ENUM** | **ENUM** | **동일** (4개 값) |
| notes/note | notes (nullable) | note (nullable) | 컬럼명 다름! |
| created_by | UUID (nullable) | ❌ 없음 | **추가 필요** |
| announcement_id | UUID (nullable) | ❌ 없음 | hyeyum 전용 |

**마이그레이션 난이도: 쉬움** (컬럼명 변환 필요)

---

### 2.4 progress (진도)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| class_id | UUID NOT NULL | UUID NOT NULL | **동일** |
| date | DATE NOT NULL | DATE NOT NULL | **동일** |
| textbook | TEXT (nullable) | TEXT (nullable) | **동일** |
| pages | **TEXT** | start_page, end_page INT | 구조 다름 |
| topic | TEXT (nullable) | TEXT (nullable) | **동일** |
| notes | TEXT (nullable) | TEXT (nullable) | **동일** |
| created_by | UUID (nullable) | UUID (nullable) | **동일** |

**마이그레이션 난이도: 쉬움** (pages 파싱만 필요)

---

### 2.5 homework (숙제)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| class_id | UUID NOT NULL | UUID NOT NULL | **동일** |
| title | TEXT NOT NULL | TEXT NOT NULL | **동일** |
| description | TEXT (nullable) | TEXT (nullable) | **동일** |
| due_date | DATE NOT NULL | DATE (nullable) | hyeyum이 더 엄격 |
| assigned_date | DATE | ❌ 없음 | **추가 필요** |
| created_by | UUID (nullable) | ❌ 없음 | **추가 필요** |
| textbook | ❌ 없음 | TEXT | Backoffice 전용 |
| start_page | ❌ 없음 | INT | Backoffice 전용 |
| end_page | ❌ 없음 | INT | Backoffice 전용 |

**마이그레이션 난이도: 쉬움**

---

### 2.6 exam_scores (시험 성적)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID | UUID | **동일** |
| class_id | UUID | UUID | **동일** |
| student_id | UUID | UUID | **동일** |
| exam_type | TEXT CHECK | TEXT CHECK | **동일** |
| exam_date | DATE | DATE | **동일** |
| exam_name | TEXT | TEXT | **동일** |
| correct_answers | INT (nullable) | INT NOT NULL | Backoffice가 더 엄격 |
| total_questions | INT (nullable) | INT NOT NULL | Backoffice가 더 엄격 |
| manual_score | NUMERIC | ❌ 없음 | **추가 필요** |
| score | **GENERATED** | **GENERATED** | 계산식 동일 |
| notes | TEXT (nullable) | TEXT (nullable) | **동일** |
| created_by | UUID (nullable) | ❌ 없음 | **추가 필요** |

**마이그레이션 난이도: 쉬움**

---

### 2.7 profiles (사용자)

| 컬럼 | hyeyum | Backoffice | 차이점 |
|------|--------|------------|--------|
| id | UUID (FK auth.users) | UUID (FK auth.users) | **동일** |
| email | TEXT NOT NULL | TEXT NOT NULL | **동일** |
| name | TEXT (nullable) | TEXT (nullable) | **동일** |
| role | TEXT | TEXT CHECK | **동일** |
| phone | TEXT | ❌ 없음 | **추가 필요** |
| avatar_url | TEXT | ❌ 없음 | **추가 필요** |
| subjects | TEXT[] | TEXT[] | **동일** |
| departments | TEXT[] | department TEXT | 구조 다름 |
| grade_permissions | JSONB | JSONB | **동일** |
| consultation_access | BOOLEAN | ❌ 없음 | hyeyum 전용 |
| sync_permission | BOOLEAN | ❌ 없음 | hyeyum 전용 |
| timetable_access | BOOLEAN | ❌ 없음 | hyeyum 전용 |
| meeting_access | BOOLEAN | ❌ 없음 | hyeyum 전용 |
| subject_lead_for | TEXT[] | ❌ 없음 | hyeyum 전용 |

**마이그레이션 난이도: 중간** (권한 컬럼들 추가 필요)

---

## 3. hyeyum에만 있는 테이블

| 테이블 | 용도 | Backoffice 필요 여부 |
|--------|------|---------------------|
| consultations | 상담 기록 | 나중에 추가 |
| student_notes | 학생별 메모 | 나중에 추가 |
| lesson_plans | 수업 계획 | 나중에 추가 |
| class_materials | 수업 자료 | 나중에 추가 |
| academy_closures | 학원 휴무일 | 나중에 추가 |
| question_bank | 문제 은행 | 나중에 추가 |
| rotation_* (5개) | 순환 수업 | 필요 없음 |
| adhoc_* (2개) | 임시 수업 | 필요 없음 |
| class_cancellations | 수업 취소 | 나중에 추가 |
| timetable_* (12개) | 시간표 편집기 | 필요 없음 |

---

## 4. 데이터 타입 차이점

### 4.1 ENUM vs TEXT CHECK

| hyeyum | Backoffice | 권장 |
|--------|------------|------|
| ENUM student_status | TEXT CHECK | ENUM 사용 권장 |
| ENUM class_status | TEXT CHECK | ENUM 사용 권장 |
| ENUM attendance_status | ENUM | **동일** |
| ENUM enrollment_status | TEXT CHECK | ENUM 사용 권장 |
| ENUM homework_submission_status | TEXT CHECK | ENUM 사용 권장 |

**권장**: Backoffice도 hyeyum처럼 ENUM 사용으로 통일

---

## 5. 마이그레이션 전략

### 5.1 Phase 1: 스키마 수정 (Backoffice)

```sql
-- students 테이블 수정
ALTER TABLE students ADD COLUMN parent_name TEXT;
ALTER TABLE students ADD COLUMN created_by UUID REFERENCES profiles(id);

-- classes 테이블 수정
ALTER TABLE classes ADD COLUMN day_of_week INT[];
ALTER TABLE classes ADD COLUMN start_time TIME;
ALTER TABLE classes ADD COLUMN end_time TIME;
ALTER TABLE classes ADD COLUMN room TEXT;
ALTER TABLE classes ADD COLUMN capacity INT;
ALTER TABLE classes ADD COLUMN textbooks TEXT[];
ALTER TABLE classes ADD COLUMN notes TEXT;
ALTER TABLE classes DROP COLUMN schedule;

-- attendance 테이블 수정
ALTER TABLE attendance RENAME COLUMN note TO notes;
ALTER TABLE attendance ADD COLUMN created_by UUID REFERENCES profiles(id);

-- homework 테이블 수정
ALTER TABLE homework ADD COLUMN assigned_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE homework ADD COLUMN created_by UUID REFERENCES profiles(id);

-- exam_scores 테이블 수정
ALTER TABLE exam_scores ADD COLUMN manual_score NUMERIC;
ALTER TABLE exam_scores ADD COLUMN created_by UUID REFERENCES profiles(id);
ALTER TABLE exam_scores ALTER COLUMN correct_answers DROP NOT NULL;
ALTER TABLE exam_scores ALTER COLUMN total_questions DROP NOT NULL;

-- profiles 테이블 수정
ALTER TABLE profiles ADD COLUMN phone TEXT;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN departments TEXT[];
ALTER TABLE profiles DROP COLUMN department;
```

### 5.2 Phase 2: 데이터 마이그레이션

```typescript
// 1. 순서: profiles → students → classes → enrollments → 나머지
// 2. UUID 유지
// 3. ENUM 값 그대로 복사
// 4. pages → start_page/end_page 파싱 (progress)
```

---

## 6. 호환성 점수

| 테이블 | 호환성 | 마이그레이션 난이도 |
|--------|--------|-------------------|
| students | 85% | 쉬움 |
| classes | 60% | 중간 |
| class_enrollments | 95% | 쉬움 |
| attendance | 90% | 쉬움 |
| progress | 80% | 쉬움 |
| homework | 85% | 쉬움 |
| homework_submissions | 70% | 쉬움 |
| exam_scores | 85% | 쉬움 |
| todos | 95% | 쉬움 |
| announcements | 70% | 중간 |
| meetings | 90% | 쉬움 |
| teacher_groups | 95% | 쉬움 |
| registrations | 90% | 쉬움 |
| profiles | 60% | 중간 |

**평균 호환성: 82%**

---

## 7. 결론 및 권장사항

### 7.1 즉시 조치 (Backoffice 스키마 수정)

1. ENUM 타입 통일
2. hyeyum과 동일한 컬럼 추가
3. 컬럼명 통일 (note → notes)

### 7.2 마이그레이션 준비

1. 변환 스크립트 작성 (pages 파싱 등)
2. UUID 매핑 테이블 불필요 (직접 복사)
3. FK 의존성 순서 준수

### 7.3 예상 작업량

- 스키마 수정: 2시간
- 마이그레이션 스크립트: 3시간
- 테스트 및 검증: 2시간
- **총: 7시간**

---

*작성: Claude Code (MCP 연동) | 2025-12-12*
