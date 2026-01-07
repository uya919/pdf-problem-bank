/**
 * AdminMobileStudents - 관리자 모바일 학생 페이지
 *
 * 강사용 StudentsPage와 비교:
 * - 강사: 내 반 학생 목록, 학생 상세 기록
 * - 관리자: 전체 학생 필터링, 학부모 연락 (tel: 프로토콜)
 *
 * Phase 4-D: Supabase 연결 (Mock Fallback 패턴)
 */
import { useState, useMemo } from 'react';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import { useAllStudents } from '../../hooks/useAdminData';
import {
  Search,
  Phone,
  MessageSquare,
  FileText,
  User,
  AlertCircle,
  X,
} from 'lucide-react';

// ============ 타입 & 설정 ============

type SchoolLevel = 'all' | 'elementary' | 'middle' | 'high';

interface Student {
  id: string;
  name: string;
  schoolLevel: 'elementary' | 'middle' | 'high';
  grade: number;
  className: string;
  teacher: string;
  parentPhone: string;
  stats: {
    attendance: number;
    homework: number;
  };
  issues?: {
    type: 'absent' | 'homework';
    label: string;
  }[];
}

const SCHOOL_LEVEL_CONFIG: Record<SchoolLevel, { label: string; prefix: string; grades: number[] }> = {
  all: { label: '전체', prefix: '', grades: [] },
  elementary: { label: '초등부', prefix: '초', grades: [3, 4, 5, 6] },
  middle: { label: '중등부', prefix: '중', grades: [1, 2, 3] },
  high: { label: '고등부', prefix: '고', grades: [1, 2, 3] },
};

// ============ Mock 데이터 ============

const mockStudents: Student[] = [
  // 초등부
  {
    id: '6',
    name: '강현우',
    schoolLevel: 'elementary',
    grade: 6,
    className: '초6A반',
    teacher: '최수학',
    parentPhone: '010-6789-0123',
    stats: { attendance: 98, homework: 92 },
  },
  {
    id: '12',
    name: '송민지',
    schoolLevel: 'elementary',
    grade: 5,
    className: '초5B반',
    teacher: '이수학',
    parentPhone: '010-1111-2222',
    stats: { attendance: 95, homework: 88 },
  },
  {
    id: '13',
    name: '한도윤',
    schoolLevel: 'elementary',
    grade: 4,
    className: '초4A반',
    teacher: '최수학',
    parentPhone: '010-2222-3333',
    stats: { attendance: 100, homework: 95 },
  },
  // 중등부
  {
    id: '1',
    name: '김민수',
    schoolLevel: 'middle',
    grade: 3,
    className: '중3A반',
    teacher: '김수학',
    parentPhone: '010-1234-5678',
    stats: { attendance: 85, homework: 78 },
    issues: [{ type: 'absent', label: '오늘 결석' }],
  },
  {
    id: '2',
    name: '이영희',
    schoolLevel: 'middle',
    grade: 2,
    className: '중2B반',
    teacher: '이수학',
    parentPhone: '010-2345-6789',
    stats: { attendance: 92, homework: 65 },
    issues: [{ type: 'homework', label: '숙제 미제출' }],
  },
  {
    id: '3',
    name: '박철수',
    schoolLevel: 'middle',
    grade: 3,
    className: '중3A반',
    teacher: '김수학',
    parentPhone: '010-3456-7890',
    stats: { attendance: 95, homework: 90 },
  },
  {
    id: '8',
    name: '조하늘',
    schoolLevel: 'middle',
    grade: 1,
    className: '중1C반',
    teacher: '최수학',
    parentPhone: '010-3333-4444',
    stats: { attendance: 90, homework: 85 },
  },
  // 고등부
  {
    id: '4',
    name: '최지원',
    schoolLevel: 'high',
    grade: 1,
    className: '고1B반',
    teacher: '박수학',
    parentPhone: '010-4567-8901',
    stats: { attendance: 100, homework: 95 },
  },
  {
    id: '5',
    name: '정다은',
    schoolLevel: 'high',
    grade: 1,
    className: '고1B반',
    teacher: '박수학',
    parentPhone: '010-5678-9012',
    stats: { attendance: 88, homework: 82 },
    issues: [{ type: 'homework', label: '숙제 미제출' }],
  },
  {
    id: '9',
    name: '임서준',
    schoolLevel: 'high',
    grade: 2,
    className: '고2A반',
    teacher: '정수학',
    parentPhone: '010-4444-5555',
    stats: { attendance: 92, homework: 78 },
    issues: [{ type: 'absent', label: '오늘 결석' }],
  },
  {
    id: '10',
    name: '황예린',
    schoolLevel: 'high',
    grade: 2,
    className: '고2A반',
    teacher: '정수학',
    parentPhone: '010-5555-6666',
    stats: { attendance: 98, homework: 90 },
  },
];

// ============ 메인 컴포넌트 ============

