# Hyeyum 비즈니스 로직

> Stage 1.3: 핵심 비즈니스 로직 정리
> 작성일: 2025-12-10

---

## 1. 출결 체크 워크플로우

### 1.1 기본 흐름
```
1. 수업 시작 시간 → 출결 체크 화면 진입
2. 해당 반의 등록 학생 목록 로드
3. 각 학생별 상태 선택:
   - 출석 (present)
   - 결석 (absent)
   - 지각 (late)
   - 사유결석 (excused)
4. 사유 입력 (선택)
5. 저장 → attendance 테이블에 upsert
```

### 1.2 데이터 조회 로직
```typescript
// 오늘 수업이 있는 반 목록
const todayClasses = await supabase
  .from('classes')
  .select('*, teacher:profiles(name)')
  .contains('schedule', [{ day: getTodayDayCode() }]);

// 반의 등록 학생 + 오늘 출결 상태
const students = await supabase
  .from('students')
  .select(`
    *,
    enrollments:class_enrollments!inner(status),
    attendance:attendance(status, note)
  `)
  .eq('enrollments.class_id', classId)
  .eq('enrollments.status', 'active')
  .eq('attendance.date', today);
```

### 1.3 저장 로직
```typescript
// Upsert: 같은 날 같은 학생이면 업데이트
await supabase
  .from('attendance')
  .upsert({
    class_id,
    student_id,
    date: today,
    status,
    note
  }, {
    onConflict: 'class_id,student_id,date'
  });
```

---

## 2. 진도 기록 워크플로우

### 2.1 기본 흐름
```
1. 수업 종료 → 진도 기록 화면 진입
2. 이전 수업 진도 자동 표시 (읽기 전용)
3. 오늘 진도 입력:
   - 교재명
   - 시작 페이지 ~ 끝 페이지
   - 학습 주제
   - 메모
4. 저장 → progress 테이블에 insert
```

### 2.2 이전 진도 조회
```typescript
// 가장 최근 진도 기록
const lastProgress = await supabase
  .from('progress')
  .select('*')
  .eq('class_id', classId)
  .order('date', { ascending: false })
  .limit(1)
  .single();
```

### 2.3 UI 표시 로직
```
이전 수업 (2025-01-05)
├── 교재: 개념원리 수학 1
├── 범위: p.45 ~ p.52
└── 주제: 이차함수의 그래프

오늘 수업 (2025-01-07)
├── 교재: [이전 값 자동 입력]
├── 범위: [이전 끝 페이지 + 1]부터 시작
└── 주제: [빈 칸]
```

---

## 3. TODO 관리 워크플로우

### 3.1 TODO 생성 경로
```
1. 대시보드에서 직접 생성
2. 회의에서 자동 생성 (meeting_id 연결)
3. 출결 체크 시 자동 생성 (결석 학생 연락)
```

### 3.2 우선순위 표시
```
high (빨강)   → 긴급한 작업
medium (주황) → 일반 작업
low (회색)    → 낮은 우선순위
```

### 3.3 카테고리
```
attendance → 출결 관련 (결석 학생 연락)
homework   → 숙제 관련
call       → 전화 연락
meeting    → 회의 관련
etc        → 기타
```

### 3.4 완료 처리
```typescript
await supabase
  .from('todos')
  .update({
    completed: true,
    completed_at: new Date().toISOString()
  })
  .eq('id', todoId);
```

---

## 4. 신규 등록 워크플로우

### 4.1 상태 흐름
```
inquiry (문의)
    ↓
scheduled (상담 예약)
    ↓
completed (상담 완료)
    ↓
enrolled (등록 완료) ─── 또는 ─── cancelled (취소)
```

### 4.2 상담 → 학생 등록 전환
```typescript
// 상담 완료 → 학생 테이블에 등록
if (registration.status === 'enrolled') {
  // 1. students 테이블에 추가
  const student = await supabase
    .from('students')
    .insert({
      name: registration.student_name,
      phone: registration.phone,
      grade: registration.grade
    })
    .select()
    .single();

  // 2. 반에 등록
  await supabase
    .from('class_enrollments')
    .insert({
      class_id: selectedClassId,
      student_id: student.id
    });
}
```

---

## 5. 숙제 관리 워크플로우

### 5.1 숙제 등록
```
1. 반 선택
2. 숙제 정보 입력:
   - 제목
   - 교재/페이지 범위
   - 마감일
3. 저장 → homework 테이블에 insert
4. 자동으로 해당 반 학생들의 submission 생성 (not_submitted)
```

