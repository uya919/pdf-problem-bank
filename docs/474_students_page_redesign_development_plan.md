# 학생 페이지 리디자인 개발 계획

> Stage: 48 (학생 페이지 연락처 중심 리디자인)
> 작성일: 2025-01-05
> 참조: [473_students_page_phone_focus_ux_research.md](./473_students_page_phone_focus_ux_research.md)

---

## 1. 개요

### 1.1 목표
- 학생 페이지를 **연락처 중심**으로 재설계
- 강사는 **본인 담당 학생만** 표시
- Supabase 실시간 연결

### 1.2 핵심 변경 사항

| 항목 | 기존 | 변경 |
|------|------|------|
| 1순위 정보 | 최근 시험 점수 | **전화번호 2개** (학생/학부모) |
| 데이터 필터 | 전체 학생 | **본인 담당 학생만** |
| 상세 정보 | 카드에 표시 | **모달로 이동** |
| 데이터 소스 | Mock 데이터 | **Supabase 연결** |

---

## 2. 데이터 흐름

### 2.1 Supabase 쿼리 로직

```
1. 로그인한 강사의 teacher_id 획득 (useAuth → profile.id)
     ↓
2. classes 테이블에서 teacher_id로 담당 반 목록 조회
     ↓
3. class_enrollments에서 active 상태인 학생 ID 목록 추출
     ↓
4. students 테이블에서 해당 학생들의 정보 조회
     ↓
5. (모달 열릴 때) attendance, exam_scores, homework_submissions 조회
```

### 2.2 SQL 쿼리

```sql
-- 강사의 담당 학생 목록 (연락처 중심)
SELECT DISTINCT
  s.id,
  s.name,
  s.phone,
  s.parent_phone,
  s.grade,
  s.school,
  c.name as class_name,
  c.subject
FROM students s
JOIN class_enrollments ce ON s.id = ce.student_id
JOIN classes c ON ce.class_id = c.id
WHERE c.teacher_id = :teacher_id
  AND ce.status = 'active'
  AND s.status = 'active'
ORDER BY s.grade, s.name;
```

```sql
-- 학생 상세 정보 (모달용)
-- 1. 최근 성적 (최근 3개)
SELECT exam_date, score
FROM exam_scores
WHERE student_id = :student_id
ORDER BY exam_date DESC
LIMIT 3;

-- 2. 이번 달 출결
SELECT
  COUNT(*) FILTER (WHERE status = 'present') as present_count,
  COUNT(*) FILTER (WHERE status = 'late') as late_count,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_count
FROM attendance
WHERE student_id = :student_id
  AND date >= DATE_TRUNC('month', CURRENT_DATE);

-- 3. 숙제 완료율
SELECT
  COUNT(*) FILTER (WHERE hs.status = 'submitted') as completed,
  COUNT(*) as total
FROM homework h
JOIN homework_submissions hs ON h.id = hs.homework_id
WHERE hs.student_id = :student_id
  AND h.due_date >= CURRENT_DATE - INTERVAL '30 days';
```

---

## 3. 파일 구조

### 3.1 신규 생성 파일

```
frontend/src/
├── hooks/
│   └── useMyStudents.ts          # 담당 학생 조회 훅 (신규)
│
├── components/backoffice/students/
│   ├── StudentCard.tsx           # 수정 (연락처 중심)
│   ├── StudentDetailModal.tsx    # 신규 (상세 모달)
│   ├── StudentTable.tsx          # 신규 (PC 테이블 뷰)
│   └── index.ts                  # 수정 (export 추가)
│
└── pages/backoffice/
    └── StudentsPage.tsx          # 수정 (새 UI 적용)
```

### 3.2 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `StudentsPage.tsx` | 전체 재설계 |
| `StudentCard.tsx` | 연락처 버튼 추가, 점수 제거 |
| `index.ts` | 새 컴포넌트 export |

---

## 4. 타입 정의

### 4.1 StudentListItem (목록용)

