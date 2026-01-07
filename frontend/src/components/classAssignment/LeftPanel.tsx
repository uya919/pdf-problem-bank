/**
 * 좌측 패널 (Phase 9-B)
 *
 * 목업 그대로 구현:
 * - 학생 목록 타이틀
 * - 과목 탭 (수학/국어/영어)
 * - 학부 탭 (초등/중등/고등)
 * - 검색창
 * - 미배정 학생 목록 (3명까지, 더보기)
 * - 배정됨 학생 목록 (3명까지, 더보기)
 * - 선택 액션바
 */
import React, { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { SubjectCode, Division, ClassLevel, StudentBySubject, ClassBySubject } from '@/types/database';

/** 기본 표시 학생 수 */
const DEFAULT_VISIBLE_COUNT = 3;

// 과목 설정
const SUBJECTS: Record<SubjectCode, { name: string; activeClass: string }> = {
  math: { name: '수학', activeClass: 'bg-blue-500 text-white' },
  korean: { name: '국어', activeClass: 'bg-green-500 text-white' },
  english: { name: '영어', activeClass: 'bg-purple-500 text-white' },
};

// 학부 설정
const DIVISIONS: { code: Division; name: string }[] = [
  { code: 'elementary', name: '초등' },
  { code: 'middle', name: '중등' },
  { code: 'high', name: '고등' },
];

// 타과목 배지 스타일
const SUBJECT_BADGE_STYLES: Record<SubjectCode, string> = {
  math: 'bg-blue-50 text-blue-600',
  korean: 'bg-green-50 text-green-600',
  english: 'bg-purple-50 text-purple-600',
};

interface LeftPanelProps {
  // 필터 상태
  activeSubject: SubjectCode;
  activeDivision: Division | null;
  searchQuery: string;
  // 필터 변경 핸들러
  onSubjectChange: (subject: SubjectCode) => void;
  onDivisionChange: (division: Division | null) => void;
  onSearchChange: (query: string) => void;
  // 학생 데이터
  unassignedStudents: StudentBySubject[];
  assignedStudents: StudentBySubject[];
  // 선택 상태
  selectedStudentIds: Set<string>;
  onStudentClick: (studentId: string, e?: React.MouseEvent) => void;
  // 액션바
  classes: ClassBySubject[];
  onAssignToClass: (classId: string) => void;
  onUnassign: () => void;
  // 로딩
  isLoading?: boolean;
}

/** 드래그 가능한 학생 카드 */
function DraggableStudent({
  student,
  activeSubject,
  isSelected,
  isAssigned,
  onClick,
}: {
  student: StudentBySubject;
  activeSubject: SubjectCode;
  isSelected: boolean;
  isAssigned: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: student.student_id,
  });

  // 타과목 배지 렌더링 (현재 과목 제외)
  const otherSubjectBadges = useMemo(() => {
    const badges: React.ReactNode[] = [];
    // TODO: student에 enrolled 정보가 있으면 사용
    // 현재는 임시로 표시하지 않음
    return badges;
  }, []);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        flex items-center gap-2 p-2 rounded-lg cursor-grab transition-all
        ${isDragging ? 'opacity-50 scale-105' : ''}
        ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'hover:bg-gray-50'}
      `}
    >
      {/* 체크박스/상태 아이콘 */}
      {isAssigned ? (
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      ) : (
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
            ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
          `}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* 학생 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">{student.student_name}</span>
          {/* 타과목 배지 (미배정 학생에게만 표시) */}
          {!isAssigned && otherSubjectBadges.length > 0 && (
            <div className="flex gap-1">{otherSubjectBadges}</div>
          )}
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          {isAssigned ? (
            <span className="text-blue-500">{student.class_name}</span>
          ) : (
            <>
              {student.school && <span>{student.school}</span>}
              {student.school && student.student_grade && <span>·</span>}
              <span>{student.student_grade}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 선택 액션바 */
function SelectionActionBar({
  selectedCount,
  classes,
  onAssignToClass,
  onUnassign,
}: {
  selectedCount: number;
  classes: ClassBySubject[];
  onAssignToClass: (classId: string) => void;
  onUnassign: () => void;
}) {
  if (selectedCount === 0) return null;

  // 레벨별로 첫 번째 반만 표시
  const uniqueClasses = classes.reduce((acc, cls) => {
    const level = (cls.level || 'regular') as ClassLevel;
    if (!acc.has(level)) {
      acc.set(level, cls);
    }
    return acc;
  }, new Map<ClassLevel, ClassBySubject>());

  const levelLabels: Record<ClassLevel, string> = {
    advanced: '심화',
    regular: '정규',
    regular2: '정규2',
    basic: '기초',
  };

  return (
    <div className="p-3 border-t border-gray-100 bg-gray-50">
      <div className="text-sm text-gray-700 mb-2">
        <span className="font-medium">{selectedCount}</span>명 선택됨
      </div>
      <div className="flex gap-2 flex-wrap">
        {(['advanced', 'regular', 'regular2', 'basic'] as ClassLevel[]).map((level) => {
          const cls = uniqueClasses.get(level);
          if (!cls) return null;

          return (
            <button
              key={level}
              onClick={() => onAssignToClass(cls.id)}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              {levelLabels[level]}
            </button>
          );
        })}
        <button
          onClick={onUnassign}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          배정 해제
        </button>
      </div>
    </div>
  );
}

export function LeftPanel({
  activeSubject,
  activeDivision,
  searchQuery,
  onSubjectChange,
  onDivisionChange,
  onSearchChange,
  unassignedStudents,
  assignedStudents,
  selectedStudentIds,
  onStudentClick,
  classes,
  onAssignToClass,
  onUnassign,
  isLoading,
}: LeftPanelProps) {
  // 접기/펼치기 상태
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);
  const [showAllAssigned, setShowAllAssigned] = useState(false);

  // 표시할 학생 목록
  const visibleUnassigned = showAllUnassigned
    ? unassignedStudents
    : unassignedStudents.slice(0, DEFAULT_VISIBLE_COUNT);
  const visibleAssigned = showAllAssigned
    ? assignedStudents
    : assignedStudents.slice(0, DEFAULT_VISIBLE_COUNT);

  // 더 있는지 여부
  const hasMoreUnassigned = unassignedStudents.length > DEFAULT_VISIBLE_COUNT;
  const hasMoreAssigned = assignedStudents.length > DEFAULT_VISIBLE_COUNT;
  const hiddenUnassignedCount = unassignedStudents.length - DEFAULT_VISIBLE_COUNT;
  const hiddenAssignedCount = assignedStudents.length - DEFAULT_VISIBLE_COUNT;

  return (
    <aside className="w-[320px] bg-white border-r border-gray-200 flex flex-col">
      {/* 헤더 영역 */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900 mb-3">학생 목록</h2>

        {/* 과목 탭 */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
          {(['math', 'korean', 'english'] as SubjectCode[]).map((subject) => (
            <button
              key={subject}
              onClick={() => onSubjectChange(subject)}
              className={`
                flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${activeSubject === subject
                  ? SUBJECTS[subject].activeClass
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {SUBJECTS[subject].name}
            </button>
          ))}
        </div>

        {/* 학부 탭 */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
          {DIVISIONS.map(({ code, name }) => (
            <button
              key={code}
              onClick={() => onDivisionChange(code)}
              className={`
                flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all
                ${activeDivision === code
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {name}
            </button>
          ))}
        </div>

        {/* 검색창 */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="학생 검색..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 학생 목록 */}
      <div className="flex-1 overflow-y-auto">
        {/* 미배정 섹션 */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {SUBJECTS[activeSubject].name} 미배정
            </span>
            <span className="text-xs text-orange-500 font-medium">
              {unassignedStudents.length}명
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : unassignedStudents.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">
              미배정 학생이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {visibleUnassigned.map((student) => (
                <DraggableStudent
                  key={student.student_id}
                  student={student}
                  activeSubject={activeSubject}
                  isSelected={selectedStudentIds.has(student.student_id)}
                  isAssigned={false}
                  onClick={(e) => onStudentClick(student.student_id, e)}
                />
              ))}
              {/* 더보기/접기 버튼 */}
              {hasMoreUnassigned && (
                <button
                  onClick={() => setShowAllUnassigned(!showAllUnassigned)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  {showAllUnassigned ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      접기
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      +{hiddenUnassignedCount}명 더보기
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-px bg-gray-100 mx-3" />

        {/* 배정됨 섹션 */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">배정됨</span>
            <span className="text-xs text-blue-500 font-medium">
              {assignedStudents.length}명
            </span>
          </div>

          {assignedStudents.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">
              배정된 학생이 없습니다
            </div>
          ) : (
            <div className="space-y-1">
              {visibleAssigned.map((student) => (
                <DraggableStudent
                  key={student.student_id}
                  student={student}
                  activeSubject={activeSubject}
                  isSelected={selectedStudentIds.has(student.student_id)}
                  isAssigned={true}
                  onClick={(e) => onStudentClick(student.student_id, e)}
                />
              ))}
              {/* 더보기/접기 버튼 */}
              {hasMoreAssigned && (
                <button
                  onClick={() => setShowAllAssigned(!showAllAssigned)}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  {showAllAssigned ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      접기
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      +{hiddenAssignedCount}명 더보기
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 선택 액션바 */}
      <SelectionActionBar
        selectedCount={selectedStudentIds.size}
        classes={classes}
        onAssignToClass={onAssignToClass}
        onUnassign={onUnassign}
      />
    </aside>
  );
}
