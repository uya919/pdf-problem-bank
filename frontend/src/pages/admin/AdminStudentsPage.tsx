/**
 * AdminStudentsPage - 관리자용 학생 관리 페이지
 *
 * 리팩토링: Stage 54-D-1 (2025-01-07)
 * - 1,081줄 → ~280줄
 * - 분리된 컴포넌트 사용: StudentRow, StudentDetailModal
 * - 타입/상수/Mock 데이터 별도 파일로 분리
 *
 * 기능:
 * - 전체 학생 목록 (검색/필터)
 * - 학생 상세 정보 모달
 * - 학생 통계 (출석률, 숙제 제출률, 성적)
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  StudentRow,
  StudentDetailModal,
  MOCK_STUDENTS,
  MOCK_STUDENT_STATS,
  DIVISION_GRADES,
  DIVISION_LABELS,
  SUBJECT_CONFIG,
  getGradeString,
  type FilterStatus,
  type Division,
  type SubjectCode,
  type MockStudent,
} from '../../components/admin/students';
import { useStudents, useStudentStats } from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { StudentWithEnrollments } from '../../types/database';

/** 연결 상태 표시 컴포넌트 */
const DataSourceBadge = () => (
  <span
    className={`text-xs px-2 py-1 rounded ${
      isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    {isSupabaseConfigured ? '🟢 Supabase' : '🟡 Mock 데이터'}
  </span>
);

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterStatus] = useState<FilterStatus>('active');
  const [filterDivision, setFilterDivision] = useState<Division>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<SubjectCode | 'all'>('all');
  const [selectedStudent, setSelectedStudent] = useState<MockStudent | StudentWithEnrollments | null>(null);

  const handleDivisionChange = (division: Division) => {
    setFilterDivision(division);
    setFilterGrade('all');
  };

  // Supabase 데이터 조회
  const { data: supabaseStudents, isLoading: supabaseLoading } = useStudents({
    status: filterStatus === 'all' ? undefined : (filterStatus as 'active' | 'inactive' | 'graduated'),
    search: search || undefined,
  });

  // 학생 통계 조회
  const studentIds = useMemo(() => {
    if (!isSupabaseConfigured) return [];
    return supabaseStudents?.map((s) => s.id) || [];
  }, [supabaseStudents]);

  const firstStudentId = studentIds.length > 0 ? studentIds[0] : null;
  const { data: supabaseStats } = useStudentStats(firstStudentId);

  // Mock 데이터 필터링
  const mockFilteredStudents = useMemo(() => {
    let result = [...MOCK_STUDENTS];
    if (filterStatus !== 'all') result = result.filter((s) => s.status === filterStatus);
    if (filterDivision !== 'all') {
      const divisionGrades = DIVISION_GRADES[filterDivision];
      result = result.filter((s) => divisionGrades.includes(s.grade));
    }
    if (filterGrade && filterGrade !== 'all') result = result.filter((s) => s.grade === filterGrade);
    if (filterSubject !== 'all') {
      result = result.filter((s) => s.subjectEnrollments?.[filterSubject] !== undefined);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.school.toLowerCase().includes(searchLower) ||
          s.grade.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [filterStatus, filterDivision, filterGrade, filterSubject, search]);

  // 실제 사용할 학생 목록
  const students = useMemo(() => {
    if (isSupabaseConfigured && supabaseStudents && supabaseStudents.length > 0) {
      return supabaseStudents;
    }
    return mockFilteredStudents;
  }, [supabaseStudents, mockFilteredStudents]);

  const statsData =
    isSupabaseConfigured && firstStudentId && supabaseStats
      ? { [firstStudentId]: supabaseStats }
      : MOCK_STUDENT_STATS;

  const isLoading = isSupabaseConfigured ? supabaseLoading : false;

  // 필터링 & 정렬된 학생 목록
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    let result = [...students];
    if (filterDivision !== 'all') {
      const divisionGrades = DIVISION_GRADES[filterDivision];
      result = result.filter((s) => divisionGrades.includes(getGradeString(s)));
    }
    if (filterGrade && filterGrade !== 'all') {
      result = result.filter((s) => getGradeString(s) === filterGrade);
    }
    if (filterSubject !== 'all') {
      result = result.filter((s) => {
        if ('subjectEnrollments' in s && s.subjectEnrollments) {
          return s.subjectEnrollments[filterSubject as SubjectCode] !== undefined;
        }
        if ('enrollments' in s && Array.isArray(s.enrollments)) {
          return s.enrollments.some((e: { class?: { subject?: string } }) => e.class?.subject === filterSubject);
        }
        return false;
      });
    }
    result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
    return result;
  }, [students, filterDivision, filterGrade, filterSubject]);

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        <PageHeader
          title="학생 관리"
          description="전체 학생의 정보와 통계를 관리합니다"
          actions={
            <div className="flex items-center gap-3">
              <DataSourceBadge />
              <button
                onClick={() => navigate('/admin/subject-assignment')}
                className="px-4 py-2 bg-grey-100 text-grey-700 font-medium rounded-lg hover:bg-grey-200 transition-colors"
              >
                반 배정
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
                + 학생 등록
              </button>
            </div>
          }
        />

        {/* 필터 섹션 */}
        <div className="bg-white border border-grey-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-grey-500 w-10">학부</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                {(['all', 'elementary', 'middle', 'high'] as Division[]).map((division) => (
                  <button
                    key={division}
                    onClick={() => handleDivisionChange(division)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterDivision === division
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {DIVISION_LABELS[division]}
                  </button>
                ))}
              </div>
            </div>
            {filterDivision !== 'all' && (
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="hidden lg:block h-6 w-px bg-grey-200" />
                <span className="text-sm font-medium text-grey-500 w-10 lg:w-auto">학년</span>
                <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                  <button
                    onClick={() => setFilterGrade('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterGrade === 'all' ? 'bg-white text-grey-900 shadow-sm' : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    전체
                  </button>
                  {DIVISION_GRADES[filterDivision].map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setFilterGrade(grade)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        filterGrade === grade ? 'bg-white text-grey-900 shadow-sm' : 'text-grey-500 hover:text-grey-700'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-grey-500 w-10">검색</span>
              <div className="relative w-44">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">🔍</span>
                <input
                  type="text"
                  placeholder="이름..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 lg:gap-4">
              <div className="hidden lg:block h-6 w-px bg-grey-200" />
              <span className="text-sm font-medium text-grey-500 w-10 lg:w-auto">과목</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                <button
                  onClick={() => setFilterSubject('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterSubject === 'all' ? 'bg-white text-grey-900 shadow-sm' : 'text-grey-500 hover:text-grey-700'
                  }`}
                >
                  전체
                </button>
                {(['math', 'korean', 'english', 'science'] as SubjectCode[]).map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setFilterSubject(subject)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterSubject === subject
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-500 hover:text-grey-700'
                    }`}
                  >
                    {SUBJECT_CONFIG[subject].name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 학생 목록 테이블 */}
        <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <span>📋</span>
              학생 목록
            </h3>
            <span className="text-sm text-grey-500">{filteredStudents.length}명</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-grey-500">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              로딩 중...
            </div>
          ) : filteredStudents.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
                  <th className="px-5 py-3 text-left">학생</th>
                  <th className="px-5 py-3 text-left">학년/학교</th>
                  <th className="px-5 py-3 text-left">수강 과목</th>
                  <th className="px-5 py-3 text-left">상태</th>
                  <th className="px-5 py-3 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {filteredStudents.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onClick={() => setSelectedStudent(student)}
                    onConsultation={() =>
                      navigate('/admin/consultation/student', {
                        state: { selectedStudentId: student.id },
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-grey-500">
              <div className="text-4xl mb-3">📭</div>
              {search ? '검색 결과가 없습니다' : '등록된 학생이 없습니다'}
            </div>
          )}
        </section>
      </div>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          stats={statsData?.[selectedStudent.id]}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </AdminLayoutV5>
  );
}
