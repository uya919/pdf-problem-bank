/**
 * 권한 없음 페이지 (403)
 */
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Ban } from 'lucide-react';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();

  const handleGoBack = () => {
    // 역할에 따라 적절한 페이지로 이동
    if (role === 'teacher') {
      navigate('/backoffice');
    } else if (role === 'admin' || role === 'owner') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grey-50 px-4">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <Ban className="w-16 h-16 text-grey-400" />
        </div>
        <h1 className="text-2xl font-bold text-grey-900 mb-2">접근 권한이 없습니다</h1>
        <p className="text-grey-500 mb-6">
          이 페이지에 접근할 수 있는 권한이 없습니다.<br />
          관리자에게 문의해주세요.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            돌아가기
          </button>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-grey-100 text-grey-700 font-medium rounded-lg hover:bg-grey-200 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
