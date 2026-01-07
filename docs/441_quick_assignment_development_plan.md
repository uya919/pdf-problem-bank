# 승급 후 반 해제 학생 빠른 재배정 개발 계획

> 개발 계획 #441
> 작성일: 2025-12-27
> 참조: [440_class_unassigned_quick_assignment_research.md](./440_class_unassigned_quick_assignment_research.md)

---

## 1. 개요

학년 승급 실행 후 **반 해제된 학생들**을 빠르게 새 반에 배정하는 기능 개발

### 구현 범위

| Phase | 설명 | 예상 시간 |
|-------|------|----------|
| **Phase 1** | 결과 화면에 반 배정 페이지 링크 추가 | 30분 |
| **Phase 2** | 승급 모달 내 학년별 퀵 배정 UI | 4시간 |

---

## 2. Phase 1: 간단 링크 추가

### 2.1 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/pages/admin/OperationsPage.tsx` | result step에 링크 버튼 추가 |

### 2.2 구현 상세

**위치**: `promotionStep === 'result'` 섹션 (라인 1006 부근)

```tsx
// 수동 배정 필요 시 링크 표시
{executePromotion.data?.class_unassigned > 0 && (
  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
    <div className="flex items-center gap-2 text-amber-700 mb-2">
      <AlertTriangle className="w-4 h-4" />
      <span className="font-medium">
        {executePromotion.data.class_unassigned}개 반 등록이 해제되었습니다
      </span>
    </div>
    <button
      onClick={() => {
        setShowPromotionModal(false);
        navigate('/admin/class-assignment');
      }}
      className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
    >
      → 미배정 학생 반 배정하러 가기
    </button>
  </div>
)}
```

### 2.3 체크리스트

- [ ] result step에 조건부 링크 추가
- [ ] navigate import 확인
- [ ] 빌드 테스트

---

## 3. Phase 2: 모달 내 퀵 배정 UI

### 3.1 설계 개요

```
promotionStep 확장: 'preview' | 'confirm' | 'result' | 'assign'
                                                        ↑ 새로 추가
```

**UI 흐름**:
```
result step
    ↓
"바로 배정하기" 클릭
    ↓
assign step (학년별 그룹 + 반 선택 + 배정)
    ↓
완료 → 모달 닫기
```

### 3.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/api/gradePromotion.ts` | `UnassignedStudentInfo` 타입 추가 |
| `frontend/src/hooks/useGradePromotion.ts` | `useBatchAssignEnrollments` 훅 추가 |
| `frontend/src/pages/admin/OperationsPage.tsx` | `assign` step UI 추가 |
| `backend/app/routers/grade_promotion.py` | `batch-assign` 엔드포인트 추가 |

### 3.3 타입 정의

```typescript
// frontend/src/api/gradePromotion.ts

/**
 * 미배정 학생 정보 (assign step용)
 */
export interface UnassignedStudentInfo {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  previousClassName: string;
  newGrade: string;
  reason: string;
}

/**
 * 일괄 배정 요청
 */
export interface BatchAssignRequest {
  enrollment_ids: string[];
  new_class_id: string;
}

/**
 * 일괄 배정 응답
 */
export interface BatchAssignResponse {
  success: boolean;
  assigned_count: number;
  message: string;
}

// API 함수
export async function batchAssignEnrollments(
  request: BatchAssignRequest
): Promise<BatchAssignResponse> {
  const response = await apiClient.post<BatchAssignResponse>(
    '/api/grade-promotion/batch-assign',
    request
  );
  return response.data;
}
```

### 3.4 백엔드 API

```python
# backend/app/routers/grade_promotion.py

class BatchAssignRequest(BaseModel):
    """일괄 배정 요청"""
    enrollment_ids: List[str]
    new_class_id: str

class BatchAssignResponse(BaseModel):
    """일괄 배정 응답"""
    success: bool
    assigned_count: int
    message: str

@router.post("/batch-assign", response_model=BatchAssignResponse)
async def batch_assign_enrollments(request: BatchAssignRequest):
    """
    미배정 enrollment들을 특정 반에 일괄 배정

    1. enrollment.class_id 변경
    2. enrollment.is_active = True
    """
    supabase = get_supabase_admin()

    assigned_count = 0
    for enrollment_id in request.enrollment_ids:
        result = supabase.from_("enrollments") \
            .update({
                "class_id": request.new_class_id,
                "is_active": True
            }) \
            .eq("id", enrollment_id) \
            .execute()

        if result.data:
            assigned_count += 1

    return BatchAssignResponse(
        success=True,
        assigned_count=assigned_count,
        message=f"{assigned_count}개 등록 완료"
    )
```

