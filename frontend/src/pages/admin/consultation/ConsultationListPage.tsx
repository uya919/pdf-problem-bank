/**
 * 상담 목록 페이지
 * Stage 33: 상담 관리 시스템
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Calendar,
  User,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Pencil,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { AdminLayoutV5 } from '../../../components/admin/layout/AdminLayoutV5';
import { useConsultations, useConfirmEnrollment, useDeleteConsultation, useCompleteEnrollment } from '../../../hooks/useConsultations';
import { useToast } from '../../../components/Toast';
import type { ConsultationStatus } from '../../../types/consultation';

const STATUS_CONFIG: Record<
  ConsultationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: '상담중',
    color: 'bg-orange-100 text-orange-700',
    icon: <Clock className="w-4 h-4" />,
  },
  confirmed: {
    label: '등원확정',
    color: 'bg-blue-100 text-blue-700',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  enrolled: {
    label: '등원완료',
    color: 'bg-green-100 text-green-700',
    icon: <UserPlus className="w-4 h-4" />,
  },
  cancelled: {
    label: '취소',
    color: 'bg-grey-100 text-grey-600',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function ConsultationListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // 필터 상태
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsultationStatus | ''>('');

  // 상담 목록 조회
  const { data: consultations = [], isLoading } = useConsultations({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  // 등원 확정 뮤테이션
  const confirmEnrollment = useConfirmEnrollment();

  // 삭제 뮤테이션
  const deleteConsultation = useDeleteConsultation();

  // 등원 완료 뮤테이션
  const completeEnrollment = useCompleteEnrollment();

  // 드롭다운 열림 상태
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // 등원 확정 처리
  const handleConfirmEnrollment = async (
    consultationId: string,
    studentName: string
  ) => {
    const enrollmentDate = prompt(
      `${studentName} 학생의 등원 예정일을 입력하세요 (YYYY-MM-DD)`,
      new Date().toISOString().split('T')[0]
    );

    if (!enrollmentDate) return;

    try {
      const result = await confirmEnrollment.mutateAsync({
        consultationId,
        enrollmentDate,
      });

      if (result.success) {
        showToast(
          `${studentName} 학생 등원이 확정되었습니다. 알림 ${result.notification_count || 0}건 생성됨.`,
          'success'
        );
      } else {
        showToast(result.error || '등원 확정에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Failed to confirm enrollment:', error);
      showToast('등원 확정에 실패했습니다.', 'error');
    }
  };

  // 삭제 처리
  const handleDelete = async (consultationId: string, studentName: string) => {
    if (!confirm(`"${studentName}" 상담을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      await deleteConsultation.mutateAsync(consultationId);
      showToast(`"${studentName}" 상담이 삭제되었습니다.`, 'success');
      setOpenMenuId(null);
    } catch (error) {
      console.error('Failed to delete consultation:', error);
      showToast('상담 삭제에 실패했습니다.', 'error');
    }
  };

  // 수정 페이지로 이동
  const handleEdit = (consultationId: string) => {
    navigate(`/admin/consultation/edit/${consultationId}`);
    setOpenMenuId(null);
  };

  // 등원 완료 처리
  const handleCompleteEnrollment = async (
    consultationId: string,
    studentName: string
  ) => {
    if (!confirm(`${studentName} 학생의 등원을 완료 처리하시겠습니까?`)) {
      return;
    }

    try {
      await completeEnrollment.mutateAsync(consultationId);
      showToast(`${studentName} 학생 등원이 완료되었습니다.`, 'success');
    } catch (error) {
      console.error('Failed to complete enrollment:', error);
      showToast('등원 완료 처리에 실패했습니다.', 'error');
    }
  };

  return (
    <AdminLayoutV5>
      <div className="min-h-screen bg-grey-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-grey-200">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-grey-900">상담 목록</h1>
                <p className="text-sm text-grey-500 mt-1">
                  전체 상담 내역을 조회하고 관리합니다.
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/consultation/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>신규 상담</span>
              </button>
            </div>

            {/* 필터 */}
            <div className="mt-4 flex flex-wrap gap-3">
              {/* 검색 */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="학생 이름 검색"
                  className="w-full pl-10 pr-4 py-2 border border-grey-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* 상태 필터 */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ConsultationStatus | '')
                }
                className="px-4 py-2 border border-grey-200 rounded-lg bg-white text-sm"
              >
                <option value="">전체 상태</option>
                <option value="pending">상담중</option>
                <option value="confirmed">등원확정</option>
                <option value="enrolled">등원완료</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          {isLoading ? (
            <div className="text-center py-12 text-grey-500">불러오는 중...</div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-grey-300 mx-auto mb-4" />
              <p className="text-grey-500 mb-4">상담 내역이 없습니다</p>
              <button
                onClick={() => navigate('/admin/consultation/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>첫 상담 등록하기</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((consultation) => {
                const status = STATUS_CONFIG[consultation.enrollment_status];

                return (
                  <div
                    key={consultation.id}
                    className="bg-white rounded-xl border border-grey-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      {/* 학생 정보 */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-grey-900">
                            {consultation.student_name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-grey-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-grey-400" />
                            <span>상담: {consultation.consultation_date}</span>
                          </div>
                          {consultation.grades && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4 text-grey-400" />
                              <span>{consultation.grades.name}</span>
                            </div>
                          )}
                          {consultation.parent_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4 text-grey-400" />
                              <span>{consultation.parent_phone}</span>
                            </div>
                          )}
                        </div>

                        {/* 과목 태그 */}
                        {consultation.consultation_subjects &&
                          consultation.consultation_subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {consultation.consultation_subjects.map((cs) => (
                                <span
                                  key={cs.id}
                                  className="px-2 py-0.5 text-xs bg-grey-100 text-grey-700 rounded"
                                >
                                  {cs.subjects?.name}
                                  {cs.classes && ` - ${cs.classes.name}`}
                                </span>
                              ))}
                            </div>
                          )}

                        {/* 등원 예정일 */}
                        {consultation.enrollment_date && (
                          <div className="mt-2 text-sm">
                            <span className="text-green-600 font-medium">
                              등원 예정: {consultation.enrollment_date}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-2">
                        {consultation.enrollment_status === 'pending' && (
                          <button
                            onClick={() =>
                              handleConfirmEnrollment(
                                consultation.id,
                                consultation.student_name
                              )
                            }
                            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            등원 확정
                          </button>
                        )}

                        {/* 등원 완료 버튼 (confirmed 상태에서만) */}
                        {consultation.enrollment_status === 'confirmed' && (() => {
                          const today = new Date().toISOString().split('T')[0];
                          const enrollmentDate = consultation.enrollment_date;
                          const canComplete = enrollmentDate && enrollmentDate <= today;

                          return (
                            <button
                              onClick={() =>
                                handleCompleteEnrollment(
                                  consultation.id,
                                  consultation.student_name
                                )
                              }
                              disabled={!canComplete}
                              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                canComplete
                                  ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                  : 'bg-grey-100 text-grey-400 cursor-not-allowed'
                              }`}
                              title={!canComplete ? `등원 예정일(${enrollmentDate}) 이후에 완료 처리 가능` : ''}
                            >
                              등원 완료
                            </button>
                          );
                        })()}

                        {/* 더보기 메뉴 */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === consultation.id ? null : consultation.id
                              )
                            }
                            className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-grey-400" />
                          </button>

                          {openMenuId === consultation.id && (
                            <>
                              {/* 배경 클릭 시 닫기 */}
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              {/* 드롭다운 메뉴 */}
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-grey-200 rounded-lg shadow-lg z-20 py-1">
                                <button
                                  onClick={() => handleEdit(consultation.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-grey-700 hover:bg-grey-50"
                                >
                                  <Pencil className="w-4 h-4" />
                                  수정
                                </button>
                                <button
                                  onClick={() =>
                                    handleDelete(
                                      consultation.id,
                                      consultation.student_name
                                    )
                                  }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  삭제
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayoutV5>
  );
}
