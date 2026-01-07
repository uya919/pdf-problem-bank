/**
 * 휴일/예외 관리 탭
 * - 휴일 추가 폼
 * - 등록된 휴일 목록
 * - 이월/스킵 설정
 */
import { useState } from 'react';
import type {
  RotationException,
  CreateExceptionInput,
  ExceptionActionType,
} from '../../../types/rotation';

interface RotationExceptionManagerProps {
  scheduleId: string;
  exceptions: RotationException[];
  onAdd: (input: CreateExceptionInput) => void;
  onDelete: (exceptionId: string) => void;
  isAdding: boolean;
}

export function RotationExceptionManager({
  scheduleId,
  exceptions,
  onAdd,
  onDelete,
  isAdding,
}: RotationExceptionManagerProps) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState<ExceptionActionType>('carry_over');

  const handleAdd = () => {
    if (!date || !reason.trim()) return;

    onAdd({
      rotation_schedule_id: scheduleId,
      exception_date: date,
      reason: reason.trim(),
      action_type: actionType,
    });

    // 폼 초기화
    setDate('');
    setReason('');
    setActionType('carry_over');
  };

  // 날짜순 정렬
  const sortedExceptions = [...exceptions].sort((a, b) =>
    a.exception_date.localeCompare(b.exception_date)
  );

  return (
    <div className="space-y-6">
      {/* 휴일 추가 */}
      <div className="bg-white rounded-xl border border-grey-200 p-6">
        <h3 className="font-bold text-grey-900 mb-4">휴일 추가</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="사유 (예: 신정)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="flex-1 p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value as ExceptionActionType)}
            className="p-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="carry_over">다음 주로 이월</option>
            <option value="skip">건너뛰기 (스킵)</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={isAdding || !date || !reason.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAdding ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>

      {/* 등록된 휴일 목록 */}
      <div className="bg-white rounded-xl border border-grey-200 p-6">
        <h3 className="font-bold text-grey-900 mb-4">등록된 휴일/예외</h3>

        {sortedExceptions.length === 0 ? (
          <div className="text-center py-8 text-grey-500">
            등록된 휴일이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedExceptions.map((exception) => (
              <div
                key={exception.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  exception.action_type === 'carry_over'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-grey-50 border-grey-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      exception.action_type === 'carry_over'
                        ? 'bg-red-100'
                        : 'bg-grey-100'
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 ${
                        exception.action_type === 'carry_over'
                          ? 'text-red-600'
                          : 'text-grey-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-grey-900">
                      {formatDateKorean(exception.exception_date)}
                    </div>
                    <div className="text-sm text-grey-500">{exception.reason}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      exception.action_type === 'carry_over'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-grey-200 text-grey-700'
                    }`}
                  >
                    {exception.action_type === 'carry_over'
                      ? '다음 주로 이월'
                      : '건너뛰기'}
                  </span>
                  <button
                    onClick={() => onDelete(exception.id)}
                    className="p-2 text-grey-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="삭제"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 안내 */}
        <div className="mt-6 p-4 bg-grey-50 rounded-lg text-center text-sm text-grey-500">
          휴일이 아닌 날은 자동으로 순환수업이 진행됩니다.
        </div>
      </div>

      {/* 이월 규칙 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-bold text-blue-900 mb-2">이월 규칙</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>
            - <strong>다음 주로 이월</strong>: 해당 주차의 순환수업이 다음 주로
            밀립니다.
          </li>
          <li>
            - <strong>건너뛰기</strong>: 해당 주차를 건너뛰고 다음 주차로
            진행합니다.
          </li>
          <li>
            - 예) 1/1 휴일(1주차) 이월 시: 1/8이 1주차, 1/15가 2주차가 됩니다.
          </li>
        </ul>
      </div>
    </div>
  );
}

// 날짜 포맷 헬퍼
function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];

  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}
