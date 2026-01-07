# Stage 36: 강사 기록 페이지 Supabase 연결 개발 계획

> 작성일: 2025-12-31
> 상태: 계획 수립 완료

---

## 1. 현황 분석

### 1.1 현재 상태

| 탭 | 현재 데이터 | Supabase 훅 | 상태 |
|---|---|---|---|
| 출결 (AttendanceTab) | `useAttendanceByDate` | ✅ 연결됨 | 완료 |
| 진도 (ProgressTab) | `DUMMY_CLASS_PROGRESS`, `DUMMY_PROGRESS_HISTORY` | ❌ Mock | **수정 필요** |
| 숙제 (HomeworkTab) | `DUMMY_HOMEWORK`, `DUMMY_UNSUBMITTED` | ❌ Mock | **수정 필요** |
| 성적 (GradeTab) | `DUMMY_TESTS` | ❌ Mock | **수정 필요** |

### 1.2 기존 Supabase 훅 현황

#### 진도 관련 (`useProgress.ts`)
- `useProgress(classId)` - 반별 진도 조회
- `useTodayProgress(teacherId)` - 오늘 진도 현황
- `useProgressForTeacherByDate(teacherId, date)` - 선생님별 날짜 진도 ✅ **사용 가능**

#### 숙제 관련 (`useHomework.ts`)
- `useHomework(classId)` - 반별 숙제 조회 (submissions 포함)
- `useTodayHomework(teacherId)` - 오늘 숙제 현황
- `useHomeworkForTeacherByDate(teacherId, date)` - 선생님별 날짜 숙제 ✅ **사용 가능**

#### 성적 관련 (`useExamScores.ts`)
- `useExamScores(classId)` - 반별 성적 조회
- ⚠️ **선생님별 조회 훅 없음** → 신규 구현 필요

### 1.3 Mock 데이터 구조 분석

```typescript
// 진도 - 반별 진도 현황
interface ClassProgress {
  classId: string;
  className: string;
  currentUnit: number;    // 현재 단원
  totalUnits: number;     // 전체 단원
  recentTopic: string;    // 최근 주제
}

// 진도 - 기록 히스토리
interface ProgressRecord {
  id: string;
  classId: string;
  className: string;
  date: string;           // "12/11" 형태
  unitNumber: number;
  unitTitle: string;
}

// 숙제
interface HomeworkRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  assignment: string;     // "p.42~45"
  submittedCount: number;
  totalCount: number;
}

// 미제출 학생
interface UnsubmittedStudent {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  consecutiveMissCount: number;  // 연속 미제출 횟수
}

// 성적
interface TestRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  testName: string;
  scores: StudentScore[];
}

interface StudentScore {
  studentId: string;
  studentName: string;
  score: number;
  previousScore?: number;  // 이전 점수 (변화 계산용)
}
```

---

## 2. 개발 계획

### Phase 36-A: 진도 탭 Supabase 연결

#### 수정 파일
- `frontend/src/pages/backoffice/RecordsPage.tsx`
  - `ProgressTab` 컴포넌트 수정

#### 신규 훅 추가 (선택사항)
- `useProgressHistory(teacherId, date)` - 최근 진도 기록 조회

#### 작업 내용
1. `ProgressTab`에 `useProgressForTeacherByDate` 훅 연결
2. 반별 진도율 계산 로직 추가
   - progress 테이블의 pages 필드를 파싱하여 진행률 추정
   - 또는 반별 교재 정보(class_textbooks)와 연동
3. Mock Fallback 패턴 적용

#### 구현 상세
```typescript
function ProgressTab({ selectedClassId, teacherId }: {
  selectedClassId: string | null;
  teacherId: string | null;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회
  const { data: progressData } = useProgressForTeacherByDate(teacherId, dateStr);

  // Mock Fallback
  const classProgress = useMemo(() => {
    if (progressData && (progressData.recorded.length > 0 || progressData.notRecorded.length > 0)) {
      // Supabase 데이터를 ClassProgress 형태로 변환
      return [...progressData.recorded, ...progressData.notRecorded].map(cls => ({
        classId: cls.id,
        className: cls.name,
        currentUnit: 0,  // progress 테이블에서 추가 조회 필요
        totalUnits: 25,  // 교재 정보에서 가져오기
        recentTopic: '', // 마지막 진도 topic
      }));
    }
    return DUMMY_CLASS_PROGRESS;
  }, [progressData]);

  // ...
}
```

---

### Phase 36-B: 숙제 탭 Supabase 연결

#### 수정 파일
- `frontend/src/pages/backoffice/RecordsPage.tsx`
  - `HomeworkTab` 컴포넌트 수정

#### 신규 훅 추가
- `useUnsubmittedStudents(teacherId)` - 미제출 학생 목록 (연속 미제출 횟수 포함)

#### 작업 내용
1. `HomeworkTab`에 `useHomeworkForTeacherByDate` 훅 연결
2. 반별 그룹핑 로직 유지
3. 미제출 학생 조회 로직 추가 (연속 미제출 횟수 계산)
4. Mock Fallback 패턴 적용

