/**
 * 과목별 관리자 설정 페이지
 * Stage 33: 상담 관리 시스템
 */
import { useState } from 'react';
import { Settings, Check, X, Loader2 } from 'lucide-react';
import { AdminLayoutV5 } from '../../../components/admin/layout/AdminLayoutV5';
import {
  useSubjectsWithManagers,
  useAdminUsers,
  useUpdateSubjectManagers,
} from '../../../hooks/useSubjectManagers';

interface SubjectWithManagers {
  id: string;
  name: string;
  code: string;
  color: string;
  manager_ids: string[];
}

interface AdminUser {
  id: string;
  name: string;
  role: string;
}

export default function SubjectManagerSettingsPage() {
  const { data: subjects = [], isLoading: isLoadingSubjects } =
    useSubjectsWithManagers();
  const { data: adminUsers = [], isLoading: isLoadingAdmins } = useAdminUsers();
  const updateManagers = useUpdateSubjectManagers();

  // 편집 중인 과목 ID
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  // 선택된 관리자 ID 배열
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);

  /**
   * 편집 모드 시작
   */
  const handleEditStart = (subject: SubjectWithManagers) => {
    setEditingSubjectId(subject.id);
    setSelectedManagerIds(subject.manager_ids || []);
  };

  /**
   * 편집 취소
   */
  const handleEditCancel = () => {
    setEditingSubjectId(null);
    setSelectedManagerIds([]);
  };

  /**
   * 관리자 토글
   */
  const handleToggleManager = (managerId: string) => {
    setSelectedManagerIds((prev) =>
      prev.includes(managerId)
        ? prev.filter((id) => id !== managerId)
        : [...prev, managerId]
    );
  };

  /**
   * 저장
   */
  const handleSave = async () => {
    if (!editingSubjectId) return;

    try {
      await updateManagers.mutateAsync({
        subjectId: editingSubjectId,
        managerIds: selectedManagerIds,
      });
      setEditingSubjectId(null);
      setSelectedManagerIds([]);
    } catch (error) {
      console.error('Failed to update managers:', error);
      alert('저장에 실패했습니다.');
    }
  };

  /**
   * 관리자 이름 조회
   */
  const getManagerNames = (managerIds: string[]): string => {
    if (!managerIds || managerIds.length === 0) return '미지정';
    return managerIds
      .map((id) => {
        const user = adminUsers.find((u: AdminUser) => u.id === id);
        return user?.name || '알 수 없음';
      })
      .join(', ');
  };

  /**
   * 과목별 색상 클래스
   */
  const getSubjectColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
    };
    return colorMap[color] || 'bg-grey-100 text-grey-700 border-grey-200';
  };

  if (isLoadingSubjects || isLoadingAdmins) {
    return (
      <AdminLayoutV5>
        <div className="min-h-screen bg-grey-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </AdminLayoutV5>
    );
  }

  return (
    <AdminLayoutV5>
      <div className="min-h-screen bg-grey-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-grey-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-grey-600" />
              <div>
                <h1 className="text-xl font-bold text-grey-900">
                  과목별 관리자 설정
                </h1>
                <p className="text-sm text-grey-500 mt-1">
                  각 과목의 담당 관리자를 지정합니다. 등원 알림이 해당
                  관리자에게 전송됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 과목 목록 */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl border border-grey-200 overflow-hidden">
            {subjects.length === 0 ? (
              <div className="p-12 text-center text-grey-500">
                등록된 과목이 없습니다
              </div>
            ) : (
              <div className="divide-y divide-grey-100">
                {subjects.map((subject: SubjectWithManagers) => (
                  <div key={subject.id} className="p-6">
                    {editingSubjectId === subject.id ? (
                      /* 편집 모드 */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 text-sm font-medium rounded-lg border ${getSubjectColorClass(
                                subject.color
                              )}`}
                            >
                              {subject.name}
                            </span>
                            <span className="text-sm text-grey-500">
                              관리자 선택
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleEditCancel}
                              className="p-2 text-grey-500 hover:bg-grey-100 rounded-lg transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={updateManagers.isPending}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                              {updateManagers.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              <span>저장</span>
                            </button>
                          </div>
                        </div>

                        {/* 관리자 선택 */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {adminUsers.map((user: AdminUser) => (
                            <button
                              key={user.id}
                              onClick={() => handleToggleManager(user.id)}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                selectedManagerIds.includes(user.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-grey-200 hover:bg-grey-50'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                  selectedManagerIds.includes(user.id)
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-grey-300'
                                }`}
                              >
                                {selectedManagerIds.includes(user.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="text-left">
                                <div className="font-medium text-grey-900">
                                  {user.name}
                                </div>
                                <div className="text-xs text-grey-500">
                                  {user.role === 'admin' ? '원장' : '매니저'}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {adminUsers.length === 0 && (
                          <div className="text-center py-4 text-grey-500 text-sm">
                            등록된 관리자가 없습니다
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 보기 모드 */
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-lg border ${getSubjectColorClass(
                              subject.color
                            )}`}
                          >
                            {subject.name}
                          </span>
                          <div>
                            <span className="text-sm text-grey-500">
                              담당 관리자:
                            </span>
                            <span className="ml-2 text-sm font-medium text-grey-900">
                              {getManagerNames(subject.manager_ids)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditStart(subject)}
                          className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          수정
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 안내 문구 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-medium text-blue-900 mb-2">💡 알림 안내</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 등원 확정 시 담당 관리자에게 즉시 알림이 발송됩니다.</li>
              <li>• 등원 전날(D-1)과 당일(D-day)에도 알림이 발송됩니다.</li>
              <li>• 담당 반 선생님에게도 별도로 알림이 발송됩니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayoutV5>
  );
}