### 3.5 프론트엔드 훅

```typescript
// frontend/src/hooks/useGradePromotion.ts

/**
 * 미배정 enrollment 일괄 배정
 */
export function useBatchAssignEnrollments() {
  const queryClient = useQueryClient();

  return useMutation<BatchAssignResponse, Error, BatchAssignRequest>({
    mutationFn: batchAssignEnrollments,
    onSuccess: () => {
      // 관련 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['grade-promotion'] });
    },
  });
}
```

### 3.6 UI 컴포넌트 (OperationsPage.tsx)

#### 3.6.1 상태 추가

```typescript
// 기존 상태
const [promotionStep, setPromotionStep] = useState<'preview' | 'confirm' | 'result' | 'assign'>('preview');

// 새 상태 추가
const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
const [assignGradeFilter, setAssignGradeFilter] = useState<string | null>(null);
```

#### 3.6.2 데이터 추출 로직

```typescript
// 미배정 학생 추출 (executePromotion.data에서)
const unassignedStudents = useMemo(() => {
  if (!executePromotion.data) return [];

  // preview 데이터에서 unassigned status인 학생들 추출
  // (executePromotion.data에는 class_changes가 history_records에 저장됨)
  // preview 데이터를 활용하거나 별도 API 필요

  return preview?.students
    .flatMap(student =>
      student.class_promotions
        .filter(cp => cp.status === 'unassigned')
        .map(cp => ({
          studentId: student.id,
          studentName: student.name,
          enrollmentId: cp.enrollment_id,
          previousClassName: cp.current_class_name,
          newGrade: student.next_grade || '',
          reason: cp.reason || ''
        }))
    ) || [];
}, [preview, executePromotion.data]);

// 학년별 그룹화
const unassignedByGrade = useMemo(() => {
  return unassignedStudents.reduce((acc, student) => {
    const grade = student.newGrade;
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(student);
    return acc;
  }, {} as Record<string, typeof unassignedStudents>);
}, [unassignedStudents]);
```

#### 3.6.3 assign step UI

