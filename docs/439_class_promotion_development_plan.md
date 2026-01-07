# 반 자동 승급 기능 개발 계획

> 개발 계획 #439
> 작성일: 2025-12-27
> 참조: [438_class_promotion_with_grade_research.md](./438_class_promotion_with_grade_research.md)

---

## 1. 개요

학년 승급 시 학생의 반(class) 등록도 함께 승급시키는 기능 개발

### 1.1 확정된 요구사항 (사용자 응답 기반)

| 항목 | 결정 | 설명 |
|------|------|------|
| 학부 전환 | 자동 이동 | 초6 수학 심화 → 중1 수학 심화 자동 매칭 |
| 정원 초과 | 무시 | 정원 체크 없이 이동, 관리자가 나중에 조정 |
| 다중 반 등록 | 모든 반 승급 | 과목별 반이므로 모든 enrollment에 적용 |
| 매칭 실패 | 반 해제 | 새 학년에 같은 반이 없으면 enrollment 비활성화 |
| 번호 반 | 반 해제 | "정규1", "정규2" 등 번호 붙은 반은 수동 배정 |

---

## 2. 개발 Phase

### Phase A: 반 이름 파싱 유틸리티 (Backend)

**파일**: `backend/app/utils/class_parser.py`

```python
"""
반 이름 파싱 유틸리티

반 이름에서 학년과 반명을 분리하고,
새 학년에 맞는 반 이름을 생성합니다.
"""

import re
from typing import Optional, Tuple

# 학년 패턴 (초1~초6, 중1~중3, 고1~고3)
GRADE_PATTERN = r'^(초[1-6]|중[1-3]|고[1-3])\s*'

# 번호 패턴 (정규1, 정규2 등)
NUMBER_SUFFIX_PATTERN = r'\d+$'


def parse_class_name(class_name: str) -> Tuple[Optional[str], Optional[str]]:
    """
    반 이름에서 학년과 반명 분리

    Args:
        class_name: "중1 수학 심화" 형태의 반 이름

    Returns:
        (grade, suffix) 튜플
        예: ("중1", "수학 심화")
    """
    match = re.match(GRADE_PATTERN, class_name)
    if not match:
        return None, None

    grade = match.group(1)
    suffix = class_name[match.end():].strip()

    return grade, suffix


def has_number_suffix(suffix: str) -> bool:
    """
    반명 끝에 번호가 있는지 확인
    예: "정규1" → True, "심화" → False
    """
    return bool(re.search(NUMBER_SUFFIX_PATTERN, suffix))


def build_new_class_name(new_grade: str, suffix: str) -> str:
    """
    새 학년과 반명으로 새 반 이름 생성

    Args:
        new_grade: "중2"
        suffix: "수학 심화"

    Returns:
        "중2 수학 심화"
    """
    return f"{new_grade} {suffix}"


def can_auto_promote(class_name: str) -> Tuple[bool, str]:
    """
    자동 승급 가능 여부 판단

    Returns:
        (can_promote, reason)
    """
    grade, suffix = parse_class_name(class_name)

    if not grade or not suffix:
        return False, "학년 패턴 인식 불가"

    if has_number_suffix(suffix):
        return False, "번호 붙은 반 (수동 배정 필요)"

    return True, "자동 승급 가능"
```

### Phase B: 미리보기 API 확장 (Backend)

**파일**: `backend/app/routers/grade_promotion.py` (수정)

#### B-1. 새 Response Model 추가

```python
class ClassPromotionInfo(BaseModel):
    """반 승급 정보"""
    enrollment_id: str
    current_class_id: str
    current_class_name: str
    new_class_id: Optional[str]      # None이면 반 해제
    new_class_name: Optional[str]
    status: str                       # "auto", "unassigned", "no_class"
    reason: Optional[str]


class PromotionPreviewStudentV2(BaseModel):
    """승급 미리보기 학생 정보 (반 정보 포함)"""
    id: str
    name: str
    current_grade: str
    next_grade: Optional[str]
    school: Optional[str]
    class_promotions: list[ClassPromotionInfo]  # 반 승급 정보 목록


class PromotionPreviewResponseV2(BaseModel):
    """승급 미리보기 응답 (반 정보 포함)"""
    total_students: int
    to_promote: int
    to_graduate: int
    inactive_count: int
    students: list[PromotionPreviewStudentV2]
    # 반 승급 통계
    class_auto_count: int       # 자동 이동 가능
    class_unassigned_count: int # 수동 배정 필요
```

#### B-2. 미리보기 API 수정

```python
@router.get("/preview/v2", response_model=PromotionPreviewResponseV2)
async def preview_promotion_v2():
    """
    학년 승급 미리보기 V2 (반 승급 정보 포함)
    """
    supabase = get_supabase_admin()

    # 1. 활성 학생 + 학년 + 반 정보 조회
    students_response = supabase.from_("students") \
        .select("""
            id, name, school, grade_id, is_active,
            grades(id, name),
            enrollments!inner(id, class_id, is_active, classes(id, name, grade_id))
        """) \
        .eq("is_active", True) \
        .execute()

    # 2. 모든 반 조회 (새 반 매칭용)
    classes_response = supabase.from_("classes") \
        .select("id, name, grade_id, grades(name)") \
        .eq("is_active", True) \
        .execute()

    # 반 이름 → 반 ID 매핑
    class_name_to_id = {c["name"]: c["id"] for c in (classes_response.data or [])}

    # 3. 각 학생별 반 승급 정보 계산
    # ... (상세 로직)
```

### Phase C: 승급 실행 API 확장 (Backend)

**파일**: `backend/app/routers/grade_promotion.py` (수정)

