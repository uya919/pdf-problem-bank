/**
 * 메이크에듀 동기화 모달 (Phase 6-E, 6-F)
 *
 * 기능:
 * - 동기화 미리보기 (DB 변경 없음)
 * - 실제 동기화 실행
 * - 진행률 표시
 * - 결과 통계 표시
 * - 권한 체크 (Phase 6-F)
 */

import { useState, useEffect, useCallback } from 'react';
import { syncApi, SyncStatusResponse, SyncStats } from '../../api/sync';
import { useSyncPermission } from '../../hooks/useSyncPermission';

interface MakeeduSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** 권한 체크 건너뛰기 (테스트용) */
  skipPermissionCheck?: boolean;
}

type Step = 'idle' | 'loading' | 'preview' | 'executing' | 'completed' | 'error' | 'no_permission';

const POLLING_INTERVAL = 2000; // 2초
const MAX_POLLING_TIME = 120000; // 2분 타임아웃

export function MakeeduSyncModal({ isOpen, onClose, onSuccess, skipPermissionCheck = false }: MakeeduSyncModalProps) {
  const [step, setStep] = useState<Step>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Phase 6-F: 권한 체크
  const { canSync, loading: permissionLoading, profile } = useSyncPermission();

  // 폴링 상태 조회
  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await syncApi.getStatus(id);
      setStatus(response);

      if (response.status === 'completed') {
        setStep(response.preview ? 'preview' : 'completed');
        if (!response.preview && onSuccess) {
          onSuccess();
        }
      } else if (response.status === 'failed') {
        setStep('error');
        setError(response.error || '알 수 없는 에러');
      }

      return response.status;
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '상태 조회 실패');
      return 'failed';
    }
  }, [onSuccess]);

  // 미리보기 시작
  const startPreview = async () => {
    setStep('loading');
    setError(null);
    setStatus(null);

    try {
      const response = await syncApi.trigger(true);
      setJobId(response.jobId);

      // 폴링 시작
      const startTime = Date.now();
      const pollInterval = setInterval(async () => {
        const currentStatus = await pollStatus(response.jobId);

        if (currentStatus === 'completed' || currentStatus === 'failed') {
          clearInterval(pollInterval);
        }

        // 타임아웃 체크
        if (Date.now() - startTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setStep('error');
          setError('작업 시간 초과 (2분)');
        }
      }, POLLING_INTERVAL);

    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '동기화 시작 실패');
    }
  };

  // 실제 동기화 실행
  const executeSync = async () => {
    setStep('executing');
    setError(null);

    try {
      const response = await syncApi.trigger(false);
      setJobId(response.jobId);

      // 폴링 시작
      const startTime = Date.now();
      const pollInterval = setInterval(async () => {
        const currentStatus = await pollStatus(response.jobId);

        if (currentStatus === 'completed' || currentStatus === 'failed') {
          clearInterval(pollInterval);
        }

        if (Date.now() - startTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setStep('error');
          setError('작업 시간 초과 (2분)');
        }
      }, POLLING_INTERVAL);

    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '동기화 실행 실패');
    }
  };

  // 모달 닫을 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setJobId(null);
      setStatus(null);
      setError(null);
    }
  }, [isOpen]);

  // Phase 6-F: 권한 체크 - 모달 열릴 때 권한 확인
  useEffect(() => {
    if (isOpen && !permissionLoading && !skipPermissionCheck) {
      if (!canSync) {
        setStep('no_permission');
      }
    }
  }, [isOpen, canSync, permissionLoading, skipPermissionCheck]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              메이크에듀 동기화
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6">
          {/* 초기 상태 */}
          {step === 'idle' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 mb-6">
                메이크에듀에서 학생 데이터를 가져와<br />
                Supabase DB와 동기화합니다.
              </p>
              <button
                onClick={startPreview}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                미리보기 시작
              </button>
            </div>
          )}

          {/* 로딩 중 */}
          {(step === 'loading' || step === 'executing') && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">
                {status?.message || '처리 중...'}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status?.progress || 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{status?.progress || 0}%</p>
            </div>
          )}

          {/* 미리보기 결과 */}
          {step === 'preview' && status?.result && (
            <div>
              <SyncStatsDisplay stats={status.result.stats} />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={executeSync}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  동기화 실행
                </button>
              </div>
            </div>
          )}

          {/* 완료 */}
          {step === 'completed' && status?.result && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">동기화 완료!</h3>

              <SyncStatsDisplay stats={status.result.stats} />

              <button
                onClick={onClose}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors mt-6"
              >
                닫기
              </button>
            </div>
          )}

          {/* 에러 */}
          {step === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">오류 발생</h3>
              <p className="text-red-600 mb-6">{error}</p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={startPreview}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* Phase 6-F: 권한 없음 */}
          {step === 'no_permission' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">권한이 없습니다</h3>
              <p className="text-gray-600 mb-2">
                동기화 기능을 사용하려면 권한이 필요합니다.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                원장 또는 동기화 권한이 부여된 계정으로 로그인하세요.
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          )}

          {/* 권한 로딩 중 */}
          {permissionLoading && !skipPermissionCheck && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">권한 확인 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 통계 표시 컴포넌트
function SyncStatsDisplay({ stats }: { stats: SyncStats }) {
  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="신규"
          value={stats.new}
          color="green"
        />
        <StatCard
          label="업데이트"
          value={stats.updated}
          color="blue"
        />
        <StatCard
          label="퇴원"
          value={stats.deleted}
          color="red"
        />
      </div>

      {/* 상세 목록 */}
      {stats.new > 0 && (
        <div className="bg-green-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            신규 학생 ({stats.new}명)
          </h4>
          <ul className="space-y-1">
            {stats.new_students.slice(0, 5).map((s, i) => (
              <li key={i} className="text-sm text-green-700">
                {s.name} ({s.grade || '미정'})
              </li>
            ))}
            {stats.new_students.length > 5 && (
              <li className="text-sm text-green-600">
                ... 외 {stats.new_students.length - 5}명
              </li>
            )}
          </ul>
        </div>
      )}

      {stats.updated > 0 && (
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            업데이트된 학생 ({stats.updated}명)
          </h4>
          <ul className="space-y-1">
            {stats.updated_students.slice(0, 5).map((s, i) => (
              <li key={i} className="text-sm text-blue-700">
                {s.name}: 연락처 변경
              </li>
            ))}
            {stats.updated_students.length > 5 && (
              <li className="text-sm text-blue-600">
                ... 외 {stats.updated_students.length - 5}명
              </li>
            )}
          </ul>
        </div>
      )}

      {stats.deleted > 0 && (
        <div className="bg-red-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            퇴원 처리 ({stats.deleted}명)
          </h4>
          <ul className="space-y-1">
            {stats.deleted_students.slice(0, 5).map((s, i) => (
              <li key={i} className="text-sm text-red-700">
                {s.name} ({s.grade || '미정'})
              </li>
            ))}
            {stats.deleted_students.length > 5 && (
              <li className="text-sm text-red-600">
                ... 외 {stats.deleted_students.length - 5}명
              </li>
            )}
          </ul>
        </div>
      )}

      {stats.new === 0 && stats.updated === 0 && stats.deleted === 0 && (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-600">변경사항이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'red';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4 text-center`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default MakeeduSyncModal;
