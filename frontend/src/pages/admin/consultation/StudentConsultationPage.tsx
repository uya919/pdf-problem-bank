/**
 * 학생 상담 페이지 (기존 학생)
 * Stage 33: 상담 관리 시스템
 * Stage 34-E: 학생 탭에서 역진입 지원
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Plus, Calendar, FileText, ChevronRight } from 'lucide-react';
import { AdminLayoutV5 } from '../../../components/admin/layout/AdminLayoutV5';
import { useStudentSearch } from '../../../hooks/useStudentSearch';
import { useStudentConsultations } from '../../../hooks/useConsultations';

export default function StudentConsultationPage() {
  const location = useLocation();

  // Stage 34-E: URL state에서 학생 ID 받기 (AdminStudentsPage에서 넘어온 경우)
  const initialStudentId = (location.state as { selectedStudentId?: string })?.selectedStudentId || null;

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId);

  // 학생 검색 (기존 훅 시그니처에 맞춤)
  const {
    query: searchTerm,
    setQuery: setSearchTerm,
    results: students,
    isSearching,
  } = useStudentSearch();

  // 선택된 학생의 상담 이력
  const { data: consultations = [], isLoading: isLoadingConsultations } =
    useStudentConsultations(selectedStudentId);

  // 선택된 학생 정보
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <AdminLayoutV5>
      <div className="min-h-screen bg-grey-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-grey-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <h1 className="text-xl font-bold text-grey-900">학생 상담</h1>
            <p className="text-sm text-grey-500 mt-1">
              기존 학생을 검색하여 상담 이력을 조회하거나 새 상담을 추가합니다.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 왼쪽: 학생 검색 */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-grey-200 p-6">
                <h2 className="text-lg font-semibold text-grey-900 mb-4">
                  학생 검색
                </h2>

                {/* 검색 입력 */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="학생 이름으로 검색"
                    className="w-full pl-12 pr-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 검색 결과 */}
                {searchTerm.length >= 1 && (
                  <div className="mt-4 space-y-2">
                    {isSearching ? (
                      <div className="text-center py-8 text-grey-500">검색 중...</div>
                    ) : students.length === 0 ? (
                      <div className="text-center py-8 text-grey-500">
                        검색 결과가 없습니다
                      </div>
                    ) : (
                      students.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                            selectedStudentId === student.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-grey-200 hover:bg-grey-50'
                          }`}
                        >
                          <div className="text-left">
                            <div className="font-medium text-grey-900">
                              {student.name}
                            </div>
                            <div className="text-sm text-grey-500">
                              {student.grade} · {student.school || '학교 미등록'}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-grey-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {searchTerm.length < 1 && (
                  <div className="text-center py-8 text-grey-400">
                    학생 이름을 입력하세요
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 상담 이력 */}
            <div className="space-y-4">
              {selectedStudent ? (
                <>
                  {/* 학생 정보 카드 */}
                  <div className="bg-white rounded-2xl border border-grey-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-grey-900">
                          {selectedStudent.name}
                        </h2>
                        <p className="text-sm text-grey-500">
                          {selectedStudent.grade} · {selectedStudent.school || '학교 미등록'}
                        </p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <Plus className="w-4 h-4" />
                        <span>새 상담</span>
                      </button>
                    </div>

                    {selectedStudent.phone && (
                      <div className="text-sm text-grey-600">
                        연락처: {selectedStudent.phone}
                      </div>
                    )}
                  </div>

                  {/* 상담 이력 */}
                  <div className="bg-white rounded-2xl border border-grey-200 p-6">
                    <h3 className="text-lg font-semibold text-grey-900 mb-4">
                      상담 이력
                    </h3>

                    {isLoadingConsultations ? (
                      <div className="text-center py-8 text-grey-500">
                        불러오는 중...
                      </div>
                    ) : consultations.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-grey-300 mx-auto mb-3" />
                        <p className="text-grey-500">상담 이력이 없습니다</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {consultations.map((consultation) => (
                          <div
                            key={consultation.id}
                            className="p-4 border border-grey-200 rounded-xl hover:bg-grey-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-sm text-grey-600">
                                <Calendar className="w-4 h-4" />
                                <span>{consultation.consultation_date}</span>
                              </div>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  consultation.enrollment_status === 'enrolled'
                                    ? 'bg-green-100 text-green-700'
                                    : consultation.enrollment_status === 'confirmed'
                                    ? 'bg-blue-100 text-blue-700'
                                    : consultation.enrollment_status === 'cancelled'
                                    ? 'bg-grey-100 text-grey-600'
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {consultation.enrollment_status === 'enrolled'
                                  ? '등원완료'
                                  : consultation.enrollment_status === 'confirmed'
                                  ? '등원확정'
                                  : consultation.enrollment_status === 'cancelled'
                                  ? '취소'
                                  : '상담중'}
                              </span>
                            </div>

                            {/* 과목 태그 */}
                            {consultation.consultation_subjects &&
                              consultation.consultation_subjects.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
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

                            {consultation.notes && (
                              <p className="text-sm text-grey-600 line-clamp-2">
                                {consultation.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-grey-200 p-12 text-center">
                  <Search className="w-12 h-12 text-grey-300 mx-auto mb-4" />
                  <p className="text-grey-500">
                    왼쪽에서 학생을 검색하여 선택하세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutV5>
  );
}
