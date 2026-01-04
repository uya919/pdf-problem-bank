/**
 * StudentsPage - 학생 목록 페이지 (v3 반응형)
 *
 * 반응형 패턴:
 * - 모바일 (<768px): 검색 + 필터 칩 + 카드 리스트
 * - 태블릿 (≥768px): Master-Detail (학생 목록 + 상세)
 *
 * Supabase 연결: Phase 5-A (2025-12-13)
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreakpoint } from '../../hooks/useIsMobile';
import { MasterDetailLayout } from '../../components/responsive';
import { BottomNavBar } from './components/BottomNavBar';
import {
  Student,
  StudentStats,
  StudentCard,
  getStudentAlerts,
} from '../../components/backoffice/students';
import { useStudents, useStudentStats } from '../../hooks/useBackofficeData';
import type { StudentWithEnrollments } from '../../types/database';

// ============ 헬퍼 함수 ============

/** 요일 숫자를 한글로 변환 */
const DAY_NAMES: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토'
};

/** StudentWithEnrollments → Student 변환 */
function toUIStudent(s: StudentWithEnrollments): Student {
  // 첫 번째 활성 등록 정보 가져오기
  const activeEnrollment = s.enrollments?.find(e => e.status === 'active');
  const cls = activeEnrollment?.class as { id?: string; name?: string; subject?: string; day_of_week?: number[]; start_time?: string } | undefined;

  // 스케줄 포맷팅 (day_of_week가 있으면)
  let schedule = '';
  if (cls?.day_of_week && cls.start_time) {
    const days = cls.day_of_week.map(d => DAY_NAMES[d] || '').filter(Boolean).join('/');
    const time = cls.start_time.slice(0, 5);
    schedule = `${days} ${time}`;
  }

  // grade는 JOIN된 객체: { id: string, name: string } 형태
  const gradeObj = s.grade as unknown as { id?: string; name?: string } | null;
  const gradeName = gradeObj?.name || '';

  return {
    id: s.id,
    name: s.name,
    grade: gradeName,
    classId: cls?.id || '',
    className: cls?.name || '',
    schedule,
    phone: s.phone || undefined,
    parentPhone: s.parent_phone || undefined,
  };
}

// ============ Mock 데이터 ============

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: '박성빈', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '2', name: '이사랑', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '3', name: '김민수', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '4', name: '이영희', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '5', name: '박철수', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '6', name: '최수진', grade: '중3', classId: '2', className: '중3A반', schedule: '월/수/금 17:00' },
  { id: '7', name: '정우성', grade: '중2', classId: '3', className: '중2A반', schedule: '화/목 18:00' },
  { id: '8', name: '한지민', grade: '중2', classId: '3', className: '중2A반', schedule: '화/목 18:00' },
  { id: '9', name: '송중기', grade: '중2', classId: '3', className: '중2A반', schedule: '화/목 18:00' },
  { id: '10', name: '전지현', grade: '중1', classId: '4', className: '중1A반', schedule: '토 10:00' },
  { id: '11', name: '이준혁', grade: '중1', classId: '4', className: '중1A반', schedule: '토 10:00' },
  { id: '12', name: '김태리', grade: '중1', classId: '4', className: '중1A반', schedule: '토 10:00' },
];

