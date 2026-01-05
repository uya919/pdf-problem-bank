/**
 * RecordsPage - 기록 페이지 (v2 반응형)
 *
 * 반응형 패턴:
 * - 모바일 (<768px): 탭 + 바텀시트 반 선택
 * - 태블릿 (≥768px): 좌측 필터 패널 + 우측 콘텐츠
 *
 * Supabase 연결: Phase 6-B/C/D (2025-12-13)
 */
import { useState, useMemo, useEffect } from 'react';
import { useBreakpoint } from '../../hooks/useIsMobile';
import { BottomNavBar } from './components/BottomNavBar';
import { useClasses, useAttendanceByDate, useProgressForTeacherByDate } from '../../hooks/useBackofficeData';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { ClassAttendanceData } from '../../hooks/useBackofficeData';
import type { ClassWithDetails } from '../../types/database';

type TabId = 'attendance' | 'progress' | 'homework' | 'grade';

// ============ 헬퍼 함수 ============

/** 반 색상 배열 (순환 사용) */
const CLASS_COLORS = ['#3182F6', '#00C896', '#FF9800', '#9C27B0', '#607D8B', '#795548'];

/** 반 이름에서 짧은 이름 추출 (예: "중3A반" → "3A") */
function getShortName(name: string): string {
  const match = name.match(/[가-힣]*(\d+[A-Za-z]?)/);
  return match ? match[1] : name.slice(0, 2);
}

/** ClassWithDetails → ClassInfo 변환 */
function toClassInfo(cls: ClassWithDetails, index: number): ClassInfo {
  return {
    id: cls.id,
    name: cls.name,
    shortName: getShortName(cls.name),
    color: CLASS_COLORS[index % CLASS_COLORS.length],
    studentCount: cls.student_count || 0,
  };
}

// ============ 반 정보 ============

interface ClassInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  studentCount: number;
}


// ============ 출결 타입 & 데이터 ============

type AttendanceStatus = 'present' | 'late' | 'absent';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  studentColor: string;
  status: AttendanceStatus;
  note?: string;
}

interface ClassAttendance {
  classId: string;
  className: string;
  time: string;
  records: AttendanceRecord[];
}

// ============ 탭 정의 ============

const TABS: { id: TabId; label: string }[] = [
  { id: 'attendance', label: '출결' },
  { id: 'progress', label: '진도' },
  { id: 'homework', label: '숙제' },
  { id: 'grade', label: '성적' },
];

// ============ 메인 컴포넌트 ============

