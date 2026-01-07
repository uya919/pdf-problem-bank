/**
 * 사용자 관리 페이지 (Phase 8-5)
 * 관리자가 강사/직원 계정을 관리
 */
import { useState } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout/AdminLayoutV5';
import { useUsers, getRoleLabel, getRoleColor } from '../../hooks/useAdminUsers';
import { UserRole, UserProfile } from '../../api/adminUsers';
import { CreateUserModal } from '../../components/admin/users/CreateUserModal';
import { ResetPasswordModal } from '../../components/admin/users/ResetPasswordModal';
import { UserActionsMenu } from '../../components/admin/users/UserActionsMenu';

export default function UsersPage() {
  // 필터 상태
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);

  // 데이터 조회
  const { data, isLoading, error } = useUsers({
    role: roleFilter || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter
  });

  const users = data?.users || [];

  // 검색 필터링
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayoutV5>
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-grey-900">사용자 관리</h1>
            <p className="text-sm text-grey-500 mt-1">
              강사 및 관리자 계정을 관리합니다
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            <span>새 사용자 추가</span>
          </button>
        </div>

        {/* 필터 바 */}
        <div className="bg-white rounded-xl border border-grey-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* 검색 */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="이름 또는 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 역할 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500">역할</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="px-3 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="teacher">강사</option>
                <option value="admin">관리자</option>
                <option value="owner">원장</option>
              </select>
            </div>

            {/* 상태 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500">상태</span>
              <select
                value={activeFilter === '' ? '' : activeFilter ? 'true' : 'false'}
                onChange={(e) => {
                  if (e.target.value === '') setActiveFilter('');
                  else setActiveFilter(e.target.value === 'true');
                }}
                className="px-3 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white rounded-xl border border-grey-200 overflow-visible">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="text-grey-500 mt-2">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">오류가 발생했습니다</p>
              <p className="text-sm text-grey-500 mt-1">{(error as Error).message}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-grey-500">사용자가 없습니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-grey-50 border-b border-grey-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">이름</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">이메일</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">역할</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">상태</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">가입일</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-grey-600"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-grey-100 hover:bg-grey-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-grey-200 flex items-center justify-center text-grey-600">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-grey-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-grey-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          활성
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-grey-100 text-grey-600">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-grey-500 text-sm">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserActionsMenu
                        user={user}
                        onResetPassword={() => setResetPasswordUser(user)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 통계 */}
        {data && (
          <div className="mt-4 text-sm text-grey-500">
            총 {data.total}명의 사용자
          </div>
        )}
      </div>

      {/* 모달 */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {resetPasswordUser && (
        <ResetPasswordModal
          isOpen={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          user={resetPasswordUser}
        />
      )}
    </AdminLayoutV5>
  );
}
