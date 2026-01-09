/**
 * PromotionHistoryModal - 승급 이력/롤백 모달
 */
import { useState } from 'react';
import { History, X, Check, RotateCcw } from 'lucide-react';
import type { PromotionHistoryResponse, RollbackResponse } from '../../../../api/gradePromotion';
import type { UseMutationResult } from '@tanstack/react-query';

interface PromotionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: PromotionHistoryResponse | undefined;
  historyLoading: boolean;
  rollbackPromotion: UseMutationResult<RollbackResponse, Error, string, unknown>;
  fetchHistory: () => void;
}

export function PromotionHistoryModal({
  isOpen,
  onClose,
  historyData,
  historyLoading,
  rollbackPromotion,
  fetchHistory,
}: PromotionHistoryModalProps) {
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 롤백 실행
  const handleRollback = async (batchId: string) => {
    try {
      await rollbackPromotion.mutateAsync(batchId);
      setRollbackBatchId(null);
      await fetchHistory();
    } catch (error) {
      console.error('롤백 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-grey-200 bg-gradient-to-r from-grey-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-grey-600" />
              <h2 className="text-lg font-bold text-grey-900">승급 이력 / 롤백</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {historyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <div className="text-grey-500">이력 로딩 중...</div>
            </div>
          ) : historyData && historyData.history.length > 0 ? (
            <div className="space-y-3">
              {historyData.history.map((item) => (
                <div
                  key={item.batch_id}
                  className={`border rounded-xl p-4 ${
                    item.is_rolled_back
                      ? 'border-grey-200 bg-grey-50'
                      : 'border-blue-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-grey-900">
                          {formatDate(item.promoted_at)}
                        </span>
                        {item.is_rolled_back && (
                          <span className="px-2 py-0.5 text-xs bg-grey-200 text-grey-600 rounded-full">
                            롤백됨
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-blue-600">
                          승급 {item.promoted_count}명
                        </span>
                        <span className="text-purple-600">
                          졸업 {item.graduated_count}명
                        </span>
                        <span className="text-grey-500">
                          총 {item.total_affected}명
                        </span>
                      </div>
                      {item.is_rolled_back && item.rolled_back_at && (
                        <div className="mt-2 text-xs text-grey-500">
                          롤백 시간: {formatDate(item.rolled_back_at)}
                        </div>
                      )}
                    </div>

                    {/* 롤백 버튼 */}
                    {!item.is_rolled_back && (
                      <div>
                        {rollbackBatchId === item.batch_id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRollback(item.batch_id)}
                              disabled={rollbackPromotion.isPending}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {rollbackPromotion.isPending ? (
                                <>
                                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                                  처리 중
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  확인
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setRollbackBatchId(null)}
                              className="px-3 py-1.5 text-xs font-medium text-grey-600 bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRollbackBatchId(item.batch_id)}
                            className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            롤백
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-grey-300 mx-auto mb-3" />
              <p className="text-grey-500">승급 이력이 없습니다.</p>
              <p className="text-sm text-grey-400 mt-1">
                학년 승급을 실행하면 이력이 저장됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-grey-200 bg-grey-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-grey-600 hover:text-grey-800 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
