# 반 관리에서 생성한 반이 반 배정에 나오지 않는 에러 리포트

> 연구 리포트 #443
> 작성일: 2025-12-27

---

## 1. 에러 현상

**증상**: 반 관리(`/admin/classes`)에서 새로 생성한 반이 반 배정 페이지(`/admin/subject-assignment`)에 나타나지 않음

---

## 2. 원인 분석

### 2.1 데이터 비교

**반 관리 페이지에서 조회하는 데이터** (`useClasses` 훅):
```sql
SELECT * FROM classes WHERE is_active = true
```
- `grade_id` 사용 (grades 테이블 FK)
- `division`, `grade`, `level` 필드 없음 (또는 null)

**반 배정 페이지에서 조회하는 데이터** (`get_classes_by_subject` RPC):
```sql
SELECT c.* FROM classes c
WHERE c.is_active = true
  AND (p_division IS NULL OR c.division = p_division)
  AND (p_grade IS NULL OR c.grade = p_grade)
```
- `division`, `grade` 필드 필터링
- 이 필드들이 null이면 필터에서 제외됨

### 2.2 실제 DB 데이터 확인

| 반 이름 | division | grade | level | 반 배정 표시 |
|---------|----------|-------|-------|-------------|
| 고3 수학 미적 | **null** | **null** | mid | ❌ 안 나옴 |
| 고1 수학 기초반 | **null** | **null** | mid | ❌ 안 나옴 |
| 고2 수학 심화 | **null** | **null** | mid | ❌ 안 나옴 |
| 중2 수학 기초 | middle | 중2 | basic | ✅ 나옴 |
| 중1 수학 심화 | middle | 중1 | advanced | ✅ 나옴 |

### 2.3 근본 원인

**반 관리 페이지**는 `grade_id`만 저장하고, **반 배정 RPC**는 `division`과 `grade` 컬럼을 필터링합니다.

| 저장 방식 | 반 관리 | 반 배정 필터 | 결과 |
|-----------|---------|--------------|------|
| grade_id | ✅ 저장 | ❌ 사용 안함 | - |
| division | ❌ null | ✅ 필터링 | **불일치** |
| grade | ❌ null | ✅ 필터링 | **불일치** |
| level | ❌ 'mid' (기본값?) | ✅ 필터링 | 부분 일치 |

---

## 3. 영향 받는 코드

### 3.1 반 생성 API (`api/classes.ts`)
```typescript
export async function createClass(input: CreateClassInput) {
  const { data, error } = await supabase
    .from('classes')
    .insert({
      name: input.name,
      subject_id: input.subject_id,
      grade_id: input.grade_id,  // ← grade_id만 저장
      // division, grade 필드 없음!
    })
    ...
}
```

### 3.2 반 배정 RPC (`get_classes_by_subject`)
```sql
WHERE sub.code = p_subject_code
  AND c.is_active = true
  AND (p_division IS NULL OR c.division = p_division)  -- division 필터
  AND (p_grade IS NULL OR c.grade = p_grade)           -- grade 필터
```

---

## 4. 해결 방안

### 방안 A: 반 생성 시 division, grade 필드 자동 채우기 (권장)

**장점**: 기존 RPC 로직 유지, 데이터 정합성 확보

```typescript
// frontend/src/api/classes.ts - createClass 함수 수정
export async function createClass(input: CreateClassInput) {
  // grade_id로 division, grade 값 계산
  let division = null;
  let grade = null;

  if (input.grade_id) {
    // grades 테이블에서 조회
    const { data: gradeData } = await supabase
      .from('grades')
      .select('name, division')
      .eq('id', input.grade_id)
      .single();

    if (gradeData) {
      division = gradeData.division;  // 'elementary', 'middle', 'high'
      grade = gradeData.name;         // '중1', '중2', '고1' 등
    }
  }

  const { data, error } = await supabase
    .from('classes')
    .insert({
      ...input,
      division,  // 추가
      grade,     // 추가
    })
    ...
}
```

### 방안 B: RPC 함수를 grade_id 기반으로 수정

**장점**: 반 생성 코드 수정 불필요

```sql
-- get_classes_by_subject 함수 수정
SELECT c.*, g.name as grade, g.division
FROM classes c
JOIN subjects sub ON c.subject_id = sub.id
LEFT JOIN grades g ON c.grade_id = g.id  -- grade_id로 조인
WHERE sub.code = p_subject_code
  AND c.is_active = true
  AND (p_division IS NULL OR g.division = p_division)  -- grades 테이블 사용
  AND (p_grade IS NULL OR g.name = p_grade)            -- grades 테이블 사용
```

### 방안 C: 기존 반 데이터 마이그레이션 + 방안 A

```sql
-- 기존 반의 division, grade 필드 채우기
UPDATE classes c
SET
  division = g.division,
  grade = g.name
FROM grades g
WHERE c.grade_id = g.id
  AND c.division IS NULL;
```

---

## 5. 권장 해결 순서

1. **즉시**: 방안 C 마이그레이션 실행 (기존 데이터 복구)
2. **코드 수정**: 방안 A 적용 (향후 생성되는 반에 적용)
3. **테스트**: 반 생성 → 반 배정 페이지 확인

---

## 6. 추가 발견 사항

### 6.1 level 필드 불일치

반 관리에서 생성한 반: `level = 'mid'`
반 배정 RPC 기대값: `'advanced'`, `'regular'`, `'regular2'`, `'basic'`

**`'mid'`는 유효한 level 값이 아님** → ORDER BY에서 맨 뒤로 정렬되거나 무시될 수 있음

### 6.2 level 기본값 문제

반 생성 시 level 필드를 지정하지 않으면 DB 기본값이 `'mid'`로 설정되는 것으로 보임.
이 값은 ClassLevel 타입 정의와 맞지 않음:

```typescript
export type ClassLevel = 'advanced' | 'regular' | 'regular2' | 'basic';
// 'mid'는 없음!
```

---

## 7. 결론

| 항목 | 상태 |
|------|------|
| **원인** | 반 생성 시 `division`, `grade` 필드가 저장되지 않음 |
| **영향** | 반 배정 페이지에서 해당 반이 필터링되어 표시 안 됨 |
| **권장 해결** | 방안 A + C 조합 (마이그레이션 + 코드 수정) |
| **추가 이슈** | `level` 필드 기본값 'mid' → 유효한 값으로 수정 필요 |

---

*작성: Claude Code | 2025-12-27*
