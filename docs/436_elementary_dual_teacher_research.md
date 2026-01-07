# 초등부 담임/부담임 시스템 구현 가능성 연구

> 연구 리포트 #436
> 작성일: 2025-12-26
> 분류: 기능 확장 / DB 스키마 변경

---

## 1. 요청 사항 요약

### 1.1 요구사항
- **대상**: 초등부 반만 해당 (중등부/고등부 제외)
- **담임**: 월/수/금 수업 담당
- **부담임**: 화/목 수업 담당
- **권한 차이**: 없음 (동등한 권한)
- **위치**: 운영페이지 > 반관리페이지
- **표시 로직**: 로그인한 강사의 담당 요일만 표시
- **대체 수업**: 담임 휴가 시 부담임이 대신 가능
- **학부모 리포트**: "담임: ㅁㅁㅁ / 부담임: ㅁㅁㅁ" 형식으로 표시

### 1.2 현재 시스템 구조
```
classes 테이블
├── teacher_id (UUID) ← 단일 강사만 지원
├── day_of_week (integer[]) ← 요일 배열 [1,2,3,4,5]
└── ...
```

---

## 2. 구현 가능성 분석

### 2.1 기술적 구현: ✅ **가능**

현재 시스템은 단일 담당 강사(`teacher_id`) 구조지만, 다음 방법으로 확장 가능:

#### 방법 A: 컬럼 추가 방식 (권장)
```sql
ALTER TABLE classes ADD COLUMN homeroom_teacher_id UUID REFERENCES profiles(id);  -- 담임
ALTER TABLE classes ADD COLUMN assistant_teacher_id UUID REFERENCES profiles(id); -- 부담임
ALTER TABLE classes ADD COLUMN homeroom_days integer[] DEFAULT ARRAY[1, 3, 5];     -- 월수금
ALTER TABLE classes ADD COLUMN assistant_days integer[] DEFAULT ARRAY[2, 4];      -- 화목
```

**장점**:
- 기존 `teacher_id` 유지로 하위 호환성 보장
- 단순한 쿼리로 조회 가능
- 마이그레이션 용이

**단점**:
- 3명 이상 강사 확장 어려움 (현재 요구사항에서는 문제없음)

#### 방법 B: 별도 테이블 방식
```sql
CREATE TABLE class_teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('homeroom', 'assistant')),  -- 담임/부담임
  assigned_days integer[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**장점**:
- 확장성 우수 (3명 이상 가능)
- 정규화된 구조

**단점**:
- 추가 JOIN 필요
- 기존 로직 대폭 수정 필요

### 2.2 권장 방안: **방법 A (컬럼 추가)**

초등부만 해당하고, 2명 강사로 고정된 요구사항이므로 방법 A가 적합.

---

## 3. 영향 범위 분석

### 3.1 DB 스키마 변경

| 변경 내용 | 파일 |
|----------|------|
| classes 테이블 컬럼 추가 | `supabase/migrations/00X_dual_teacher.sql` |
| TypeScript 타입 업데이트 | `frontend/src/types/database.ts` |

```sql
-- 마이그레이션 예시
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_teacher_id UUID REFERENCES profiles(id);  -- 담임
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_teacher_id UUID REFERENCES profiles(id); -- 부담임
ALTER TABLE classes ADD COLUMN IF NOT EXISTS homeroom_days integer[] DEFAULT ARRAY[1, 3, 5];    -- 월수금
ALTER TABLE classes ADD COLUMN IF NOT EXISTS assistant_days integer[] DEFAULT ARRAY[2, 4];     -- 화목

-- 기존 데이터 마이그레이션 (초등부만)
UPDATE classes
SET homeroom_teacher_id = teacher_id,
    homeroom_days = day_of_week
WHERE grade_id IN (SELECT id FROM grades WHERE name LIKE '초%');
```

### 3.2 프론트엔드 변경

| 파일 | 변경 내용 |
|------|----------|
| `ClassManagementPage.tsx` | 테이블 컬럼 추가 (담임/부담임) |
| `EditClassModal.tsx` | 담임/부담임 선택 UI 추가 |
| `CreateClassModal.tsx` | 초등부 선택 시 담임/부담임 필드 표시 |
| `useClasses.ts` | API 타입 업데이트 |
| `BackofficeDemo.tsx` | 강사 담당 요일 필터링 로직 |

### 3.3 API 변경

| 엔드포인트 | 변경 |
|-----------|------|
| `GET /classes` | response에 담임/부담임 정보 포함 |
| `PATCH /classes/:id` | 담임/부담임 ID 업데이트 지원 |
| `POST /classes` | 초등부 반 생성 시 듀얼 강사 지원 |

---

## 4. UI/UX 설계

### 4.1 반 관리 테이블 (ClassManagementPage)

**현재 구조:**
| 반 이름 | 과목 | 학년 | 수업 시간 | 담당 강사 | 학생 | 상태 |
|--------|-----|-----|---------|---------|-----|-----|
| 초4A반 | 수학 | 초4 | 월수금 14:00 | 김선생 | 8/10 | 활성 |

**변경 후 구조:**
| 반 이름 | 과목 | 학년 | 수업 시간 | 담임 (월수금) | 부담임 (화목) | 학생 | 상태 |
|--------|-----|-----|---------|------------|-------------|-----|-----|
| 초4A반 | 수학 | 초4 | 월~금 14:00 | 김선생 | 박선생 | 8/10 | 활성 |

**조건부 표시:**
- 초등부(`filterDivision === 'elementary'` 또는 학년이 '초X'): 담임/부담임 컬럼 표시
- 중등부/고등부: 기존 "담당 강사" 컬럼 유지

### 4.2 반 수정 모달 (EditClassModal)

**초등부 선택 시 추가 UI:**
```
┌─────────────────────────────────────┐
│  담당 강사                           │
│  ┌─────────────────────────────────┐│
│  │ 담임 (월/수/금)                  ││
│  │ [김선생 ▼]                      ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 부담임 (화/목)                   ││
│  │ [박선생 ▼]                      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**로직:**
- 학년 드롭다운에서 '초3~초6' 선택 시 → 담임/부담임 UI 표시
- 중등/고등 선택 시 → 기존 단일 "담당 강사" UI 유지