```typescript
// hooks/useMyStudents.ts

export interface StudentListItem {
  id: string;
  name: string;
  phone: string | null;
  parentPhone: string | null;
  grade: string | null;
  school: string | null;
  className: string;
  subject: string | null;

  // 알림 뱃지용 (간단한 정보만)
  hasAlert: boolean;
  alertType?: 'absence' | 'homework' | 'score';
  alertMessage?: string;
}
```

### 4.2 StudentDetail (모달용)

```typescript
export interface StudentDetail extends StudentListItem {
  // 성적
  recentScores: {
    date: string;
    score: number;
  }[];
  scoreTrend: number; // +7, -3 등

  // 출결
  attendanceThisMonth: {
    present: number;
    late: number;
    absent: number;
  };

  // 숙제
  homeworkStats: {
    completed: number;
    total: number;
    rate: number; // 0-100
  };

  // 메모
  notes: string | null;
}
```

---

## 5. 단계별 개발 계획

### Phase 1: Supabase 훅 구현 (useMyStudents)

**목표**: 담당 학생 목록 조회

**파일**: `frontend/src/hooks/useMyStudents.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface StudentListItem {
  id: string;
  name: string;
  phone: string | null;
  parentPhone: string | null;
  grade: string | null;
  className: string;
  subject: string | null;
  hasAlert: boolean;
  alertType?: 'absence' | 'homework';
  alertMessage?: string;
}

export function useMyStudents() {
  const { profile } = useAuth();
  const teacherId = profile?.id;

  return useQuery({
    queryKey: ['my-students', teacherId],
    queryFn: async (): Promise<StudentListItem[]> => {
      if (!teacherId) return [];

      // 1. 담당 반 조회
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, subject')
        .eq('teacher_id', teacherId);

      if (classError) throw classError;
      if (!classes?.length) return [];

      const classIds = classes.map(c => c.id);

      // 2. 반에 등록된 학생 조회
      const { data: enrollments, error: enrollError } = await supabase
        .from('class_enrollments')
        .select(`
          student_id,
          class_id,
          students (
            id,
            name,
            phone,
            parent_phone,
            grade,
            notes
          )
        `)
        .in('class_id', classIds)
        .eq('status', 'active');

      if (enrollError) throw enrollError;

      // 3. 학생 목록 생성 (중복 제거)
      const studentMap = new Map<string, StudentListItem>();

      enrollments?.forEach(e => {
        const student = e.students as any;
        const classInfo = classes.find(c => c.id === e.class_id);

        if (student && !studentMap.has(student.id)) {
          studentMap.set(student.id, {
            id: student.id,
            name: student.name,
            phone: student.phone,
            parentPhone: student.parent_phone,
            grade: student.grade,
            className: classInfo?.name || '',
            subject: classInfo?.subject,
            hasAlert: false, // TODO: 알림 로직 추가
          });
        }
      });

      return Array.from(studentMap.values())
        .sort((a, b) => (a.grade || '').localeCompare(b.grade || '') || a.name.localeCompare(b.name));
    },
    enabled: !!teacherId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}
```

**테스트 체크리스트**:
- [ ] 로그인 시 담당 학생만 표시되는지 확인
- [ ] 다른 강사의 학생은 표시되지 않는지 확인
- [ ] 학생 정보 (이름, 전화번호) 정상 표시

---

### Phase 2: 학생 상세 조회 훅 (useStudentDetail)

**목표**: 모달에서 사용할 상세 정보 조회

**파일**: `frontend/src/hooks/useMyStudents.ts` (추가)

