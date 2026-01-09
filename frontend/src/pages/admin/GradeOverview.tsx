/**
 * GradeOverview - 학년별 현황 페이지
 *
 * 리팩토링: Stage 54-D-2 (2025-01-07)
 * - 792줄 → ~260줄
 * - Mock 데이터 별도 파일로 분리 (mockGradeData.ts)
 * - 타입 정의 분리 (types.ts)
 *
 * 기능:
 * - 2단계 학년 탭: 초등부/중등부/고등부 + 학년
 * - 전역 과목 필터 적용
 * - KPI 요약, 진도/숙제 비교 테이블
 */
import { useState, useEffect } from 'react';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import {
  GradeTabsV2,
  GradeTabsV2Compact,
  GradeSummaryKPI,
  ProgressCompareTable,
  HomeworkStatusTable,
  ClassDetailModal,
  MOCK_CLASSES_BY_GRADE,
  MOCK_GRADES,
  TEACHER_MAP,
  calculateGradeKPI,
  getFilteredGrades,
  LEVEL_LABELS,
  type LevelFilter,
  type MockClassData,
} from '../../components/admin/gradeOverview';
import { useGradeStats, useGradeClasses, useGradeKPI } from '../../hooks/useAdminData';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useSubjectStore, type Subject, SUBJECT_LABELS } from '../../stores/subjectStore';

/** Supabase 연결 상태 표시 */
const SupabaseStatus = () => (
  <div
    className={`text-xs px-2 py-1 rounded ${
      isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}
  >
    {isSupabaseConfigured ? '🟢 Supabase 연결됨' : '🟡 Mock 데이터'}
  </div>
);

export default function GradeOverview() {
  const [activeGrade, setActiveGrade] = useState('중3');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedClass, setSelectedClass] = useState<{
    id: string;
    name: string;
    teacher: string;
    studentCount: number;
    grade: string;
    textbook?: string;
    currentPage?: number;
    targetPage?: number;
    lastDate?: string;
    homework?: {
      range: string;
      dueDate: string;
      submitted: number;
      total: number;
      pending: string[];
    };
  } | null>(null);

  const { subject: globalSubject } = useSubjectStore();

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth < 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Supabase 데이터 조회
  const { data: gradeStats, isLoading: statsLoading } = useGradeStats();
  const { data: gradeClasses, isLoading: classesLoading } = useGradeClasses(activeGrade);
  const kpiData = useGradeKPI(activeGrade);

  // Mock Fallback + 과목/레벨 필터링
  const rawClasses: MockClassData[] =
    gradeClasses && gradeClasses.length > 0
      ? (gradeClasses as unknown as MockClassData[])
      : MOCK_CLASSES_BY_GRADE[activeGrade] || [];

  const subjectFilteredClasses =
    globalSubject === 'all'
      ? rawClasses
      : rawClasses.filter((c) => c.subject === globalSubject);

  const classes =
    levelFilter === 'all'
      ? subjectFilteredClasses
      : subjectFilteredClasses.filter((c) => c.level === levelFilter);

  // 학년별 통계 (과목 필터 적용)
  const filteredGrades = getFilteredGrades(globalSubject);
  const grades =
    globalSubject === 'all' && gradeStats && gradeStats.length > 0 ? gradeStats : filteredGrades;
  const kpi = kpiData || calculateGradeKPI(activeGrade);
  const isLoading = statsLoading || classesLoading;

  // 과목 필터 변경 시 유효한 학년으로 자동 이동
  useEffect(() => {
    const currentGradeValid = grades.some((g) => g.grade === activeGrade);
    if (!currentGradeValid && grades.length > 0) {
      setActiveGrade(grades[0].grade);
    }
  }, [globalSubject, grades, activeGrade]);

  const progressData = classes.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    studentCount: c.studentCount,
    textbook: c.progress.textbook,
    currentPage: c.progress.currentPage,
    targetPage: c.progress.targetPage,
    lastDate: c.progress.lastDate,
  }));

  const homeworkData = classes.map((c) => ({
    id: c.id,
    className: c.name,
    level: c.level,
    homework: c.homework,
  }));

  const handleClassClick = (classId: string) => {
    const classInfo = classes.find((c) => c.id === classId);
    if (classInfo) {
      const teacherName =
        'teacher' in classInfo && typeof classInfo.teacher === 'string'
          ? classInfo.teacher
          : TEACHER_MAP[classId] || '담당 선생님';

      setSelectedClass({
        id: classId,
        name: classInfo.name,
        teacher: teacherName,
        studentCount: classInfo.studentCount,
        grade: activeGrade,
        textbook: classInfo.progress.textbook,
        currentPage: classInfo.progress.currentPage,
        targetPage: classInfo.progress.targetPage,
        lastDate: classInfo.progress.lastDate,
        homework: classInfo.homework,
      });
    }
  };

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        <PageHeader
          title="학년별 현황"
          description={`${SUBJECT_LABELS[globalSubject]} 반의 진도와 숙제 현황을 비교합니다`}
          actions={
            <div className="flex items-center gap-2 md:gap-4">
              <SupabaseStatus />
              {isMobile ? (
                <GradeTabsV2Compact grades={grades} activeGrade={activeGrade} onGradeChange={setActiveGrade} />
              ) : (
                <GradeTabsV2 grades={grades} activeGrade={activeGrade} onGradeChange={setActiveGrade} />
              )}
            </div>
          }
        />

        <GradeSummaryKPI
          grade={activeGrade}
          studentCount={kpi.studentCount}
          averageProgressRate={kpi.averageProgressRate}
          homeworkSubmissionRate={kpi.homeworkSubmissionRate}
          attendanceRate={kpi.attendanceRate}
          progressTrend={kpi.progressTrend}
          homeworkTrend={kpi.homeworkTrend}
          attendanceTrend={kpi.attendanceTrend}
        />

        {/* 레벨 필터 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs sm:text-sm text-grey-600 mr-1 sm:mr-2 whitespace-nowrap">반 레벨:</span>
            {(['all', 'high', 'mid', 'low'] as LevelFilter[]).map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                  levelFilter === level
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                }`}
              >
                {LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
          <div className="text-xs sm:text-sm text-grey-500 whitespace-nowrap">
            {classes.length}개 반 {levelFilter !== 'all' && `(${LEVEL_LABELS[levelFilter]} 레벨)`}
          </div>
        </div>

        {/* 진도 비교 테이블 */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            데이터 로딩 중...
          </div>
        ) : (
          <ProgressCompareTable classes={progressData} onClassClick={handleClassClick} />
        )}

        {/* 숙제 현황 테이블 */}
        {isLoading ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
            데이터 로딩 중...
          </div>
        ) : (
          <HomeworkStatusTable classes={homeworkData} onClassClick={handleClassClick} />
        )}
      </div>

      {selectedClass && (
        <ClassDetailModal isOpen={!!selectedClass} onClose={() => setSelectedClass(null)} classInfo={selectedClass} />
      )}
    </AdminLayoutV5>
  );
}
