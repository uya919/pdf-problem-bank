/**
 * 과목별 반 배정 페이지 - 드래그&드롭 버전 (Phase 7-F)
 *
 * @dnd-kit을 사용한 완전한 드래그&드롭 구현
 */
import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { SubjectCode, Division, ClassLevel, StudentBySubject } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';
import {
  useSubjects,
  useClassesBySubject,
  useStudentsBySubject,
  useAssignStudents,
  useUnassignedCounts,
} from '@/hooks/useClassAssignment';
import { SubjectTabs } from './SubjectTabs';
import { DivisionFilter } from './DivisionFilter';
import { DraggableStudentCard } from './DraggableStudentCard';
import { DroppableClassColumn } from './DroppableClassColumn';
import { StudentCardSkeleton } from './StudentCard';
import { ClassColumnSkeleton } from './ClassColumn';
import { ShortcutButton, ShortcutModal } from './ShortcutModal';

// 단축키-레벨 매핑
const SHORTCUT_LEVELS: Record<string, ClassLevel> = {
  q: 'advanced',
  w: 'regular',
  e: 'regular2',
  r: 'basic',
};

const LEVEL_SHORTCUTS: Record<ClassLevel, string> = {
  advanced: 'Q',
  regular: 'W',
  regular2: 'E',
  basic: 'R',
};

