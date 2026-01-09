/**
 * AcademySettingsView - 학원 설정 뷰
 */
import { useState } from 'react';
import { GraduationCap, ChevronUp, History } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import { PromotionModal, PromotionHistoryModal } from './promotion';
import { MOCK_SETTINGS } from './constants';
import type { PromotionStep } from './types';
import {
  usePromotionPreviewV2,
  useExecutePromotionV2,
  useGradeStats,
  usePromotionHistory,
  useRollbackPromotion,
  useBatchAssignEnrollments,
} from '../../../hooks/useGradePromotion';

export function AcademySettingsView() {
  const categories = [...new Set(MOCK_SETTINGS.map((s) => s.category))];

  // 학년 승급 관련 상태
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionStep, setPromotionStep] = useState<PromotionStep>('preview');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 훅
  const { data: gradeStats, isLoading: statsLoading } = useGradeStats();
  const { data: preview, refetch: fetchPreview, isFetching: previewLoading } = usePromotionPreviewV2();
  const { data: historyData, refetch: fetchHistory, isFetching: historyLoading } = usePromotionHistory();
  const executePromotion = useExecutePromotionV2();
  const rollbackPromotion = useRollbackPromotion();
  const batchAssign = useBatchAssignEnrollments();

  // 모달 열기
  const handleOpenPromotionModal = async () => {
    setPromotionStep('preview');
    setShowPromotionModal(true);
    await fetchPreview();
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowPromotionModal(false);
    setPromotionStep('preview');
    executePromotion.reset();
  };

  // 이력 모달 열기
  const handleOpenHistoryModal = async () => {
    setShowHistoryModal(true);
    await fetchHistory();
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-grey-900">⚙️ 학원 설정</h1>
          <DataSourceBadge />
        </div>
        <button className="px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2">
          <span>💾</span> 저장하기
        </button>
      </div>

      {/* 학년 승급 섹션 */}
      <div className="bg-white rounded-xl border border-grey-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-grey-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-grey-900">학년 관리</h2>
          </div>
        </div>
        <div className="p-5">
          {/* 현재 학년별 현황 */}
          <div className="mb-5">
            <div className="text-sm font-medium text-grey-700 mb-3">현재 학년별 학생 수</div>
            {statsLoading ? (
              <div className="text-sm text-grey-400">로딩 중...</div>
            ) : gradeStats ? (
              <div className="flex flex-wrap gap-2">
                {gradeStats.by_grade.map((item) => (
                  <span
                    key={item.grade}
                    className="px-3 py-1.5 bg-grey-100 text-grey-700 text-sm rounded-lg"
                  >
                    {item.grade}: <strong>{item.count}명</strong>
                  </span>
                ))}
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium">
                  총 {gradeStats.total_active}명
                </span>
              </div>
            ) : (
              <div className="text-sm text-grey-400">데이터 없음</div>
            )}
          </div>

          {/* 학년 승급 버튼 */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div>
              <div className="text-sm font-medium text-grey-900 flex items-center gap-2">
                <ChevronUp className="w-4 h-4 text-amber-600" />
                학년 일괄 승급
              </div>
              <div className="text-xs text-grey-500 mt-1">
                모든 활성 학생의 학년을 한 단계 올립니다. 고3 학생은 졸업 처리됩니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenHistoryModal}
                className="px-4 py-2 text-sm font-medium text-grey-600 bg-white border border-grey-300 hover:bg-grey-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                이력/롤백
              </button>
              <button
                onClick={handleOpenPromotionModal}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                승급 시작
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 섹션 */}
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category} className="bg-white rounded-xl border border-grey-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-grey-100 bg-grey-50">
              <h2 className="text-sm font-semibold text-grey-900">{category}</h2>
            </div>
            <div className="divide-y divide-grey-100">
              {MOCK_SETTINGS.filter((s) => s.category === category).map((setting) => (
                <div key={setting.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-grey-900">{setting.label}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-grey-600">{setting.value}</span>
                    {setting.editable && (
                      <button className="p-1.5 text-grey-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 위험 영역 */}
      <div className="mt-8 bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="text-sm font-semibold text-red-700 mb-3">⚠️ 위험 영역</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-grey-900">모든 데이터 초기화</div>
            <div className="text-xs text-grey-500">모든 학생, 수업, 출결 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors">
            초기화
          </button>
        </div>
      </div>

      {/* 학년 승급 모달 */}
      <PromotionModal
        isOpen={showPromotionModal}
        onClose={handleCloseModal}
        promotionStep={promotionStep}
        setPromotionStep={setPromotionStep}
        preview={preview}
        previewLoading={previewLoading}
        executePromotion={executePromotion}
        batchAssign={batchAssign}
        fetchPreview={fetchPreview}
      />

      {/* 이력/롤백 모달 */}
      <PromotionHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyData={historyData}
        historyLoading={historyLoading}
        rollbackPromotion={rollbackPromotion}
        fetchHistory={fetchHistory}
      />
    </div>
  );
}
