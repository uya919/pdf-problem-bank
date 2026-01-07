/**
 * 비밀번호 리셋 모달 (Phase 8-5)
 * 관리자가 강사 비밀번호 초기화
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useResetPassword } from '../../../hooks/useAdminUsers';
import { UserProfile } from '../../../api/adminUsers';
import { CheckCircle, X, User, Key, Copy, AlertTriangle } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function ResetPasswordModal({ isOpen, onClose, user }: ResetPasswordModalProps) {
  // 리셋 결과 (새 임시 비밀번호)
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const resetMutation = useResetPassword();

  const handleReset = async () => {
    try {
      const result = await resetMutation.mutateAsync(user.id);
      setNewPassword(result.temp_password);
    } catch (error) {
      console.error('비밀번호 리셋 실패:', error);
    }
  };

  const handleClose = () => {
    setNewPassword(null);
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {newPassword ? (
          /* 리셋 완료 화면 */
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-grey-900">비밀번호 리셋 완료</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-grey-400 hover:text-grey-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 새 임시 비밀번호 */}
              <div>
                <p className="text-sm font-medium text-grey-700 mb-2 flex items-center gap-1">
                  <Key className="w-4 h-4 text-grey-400" /> 새 임시 비밀번호
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    readOnly
                    className="flex-1 px-3 py-2 bg-grey-100 border border-grey-200 rounded-lg font-mono text-grey-900"
                  />
                  <button
                    onClick={() => copyToClipboard(newPassword)}
                    className="p-2 bg-grey-100 rounded-lg hover:bg-grey-200 transition-colors"
                    title="복사"
                  >
                    <Copy className="w-5 h-5 text-grey-400" />
                  </button>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> 강사에게 전달 후 변경하도록 안내하세요.
                </p>
              </div>

              {/* 확인 버튼 */}
              <button
                onClick={handleClose}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          /* 확인 화면 */
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-grey-900">비밀번호 리셋</h2>
              <button
                onClick={handleClose}
                className="p-2 text-grey-400 hover:text-grey-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* 사용자 정보 */}
              <div className="p-4 bg-grey-50 rounded-lg">
                <p className="font-medium text-grey-900 flex items-center gap-1">
                  <User className="w-4 h-4 text-grey-400" /> {user.name}
                </p>
                <p className="text-sm text-grey-600 mt-1">{user.email}</p>
              </div>

              {/* 경고 메시지 */}
              <p className="text-grey-600">
                이 사용자의 비밀번호를 리셋하시겠습니까?
                <br />
                <span className="text-red-500">기존 비밀번호는 더 이상 사용할 수 없습니다.</span>
              </p>

              {/* 에러 메시지 */}
              {resetMutation.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {(resetMutation.error as Error).message}
                  </p>
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={resetMutation.isPending}
                  className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
                >
                  {resetMutation.isPending ? '리셋 중...' : '비밀번호 리셋'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
