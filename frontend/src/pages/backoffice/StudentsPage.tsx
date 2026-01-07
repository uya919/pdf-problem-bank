/**
 * StudentsPage - 학생 목록 페이지 (전화번호 중심 리디자인)
 *
 * 디자인 원칙:
 * - 1탭 전화 걸기: 학생/학부모 전화번호 바로 접근
 * - 내 담당 학생만: 강사가 담당하는 반의 학생만 표시
 * - 모달로 상세 정보: 출결, 성적, 숙제는 모달에서 확인
 *
 * 반응형:
 * - 모바일 (<768px): 카드 리스트 + 전화 버튼
 * - 태블릿/PC (≥768px): 테이블 + 복사 버튼
 */
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useIsMobile';
import { useAuth } from '../../contexts/AuthContext';
import { BottomNavBar } from './components/BottomNavBar';
import { StudentCard } from '../../components/backoffice/students/StudentCard';
import { StudentTable } from '../../components/backoffice/students/StudentTable';
import { StudentDetailModal } from '../../components/backoffice/students/StudentDetailModal';
import { useMyStudents, filterStudents, type MyStudent } from '../../hooks/useMyStudents';

export default function StudentsPage() {
  const { isLoading: authLoading } = useAuth();
  const { isMobile, isTabletOrAbove } = useBreakpoint();

  // 로그인 체크는 ProtectedRoute에서 처리하므로 제거
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  // 모달 상태
  const [selectedStudent, setSelectedStudent] = useState<MyStudent | null>(null);

  // =====================
  // 담당 학생 조회
  // =====================
  const { data: students = [], isLoading, error } = useMyStudents();

  // =====================
  // 학년 목록 추출
  // =====================
  const grades = useMemo(() => {
    const gradeSet = new Set<string>();
    students.forEach((s) => {
      if (s.grade_info?.name) {
        gradeSet.add(s.grade_info.name);
      }
    });
    // 정렬: 중1, 중2, 중3, 고1, 고2, 고3
    return Array.from(gradeSet).sort((a, b) => {
      const order: Record<string, number> = {
        '중1': 1, '중2': 2, '중3': 3,
        '고1': 4, '고2': 5, '고3': 6,
        '초1': -6, '초2': -5, '초3': -4, '초4': -3, '초5': -2, '초6': -1,
      };
      return (order[a] || 99) - (order[b] || 99);
    });
  }, [students]);

  // =====================
  // 필터링된 학생 목록
  // =====================
  const filteredStudents = useMemo(() => {
    return filterStudents(students, searchQuery, selectedGrade || undefined);
  }, [students, searchQuery, selectedGrade]);

  // =====================
  // 학년별 카운트
  // =====================
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const grade = s.grade_info?.name;
      if (grade) {
        counts[grade] = (counts[grade] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  // 모달 열기
  const handleOpenDetail = (student: MyStudent) => {
    setSelectedStudent(student);
  };

  // 모달 닫기
  const handleCloseDetail = () => {
    setSelectedStudent(null);
  };

  // =====================
  // 인증 로딩 상태
  // =====================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">인증 확인 중...</p>
        </div>
        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 로딩 상태
  // =====================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">학생 목록 불러오는 중...</p>
        </div>
        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 에러 상태
  // =====================
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-red-500 text-xl">!</span>
          </div>
          <p className="text-sm text-gray-700 mb-2">학생 목록을 불러오지 못했습니다</p>
          <p className="text-xs text-gray-500">잠시 후 다시 시도해주세요</p>
        </div>
        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 태블릿/PC: 테이블 레이아웃
  // =====================
  if (isTabletOrAbove) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* 헤더 */}
        <div className="bg-white px-6 py-5 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">내 학생</h1>
          <p className="text-sm text-gray-500 mt-1">
            담당 반의 학생 {filteredStudents.length}명
          </p>
        </div>

        {/* 검색 + 필터 */}
        <div className="bg-white px-6 py-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* 검색 */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="학생 이름, 학교 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 학년 필터 */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGrade(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedGrade
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체 ({students.length})
              </button>
              {grades.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedGrade === grade
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {grade} ({gradeCounts[grade] || 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="p-6">
          {filteredStudents.length > 0 ? (
            <StudentTable
              students={filteredStudents}
              onClickDetail={handleOpenDetail}
            />
          ) : (
            <div className="bg-white rounded-2xl py-16 text-center">
              <div className="text-gray-400 mb-2">검색 결과가 없습니다</div>
              <p className="text-sm text-gray-400">
                다른 검색어나 필터를 시도해보세요
              </p>
            </div>
          )}
        </div>

        {/* 모달 */}
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            isOpen={!!selectedStudent}
            onClose={handleCloseDetail}
          />
        )}

        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 모바일: 카드 리스트
  // =====================
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">내 학생</h1>
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="학생 이름, 학교 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => setSelectedGrade(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedGrade
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            전체 {students.length}명
          </button>

          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedGrade === grade
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {grade} ({gradeCounts[grade] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* 학생 카드 리스트 */}
      <div className="px-4 py-4 space-y-3">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClickDetail={() => handleOpenDetail(student)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">검색 결과가 없습니다</div>
            <p className="text-sm text-gray-400">
              다른 검색어나 필터를 시도해보세요
            </p>
          </div>
        )}
      </div>

      {/* 담당 학생이 없는 경우 */}
      {students.length === 0 && !isLoading && (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👨‍🎓</span>
          </div>
          <h3 className="text-gray-700 font-medium mb-2">담당 학생이 없습니다</h3>
          <p className="text-sm text-gray-500">
            담당 반에 학생이 배정되면 여기에 표시됩니다
          </p>
        </div>
      )}

      {/* 모달 */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          onClose={handleCloseDetail}
        />
      )}

      <BottomNavBar active="students" />
    </div>
  );
}
