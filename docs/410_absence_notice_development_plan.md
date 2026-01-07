# 410. 결석 공지 시스템 개발 계획

> **Stage 17**: 결석 공지 + 담당 강사 확인 → 출결 반영

---

## 1. 개요

### 1.1 목표
- 관리자가 `@학생이름`으로 결석 공지 등록
- 해당 학생의 담당 강사만 공지 확인 가능
- 강사가 "확인" 버튼 클릭 시 출결에 결석 반영

### 1.2 데이터 흐름

```
관리자                     강사                      시스템
   │                        │                         │
   │ 1. 결석 공지 작성       │                         │
   │    @홍길동, 병원예약    │                         │
   ├───────────────────────────────────────────────────>│
   │                        │                         │
   │                        │  2. 담당 강사에게 표시   │
   │                        │<────────────────────────│
   │                        │                         │
   │                        │ 3. "확인" 버튼 클릭      │
   │                        ├────────────────────────>│
   │                        │                         │
   │                        │     4. 출결 결석 반영    │
   │                        │     5. 공지 읽음 처리    │
   │                        │<────────────────────────│
```

### 1.3 참조 문서
- [409_absence_notification_system_feasibility_report.md](409_absence_notification_system_feasibility_report.md)

---

## 2. 데이터베이스 스키마

### 2.1 notices 테이블 확장

```sql
-- 기존 notices 테이블에 컬럼 추가
ALTER TABLE notices ADD COLUMN tagged_student_id UUID REFERENCES students(id);
ALTER TABLE notices ADD COLUMN absence_reason TEXT;

-- 인덱스
CREATE INDEX idx_notices_tagged_student ON notices(tagged_student_id);
CREATE INDEX idx_notices_type_student ON notices(type, tagged_student_id);
```

### 2.2 notice_recipients 테이블 (신규)

