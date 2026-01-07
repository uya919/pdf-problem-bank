/**
 * Phase 9-D: HomeworkStatusTable
 *
 * 반별 숙제 현황 테이블
 * - 숙제 범위
 * - 마감일
 * - 제출 현황 (● ○ 표시)
 * - 미제출 학생 목록
 */
import { Clock, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';

interface HomeworkStatus {
  id: string;
  className: string;
  level: 'high' | 'mid' | 'low';
  homework: {
    range: string;
    dueDate: string;
    submitted: number;
    total: number;
    pending: string[]; // 미제출 학생 이름
  };
}

interface HomeworkStatusTableProps {
  classes: HomeworkStatus[];
  onClassClick?: (classId: string) => void;
}

export function HomeworkStatusTable({ classes, onClassClick }: HomeworkStatusTableProps) {
  const getLevelBadge = (level: string) => {
    const styles = {
      high: 'bg-blue-100 text-blue-700',
      mid: 'bg-green-100 text-green-700',
      low: 'bg-orange-100 text-orange-700',
    };
    const labels = {
      high: '상',
      mid: '중',
      low: '기초',
    };
    return (
      <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${styles[level as keyof typeof styles] || 'bg-grey-100 text-grey-600'}`}>
        {labels[level as keyof typeof labels] || level}
      </span>
    );
  };

  const getSubmissionRate = (submitted: number, total: number) => {
    return Math.round((submitted / total) * 100);
  };

  const getDueDateStatus = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate.replace(/\//g, '-'));
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { color: 'text-red-600', label: '마감됨', urgent: true };
    if (diffDays === 0) return { color: 'text-orange-600', label: '오늘 마감', urgent: true };
    if (diffDays <= 2) return { color: 'text-orange-500', label: `D-${diffDays}`, urgent: true };
    return { color: 'text-grey-500', label: dueDate, urgent: false };
  };

  const renderSubmissionDots = (submitted: number, total: number) => {
    const dots = [];
    const maxDisplay = 10;
    const displayCount = Math.min(total, maxDisplay);

    for (let i = 0; i < displayCount; i++) {
      dots.push(
        <span key={i} className={`${i < submitted ? 'text-green-500' : 'text-grey-300'}`}>
          {i < submitted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </span>
      );
    }

    if (total > maxDisplay) {
      dots.push(
        <span key="more" className="text-xs text-grey-400 ml-1">
          +{total - maxDisplay}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-0.5">
        {dots}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
        <h3 className="font-semibold text-grey-900">숙제 제출 현황</h3>
        <div className="flex items-center gap-3 text-xs text-grey-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            제출
          </span>
          <span className="flex items-center gap-1">
            <Circle className="w-3.5 h-3.5 text-grey-300" />
            미제출
          </span>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-grey-50 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">반</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">숙제 범위</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase text-center">마감일</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">제출 현황</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">미제출</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const rate = getSubmissionRate(cls.homework.submitted, cls.homework.total);
              const dueStatus = getDueDateStatus(cls.homework.dueDate);

              return (
                <tr
                  key={cls.id}
                  className="border-b border-grey-100 last:border-0 hover:bg-grey-50 cursor-pointer transition-colors"
                  onClick={() => onClassClick?.(cls.id)}
                >
                  {/* 반 이름 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-grey-900">{cls.className}</span>
                      {getLevelBadge(cls.level)}
                    </div>
                  </td>

                  {/* 숙제 범위 */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-grey-700">{cls.homework.range}</span>
                  </td>

                  {/* 마감일 */}
                  <td className="px-5 py-4 text-center">
                    <div className={`flex items-center justify-center gap-1 ${dueStatus.color}`}>
                      {dueStatus.urgent && <Clock className="w-3.5 h-3.5" />}
                      <span className="text-sm font-medium">{dueStatus.label}</span>
                    </div>
                  </td>

                  {/* 제출 현황 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {renderSubmissionDots(cls.homework.submitted, cls.homework.total)}
                      <span className={`text-sm font-semibold ${
                        rate === 100 ? 'text-green-600' :
                        rate >= 80 ? 'text-blue-600' :
                        rate >= 50 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {cls.homework.submitted}/{cls.homework.total}
                      </span>
                    </div>
                  </td>

                  {/* 미제출 학생 */}
                  <td className="px-5 py-4">
                    {cls.homework.pending.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm text-orange-600">
                          {cls.homework.pending.slice(0, 2).join(', ')}
                          {cls.homework.pending.length > 2 && ` 외 ${cls.homework.pending.length - 2}명`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        완료
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
