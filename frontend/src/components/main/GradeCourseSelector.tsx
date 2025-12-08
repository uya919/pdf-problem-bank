/**
 * GradeCourseSelector Component (Phase 34.5-H)
 *
 * 학년 + 과정 선택
 */
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { GradeInfo, SchoolLevel } from '../../lib/documentParser';

interface GradeCourseSelectorProps {
  school: SchoolLevel;
  grades: GradeInfo[];
  selectedGrade: string | null;
  selectedCourse: string | null;
  onGradeChange: (grade: string) => void;
  onCourseChange: (course: string) => void;
}

export function GradeCourseSelector({
  school,
  grades,
  selectedGrade,
  selectedCourse,
  onGradeChange,
  onCourseChange,
}: GradeCourseSelectorProps) {
  const selectedGradeInfo = grades.find((g) => g.id === selectedGrade);

  // 과정이 1개면 자동 선택
  useEffect(() => {
    if (selectedGradeInfo && selectedGradeInfo.courses.length === 1 && !selectedCourse) {
      onCourseChange(selectedGradeInfo.courses[0].id);
    }
  }, [selectedGradeInfo, selectedCourse, onCourseChange]);

  if (grades.length === 0) {
    return (
      <div className="text-center py-6 text-grey-400">
        <p>등록된 문서가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 학년 선택 */}
      <div>
        <div className="text-xs font-medium text-grey-500 mb-2">학년 선택</div>
        <div className="flex flex-wrap gap-2">
          {grades.map((grade) => (
            <button
              key={grade.id}
              onClick={() => onGradeChange(grade.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedGrade === grade.id
                  ? 'bg-toss-blue text-white shadow-md shadow-toss-blue/30'
                  : 'bg-white border border-grey-200 text-grey-700 hover:border-toss-blue hover:text-toss-blue'}
              `}
            >
              {grade.id}
              <span className="ml-1 text-xs opacity-60">({grade.courses.length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 과정 선택 (학년 선택 후, 2개 이상일 때만) */}
      {selectedGradeInfo && selectedGradeInfo.courses.length > 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="text-xs font-medium text-grey-500 mb-2">과정 선택</div>
          <div className="flex flex-wrap gap-2">
            {selectedGradeInfo.courses.map((course) => (
              <button
                key={course.id}
                onClick={() => onCourseChange(course.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${selectedCourse === course.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white border border-grey-200 text-grey-700 hover:border-purple-600 hover:text-purple-600'}
                `}
              >
                {course.label}
                <span className="ml-1 text-xs opacity-60">({course.series.length})</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
