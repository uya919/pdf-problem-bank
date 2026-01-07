# 학년 승급 후 반 해제 학생 빠른 재배정 연구 리포트

> 연구 리포트 #440
> 작성일: 2025-12-27
> 참조: [439_class_promotion_development_plan.md](./439_class_promotion_development_plan.md)

---

## 1. 요청 사항

학년 승급 실행 후 **반 해제된 학생들**을 즉시 새 반에 배정할 수 있는 편리한 방법 필요

**현재 상황:**
- 승급 실행 → 일부 학생 반 해제 (수동 배정 필요)
- 기존 반 배정 페이지로 이동해서 수동 작업 필요
- 승급 컨텍스트를 잃어버림 (누가 왜 해제되었는지)

---

## 2. 현재 시스템 분석

### 2.1 기존 반 배정 시스템

**위치**: `/admin/students` → 반배정 버튼 → `/admin/class-assignment`

**주요 기능**:
- 학부/학년/상태 토글 필터
- 학생 테이블 + 다중 선택 (Shift 범위 선택)
- 키보드 단축키 (Ctrl+A 전체선택, Enter 배정)
- 반 선택 모달 → 배정 실행

**장점**:
- 일괄 선택 + 일괄 배정
- 필터링으로 미배정 학생만 표시
- 키보드 단축키로 빠른 조작

**한계**:
- 승급 컨텍스트 없음 (왜 미배정인지 모름)
- 승급 결과 페이지에서 바로 접근 불가
- 학년별로 반복 작업 필요

### 2.2 승급 후 반 해제 정보

```typescript
// 현재 승급 결과에서 제공하는 정보
interface ClassPromotionInfo {
  enrollment_id: string;
  current_class_name: string;  // 예: "중1 수학 심화"
  new_class_name: string | null;  // 예: null (반 해제)
  status: 'unassigned';
  reason: string;  // 예: "번호 붙은 반 (수동 배정 필요)"
}
```

---

## 3. 솔루션 제안

### 3.1 옵션 A: 승급 결과 화면에서 바로 배정 (권장)

**개념**: 승급 완료 후 "수동 배정 필요" 학생 목록에서 바로 반 배정

```
┌─────────────────────────────────────────────────────────────┐
│  학년 승급 완료!                                             │
├─────────────────────────────────────────────────────────────┤
│  학년 승급: 45명  |  졸업: 3명                               │
│  반 자동 이동: 40개  |  수동 배정 필요: 8개                  │
├─────────────────────────────────────────────────────────────┤
│  ⚠️ 수동 배정이 필요한 학생 (8명)                           │
│                                                             │
│  ☐ 김철수   중1→중2  중1 수학 정규1  → (미배정)            │
│  ☐ 박영희   중1→중2  중1 수학 정규2  → (미배정)            │
│  ☐ 이민수   고2→고3  고2 영어 특강   → (미배정)            │
│  ...                                                        │
│                                                             │
│  [전체 선택]  [선택한 학생 반 배정 →]                       │
└─────────────────────────────────────────────────────────────┘
```

**장점**:
- 승급 컨텍스트 유지 (이전 반, 해제 사유)
- 승급 → 배정 워크플로우 자연스러움
- 추가 페이지 이동 없음

**단점**:
- 모달이 복잡해질 수 있음
- 학년별로 다른 반 목록 필요

### 3.2 옵션 B: 반 배정 페이지로 필터링 이동

**개념**: "수동 배정 필요" 버튼 → 반 배정 페이지로 이동 + 필터 자동 적용

```
승급 결과 화면:
[수동 배정 필요: 8명] → 클릭 → /admin/class-assignment?filter=unassigned&from=promotion
```

**장점**:
- 기존 반 배정 UI 재사용
- 구현 간단

**단점**:
- 승급 컨텍스트 손실
- 페이지 이동 필요

### 3.3 옵션 C: 학년별 퀵 배정 패널

