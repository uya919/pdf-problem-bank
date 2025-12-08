/**
 * BrowseAllSection Component (Phase 34.5-H)
 *
 * 전체 찾아보기 - 접이식 섹션
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { SchoolTabs } from './SchoolTabs';
import { GradeCourseSelector } from './GradeCourseSelector';
import { SeriesGrid } from './SeriesGrid';
import type { DocumentIndex, DocumentCombo, SchoolLevel, SeriesInfo } from '../../lib/documentParser';

interface BrowseAllSectionProps {
  index: DocumentIndex;
  onSelect: (combo: DocumentCombo) => void;
}

export function BrowseAllSection({ index, onSelect }: BrowseAllSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolLevel>('high');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // 학교급별 조합 수
  const counts = {
    elementary: index.schools.elementary.grades.reduce(
      (acc, g) => acc + g.courses.reduce((a, c) => a + c.series.length, 0),
      0
    ),
    middle: index.schools.middle.grades.reduce(
      (acc, g) => acc + g.courses.reduce((a, c) => a + c.series.length, 0),
      0
    ),
    high: index.schools.high.grades.reduce(
      (acc, g) => acc + g.courses.reduce((a, c) => a + c.series.length, 0),
      0
    ),
  };

  // 선택된 학년의 과정 목록
  const selectedGradeInfo = index.schools[selectedSchool].grades.find(
    (g) => g.id === selectedGrade
  );
  const courses = selectedGradeInfo?.courses || [];

  // 선택된 과정의 시리즈 목록
  const selectedCourseInfo = courses.find((c) => c.id === selectedCourse);
  const seriesList = selectedCourseInfo?.series || [];

  // 학교급 변경
  const handleSchoolChange = (school: SchoolLevel) => {
    setSelectedSchool(school);
    setSelectedGrade(null);
    setSelectedCourse(null);
  };

  // 학년 변경
  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedCourse(null);
  };

  // 시리즈 선택 → 조합 찾기
  const handleSeriesSelect = (series: SeriesInfo) => {
    if (!selectedGrade || !selectedCourse) return;

    const combo = index.allCombos.find(
      (c) =>
        c.grade === selectedGrade &&
        c.course === selectedCourse &&
        c.series === series.name
    );

    if (combo) {
      onSelect(combo);
    }
  };

  return (
    <div className="border-t border-grey-200 pt-4">
      {/* 토글 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-grey-600 hover:text-grey-900 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="w-4 h-4" />
          전체 찾아보기
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 내용 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* 학교급 탭 */}
              <SchoolTabs
                value={selectedSchool}
                onChange={handleSchoolChange}
                counts={counts}
              />

              {/* 학년 + 과정 선택 */}
              <div className="bg-grey-50 rounded-xl p-4">
                <GradeCourseSelector
                  school={selectedSchool}
                  grades={index.schools[selectedSchool].grades}
                  selectedGrade={selectedGrade}
                  selectedCourse={selectedCourse}
                  onGradeChange={handleGradeChange}
                  onCourseChange={setSelectedCourse}
                />
              </div>

              {/* 시리즈 그리드 */}
              {selectedCourse && (
                <SeriesGrid
                  grade={selectedGrade!}
                  course={selectedCourse}
                  series={seriesList}
                  onSelect={handleSeriesSelect}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
