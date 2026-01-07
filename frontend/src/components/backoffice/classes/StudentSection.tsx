/**
 * StudentSection - 학생 섹션 (최하단)
 *
 * 목업: classes-page-v3-segment-control.html
 * - 학생 칩 그리드
 * - 기본 5명 표시 + "더보기"
 * - 최하단 배치 (참조용 정보)
 */
import { useState } from 'react';

export interface Student {
  id: string;
  name: string;
  grade: string;
}

interface StudentSectionProps {
  students: Student[];
  initialDisplayCount?: number;
}

export function StudentSection({
  students,
  initialDisplayCount = 5,
}: StudentSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedStudents = showAll
    ? students
    : students.slice(0, initialDisplayCount);
  const hiddenCount = students.length - initialDisplayCount;

  return (
    <div className="bg-white mx-4 mt-3 mb-24 rounded-2xl border border-[#E5E8EB] overflow-hidden">
      <div className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">👥</span>
            <span className="text-sm font-semibold text-[#191F28]">학생</span>
          </div>
          <span className="text-xs text-[#8B95A1]">{students.length}명</span>
        </div>

        {/* 학생 칩들 */}
        <div className="flex flex-wrap gap-2">
          {displayedStudents.map((student) => (
            <div
              key={student.id}
              className="px-3 py-2 bg-[#F2F4F6] rounded-lg"
            >
              <div className="text-sm text-[#333D4B]">{student.name}</div>
              <div className="text-[10px] text-[#8B95A1]">{student.grade}</div>
            </div>
          ))}

          {/* 더보기 버튼 */}
          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="px-3 py-2 text-sm text-[#3182F6] font-medium hover:underline"
            >
              +{hiddenCount}명 더보기
            </button>
          )}

          {/* 접기 버튼 */}
          {showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(false)}
              className="px-3 py-2 text-sm text-[#8B95A1] font-medium hover:underline"
            >
              접기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentSection;
