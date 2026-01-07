/**
 * Phase 4: AttendancePage (Mock 데이터 지원)
 *
 * 출결 관리 페이지
 * - 날짜별 출결 현황 (달력 + 리스트)
 * - 반별 출결 입력/수정
 * - 출결 통계 KPI
 *
 * Mock 모드: Supabase 미연결 시 Mock 데이터 사용
 */
import { useState, useMemo, ReactNode } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  useClasses,
  useTodayAttendance,
  useAttendanceByDate,
  useSaveAttendance,
} from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { AttendanceStatus } from '../../types/database';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  BarChart3,
  BookOpen,
  AlertTriangle,
  Check,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Inbox,
  Circle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string;
}

interface MockClass {
  id: string;
  name: string;
  subject: string;
  teacher: { name: string };
  student_count: number;
  start_time: string;
  end_time: string;
}

interface MockClassAttendance {
  classId: string;
  records: AttendanceRecord[];
}

// ============================================
// Mock Data
// ============================================

const MOCK_CLASSES: MockClass[] = [
  { id: 'c1', name: '초3 수학A', subject: '수학', teacher: { name: '박산술' }, student_count: 6, start_time: '15:00', end_time: '16:30' },
  { id: 'c2', name: '초4 수학A', subject: '수학', teacher: { name: '박산술' }, student_count: 7, start_time: '16:30', end_time: '18:00' },
  { id: 'c3', name: '중1 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '18:00', end_time: '19:30' },
  { id: 'c4', name: '중2 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '19:30', end_time: '21:00' },
  { id: 'c5', name: '중3 수학A', subject: '수학', teacher: { name: '김수학' }, student_count: 8, start_time: '18:00', end_time: '19:30' },
  { id: 'c6', name: '고1 수학A', subject: '수학', teacher: { name: '이대수' }, student_count: 7, start_time: '19:30', end_time: '21:00' },
  { id: 'c7', name: '중1 영어A', subject: '영어', teacher: { name: '한영어' }, student_count: 6, start_time: '15:00', end_time: '16:30' },
  { id: 'c8', name: '중2 영어A', subject: '영어', teacher: { name: '한영어' }, student_count: 7, start_time: '16:30', end_time: '18:00' },
];

const MOCK_ATTENDANCE_DATA: MockClassAttendance[] = [
  {
    classId: 'c1',
    records: [
      { studentId: 's1', studentName: '김민준', status: 'present' },
      { studentId: 's2', studentName: '이서윤', status: 'present' },
      { studentId: 's3', studentName: '박지훈', status: 'present' },
      { studentId: 's4', studentName: '최수아', status: 'late' },
      { studentId: 's5', studentName: '정하은', status: 'present' },
      { studentId: 's6', studentName: '강현우', status: 'present' },
    ],
  },
  {
    classId: 'c2',
    records: [
      { studentId: 's7', studentName: '윤지민', status: 'present' },
      { studentId: 's8', studentName: '임서준', status: 'present' },
      { studentId: 's9', studentName: '한예은', status: 'absent' },
      { studentId: 's10', studentName: '송민서', status: 'present' },
      { studentId: 's11', studentName: '장도윤', status: 'present' },
      { studentId: 's12', studentName: '오채원', status: 'present' },
      { studentId: 's13', studentName: '신지우', status: 'late' },
    ],
  },
  {
    classId: 'c3',
    records: [
      { studentId: 's14', studentName: '권시우', status: 'present' },
      { studentId: 's15', studentName: '유하윤', status: 'present' },
      { studentId: 's16', studentName: '황준호', status: 'present' },
      { studentId: 's17', studentName: '안소율', status: 'present' },
      { studentId: 's18', studentName: '백서연', status: 'absent' },
      { studentId: 's19', studentName: '조민재', status: 'present' },
      { studentId: 's20', studentName: '남지안', status: 'present' },
      { studentId: 's21', studentName: '문예린', status: 'present' },
    ],
  },
  {
    classId: 'c4',
    records: [
      { studentId: 's22', studentName: '배승민', status: 'present' },
      { studentId: 's23', studentName: '류하람', status: 'present' },
      { studentId: 's24', studentName: '노은우', status: 'present' },
      { studentId: 's25', studentName: '김태희', status: 'present' },
      { studentId: 's26', studentName: '이준혁', status: 'late' },
      { studentId: 's27', studentName: '박소연', status: 'present' },
      { studentId: 's28', studentName: '정민우', status: 'present' },
      { studentId: 's29', studentName: '최유진', status: 'present' },
    ],
  },
  {
    classId: 'c5',
    records: [
      { studentId: 's30', studentName: '강서윤', status: 'present' },
      { studentId: 's31', studentName: '윤도현', status: 'present' },
      { studentId: 's32', studentName: '임하린', status: 'present' },
      { studentId: 's33', studentName: '한지호', status: 'present' },
      { studentId: 's34', studentName: '송예진', status: 'present' },
      { studentId: 's35', studentName: '장민서', status: 'present' },
      { studentId: 's36', studentName: '오준영', status: 'present' },
      { studentId: 's37', studentName: '신하윤', status: 'present' },
    ],
  },
];

// 연결 상태 표시 컴포넌트
const DataSourceBadge = () => (
  <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
    isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    <Circle className={`w-2 h-2 ${isSupabaseConfigured ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'}`} />
    {isSupabaseConfigured ? 'Supabase' : 'Mock 데이터'}
  </span>
);

// ============================================
// Main Component
// ============================================

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  // Mock 모드용 로컬 출결 상태
  const [mockAttendance, setMockAttendance] = useState<MockClassAttendance[]>(MOCK_ATTENDANCE_DATA);

  // Supabase 데이터 조회 (Mock 모드에서는 비활성화)
  const { data: supabaseClasses, isLoading: supabaseClassesLoading } = useClasses({ status: 'active' });
  const { data: todayAttendance, isLoading: todayLoading } = useTodayAttendance();
  const { data: dateAttendance, isLoading: dateLoading } = useAttendanceByDate(
    null,
    selectedDate
  );
  const saveAttendance = useSaveAttendance();

  // 실제 사용할 반 목록 (Supabase 우선, Mock fallback)
  const classes = useMemo(() => {
    if (isSupabaseConfigured && supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses;
    }
    return MOCK_CLASSES;
  }, [supabaseClasses]);

  // 로딩 상태
  const classesLoading = isSupabaseConfigured ? supabaseClassesLoading : false;

  // 출결 데이터 (Supabase 우선, Mock fallback)
  const attendanceData = useMemo(() => {
    if (isSupabaseConfigured && dateAttendance && dateAttendance.length > 0) {
      return dateAttendance;
    }
    return mockAttendance;
  }, [dateAttendance, mockAttendance]);

  // 오늘 통계 계산
  const todayStats = useMemo(() => {
    // Mock 모드
    if (!isSupabaseConfigured) {
      const allRecords = mockAttendance.flatMap((c) => c.records);
      const total = allRecords.length;
      const present = allRecords.filter((r) => r.status === 'present').length;
      const absent = allRecords.filter((r) => r.status === 'absent').length;
      const late = allRecords.filter((r) => r.status === 'late').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;
      return { total, present, absent, late, rate };
    }

    // Supabase 모드
    if (!todayAttendance) return { total: 0, present: 0, absent: 0, late: 0, rate: 100 };

    interface AttendanceRow { status: AttendanceStatus }
    const typedAttendance = todayAttendance as unknown as AttendanceRow[];

    const total = typedAttendance.length;
    const present = typedAttendance.filter((a) => a.status === 'present').length;
    const absent = typedAttendance.filter((a) => a.status === 'absent').length;
    const late = typedAttendance.filter((a) => a.status === 'late').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    return { total, present, absent, late, rate };
  }, [todayAttendance, mockAttendance]);

  // 날짜 변경
  const handleDateChange = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // 출결 상태 변경
  const handleStatusChange = async (
    classId: string,
    studentId: string,
    status: AttendanceStatus
  ) => {
    // Mock 모드
    if (!isSupabaseConfigured) {
      setMockAttendance((prev) =>
        prev.map((cls) => {
          if (cls.classId !== classId) return cls;
          return {
            ...cls,
            records: cls.records.map((r) =>
              r.studentId === studentId ? { ...r, status } : r
            ),
          };
        })
      );
      return;
    }

    // Supabase 모드
    try {
      await saveAttendance.mutateAsync([
        {
          class_id: classId,
          student_id: studentId,
          date: selectedDate,
          status,
        },
      ]);
    } catch (error) {
      console.error('출결 저장 실패:', error);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="출결 관리"
          description="학생들의 출결 현황을 확인하고 관리합니다"
          actions={
            <div className="flex items-center gap-3">
              <DataSourceBadge />
              <button
                onClick={() => handleDateChange(-1)}
                className="w-8 h-8 flex items-center justify-center bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
              >
                ←
              </button>
              <div
                className={`px-4 py-2 rounded-lg font-medium ${
                  isToday ? 'bg-blue-500 text-white' : 'bg-grey-100 text-grey-700'
                }`}
              >
                {formatDate(selectedDate)}
                {isToday && <span className="ml-2 text-xs opacity-80">오늘</span>}
              </div>
              <button
                onClick={() => handleDateChange(1)}
                className="w-8 h-8 flex items-center justify-center bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
              >
                →
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 text-sm text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              >
                오늘
              </button>
            </div>
          }
        />

        {/* KPI 카드 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="전체 출결"
            value={todayStats.total}
            unit="명"
            icon={<ClipboardList className="w-4 h-4" />}
            loading={todayLoading}
          />
          <KPICard
            label="출석"
            value={todayStats.present}
            unit="명"
            icon={<CheckCircle className="w-4 h-4" />}
            color="green"
            loading={todayLoading}
          />
          <KPICard
            label="결석"
            value={todayStats.absent}
            unit="명"
            icon={<XCircle className="w-4 h-4" />}
            color="red"
            loading={todayLoading}
          />
          <KPICard
            label="출석률"
            value={todayStats.rate}
            unit="%"
            icon={<BarChart3 className="w-4 h-4" />}
            color="blue"
            loading={todayLoading}
          />
        </div>

        {/* 반별 출결 현황 */}
        <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-grey-400" />
              반별 출결 현황
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500">
                {classes?.length || 0}개 반
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  editMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
                }`}
              >
                {editMode ? '편집 완료' : '편집'}
              </button>
            </div>
          </div>

          {classesLoading ? (
            <div className="p-10 text-center text-grey-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              로딩 중...
            </div>
          ) : classes && classes.length > 0 ? (
            <div className="divide-y divide-grey-100">
              {classes.map((cls) => {
                // 해당 반의 출결 데이터 찾기
                const classAttendanceData = attendanceData.find((a) => a.classId === cls.id);
                const attendanceRecords = classAttendanceData?.records || [];
                return (
                  <ClassAttendanceRow
                    key={cls.id}
                    classId={cls.id}
                    className={cls.name}
                    subject={cls.subject}
                    teacherName={cls.teacher?.name || '담당 미정'}
                    studentCount={cls.student_count || 0}
                    time={`${cls.start_time?.slice(0, 5) || ''} - ${cls.end_time?.slice(0, 5) || ''}`}
                    editMode={editMode}
                    attendanceRecords={attendanceRecords}
                    onStatusChange={handleStatusChange}
                  />
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center text-grey-500">
              <div className="mb-3 flex justify-center">
                <Inbox className="w-10 h-10 text-grey-300" />
              </div>
              등록된 반이 없습니다
            </div>
          )}
        </section>

        {/* 출결 이슈 알림 */}
        {todayStats.absent > 0 && (
          <section className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <h3 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" />
              출결 이슈
            </h3>
            <div className="text-sm text-orange-700">
              오늘 <strong>{todayStats.absent}명</strong>의 학생이 결석했습니다.
              {todayStats.late > 0 && (
                <span className="ml-2">
                  (지각: <strong>{todayStats.late}명</strong>)
                </span>
              )}
            </div>
          </section>
        )}
      </div>
    </AdminLayoutV5>
  );
}

// ============================================
// Sub Components
// ============================================

function KPICard({
  label,
  value,
  unit,
  icon,
  color,
  loading,
}: {
  label: string;
  value: number;
  unit: string;
  icon: ReactNode;
  color?: 'green' | 'red' | 'blue';
  loading?: boolean;
}) {
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
  };

  return (
    <div className="bg-white border border-grey-200 rounded-xl p-4">
      <div className="flex items-center gap-2 text-grey-500 text-sm mb-2">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-grey-100 rounded animate-pulse" />
      ) : (
        <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-grey-900'}`}>
          {value}
          <span className="text-sm font-medium text-grey-500 ml-1">{unit}</span>
        </div>
      )}
    </div>
  );
}

