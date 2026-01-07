/**
 * 사용자 생성 모달 (Phase 8-5)
 * 새 강사/관리자 계정 생성
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCreateUser } from '../../../hooks/useAdminUsers';
import { CheckCircle, X, User, Mail, Key, Copy, AlertTriangle, Info } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  // 폼 상태
  const [name, setName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const [phone, setPhone] = useState('');

  // 생성 결과 (임시 비밀번호 표시용)
  const [createdResult, setCreatedResult] = useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const createMutation = useCreateUser();

  const email = emailPrefix ? `${emailPrefix}@hyeyum.com` : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !emailPrefix.trim()) {
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        email,
        role,
        phone: phone.trim() || undefined
      });

      // 성공 시 결과 표시
      setCreatedResult({
        name: result.name,
        email: result.email,
        tempPassword: result.temp_password
      });
    } catch (error) {
      // 에러는 mutation에서 처리
      console.error('사용자 생성 실패:', error);
    }
  };

  const handleClose = () => {
    // 상태 초기화
    setName('');
    setEmailPrefix('');
    setRole('teacher');
    setPhone('');
    setCreatedResult(null);
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
        {createdResult ? (
          /* 생성 완료 화면 */
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-grey-900">사용자 생성 완료</h2>
              </div>
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
                  <User className="w-4 h-4 text-grey-400" /> {createdResult.name}
                </p>
                <p className="text-sm text-grey-600 flex items-center gap-1 mt-1">
                  <Mail className="w-4 h-4 text-grey-400" /> {createdResult.email}
                </p>
              </div>

              {/* 임시 비밀번호 */}
              <div>
                <p className="text-sm font-medium text-grey-700 mb-2 flex items-center gap-1">
                  <Key className="w-4 h-4 text-grey-400" /> 임시 비밀번호
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createdResult.tempPassword}
                    readOnly
                    className="flex-1 px-3 py-2 bg-grey-100 border border-grey-200 rounded-lg font-mono text-grey-900"
                  />
                  <button
                    onClick={() => copyToClipboard(createdResult.tempPassword)}
                    className="p-2 bg-grey-100 rounded-lg hover:bg-grey-200 transition-colors"
                    title="복사"
                  >
                    <Copy className="w-5 h-5 text-grey-400" />
                  </button>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700 flex items-start gap-1">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    이 비밀번호는 다시 확인할 수 없습니다.
                    <br />
                    강사에게 전달 후 변경하도록 안내하세요.
                  </span>
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
          /* 생성 폼 */
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-grey-900">새 사용자 추가</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-grey-400 hover:text-grey-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 이름 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 이메일 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    이메일 (로그인 ID) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                      placeholder="hong"
                      required
                      className="flex-1 px-4 py-3 border border-grey-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="px-4 py-3 bg-grey-100 border border-l-0 border-grey-200 rounded-r-xl text-grey-600">
                      @hyeyum.com
                    </span>
                  </div>
                </div>

                {/* 역할 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    역할 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="teacher"
                        checked={role === 'teacher'}
                        onChange={() => setRole('teacher')}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-grey-700">강사 (teacher)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={role === 'admin'}
                        onChange={() => setRole('admin')}
                        className="w-4 h-4 text-blue-500"
                      />
                      <span className="text-grey-700">관리자 (admin)</span>
                    </label>
                  </div>
                </div>

                {/* 연락처 (선택) */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    연락처 <span className="text-grey-400">(선택)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 안내 메시지 */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center gap-1">
                    <Info className="w-4 h-4" /> 임시 비밀번호가 자동 생성됩니다.
                  </p>
                </div>

                {/* 에러 메시지 */}
                {createMutation.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">
                      {(createMutation.error as Error).message}
                    </p>
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
                disabled={createMutation.isPending || !name.trim() || !emailPrefix.trim()}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? '생성 중...' : '사용자 생성'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
