/**
 * TeacherMappingSection - 강사 매핑 관리 컴포넌트
 * Stage 8-6-E: 프로필-강사 연결 UI
 *
 * - 매핑 상태 조회 (연결됨/미연결)
 * - 프로필-강사 연결/해제
 * - 미연결 강사 목록
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useTeacherMappingStatus,
  useLinkTeacher,
  useUnlinkTeacher,
  useUnmappedTeachers,
} from '../../../hooks/useMyClasses';

interface LinkTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
}

/**
 * 강사 연결 모달
 */
function LinkTeacherModal({ isOpen, onClose, profileId, profileName }: LinkTeacherModalProps) {
  const { data: unmappedTeachers, isLoading } = useUnmappedTeachers();
  const linkMutation = useLinkTeacher();
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  const handleLink = async () => {
    if (!selectedTeacherId) return;

    try {
      await linkMutation.mutateAsync({
        profileId,
        teacherId: selectedTeacherId,
      });
      onClose();
    } catch (err) {
      console.error('연결 실패:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-grey-900">강사 연결</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-grey-400 hover:text-grey-600 text-xl"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-grey-600 mb-4">
            <span className="font-medium text-grey-900">{profileName}</span> 계정을
            기존 강사 데이터와 연결합니다.
          </p>

          {isLoading ? (
            <div className="py-8 text-center text-grey-500">로딩 중...</div>
          ) : unmappedTeachers && unmappedTeachers.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {unmappedTeachers.map((teacher) => (
                <label
                  key={teacher.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedTeacherId === teacher.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-grey-200 hover:bg-grey-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="teacher"
                    value={teacher.id}
                    checked={selectedTeacherId === teacher.id}
                    onChange={() => setSelectedTeacherId(teacher.id)}
                    className="w-4 h-4 text-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-grey-900">{teacher.name}</div>
                    <div className="text-xs text-grey-500">
                      {teacher.subject} • {teacher.email}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-grey-500">연결 가능한 강사가 없습니다.</p>
              <p className="text-xs text-grey-400 mt-2">
                모든 강사가 이미 연결되었거나,<br />
                teachers 테이블에 데이터가 없습니다.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedTeacherId || linkMutation.isPending}
            className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
          >
            {linkMutation.isPending ? '연결 중...' : '연결'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * 강사 매핑 관리 섹션
 */
export function TeacherMappingSection() {
  const { data: mappingStatus, isLoading, error, refetch } = useTeacherMappingStatus();
  const unlinkMutation = useUnlinkTeacher();

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 매핑 통계
  const stats = {
    total: mappingStatus?.length || 0,
    mapped: mappingStatus?.filter((m) => m.is_mapped).length || 0,
    unmapped: mappingStatus?.filter((m) => !m.is_mapped).length || 0,
  };

  /**
   * 연결 모달 열기
   */
  const openLinkModal = (profileId: string, profileName: string) => {
    setSelectedProfile({ id: profileId, name: profileName });
    setLinkModalOpen(true);
  };

  /**
   * 연결 해제
   */
  const handleUnlink = async (profileId: string, profileName: string) => {
    if (!confirm(`${profileName}의 강사 연결을 해제하시겠습니까?`)) return;

    try {
      await unlinkMutation.mutateAsync(profileId);
    } catch (err) {
      console.error('연결 해제 실패:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-grey-500">매핑 상태 조회 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 mb-4">매핑 상태 조회 실패</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-1">프로필-강사 연결이란?</h3>
        <p className="text-sm text-blue-700">
          로그인 계정(profiles)과 기존 강사 데이터(teachers)를 연결합니다.
          연결된 강사는 자기 수업만 조회할 수 있습니다.
        </p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-grey-200">
          <div className="text-sm text-grey-500 mb-1">전체 강사 계정</div>
          <div className="text-2xl font-bold text-grey-900">{stats.total}명</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-grey-200">
          <div className="text-sm text-grey-500 mb-1">연결됨</div>
          <div className="text-2xl font-bold text-green-600">{stats.mapped}명</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-grey-200">
          <div className="text-sm text-grey-500 mb-1">미연결</div>
          <div className="text-2xl font-bold text-orange-500">{stats.unmapped}명</div>
        </div>
      </div>

      {/* 매핑 목록 */}
      {mappingStatus && mappingStatus.length > 0 ? (
        <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-grey-50 border-b border-grey-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-grey-500 uppercase">
                  로그인 계정
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-grey-500 uppercase">
                  이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-grey-500 uppercase">
                  연결된 강사
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-grey-500 uppercase">
                  상태
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {mappingStatus.map((item) => (
                <tr key={item.profile_id} className="hover:bg-grey-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-grey-900">{item.profile_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-grey-600">
                    {item.profile_email}
                  </td>
                  <td className="px-4 py-3">
                    {item.is_mapped ? (
                      <span className="text-grey-900">{item.teacher_name}</span>
                    ) : (
                      <span className="text-grey-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.is_mapped
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {item.is_mapped ? '연결됨' : '미연결'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.is_mapped ? (
                      <button
                        onClick={() => handleUnlink(item.profile_id, item.profile_name)}
                        disabled={unlinkMutation.isPending}
                        className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        연결 해제
                      </button>
                    ) : (
                      <button
                        onClick={() => openLinkModal(item.profile_id, item.profile_name)}
                        className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        연결하기
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-grey-200 py-12 text-center">
          <p className="text-grey-500">강사 계정이 없습니다.</p>
          <p className="text-xs text-grey-400 mt-2">
            먼저 "사용자 관리"에서 강사 계정을 생성하세요.
          </p>
        </div>
      )}

      {/* 연결 모달 */}
      {selectedProfile && (
        <LinkTeacherModal
          isOpen={linkModalOpen}
          onClose={() => {
            setLinkModalOpen(false);
            setSelectedProfile(null);
          }}
          profileId={selectedProfile.id}
          profileName={selectedProfile.name}
        />
      )}
    </div>
  );
}

export default TeacherMappingSection;