export default function RecordsPage() {
  const { isMobile, isTabletOrAbove } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<TabId>('attendance');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);

  // Stage 35-B: 로그인된 강사 ID 가져오기 (본인 반만 표시)
  const { profile } = useAuth();
  const teacherId = profile?.id || null;

  // =====================
  // Supabase 데이터 조회
  // =====================
  // Stage 35-B: 본인 담당 반만 조회 (teacherId 필터)
  const { data: supabaseClasses, isLoading: isLoadingClasses } = useClasses({
    status: 'active',
    teacherId: teacherId || undefined,
  });

  // =====================
  // Supabase 데이터 사용
  // =====================
  const classes: ClassInfo[] = useMemo(() => {
    if (supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses.map((cls, index) => toClassInfo(cls, index));
    }
    return [];
  }, [supabaseClasses]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // 탭 컨텐츠 렌더링
  // Stage 35-B: AttendanceTab에 teacherId 전달
  // Stage 36: 모든 탭에 teacherId 전달
  const renderTabContent = () => (
    <div className="space-y-4">
      {activeTab === 'attendance' && <AttendanceTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'progress' && <ProgressTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'homework' && <HomeworkTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'grade' && <GradeTab selectedClassId={selectedClassId} teacherId={teacherId} />}
    </div>
  );

  // =====================
  // 태블릿: 좌측 필터 + 우측 콘텐츠
  // =====================
  if (isTabletOrAbove) {
    return (
      <div className="h-screen flex flex-col bg-[#F9FAFB]">
        {/* 상단 헤더 */}
        <div className="flex-shrink-0 bg-white px-6 py-4 border-b border-[#F2F4F6]">
          <h1 className="text-xl font-bold text-[#191F28]">기록</h1>
          <p className="text-sm text-[#8B95A1] mt-1">출결, 진도, 숙제, 성적 기록을 확인하세요</p>
        </div>

        {/* 메인 레이아웃 */}
        <div className="flex-1 flex overflow-hidden pb-16">
          {/* 좌측 필터 패널 */}
          <div className="w-64 flex-shrink-0 border-r bg-gray-50 flex flex-col">
            {/* 필터 헤더 */}
            <div className="p-4 border-b bg-white">
              <h2 className="text-base font-bold text-[#191F28]">필터</h2>
            </div>

            {/* 반 선택 */}
            <div className="p-4 border-b">
              <label className="text-xs font-medium text-[#8B95A1] mb-2 block">반 선택</label>
              <button
                onClick={() => setSelectedClassId(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  selectedClassId === null ? 'bg-[#EBF4FF] text-[#3182F6]' : 'hover:bg-[#F2F4F6]'
                }`}
              >
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#3182F6] via-[#00C896] to-[#FF9800]" />
                <span className="text-sm font-medium">전체 반</span>
              </button>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${
                    selectedClassId === cls.id ? 'bg-[#EBF4FF] text-[#3182F6]' : 'hover:bg-[#F2F4F6]'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: cls.color }}
                  >
                    {cls.shortName}
                  </div>
                  <span className="text-sm font-medium">{cls.name}</span>
                  <span className="text-xs text-[#8B95A1] ml-auto">{cls.studentCount}명</span>
                </button>
              ))}
            </div>

            {/* 탭 선택 (세로 목록) */}
            <div className="p-4 flex-1">
              <label className="text-xs font-medium text-[#8B95A1] mb-2 block">기록 유형</label>
              <div className="space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#3182F6] text-white'
                        : 'bg-white text-[#6B7684] hover:bg-[#F2F4F6]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 요약 */}
            <div className="p-4 border-t bg-white text-center">
              <p className="text-2xl font-bold text-[#3182F6]">
                {selectedClass ? selectedClass.studentCount : classes.reduce((sum, c) => sum + c.studentCount, 0)}
              </p>
              <p className="text-xs text-[#8B95A1]">총 학생 수</p>
            </div>
          </div>

          {/* 우측 콘텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 현재 탭 표시 */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#191F28]">
                {TABS.find(t => t.id === activeTab)?.label} 기록
                {selectedClass && <span className="text-[#3182F6] ml-2">· {selectedClass.name}</span>}
              </h2>
            </div>
            {renderTabContent()}
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <BottomNavBar active="records" />
      </div>
    );
  }

  // =====================
  // 모바일: 기존 레이아웃
  // =====================
  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-[#F2F4F6] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="text-[20px] font-bold text-[#191F28]">기록</div>
          {/* 반 선택 칩 버튼 */}
          <button
            onClick={() => setShowClassSelector(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-colors"
          >
            {selectedClass ? (
              <>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedClass.color }}
                />
                <span className="text-[13px] font-medium text-[#191F28]">{selectedClass.name}</span>
              </>
            ) : (
              <span className="text-[13px] font-medium text-[#6B7684]">전체 반</span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B95A1" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mt-3 bg-[#F2F4F6] rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#191F28] shadow-sm'
                  : 'text-[#8B95A1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-4">
        {renderTabContent()}
      </div>

      {/* 바텀시트 반 선택 */}
      <ClassSelectorBottomSheet
        isOpen={showClassSelector}
        onClose={() => setShowClassSelector(false)}
        selectedClassId={selectedClassId}
        onSelect={(id) => {
          setSelectedClassId(id);
          setShowClassSelector(false);
        }}
        classes={classes}
      />

      <BottomNavBar active="records" />
    </div>
  );
}

// ============ 바텀시트 반 선택 ============

function ClassSelectorBottomSheet({
  isOpen,
  onClose,
  selectedClassId,
  onSelect,
  classes,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedClassId: string | null;
  onSelect: (id: string | null) => void;
  classes: ClassInfo[];
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-fade-in"
        onClick={onClose}
      />
      {/* 바텀시트 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up safe-area-bottom">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#E5E8EB] rounded-full" />
        </div>
        {/* 헤더 */}
        <div className="px-5 pb-3">
          <div className="text-[17px] font-bold text-[#191F28]">반 선택</div>
        </div>
        {/* 옵션 목록 */}
        <div className="px-4 pb-8 pb-safe">
          {/* 전체 반 */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-1 transition-colors ${
              selectedClassId === null ? 'bg-[#F2F4F6]' : 'hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] via-[#00C896] to-[#FF9800] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[15px] font-medium text-[#191F28]">전체 반</div>
                <div className="text-[12px] text-[#8B95A1]">
                  {classes.reduce((sum, c) => sum + c.studentCount, 0)}명
                </div>
              </div>
            </div>
            {selectedClassId === null && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>

          {/* 개별 반 */}
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => onSelect(cls.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-1 transition-colors ${
                selectedClassId === cls.id ? 'bg-[#F2F4F6]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold"
                  style={{ backgroundColor: cls.color }}
                >
                  {cls.shortName}
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-medium text-[#191F28]">{cls.name}</div>
                  <div className="text-[12px] text-[#8B95A1]">{cls.studentCount}명</div>
                </div>
              </div>
              {selectedClassId === cls.id && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// ============ 출결 탭 ============

// Stage 35-B: teacherId props로 받음 (MOCK_TEACHER_ID 제거)
function AttendanceTab({ selectedClassId, teacherId }: { selectedClassId: string | null; teacherId: string | null }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회 (Stage 35-B: 실제 teacherId 사용)
  const { data: supabaseAttendance } = useAttendanceByDate(teacherId, dateStr);

  // Supabase 데이터 사용
  const attendanceData: ClassAttendanceData[] = useMemo(() => {
    if (supabaseAttendance && supabaseAttendance.length > 0) {
      return supabaseAttendance;
    }
    return [];
  }, [supabaseAttendance]);

  // 필터링 적용
  const filteredData = selectedClassId
    ? attendanceData.filter(cls => cls.classId === selectedClassId)
    : attendanceData;

  const stats = useMemo(() => {
    return filteredData.reduce(
      (acc, cls) => {
        cls.records.forEach((r) => {
          if (r.status === 'present') acc.present++;
          else if (r.status === 'late') acc.late++;
          else if (r.status === 'absent') acc.absent++;
        });
        return acc;
      },
      { present: 0, late: 0, absent: 0 }
    );
  }, [filteredData]);

  const total = stats.present + stats.late + stats.absent;
  const attendanceRate = total > 0 ? Math.round((stats.present / total) * 100) : 0;

  const formatDate = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  return (
    <>
      {/* 요약 카드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">이번 주 출결 현황</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-[24px] font-bold text-[#00C896]">{stats.present}</div>
            <div className="text-[11px] text-[#8B95A1]">출석</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#FF9800]">{stats.late}</div>
            <div className="text-[11px] text-[#8B95A1]">지각</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#F04452]">{stats.absent}</div>
            <div className="text-[11px] text-[#8B95A1]">결석</div>
          </div>
          <div>
            <div className="text-[24px] font-bold text-[#3182F6]">{attendanceRate}%</div>
            <div className="text-[11px] text-[#8B95A1]">출석률</div>
          </div>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[15px] font-semibold text-[#191F28]">{formatDate(currentDate)}</div>
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 수업별 출결 (반별 그룹핑) */}
      <div className="space-y-3">
        {filteredData.map((cls) => (
          <ClassAttendanceCard key={cls.classId} classData={cls} />
        ))}
      </div>
    </>
  );
}

function ClassAttendanceCard({ classData }: { classData: ClassAttendance }) {
  const summary = classData.records.reduce(
    (acc, r) => {
      if (r.status === 'present') acc.present++;
      else if (r.status === 'late') acc.late++;
      else if (r.status === 'absent') acc.absent++;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-[#F2F4F6]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-[#191F28]">{classData.className}</div>
            <div className="text-[12px] text-[#8B95A1]">{classData.time}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold rounded">{summary.present}</span>
            <span className="px-2 py-0.5 bg-[#FFF3E0] text-[#E65100] text-[11px] font-bold rounded">{summary.late}</span>
            <span className="px-2 py-0.5 bg-[#FFEBEE] text-[#F04452] text-[11px] font-bold rounded">{summary.absent}</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#F2F4F6]">
        {classData.records.map((record) => (
          <div key={record.studentId} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full text-white text-[12px] font-bold flex items-center justify-center"
                style={{ backgroundColor: record.studentColor }}
              >
                {record.studentName.charAt(0)}
              </div>
              <span className="text-[14px] text-[#191F28]">{record.studentName}</span>
            </div>
            <span
              className={`px-2.5 py-1 text-[12px] font-medium rounded-full ${
                record.status === 'present'
                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                  : record.status === 'late'
                    ? 'bg-[#FFF3E0] text-[#E65100]'
                    : 'bg-[#FFEBEE] text-[#F04452]'
              }`}
            >
              {record.status === 'present' ? '출석' : record.status === 'late' ? `지각${record.note ? ` (${record.note})` : ''}` : `결석${record.note ? ` (${record.note})` : ''}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 진도 탭 ============

// Stage 36-A: Supabase 연결
function ProgressTab({ selectedClassId, teacherId }: { selectedClassId: string | null; teacherId: string | null }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회
  const { data: progressData, isLoading } = useProgressForTeacherByDate(teacherId, dateStr);

  // 최근 진도 기록 조회 (별도 쿼리)
  const [recentProgress, setRecentProgress] = useState<Array<{
    id: string;
    classId: string;
    className: string;
    date: string;
    pages: string;
    topic: string;
  }>>([]);

  useEffect(() => {
    async function fetchRecentProgress() {
      if (!teacherId) return;

      // 선생님 담당 반 조회
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      type ClassRow = { id: string; name: string };
      const typedClasses = (classes || []) as ClassRow[];
      if (typedClasses.length === 0) return;

      const classIds = typedClasses.map(c => c.id);
      const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

      // 최근 10개 진도 조회
      const { data: progress } = await supabase
        .from('progress')
        .select('id, class_id, date, pages, topic')
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10);

      type ProgressRow = { id: string; class_id: string; date: string; pages: string | null; topic: string | null };
      const typedProgress = (progress || []) as ProgressRow[];
      if (typedProgress.length > 0) {
        setRecentProgress(typedProgress.map(p => ({
          id: p.id,
          classId: p.class_id,
          className: classMap[p.class_id] || '',
          date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
          pages: p.pages || '',
          topic: p.topic || '',
        })));
      }
    }

    fetchRecentProgress();
  }, [teacherId]);

  // Supabase 데이터 사용
  type ClassProgressItem = {
    classId: string;
    className: string;
    recorded: boolean;
    currentUnit?: number;
    totalUnits?: number;
    recentTopic?: string;
  };

  const classProgress = useMemo((): ClassProgressItem[] => {
    if (progressData && (progressData.recorded.length > 0 || progressData.notRecorded.length > 0)) {
      const allClasses = [...progressData.recorded, ...progressData.notRecorded];
      return allClasses.map(cls => ({
        classId: cls.id,
        className: cls.name,
        recorded: progressData.recorded.some(r => r.id === cls.id),
      }));
    }
    return [];
  }, [progressData]);

  // 필터링 적용
  const filteredProgress = selectedClassId
    ? classProgress.filter(p => p.classId === selectedClassId)
    : classProgress;

  const filteredHistory = selectedClassId
    ? recentProgress.filter(h => h.classId === selectedClassId)
    : recentProgress;

  const formatDate = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  return (
    <>
      {/* 날짜 선택 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[15px] font-semibold text-[#191F28]">{formatDate(currentDate)}</div>
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 진도 기록 현황 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">오늘 진도 현황</div>
        {isLoading ? (
          <div className="text-center py-4 text-[#8B95A1]">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {filteredProgress.map((p) => (
              <div key={p.classId} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-xl">
                <span className="text-[14px] text-[#191F28]">{p.className}</span>
                {p.currentUnit !== undefined && p.totalUnits !== undefined ? (
                  <span className="text-[12px] text-[#8B95A1]">
                    {p.currentUnit}/{p.totalUnits}단원
                  </span>
                ) : (
                  <span className={`px-2.5 py-1 text-[12px] font-medium rounded-full ${
                    p.recorded
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF3E0] text-[#E65100]'
                  }`}>
                    {p.recorded ? '기록됨' : '미기록'}
                  </span>
                )}
              </div>
            ))}
            {filteredProgress.length === 0 && (
              <div className="text-center py-4 text-[#8B95A1] text-[13px]">
                오늘 수업이 없습니다
              </div>
            )}
          </div>
        )}
      </div>

      {/* 최근 진도 기록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F2F4F6]">
          <div className="text-[13px] font-semibold text-[#191F28]">최근 진도 기록</div>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {filteredHistory.map((record) => (
            <div key={record.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-medium text-[#191F28]">{record.className}</span>
                  <span className="text-[12px] text-[#8B95A1] ml-2">{record.date}</span>
                </div>
                <span className="text-[12px] text-[#3182F6] font-medium">{record.pages}</span>
              </div>
              {record.topic && (
                <div className="text-[13px] text-[#6B7684] mt-1">{record.topic}</div>
              )}
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="px-4 py-6 text-center text-[#8B95A1] text-[13px]">
              진도 기록이 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============ 숙제 탭 ============

// Stage 36-B: Supabase 연결
function HomeworkTab({ selectedClassId, teacherId }: { selectedClassId: string | null; teacherId: string | null }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회
  const [homeworkData, setHomeworkData] = useState<Array<{
    id: string;
    classId: string;
    className: string;
    date: string;
    title: string;
    submitted: number;
    total: number;
    notSubmittedStudents: Array<{ id: string; name: string }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchHomework() {
      if (!teacherId) return;
      setIsLoading(true);

      try {
        // 선생님 담당 반 조회
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
          .eq('is_active', true);

        type ClassRow = { id: string; name: string };
        const typedClasses = (classes || []) as ClassRow[];
        if (typedClasses.length === 0) {
          setHomeworkData([]);
          return;
        }

        const classIds = typedClasses.map(c => c.id);
        const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

        // 최근 7일간 숙제 조회
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: homework } = await supabase
          .from('homework')
          .select(`
            id,
            class_id,
            title,
            description,
            due_date,
            submissions:homework_submissions(
              id,
              student_id,
              status,
              student:students(id, name)
            )
          `)
          .in('class_id', classIds)
          .gte('due_date', weekAgo.toISOString().split('T')[0])
          .order('due_date', { ascending: false });

        type HomeworkRow = {
          id: string;
          class_id: string;
          title: string | null;
          description: string | null;
          due_date: string;
          submissions: Array<{
            id: string;
            student_id: string;
            status: string;
            student: { id: string; name: string } | null;
          }> | null;
        };
        const typedHomework = (homework || []) as HomeworkRow[];

        if (typedHomework.length > 0) {
          const processed = typedHomework.map(hw => {
            const submissions = hw.submissions || [];
            const submitted = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
            const notSubmittedStudents = submissions
              .filter(s => s.status === 'pending')
              .map(s => ({
                id: s.student?.id || s.student_id,
                name: s.student?.name || '알 수 없음',
              }));

            return {
              id: hw.id,
              classId: hw.class_id,
              className: classMap[hw.class_id] || '',
              date: new Date(hw.due_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
              title: hw.title || hw.description || '',
              submitted,
              total: submissions.length,
              notSubmittedStudents,
            };
          });
          setHomeworkData(processed);
        }
      } catch (error) {
        console.error('숙제 데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHomework();
  }, [teacherId]);

  // 필터링 적용
  const filteredHomework = selectedClassId
    ? homeworkData.filter(h => h.classId === selectedClassId)
    : homeworkData;

  // 반별로 숙제 데이터 그룹화
  const groupedByClass = useMemo(() => {
    const grouped: Record<string, {
      className: string;
      homework: typeof filteredHomework;
      notSubmittedStudents: Array<{ id: string; name: string }>;
    }> = {};

    filteredHomework.forEach(h => {
      if (!grouped[h.classId]) {
        grouped[h.classId] = { className: h.className, homework: [], notSubmittedStudents: [] };
      }
      grouped[h.classId].homework.push(h);
      // 중복 제거하며 미제출 학생 추가
      h.notSubmittedStudents.forEach(s => {
        if (!grouped[h.classId].notSubmittedStudents.some(ns => ns.id === s.id)) {
          grouped[h.classId].notSubmittedStudents.push(s);
        }
      });
    });

    return Object.entries(grouped).map(([classId, data]) => ({ classId, ...data }));
  }, [filteredHomework]);

  // 전체 통계
  const stats = useMemo(() => {
    return filteredHomework.reduce(
      (acc, h) => {
        acc.submitted += h.submitted;
        acc.total += h.total;
        return acc;
      },
      { submitted: 0, total: 0 }
    );
  }, [filteredHomework]);

  const submissionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <>
      {/* 전체 요약 카드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">이번 주 숙제 현황</div>
        {isLoading ? (
          <div className="text-center py-4 text-[#8B95A1]">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[24px] font-bold text-[#00C896]">{stats.submitted}</div>
              <div className="text-[11px] text-[#8B95A1]">제출</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#F04452]">{stats.total - stats.submitted}</div>
              <div className="text-[11px] text-[#8B95A1]">미제출</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#3182F6]">{submissionRate}%</div>
              <div className="text-[11px] text-[#8B95A1]">제출률</div>
            </div>
          </div>
        )}
      </div>

      {/* 반별 숙제 현황 카드 (그룹핑) */}
      <div className="space-y-3">
        {groupedByClass.map(({ classId, className, homework, notSubmittedStudents }) => {
          const classSubmitted = homework.reduce((sum, h) => sum + h.submitted, 0);
          const classTotal = homework.reduce((sum, h) => sum + h.total, 0);
          const isAllSubmitted = classSubmitted === classTotal && classTotal > 0;

          return (
            <div key={classId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 반 헤더 */}
              <div className="p-4 border-b border-[#F2F4F6]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#191F28]">{className}</span>
                    {classTotal === 0 ? (
                      <span className="px-2 py-0.5 bg-[#F2F4F6] text-[#8B95A1] text-[11px] font-bold rounded-full">
                        숙제 없음
                      </span>
                    ) : isAllSubmitted ? (
                      <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold rounded-full">
                        완료
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#FFF3E0] text-[#E65100] text-[11px] font-bold rounded-full">
                        {classTotal - classSubmitted}명 미제출
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-bold text-[#3182F6]">{classSubmitted}</span>
                    <span className="text-[12px] text-[#8B95A1]">/{classTotal}</span>
                  </div>
                </div>
              </div>

              {/* 미제출 학생 */}
              {notSubmittedStudents.length > 0 && (
                <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FEF3C7]">
                  <div className="flex flex-wrap gap-2">
                    {notSubmittedStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg">
                        <span className="text-[12px] text-[#191F28]">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 최근 숙제 */}
              <div className="divide-y divide-[#F2F4F6]">
                {homework.map(h => (
                  <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] text-[#6B7684]">{h.date}</span>
                      <span className="text-[13px] text-[#191F28] ml-2">{h.title}</span>
                    </div>
                    <div className="text-[12px] text-[#8B95A1]">
                      {h.submitted}/{h.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {groupedByClass.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[15px] font-medium text-[#191F28] mb-1">숙제 현황</div>
            <div className="text-[13px] text-[#8B95A1]">이번 주 숙제가 없습니다</div>
          </div>
        )}
      </div>
    </>
  );
}

// ============ 성적 탭 ============

// Stage 36-C: Supabase 연결
interface ExamTestData {
  id: string;
  classId: string;
  className: string;
  date: string;
  testName: string;
  scores: Array<{
    studentId: string;
    studentName: string;
    score: number;
    previousScore?: number;
  }>;
}

function GradeTab({ selectedClassId, teacherId }: { selectedClassId: string | null; teacherId: string | null }) {
  const [examData, setExamData] = useState<ExamTestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExamScores() {
      if (!teacherId) return;
      setIsLoading(true);

      try {
        // 선생님 담당 반 조회
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
          .eq('is_active', true);

        type ClassRow = { id: string; name: string };
        const typedClasses = (classes || []) as ClassRow[];
        if (typedClasses.length === 0) {
          setExamData([]);
          return;
        }

        const classIds = typedClasses.map(c => c.id);
        const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

        // 최근 성적 조회
        const { data: scores } = await supabase
          .from('exam_scores')
          .select(`
            id,
            class_id,
            student_id,
            exam_type,
            exam_date,
            exam_name,
            correct_answers,
            total_questions,
            manual_score,
            student:students(id, name)
          `)
          .in('class_id', classIds)
          .order('exam_date', { ascending: false })
          .limit(100);

        type ScoreRow = {
          id: string;
          class_id: string;
          student_id: string;
          exam_type: string | null;
          exam_date: string;
          exam_name: string | null;
          correct_answers: number | null;
          total_questions: number | null;
          manual_score: number | null;
          student: { id: string; name: string } | null;
        };
        const typedScores = (scores || []) as ScoreRow[];

        if (typedScores.length > 0) {
          // 시험별로 그룹핑 (class_id + exam_date + exam_name 기준)
          const examGroups: Record<string, ExamTestData> = {};

          typedScores.forEach(score => {
            const examKey = `${score.class_id}_${score.exam_date}_${score.exam_name || score.exam_type}`;
            const student = score.student;

            // 점수 계산 (manual_score 우선, 없으면 정답률 계산)
            let calculatedScore = 0;
            if (score.manual_score !== null && score.manual_score !== undefined) {
              calculatedScore = score.manual_score;
            } else if (score.correct_answers !== null && score.total_questions !== null && score.total_questions > 0) {
              calculatedScore = Math.round((score.correct_answers / score.total_questions) * 100);
            }

            if (!examGroups[examKey]) {
              examGroups[examKey] = {
                id: examKey,
                classId: score.class_id,
                className: classMap[score.class_id] || '',
                date: new Date(score.exam_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                testName: score.exam_name || score.exam_type || '시험',
                scores: [],
              };
            }

            examGroups[examKey].scores.push({
              studentId: score.student_id,
              studentName: student?.name || '알 수 없음',
              score: calculatedScore,
            });
          });

          setExamData(Object.values(examGroups));
          // 첫 번째 시험 펼침
          const firstExam = Object.values(examGroups)[0];
          if (firstExam) {
            setExpandedTestId(firstExam.id);
          }
        } else {
          setExamData([]);
        }
      } catch (error) {
        console.error('성적 데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExamScores();
  }, [teacherId]);

  // 필터링 적용
  const filteredTests = selectedClassId
    ? examData.filter(t => t.classId === selectedClassId)
    : examData;

  // 전체 성적 하락 학생 (필터된 반 기준)
  const allDecliningStudents = useMemo(() => {
    const declining: Array<{ studentId: string; studentName: string; className: string; score: number; previousScore: number }> = [];
    filteredTests.forEach(test => {
      test.scores.forEach(s => {
        if (s.previousScore && s.score < s.previousScore && s.previousScore - s.score >= 5) {
          declining.push({
            studentId: s.studentId,
            studentName: s.studentName,
            className: test.className,
            score: s.score,
            previousScore: s.previousScore,
          });
        }
      });
    });
    return declining.sort((a, b) => (b.previousScore - b.score) - (a.previousScore - a.score));
  }, [filteredTests]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="text-[#8B95A1]">로딩 중...</div>
      </div>
    );
  }

  if (filteredTests.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-[15px] font-medium text-[#191F28] mb-1">성적 기록</div>
        <div className="text-[13px] text-[#8B95A1]">시험 기록이 없습니다</div>
      </div>
    );
  }

  return (
    <>
      {/* 성적 하락 학생 경고 (전체) */}
      {allDecliningStudents.length > 0 && (
        <div className="bg-[#FFEBEE] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className="text-[13px] font-semibold text-[#991B1B]">성적 하락 주의</span>
          </div>
          <div className="space-y-2">
            {allDecliningStudents.map((student) => (
              <div key={student.studentId} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-[14px] font-medium text-[#191F28]">{student.studentName}</span>
                  <span className="text-[12px] text-[#8B95A1] ml-2">({student.className})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#191F28]">{student.score}점</span>
                  <span className="text-[12px] text-[#DC2626] font-medium">
                    ({student.previousScore - student.score}점 ↓)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 반별 성적 카드 (그룹핑) */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const avg = test.scores.length > 0
            ? Math.round(test.scores.reduce((sum, s) => sum + s.score, 0) / test.scores.length)
            : 0;
          const max = test.scores.length > 0 ? Math.max(...test.scores.map((s) => s.score)) : 0;
          const min = test.scores.length > 0 ? Math.min(...test.scores.map((s) => s.score)) : 0;
          const isExpanded = expandedTestId === test.id;

          // 성적 분포 계산
          const distribution = [0, 0, 0, 0, 0];
          test.scores.forEach((s) => {
            if (s.score < 60) distribution[0]++;
            else if (s.score < 70) distribution[1]++;
            else if (s.score < 80) distribution[2]++;
            else if (s.score < 90) distribution[3]++;
            else distribution[4]++;
          });

          return (
            <div key={test.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 반 헤더 (클릭하면 펼침/접힘) */}
              <button
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="w-full p-4 border-b border-[#F2F4F6] text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#191F28]">{test.className}</span>
                      <span className="text-[12px] text-[#8B95A1]">{test.testName} · {test.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[18px] font-bold text-[#3182F6]">{avg}</span>
                      <span className="text-[12px] text-[#8B95A1]">점</span>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8B95A1"
                      strokeWidth="2"
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
                {/* 요약 정보 (항상 표시) */}
                <div className="flex gap-4 mt-2 text-[12px]">
                  <span className="text-[#8B95A1]">최고 <span className="text-[#00C896] font-bold">{max}</span></span>
                  <span className="text-[#8B95A1]">최저 <span className="text-[#F04452] font-bold">{min}</span></span>
                  <span className="text-[#8B95A1]">인원 <span className="text-[#191F28] font-bold">{test.scores.length}</span></span>
                </div>
              </button>

              {/* 펼침 컨텐츠 */}
              {isExpanded && (
                <>
                  {/* 성적 분포 바 */}
                  <div className="px-4 py-3 border-b border-[#F2F4F6] bg-[#F9FAFB]">
                    <div className="text-[11px] text-[#8B95A1] mb-2">성적 분포</div>
                    <div className="flex gap-1 h-12 items-end">
                      {['0-59', '60-69', '70-79', '80-89', '90-100'].map((label, idx) => {
                        const count = distribution[idx];
                        const maxCount = Math.max(...distribution, 1);
                        const height = (count / maxCount) * 100;
                        const colors = ['#F04452', '#FF9800', '#FFC107', '#00C896', '#3182F6'];
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full rounded-t transition-all"
                              style={{ height: `${height}%`, minHeight: count > 0 ? '6px' : '0', backgroundColor: colors[idx] }}
                            />
                            <div className="text-[9px] text-[#8B95A1] mt-1">{label}</div>
                            <div className="text-[10px] font-bold text-[#191F28]">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 개인별 성적 */}
                  <div className="divide-y divide-[#F2F4F6]">
                    {[...test.scores]
                      .sort((a, b) => b.score - a.score)
                      .map((student, idx) => {
                        const diff = student.previousScore ? student.score - student.previousScore : null;
                        return (
                          <div key={student.studentId} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${idx < 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#6B7684]'}`}>
                                {idx + 1}
                              </div>
                              <span className="text-[14px] text-[#191F28]">{student.studentName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-bold text-[#191F28]">{student.score}점</span>
                              {diff !== null && (
                                <span className={`text-[11px] font-medium ${diff > 0 ? 'text-[#00C896]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