function ClassAttendanceRow({
  classId,
  className,
  subject,
  teacherName,
  studentCount,
  time,
  editMode,
  attendanceRecords,
  onStatusChange,
}: {
  classId: string;
  className: string;
  subject: string;
  teacherName: string;
  studentCount: number;
  time: string;
  editMode: boolean;
  attendanceRecords: AttendanceRecord[];
  onStatusChange: (classId: string, studentId: string, status: AttendanceStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const presentCount = attendanceRecords.filter((a) => a.status === 'present').length;
  const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length;
  const lateCount = attendanceRecords.filter((a) => a.status === 'late').length;

  const isComplete = attendanceRecords.length === studentCount && studentCount > 0;

  return (
    <div className="border-b border-grey-100 last:border-b-0">
      {/* Row Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-grey-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
              isComplete ? 'bg-green-500' : 'bg-grey-400'
            }`}
          >
            {isComplete ? <Check className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-semibold text-grey-900">{className}</div>
            <div className="text-sm text-grey-500">
              {subject} · {teacherName} · {time}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 출결 요약 */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-500">출석 {presentCount}</span>
            {absentCount > 0 && (
              <span className="text-red-500 font-medium">결석 {absentCount}</span>
            )}
            {lateCount > 0 && (
              <span className="text-orange-500">지각 {lateCount}</span>
            )}
            <span className="text-grey-400">/ {studentCount}명</span>
          </div>

          {/* 펼치기 버튼 */}
          <button className="w-8 h-8 flex items-center justify-center text-grey-400 hover:text-grey-600">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 py-4 bg-grey-50 border-t border-grey-100">
          {attendanceRecords.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {attendanceRecords.map((record) => (
                <StudentAttendanceCard
                  key={record.studentId}
                  studentId={record.studentId}
                  studentName={record.studentName}
                  status={record.status}
                  editMode={editMode}
                  onStatusChange={(status) =>
                    onStatusChange(classId, record.studentId, status)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-grey-500 py-4">
              출결 기록이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentAttendanceCard({
  studentId,
  studentName,
  status,
  editMode,
  onStatusChange,
}: {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  editMode: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  const statusConfig = {
    present: { label: '출석', color: 'bg-green-100 text-green-700 border-green-200' },
    absent: { label: '결석', color: 'bg-red-100 text-red-700 border-red-200' },
    late: { label: '지각', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    excused: { label: '사유', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  const config = statusConfig[status] || statusConfig.present;

  if (editMode) {
    return (
      <div className="bg-white border border-grey-200 rounded-lg p-3">
        <div className="font-medium text-grey-900 mb-2">{studentName}</div>
        <div className="flex gap-1">
          {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                status === s
                  ? statusConfig[s].color
                  : 'bg-grey-100 text-grey-500 hover:bg-grey-200'
              }`}
            >
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 border ${config.color}`}>
      <div className="font-medium">{studentName}</div>
      <div className="text-sm opacity-80">{config.label}</div>
    </div>
  );
}