### 5.2 제출 확인
```typescript
// 숙제별 학생 제출 현황
const submissions = await supabase
  .from('homework_submissions')
  .select('*, student:students(name)')
  .eq('homework_id', homeworkId);

// 상태 업데이트
await supabase
  .from('homework_submissions')
  .update({
    status: 'submitted',
    submitted_at: new Date().toISOString()
  })
  .eq('id', submissionId);
```

---

## 6. 시험 성적 워크플로우

### 6.1 성적 입력
```
1. 반 선택 + 시험 정보:
   - 시험 유형 (중간/기말/Daily/Weekly/Monthly)
   - 시험 날짜
   - 시험명
2. 학생별 맞춘 문항 / 전체 문항 입력
3. 점수 자동 계산 (DB GENERATED COLUMN)
4. 저장
```

### 6.2 점수 계산
```sql
-- DB에서 자동 계산
score = ROUND((correct_answers / total_questions * 100), 1)

-- 예: 17/20 = 85.0점
```

---

## 7. 회의 관리 워크플로우

### 7.1 회의 등록
```
1. 회의 정보 입력:
   - 제목, 설명
   - 일시, 장소
   - 참석자 범위 (전체/특정/과목별/부서별)
2. 저장 → meetings 테이블에 insert
```

### 7.2 회의록 작성
```
1. 회의 완료 후 상태 변경 (scheduled → completed)
2. 회의록 입력:
   - 회의 내용 (minutes)
   - 결정사항 (decisions)
   - 액션아이템 (action_items)
3. TODO 생성 토글 ON 시:
   - todo_items 배열로 TODO 항목 입력
   - 저장 시 todos 테이블에 자동 insert
```

### 7.3 TODO 자동 생성
```typescript
// 회의에서 TODO 생성
if (createTodos && todoItems.length > 0) {
  for (const item of todoItems) {
    await supabase.from('todos').insert({
      user_id: item.assignee_id || currentUserId,
      title: item.title,
      priority: item.priority,
      category: 'meeting',
      meeting_id: meetingId
    });
  }
}
```

---

## 8. 대시보드 데이터 흐름

### 8.1 오늘 일정
```typescript
// 오늘 수업 목록 (시간순 정렬)
const todaySchedule = await supabase
  .from('classes')
  .select('*, teacher:profiles(name)')
  .contains('schedule', [{ day: getTodayDayCode() }])
  .order('schedule->0->startTime');
```

### 8.2 TODO 목록
```typescript
// 미완료 TODO (마감일 기준 정렬)
const todos = await supabase
  .from('todos')
  .select('*')
  .eq('user_id', currentUserId)
  .eq('completed', false)
  .order('due_date', { ascending: true, nullsFirst: false });
```

### 8.3 공지사항
```typescript
// 고정 공지 + 최근 공지
const announcements = await supabase
  .from('announcements')
  .select('*')
  .or(`is_pinned.eq.true,announcement_date.gte.${weekAgo}`)
  .order('is_pinned', { ascending: false })
  .order('announcement_date', { ascending: false })
  .limit(5);
```

---

## 9. 권한 체계

### 9.1 역할 (role)
```
director  → 원장 (모든 권한)
teacher   → 강사 (담당 반 관리)
assistant → 조교 (제한된 권한)
```

### 9.2 학년 권한 (grade_permissions)
```json
{
  "grades": ["초3", "초4", "초5", "초6"]  // 허용된 학년만 접근
}
```

### 9.3 과목/부서
```typescript
// 과목 기반 필터링
subjects: ['수학', '영어']

// 부서 기반 필터링
department: 'middle'  // 'elementary', 'middle', 'high'
```

---

## 10. 백오피스 MVP 비즈니스 로직

### Phase 1 필수 기능
| 기능 | 비즈니스 로직 |
|------|--------------|
| 오늘 일정 | 오늘 요일에 해당하는 수업 목록 조회 |
| 출결 체크 | 학생 목록 + 상태 upsert |
| 진도 기록 | 이전 진도 조회 + 새 진도 insert |

### Phase 2 핵심 기능
| 기능 | 비즈니스 로직 |
|------|--------------|
| TODO | user_id 기반 CRUD |
| 학생 조회 | 학생 정보 read |
| 반 조회 | 반 + 등록 학생 read |

---

*작성: Claude Code | 2025-12-10*
