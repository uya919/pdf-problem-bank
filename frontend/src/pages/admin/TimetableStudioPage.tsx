/**
 * TimetableStudioPage - Timetable Studio 메인 페이지
 *
 * Stage 5: Timetable Studio 재설계
 * - 시나리오 관리
 * - 시간표 그리드
 * - 반/강사 팔레트
 * - 드래그&드롭 슬롯 배정
 *
 * 권한: admin/owner만 접근 가능 (teacher 접근 금지)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { AdminTopNav } from '@/components/admin/layout';
import {
  ScenarioTabs,
  ScenarioHeader,
  CreateScenarioModal,
  EmptyState,
  TimetableGrid,
  ClassPalette,
  CompareView,
} from '@/components/timetable';
import {
  useScenarios,
  useSlots,
  useMultipleSlots,
  useCreateScenario,
  useDeleteScenario,
  useCreateSlot,
  useDeleteSlot,
} from '@/hooks/useTimetable';
import { useClasses } from '@/hooks/useClasses';
import { useAuth } from '@/hooks/useAuth';
import type { TimetableScenario, TimetableSlot, CreateScenarioInput, DayOfWeek } from '@/types/timetable';

/**
 * Timetable Studio 메인 페이지
 */
export default function TimetableStudioPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  // user의 메타데이터에서 role 추출 (없으면 기본값 사용)
  const profile = user ? { role: (user.user_metadata?.role as string) || 'teacher' } : null;

  // 상태
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [draggedClass, setDraggedClass] = useState<{
    id: string;
    name: string;
    subject: string;
  } | null>(null);

  // 데이터 훅
  const { data: scenarios = [], isLoading: scenariosLoading } = useScenarios();
  const { data: slots = [], isLoading: slotsLoading } = useSlots(selectedScenarioId);
  const { data: classes = [], isLoading: classesLoading } = useClasses();

  // 비교 뷰용 모든 시나리오 슬롯
  const scenarioIds = useMemo(() => scenarios.map((s) => s.id), [scenarios]);
  const { slotsMap } = useMultipleSlots(isCompareOpen ? scenarioIds : []);

  // Mutation 훅
  const createScenarioMutation = useCreateScenario();
  const deleteScenarioMutation = useDeleteScenario();
  const createSlotMutation = useCreateSlot();
  const deleteSlotMutation = useDeleteSlot();

  // 첫 시나리오 자동 선택
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenarioId) {
      setSelectedScenarioId(scenarios[0].id);
    }
  }, [scenarios, selectedScenarioId]);

  // 권한 체크: teacher는 접근 금지
  if (authLoading) {
    return (
      <div className="min-h-screen bg-grey-50 flex items-center justify-center">
        <div className="text-grey-500">로딩 중...</div>
      </div>
    );
  }

  if (profile?.role === 'teacher') {
    return (
      <div className="min-h-screen bg-grey-50">
        <AdminTopNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] mt-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-grey-900 mb-2">
              접근 권한이 없습니다
            </h2>
            <p className="text-grey-500 mb-6">
              Timetable Studio는 관리자 전용 기능입니다.
            </p>
            <button
              onClick={() => navigate('/backoffice')}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              대시보드로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 선택된 시나리오
  const selectedScenario = scenarios.find((s) => s.id === selectedScenarioId);

  // 시나리오 생성 핸들러
  const handleCreateScenario = useCallback(
    async (input: CreateScenarioInput) => {
      try {
        const newScenario = await createScenarioMutation.mutateAsync(input);
        setSelectedScenarioId(newScenario.id);
        setIsCreateModalOpen(false);
      } catch (error) {
        console.error('시나리오 생성 실패:', error);
      }
    },
    [createScenarioMutation]
  );

  // 시나리오 삭제 핸들러
  const handleDeleteScenario = useCallback(
    async (id: string) => {
      if (!window.confirm('시나리오를 삭제하시겠습니까?\n연결된 모든 슬롯도 함께 삭제됩니다.')) {
        return;
      }

      try {
        await deleteScenarioMutation.mutateAsync(id);
        if (selectedScenarioId === id) {
          setSelectedScenarioId(scenarios.find((s) => s.id !== id)?.id || null);
        }
      } catch (error) {
        console.error('시나리오 삭제 실패:', error);
      }
    },
    [deleteScenarioMutation, selectedScenarioId, scenarios]
  );

  // 빈 셀 클릭 → 슬롯 생성
  const handleCellClick = useCallback(
    async (dayOfWeek: DayOfWeek, time: string) => {
      if (!selectedScenarioId || !draggedClass) return;

      // 시작 시간에서 1시간 후를 종료 시간으로 계산
      const [hour, minute] = time.split(':').map(Number);
      const endHour = hour + 1;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      try {
        await createSlotMutation.mutateAsync({
          scenarioId: selectedScenarioId,
          classId: draggedClass.id,
          dayOfWeek,
          startTime: time,
          endTime,
        });
        setDraggedClass(null);
      } catch (error) {
        console.error('슬롯 생성 실패:', error);
      }
    },
    [selectedScenarioId, draggedClass, createSlotMutation]
  );

  // 슬롯 삭제 핸들러
  const handleSlotDelete = useCallback(
    async (slotId: string) => {
      if (!selectedScenarioId) return;

      try {
        await deleteSlotMutation.mutateAsync({
          id: slotId,
          scenarioId: selectedScenarioId,
        });
      } catch (error) {
        console.error('슬롯 삭제 실패:', error);
      }
    },
    [selectedScenarioId, deleteSlotMutation]
  );

  // 반 드래그 시작
  const handleClassDragStart = useCallback(
    (classInfo: { id: string; name: string; subject: string }) => {
      setDraggedClass(classInfo);
    },
    []
  );

  // 반 클릭 (드래그 대신 클릭으로 선택)
  const handleClassSelect = useCallback(
    (classInfo: { id: string; name: string; subject: string }) => {
      if (draggedClass?.id === classInfo.id) {
        setDraggedClass(null);
      } else {
        setDraggedClass(classInfo);
      }
    },
    [draggedClass]
  );

  // 반 데이터를 팔레트 형식으로 변환
  const classesForPalette = classes.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grades?.name || '',
    subject: c.subject || '',
    color: c.subjects?.color || undefined,
    teacherName: c.teachers?.name || undefined,
  }));

  return (
    <div className="min-h-screen bg-grey-50">
      <AdminTopNav />

      <div className="pt-16">
        {/* 헤더 */}
        <div className="bg-white border-b border-grey-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Ruler className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-grey-900">Timetable Studio</h1>
                <p className="text-sm text-grey-500">시간표를 계획하고 관리하세요</p>
              </div>
            </div>

            {/* 비교 버튼 */}
            {scenarios.length >= 2 && (
              <button
                onClick={() => setIsCompareOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-grey-700 bg-grey-100 rounded-lg hover:bg-grey-200 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                시나리오 비교
              </button>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="p-6">
          {/* 시나리오 탭 */}
          <ScenarioTabs
            scenarios={scenarios}
            selectedId={selectedScenarioId}
            onSelect={setSelectedScenarioId}
            onCreateClick={() => setIsCreateModalOpen(true)}
            isLoading={scenariosLoading}
          />

          {/* 시나리오가 없을 때 */}
          {scenarios.length === 0 && !scenariosLoading && (
            <EmptyState
              type="no-scenario"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}

          {/* 시나리오가 있을 때 */}
          {selectedScenario && (
            <>
              {/* 시나리오 헤더 */}
              <ScenarioHeader
                scenario={selectedScenario}
                onDelete={() => handleDeleteScenario(selectedScenario.id)}
              />

              {/* 드래그 안내 */}
              {draggedClass && (
                <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-700">
                    <strong>{draggedClass.name}</strong>을(를) 원하는 시간대에 클릭하여 배정하세요
                  </span>
                  <button
                    onClick={() => setDraggedClass(null)}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 그리드 + 팔레트 레이아웃 (반응형: lg이상에서 사이드바, 미만에서 하단) */}
              <div className="flex flex-col lg:grid lg:grid-cols-[1fr_280px] gap-6">
                {/* 시간표 그리드 */}
                <div className="order-1">
                  {slotsLoading ? (
                    <div className="bg-white rounded-xl border border-grey-200 p-8 text-center text-grey-500">
                      로딩 중...
                    </div>
                  ) : (
                    <TimetableGrid
                      slots={slots}
                      onCellClick={handleCellClick}
                      onSlotDelete={handleSlotDelete}
                      isDropTarget={!!draggedClass}
                    />
                  )}
                </div>

                {/* 반 팔레트 (모바일에서는 상단에 표시) */}
                <div className="order-first lg:order-2">
                  <ClassPalette
                    classes={classesForPalette}
                    isLoading={classesLoading}
                    onClassSelect={handleClassSelect}
                    onClassDragStart={handleClassDragStart}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 시나리오 생성 모달 */}
      <CreateScenarioModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateScenario}
        isLoading={createScenarioMutation.isPending}
      />

      {/* 비교 뷰 모달 */}
      {isCompareOpen && (
        <CompareView
          scenarios={scenarios}
          slotsMap={slotsMap}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
    </div>
  );
}
