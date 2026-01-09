/**
 * MakeeduSyncView - 메이크에듀 동기화 뷰
 */
import { useState, useCallback } from 'react';
import { syncApi, SyncStatusResponse } from '../../../api/sync';
import { DataSourceBadge } from './DataSourceBadge';
import { SyncStatsCards } from './SyncStatsCards';
import { MOCK_SYNC_HISTORY, STEP_MESSAGES, POLLING_INTERVAL, MAX_POLLING_TIME } from './constants';
import type { SyncStep } from './types';

export function MakeeduSyncView() {
  const [step, setStep] = useState<SyncStep>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  // 폴링 상태 조회
  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await syncApi.getStatus(id);
      setStatus(response);

      // 단계 메시지 업데이트
      if (response.status === 'scraping') {
        setCurrentPhase('scraping');
      } else if (response.status === 'syncing') {
        setCurrentPhase('syncing');
      }

      if (response.status === 'completed') {
        setCurrentPhase('completed');
        setStep(response.preview ? 'preview' : 'completed');
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
  }, []);

  // 미리보기 시작
  const startPreview = async () => {
    setStep('loading');
    setError(null);
    setStatus(null);
    setCurrentPhase('connecting');

    try {
      const response = await syncApi.trigger(true);
      setJobId(response.jobId);
      setCurrentPhase('logging_in');

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
      setError(err instanceof Error ? err.message : '동기화 시작 실패');
    }
  };

  // 실제 동기화 실행
  const executeSync = async () => {
    setStep('executing');
    setError(null);
    setCurrentPhase('syncing');

    try {
      const response = await syncApi.trigger(false);
      setJobId(response.jobId);

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

  // 초기화
  const reset = () => {
    setStep('idle');
    setJobId(null);
    setStatus(null);
    setError(null);
    setCurrentPhase('');
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-grey-900">🔄 메이크에듀 동기화</h1>
          <DataSourceBadge />
        </div>
      </div>

      {/* 동기화 카드 */}
      <div className="bg-white rounded-2xl border border-grey-200 overflow-hidden mb-6">
        <div className="p-6">
          {/* 유휴 상태 */}
          {step === 'idle' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔄</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-2">
                메이크에듀에서 학생 데이터 가져오기
              </h2>
              <p className="text-grey-500 mb-6 max-w-md mx-auto">
                메이크에듀에 등록된 학생 정보를 가져와<br />
                Supabase DB와 동기화합니다.
              </p>
              <button
                onClick={startPreview}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                미리보기 시작
              </button>
            </div>
          )}

          {/* 로딩/실행 중 */}
          {(step === 'loading' || step === 'executing') && (
            <div className="py-8">
              <div className="max-w-md mx-auto">
                {/* 체크리스트 */}
                <div className="space-y-3 mb-6">
                  {Object.entries(STEP_MESSAGES).map(([key, { icon, label }]) => {
                    const phases = ['connecting', 'logging_in', 'scraping', 'syncing', 'completed'];
                    const currentIdx = phases.indexOf(currentPhase);
                    const itemIdx = phases.indexOf(key);
                    const isCompleted = itemIdx < currentIdx;
                    const isCurrent = key === currentPhase;

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isCurrent ? 'bg-blue-50' : isCompleted ? 'bg-green-50' : 'bg-grey-50'
                        }`}
                      >
                        <span className="text-xl">
                          {isCompleted ? '✅' : isCurrent ? icon : '○'}
                        </span>
                        <span className={`text-sm ${
                          isCurrent ? 'text-blue-600 font-medium' :
                          isCompleted ? 'text-green-600' : 'text-grey-400'
                        }`}>
                          {label}
                        </span>
                        {isCurrent && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 프로그레스바 */}
                <div className="w-full bg-grey-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status?.progress || 10}%` }}
                  />
                </div>
                <p className="text-center text-sm text-grey-500">
                  {status?.message || '처리 중...'}
                </p>
              </div>
            </div>
          )}

          {/* 미리보기 결과 */}
          {step === 'preview' && status?.result && (
            <div className="py-6">
              <h2 className="text-lg font-semibold text-grey-900 mb-4 text-center">
                ✅ 미리보기 완료
              </h2>

              <SyncStatsCards stats={status.result.stats} />

              <div className="flex gap-3 mt-6 max-w-md mx-auto">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
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
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-4">동기화 완료!</h2>

              <SyncStatsCards stats={status.result.stats} />

              <button
                onClick={reset}
                className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                확인
              </button>
            </div>
          )}

          {/* 에러 */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-2">오류 발생</h2>
              <p className="text-red-600 mb-6">{error}</p>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
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
        </div>
      </div>

      {/* 동기화 기록 */}
      <div className="bg-white rounded-2xl border border-grey-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-grey-100">
          <h2 className="text-base font-semibold text-grey-900">📜 동기화 기록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grey-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grey-500 uppercase tracking-wider">일시</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">신규</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">업데이트</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">퇴원</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {MOCK_SYNC_HISTORY.map((record) => (
                <tr key={record.id} className="hover:bg-grey-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-grey-900">{record.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.new > 0 ? 'bg-green-100 text-green-700' : 'text-grey-400'
                    }`}>
                      {record.new > 0 ? `+${record.new}명` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.updated > 0 ? 'bg-blue-100 text-blue-700' : 'text-grey-400'
                    }`}>
                      {record.updated > 0 ? `${record.updated}명` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.deleted > 0 ? 'bg-red-100 text-red-700' : 'text-grey-400'
                    }`}>
                      {record.deleted > 0 ? `${record.deleted}명` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