```sql
-- 공지 수신자 테이블
CREATE TABLE notice_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),

  -- 읽음/확인 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- 출결 반영 상태
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(notice_id, teacher_id)
);

-- 인덱스
CREATE INDEX idx_notice_recipients_teacher ON notice_recipients(teacher_id);
CREATE INDEX idx_notice_recipients_notice ON notice_recipients(notice_id);
CREATE INDEX idx_notice_recipients_unconfirmed ON notice_recipients(teacher_id, is_confirmed)
  WHERE is_confirmed = FALSE;

-- RLS
ALTER TABLE notice_recipients ENABLE ROW LEVEL SECURITY;

-- 강사: 본인 수신 공지만 조회/수정
CREATE POLICY "teacher_own_recipients" ON notice_recipients
  FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE user_id = auth.uid()
    )
  );

-- 관리자: 전체 조회/수정
CREATE POLICY "admin_all_recipients" ON notice_recipients
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 2.3 attendance 테이블 확장

```sql
-- 결석 공지 연결 컬럼 추가
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source_notice_id UUID REFERENCES notices(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS absence_reason TEXT;

-- 인덱스
CREATE INDEX idx_attendance_source_notice ON attendance(source_notice_id);
```

---

## 3. 타입 정의

### 3.1 types/admin.ts 확장

```typescript
// =====================================================
// 결석 공지 타입 (Stage 17)
// =====================================================

/** 태그된 학생 정보 */
export interface TaggedStudent {
  id: string;
  name: string;
  grade?: string;
  school?: string;
}

/** 공지 수신자 (담당 강사) */
export interface NoticeRecipient {
  id: string;
  noticeId: string;
  teacherId: string;
  teacherName?: string;
  isRead: boolean;
  readAt?: string;
  isConfirmed: boolean;  // 출결 반영 확인
  confirmedAt?: string;
  createdAt: string;
}

/** 결석 공지 확장 (기존 Notice 확장) */
export interface AbsenceNotice extends Notice {
  type: 'absence';
  taggedStudentId: string;
  taggedStudent?: TaggedStudent;
  absenceReason?: string;
  recipients?: NoticeRecipient[];
}

/** 공지 작성 입력 */
export interface CreateAbsenceNoticeInput {
  title: string;
  description?: string;
  date: string;
  taggedStudentId: string;
  absenceReason?: string;
}
```

### 3.2 types/attendance.ts 확장

```typescript
/** 출석 상태 확장 */
export type AttendanceStatus =
  | 'present'          // 출석
  | 'absent'           // 결석
  | 'absent_notified'  // 사전 결석 (공지 통해)
  | 'late'             // 지각
  | 'early_leave';     // 조퇴

/** 출석 기록 */
export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  absenceReason?: string;
  sourceNoticeId?: string;  // 결석 공지 연결
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Phase별 개발 계획

### Phase 17-1: DB 마이그레이션 + 타입 정의
**예상 시간**: 30분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `supabase/migrations/xxx_extend_notices_for_absence.sql` | notices 테이블 확장 |
| 2 | `supabase/migrations/xxx_create_notice_recipients.sql` | notice_recipients 테이블 |
| 3 | `supabase/migrations/xxx_extend_attendance.sql` | attendance 테이블 확장 |
| 4 | `frontend/src/types/admin.ts` | 결석 공지 타입 추가 |

**완료 조건**:
- [ ] 마이그레이션 SQL 작성 (Mock 모드에서는 스킵)
- [ ] 타입 정의 완료
- [ ] 빌드 성공

---

### Phase 17-2: 학생 검색 API + 훅
**예상 시간**: 1시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/api/students.ts` | 학생 검색 API |
| 2 | `frontend/src/hooks/useStudentSearch.ts` | 학생 검색 훅 (debounce) |

**useStudentSearch.ts**:
```typescript
interface UseStudentSearchOptions {
  query: string;
  enabled?: boolean;
  limit?: number;
}

export function useStudentSearch(options: UseStudentSearchOptions) {
  const { query, enabled = true, limit = 10 } = options;

  return useQuery({
    queryKey: ['students', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data } = await supabase
        .from('students')
        .select('id, name, grade_id, school')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(limit);

      return data || [];
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}
```

**완료 조건**:
- [ ] 학생 이름 검색 동작
- [ ] 2글자 이상 입력 시 검색
- [ ] debounce 적용 (300ms)

---

### Phase 17-3: @멘션 입력 컴포넌트
**예상 시간**: 1.5시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/components/admin/notices/StudentMention.tsx` | @멘션 자동완성 |
| 2 | `frontend/src/components/admin/notices/StudentTag.tsx` | 선택된 학생 태그 |

**StudentMention.tsx**:
```typescript
interface StudentMentionProps {
  value: TaggedStudent | null;
  onChange: (student: TaggedStudent | null) => void;
  placeholder?: string;
}

export function StudentMention({ value, onChange, placeholder }: StudentMentionProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: students, isLoading } = useStudentSearch({ query });

  return (
    <div className="relative">
      {value ? (
        // 선택된 학생 태그
        <StudentTag student={value} onRemove={() => onChange(null)} />
      ) : (
        // 검색 입력
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">@</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder || "학생 이름 검색"}
            className="w-full pl-8 pr-4 py-2.5 border border-grey-200 rounded-xl focus:ring-2 focus:ring-toss-blue focus:border-transparent"
          />
        </div>
      )}

      {/* 검색 결과 드롭다운 */}
      {isOpen && students && students.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-grey-100 z-50 max-h-60 overflow-y-auto">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => {
                onChange(student);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-grey-50 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-grey-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-grey-500" />
              </div>
              <div>
                <div className="font-medium text-grey-900">{student.name}</div>
                <div className="text-xs text-grey-500">{student.grade} · {student.school}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**완료 조건**:
- [ ] @ 입력 시 자동완성 드롭다운
- [ ] 학생 선택 시 태그로 표시
- [ ] 태그 X 버튼으로 제거
- [ ] 키보드 네비게이션 (선택)

---

### Phase 17-4: 결석 공지 작성 모달
**예상 시간**: 1.5시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/components/admin/notices/AbsenceNoticeModal.tsx` | 결석 공지 작성 모달 |
| 2 | `frontend/src/hooks/useCreateAbsenceNotice.ts` | 결석 공지 생성 훅 |

**AbsenceNoticeModal.tsx**:
```typescript
interface AbsenceNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export function AbsenceNoticeModal({ isOpen, onClose, defaultDate }: AbsenceNoticeModalProps) {
  const [taggedStudent, setTaggedStudent] = useState<TaggedStudent | null>(null);
  const [date, setDate] = useState(defaultDate || formatDateKey(new Date()));
  const [reason, setReason] = useState('');

  const createNotice = useCreateAbsenceNotice();

  const handleSubmit = async () => {
    if (!taggedStudent) return;

    await createNotice.mutateAsync({
      title: `${taggedStudent.name} 결석 예정`,
      date,
      taggedStudentId: taggedStudent.id,
      absenceReason: reason,
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="결석 공지 등록">
      <div className="space-y-4">
        {/* 학생 선택 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            결석 학생 <span className="text-red-500">*</span>
          </label>
          <StudentMention
            value={taggedStudent}
            onChange={setTaggedStudent}
            placeholder="학생 이름을 입력하세요"
          />
        </div>

        {/* 결석 날짜 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            결석 날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 border border-grey-200 rounded-xl"
          />
        </div>

        {/* 결석 사유 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            결석 사유
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 병원 예약, 가족 행사 등"
            rows={3}
            className="w-full px-4 py-2.5 border border-grey-200 rounded-xl resize-none"
          />
        </div>

        {/* 안내 메시지 */}
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
          <p>• 담당 강사에게만 공지가 표시됩니다</p>
          <p>• 강사가 확인 시 출결에 자동 반영됩니다</p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 py-3 bg-grey-100 rounded-xl">
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={!taggedStudent || createNotice.isPending}
          className="flex-1 py-3 bg-toss-blue text-white rounded-xl disabled:opacity-50"
        >
          등록하기
        </button>
      </div>
    </Modal>
  );
}
```

**useCreateAbsenceNotice.ts**:
```typescript
export function useCreateAbsenceNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAbsenceNoticeInput) => {
      // 1. 공지 생성
      const { data: notice, error: noticeError } = await supabase
        .from('notices')
        .insert({
          title: input.title,
          description: input.absenceReason,
          date: input.date,
          type: 'absence',
          visibility: 'teacher',  // 강사만
          tagged_student_id: input.taggedStudentId,
          absence_reason: input.absenceReason,
          priority: 85,
          is_active: true,
        })
        .select()
        .single();

      if (noticeError) throw noticeError;

      // 2. 담당 강사 조회
      const { data: teachers } = await supabase
        .from('enrollments')
        .select('classes!inner(teacher_id)')
        .eq('student_id', input.taggedStudentId)
        .eq('is_active', true);

      // 3. 수신자 등록
      const teacherIds = [...new Set(teachers?.map(t => t.classes.teacher_id) || [])];

      if (teacherIds.length > 0) {
        await supabase
          .from('notice_recipients')
          .insert(
            teacherIds.map(teacherId => ({
              notice_id: notice.id,
              teacher_id: teacherId,
            }))
          );
      }

      return notice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
    },
  });
}
```

**완료 조건**:
- [ ] 모달 UI 완성
- [ ] 학생 선택 + 날짜 + 사유 입력
- [ ] 공지 생성 + 수신자 등록
- [ ] 성공 시 목록 갱신

---

### Phase 17-5: 강사용 결석 공지 표시
**예상 시간**: 1시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/hooks/useMyAbsenceNotices.ts` | 강사 본인 결석 공지 조회 |
| 2 | `frontend/src/components/admin/notices/AbsenceNoticeCard.tsx` | 결석 공지 카드 (확인 버튼 포함) |

**useMyAbsenceNotices.ts**:
```typescript
export function useMyAbsenceNotices(date: string) {
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['notices', 'absence', 'my', date],
    queryFn: async () => {
      // 내가 수신자인 결석 공지 조회
      const { data } = await supabase
        .from('notice_recipients')
        .select(`
          *,
          notice:notices!inner(
            *,
            tagged_student:students(id, name, grade_id)
          )
        `)
        .eq('teacher_id', profile?.teacher_id)
        .eq('notice.date', date)
        .eq('notice.type', 'absence')
        .eq('notice.is_active', true);

      return data || [];
    },
    enabled: !!profile?.teacher_id,
  });
}
```

**AbsenceNoticeCard.tsx**:
```typescript
interface AbsenceNoticeCardProps {
  recipient: NoticeRecipient & { notice: AbsenceNotice };
  onConfirm: () => void;
}

export function AbsenceNoticeCard({ recipient, onConfirm }: AbsenceNoticeCardProps) {
  const { notice } = recipient;

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
          <UserX className="w-5 h-5 text-red-600" />
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-grey-900">
              {notice.taggedStudent?.name}
            </span>
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">
              결석
            </span>
          </div>

          {notice.absenceReason && (
            <p className="text-sm text-grey-600 mb-2">
              사유: {notice.absenceReason}
            </p>
          )}

          {/* 확인 버튼 */}
          {!recipient.isConfirmed ? (
            <button
              onClick={onConfirm}
              className="mt-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
            >
              확인 및 출결 반영
            </button>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>출결 반영 완료</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**완료 조건**:
- [ ] 강사 대시보드에 결석 공지 표시
- [ ] "확인 및 출결 반영" 버튼
- [ ] 확인 완료 상태 표시

---

### Phase 17-6: 출결 반영 로직
**예상 시간**: 1시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/hooks/useConfirmAbsenceNotice.ts` | 결석 확인 + 출결 반영 훅 |

**useConfirmAbsenceNotice.ts**:
```typescript
export function useConfirmAbsenceNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      recipientId: string;
      noticeId: string;
      studentId: string;
      date: string;
      reason?: string;
    }) => {
      const { recipientId, noticeId, studentId, date, reason } = params;

      // 1. 해당 날짜의 학생 수업 조회
      const dayOfWeek = new Date(date).getDay();

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id, classes!inner(id)')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const classIds = enrollments?.map(e => e.class_id) || [];

      // 해당 요일에 수업이 있는 반만 필터
      const { data: schedules } = await supabase
        .from('class_schedules')
        .select('class_id')
        .in('class_id', classIds)
        .eq('day_of_week', dayOfWeek);

      const classesOnDay = schedules?.map(s => s.class_id) || [];

      // 2. 출석 레코드 생성/업데이트
      if (classesOnDay.length > 0) {
        const attendanceRecords = classesOnDay.map(classId => ({
          student_id: studentId,
          class_id: classId,
          date,
          status: 'absent_notified',
          absence_reason: reason,
          source_notice_id: noticeId,
        }));

        await supabase
          .from('attendance')
          .upsert(attendanceRecords, {
            onConflict: 'student_id,class_id,date',
          });
      }

      // 3. 수신자 확인 상태 업데이트
      await supabase
        .from('notice_recipients')
        .update({
          is_confirmed: true,
          confirmed_at: new Date().toISOString(),
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', recipientId);

      return { success: true, classCount: classesOnDay.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
```

**완료 조건**:
- [ ] 확인 버튼 클릭 시 출결 생성
- [ ] 해당 요일 수업만 결석 처리
- [ ] 수신자 확인 상태 업데이트
- [ ] 토스트 알림 표시

---

### Phase 17-7: 캘린더 + 대시보드 통합
**예상 시간**: 1시간

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx` | 결석 공지 등록 버튼 추가 |
| 2 | `frontend/src/components/admin/notices/index.ts` | export 정리 |
| 3 | `frontend/src/pages/admin/AdminDashboard.tsx` | 모달 연동 |

**WeeklyCalendar.tsx 수정**:
```typescript
// 헤더에 "결석 공지" 버튼 추가
<div className="flex items-center gap-2">
  <button
    onClick={handleGoToday}
    className="px-4 py-2 bg-toss-blue text-white text-sm font-semibold rounded-full"
  >
    오늘
  </button>

  {/* 관리자만 표시 */}
  {isAdmin && (
    <button
      onClick={() => setIsAbsenceModalOpen(true)}
      className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-full flex items-center gap-1"
    >
      <UserX className="w-4 h-4" />
      결석 공지
    </button>
  )}
</div>
```

**완료 조건**:
- [ ] 캘린더에 "결석 공지" 버튼 추가 (관리자만)
- [ ] 버튼 클릭 시 모달 열림
- [ ] 공지 등록 후 목록 갱신

---

### Phase 17-8: Mock 데이터 + 테스트
**예상 시간**: 30분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `frontend/src/hooks/useStudentSearch.ts` | Mock 학생 데이터 |
| 2 | `frontend/src/hooks/useMyAbsenceNotices.ts` | Mock 결석 공지 |

**Mock 학생 데이터**:
```typescript
const MOCK_STUDENTS: TaggedStudent[] = [
  { id: 'student-1', name: '홍길동', grade: '중3', school: '서울중학교' },
  { id: 'student-2', name: '김철수', grade: '고1', school: '강남고등학교' },
  { id: 'student-3', name: '이영희', grade: '중2', school: '역삼중학교' },
  { id: 'student-4', name: '박민수', grade: '고2', school: '서초고등학교' },
];
```

**완료 조건**:
- [ ] Supabase 없이 UI 테스트 가능
- [ ] 학생 검색 Mock 동작
- [ ] 결석 공지 Mock 표시

---

### Phase 17-9: 빌드 테스트 + 문서화
**예상 시간**: 30분

| 순서 | 작업 |
|------|------|
| 1 | `npm run build` 성공 확인 |
| 2 | TypeScript 에러 없음 확인 |
| 3 | plan.md 업데이트 |

**완료 조건**:
- [ ] 빌드 성공
- [ ] 에러 없음
- [ ] plan.md에 Stage 17 추가

---

## 5. 파일 생성 순서 (의존성 기준)

```
1. types/admin.ts                              (타입 확장)
2. hooks/useStudentSearch.ts                   (학생 검색)
3. components/admin/notices/StudentTag.tsx     (태그 UI)
4. components/admin/notices/StudentMention.tsx (멘션 UI)
5. hooks/useCreateAbsenceNotice.ts             (공지 생성)
6. components/admin/notices/AbsenceNoticeModal.tsx (모달)
7. hooks/useMyAbsenceNotices.ts                (강사용 조회)
8. hooks/useConfirmAbsenceNotice.ts            (확인 처리)
9. components/admin/notices/AbsenceNoticeCard.tsx (카드)
10. components/admin/notices/index.ts          (export)
11. components/admin/dashboard/WeeklyCalendar.tsx (수정)
12. pages/admin/AdminDashboard.tsx             (수정)
```

---

## 6. 테스트 체크리스트

### 기능 테스트
- [ ] 관리자: @학생 검색 + 자동완성
- [ ] 관리자: 결석 공지 등록
- [ ] 강사: 담당 학생 결석 공지만 표시
- [ ] 강사: "확인" 클릭 시 출결 반영
- [ ] 강사: 확인 완료 상태 표시
- [ ] 관리자: 모든 결석 공지 확인 가능

### UI 테스트
- [ ] @멘션 자동완성 드롭다운
- [ ] 학생 태그 표시/제거
- [ ] 모달 열기/닫기
- [ ] 결석 공지 카드 스타일

### 에러 케이스
- [ ] 학생 미선택 시 등록 불가
- [ ] 담당 강사 없는 학생 처리
- [ ] 이미 확인된 공지 중복 처리 방지

---

## 7. 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `students 테이블 없음` | Supabase 미설정 | Mock 데이터 fallback |
| `notice_recipients 없음` | 마이그레이션 미적용 | Mock 모드 분기 |
| `teacher_id undefined` | 프로필 로딩 전 | enabled 조건 추가 |
| `담당 강사 0명` | enrollments 없음 | 경고 메시지 표시 |

---

## 8. 총 예상 시간

| Phase | 내용 | 시간 |
|-------|------|------|
| 17-1 | DB + 타입 | 30분 |
| 17-2 | 학생 검색 | 1시간 |
| 17-3 | @멘션 UI | 1.5시간 |
| 17-4 | 모달 | 1.5시간 |
| 17-5 | 강사용 표시 | 1시간 |
| 17-6 | 출결 반영 | 1시간 |
| 17-7 | 통합 | 1시간 |
| 17-8 | Mock + 테스트 | 30분 |
| 17-9 | 빌드 + 문서 | 30분 |
| **총계** | | **약 8.5시간** |

---

*작성일: 2024-12-21*
*참조: 409_absence_notification_system_feasibility_report.md*
