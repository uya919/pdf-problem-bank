/**
 * RecordsPage - 기록 페이지 (v2 반응형)
 *
 * 반응형 패턴:
 * - 모바일 (<768px): 탭 + 바텀시트 반 선택
 * - 태블릿 (≥768px): 좌측 필터 패널 + 우측 콘텐츠
 *
 * 리팩토링: Stage 54-B (2025-01-07)
 * - 탭 컴포넌트 분리: AttendanceTab, ProgressTab, HomeworkTab, GradeTab
 * - 유틸/타입 분리: types.ts, utils.ts
 * - 바텀시트 분리: ClassSelectorBottomSheet
 */
import { useState, useMemo } from 'react';
import { useBreakpoint } from '../../hooks/useIsMobile';
import { BottomNavBar } from './components/BottomNavBar';
import { useClasses } from '../../hooks/useBackofficeData';
import { useAuth } from '../../contexts/AuthContext';

// 분리된 컴포넌트 import
import {
  AttendanceTab,
  ProgressTab,
  HomeworkTab,
  GradeTab,
  ReportTab,
  ClassSelectorBottomSheet,
  TABS,
  toClassInfo,
  type TabId,
  type ClassInfo,
} from '../../components/backoffice/records';

export default function RecordsPage() {
  const { isTabletOrAbove } = useBreakpoint();
  const [activeTab, setActiveTab] = useState<TabId>('attendance');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showClassSelector, setShowClassSelector] = useState(false);

  // Stage 35-B: 로그인된 강사 ID 가져오기 (본인 반만 표시)
  const { profile } = useAuth();
  const teacherId = profile?.id || null;

  // Supabase 데이터 조회 (본인 담당 반만)
  const { data: supabaseClasses } = useClasses({
    status: 'active',
    teacherId: teacherId || undefined,
  });

  // ClassWithDetails → ClassInfo 변환
  const classes: ClassInfo[] = useMemo(() => {
    if (supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses.map((cls, index) => toClassInfo(cls, index));
    }
    return [];
  }, [supabaseClasses]);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => (
    <div className="space-y-4">
      {activeTab === 'attendance' && <AttendanceTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'progress' && <ProgressTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'homework' && <HomeworkTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'grade' && <GradeTab selectedClassId={selectedClassId} teacherId={teacherId} />}
      {activeTab === 'report' && <ReportTab selectedClassId={selectedClassId} teacherId={teacherId} />}
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
      <div className="p-4 space-y-4">
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