**개념**: 결과 화면에서 학년별로 접을 수 있는 패널 + 드래그&드롭

```
┌─────────────────────────────────────────────────────────────┐
│  ▼ 중2 (3명 미배정)                                         │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│    │ 중2 수학 심화│  │ 중2 수학 정규│  │ 중2 수학 기초│       │
│    │ (12/15명)   │  │ (8/15명)    │  │ (5/15명)    │       │
│    └─────────────┘  └─────────────┘  └─────────────┘       │
│    김철수, 박영희, 이민수 ← 드래그해서 반에 배정             │
├─────────────────────────────────────────────────────────────┤
│  ▼ 고3 (2명 미배정)                                         │
│    ...                                                      │
└─────────────────────────────────────────────────────────────┘
```

**장점**:
- 시각적으로 직관적
- 정원 현황 한눈에 파악

**단점**:
- 드래그&드롭 구현 복잡
- 모바일 지원 어려움

---

## 4. 권장 솔루션: 옵션 A (승급 결과 화면 내 배정)

### 4.1 설계

**단계 추가**: `promotionStep: 'preview' | 'confirm' | 'result' | 'assign'`

```typescript
// 새 step: 'assign' 추가
{promotionStep === 'assign' && (
  <div>
    {/* 학년별 그룹 */}
    {Object.entries(unassignedByGrade).map(([grade, students]) => (
      <div key={grade}>
        <h4>{grade} ({students.length}명)</h4>

        {/* 학생 체크박스 목록 */}
        <table>
          {students.map(student => (
            <tr>
              <td><input type="checkbox" /></td>
              <td>{student.name}</td>
              <td>{student.previous_class_name}</td>
              <td>{student.reason}</td>
            </tr>
          ))}
        </table>

        {/* 해당 학년 반 목록 */}
        <div className="flex gap-2">
          {classesForGrade.map(cls => (
            <button>{cls.name}</button>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

### 4.2 데이터 흐름

```
승급 실행
    ↓
결과 저장 (unassigned 목록)
    ↓
"수동 배정하기" 클릭
    ↓
학년별 그룹화 + 반 목록 조회
    ↓
학생 선택 + 반 선택
    ↓
배정 API 호출 (enrollments.class_id 변경 + is_active=true)
    ↓
완료
```

### 4.3 필요한 API 변경

**새 엔드포인트 (선택)**: `POST /api/enrollments/batch-assign`

```python
@router.post("/batch-assign")
async def batch_assign_enrollments(request: BatchAssignRequest):
    """
    복수 enrollment의 class_id를 일괄 변경

    - enrollment_ids: 변경할 enrollment ID 목록
    - new_class_id: 새 반 ID
    """
    # 1. enrollments 조회
    # 2. class_id 업데이트 + is_active=True
    # 3. 결과 반환
```

**또는 기존 API 활용**:
- `useAssignStudents` 훅 사용 (`assign_students_to_class` RPC)
- 단, enrollment_id 기반이 아닌 student_id 기반

### 4.4 UI 컴포넌트 구조

```
OperationsPage.tsx
└── AcademySettingsView
    └── 승급 모달
        ├── preview step
        ├── confirm step
        ├── result step
        └── assign step (새로 추가)
            ├── UnassignedStudentsTable (학년별 그룹)
            │   ├── 체크박스
            │   ├── 학생명
            │   ├── 이전 반
            │   └── 해제 사유
            └── ClassSelectionPanel (학년별 반 목록)
                └── 반 버튼들 (정원 표시)
