/**
 * StudentDetailModal - 학생 상세 정보 모달
 *
 * 학생의 연락처, 과목별 배정 현황, 학습 통계 표시
 */
import type { StudentWithEnrollments } from '../../../types/database';
import type { MockStudent, StudentStatsData } from './types';
import { SubjectEnrollmentGrid } from './SubjectEnrollmentGrid';
import { getGradeString } from './utils';

interface StudentDetailModalProps {
  student: MockStudent | StudentWithEnrollments;
  stats?: StudentStatsData;
  onClose: () => void;
}

export function StudentDetailModal({ student, stats, onClose }: StudentDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[600px] max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-grey-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {student.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-grey-900">{student.name}</h2>
              <p className="text-sm text-grey-500">
                {getGradeString(student)} · {student.school || '학교 미등록'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* 연락처 정보 */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">연락처</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-grey-50 rounded-lg p-3">
                <div className="text-xs text-grey-500 mb-1">학생 연락처</div>
                <div className="font-medium text-grey-900">{student.phone || '-'}</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-3">
                <div className="text-xs text-grey-500 mb-1">학부모 연락처</div>
                <div className="font-medium text-grey-900">{student.parent_phone || '-'}</div>
              </div>
            </div>
          </section>

          {/* 과목별 배정 현황 (Phase 4) */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">과목별 배정 현황</h3>
            <SubjectEnrollmentGrid student={student} />
          </section>

          {/* 학습 통계 */}
          <section>
            <h3 className="font-semibold text-grey-900 mb-3">이번 달 통계</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {stats?.attendanceRate ?? '-'}%
                </div>
                <div className="text-sm text-grey-500 mt-1">출석률</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {stats?.homeworkRate ?? '-'}%
                </div>
                <div className="text-sm text-grey-500 mt-1">숙제 제출률</div>
              </div>
              <div className="bg-grey-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-grey-900">
                  {stats?.averageScore ?? '-'}점
                </div>
                <div className="text-sm text-grey-500 mt-1">평균 점수</div>
              </div>
            </div>
          </section>

          {/* 최근 시험 */}
          {stats && (
            <section>
              <h3 className="font-semibold text-grey-900 mb-3">최근 시험</h3>
              <div className="bg-grey-50 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-grey-900">{stats.recentScore}점</div>
                  <div className="text-sm text-grey-500">최근 시험 점수</div>
                </div>
                {stats.scoreTrend !== 0 && (
                  <div
                    className={`text-lg font-bold ${
                      stats.scoreTrend > 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {stats.scoreTrend > 0 ? '+' : ''}
                    {stats.scoreTrend}점
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 메모 */}
          {student.notes && (
            <section>
              <h3 className="font-semibold text-grey-900 mb-3">메모</h3>
              <div className="bg-grey-50 rounded-lg p-4 text-grey-700 text-sm">{student.notes}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
