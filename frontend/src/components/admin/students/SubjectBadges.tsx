/**
 * SubjectBadges - 하이브리드 1줄 뱃지 컴포넌트 (Phase 1 개선)
 *
 * 배정된 과목만 표시 (미배정은 표시 안함)
 * 포맷: "수심화 국정규 영정규" (컬러 뱃지)
 * 장점: 테이블 행 높이 일관성, 공간 효율적, 정보 밀도 높음
 */
import { SUBJECT_CONFIG, LEVEL_DISPLAY, LEVEL_LABELS } from './constants';
import type { SubjectCode, SubjectEnrollment } from './types';

interface SubjectBadgesProps {
  subjectEnrollments?: Partial<Record<SubjectCode, SubjectEnrollment>>;
}

export function SubjectBadges({ subjectEnrollments }: SubjectBadgesProps) {
  // 배정된 과목만 필터링 (수학 → 국어 → 영어 → 과학 순서 유지)
  const subjects: SubjectCode[] = ['math', 'korean', 'english', 'science'];
  const enrolledSubjects = subjects.filter((subject) => !!subjectEnrollments?.[subject]);

  // 배정된 과목이 없으면 "-" 표시
  if (enrolledSubjects.length === 0) {
    return <span className="text-grey-400">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {enrolledSubjects.map((subject) => {
        const enrollment = subjectEnrollments![subject]!;
        const config = SUBJECT_CONFIG[subject];
        const levelDisplay = LEVEL_DISPLAY[enrollment.level] || enrollment.level;

        return (
          <span
            key={subject}
            className={`
              inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
              ${config.bgActive} ${config.textActive}
            `}
            title={`${config.name}: ${enrollment.className} (${LEVEL_LABELS[enrollment.level] || enrollment.level})`}
          >
            {config.short} {levelDisplay}
          </span>
        );
      })}
    </div>
  );
}