```typescript
export interface StudentDetail {
  id: string;
  name: string;
  phone: string | null;
  parentPhone: string | null;
  grade: string | null;
  className: string;

  recentScores: { date: string; score: number }[];
  scoreTrend: number;

  attendanceThisMonth: {
    present: number;
    late: number;
    absent: number;
  };

  homeworkStats: {
    completed: number;
    total: number;
    rate: number;
  };

  notes: string | null;
}

export function useStudentDetail(studentId: string | null) {
  return useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: async (): Promise<StudentDetail | null> => {
      if (!studentId) return null;

      // 1. 학생 기본 정보
      const { data: student } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (!student) return null;

      // 2. 최근 성적 (3개)
      const { data: scores } = await supabase
        .from('exam_scores')
        .select('exam_date, score')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: false })
        .limit(3);

      // 3. 이번 달 출결
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentId)
        .gte('date', startOfMonth.toISOString().split('T')[0]);

      // 4. 숙제 완료율 (최근 30일)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: homeworkSubs } = await supabase
        .from('homework_submissions')
        .select('status')
        .eq('student_id', studentId);

      // 계산
      const recentScores = scores?.map(s => ({
        date: s.exam_date,
        score: Number(s.score)
      })) || [];

      const scoreTrend = recentScores.length >= 2
        ? recentScores[0].score - recentScores[recentScores.length - 1].score
        : 0;

      const attendanceStats = {
        present: attendance?.filter(a => a.status === 'present').length || 0,
        late: attendance?.filter(a => a.status === 'late').length || 0,
        absent: attendance?.filter(a => a.status === 'absent').length || 0,
      };

      const hwCompleted = homeworkSubs?.filter(h => h.status === 'submitted').length || 0;
      const hwTotal = homeworkSubs?.length || 0;

      return {
        id: student.id,
        name: student.name,
        phone: student.phone,
        parentPhone: student.parent_phone,
        grade: student.grade,
        className: '', // TODO: 반 정보 추가
        recentScores,
        scoreTrend,
        attendanceThisMonth: attendanceStats,
        homeworkStats: {
          completed: hwCompleted,
          total: hwTotal,
          rate: hwTotal > 0 ? Math.round((hwCompleted / hwTotal) * 100) : 0,
        },
        notes: student.notes,
      };
    },
    enabled: !!studentId,
  });
}
```

---

### Phase 3: StudentCard 컴포넌트 재설계

**목표**: 연락처 버튼 중심으로 재설계

**파일**: `frontend/src/components/backoffice/students/StudentCard.tsx`

