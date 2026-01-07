/**
 * 과목별 반 배정 페이지 V2 (Phase 8)
 *
 * 목업(class_assignment_canvas_v2.html)과 일치하는 UI
 * - 학년 탭 추가
 * - 3열 카드 그리드 레이아웃
 * - 배정 해제 드롭존
 * - 검색 기능
 * - 토스트 알림
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
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
import type { SubjectCode, Division, ClassLevel, StudentBySubject, ClassBySubject } from '@/types/database';
import { SUBJECT_CONFIG, LEVEL_NAMES } from '@/types/database';
import {
  useClassesBySubject,
  useStudentsBySubject,
  useAssignStudents,
  useUnassignStudents,
  useUnassignedCounts,
} from '@/hooks/useClassAssignment';

// 컴포넌트
import { SubjectTabs } from './SubjectTabs';
import { DivisionFilter } from './DivisionFilter';
import { GradeTabs, getDefaultGrade, getGradeString } from './GradeTabs';
import { DraggableStudentCard } from './DraggableStudentCard';
import { ClassCard, ClassCardSkeleton } from './ClassCard';
import { UnassignDropZone } from './UnassignDropZone';
import { SelectionActionBar } from './SelectionActionBar';
import { StudentSearch } from './StudentSearch';
import { ToastContainer, createToast, type ToastData } from './AssignmentToast';
import { StudentCardSkeleton } from './StudentCard';
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

export function ClassAssignmentPageV2() {
  // 필터 상태
  const [activeSubject, setActiveSubject] = useState<SubjectCode>('math');
  const [activeDivision, setActiveDivision] = useState<Division | null>('middle');
  const [activeGrade, setActiveGrade] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  // UI 상태
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<StudentBySubject | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 학년 문자열 (예: "중1", "고2")
  const gradeString = useMemo(() => {
    return getGradeString(activeDivision, activeGrade);
  }, [activeDivision, activeGrade]);

  // 데이터 조회
  const { data: classes, isLoading: classesLoading } = useClassesBySubject(
    activeSubject,
    activeDivision || undefined,
    gradeString || undefined
  );
  const { data: students, isLoading: studentsLoading } = useStudentsBySubject(
    activeSubject,
    activeDivision || undefined,
    gradeString || undefined
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
  const unassignMutation = useUnassignStudents();

  // 학부 변경 시 학년 초기화
  useEffect(() => {
    if (activeDivision) {
      setActiveGrade(getDefaultGrade(activeDivision));
    }
  }, [activeDivision]);

  // 검색 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter((s) => s.student_name.toLowerCase().includes(query));
  }, [students, searchQuery]);

  // 미배정/배정 학생 분리
  const unassignedStudents = filteredStudents.filter((s) => !s.class_id);
  const assignedStudents = filteredStudents.filter((s) => s.class_id);

  // 레벨별 반 그룹화
  const classesByLevel = useMemo(() => {
    return (classes || []).reduce(
      (acc, cls) => {
        const level = (cls.level || 'regular') as ClassLevel;
        if (!acc[level]) acc[level] = [];
        acc[level].push(cls);
        return acc;
      },
      {} as Record<ClassLevel, ClassBySubject[]>
    );
  }, [classes]);

  // 토스트 추가
  const addToast = useCallback((toast: ToastData) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  // 토스트 제거
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
          const studentList = filteredStudents;
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
    [filteredStudents]
  );

  // 반 배정 핸들러
  const handleAssignToClass = useCallback(
    async (classId: string, studentIds?: string[]) => {
      const idsToAssign = studentIds || Array.from(selectedStudentIds);
      if (idsToAssign.length === 0) return;

      const targetClass = (classes || []).find((c) => c.id === classId);
      const level = (targetClass?.level || 'regular') as ClassLevel;

      try {
        await assignMutation.mutateAsync({
          studentIds: idsToAssign,
          classId,
        });

        // 성공 토스트
        addToast(
          createToast('success', `${targetClass?.name || '반'}에 배정 완료`, {
            level,
            count: idsToAssign.length,
          })
        );

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
        addToast(createToast('error', '배정에 실패했습니다'));
      }
    },
    [selectedStudentIds, classes, assignMutation, unassignedStudents, addToast]
  );

  // 배정 해제 핸들러
  const handleUnassign = useCallback(
    async (studentIds?: string[]) => {
      const idsToUnassign = studentIds || Array.from(selectedStudentIds);
      if (idsToUnassign.length === 0) return;

      // 각 학생의 class_id 찾기
      const studentClassMap = new Map<string, string>();
      filteredStudents.forEach((s) => {
        if (s.class_id && idsToUnassign.includes(s.student_id)) {
          studentClassMap.set(s.student_id, s.class_id);
        }
      });

      if (studentClassMap.size === 0) {
        addToast(createToast('info', '배정 해제할 학생이 없습니다'));
        return;
      }

      try {
        // 반별로 그룹화하여 배정 해제
        const byClass = new Map<string, string[]>();
        studentClassMap.forEach((classId, studentId) => {
          if (!byClass.has(classId)) byClass.set(classId, []);
          byClass.get(classId)!.push(studentId);
        });

        for (const [classId, sIds] of byClass) {
          await unassignMutation.mutateAsync({ studentIds: sIds, classId });
        }

        addToast(createToast('info', `${studentClassMap.size}명 배정 해제됨`));
        setSelectedStudentIds(new Set());
      } catch (error) {
        console.error('배정 해제 실패:', error);
        addToast(createToast('error', '배정 해제에 실패했습니다'));
      }
    },
    [selectedStudentIds, filteredStudents, unassignMutation, addToast]
  );

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const student = filteredStudents.find((s) => s.student_id === active.id);
    if (student) {
      setActiveDragStudent(student);
      if (!selectedStudentIds.has(student.student_id)) {
        setSelectedStudentIds(new Set([student.student_id]));
      }
    }
  };

  // 드래그 종료
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragStudent(null);

    if (over) {
      const overId = over.id.toString();

      if (overId.startsWith('class-')) {
        const classId = overId.replace('class-', '');
        const studentIds =
          selectedStudentIds.size > 1
            ? Array.from(selectedStudentIds)
            : [active.id.toString()];
        handleAssignToClass(classId, studentIds);
      } else if (overId === 'unassign-zone') {
        const studentIds =
          selectedStudentIds.size > 1
            ? Array.from(selectedStudentIds)
            : [active.id.toString()];
        handleUnassign(studentIds);
      }
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
          setSearchQuery('');
        }
        return;
      }

      // Ctrl+A: 전체 선택
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const allIds = new Set(filteredStudents.map((s) => s.student_id));
        setSelectedStudentIds(allIds);
        return;
      }

      // Backspace: 배정 해제
      if (e.key === 'Backspace' && selectedStudentIds.size > 0) {
        e.preventDefault();
        handleUnassign();
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
        const studentList = filteredStudents;
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
  }, [
    filteredStudents,
    classes,
    selectedStudentIds,
    showShortcuts,
    handleAssignToClass,
    handleUnassign,
  ]);

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

          {/* 필터 영역 */}
          <div className="mt-3 flex items-center gap-6">
            <DivisionFilter
              activeDivision={activeDivision}
              onDivisionChange={setActiveDivision}
            />
            <GradeTabs
              division={activeDivision}
              activeGrade={activeGrade}
              onGradeChange={setActiveGrade}
            />
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 학생 목록 패널 */}
          <div className="w-80 border-r bg-white flex flex-col">
            {/* 검색 */}
            <div className="p-4 border-b">
              <StudentSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="학생 이름 검색..."
              />
            </div>

            {/* 미배정 학생 목록 */}
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
                  {searchQuery ? (
                    <>
                      <svg
                        className="w-12 h-12 mx-auto mb-2 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <p>검색 결과가 없습니다</p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-12 h-12 mx-auto mb-2 text-green-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p>모든 학생이 배정되었습니다</p>
                    </>
                  )}
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

            {/* 선택 액션바 */}
            <SelectionActionBar
              selectedCount={selectedStudentIds.size}
              classes={classes || []}
              onAssignToClass={handleAssignToClass}
              onUnassign={() => handleUnassign()}
            />

            {/* 배정된 학생 (축소) */}
            {assignedStudents.length > 0 && (
              <div className="border-t p-4 max-h-[150px] overflow-y-auto bg-gray-50/50">
                <h2 className="font-semibold text-gray-500 text-sm mb-2">
                  배정 완료 ({assignedStudents.length}명)
                </h2>
                <div className="space-y-1">
                  {assignedStudents.slice(0, 10).map((student) => (
                    <div
                      key={student.student_id}
                      className="text-sm text-gray-500 flex items-center justify-between py-1"
                    >
                      <span>{student.student_name}</span>
                      <span className="text-xs text-gray-400">{student.class_name}</span>
                    </div>
                  ))}
                  {assignedStudents.length > 10 && (
                    <div className="text-xs text-gray-400 text-center pt-1">
                      외 {assignedStudents.length - 10}명...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 반 카드 그리드 */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-semibold text-gray-900">
                {SUBJECT_CONFIG[activeSubject].name} · {gradeString || '전체'}
              </h2>
              <span className="text-sm text-gray-500">
                반 {(classes || []).length}개
              </span>
            </div>

            {classesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <ClassCardSkeleton key={i} />
                ))}
              </div>
            ) : (classes || []).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg
                  className="w-16 h-16 mx-auto mb-3 text-gray-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-lg font-medium">등록된 반이 없습니다</p>
                <p className="text-sm mt-1">해당 학년의 반을 먼저 생성해주세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(['advanced', 'regular', 'regular2', 'basic'] as ClassLevel[]).map(
                  (level) => {
                    const levelClasses = classesByLevel[level] || [];
                    return levelClasses.map((classInfo) => {
                      const classAssignedStudents = filteredStudents
                        .filter((s) => s.class_id === classInfo.id);

                      return (
                        <ClassCard
                          key={classInfo.id}
                          classInfo={classInfo}
                          assignedStudents={classAssignedStudents}
                          activeSubject={activeSubject}
                          selectedStudentIds={selectedStudentIds}
                          onStudentClick={handleStudentClick}
                          shortcutKey={LEVEL_SHORTCUTS[level]}
                        />
                      );
                    });
                  }
                )}
              </div>
            )}

            {/* 배정 해제 드롭존 */}
            <div className="mt-6">
              <UnassignDropZone isVisible={!!activeDragStudent} />
            </div>
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

      {/* 토스트 컨테이너 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </DndContext>
  );
}