const MOCK_STATS: Record<string, StudentStats> = {
  '1': { attendanceRate: 83, homeworkRate: 60, averageScore: 68, recentScore: 68, scoreTrend: -15, absenceCount: 2 },
  '2': { attendanceRate: 100, homeworkRate: 40, averageScore: 72, recentScore: 72, scoreTrend: -3, absenceCount: 0 },
  '3': { attendanceRate: 100, homeworkRate: 95, averageScore: 92, recentScore: 95, scoreTrend: 5, absenceCount: 0 },
  '4': { attendanceRate: 100, homeworkRate: 90, averageScore: 88, recentScore: 92, scoreTrend: 2, absenceCount: 0 },
  '5': { attendanceRate: 100, homeworkRate: 85, averageScore: 85, recentScore: 88, scoreTrend: 0, absenceCount: 0 },
  '6': { attendanceRate: 100, homeworkRate: 80, averageScore: 82, recentScore: 85, scoreTrend: 1, absenceCount: 0 },
  '7': { attendanceRate: 92, homeworkRate: 75, averageScore: 78, recentScore: 80, scoreTrend: 3, absenceCount: 1 },
  '8': { attendanceRate: 100, homeworkRate: 90, averageScore: 90, recentScore: 92, scoreTrend: 4, absenceCount: 0 },
  '9': { attendanceRate: 100, homeworkRate: 85, averageScore: 75, recentScore: 78, scoreTrend: -2, absenceCount: 0 },
  '10': { attendanceRate: 100, homeworkRate: 95, averageScore: 88, recentScore: 90, scoreTrend: 5, absenceCount: 0 },
  '11': { attendanceRate: 83, homeworkRate: 30, averageScore: 65, recentScore: 62, scoreTrend: -8, absenceCount: 2 },
  '12': { attendanceRate: 100, homeworkRate: 90, averageScore: 82, recentScore: 85, scoreTrend: 3, absenceCount: 0 },
};

// ============ 컴포넌트 ============

type SortType = 'name' | 'grade' | 'class' | null;
type SortOrder = 'asc' | 'desc';

