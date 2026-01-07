/**
 * 과목별 반 배정 페이지 V3 (Phase 9)
 *
 * 목업(class_assignment_canvas_v2.html) 정확 구현
 * - 상단 네비게이션 바
 * - 좌측 패널: 과목탭 + 학부탭 + 검색 + 학생목록
 * - 중앙 캔버스: 학년탭 + 3열 반카드 + 배정해제 드롭존
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
import {
  useClassesBySubject,
  useStudentsBySubject,
  useAssignStudents,
  useUnassignStudents,
} from '@/hooks/useClassAssignment';

// 컴포넌트
import { AdminTopNav } from '../admin/layout';
import { LeftPanel } from './LeftPanel';
import { CanvasGradeTabs, getDefaultGradeForDivision, getGradeStringForDb } from './CanvasGradeTabs';
import { ClassCard, ClassCardSkeleton } from './ClassCard';
import { ShortcutModal } from './ShortcutModal';
import { ToastContainer, createToast, type ToastData } from './AssignmentToast';
import { useDroppable } from '@dnd-kit/core';

// 과목 설정
const SUBJECT_NAMES: Record<SubjectCode, string> = {
  math: '수학',
  korean: '국어',
  english: '영어',
};

const SUBJECT_COLORS: Record<SubjectCode, string> = {
  math: 'text-blue-500',
  korean: 'text-green-500',
  english: 'text-purple-500',
};

// 단축키-레벨 매핑
const SHORTCUT_LEVELS: Record<string, ClassLevel> = {
  q: 'advanced',
  w: 'regular',
  e: 'regular2',
  r: 'basic',
};

/** 배정 해제 드롭존 (항상 표시) */
function UnassignDropZoneAlways() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassign-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center transition-all
        ${isOver
          ? 'border-blue-400 bg-blue-50 scale-[1.02]'
          : 'border-gray-300'
        }
      `}
    >
      <div className={isOver ? 'text-blue-500' : 'text-gray-400'}>
        <span className="text-2xl">📭</span>
        <p className="mt-2">배정된 학생을 여기에 드롭하면 배정이 해제됩니다</p>
      </div>
    </div>
  );
}

export function ClassAssignmentPageV3() {
  // 필터 상태
  const [activeSubject, setActiveSubject] = useState<SubjectCode>('math');
  const [activeDivision, setActiveDivision] = useState<Division | null>('middle');
  const [activeGrade, setActiveGrade] = useState<number>(2);
  const [searchQuery, setSearchQuery] = useState('');

  // UI 상태
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeDragStudent, setActiveDragStudent] = useState<StudentBySubject | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [skippedStudentIds, setSkippedStudentIds] = useState<Set<string>>(new Set()); // 건너뛴 학생 (맨 아래로)

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 학년 문자열 (예: "중2")
  const gradeString = useMemo(() => {
    return getGradeStringForDb(activeDivision, activeGrade);
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

  // 뮤테이션
  const assignMutation = useAssignStudents();
  const unassignMutation = useUnassignStudents();

  // 학부 변경 시 학년 초기화
  useEffect(() => {
    if (activeDivision) {
      setActiveGrade(getDefaultGradeForDivision(activeDivision));
    }
  }, [activeDivision]);

  // 과목/학년 변경 시 건너뛴 학생 목록 초기화
  useEffect(() => {
    setSkippedStudentIds(new Set());
  }, [activeSubject, activeDivision, activeGrade]);

  // 검색 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter((s) => s.student_name.toLowerCase().includes(query));
  }, [students, searchQuery]);

  // 미배정/배정 학생 분리 (건너뛴 학생은 맨 아래로)
  const unassignedStudents = useMemo(() => {
    const unassigned = filteredStudents.filter((s) => !s.class_id);
    // 건너뛴 학생은 맨 아래로 정렬
    return [
      ...unassigned.filter((s) => !skippedStudentIds.has(s.student_id)),
      ...unassigned.filter((s) => skippedStudentIds.has(s.student_id)),
    ];
  }, [filteredStudents, skippedStudentIds]);
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
          if (newSet.has(studentId) && newSet.size === 1) {
            newSet.clear();
          } else {
            newSet.clear();
            newSet.add(studentId);
          }
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
        const studentNames = idsToAssign
          .map((id) => filteredStudents.find((s) => s.student_id === id)?.student_name)
          .filter(Boolean)
          .join(', ');
        addToast(
          createToast('success', `${studentNames}님이 ${targetClass?.name}에 배정되었습니다`, {
            level,
            count: idsToAssign.length,
          })
        );

        // 배정 후 다음 미배정 학생 자동 선택
        const remainingUnassigned = unassignedStudents.filter(
          (s) => !idsToAssign.includes(s.student_id)
        );
        if (remainingUnassigned.length > 0 && idsToAssign.length === 1) {
          setSelectedStudentIds(new Set([remainingUnassigned[0].student_id]));
        } else {
          setSelectedStudentIds(new Set());
        }
      } catch (error) {
        console.error('배정 실패:', error);
        addToast(createToast('error', '배정에 실패했습니다'));
      }
    },
    [selectedStudentIds, classes, assignMutation, unassignedStudents, filteredStudents, addToast]
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

        const studentNames = idsToUnassign
          .map((id) => filteredStudents.find((s) => s.student_id === id)?.student_name)
          .filter(Boolean)
          .join(', ');
        addToast(createToast('info', `${studentNames}님의 ${SUBJECT_NAMES[activeSubject]} 배정이 해제되었습니다`));
        setSelectedStudentIds(new Set());
      } catch (error) {
        console.error('배정 해제 실패:', error);
        addToast(createToast('error', '배정 해제에 실패했습니다'));
      }
    },
    [selectedStudentIds, filteredStudents, unassignMutation, addToast, activeSubject]
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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      // Tab: 선택된 학생 건너뛰기 (맨 아래로) + 다음 학생 선택
      if (e.key === 'Tab' && !e.shiftKey && selectedStudentIds.size > 0) {
        e.preventDefault();
        const currentId = Array.from(selectedStudentIds)[0];
        const currentStudent = unassignedStudents.find((s) => s.student_id === currentId);

        // 미배정 학생만 건너뛰기 가능
        if (currentStudent && !currentStudent.class_id) {
          // 건너뛴 학생 목록에 추가
          setSkippedStudentIds((prev) => new Set([...prev, currentId]));

          // 다음 미배정 학생 선택 (건너뛰지 않은 학생 중에서)
          const remainingUnassigned = unassignedStudents.filter(
            (s) => s.student_id !== currentId && !skippedStudentIds.has(s.student_id)
          );
          if (remainingUnassigned.length > 0) {
            setSelectedStudentIds(new Set([remainingUnassigned[0].student_id]));
          } else {
            setSelectedStudentIds(new Set());
          }

          addToast(createToast('info', `${currentStudent.student_name}님을 건너뛰었습니다`));
        }
        return;
      }

      // Tab (미선택): 과목 전환
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const subjects: SubjectCode[] = ['math', 'korean', 'english'];
        const currentIdx = subjects.indexOf(activeSubject);
        const nextIdx = (currentIdx + 1) % subjects.length;
        setActiveSubject(subjects[nextIdx]);
        return;
      }

      // Ctrl+숫자: 학부 변경
      if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const divisions: Division[] = ['elementary', 'middle', 'high'];
        setActiveDivision(divisions[parseInt(e.key) - 1]);
        return;
      }

      // 숫자: 학년 변경
      if (!e.ctrlKey && ['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const grade = parseInt(e.key);
        const validGrades = activeDivision === 'elementary'
          ? [2, 3, 4, 5, 6]
          : activeDivision === 'high'
            ? [1, 2]
            : [1, 2, 3];
        if (validGrades.includes(grade)) {
          setActiveGrade(grade);
        }
        return;
      }

      // ? 키: 단축키 모달
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
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
        const unassignedIds = unassignedStudents.map((s) => s.student_id);
        if (selectedStudentIds.size === unassignedIds.length) {
          setSelectedStudentIds(new Set());
        } else {
          setSelectedStudentIds(new Set(unassignedIds));
        }
        return;
      }

      // Backspace: 배정 해제
      if (e.key === 'Backspace' && selectedStudentIds.size > 0) {
        e.preventDefault();
        handleUnassign();
        return;
      }

      // 방향키: 학생 선택 이동
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const allStudents = filteredStudents || [];
        if (allStudents.length === 0) return;

        const currentId = Array.from(selectedStudentIds)[0];
        const currentIdx = allStudents.findIndex((s) => s.student_id === currentId);

        let nextIdx: number;
        if (e.key === 'ArrowDown') {
          nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, allStudents.length - 1);
        } else {
          nextIdx = currentIdx < 0 ? 0 : Math.max(currentIdx - 1, 0);
        }

        setSelectedStudentIds(new Set([allStudents[nextIdx].student_id]));
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSubject,
    activeDivision,
    classes,
    selectedStudentIds,
    showShortcuts,
    unassignedStudents,
    filteredStudents,
    skippedStudentIds,
    handleAssignToClass,
    handleUnassign,
    addToast,
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 상단 네비게이션 */}
      <AdminTopNav />

      {/* 메인 레이아웃 */}
      <div className="flex mt-16 min-h-[calc(100vh-64px)]">
        {/* 좌측 패널 */}
        <LeftPanel
          activeSubject={activeSubject}
          activeDivision={activeDivision}
          searchQuery={searchQuery}
          onSubjectChange={setActiveSubject}
          onDivisionChange={setActiveDivision}
          onSearchChange={setSearchQuery}
          unassignedStudents={unassignedStudents}
          assignedStudents={assignedStudents}
          selectedStudentIds={selectedStudentIds}
          onStudentClick={handleStudentClick}
          classes={classes || []}
          onAssignToClass={handleAssignToClass}
          onUnassign={() => handleUnassign()}
          isLoading={studentsLoading}
        />

        {/* 중앙 캔버스 */}
        <main className="flex-1 p-6 bg-gray-50">
          {/* 캔버스 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                <span className={SUBJECT_COLORS[activeSubject]}>{SUBJECT_NAMES[activeSubject]}</span> 반 배정
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                학생을 드래그하거나 단축키로 반에 배정하세요
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/admin/students'}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ← 학생 관리로 돌아가기
            </button>
          </div>

          {/* 학년 탭 */}
          <CanvasGradeTabs
            division={activeDivision}
            activeGrade={activeGrade}
            onGradeChange={setActiveGrade}
          />

          {/* 반 카드 그리드 (3열) */}
          {classesLoading ? (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <ClassCardSkeleton key={i} />
              ))}
            </div>
          ) : (classes || []).length === 0 ? (
            <div className="col-span-3 text-center py-10 text-gray-400 mb-6">
              해당 과목/학년에 등록된 반이 없습니다
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {(['advanced', 'regular', 'regular2', 'basic'] as ClassLevel[]).map((level) => {
                const levelClasses = classesByLevel[level] || [];
                return levelClasses.map((classInfo) => {
                  const studentsInClass = filteredStudents.filter(
                    (s) => s.class_id === classInfo.id
                  );

                  return (
                    <ClassCard
                      key={classInfo.id}
                      classInfo={classInfo}
                      assignedStudents={studentsInClass}
                      activeSubject={activeSubject}
                      selectedStudentIds={selectedStudentIds}
                      onStudentClick={handleStudentClick}
                    />
                  );
                });
              })}
            </div>
          )}

          {/* 배정 해제 드롭존 (항상 표시) */}
          <UnassignDropZoneAlways />
        </main>
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

      {/* 단축키 모달 */}
      <ShortcutModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* 토스트 컨테이너 */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </DndContext>
  );
}
