/**
 * StudentAttendanceCard - 학생 출결 카드 컴포넌트
 */
import type { AttendanceStatus } from '../../../types/database';

interface StudentAttendanceCardProps {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  editMode: boolean;
  onStatusChange: (status: AttendanceStatus) => void;
}

const STATUS_CONFIG = {
  present: { label: '출석', color: 'bg-green-100 text-green-700 border-green-200' },
  absent: { label: '결석', color: 'bg-red-100 text-red-700 border-red-200' },
  late: { label: '지각', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  excused: { label: '사유', color: 'bg-blue-100 text-blue-700 border-blue-200' },
};

export function StudentAttendanceCard({
  studentName,
  status,
  editMode,
  onStatusChange,
}: StudentAttendanceCardProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.present;

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
                  ? STATUS_CONFIG[s].color
                  : 'bg-grey-100 text-grey-500 hover:bg-grey-200'
              }`}
            >
              {STATUS_CONFIG[s].label}
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
