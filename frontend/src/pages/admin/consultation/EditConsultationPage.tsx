/**
 * 상담 수정 페이지
 * Stage 34: 상담 수정 기능
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Bell, Check } from 'lucide-react';
import { AdminLayoutV5 } from '../../../components/admin/layout/AdminLayoutV5';
import { useGrades } from '../../../hooks/useClasses';
import { useClasses } from '../../../hooks/useClasses';
import { useConsultation, useUpdateConsultation } from '../../../hooks/useConsultations';
import { useToast } from '../../../components/Toast';
import type { ConsultationSubjectInput } from '../../../types/consultation';

// 과목 목록 (하드코딩, 추후 API 연동)
const SUBJECTS = [
  { id: 'korean', code: 'korean', name: '국어', color: '#10B981' },
  { id: 'english', code: 'english', name: '영어', color: '#8B5CF6' },
  { id: 'math', code: 'math', name: '수학', color: '#3182F6' },
];

export default function EditConsultationPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { data: grades = [] } = useGrades();
  const { data: allClasses = [] } = useClasses();
  const { data: consultation, isLoading: isLoadingConsultation } = useConsultation(id || null);
  const updateConsultation = useUpdateConsultation();

  // 폼 상태
  const [studentName, setStudentName] = useState('');
  const [gradeId, setGradeId] = useState<string>('');
  const [schoolName, setSchoolName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [consultationDate, setConsultationDate] = useState('');
  const [preferredSchedule, setPreferredSchedule] = useState('');
  const [notes, setNotes] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState('');

  // 과목 선택 상태
  const [selectedSubjects, setSelectedSubjects] = useState<
    Record<string, { checked: boolean; classId: string | null }>
  >({
    korean: { checked: false, classId: null },
    english: { checked: false, classId: null },
    math: { checked: false, classId: null },
  });

  // 데이터 로드 시 폼 초기화
  useEffect(() => {
    if (consultation) {
      setStudentName(consultation.student_name || '');
      setGradeId(consultation.grade_id || '');
      setSchoolName(consultation.school_name || '');
      setStudentPhone(consultation.student_phone || '');
      setParentPhone(consultation.parent_phone || '');
      setConsultationDate(consultation.consultation_date || '');
      setPreferredSchedule(consultation.preferred_schedule || '');
      setNotes(consultation.notes || '');
      setEnrollmentDate(consultation.enrollment_date || '');

      // 과목 선택 상태 초기화
      const subjectState: Record<string, { checked: boolean; classId: string | null }> = {
        korean: { checked: false, classId: null },
        english: { checked: false, classId: null },
        math: { checked: false, classId: null },
      };

      if (consultation.consultation_subjects) {
        consultation.consultation_subjects.forEach((cs) => {
          const subjectCode = cs.subjects?.code;
          if (subjectCode && subjectState[subjectCode] !== undefined) {
            subjectState[subjectCode] = {
              checked: true,
              classId: cs.class_id || null,
            };
          }
        });
      }

      setSelectedSubjects(subjectState);
    }
  }, [consultation]);

  // 학년별로 필터링된 반 목록
  const filteredClasses = useMemo(() => {
    if (!gradeId) return {};

    const result: Record<string, typeof allClasses> = {};
    SUBJECTS.forEach((subject) => {
      result[subject.code] = allClasses.filter(
        (c) => c.grade_id === gradeId && c.subjects?.code === subject.code && c.is_active
      );
    });
    return result;
  }, [gradeId, allClasses]);

  // 과목 토글
  const toggleSubject = (subjectCode: string) => {
    setSelectedSubjects((prev) => ({
      ...prev,
      [subjectCode]: {
        ...prev[subjectCode],
        checked: !prev[subjectCode].checked,
        classId: !prev[subjectCode].checked ? prev[subjectCode].classId : null,
      },
    }));
  };

  // 반 선택
  const selectClass = (subjectCode: string, classId: string | null) => {
    setSelectedSubjects((prev) => ({
      ...prev,
      [subjectCode]: {
        ...prev[subjectCode],
        classId,
      },
    }));
  };

  // 로딩 상태
  const isSubmitting = updateConsultation.isPending;

  // 저장
  const handleSubmit = async () => {
    if (isSubmitting || !id) return;

    if (!studentName.trim()) {
      showToast('학생 이름을 입력해주세요.', 'error');
      return;
    }

    // 선택된 과목 수집
    const subjects: ConsultationSubjectInput[] = [];
    Object.entries(selectedSubjects).forEach(([code, state]) => {
      if (state.checked) {
        const subjectClass = allClasses.find(
          (c) => c.subjects?.code === code && c.subject_id
        );
        if (subjectClass?.subject_id) {
          subjects.push({
            subject_id: subjectClass.subject_id,
            class_id: state.classId,
          });
        }
      }
    });

    try {
      await updateConsultation.mutateAsync({
        id,
        input: {
          student_name: studentName,
          grade_id: gradeId || null,
          school_name: schoolName || null,
          student_phone: studentPhone || null,
          parent_phone: parentPhone || null,
          consultation_date: consultationDate,
          preferred_schedule: preferredSchedule || null,
          notes: notes || null,
          enrollment_date: enrollmentDate || null,
          subjects,
        },
      });

      showToast('상담이 수정되었습니다.', 'success');
      navigate('/admin/consultations');
    } catch (error) {
      console.error('Failed to update consultation:', error);
      showToast(
        error instanceof Error ? error.message : '상담 수정에 실패했습니다.',
        'error'
      );
    }
  };

  if (isLoadingConsultation) {
    return (
      <AdminLayoutV5>
        <div className="min-h-screen bg-grey-50 flex items-center justify-center">
          <p className="text-grey-500">불러오는 중...</p>
        </div>
      </AdminLayoutV5>
    );
  }

  if (!consultation) {
    return (
      <AdminLayoutV5>
        <div className="min-h-screen bg-grey-50 flex items-center justify-center">
          <p className="text-grey-500">상담을 찾을 수 없습니다.</p>
        </div>
      </AdminLayoutV5>
    );
  }

  return (
    <AdminLayoutV5>
      <div className="min-h-screen bg-grey-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-grey-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-grey-600" />
              </button>
              <h1 className="text-lg font-semibold text-grey-900">상담 수정</h1>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? '저장 중...' : '저장'}</span>
            </button>
          </div>
        </div>

        {/* 폼 */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* 상태 표시 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              현재 상태: <strong>{
                consultation.enrollment_status === 'pending' ? '상담중' :
                consultation.enrollment_status === 'confirmed' ? '등원확정' :
                consultation.enrollment_status === 'enrolled' ? '등원완료' : '취소'
              }</strong>
            </p>
          </div>

          {/* 학생 정보 */}
          <div className="bg-white rounded-2xl border border-grey-200 p-6">
            <h3 className="text-lg font-semibold text-grey-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">
                1
              </span>
              학생 정보
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  학생 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    학년
                  </label>
                  <select
                    value={gradeId}
                    onChange={(e) => setGradeId(e.target.value)}
                    className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">선택</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    학교명
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="학교명"
                    className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 연락처 */}
          <div className="bg-white rounded-2xl border border-grey-200 p-6">
            <h3 className="text-lg font-semibold text-grey-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm">
                2
              </span>
              연락처
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  학생 휴대폰
                </label>
                <input
                  type="tel"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  보호자 연락처
                </label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 상담 정보 */}
          <div className="bg-white rounded-2xl border border-grey-200 p-6">
            <h3 className="text-lg font-semibold text-grey-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm">
                3
              </span>
              상담 정보
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  상담 일자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  희망 수업 요일/시간
                </label>
                <input
                  type="text"
                  value={preferredSchedule}
                  onChange={(e) => setPreferredSchedule(e.target.value)}
                  placeholder="예: 월수금 오후 5시"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 수강 과목 & 반배정 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  수강 과목 및 반배정
                </label>
                <p className="text-xs text-grey-500 mb-3">
                  과목을 선택하면 해당 학년의 반 목록이 표시됩니다.
                </p>

                <div className="space-y-3">
                  {SUBJECTS.map((subject) => {
                    const state = selectedSubjects[subject.code];
                    const classes = filteredClasses[subject.code] || [];

                    return (
                      <div
                        key={subject.code}
                        className={`border rounded-xl overflow-hidden ${
                          state.checked
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-grey-200'
                        }`}
                      >
                        <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-grey-50">
                          <input
                            type="checkbox"
                            checked={state.checked}
                            onChange={() => toggleSubject(subject.code)}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="font-medium text-grey-900">
                            {subject.name}
                          </span>
                          {state.checked && (
                            <span className="ml-auto text-xs text-blue-600 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              선택됨
                            </span>
                          )}
                        </label>
                        {state.checked && (
                          <div className="px-4 py-3 border-t border-blue-200 bg-white">
                            <select
                              value={state.classId || ''}
                              onChange={(e) =>
                                selectClass(subject.code, e.target.value || null)
                              }
                              className="w-full px-4 py-2.5 border border-grey-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                            >
                              <option value="">반 선택 (상담 후 결정)</option>
                              {classes.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                              {classes.length === 0 && gradeId && (
                                <option disabled>
                                  해당 학년에 {subject.name} 반이 없습니다
                                </option>
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 등원 정보 */}
          <div className="bg-white rounded-2xl border border-grey-200 p-6">
            <h3 className="text-lg font-semibold text-grey-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm">
                4
              </span>
              등원 정보
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  등원 예정일
                </label>
                <input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 비고 */}
          <div className="bg-white rounded-2xl border border-grey-200 p-6">
            <h3 className="text-lg font-semibold text-grey-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-grey-100 text-grey-600 rounded-full flex items-center justify-center text-sm">
                5
              </span>
              비고
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="상담 내용이나 특이사항을 입력하세요"
              rows={4}
              className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </div>
    </AdminLayoutV5>
  );
}
