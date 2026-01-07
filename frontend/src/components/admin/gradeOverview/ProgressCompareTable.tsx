/**
 * Phase 9-C: ProgressCompareTable
 *
 * 반별 진도 비교 테이블
 * - 교재, 현재 페이지, 목표 페이지, 진도율
 * - 진도율 막대 그래프
 */
import { ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

interface ClassProgress {
  id: string;
  name: string;
  level: 'high' | 'mid' | 'low';
  studentCount: number;
  textbook: string;
  currentPage: number;
  targetPage: number;
  lastDate: string;
  teacher?: string;
}

interface ProgressCompareTableProps {
  classes: ClassProgress[];
  onClassClick?: (classId: string) => void;
}

export function ProgressCompareTable({ classes, onClassClick }: ProgressCompareTableProps) {
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

  const getProgressRate = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-blue-500';
    if (rate >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressStatus = (rate: number) => {
    if (rate >= 80) return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, label: '순조로움' };
    if (rate >= 50) return { icon: null, label: '정상' };
    return { icon: <AlertCircle className="w-4 h-4 text-orange-500" />, label: '점검 필요' };
  };

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
        <h3 className="font-semibold text-grey-900">반별 진도 현황</h3>
        <span className="text-sm text-grey-500">{classes.length}개 반</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-grey-50 text-left">
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">반</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase">교재</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase text-center">진도 범위</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase" style={{ width: '200px' }}>진도율</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase text-center">마지막 수업</th>
              <th className="px-5 py-3 text-xs font-semibold text-grey-600 uppercase text-center">상태</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const progressRate = getProgressRate(cls.currentPage, cls.targetPage);
              const status = getProgressStatus(progressRate);

              return (
                <tr
                  key={cls.id}
                  className="border-b border-grey-100 last:border-0 hover:bg-grey-50 cursor-pointer transition-colors"
                  onClick={() => onClassClick?.(cls.id)}
                >
                  {/* 반 이름 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-grey-900">{cls.name}</span>
                      {getLevelBadge(cls.level)}
                    </div>
                    <p className="text-xs text-grey-500 mt-0.5">{cls.studentCount}명</p>
                  </td>

                  {/* 교재 */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-grey-700">{cls.textbook}</span>
                  </td>

                  {/* 진도 범위 */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-sm">
                      <span className="text-grey-500">p.1</span>
                      <ArrowRight className="w-3.5 h-3.5 text-grey-400" />
                      <span className="text-blue-600 font-medium">p.{cls.currentPage}</span>
                      <span className="text-grey-400">/</span>
                      <span className="text-grey-500">p.{cls.targetPage}</span>
                    </div>
                  </td>

                  {/* 진도율 바 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-grey-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progressRate)}`}
                          style={{ width: `${progressRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-grey-900 w-12 text-right">
                        {progressRate}%
                      </span>
                    </div>
                  </td>

                  {/* 마지막 수업 */}
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm text-grey-600">{cls.lastDate}</span>
                  </td>

                  {/* 상태 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {status.icon}
                      <span className={`text-xs font-medium ${
                        progressRate >= 80 ? 'text-green-600' :
                        progressRate >= 50 ? 'text-grey-500' : 'text-orange-600'
                      }`}>
                        {status.label}
                      </span>
                    </div>
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