```

---

## 5. 상세 구현 설계

### 5.1 상태 관리

```typescript
// 새로운 상태 추가
const [assignStep, setAssignStep] = useState<'select' | 'confirm' | 'done'>('select');
const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
const [targetClassId, setTargetClassId] = useState<string | null>(null);
const [currentGrade, setCurrentGrade] = useState<string | null>(null);
```

### 5.2 학년별 그룹화 로직

```typescript
// 승급 결과에서 미배정 학생 추출 및 그룹화
const unassignedByGrade = useMemo(() => {
  if (!executePromotion.data) return {};

  // class_changes에서 unassigned만 필터
  const allUnassigned: Array<{
    studentId: string;
    studentName: string;
    newGrade: string;
    enrollmentId: string;
    previousClassName: string;
    reason: string;
  }> = [];

  // history_records를 파싱해서 unassigned 추출
  // ...

  // 학년별 그룹화
  return groupBy(allUnassigned, 'newGrade');
}, [executePromotion.data]);
```

### 5.3 반 목록 조회

```typescript
// 특정 학년의 반 목록
const { data: classesForGrade } = useClasses({
  grade: currentGrade,
  is_active: true
});
```

### 5.4 배정 실행

```typescript
const handleQuickAssign = async () => {
  if (!targetClassId || selectedEnrollments.size === 0) return;

  // 선택된 enrollment들의 class_id 변경
  for (const enrollmentId of selectedEnrollments) {
    await supabase.from('enrollments')
      .update({
        class_id: targetClassId,
        is_active: true
      })
      .eq('id', enrollmentId);
  }

  // 완료 처리
  setAssignStep('done');
  setSelectedEnrollments(new Set());
};
```

---

## 6. 대안: 더 간단한 솔루션

### 6.1 결과 화면에서 링크만 제공

```tsx
// 결과 화면에 추가
{executePromotion.data?.class_unassigned > 0 && (
  <div className="mt-4 p-4 bg-amber-50 rounded-xl">
    <p className="text-amber-700">
      ⚠️ {executePromotion.data.class_unassigned}개의 반 등록이 해제되었습니다.
    </p>
    <button
      onClick={() => navigate('/admin/class-assignment?filter=unassigned')}
      className="mt-2 text-blue-600 hover:underline"
    >
      → 미배정 학생 반 배정하러 가기
    </button>
  </div>
)}
```

**장점**: 구현 매우 간단
**단점**: 승급 컨텍스트 손실

### 6.2 토스트 + 빠른 액션

```tsx
// 성공 토스트에 액션 버튼 추가
{showSuccess && (
  <div className="fixed bottom-6 right-6 bg-white shadow-xl rounded-xl p-4">
    <p>✅ 승급 완료 (미배정 8명)</p>
    <div className="mt-2 flex gap-2">
      <button onClick={handleCloseModal}>닫기</button>
      <button onClick={() => setPromotionStep('assign')}>
        바로 배정하기
      </button>
    </div>
  </div>
)}
```

---

## 7. 구현 복잡도 비교

| 옵션 | 복잡도 | 개발 시간 | UX |
|------|--------|----------|-----|
| A: 모달 내 배정 | 중 | 4-6시간 | ⭐⭐⭐⭐⭐ |
| B: 페이지 이동 | 하 | 1시간 | ⭐⭐⭐ |
| C: 드래그&드롭 | 상 | 8-12시간 | ⭐⭐⭐⭐ |
| 간단 링크 | 최하 | 30분 | ⭐⭐ |

---

## 8. 권장 구현 순서

### Phase 1: 간단 링크 (30분)
- 결과 화면에 "반 배정 페이지로 이동" 링크 추가
- 즉시 사용 가능

### Phase 2: 모달 내 배정 (추후)
- `assign` step 추가
- 학년별 그룹화 UI
- 반 선택 + 배정 실행

---

## 9. 결론

### 즉시 구현 가능 (Phase 1)
- 결과 화면에 반 배정 페이지 링크 추가
- 30분 내 완료 가능

### 향후 개선 (Phase 2)
- 승급 모달 내에서 바로 배정하는 기능
- 학년별 그룹화 + 반 선택 UI
- 승급 컨텍스트 유지

---

*작성: Claude Code | 2025-12-27*