```python
@router.post("/execute/v2", response_model=PromotionExecuteResponseV2)
async def execute_promotion_v2(request: PromotionExecuteRequest):
    """
    학년 일괄 승급 실행 V2 (반 승급 포함)

    1. 학년 승급 (기존 로직)
    2. 반 승급 (새 로직)
       - 자동 매칭 가능: enrollment.class_id 변경
       - 자동 매칭 불가: enrollment.is_active = false
    """
    # ... 구현
```

### Phase D: 프론트엔드 타입 확장

**파일**: `frontend/src/api/gradePromotion.ts` (수정)

```typescript
// 반 승급 정보
export interface ClassPromotionInfo {
  enrollment_id: string;
  current_class_id: string;
  current_class_name: string;
  new_class_id: string | null;
  new_class_name: string | null;
  status: 'auto' | 'unassigned' | 'no_class';
  reason?: string;
}

// V2 학생 정보
export interface PromotionPreviewStudentV2 extends PromotionPreviewStudent {
  class_promotions: ClassPromotionInfo[];
}

// V2 응답
export interface PromotionPreviewResponseV2 extends PromotionPreviewResponse {
  students: PromotionPreviewStudentV2[];
  class_auto_count: number;
  class_unassigned_count: number;
}
```

### Phase E: 프론트엔드 훅 확장

**파일**: `frontend/src/hooks/useGradePromotion.ts` (수정)

```typescript
/**
 * 학년 승급 미리보기 V2 (반 정보 포함)
 */
export function usePromotionPreviewV2() {
  return useQuery<PromotionPreviewResponseV2, Error>({
    queryKey: ['grade-promotion', 'preview', 'v2'],
    queryFn: getPromotionPreviewV2,
    staleTime: 1000 * 60 * 5,
    enabled: false,
  });
}
```

### Phase F: UI 확장

**파일**: `frontend/src/pages/admin/OperationsPage.tsx` (수정)

미리보기 테이블에 반 승급 정보 컬럼 추가:

```
┌─────────────────────────────────────────────────────────────────────┐
│  학년 승급 미리보기                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ✅ 자동 반 이동: 45명                                               │
│  ⚠️ 수동 배정 필요: 8명                                              │
│  🎓 졸업 (고3): 12명                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  이름    │ 현재 학년 │ 현재 반        │ → │ 새 학년 │ 새 반          │
│─────────┼──────────┼───────────────┼───┼────────┼───────────────│
│  김철수  │ 중1      │ 중1 수학 심화  │ ✅ │ 중2    │ 중2 수학 심화  │
│         │          │ 중1 영어 기초  │ ✅ │        │ 중2 영어 기초  │
│  박영희  │ 중1      │ 중1 수학 정규1 │ ⚠️ │ 중2    │ (수동 배정)    │
│  이민수  │ 고3      │ 고3 수학 심화  │ 🎓 │ -      │ 졸업          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. DB 스키마 변경

### 3.1 이력 테이블 확장 (선택적)

```sql
-- grade_promotion_history 테이블에 반 변경 정보 추가
-- (필요시 별도 테이블로 분리 가능)

ALTER TABLE grade_promotion_history
ADD COLUMN class_changes JSONB;

-- class_changes 예시:
-- [
--   {
--     "enrollment_id": "uuid",
--     "previous_class_id": "uuid",
--     "previous_class_name": "중1 수학 심화",
--     "new_class_id": "uuid",
--     "new_class_name": "중2 수학 심화",
--     "status": "auto"
--   }
-- ]
```

---

## 4. 개발 순서 및 의존성

```
Phase A (class_parser.py)
    ↓
Phase B (preview API) ← Phase A 의존
    ↓
Phase C (execute API) ← Phase A, B 의존
    ↓
Phase D (Frontend 타입) ← Phase B, C 의존
    ↓
Phase E (Frontend 훅) ← Phase D 의존
    ↓
Phase F (UI) ← Phase E 의존
```

---

## 5. 테스트 체크리스트

### Phase A 테스트
- [ ] `parse_class_name("중1 수학 심화")` → `("중1", "수학 심화")`
- [ ] `parse_class_name("고2 영어 H반")` → `("고2", "영어 H반")`
- [ ] `parse_class_name("올림피아드반")` → `(None, None)`
- [ ] `has_number_suffix("정규1")` → `True`
- [ ] `has_number_suffix("심화")` → `False`

### Phase B 테스트
- [ ] GET /api/grade-promotion/preview/v2 호출 성공
- [ ] 각 학생별 class_promotions 배열 포함
- [ ] class_auto_count, class_unassigned_count 정확한 집계

### Phase C 테스트
- [ ] 승급 실행 시 enrollments.class_id 변경 확인
- [ ] 매칭 실패 시 enrollments.is_active = false 확인
- [ ] 이력에 class_changes 저장 확인

### Phase F 테스트
- [ ] 미리보기 테이블에 반 정보 표시
- [ ] 자동/수동 배정 상태 아이콘 표시
- [ ] 다중 반 등록 학생 모든 반 표시

---

## 6. 예상 에러 및 해결책

| 에러 | 원인 | 해결 |
|------|------|------|
| 반 이름 파싱 실패 | 비표준 반 이름 | status: "unassigned" 처리 |
| 새 반 찾기 실패 | 해당 학년에 반 없음 | status: "unassigned" 처리 |
| enrollment 없음 | 반 미배정 학생 | class_promotions: [] (빈 배열) |
| 다중 enrollment | 과목별 반 등록 | 모든 enrollment 순회 처리 |

---

## 7. 롤백 지원

기존 롤백 로직 확장:
- 학년 복원 (기존)
- 반 등록 복원 (새로 추가)
  - class_id 원복
  - is_active 원복

---

*작성: Claude Code | 2025-12-27*
