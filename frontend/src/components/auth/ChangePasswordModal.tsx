/**
 * 본인 비밀번호 변경 모달 (Phase 8-5)
 * 로그인한 사용자가 본인 비밀번호 변경
 */
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, X, Eye, EyeOff, Check, Circle } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 비밀번호 유효성 검사
  const isLongEnough = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isValidPassword = isLongEnough && hasLetter && hasNumber;
  const passwordsMatch = newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!isValidPassword) {
      setError('비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.');
      return;
    }

    if (!passwordsMatch) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // Supabase Auth로 비밀번호 변경
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // 상태 초기화
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {success ? (
          /* 성공 화면 */
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-grey-900">비밀번호 변경 완료</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-grey-400 hover:text-grey-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-grey-600 mb-4">
              비밀번호가 성공적으로 변경되었습니다.
              <br />
              다음 로그인부터 새 비밀번호를 사용하세요.
            </p>

            <button
              onClick={handleClose}
              className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          /* 변경 폼 */
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-grey-900">비밀번호 변경</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-grey-400 hover:text-grey-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 새 비밀번호 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    새 비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 입력"
                      required
                      className="w-full px-4 py-3 pr-10 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400"
                    >
                      {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* 비밀번호 강도 표시 */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      <div className={`text-xs flex items-center gap-1 ${isLongEnough ? 'text-green-600' : 'text-grey-400'}`}>
                        {isLongEnough ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />} 8자 이상
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${hasLetter ? 'text-green-600' : 'text-grey-400'}`}>
                        {hasLetter ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />} 영문 포함
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${hasNumber ? 'text-green-600' : 'text-grey-400'}`}>
                        {hasNumber ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />} 숫자 포함
                      </div>
                    </div>
                  )}
                </div>

                {/* 새 비밀번호 확인 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    새 비밀번호 확인 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="새 비밀번호 다시 입력"
                      required
                      className="w-full px-4 py-3 pr-10 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400"
                    >
                      {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* 일치 여부 */}
                  {confirmPassword && (
                    <div className={`mt-2 text-xs flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {passwordsMatch ? '비밀번호 일치' : '비밀번호 불일치'}
                    </div>
                  )}
                </div>

                {/* 에러 메시지 */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading || !isValidPassword || !passwordsMatch}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
