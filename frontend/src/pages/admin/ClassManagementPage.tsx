/**
 * 반 관리 페이지
 * 반 목록 조회, 생성, 수정, 삭제 + 담당 강사 배정
 *
 * Stage 11-11: 토글 필터 UI 적용
 * - select 드롭다운 → 토글 버튼 그룹
 * - 학부 → 학년 2단계 필터
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayoutV5 } from '../../components/admin/layout/AdminLayoutV5';
import { CreateClassModal, EditClassModal, ClassActionsMenu } from '../../components/admin/classes';
import {
  useClasses,
  useClassStudentCounts,
  useGrades,
  useSubjects,
  formatScheduleWithTimes,
  getSubjectColor,
  extractGradeFromName,
} from '../../hooks/useClasses';
import { ClassData } from '../../api/classes';

// =====================================================
// 토글 필터 상수
// =====================================================

type Division = 'all' | 'elementary' | 'middle' | 'high';
type StatusFilter = 'all' | 'active' | 'inactive';

const DIVISION_GRADES: Record<Exclude<Division, 'all'>, string[]> = {
  elementary: ['초3', '초4', '초5', '초6'],
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
};

/**
 * 초등부 반 여부 확인
 */
function isElementaryClass(cls: ClassData): boolean {
  const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
  return gradeName?.startsWith('초') || false;
}

const DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'elementary', label: '초등부' },
  { value: 'middle', label: '중등부' },
  { value: 'high', label: '고등부' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' },
];

// =====================================================
// 토글 버튼 컴포넌트
// =====================================================

interface ToggleOption<T> {
  value: T;
  label: string;
}

interface ToggleGroupProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ToggleOption<T>[];
}

function ToggleGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-grey-500 w-10 shrink-0">{label}</span>
      <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              value === option.value
                ? 'bg-white text-grey-900 shadow-sm'
                : 'text-grey-500 hover:text-grey-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 메인 컴포넌트
// =====================================================