#### 신규 훅 구현 (`useHomework.ts`에 추가)
```typescript
/**
 * 미제출 학생 목록 조회 (연속 미제출 횟수 포함)
 *
 * @param teacherId - 선생님 ID
 */
export function useUnsubmittedStudents(teacherId: string | null) {
  return useQuery({
    queryKey: ['homework', 'unsubmitted', teacherId],
    queryFn: async () => {
      if (!teacherId) return [];

      // 1. 선생님 담당 반 조회
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      // 2. 각 반의 최근 N개 숙제에서 미제출 학생 추출
      // ... (구현)

      return unsubmittedStudents;
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}
```

---

### Phase 36-C: 성적 탭 Supabase 연결

#### 수정 파일
- `frontend/src/pages/backoffice/RecordsPage.tsx`
  - `GradeTab` 컴포넌트 수정
- `frontend/src/hooks/backoffice/useExamScores.ts`
  - 신규 훅 추가

#### 신규 훅 추가
- `useExamScoresForTeacher(teacherId)` - 선생님 담당 반 성적 조회
- `useRecentExams(teacherId, limit)` - 최근 시험 목록

#### 작업 내용
1. 선생님별 성적 조회 훅 추가
2. `GradeTab`에 신규 훅 연결
3. 성적 분포, 평균, 최고/최저점 계산 로직 유지
4. 이전 점수 비교 로직 추가 (성적 하락 경고)
5. Mock Fallback 패턴 적용

#### 신규 훅 구현 (`useExamScores.ts`에 추가)
```typescript
/**
 * 선생님 담당 반 성적 조회
 *
 * @param teacherId - 선생님 ID
 * @param options - 조회 옵션 { limit?: number }
 */
export function useExamScoresForTeacher(
  teacherId: string | null,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: ['exam_scores', 'teacher', teacherId, options?.limit],
    queryFn: async () => {
      if (!teacherId) return [];

      // 1. 담당 반 조회
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      const classIds = (classes || []).map(c => c.id);
      if (classIds.length === 0) return [];

      // 2. 반별 최근 시험 조회
      const { data: exams } = await supabase
        .from('exam_scores')
        .select(`
          *,
          class:classes(id, name),
          student:students(id, name)
        `)
        .in('class_id', classIds)
        .order('exam_date', { ascending: false })
        .limit(options?.limit || 100);

      // 3. 시험별로 그룹핑
      return groupExamsByTest(exams);
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}
```

---

### Phase 36-D: 테스트 및 디버깅

#### 테스트 항목
1. **진도 탭**
   - [ ] 날짜 변경 시 데이터 갱신
   - [ ] 반 필터 적용 확인
   - [ ] 진도율 바 표시 확인
   - [ ] 진도 기록 히스토리 표시

2. **숙제 탭**
   - [ ] 반별 숙제 현황 표시
   - [ ] 미제출 학생 목록 표시
   - [ ] 연속 미제출 횟수 표시
   - [ ] 제출률 계산 정확성

3. **성적 탭**
   - [ ] 시험 목록 표시
   - [ ] 성적 분포 차트 표시
   - [ ] 평균/최고/최저점 계산
   - [ ] 성적 하락 학생 경고 표시

4. **공통**
   - [ ] Supabase 데이터 없을 때 Mock Fallback
   - [ ] 로딩 상태 표시
   - [ ] 에러 처리
   - [ ] 모바일/태블릿 반응형

---

## 3. 파일별 수정 내역

| 파일 | 수정 내용 | Phase |
|---|---|---|
| `RecordsPage.tsx` | ProgressTab 수정 | 36-A |
| `RecordsPage.tsx` | HomeworkTab 수정 | 36-B |
| `RecordsPage.tsx` | GradeTab 수정 | 36-C |
| `useHomework.ts` | `useUnsubmittedStudents` 훅 추가 | 36-B |
| `useExamScores.ts` | `useExamScoresForTeacher` 훅 추가 | 36-C |

---

## 4. 예상 에러 및 대응

| 에러 | 원인 | 해결 |
|---|---|---|
| 진도율 계산 불가 | pages 필드 형식 다양 | 정규식 파싱 또는 기본값 사용 |
| 연속 미제출 횟수 계산 느림 | N+1 쿼리 | 서브쿼리 또는 배치 처리 |
| 이전 점수 없음 | 첫 시험인 경우 | null 체크 후 변화율 생략 |
| 타입 불일치 | Supabase 응답 vs Mock 타입 | 명시적 타입 변환 함수 |

---

## 5. 환경변수

추가 환경변수 필요 없음. 기존 Supabase 연결 사용.

---

## 6. 개발 순서

```
1. Phase 36-A: 진도 탭 (가장 단순)
   ↓
2. Phase 36-B: 숙제 탭 (미제출 학생 훅 추가)
   ↓
3. Phase 36-C: 성적 탭 (신규 훅 추가)
   ↓
4. Phase 36-D: 테스트 및 디버깅
```

---

## 7. 참조

- `RecordsPage.tsx`: 52~199줄 (Mock 데이터 정의)
- `useProgress.ts`: `useProgressForTeacherByDate` (266~332줄)
- `useHomework.ts`: `useHomeworkForTeacherByDate` (219~278줄)
- `useExamScores.ts`: 기존 훅 참고

---

*v1.0 - 2025-12-31*
