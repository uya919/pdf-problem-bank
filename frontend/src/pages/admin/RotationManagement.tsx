/**
 * 순환수업 관리 페이지
 * - 4개 탭: 일정 미리보기, 패턴 설정, 휴일/예외 관리, 기본 설정
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRotationSchedules,
  useRotationActivities,
  useCreateRotationSchedule,
  useUpdateRotationSchedule,
  useDeleteRotationSchedule,
  useSaveRotationPatterns,
  useAddRotationException,
  useDeleteRotationException,
  useUpdateRotationTargetGrades,
} from '../../hooks/useRotation';
import {
  RotationSchedulePreview,
  RotationPatternEditor,
  RotationExceptionManager,
  RotationSettings,
} from '../../components/admin/rotation';
import type { SavePatternInput, CreateExceptionInput } from '../../types/rotation';

type TabType = 'schedule' | 'pattern' | 'exception' | 'settings';

const TAB_LABELS: Record<TabType, string> = {
  schedule: '일정 미리보기',
  pattern: '순환 패턴 설정',
  exception: '휴일/예외 관리',
  settings: '기본 설정',
};

export default function RotationManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // 데이터 조회
  const { data: schedules, isLoading: isLoadingSchedules } = useRotationSchedules();
  const {
    activities,
    today,
    schedule,
    patterns,
    exceptions,
    targetGrades,
    isLoading: isLoadingDetail,
  } = useRotationActivities(selectedScheduleId);

  // Mutations
  const createMutation = useCreateRotationSchedule();
  const updateMutation = useUpdateRotationSchedule();
  const deleteMutation = useDeleteRotationSchedule();
  const savePatternsMutation = useSaveRotationPatterns();
  const addExceptionMutation = useAddRotationException();
  const deleteExceptionMutation = useDeleteRotationException();
  const updateTargetGradesMutation = useUpdateRotationTargetGrades();

  // 첫 번째 스케줄 자동 선택
  useEffect(() => {
    if (schedules && schedules.length > 0 && !selectedScheduleId) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  // 새 순환수업 생성
  const handleCreateNew = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
      const newSchedule = await createMutation.mutateAsync({
        name: '새 순환수업',
        day_of_week: 3, // 수요일
        start_time: '17:00',
        end_time: '18:30',
        cycle_weeks: 3,
        start_date: todayStr,
        target_grade_ids: [],
      });
      setSelectedScheduleId(newSchedule.id);
      setActiveTab('settings');
    } catch (error) {
      console.error('순환수업 생성 실패:', error);
    }
  };

  // 패턴 저장
  const handleSavePatterns = (newPatterns: SavePatternInput[]) => {
    if (!selectedScheduleId) return;
    savePatternsMutation.mutate({
      scheduleId: selectedScheduleId,
      patterns: newPatterns,
    });
  };

  // 예외 추가
  const handleAddException = (input: CreateExceptionInput) => {
    addExceptionMutation.mutate(input);
  };

  // 예외 삭제
  const handleDeleteException = (exceptionId: string) => {
    if (!selectedScheduleId) return;
    deleteExceptionMutation.mutate({
      exceptionId,
      scheduleId: selectedScheduleId,
    });
  };

  // 설정 저장
  const handleSaveSettings = (input: any) => {
    if (!selectedScheduleId) return;
    updateMutation.mutate({
      scheduleId: selectedScheduleId,
      input,
    });
  };

  // 대상 학년 업데이트
  const handleUpdateTargetGrades = (gradeIds: string[]) => {
    if (!selectedScheduleId) return;
    updateTargetGradesMutation.mutate({
      scheduleId: selectedScheduleId,
      gradeIds,
    });
  };

  // 삭제
  const handleDelete = async () => {
    if (!selectedScheduleId) return;
    try {
      await deleteMutation.mutateAsync(selectedScheduleId);
      setSelectedScheduleId(null);
      navigate('/admin');
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const isLoading = isLoadingSchedules || isLoadingDetail;

  return (
    <div className="min-h-screen bg-grey-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-grey-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-grey-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-grey-900">순환수업 관리</h1>
            </div>

            {/* 스케줄 선택 또는 생성 */}
            {schedules && schedules.length > 0 ? (
              <select
                value={selectedScheduleId || ''}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
                className="px-3 py-2 border border-grey-200 rounded-lg"
              >
                {schedules.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={handleCreateNew}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-grey-300 transition-colors"
              >
                {createMutation.isPending ? '생성 중...' : '+ 새 순환수업'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      {schedule && (
        <div className="bg-white border-b border-grey-200">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-1 py-2 overflow-x-auto">
              {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? 'bg-white text-grey-900 shadow-sm border border-grey-200'
                      : 'text-grey-500 hover:text-grey-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : !schedule ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-xl font-bold text-grey-900 mb-2">
              순환수업이 없습니다
            </h2>
            <p className="text-grey-500 mb-6">
              새 순환수업을 생성하여 시작하세요.
            </p>
            <button
              onClick={handleCreateNew}
              disabled={createMutation.isPending}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-grey-300 transition-colors"
            >
              {createMutation.isPending ? '생성 중...' : '+ 새 순환수업 만들기'}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'schedule' && (
              <RotationSchedulePreview
                schedule={schedule}
                activities={activities}
                today={today}
              />
            )}

            {activeTab === 'pattern' && (
              <RotationPatternEditor
                cycleWeeks={schedule.cycle_weeks}
                targetGrades={targetGrades}
                patterns={patterns}
                onSave={handleSavePatterns}
                isSaving={savePatternsMutation.isPending}
              />
            )}

            {activeTab === 'exception' && (
              <RotationExceptionManager
                scheduleId={schedule.id}
                exceptions={exceptions}
                onAdd={handleAddException}
                onDelete={handleDeleteException}
                isAdding={addExceptionMutation.isPending}
              />
            )}

            {activeTab === 'settings' && (
              <RotationSettings
                schedule={schedule}
                targetGrades={targetGrades}
                onSave={handleSaveSettings}
                onUpdateTargetGrades={handleUpdateTargetGrades}
                onDelete={handleDelete}
                isSaving={
                  updateMutation.isPending || updateTargetGradesMutation.isPending
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