export default function ClassManagementPage() {
  const navigate = useNavigate();

  // 토글 필터 상태
  const [filterDivision, setFilterDivision] = useState<Division>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 학부 변경 시 학년 리셋
  const handleDivisionChange = (division: Division) => {
    setFilterDivision(division);
    setFilterGrade('all'); // 학년 초기화
  };

  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);

  // 데이터 조회 (전체 조회 후 클라이언트에서 필터링)
  const { data: classes, isLoading, error } = useClasses({});
  const { data: studentCounts } = useClassStudentCounts();
  const { data: grades } = useGrades();
  const { data: subjects } = useSubjects();

  // 과목 옵션 생성
  const subjectOptions = useMemo(() => {
    const options: ToggleOption<string>[] = [{ value: 'all', label: '전체' }];
    subjects?.forEach(s => {
      options.push({ value: s.id, label: s.name });
    });
    return options;
  }, [subjects]);

  // 선택된 학부에 따른 학년 옵션
  const gradeOptions = useMemo(() => {
    const options: ToggleOption<string>[] = [{ value: 'all', label: '전체' }];
    if (filterDivision !== 'all') {
      DIVISION_GRADES[filterDivision].forEach(g => {
        options.push({ value: g, label: g });
      });
    }
    return options;
  }, [filterDivision]);

  // 필터링 (클라이언트 사이드)
  const filteredClasses = useMemo(() => {
    if (!classes) return [];

    return classes.filter(cls => {
      // 1. 학부 필터 (학년 기반)
      if (filterDivision !== 'all') {
        const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
        const divisionGrades = DIVISION_GRADES[filterDivision];
        if (!gradeName || !divisionGrades.includes(gradeName)) {
          return false;
        }
      }

      // 2. 학년 필터
      if (filterGrade !== 'all') {
        const gradeName = cls.grades?.name || extractGradeFromName(cls.name);
        if (gradeName !== filterGrade) {
          return false;
        }
      }

      // 3. 과목 필터
      if (filterSubject !== 'all') {
        if (cls.subject_id !== filterSubject) {
          return false;
        }
      }

      // 4. 상태 필터
      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && !cls.is_active) return false;
        if (filterStatus === 'inactive' && cls.is_active) return false;
      }

      // 5. 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = cls.name.toLowerCase().includes(query);
        const matchTeacher = cls.teachers?.name?.toLowerCase().includes(query);
        if (!matchName && !matchTeacher) return false;
      }

      return true;
    });
  }, [classes, filterDivision, filterGrade, filterSubject, filterStatus, searchQuery]);

  return (
    <AdminLayoutV5>
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-grey-900">반 관리</h1>
            <p className="text-sm text-grey-500 mt-1">
              반별 수업시간과 담당 강사를 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/subject-assignment')}
              className="px-4 py-2 bg-white text-grey-700 font-medium rounded-lg border border-grey-300 hover:bg-grey-50 transition-colors flex items-center gap-2"
            >
              <span>👥</span>
              <span>반 배정</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              <span>새 반 만들기</span>
            </button>
          </div>
        </div>

        {/* 필터 바 - 토글 스타일 */}
        <div className="bg-white rounded-xl border border-grey-200 p-4 mb-4 space-y-3">
          {/* 검색 + 학부/학년 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 검색 */}
            <div className="relative min-w-[200px] max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="반 이름 또는 강사명 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 학부 필터 */}
            <ToggleGroup
              label="학부"
              value={filterDivision}
              onChange={handleDivisionChange}
              options={DIVISION_OPTIONS}
            />

            {/* 학년 필터 (학부 선택 시에만 표시) */}
            {filterDivision !== 'all' && (
              <ToggleGroup
                label="학년"
                value={filterGrade}
                onChange={setFilterGrade}
                options={gradeOptions}
              />
            )}
          </div>

          {/* 과목/상태 */}
          <div className="flex flex-wrap items-center gap-4">
            {/* 과목 필터 */}
            <ToggleGroup
              label="과목"
              value={filterSubject}
              onChange={setFilterSubject}
              options={subjectOptions}
            />

            {/* 상태 필터 */}
            <ToggleGroup
              label="상태"
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>

        {/* 반 목록 */}
        <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
              <p className="text-grey-500 mt-2">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-500">오류가 발생했습니다</p>
              <p className="text-sm text-grey-500 mt-1">{(error as Error).message}</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-grey-500">반이 없습니다</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-grey-50 border-b border-grey-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">반 이름</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">과목</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">학년</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">수업 시간</th>
                  {/* Stage 31: 초등부는 담임/부담임, 그 외는 담당 강사 */}
                  {filterDivision === 'elementary' ? (
                    <>
                      <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">담임 (월수금)</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">부담임 (화목)</th>
                    </>
                  ) : (
                    <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">담당 강사</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">학생</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-grey-600">상태</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-grey-600"></th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((cls) => {
                  const subjectColor = getSubjectColor(cls.subjects?.code || cls.subject);
                  const count = studentCounts?.[cls.id] || 0;

                  return (
                    <tr
                      key={cls.id}
                      className="border-b border-grey-100 hover:bg-grey-50 cursor-pointer"
                      onClick={() => setEditingClass(cls)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-grey-900">{cls.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${subjectColor.bg} ${subjectColor.text}`}>
                          {cls.subjects?.name || cls.subject}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-grey-600">
                        {cls.grades?.name || extractGradeFromName(cls.name) || '-'}
                      </td>
                      <td className="px-4 py-3 text-grey-600 whitespace-nowrap">
                        {formatScheduleWithTimes(
                          cls.day_of_week,
                          cls.start_times,
                          cls.end_times,
                          cls.start_time,
                          cls.end_time
                        )}
                      </td>
                      {/* Stage 31: 초등부는 담임/부담임, 그 외는 담당 강사 */}
                      {filterDivision === 'elementary' || isElementaryClass(cls) ? (
                        <>
                          <td className="px-4 py-3">
                            {cls.homeroom_teacher?.name ? (
                              <span className="text-grey-700">{cls.homeroom_teacher.name}</span>
                            ) : (
                              <span className="text-grey-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {cls.assistant_teacher?.name ? (
                              <span className="text-grey-700">{cls.assistant_teacher.name}</span>
                            ) : (
                              <span className="text-grey-400">-</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-3">
                          {cls.teachers?.name ? (
                            <span className="text-grey-700">{cls.teachers.name}</span>
                          ) : (
                            <span className="text-grey-400">미배정</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-grey-600">
                        {count}/{cls.max_students}
                      </td>
                      <td className="px-4 py-3">
                        {cls.is_active ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            활성
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-grey-100 text-grey-600">
                            비활성
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <ClassActionsMenu
                          classData={cls}
                          onEdit={() => setEditingClass(cls)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 통계 */}
        {classes && (
          <div className="mt-4 text-sm text-grey-500">
            총 {filteredClasses.length}개의 반 (전체 {classes.length}개)
          </div>
        )}
      </div>

      {/* 모달 */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {editingClass && (
        <EditClassModal
          isOpen={!!editingClass}
          onClose={() => setEditingClass(null)}
          classData={editingClass}
        />
      )}
    </AdminLayoutV5>
  );
}
