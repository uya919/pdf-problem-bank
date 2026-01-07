/**
 * 로그인 페이지
 * - 토스 스타일 로그인 폼
 * - 아이디/비밀번호 인증
 *
 * Stage 11-10: 아이디 로그인 방식
 * - 아이디만 입력하면 자동으로 @hyeyum.com 추가
 * - 기존 이메일 형식도 지원 (하위 호환)
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, User, Lock } from 'lucide-react';

// 학원 이메일 도메인
const EMAIL_DOMAIN = '@hyeyum.com';

/**
 * 아이디를 이메일로 변환
 * - 이미 @가 포함되어 있으면 그대로 사용 (하위 호환)
 * - 없으면 @hyeyum.com 추가
 */
const toEmail = (input: string): string => {
  if (input.includes('@')) {
    return input; // 이미 이메일 형식
  }
  return `${input}${EMAIL_DOMAIN}`;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading: authLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 후 이동할 경로 (HomePage에서 역할별 분기)
  const from = (location.state as { from?: string })?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Stage 11-10: 아이디 → 이메일 변환
      const email = toEmail(username);
      const { error } = await signIn(email, password);

      if (error) {
        // 에러 메시지 한글화
        if (error.message.includes('Invalid login credentials')) {
          setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('이메일 인증이 필요합니다. 관리자에게 문의해주세요.');
        } else {
          setError(error.message);
        }
        return;
      }

      // 로그인 성공 - 이전 페이지 또는 기본 페이지로 이동
      navigate(from, { replace: true });
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grey-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50 px-4">
      <div className="w-full max-w-sm">
        {/* 로고/제목 */}
        <div className="text-center mb-8">
          <div className="mb-3 flex justify-center">
            <Building2 className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-grey-900">혜윰학원</h1>
          <p className="text-grey-500 mt-1">백오피스 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-grey-200 p-6 space-y-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 아이디 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-grey-700 mb-1.5">
              아이디
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">
                <User className="w-5 h-5" />
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디 입력"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 border border-grey-200 rounded-xl text-grey-900 placeholder-grey-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-grey-700 mb-1.5">
              비밀번호
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 border border-grey-200 rounded-xl text-grey-900 placeholder-grey-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-grey-500 hover:text-grey-700"
            onClick={() => alert('관리자에게 문의해주세요.')}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
      </div>
    </div>
  );
}
