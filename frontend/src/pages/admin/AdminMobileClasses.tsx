/**
 * AdminMobileClasses - 관리자 모바일 반 페이지 (수업 모니터링)
 *
 * 강사용 ClassesPage와 비교:
 * - 강사: 내 반 목록, 내 수업 출결/진도 입력
 * - 관리자: 전체 반 모니터링, 강사들의 입력 현황 확인
 *
 * Phase 4-D: Supabase 연결 (Mock Fallback 패턴)
 */
import { useState, useMemo } from 'react';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import { DateSelector } from '../../components/backoffice/dashboard';
import { useAllClasses } from '../../hooks/useAdminData';
import {
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react';

// ============ 타입 & 설정 ============

type SchoolLevel = 'all' | 'elementary' | 'middle' | 'high';
type ClassStatus = 'live' | 'upcoming' | 'completed';

interface ProgressInfo {
  textbook: string;
  pages: string;
}

interface ClassItem {
  id: string;
  name: string;
  teacher: string;
  time: string;
  status: ClassStatus;
  studentCount: number;
  schoolLevel: 'elementary' | 'middle' | 'high';
  grade: number; // 1-6 for elementary, 1-3 for middle/high
  attendance?: { present: number; total: number };
  // 진도 정보
  progress?: ProgressInfo;
  // 숙제 정보
  homework?: ProgressInfo;
  // 특이사항
  notes?: string;
  // 이슈 (결석, 지각 등)
  issues?: string[];
}

const SCHOOL_LEVEL_CONFIG: Record<SchoolLevel, { label: string; prefix: string; grades: number[] }> = {
  all: { label: '전체', prefix: '', grades: [] },
  elementary: { label: '초등부', prefix: '초', grades: [3, 4, 5, 6] }, // 초3~초6
  middle: { label: '중등부', prefix: '중', grades: [1, 2, 3] },
  high: { label: '고등부', prefix: '고', grades: [1, 2, 3] },
};

const STATUS_CONFIG = {
  live: { label: '진행중', color: 'text-green-600', bgColor: 'bg-green-100', icon: Clock },
  upcoming: { label: '예정', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Clock },
  completed: { label: '완료', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: CheckCircle },
};

// ============ Mock 데이터 ============

const mockClasses: ClassItem[] = [
  // 초등부
  {
    id: '1',
    name: '초6A반',
    teacher: '김수학',
    time: '10:00-11:30',
    status: 'completed',
    studentCount: 6,
    schoolLevel: 'elementary',
    grade: 6,
    attendance: { present: 6, total: 6 },
    progress: { textbook: '개념원리 6-2', pages: 'p.45-52' },
    homework: { textbook: '개념원리 6-2', pages: 'p.53-55' },
    notes: '다음 주 단원평가 예정',
  },
  {
    id: '2',
    name: '초5B반',
    teacher: '이수학',
    time: '14:00-15:30',
    status: 'live',
    studentCount: 5,
    schoolLevel: 'elementary',
    grade: 5,
    attendance: { present: 5, total: 5 },
  },
  {
    id: '10',
    name: '초4A반',
    teacher: '최수학',
    time: '16:00-17:30',
    status: 'upcoming',
    studentCount: 4,
    schoolLevel: 'elementary',
    grade: 4,
  },
  {
    id: '11',
    name: '초3B반',
    teacher: '정수학',
    time: '18:00-19:30',
    status: 'upcoming',
    studentCount: 5,
    schoolLevel: 'elementary',
    grade: 3,
  },
  // 중등부
  {
    id: '3',
    name: '중3A반',
    teacher: '김수학',
    time: '14:00-15:30',
    status: 'live',
    studentCount: 8,
    schoolLevel: 'middle',
    grade: 3,
    attendance: { present: 7, total: 8 },
    issues: ['김민수 결석'],
    notes: '내신대비 집중반 - 이차함수',
  },
  {
    id: '4',
    name: '중2A반',
    teacher: '박수학',
    time: '16:00-17:30',
    status: 'upcoming',
    studentCount: 8,
    schoolLevel: 'middle',
    grade: 2,
  },
  {
    id: '5',
    name: '중2B반',
    teacher: '이수학',
    time: '10:00-11:30',
    status: 'completed',
    studentCount: 7,
    schoolLevel: 'middle',
    grade: 2,
    attendance: { present: 6, total: 7 },
    progress: { textbook: '쎈 중2-2', pages: 'p.78-85' },
    issues: ['이영희 지각'],
    notes: '다음 시간 쪽지시험',
  },
  {
    id: '6',
    name: '중1C반',
    teacher: '최수학',
    time: '16:00-17:30',
    status: 'upcoming',
    studentCount: 7,
    schoolLevel: 'middle',
    grade: 1,
  },
  // 고등부
  {
    id: '7',
    name: '고1A반',
    teacher: '박수학',
    time: '12:00-13:30',
    status: 'completed',
    studentCount: 8,
    schoolLevel: 'high',
    grade: 1,
    attendance: { present: 8, total: 8 },
    homework: { textbook: '수학의 정석 (상)', pages: 'p.120-125' },
    notes: '모의고사 대비 특강',
  },
  {
    id: '8',
    name: '고1B반',
    teacher: '이수학',
    time: '14:00-15:30',
    status: 'live',
    studentCount: 6,
    schoolLevel: 'high',
    grade: 1,
    attendance: { present: 6, total: 6 },
    progress: { textbook: '블랙라벨', pages: 'p.88-95' },
    homework: { textbook: '블랙라벨', pages: 'p.96-100' },
  },
  {
    id: '9',
    name: '고2A반',
    teacher: '정수학',
    time: '18:00-19:30',
    status: 'upcoming',
    studentCount: 5,
    schoolLevel: 'high',
    grade: 2,
    notes: '수능특강 시작',
  },
];

// ============ 메인 컴포넌트 ============

export default function AdminMobileClasses() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('all');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ClassStatus | 'all'>('all');

  // Supabase 데이터 (Mock Fallback)
  const { data: supabaseClasses } = useAllClasses();

  // 데이터 소스: Supabase 데이터 변환 또는 Mock
  const classes: ClassItem[] = useMemo(() => {
    if (supabaseClasses && supabaseClasses.length > 0) {
      // Supabase 데이터를 ClassItem 형식으로 변환
      return supabaseClasses.map((c) => ({
        id: c.id,
        name: c.name,
        teacher: c.teacherName,
        time: c.scheduleTime,
        status: 'upcoming' as ClassStatus, // TODO: 실제 상태 계산
        studentCount: c.studentCount,
        schoolLevel: c.schoolLevel,
        grade: parseInt(c.name.match(/\d/)?.[0] || '1'),
        notes: c.currentProgress !== '진도 미입력' ? c.currentProgress : undefined,
      }));
    }
    return mockClasses;
  }, [supabaseClasses]);

  // 필터링
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      // 학교급 필터
      if (schoolLevel !== 'all' && c.schoolLevel !== schoolLevel) return false;
      // 학년 필터
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
      // 상태 필터
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [schoolLevel, selectedGrade, statusFilter]);

  // 학교급별 개수
  const schoolLevelCounts = useMemo(() => ({
    all: classes.length,
    elementary: classes.filter((c) => c.schoolLevel === 'elementary').length,
    middle: classes.filter((c) => c.schoolLevel === 'middle').length,
    high: classes.filter((c) => c.schoolLevel === 'high').length,
  }), [classes]);

  // 상태별 개수 (현재 필터 기준)
  const statusCounts = useMemo(() => {
    const baseFiltered = classes.filter((c) => {
      if (schoolLevel !== 'all' && c.schoolLevel !== schoolLevel) return false;
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
      return true;
    });
    return {
      all: baseFiltered.length,
      live: baseFiltered.filter((c) => c.status === 'live').length,
      upcoming: baseFiltered.filter((c) => c.status === 'upcoming').length,
      completed: baseFiltered.filter((c) => c.status === 'completed').length,
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
        <h1 className="text-lg font-bold text-gray-900">반 현황</h1>
        <p className="text-xs text-gray-500">강사들의 수업 진행 현황</p>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 space-y-4">
        {/* 날짜 선택기 */}
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onOpenMonthly={() => {}}
          classScheduleDates={[]}
        />

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

        {/* 학년 선택 토글 (학교급 선택 시에만 표시) */}
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

        {/* 상태 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <FilterButton
            label="전체"
            count={statusCounts.all}
            isActive={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterButton
            label="진행중"
            count={statusCounts.live}
            isActive={statusFilter === 'live'}
            onClick={() => setStatusFilter('live')}
            color="green"
            pulse
          />
          <FilterButton
            label="예정"
            count={statusCounts.upcoming}
            isActive={statusFilter === 'upcoming'}
            onClick={() => setStatusFilter('upcoming')}
            color="blue"
          />
          <FilterButton
            label="완료"
            count={statusCounts.completed}
            isActive={statusFilter === 'completed'}
            onClick={() => setStatusFilter('completed')}
            color="gray"
          />
        </div>

        {/* 결과 개수 */}
        <p className="text-xs text-gray-500">
          총 {filteredClasses.length}개 수업
        </p>

        {/* 수업 카드 리스트 */}
        <div className="space-y-3">
          {filteredClasses.length > 0 ? (
            filteredClasses.map((cls) => (
              <ClassCard key={cls.id} classItem={cls} />
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500">해당 조건의 수업이 없습니다</p>
            </div>
          )}
        </div>
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav />
    </div>
  );
}

// ============ 서브 컴포넌트 ============

// 필터 버튼
function FilterButton({
  label,
  count,
  isActive,
  onClick,
  color,
  pulse,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  color?: 'green' | 'blue' | 'gray';
  pulse?: boolean;
}) {
  const colorClasses = {
    green: isActive ? 'bg-green-100 text-green-700' : '',
    blue: isActive ? 'bg-blue-100 text-blue-700' : '',
    gray: isActive ? 'bg-gray-200 text-gray-700' : '',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
        isActive
          ? color ? colorClasses[color] : 'bg-gray-900 text-white'
          : 'bg-white text-gray-600 border border-gray-200'
      }`}
    >
      {pulse && isActive && (
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      )}
      {label}
      <span className={`text-xs ${isActive ? 'opacity-80' : 'text-gray-400'}`}>
        {count}
      </span>
    </button>
  );
}

// 수업 카드
function ClassCard({ classItem }: { classItem: ClassItem }) {
  const config = STATUS_CONFIG[classItem.status];

  const hasIssue = classItem.issues && classItem.issues.length > 0;
  const hasProgress = !!classItem.progress;
  const hasHomework = !!classItem.homework;
  const hasNotes = !!classItem.notes;
  const isAllDone = hasProgress && hasHomework;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 상태 뱃지 */}
            <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.color}`}>
              {classItem.status === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
              {config.label}
            </span>
            <span className="text-sm text-gray-500">{classItem.time}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </div>

      {/* 내용 */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{classItem.name}</h3>
            <p className="text-sm text-gray-500">{classItem.teacher} 선생님</p>
          </div>
          {isAllDone && classItem.status === 'completed' && (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </span>
          )}
        </div>

        {/* 출결 뱃지 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {classItem.attendance ? (
            <StatusBadge
              icon={<Users className="w-3.5 h-3.5" />}
              label={`출석 ${classItem.attendance.present}/${classItem.attendance.total}`}
              done={classItem.attendance.present === classItem.attendance.total}
              warning={classItem.attendance.present < classItem.attendance.total}
            />
          ) : (
            <StatusBadge
              icon={<Users className="w-3.5 h-3.5" />}
              label={`${classItem.studentCount}명`}
              pending={classItem.status !== 'upcoming'}
            />
          )}
        </div>

        {/* 진도 & 숙제 정보 (토스 스타일 리스트) */}
        {(hasProgress || hasHomework || (!hasProgress && !hasHomework && classItem.status !== 'upcoming')) && (
          <div className="space-y-2 py-2 border-t border-gray-100">
            {/* 진도 */}
            <div className="flex items-start gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                hasProgress ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                <BookOpen className={`w-3 h-3 ${hasProgress ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">진도</p>
                {hasProgress ? (
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {classItem.progress!.textbook} <span className="text-gray-500">{classItem.progress!.pages}</span>
                  </p>
                ) : (
                  <p className="text-sm text-orange-600">미입력</p>
                )}
              </div>
            </div>

            {/* 숙제 */}
            <div className="flex items-start gap-2">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                hasHomework ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                <ClipboardCheck className={`w-3 h-3 ${hasHomework ? 'text-green-600' : 'text-orange-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">숙제</p>
                {hasHomework ? (
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {classItem.homework!.textbook} <span className="text-gray-500">{classItem.homework!.pages}</span>
                  </p>
                ) : (
                  <p className="text-sm text-orange-600">미입력</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 이슈 (결석, 지각 등) */}
        {hasIssue && (
          <div className="mt-2 px-3 py-2 bg-red-50 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {classItem.issues!.join(', ')}
            </div>
          </div>
        )}

        {/* 특이사항 */}
        {hasNotes && (
          <div className={`mt-2 px-3 py-2 bg-blue-50 rounded-xl ${hasIssue ? '' : ''}`}>
            <p className="text-xs text-blue-700">
              <span className="font-medium">메모:</span> {classItem.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 상태 뱃지
function StatusBadge({
  icon,
  label,
  done,
  pending,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  done?: boolean;
  pending?: boolean;
  warning?: boolean;
}) {
  let className = 'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ';

  if (done) {
    className += 'bg-green-50 text-green-700';
  } else if (warning) {
    className += 'bg-orange-50 text-orange-700';
  } else if (pending) {
    className += 'bg-orange-50 text-orange-700';
  } else {
    className += 'bg-gray-100 text-gray-500';
  }

  return (
    <span className={className}>
      {icon}
      {label}
      {done && <CheckCircle className="w-3 h-3" />}
      {pending && !done && <span className="text-[10px]">미입력</span>}
    </span>
  );
}