export function ClassAssignmentPageDnd() {
  // 상태
  const [activeSubject, setActiveSubject] = useState<SubjectCode>('math');
  const [activeDivision, setActiveDivision] = useState<Division | null>('middle');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<StudentBySubject | null>(null);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    })
  );

  // 데이터 조회
  const { data: classes, isLoading: classesLoading } = useClassesBySubject(
    activeSubject,
    activeDivision || undefined
  );
  const { data: students, isLoading: studentsLoading } = useStudentsBySubject(
    activeSubject,
    activeDivision || undefined
  );

  // 과목별 미배정 카운트
  const mathCounts = useUnassignedCounts('math', activeDivision || undefined);
  const koreanCounts = useUnassignedCounts('korean', activeDivision || undefined);
  const englishCounts = useUnassignedCounts('english', activeDivision || undefined);

  const unassignedCounts: Record<SubjectCode, number> = {
    math: mathCounts.unassigned,
    korean: koreanCounts.unassigned,
    english: englishCounts.unassigned,
  };

  // 뮤테이션
  const assignMutation = useAssignStudents();

  // 미배정/배정 학생 분리
  const unassignedStudents = (students || []).filter((s) => !s.class_id);
  const assignedStudents = (students || []).filter((s) => s.class_id);

  // 레벨별 반 그룹화
  const classesByLevel = (classes || []).reduce(
    (acc, cls) => {
      const level = (cls.level || 'regular') as ClassLevel;
      if (!acc[level]) acc[level] = [];
      acc[level].push(cls);
      return acc;
    },
    {} as Record<ClassLevel, typeof classes>
  );

  // 학생 선택 핸들러
  const handleStudentClick = useCallback(
    (studentId: string, e?: React.MouseEvent) => {
      setSelectedStudentIds((prev) => {
        const newSet = new Set(prev);

        if (e?.ctrlKey || e?.metaKey) {
          if (newSet.has(studentId)) {
            newSet.delete(studentId);
          } else {
            newSet.add(studentId);
          }
        } else if (e?.shiftKey && prev.size > 0) {
          const studentList = students || [];
          const lastSelected = Array.from(prev).pop();
          const lastIdx = studentList.findIndex((s) => s.student_id === lastSelected);
          const currentIdx = studentList.findIndex((s) => s.student_id === studentId);
          const [start, end] = [Math.min(lastIdx, currentIdx), Math.max(lastIdx, currentIdx)];
          studentList.slice(start, end + 1).forEach((s) => newSet.add(s.student_id));
        } else {
          newSet.clear();
          newSet.add(studentId);
        }

        return newSet;
      });
    },
    [students]
  );

  // 반 배정 핸들러
  const handleAssignToClass = useCallback(
    async (classId: string, studentIds?: string[]) => {
      const idsToAssign = studentIds || Array.from(selectedStudentIds);
      if (idsToAssign.length === 0) return;

      try {
        await assignMutation.mutateAsync({
          studentIds: idsToAssign,
          classId,
        });

        // 배정 후 다음 미배정 학생 자동 선택
        const remainingUnassigned = unassignedStudents.filter(
          (s) => !idsToAssign.includes(s.student_id)
        );
        if (remainingUnassigned.length > 0) {
          setSelectedStudentIds(new Set([remainingUnassigned[0].student_id]));
        } else {
          setSelectedStudentIds(new Set());
        }
      } catch (error) {
        console.error('배정 실패:', error);
      }
    },
    [selectedStudentIds, assignMutation, unassignedStudents]
  );

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const student = (students || []).find((s) => s.student_id === active.id);
    if (student) {
      setActiveDragStudent(student);
      // 드래그 중인 학생이 선택되어 있지 않으면 선택에 추가
      if (!selectedStudentIds.has(student.student_id)) {
        setSelectedStudentIds(new Set([student.student_id]));
      }
    }
  };

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragStudent(null);

    if (over && over.id.toString().startsWith('class-')) {
      const classId = over.id.toString().replace('class-', '');
      // 선택된 학생들 모두 배정 (또는 드래그 중인 학생만)
      const studentIds = selectedStudentIds.size > 1
        ? Array.from(selectedStudentIds)
        : [active.id.toString()];
      handleAssignToClass(classId, studentIds);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ? 키: 단축키 모달
      if (e.key === '?' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Esc: 선택 해제 또는 모달 닫기
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          setSelectedStudentIds(new Set());
        }
        return;
      }

      // Ctrl+A: 전체 선택
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const allIds = new Set((students || []).map((s) => s.student_id));
        setSelectedStudentIds(allIds);
        return;
      }

      // Q/W/E/R: 반 배정
      const level = SHORTCUT_LEVELS[e.key.toLowerCase()];
      if (level && selectedStudentIds.size > 0 && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const targetClass = (classes || []).find((c) => c.level === level);
        if (targetClass) {
          handleAssignToClass(targetClass.id);
        }
        return;
      }

      // 화살표 키: 학생 이동
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.ctrlKey) {
        e.preventDefault();
        const studentList = students || [];
        if (studentList.length === 0) return;

        const currentId = Array.from(selectedStudentIds).pop();
        const currentIdx = currentId
          ? studentList.findIndex((s) => s.student_id === currentId)
          : -1;

        let nextIdx: number;
        if (e.key === 'ArrowUp') {
          nextIdx = currentIdx <= 0 ? studentList.length - 1 : currentIdx - 1;
        } else {
          nextIdx = currentIdx >= studentList.length - 1 ? 0 : currentIdx + 1;
        }

        setSelectedStudentIds(new Set([studentList[nextIdx].student_id]));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, classes, selectedStudentIds, showShortcuts, handleAssignToClass]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-gray-50">
        {/* 헤더 */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">과목별 반 배정</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                학생을 드래그하거나 단축키(Q/W/E/R)로 빠르게 배정하세요
              </p>
            </div>
            <ShortcutButton />
          </div>

          {/* 과목 탭 */}
          <SubjectTabs
            activeSubject={activeSubject}
            onSubjectChange={setActiveSubject}
            unassignedCounts={unassignedCounts}
          />

          {/* 학부 필터 */}
          <div className="mt-3">
            <DivisionFilter
              activeDivision={activeDivision}
              onDivisionChange={setActiveDivision}
            />
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 학생 목록 */}
          <div className="w-80 border-r bg-white flex flex-col">
            {/* 미배정 학생 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">
                  미배정 학생
                  <span className="ml-2 text-sm font-normal text-orange-600">
                    ({unassignedStudents.length}명)
                  </span>
                </h2>
                {selectedStudentIds.size > 0 && (
                  <span className="text-sm text-blue-600">
                    {selectedStudentIds.size}명 선택
                  </span>
                )}
              </div>

              {studentsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <StudentCardSkeleton key={i} />
                  ))}
                </div>
              ) : unassignedStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>모든 학생이 배정되었습니다</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedStudents.map((student) => (
                    <DraggableStudentCard
                      key={student.student_id}
                      student={student}
                      subject={activeSubject}
                      isSelected={selectedStudentIds.has(student.student_id)}
                      onClick={(e) => handleStudentClick(student.student_id, e)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 배정된 학생 */}
            {assignedStudents.length > 0 && (
              <div className="border-t p-4 max-h-[200px] overflow-y-auto">
                <h2 className="font-semibold text-gray-500 text-sm mb-2">
                  배정 완료 ({assignedStudents.length}명)
                </h2>
                <div className="space-y-1">
                  {assignedStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="text-sm text-gray-500 flex items-center justify-between py-1"
                    >
                      <span>{student.student_name}</span>
                      <span className="text-xs text-gray-400">{student.class_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 반 컬럼들 */}
          <div className="flex-1 p-6 overflow-x-auto">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-gray-900">
                {SUBJECT_CONFIG[activeSubject].name} 반
              </h2>
              <span className="text-sm text-gray-500">
                (선택: {selectedStudentIds.size}명)
              </span>
            </div>

            {classesLoading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <ClassColumnSkeleton key={i} />
                ))}
              </div>
            ) : (classes || []).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>등록된 반이 없습니다</p>
                <p className="text-sm mt-1">관리자에게 문의하세요</p>
              </div>
            ) : (
              <div className="flex gap-4">
                {(['advanced', 'regular', 'regular2', 'basic'] as ClassLevel[]).map(
                  (level) => {
                    const levelClasses = classesByLevel[level] || [];
                    if (levelClasses.length === 0) return null;

                    const classInfo = levelClasses[0];
                    const assignedNames = (students || [])
                      .filter((s) => s.class_id === classInfo.id)
                      .map((s) => s.student_name);

                    return (
                      <DroppableClassColumn
                        key={level}
                        classInfo={classInfo}
                        subject={activeSubject}
                        assignedStudentNames={assignedNames}
                        shortcutKey={LEVEL_SHORTCUTS[level]}
                        onAssign={() => handleAssignToClass(classInfo.id)}
                      />
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay>
          {activeDragStudent && (
            <div className="p-3 rounded-lg border-2 border-blue-500 bg-blue-50 shadow-2xl opacity-90">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">
                  {activeDragStudent.student_name}
                </span>
                {selectedStudentIds.size > 1 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500 text-white">
                    +{selectedStudentIds.size - 1}명
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {activeDragStudent.student_grade}
              </div>
            </div>
          )}
        </DragOverlay>
      </div>

      {/* 단축키 모달 */}
      <ShortcutModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </DndContext>
  );
}
