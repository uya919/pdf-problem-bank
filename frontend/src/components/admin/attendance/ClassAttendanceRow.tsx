/**
 * ClassAttendanceRow - 반별 출결 행 컴포넌트
 */
import { useState } from 'react';
import { Check, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import type { AttendanceStatus } from '../../../types/database';
import type { AttendanceRecord } from './types';
import { StudentAttendanceCard } from './StudentAttendanceCard';

interface ClassAttendanceRowProps {
  classId: string;
  className: string;
  subject: string;
  teacherName: string;
  studentCount: number;
  time: string;
  editMode: boolean;
  attendanceRecords: AttendanceRecord[];
  onStatusChange: (classId: string, studentId: string, status: AttendanceStatus) => void;
}

export function ClassAttendanceRow({
  classId,
  className,
  subject,
  teacherName,
  studentCount,
  time,
  editMode,
  attendanceRecords,
  onStatusChange,
}: ClassAttendanceRowProps) {
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