export default function AdminMobileStudents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<'none' | 'absent' | 'homework'>('none');

  // Supabase 데이터 (Mock Fallback)
  const { data: supabaseStudents } = useAllStudents();

  // 데이터 소스: Supabase 데이터 변환 또는 Mock
  const students: Student[] = useMemo(() => {
    if (supabaseStudents && supabaseStudents.length > 0) {
      // Supabase 데이터를 Student 형식으로 변환
      return supabaseStudents.map((s) => ({
        id: s.id,
        name: s.name,
        schoolLevel: s.schoolLevel,
        grade: parseInt(s.grade.match(/\d/)?.[0] || '1'),
        className: s.classes[0] || '미배정',
        teacher: '담당 선생님', // TODO: 실제 담당 선생님 연결
        parentPhone: s.parentPhone || '연락처 없음',
        stats: { attendance: 95, homework: 90 }, // TODO: 실제 통계 연결
      }));
    }
    return mockStudents;
  }, [supabaseStudents]);

  // 필터링 로직
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // 검색어 필터
      if (searchQuery && !student.name.includes(searchQuery)) return false;
      // 학교급 필터
      if (schoolLevel !== 'all' && student.schoolLevel !== schoolLevel) return false;
      // 학년 필터
      if (selectedGrade !== 'all' && student.grade !== selectedGrade) return false;
      // 빠른 필터
      if (quickFilter === 'absent') {
        if (!student.issues?.some((i) => i.type === 'absent')) return false;
      }
      if (quickFilter === 'homework') {
        if (!student.issues?.some((i) => i.type === 'homework')) return false;
      }
      return true;
    });
  }, [searchQuery, schoolLevel, selectedGrade, quickFilter]);

  // 학교급별 개수
  const schoolLevelCounts = useMemo(() => ({
    all: students.length,
    elementary: students.filter((s) => s.schoolLevel === 'elementary').length,
    middle: students.filter((s) => s.schoolLevel === 'middle').length,
    high: students.filter((s) => s.schoolLevel === 'high').length,
  }), [students]);

  // 빠른 필터 개수 (현재 필터 기준)
  const quickFilterCounts = useMemo(() => {
    const baseFiltered = students.filter((s) => {
      if (schoolLevel !== 'all' && s.schoolLevel !== schoolLevel) return false;
      if (selectedGrade !== 'all' && s.grade !== selectedGrade) return false;
      return true;
    });
    return {
      absent: baseFiltered.filter((s) => s.issues?.some((i) => i.type === 'absent')).length,
      homework: baseFiltered.filter((s) => s.issues?.some((i) => i.type === 'homework')).length,
    };
  }, [schoolLevel, selectedGrade]);

  // 학교급 변경 시 학년 초기화
  const handleSchoolLevelChange = (level: SchoolLevel) => {
    setSchoolLevel(level);
    setSelectedGrade('all');
  };

  // 현재 학교급의 설정
  const currentLevelConfig = schoolLevel !== 'all' ? SCHOOL_LEVEL_CONFIG[schoolLevel] : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-gray-900">학생</h1>
        <p className="text-xs text-gray-500">학생 검색 및 학부모 연락</p>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-4">
        {/* 검색바 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생 이름으로 검색"
            className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* 학교급 토글 (토스 스타일) */}
        <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
          {(['all', 'elementary', 'middle', 'high'] as SchoolLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleSchoolLevelChange(level)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                schoolLevel === level
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {SCHOOL_LEVEL_CONFIG[level].label}
              <span className={`ml-1 text-xs ${schoolLevel === level ? 'text-blue-500' : 'text-gray-400'}`}>
                {schoolLevelCounts[level]}
              </span>
            </button>
          ))}
        </div>

        {/* 학년 토글 (학교급 선택 시에만 표시) */}
        {currentLevelConfig && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedGrade('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedGrade === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              전체
            </button>
            {currentLevelConfig.grades.map((grade) => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedGrade === grade
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {currentLevelConfig.prefix}{grade}
              </button>
            ))}
          </div>
        )}

        {/* 빠른 필터 */}
        <div className="flex gap-2">
          <button
            onClick={() => setQuickFilter(quickFilter === 'absent' ? 'none' : 'absent')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              quickFilter === 'absent'
                ? 'bg-red-100 text-red-700'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            오늘 결석
            <span className={`text-xs ${quickFilter === 'absent' ? '' : 'text-gray-400'}`}>
              {quickFilterCounts.absent}
            </span>
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === 'homework' ? 'none' : 'homework')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              quickFilter === 'homework'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            숙제 미제출
            <span className={`text-xs ${quickFilter === 'homework' ? '' : 'text-gray-400'}`}>
              {quickFilterCounts.homework}
            </span>
          </button>
        </div>

        {/* 검색 결과 */}
        <p className="text-sm text-gray-500">
          검색 결과 <span className="font-medium text-gray-900">{filteredStudents.length}</span>명
        </p>

        {/* 학생 카드 리스트 */}
        <div className="space-y-3">
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav />
    </div>
  );
}

// ============ 서브 컴포넌트 ============

// 학생 카드
function StudentCard({ student }: { student: Student }) {
  const hasIssue = student.issues && student.issues.length > 0;
  const levelConfig = SCHOOL_LEVEL_CONFIG[student.schoolLevel];

  // 전화 연결 (tel: 프로토콜)
  const handleCall = () => {
    window.location.href = `tel:${student.parentPhone}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3">
        {/* 학생 정보 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">{student.name}</span>
                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                  {student.className}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {levelConfig.prefix}{student.grade} · {student.teacher} 선생님
              </p>
            </div>
          </div>
        </div>

        {/* 통계 또는 이슈 */}
        {hasIssue ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {student.issues!.map((issue, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  issue.type === 'absent'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {issue.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            출석률 {student.stats.attendance}% · 숙제 {student.stats.homework}%
          </p>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleCall}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl active:scale-98 transition-transform"
          >
            <Phone className="w-4 h-4" />
            학부모 전화
          </button>
          <button className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl">
            <MessageSquare className="w-4 h-4" />
            메모
          </button>
          <button className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl">
            <FileText className="w-4 h-4" />
            상세
          </button>
        </div>
      </div>
    </div>
  );
}