export default function StudentsPage() {
  const navigate = useNavigate();
  const { isMobile, isTabletOrAbove } = useBreakpoint();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [showWarningOnly, setShowWarningOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // =====================
  // Supabase 데이터 조회
  // =====================
  const { data: supabaseStudents, isLoading: isLoadingStudents } = useStudents({ status: 'active' });

  // =====================
  // Mock Fallback 패턴
  // =====================
  const students: Student[] = useMemo(() => {
    if (supabaseStudents && supabaseStudents.length > 0) {
      return supabaseStudents.map(toUIStudent);
    }
    return MOCK_STUDENTS;
  }, [supabaseStudents]);

  // 학생 ID 목록 추출 (통계 조회용)
  const studentIds = useMemo(() => students.map(s => s.id), [students]);

  // 학생별 통계 조회 (Phase 5-B) - 첫 번째 학생만 (배열 지원 안함)
  const firstStudentId = studentIds.length > 0 ? studentIds[0] : null;
  const { data: supabaseStats } = useStudentStats(firstStudentId);

  // Mock Fallback 패턴: Supabase 데이터가 있으면 사용, 없으면 Mock
  const studentStats: Record<string, StudentStats> = useMemo(() => {
    if (supabaseStats && firstStudentId) {
      // 단일 StudentStats → Record<string, StudentStats>
      return { [firstStudentId]: supabaseStats } as Record<string, StudentStats>;
    }
    return MOCK_STATS;
  }, [supabaseStats, firstStudentId]);

  // 정렬 버튼 클릭 핸들러
  const handleSort = (type: SortType) => {
    if (sortBy === type) {
      // 같은 버튼 클릭 시 순서 토글
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 버튼 클릭 시 해당 정렬로 변경
      setSortBy(type);
      setSortOrder('asc');
    }
  };

  // 학년별 카운트
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      counts[s.grade] = (counts[s.grade] || 0) + 1;
    });
    return counts;
  }, [students]);

  // 주의 학생 수
  const warningCount = useMemo(() => {
    return students.filter((s) => {
      const stats = studentStats[s.id];
      if (!stats) return false;
      const alerts = getStudentAlerts(stats);
      return alerts.length > 0;
    }).length;
  }, [students, studentStats]);

  // 학년 순서 (정렬용)
  const gradeOrder: Record<string, number> = { '중1': 1, '중2': 2, '중3': 3 };

  // 필터링 및 정렬된 학생 목록
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 검색어 필터
    if (searchQuery) {
      result = result.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 학년 필터
    if (selectedGrade) {
      result = result.filter((s) => s.grade === selectedGrade);
    }

    // 주의 학생만
    if (showWarningOnly) {
      result = result.filter((s) => {
        const stats = studentStats[s.id];
        if (!stats) return false;
        const alerts = getStudentAlerts(stats);
        return alerts.length > 0;
      });
    }

    // 정렬
    if (sortBy) {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'ko');
            break;
          case 'grade':
            comparison = (gradeOrder[a.grade] || 0) - (gradeOrder[b.grade] || 0);
            break;
          case 'class':
            comparison = a.className.localeCompare(b.className, 'ko');
            break;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [students, studentStats, searchQuery, selectedGrade, showWarningOnly, sortBy, sortOrder]);

  const grades = ['중1', '중2', '중3'];

  // 선택된 학생 정보
  const selectedStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : null;
  const selectedStats = selectedStudentId ? studentStats[selectedStudentId] : null;
  const selectedAlerts = selectedStats ? getStudentAlerts(selectedStats) : [];

  // 학생 클릭 핸들러
  const handleStudentClick = (studentId: string) => {
    if (isTabletOrAbove) {
      setSelectedStudentId(studentId);
    } else {
      navigate(`/students/${studentId}`);
    }
  };

  // =====================
  // 로딩 상태
  // =====================
  if (isLoadingStudents) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8B95A1]">학생 목록 불러오는 중...</p>
        </div>
        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 태블릿: Master-Detail 레이아웃
  // =====================
  if (isTabletOrAbove) {
    return (
      <div className="h-screen flex flex-col bg-[#F9FAFB]">
        {/* 상단 헤더 */}
        <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-[#F2F4F6]">
          <h1 className="text-xl font-bold text-[#191F28]">학생</h1>
          <p className="text-sm text-[#8B95A1] mt-1">학생별 현황을 확인하세요</p>
        </div>

        {/* Master-Detail */}
        <div className="flex-1 overflow-hidden pb-16">
          <MasterDetailLayout
            masterWidth={320}
            hasSelection={!!selectedStudentId}
            master={
              <div className="h-full flex flex-col">
                {/* 검색 */}
                <div className="p-4 border-b bg-white">
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B95A1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="학생 이름 검색"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[#F2F4F6] rounded-lg text-sm placeholder-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    />
                  </div>

                  {/* 필터 드롭다운 */}
                  <div className="flex gap-2 mt-3">
                    <select
                      value={selectedGrade || ''}
                      onChange={(e) => setSelectedGrade(e.target.value || null)}
                      className="flex-1 px-3 py-2 bg-[#F2F4F6] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    >
                      <option value="">전체 학년</option>
                      {grades.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowWarningOnly(!showWarningOnly)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showWarningOnly
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-[#F2F4F6] text-[#6B7684]'
                      }`}
                    >
                      주의 {warningCount}
                    </button>
                  </div>
                </div>

                {/* 학생 리스트 */}
                <div className="flex-1 overflow-y-auto">
                  {filteredStudents.map((student) => {
                    const stats = studentStats[student.id];
                    const alerts = stats ? getStudentAlerts(stats) : [];
                    const isSelected = selectedStudentId === student.id;

                    return (
                      <button
                        key={student.id}
                        onClick={() => handleStudentClick(student.id)}
                        className={`w-full px-4 py-3 text-left border-b border-[#F2F4F6] transition-colors ${
                          isSelected
                            ? 'bg-[#EBF4FF] border-l-2 border-l-[#3182F6]'
                            : 'hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* 아바타 */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                            alerts.length > 0 ? 'bg-[#DC2626]' : 'bg-[#3182F6]'
                          }`}>
                            {student.name.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isSelected ? 'text-[#3182F6]' : 'text-[#191F28]'}`}>
                                {student.name}
                              </span>
                              <span className="text-xs text-[#8B95A1]">{student.grade}</span>
                              {alerts.length > 0 && (
                                <span className="w-2 h-2 bg-[#DC2626] rounded-full" />
                              )}
                            </div>
                            <div className="text-xs text-[#8B95A1] mt-0.5">{student.className}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-[#191F28]">{stats?.averageScore ?? '-'}점</div>
                            <div className={`text-xs ${(stats?.scoreTrend ?? 0) >= 0 ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>
                              {stats ? ((stats.scoreTrend >= 0 ? '+' : '') + stats.scoreTrend) : '-'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 학생 수 표시 */}
                <div className="p-4 border-t bg-white text-center">
                  <span className="text-sm text-[#8B95A1]">총 {filteredStudents.length}명</span>
                </div>
              </div>
            }
            detail={
              selectedStudent && selectedStats ? (
                <div className="h-full overflow-y-auto p-6">
                  {/* 프로필 카드 */}
                  <div className="bg-white rounded-2xl border border-[#E5E8EB] p-6 mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                        selectedAlerts.length > 0 ? 'bg-[#DC2626]' : 'bg-[#3182F6]'
                      }`}>
                        {selectedStudent.name.slice(0, 1)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#191F28]">{selectedStudent.name}</h2>
                        <p className="text-sm text-[#8B95A1]">{selectedStudent.grade} · {selectedStudent.className}</p>
                        <p className="text-xs text-[#8B95A1] mt-1">{selectedStudent.schedule}</p>
                      </div>
                    </div>

                    {/* 알림 뱃지 */}
                    {selectedAlerts.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedAlerts.map((alert, i) => (
                          <span key={i} className="px-3 py-1 bg-[#FEE2E2] text-[#DC2626] text-xs rounded-full">
                            {alert.message}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 통계 그리드 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
                      <div className="text-sm text-[#8B95A1]">출석률</div>
                      <div className="text-2xl font-bold text-[#191F28] mt-1">{selectedStats.attendanceRate}%</div>
                      <div className="text-xs text-[#8B95A1] mt-1">결석 {selectedStats.absenceCount}회</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
                      <div className="text-sm text-[#8B95A1]">숙제 완료율</div>
                      <div className="text-2xl font-bold text-[#191F28] mt-1">{selectedStats.homeworkRate}%</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
                      <div className="text-sm text-[#8B95A1]">평균 점수</div>
                      <div className="text-2xl font-bold text-[#191F28] mt-1">{selectedStats.averageScore}점</div>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#E5E8EB] p-4">
                      <div className="text-sm text-[#8B95A1]">최근 점수</div>
                      <div className="flex items-end gap-2 mt-1">
                        <span className="text-2xl font-bold text-[#191F28]">{selectedStats.recentScore}점</span>
                        <span className={`text-sm ${selectedStats.scoreTrend >= 0 ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>
                          {selectedStats.scoreTrend >= 0 ? '+' : ''}{selectedStats.scoreTrend}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 상세 보기 버튼 */}
                  <button
                    onClick={() => navigate(`/students/${selectedStudentId}`)}
                    className="w-full py-3 bg-[#3182F6] text-white rounded-xl font-medium hover:bg-[#1E6FE6] transition-colors"
                  >
                    상세 정보 보기
                  </button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-[#8B95A1]">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-sm">학생을 선택해주세요</p>
                  </div>
                </div>
              )
            }
            emptyState={
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-[#8B95A1]">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-sm">학생을 선택해주세요</p>
                </div>
              </div>
            }
            />
        </div>

        {/* 하단 네비게이션 */}
        <BottomNavBar active="students" />
      </div>
    );
  }

  // =====================
  // 모바일: 기존 레이아웃
  // =====================
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-[#F2F4F6] sticky top-0 z-10">
        <div className="text-lg font-bold text-[#191F28]">학생</div>
      </div>

      {/* 검색 + 필터 바 */}
      <div className="bg-white px-4 py-3 border-b border-[#F2F4F6]">
        {/* 검색 */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="학생 이름 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F2F4F6] rounded-xl px-4 py-3 pl-10 text-sm placeholder-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B95A1]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {/* 전체 */}
          <button
            onClick={() => {
              setSelectedGrade(null);
              setShowWarningOnly(false);
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedGrade && !showWarningOnly
                ? 'bg-[#191F28] text-white'
                : 'bg-[#F2F4F6] text-[#6B7684]'
            }`}
          >
            전체 {students.length}명
          </button>

          {/* 학년별 */}
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => {
                setSelectedGrade(grade);
                setShowWarningOnly(false);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedGrade === grade
                  ? 'bg-[#191F28] text-white'
                  : 'bg-[#F2F4F6] text-[#6B7684]'
              }`}
            >
              {grade} ({gradeCounts[grade] || 0})
            </button>
          ))}

          {/* 주의 학생 */}
          {warningCount > 0 && (
            <button
              onClick={() => {
                setSelectedGrade(null);
                setShowWarningOnly(true);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showWarningOnly
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#FEE2E2] text-[#DC2626]'
              }`}
            >
              주의 {warningCount}명
            </button>
          )}
        </div>
      </div>

      {/* 주의 알림 배너 */}
      {warningCount > 0 && !showWarningOnly && (
        <div className="mx-4 mt-4 bg-[#FEF3C7] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#92400E] text-sm">
                주의가 필요한 학생 {warningCount}명
              </div>
              <div className="text-xs text-[#B45309] mt-1">
                결석 2회 이상 또는 성적 하락 학생이 있습니다
              </div>
            </div>
            <button
              onClick={() => setShowWarningOnly(true)}
              className="text-xs text-[#92400E] font-medium"
            >
              보기
            </button>
          </div>
        </div>
      )}

      {/* 정렬 버튼 - 카드와 왼쪽 정렬 */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <span className="flex-shrink-0 text-sm text-[#8B95A1]">정렬</span>

          {/* 이름순 */}
          <button
            onClick={() => handleSort('name')}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              sortBy === 'name'
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#F2F4F6] text-[#6B7684]'
            }`}
          >
            이름순
            {sortBy === 'name' && (
              <svg
                className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {/* 학년순 */}
          <button
            onClick={() => handleSort('grade')}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              sortBy === 'grade'
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#F2F4F6] text-[#6B7684]'
            }`}
          >
            학년순
            {sortBy === 'grade' && (
              <svg
                className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {/* 반별 */}
          <button
            onClick={() => handleSort('class')}
            className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              sortBy === 'class'
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#F2F4F6] text-[#6B7684]'
            }`}
          >
            반별
            {sortBy === 'class' && (
              <svg
                className={`w-3.5 h-3.5 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>

          {/* 정렬 초기화 */}
          {sortBy && (
            <button
              onClick={() => {
                setSortBy(null);
                setSortOrder('asc');
              }}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium text-[#8B95A1] bg-transparent"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 학생 카드 리스트 */}
      <div className="px-4 py-4 space-y-3">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const stats = studentStats[student.id];
            const alerts = stats ? getStudentAlerts(stats) : [];

            // stats가 없으면 기본값 사용
            const displayStats = stats || {
              attendanceRate: 0,
              homeworkRate: 0,
              averageScore: 0,
              recentScore: 0,
              scoreTrend: 0,
              absenceCount: 0,
            };

            return (
              <StudentCard
                key={student.id}
                student={student}
                stats={displayStats}
                alerts={alerts}
                onClick={() => handleStudentClick(student.id)}
              />
            );
          })
        ) : (
          <div className="text-center py-12 text-[#8B95A1]">
            검색 결과가 없습니다
          </div>
        )}
      </div>

      <BottomNavBar active="students" />
    </div>
  );
}