```typescript
import { Phone, Smartphone } from 'lucide-react';
import { StudentListItem } from '../../../hooks/useMyStudents';

interface StudentCardProps {
  student: StudentListItem;
  onCardClick: () => void;
}

export function StudentCard({ student, onCardClick }: StudentCardProps) {
  const initial = student.name.charAt(0);

  // 알림 뱃지 색상
  const alertColors = student.hasAlert
    ? student.alertType === 'absence'
      ? { bg: 'bg-red-50', text: 'text-red-600', border: 'border-l-4 border-red-500' }
      : { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-l-4 border-amber-500' }
    : { bg: 'bg-blue-50', text: 'text-blue-600', border: '' };

  const handlePhoneClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  return (
    <div
      onClick={onCardClick}
      className={`bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${alertColors.border}`}
    >
      {/* 헤더: 이름 + 정보 */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 ${alertColors.bg} rounded-full flex items-center justify-center`}>
          <span className={`text-lg font-bold ${alertColors.text}`}>{initial}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{student.name}</span>
            {student.hasAlert && student.alertMessage && (
              <span className={`text-xs px-2 py-0.5 ${alertColors.bg} ${alertColors.text} rounded-full font-medium`}>
                {student.alertMessage}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{student.grade} · {student.className}</span>
        </div>
      </div>

      {/* 전화 버튼 */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => student.phone && handlePhoneClick(e, student.phone)}
          disabled={!student.phone}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 rounded-xl hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Smartphone size={18} className="text-blue-600" />
          <div className="text-left">
            <div className="text-xs text-gray-500">학생</div>
            <div className="text-sm font-semibold text-blue-600">
              {student.phone ? formatPhone(student.phone) : '-'}
            </div>
          </div>
        </button>

        <button
          onClick={(e) => student.parentPhone && handlePhoneClick(e, student.parentPhone)}
          disabled={!student.parentPhone}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Phone size={18} className="text-white" />
          <div className="text-left">
            <div className="text-xs text-white/70">학부모</div>
            <div className="text-sm font-semibold text-white">
              {student.parentPhone ? formatPhone(student.parentPhone) : '-'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function formatPhone(phone: string): string {
  // 010-1234-5678 → 010-1234
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length >= 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
  }
  return phone;
}
```

---

### Phase 4: StudentDetailModal 컴포넌트

**목표**: 상세 정보 모달 구현

**파일**: `frontend/src/components/backoffice/students/StudentDetailModal.tsx`

```typescript
import { X, Phone, Smartphone } from 'lucide-react';
import { useStudentDetail } from '../../../hooks/useMyStudents';

interface StudentDetailModalProps {
  studentId: string | null;
  onClose: () => void;
}

export function StudentDetailModal({ studentId, onClose }: StudentDetailModalProps) {
  const { data: student, isLoading } = useStudentDetail(studentId);

  if (!studentId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 핸들 (모바일) */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">학생 상세</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-500">로딩 중...</div>
        ) : student ? (
          <>
            {/* 학생 정보 */}
            <div className="p-6 text-center border-b">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl font-bold text-blue-600">{student.name.charAt(0)}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
              <p className="text-gray-500">{student.grade} · {student.className}</p>
            </div>

            {/* 연락처 */}
            <div className="p-6 border-b">
              <div className="flex gap-3">
                <a
                  href={student.phone ? `tel:${student.phone}` : undefined}
                  className="flex-1 p-4 bg-blue-50 rounded-xl text-center"
                >
                  <Smartphone className="mx-auto mb-2 text-blue-600" size={24} />
                  <div className="text-xs text-gray-500">학생</div>
                  <div className="font-semibold text-blue-600">{student.phone || '-'}</div>
                </a>
                <a
                  href={student.parentPhone ? `tel:${student.parentPhone}` : undefined}
                  className="flex-1 p-4 bg-blue-600 rounded-xl text-center"
                >
                  <Phone className="mx-auto mb-2 text-white" size={24} />
                  <div className="text-xs text-white/70">학부모</div>
                  <div className="font-semibold text-white">{student.parentPhone || '-'}</div>
                </a>
              </div>
            </div>

            {/* 성적 */}
            <div className="p-6 border-b">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">최근 성적</h4>
              {student.recentScores.length > 0 ? (
                <>
                  <div className="flex gap-3">
                    {student.recentScores.map((s, i) => (
                      <div key={i} className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                        <div className={`text-2xl font-bold ${i === 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                          {s.score}
                        </div>
                        <div className="text-xs text-gray-500">{formatDate(s.date)}</div>
                      </div>
                    ))}
                  </div>
                  {student.scoreTrend !== 0 && (
                    <div className="mt-2 text-center">
                      <span className={`text-sm font-medium ${student.scoreTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {student.scoreTrend > 0 ? '+' : ''}{student.scoreTrend}점 {student.scoreTrend > 0 ? '상승' : '하락'}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400 text-center">성적 데이터 없음</p>
              )}
            </div>

            {/* 출결 */}
            <div className="p-6 border-b">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">이번 달 출결</h4>
              <div className="flex gap-4 text-center">
                <div className="flex-1">
                  <div className="text-xl font-bold text-green-600">{student.attendanceThisMonth.present}</div>
                  <div className="text-xs text-gray-500">출석</div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-amber-500">{student.attendanceThisMonth.late}</div>
                  <div className="text-xs text-gray-500">지각</div>
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold text-red-500">{student.attendanceThisMonth.absent}</div>
                  <div className="text-xs text-gray-500">결석</div>
                </div>
              </div>
            </div>

            {/* 숙제 */}
            <div className="p-6 border-b">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">숙제 완료율</h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${student.homeworkStats.rate}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">{student.homeworkStats.rate}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {student.homeworkStats.completed}/{student.homeworkStats.total} 완료
              </p>
            </div>

            {/* 메모 */}
            {student.notes && (
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">메모</h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600">{student.notes}</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center text-gray-500">학생 정보를 찾을 수 없습니다</div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
```

---

### Phase 5: StudentTable 컴포넌트 (PC용)

**목표**: 태블릿/PC용 테이블 뷰

**파일**: `frontend/src/components/backoffice/students/StudentTable.tsx`

```typescript
import { Copy, ChevronRight } from 'lucide-react';
import { StudentListItem } from '../../../hooks/useMyStudents';
import { toast } from 'react-hot-toast'; // 또는 자체 toast

interface StudentTableProps {
  students: StudentListItem[];
  onStudentClick: (studentId: string) => void;
}

export function StudentTable({ students, onStudentClick }: StudentTableProps) {
  const copyPhone = (phone: string, name: string) => {
    navigator.clipboard.writeText(phone);
    toast.success(`${name} 전화번호 복사됨`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">이름</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">학년/반</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">학생 연락처</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-500">학부모 연락처</th>
            <th className="text-center py-4 px-6 text-sm font-semibold text-gray-500">상태</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => onStudentClick(student.id)}
              className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="py-4 px-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    student.hasAlert
                      ? student.alertType === 'absence' ? 'bg-red-50' : 'bg-amber-50'
                      : 'bg-blue-50'
                  }`}>
                    <span className={`font-bold ${
                      student.hasAlert
                        ? student.alertType === 'absence' ? 'text-red-600' : 'text-amber-600'
                        : 'text-blue-600'
                    }`}>
                      {student.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">{student.name}</span>
                    {student.hasAlert && student.alertMessage && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                        {student.alertMessage}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-4 px-6 text-gray-500">{student.grade} · {student.className}</td>
              <td className="py-4 px-6">
                {student.phone ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyPhone(student.phone!, student.name); }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 group"
                  >
                    <span className="text-gray-900">{student.phone}</span>
                    <Copy size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-4 px-6">
                {student.parentPhone ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); copyPhone(student.parentPhone!, `${student.name} 학부모`); }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 group"
                  >
                    <span className="text-gray-900">{student.parentPhone}</span>
                    <Copy size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="py-4 px-6 text-center">
                <span className={`inline-flex w-3 h-3 rounded-full ${
                  student.hasAlert
                    ? student.alertType === 'absence' ? 'bg-red-500' : 'bg-amber-500'
                    : 'bg-green-500'
                }`} />
              </td>
              <td className="py-4 px-6">
                <ChevronRight size={20} className="text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Phase 6: StudentsPage 통합

**목표**: 전체 페이지 조합

**파일**: `frontend/src/pages/backoffice/StudentsPage.tsx`

핵심 변경:
1. `useMyStudents()` 훅 사용
2. 모바일: `StudentCard` 목록
3. 태블릿/PC: `StudentTable`
4. 모달: `StudentDetailModal`

---

## 6. 테스트 체크리스트

### Phase 1-2 완료 후
- [ ] 로그인한 강사의 담당 학생만 표시
- [ ] 다른 강사의 학생은 표시 안됨
- [ ] 학생 기본 정보 (이름, 전화번호, 학년) 정상 표시

### Phase 3-4 완료 후
- [ ] 모바일에서 전화 버튼 클릭 시 전화 앱 실행
- [ ] 카드 클릭 시 모달 열림
- [ ] 모달에서 성적/출결/숙제 정상 표시

### Phase 5-6 완료 후
- [ ] 태블릿/PC에서 테이블 뷰 표시
- [ ] 전화번호 클릭 시 복사 + 토스트
- [ ] 반응형 레이아웃 정상 동작
- [ ] ESC 키로 모달 닫기

---

## 7. 환경변수

```env
# .env.local (기존 그대로 사용)
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

---

## 8. 예상 에러 및 해결

| 에러 | 원인 | 해결 |
|------|------|------|
| `teacher_id` null | 프로필 로딩 전 쿼리 실행 | `enabled: !!teacherId` 조건 추가 |
| 빈 학생 목록 | 반 없거나 등록 없음 | Empty state UI 표시 |
| 전화번호 형식 다양 | 하이픈/공백 혼재 | `formatPhone()` 함수로 정규화 |
| Supabase 타입 에러 | 스키마 불일치 | `(supabase as any)` 사용 |

---

## 9. 실행 순서

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
   ↓         ↓         ↓         ↓         ↓         ↓
  훅 구현   상세 훅   카드 수정  모달 생성  테이블 뷰  페이지 통합
   ↓         ↓         ↓         ↓         ↓         ↓
 테스트    테스트    테스트    테스트    테스트    최종 테스트
```

---

*다음: Phase 1 개발 시작*