### 4.3 강사용 대시보드 (BackofficeDemo)

**필터링 로직:**
```typescript
// 현재 요일 확인
const today = new Date().getDay(); // 0=일, 1=월, ..., 6=토

// 초등부 반 필터링
const myClasses = classes.filter(cls => {
  // 초등부가 아니면 기존 로직 (teacher_id로 매칭)
  if (!isElementary(cls)) {
    return cls.teacher_id === currentUserId;
  }

  // 초등부면 요일별 강사 확인
  if (cls.homeroom_days?.includes(today)) {
    return cls.homeroom_teacher_id === currentUserId;
  }
  if (cls.assistant_days?.includes(today)) {
    return cls.assistant_teacher_id === currentUserId;
  }
  return false;
});
```

---

## 5. 우려 사항 및 해결 방안

### 5.1 기존 데이터 호환성

| 우려 | 해결 방안 |
|-----|---------|
| 기존 `teacher_id` 데이터 손실 | 마이그레이션에서 `homeroom_teacher_id`로 복사 |
| 중등부/고등부 영향 | 해당 학년은 기존 `teacher_id` 계속 사용 |

### 5.2 복잡한 스케줄 케이스

| 케이스 | 처리 방안 |
|-------|---------|
| 월화수목금 모두 같은 강사 | 담임만 배정, 부담임은 null |
| 월수금만 수업 | 담임만 배정, 부담임은 null |
| 화목만 수업 | 부담임만 배정, 담임은 null |
| 토요일 수업 | `homeroom_days`, `assistant_days`에 6 포함 가능 |
| 담임 휴가 | 부담임이 해당 요일 대체 수업 가능 (권한 동일) |

### 5.3 RLS 정책

현재 classes 테이블 RLS:
```sql
-- SELECT: 인증된 사용자 모두 조회 가능
-- UPDATE: 담당 강사 또는 원장만
```

**변경 필요:**
```sql
-- UPDATE 정책 수정
CREATE POLICY "classes_update_by_teachers" ON classes
FOR UPDATE TO authenticated
USING (
  teacher_id = auth.uid() OR
  homeroom_teacher_id = auth.uid() OR
  assistant_teacher_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'director')
);
```

### 5.4 출결/진도 기록 주체

| 질문 | 현재 상태 | 권장 처리 |
|-----|---------|---------|
| 누가 출결 기록? | 권한 차이 없음 | 그날 담당 강사가 기록 |
| 진도 기록 충돌? | - | 마지막 수정자 기준 |

### 5.5 학부모 리포트 표시

학부모용 리포트에서는 담임/부담임 모두 표시:
```
담임: 김선생 / 부담임: 박선생
```

---

## 6. 개발 공수 추정

| 단계 | 작업 내용 | 예상 난이도 |
|-----|---------|-----------|
| 1 | DB 스키마 변경 + 마이그레이션 | ⭐⭐ |
| 2 | TypeScript 타입 업데이트 | ⭐ |
| 3 | API 수정 (classes CRUD) | ⭐⭐ |
| 4 | ClassManagementPage 테이블 수정 | ⭐⭐ |
| 5 | EditClassModal 폼 수정 | ⭐⭐⭐ |
| 6 | CreateClassModal 폼 수정 | ⭐⭐ |
| 7 | BackofficeDemo 필터링 로직 | ⭐⭐⭐ |
| 8 | 테스트 및 검증 | ⭐⭐ |

**총 예상 작업량**: 중간 규모 (8개 Phase 정도)

---

## 7. 결론 및 권장사항

### 7.1 구현 가능성: ✅ **충분히 가능**

- 기술적 제약 없음
- 기존 시스템과 호환 가능
- 초등부만 적용하므로 영향 범위 제한적

### 7.2 권장 접근법

1. **컬럼 추가 방식** 채택 (방법 A)
2. **기존 teacher_id 유지** (하위 호환성)
3. **조건부 UI** (초등부만 담임/부담임 표시)
4. **단계적 마이그레이션** (기존 데이터 보존)

### 7.3 확정된 사항

| 항목 | 결정 |
|-----|-----|
| 요일 변경 | 현재 고정 (추후 필요시 개발) |
| 대체 수업 | 담임 휴가 시 부담임이 대체 가능 |
| 학부모 리포트 | "담임: ㅁㅁㅁ / 부담임: ㅁㅁㅁ" 형식 |

---

## 8. 다음 단계

사용자 확인 후:
1. **상세 개발 계획** 작성 (`docs/437_dual_teacher_development_plan.md`)
2. **Phase별 개발 진행**
3. **테스트 및 배포**

---

*작성: Claude Code | 2025-12-26*
*분류: 연구 리포트 (개발 진행 안함)*