```tsx
{promotionStep === 'assign' && (
  <div className="space-y-4">
    {/* 헤더 */}
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold text-grey-900">
        수동 배정이 필요한 학생 ({unassignedStudents.length}명)
      </h3>
      <button
        onClick={() => setPromotionStep('result')}
        className="text-sm text-grey-500 hover:text-grey-700"
      >
        ← 결과로 돌아가기
      </button>
    </div>

    {/* 학년 필터 탭 */}
    <div className="flex gap-2 border-b border-grey-200 pb-2">
      <button
        onClick={() => setAssignGradeFilter(null)}
        className={`px-3 py-1.5 text-sm rounded-lg ${
          assignGradeFilter === null
            ? 'bg-blue-100 text-blue-700 font-medium'
            : 'text-grey-600 hover:bg-grey-100'
        }`}
      >
        전체 ({unassignedStudents.length})
      </button>
      {Object.entries(unassignedByGrade).map(([grade, students]) => (
        <button
          key={grade}
          onClick={() => setAssignGradeFilter(grade)}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            assignGradeFilter === grade
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-grey-600 hover:bg-grey-100'
          }`}
        >
          {grade} ({students.length})
        </button>
      ))}
    </div>

    {/* 학생 목록 (체크박스) */}
    <div className="border border-grey-200 rounded-xl overflow-hidden">
      <div className="max-h-[250px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-grey-50 sticky top-0">
            <tr>
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedEnrollmentIds.size === filteredStudents.length && filteredStudents.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEnrollmentIds(new Set(filteredStudents.map(s => s.enrollmentId)));
                    } else {
                      setSelectedEnrollmentIds(new Set());
                    }
                  }}
                  className="rounded border-grey-300"
                />
              </th>
              <th className="px-3 py-2 text-left text-grey-600 font-medium">이름</th>
              <th className="px-3 py-2 text-left text-grey-600 font-medium">학년</th>
              <th className="px-3 py-2 text-left text-grey-600 font-medium">이전 반</th>
              <th className="px-3 py-2 text-left text-grey-600 font-medium">사유</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grey-100">
            {filteredStudents.map((student) => (
              <tr key={student.enrollmentId} className="hover:bg-grey-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedEnrollmentIds.has(student.enrollmentId)}
                    onChange={(e) => {
                      setSelectedEnrollmentIds(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(student.enrollmentId);
                        } else {
                          next.delete(student.enrollmentId);
                        }
                        return next;
                      });
                    }}
                    className="rounded border-grey-300"
                  />
                </td>
                <td className="px-3 py-2 font-medium">{student.studentName}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                    {student.newGrade}
                  </span>
                </td>
                <td className="px-3 py-2 text-grey-600">{student.previousClassName}</td>
                <td className="px-3 py-2 text-grey-500 text-xs">{student.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* 반 선택 + 배정 버튼 */}
    {selectedEnrollmentIds.size > 0 && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">
            {selectedEnrollmentIds.size}명 선택됨
          </span>
          <div className="flex items-center gap-2">
            <select
              value={targetClassId || ''}
              onChange={(e) => setTargetClassId(e.target.value || null)}
              className="text-sm border border-grey-300 rounded-lg px-3 py-1.5"
            >
              <option value="">반 선택...</option>
              {classesForGrade?.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleQuickAssign}
              disabled={!targetClassId || batchAssign.isPending}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
            >
              {batchAssign.isPending ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

### 3.7 의존성

```
useClasses (기존)
  ↓
classesForGrade 조회 (선택된 학년 기준)
  ↓
useBatchAssignEnrollments (새로 추가)
  ↓
배정 실행
```

---

## 4. 구현 순서

### Phase 1 (30분)

| 단계 | 작업 | 파일 |
|------|------|------|
| 1-1 | result step에 링크 버튼 추가 | OperationsPage.tsx |
| 1-2 | 빌드 테스트 | - |

### Phase 2 (4시간)

| 단계 | 작업 | 파일 |
|------|------|------|
| 2-1 | 백엔드 batch-assign API 추가 | grade_promotion.py |
| 2-2 | API 타입 + 함수 추가 | gradePromotion.ts |
| 2-3 | useBatchAssignEnrollments 훅 추가 | useGradePromotion.ts |
| 2-4 | promotionStep 확장 + 상태 추가 | OperationsPage.tsx |
| 2-5 | 미배정 학생 추출 로직 | OperationsPage.tsx |
| 2-6 | assign step UI 구현 | OperationsPage.tsx |
| 2-7 | 반 목록 조회 + 배정 실행 로직 | OperationsPage.tsx |
| 2-8 | 빌드 테스트 | - |

---

## 5. 테스트 체크리스트

### Phase 1
- [ ] 승급 실행 후 result 화면에서 링크 표시 확인
- [ ] 링크 클릭 시 반 배정 페이지로 이동 확인
- [ ] class_unassigned = 0일 때 링크 숨김 확인

### Phase 2
- [ ] "바로 배정하기" 클릭 시 assign step 전환
- [ ] 학년 필터 탭 동작 확인
- [ ] 체크박스 선택/해제 동작 확인
- [ ] 전체 선택 동작 확인
- [ ] 반 목록 로딩 확인 (선택 학년 기준)
- [ ] 배정 실행 후 목록에서 제거 확인
- [ ] 모든 배정 완료 시 result step으로 복귀

---

## 6. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| preview 데이터 없음 | 모달 재진입 시 | preview 캐시 유지 또는 재조회 |
| 반 목록 비어있음 | 학년 매칭 실패 | 학년 ID로 조회하도록 수정 |
| 배정 후 목록 갱신 안됨 | 캐시 무효화 누락 | queryClient.invalidateQueries 확인 |

---

## 7. plan.md 업데이트 필요

```markdown
### Stage 32: 승급 후 빠른 반 배정

- [ ] Phase 1: 결과 화면 링크 추가
- [ ] Phase 2: 모달 내 퀵 배정 UI
```

---

*작성: Claude Code | 2025-12-27*
