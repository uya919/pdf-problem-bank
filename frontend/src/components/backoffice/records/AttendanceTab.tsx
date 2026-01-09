/**
 * AttendanceTab - 출결 탭 컴포넌트
 * RecordsPage에서 분리됨
 */
import { useState, useMemo } from 'react';
import { useAttendanceByDate } from '../../../hooks/useBackofficeData';
import type { ClassAttendanceData } from '../../../hooks/useBackofficeData';
import type { TabProps, ClassAttendance, AttendanceRecord } from './types';
import { formatDate } from './utils';

export function AttendanceTab({ selectedClassId, teacherId }: TabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회
  const { data: supabaseAttendance } = useAttendanceByDate(teacherId, dateStr);

  // Supabase 데이터 사용
  const attendanceData: ClassAttendanceData[] = useMemo(() => {
    if (supabaseAttendance && supabaseAttendance.length > 0) {
      return supabaseAttendance;
    }
    return [];
  }, [supabaseAttendance]);

  // 필터링 적용
  const filteredData = selectedClassId
    ? attendanceData.filter(cls => cls.classId === selectedClassId)
    : attendanceData;

  const stats = useMemo(() => {
    return filteredData.reduce(
      (acc, cls) => {
        cls.records.forEach((r) => {
          if (r.status === 'present') acc.present++;
          else if (r.status === 'late') acc.late++;
          else if (r.status === 'absent') acc.absent++;
        });
        return acc;
      },
      { present: 0, late: 0, absent: 0 }
    );
  }, [filteredData]);

  const total = stats.present + stats.late + stats.absent;
  const attendanceRate = total > 0 ? Math.round((stats.present / total) * 100) : 0;

  return (
    <>
      {/* 요약 카드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">이번 주 출결 현황</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[24px] font-bold text-[#00C896]">{stats.present}</div>
            <div className="text-[11px] text-[#8B95A1]">출석</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#FF9800]">{stats.late}</div>
            <div className="text-[11px] text-[#8B95A1]">지각</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#F04452]">{stats.absent}</div>
            <div className="text-[11px] text-[#8B95A1]">결석</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#3182F6]">{attendanceRate}%</div>
            <div className="text-[11px] text-[#8B95A1]">출석률</div>
          </div>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[15px] font-semibold text-[#191F28]">{formatDate(currentDate)}</div>
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 수업별 출결 (반별 그룹핑) */}
      <div className="space-y-3">
        {filteredData.map((cls) => (
          <ClassAttendanceCard key={cls.classId} classData={cls} />
        ))}
      </div>
    </>
  );
}

function ClassAttendanceCard({ classData }: { classData: ClassAttendance }) {
  const summary = classData.records.reduce(
    (acc, r) => {
      if (r.status === 'present') acc.present++;
      else if (r.status === 'late') acc.late++;
      else if (r.status === 'absent') acc.absent++;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[#191F28]">{classData.className}</div>
            <div className="text-[12px] text-[#8B95A1]">{classData.time}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold rounded">{summary.present}</span>
            <span className="px-2 py-0.5 bg-[#FFF3E0] text-[#E65100] text-[11px] font-bold rounded">{summary.late}</span>
            <span className="px-2 py-0.5 bg-[#FFEBEE] text-[#F04452] text-[11px] font-bold rounded">{summary.absent}</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#F2F4F6]">
        {classData.records.map((record) => (
          <div key={record.studentId} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full text-white text-[12px] font-bold flex items-center justify-center"
                style={{ backgroundColor: record.studentColor }}
              >
                {record.studentName.charAt(0)}
              </div>
              <span className="text-[14px] text-[#191F28]">{record.studentName}</span>
            </div>
            <span
              className={`px-2.5 py-1 text-[12px] font-medium rounded-full ${
                record.status === 'present'
                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                  : record.status === 'late'
                    ? 'bg-[#FFF3E0] text-[#E65100]'
                    : 'bg-[#FFEBEE] text-[#F04452]'
              }`}
            >
              {record.status === 'present' ? '출석' : record.status === 'late' ? `지각${record.note ? ` (${record.note})` : ''}` : `결석${record.note ? ` (${record.note})` : ''}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AttendanceTab;
