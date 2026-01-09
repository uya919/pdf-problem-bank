/**
 * SubjectEnrollmentGrid - 모달용 과목별 배정 현황 그리드
 *
 * 각 과목별 배정 정보를 카드 형태로 표시
 */
import type { StudentWithEnrollments } from '../../../types/database';
import { SUBJECT_CONFIG, LEVEL_LABELS } from './constants';
import type { MockStudent, SubjectCode } from './types';
import { getSubjectEnrollments } from './utils';

interface SubjectEnrollmentGridProps {
  student: MockStudent | StudentWithEnrollments;
}

export function SubjectEnrollmentGrid({ student }: SubjectEnrollmentGridProps) {
  const subjects: SubjectCode[] = ['math', 'korean', 'english', 'science'];
  // Mock/Supabase 모두 지원
  const subjectEnrollments = getSubjectEnrollments(student);

  return (
    <div className="grid grid-cols-2 gap-3">
      {subjects.map((subject) => {
        const enrollment = subjectEnrollments?.[subject];
        const config = SUBJECT_CONFIG[subject];
        const isEnrolled = !!enrollment;

        return (
          <div
            key={subject}
            className={`
              rounded-xl p-4 border-2 transition-all
              ${
                isEnrolled
                  ? `${config.bgActive} ${config.borderActive}`
                  : 'bg-grey-50 border-grey-200'
              }
            `}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${
                  isEnrolled
                    ? 'bg-white/20 text-white'
                    : `${config.borderInactive} border-2 ${config.textInactive}`
                }
              `}
              >
                {config.short}
              </div>
              <span className={`font-semibold ${isEnrolled ? 'text-white' : 'text-grey-400'}`}>
                {config.name}
              </span>
            </div>
            {isEnrolled ? (
              <div className="text-white/90">
                <div className="text-sm font-medium">{enrollment.className}</div>
                <div className="text-xs text-white/70 mt-0.5">
                  {LEVEL_LABELS[enrollment.level] || enrollment.level}
                </div>
              </div>
            ) : (
              <div className="text-grey-400 text-sm">미배정</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
