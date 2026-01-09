/**
 * AttendancePage - 출결 관리 페이지
 *
 * 리팩토링: Stage 54-D-4 (2025-01-07)
 * - 628줄 → ~280줄
 * - Mock 데이터/타입/컴포넌트 별도 파일로 분리
 *
 * 기능:
 * - 날짜별 출결 현황 (달력 + 리스트)
 * - 반별 출결 입력/수정
 * - 출결 통계 KPI
 */
import { useState, useMemo } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  KPICard,
  ClassAttendanceRow,
  MOCK_CLASSES,
  MOCK_ATTENDANCE_DATA,
  type MockClassAttendance,
} from '../../components/admin/attendance';
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
  Inbox,
  Circle,
} from 'lucide-react';

/** 연결 상태 표시 컴포넌트 */
const DataSourceBadge = () => (
  <span
    className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
      isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    <Circle
      className={`w-2 h-2 ${
        isSupabaseConfigured ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'
      }`}
    />
    {isSupabaseConfigured ? 'Supabase' : 'Mock 데이터'}
  </span>
);

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [editMode, setEditMode] = useState(false);
  const [mockAttendance, setMockAttendance] = useState<MockClassAttendance[]>(MOCK_ATTENDANCE_DATA);

  // Supabase 데이터 조회
  const { data: supabaseClasses, isLoading: supabaseClassesLoading } = useClasses({ status: 'active' });
  const { data: todayAttendance, isLoading: todayLoading } = useTodayAttendance();
  const { data: dateAttendance } = useAttendanceByDate(null, selectedDate);
  const saveAttendance = useSaveAttendance();

  // 실제 사용할 반 목록 (Supabase 우선, Mock fallback)
  const classes = useMemo(() => {
    if (isSupabaseConfigured && supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses;
    }
    return MOCK_CLASSES;
  }, [supabaseClasses]);

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
    if (!isSupabaseConfigured) {
      const allRecords = mockAttendance.flatMap((c) => c.records);
      const total = allRecords.length;
      const present = allRecords.filter((r) => r.status === 'present').length;
      const absent = allRecords.filter((r) => r.status === 'absent').length;
      const late = allRecords.filter((r) => r.status === 'late').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 100;
      return { total, present, absent, late, rate };
    }

    if (!todayAttendance) return { total: 0, present: 0, absent: 0, late: 0, rate: 100 };

    interface AttendanceRow {
      status: AttendanceStatus;
    }
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
  const handleStatusChange = async (classId: string, studentId: string, status: AttendanceStatus) => {
    if (!isSupabaseConfigured) {
      setMockAttendance((prev) =>
        prev.map((cls) => {
          if (cls.classId !== classId) return cls;
          return {
            ...cls,
            records: cls.records.map((r) => (r.studentId === studentId ? { ...r, status } : r)),
          };
        })
      );
      return;
    }

    try {
      await saveAttendance.mutateAsync([
        { class_id: classId, student_id: studentId, date: selectedDate, status },
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
          <KPICard label="전체 출결" value={todayStats.total} unit="명" icon={<ClipboardList className="w-4 h-4" />} loading={todayLoading} />
          <KPICard label="출석" value={todayStats.present} unit="명" icon={<CheckCircle className="w-4 h-4" />} color="green" loading={todayLoading} />
          <KPICard label="결석" value={todayStats.absent} unit="명" icon={<XCircle className="w-4 h-4" />} color="red" loading={todayLoading} />
          <KPICard label="출석률" value={todayStats.rate} unit="%" icon={<BarChart3 className="w-4 h-4" />} color="blue" loading={todayLoading} />
        </div>

        {/* 반별 출결 현황 */}
        <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-grey-400" />
              반별 출결 현황
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500">{classes?.length || 0}개 반</span>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  editMode ? 'bg-blue-500 text-white' : 'bg-grey-100 text-grey-700 hover:bg-grey-200'
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
