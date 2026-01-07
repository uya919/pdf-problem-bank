/**
 * ClassPalette - 반/강사 팔레트 컴포넌트
 *
 * Stage 5-D: 반/강사 팔레트
 * - 반 목록 표시
 * - 학년/과목 필터
 * - 드래그 가능한 반 아이템
 */

import { useState, useMemo } from 'react';
import { Search, ChevronDown, GripVertical } from 'lucide-react';

/** 반 정보 타입 (classes 테이블 기반) */
interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  subject: string;
  color?: string;
  teacherName?: string;
}

interface ClassPaletteProps {
  classes: ClassInfo[];
  isLoading?: boolean;
  onClassSelect?: (classInfo: ClassInfo) => void;
  onClassDragStart?: (classInfo: ClassInfo) => void;
  /** 가로 스크롤 모드 (모바일용) */
  horizontal?: boolean;
}

/** 과목별 색상 */
const SUBJECT_COLORS: Record<string, string> = {
  수학: 'bg-blue-100 text-blue-700 border-blue-200',
  영어: 'bg-green-100 text-green-700 border-green-200',
  국어: 'bg-orange-100 text-orange-700 border-orange-200',
  과학: 'bg-purple-100 text-purple-700 border-purple-200',
  사회: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const DEFAULT_COLOR = 'bg-grey-100 text-grey-700 border-grey-200';

/**
 * 반 팔레트
 */
export function ClassPalette({
  classes,
  isLoading = false,
  onClassSelect,
  onClassDragStart,
  horizontal = false,
}: ClassPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('전체');
  const [subjectFilter, setSubjectFilter] = useState<string>('전체');

  // 학년/과목 옵션 추출
  const grades = useMemo(() => {
    const set = new Set(classes.map((c) => c.grade).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [classes]);

  const subjects = useMemo(() => {
    const set = new Set(classes.map((c) => c.subject).filter(Boolean));
    return ['전체', ...Array.from(set).sort()];
  }, [classes]);

  // 필터링된 반 목록
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.subject?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGrade = gradeFilter === '전체' || c.grade === gradeFilter;
      const matchesSubject = subjectFilter === '전체' || c.subject === subjectFilter;

      return matchesSearch && matchesGrade && matchesSubject;
    });
  }, [classes, searchTerm, gradeFilter, subjectFilter]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-grey-200 p-4">
        <div className="h-8 bg-grey-100 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-grey-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-grey-100 bg-grey-50">
        <h3 className="text-sm font-semibold text-grey-900">반 목록</h3>
      </div>

      {/* 검색 */}
      <div className="p-3 border-b border-grey-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="반 검색..."
            className="
              w-full pl-9 pr-3 py-2 text-sm
              border border-grey-200 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            "
          />
        </div>
      </div>

      {/* 필터 */}
      <div className="p-3 border-b border-grey-100 grid grid-cols-2 gap-2">
        {/* 학년 필터 */}
        <div className="relative">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="
              w-full px-3 py-2 text-sm
              border border-grey-200 rounded-lg appearance-none
              bg-white cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {grade === '전체' ? '학년 전체' : grade}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400 pointer-events-none" />
        </div>

        {/* 과목 필터 */}
        <div className="relative">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="
              w-full px-3 py-2 text-sm
              border border-grey-200 rounded-lg appearance-none
              bg-white cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject === '전체' ? '과목 전체' : subject}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400 pointer-events-none" />
        </div>
      </div>

      {/* 반 목록 */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        {filteredClasses.length === 0 ? (
          <div className="text-center py-8 text-sm text-grey-500">
            조건에 맞는 반이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClasses.map((classInfo) => {
              const colorClass = SUBJECT_COLORS[classInfo.subject] || DEFAULT_COLOR;

              return (
                <div
                  key={classInfo.id}
                  draggable
                  onDragStart={() => onClassDragStart?.(classInfo)}
                  onClick={() => onClassSelect?.(classInfo)}
                  className={`
                    flex items-center gap-2 p-2.5 rounded-lg border
                    ${colorClass}
                    cursor-grab active:cursor-grabbing
                    hover:shadow-sm transition-shadow
                  `}
                >
                  {/* 드래그 핸들 */}
                  <GripVertical className="w-4 h-4 opacity-40" />

                  {/* 반 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {classInfo.name}
                    </div>
                    <div className="text-xs opacity-70 flex items-center gap-1">
                      <span>{classInfo.grade}</span>
                      <span>·</span>
                      <span>{classInfo.subject}</span>
                      {classInfo.teacherName && (
                        <>
                          <span>·</span>
                          <span>{classInfo.teacherName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 카운트 */}
      <div className="px-4 py-2 border-t border-grey-100 bg-grey-50 text-xs text-grey-500">
        {filteredClasses.length}개 반
      </div>
    </div>
  );
}
