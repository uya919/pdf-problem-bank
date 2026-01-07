/**
 * OperationsPage - 운영 페이지 (Mock 데이터 지원)
 *
 * 기능:
 * - 왼쪽 사이드바: 운영 메뉴
 * - HyeyumJam (FigJam 스타일 캔버스 기반 계획 도구)
 * - 시간표 관리, 강사 관리, 재무, 리포트, 설정
 *
 * Mock 모드: Supabase 미연결 시 Mock 데이터 사용
 */
import React, { useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminTopNav } from '../../components/admin/layout';
import { isSupabaseConfigured } from '../../lib/supabase';
import { syncApi, SyncStatusResponse, SyncStats } from '../../api/sync';
import { usePromotionPreviewV2, useExecutePromotionV2, useGradeStats, usePromotionHistory, useRollbackPromotion, useBatchAssignEnrollments } from '../../hooks/useGradePromotion';
import { useClasses } from '../../hooks/useClasses';
import {
  BookOpen,
  Calendar,
  Users,
  RefreshCw,
  Wallet,
  BarChart3,
  FileText,
  TrendingUp,
  Settings,
  Bell,
  Circle,
  Scroll,
  GraduationCap,
  AlertTriangle,
  ChevronUp,
  Check,
  X,
  History,
  RotateCcw,
} from 'lucide-react';

// 연결 상태 표시 컴포넌트
const DataSourceBadge = () => (
  <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
    isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  }`}>
    <Circle className={`w-2 h-2 ${isSupabaseConfigured ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'}`} />
    {isSupabaseConfigured ? 'Supabase' : 'Mock 데이터'}
  </span>
);

// 메뉴 아이템 타입
interface MenuItem {
  id: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  badgeType?: 'warning' | 'info';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

// 운영 메뉴 구조
const MENU_SECTIONS: MenuSection[] = [
  {
    title: '운영 도구',
    items: [
      { id: 'classes', icon: <BookOpen className="w-5 h-5" />, label: '반 관리' },
      { id: 'schedule', icon: <Calendar className="w-5 h-5" />, label: '시간표 관리' },
      { id: 'rotation', icon: <RefreshCw className="w-5 h-5" />, label: '순환수업' },
      { id: 'users', icon: <Users className="w-5 h-5" />, label: '사용자 관리' },
      { id: 'textbooks', icon: <Scroll className="w-5 h-5" />, label: '교재 관리' },
      { id: 'students', icon: <Users className="w-5 h-5" />, label: '학생 관리' },
    ],
  },
  {
    title: '데이터 관리',
    items: [
      { id: 'sync', icon: <RefreshCw className="w-5 h-5" />, label: '메이크에듀 동기화' },
    ],
  },
  {
    title: '재무',
    items: [
      { id: 'payment', icon: <Wallet className="w-5 h-5" />, label: '수납 관리', badge: '12', badgeType: 'warning' },
      { id: 'revenue', icon: <BarChart3 className="w-5 h-5" />, label: '매출 리포트' },
    ],
  },
  {
    title: '리포트',
    items: [
      { id: 'parent-report', icon: <FileText className="w-5 h-5" />, label: '학부모 리포트', badge: 'NEW', badgeType: 'info' },
      { id: 'analytics', icon: <TrendingUp className="w-5 h-5" />, label: '성과 분석' },
    ],
  },
  {
    title: '설정',
    items: [
      { id: 'academy-settings', icon: <Settings className="w-5 h-5" />, label: '학원 설정' },
      { id: 'notification', icon: <Bell className="w-5 h-5" />, label: '알림 설정' },
    ],
  },
];

export default function OperationsPage() {
  const [activeMenu, setActiveMenu] = useState('schedule');
  const navigate = useNavigate();

  // 메뉴 클릭 핸들러
  const handleMenuClick = (menuId: string) => {
    // 별도 페이지로 이동하는 메뉴들
    if (menuId === 'classes') {
      navigate('/admin/classes');
      return;
    }
    if (menuId === 'rotation') {
      navigate('/admin/rotation');
      return;
    }
    if (menuId === 'textbooks') {
      navigate('/admin/textbooks');
      return;
    }
    if (menuId === 'students') {
      navigate('/admin/students');
      return;
    }
    if (menuId === 'users') {
      navigate('/admin/users');
      return;
    }
    setActiveMenu(menuId);
  };

  return (
    <div className="min-h-screen bg-grey-50">
      {/* 상단 네비게이션 */}
      <AdminTopNav />

      {/* 메인 레이아웃 */}
      <div className="flex mt-16 min-h-[calc(100vh-64px)]">
        {/* 좌측 사이드바 */}
        <aside className="w-60 bg-white border-r border-grey-200 flex-shrink-0 p-3">
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="text-[11px] font-semibold text-grey-500 uppercase tracking-wide px-3 mb-2">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                      ${activeMenu === item.id
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-grey-600 hover:bg-grey-50 hover:text-grey-900'
                      }
                    `}
                  >
                    <span className={`w-5 text-center ${activeMenu === item.id ? 'text-blue-600' : 'text-grey-400'}`}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`
                          px-2 py-0.5 text-[10px] font-semibold rounded-full
                          ${item.badgeType === 'info' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}
                        `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 p-6 overflow-auto">
          {activeMenu === 'schedule' && <PlaceholderView title="시간표 관리" icon="📅" description="반별 시간표를 설정하고 관리합니다" />}
          {activeMenu === 'sync' && <MakeeduSyncView />}
          {activeMenu === 'payment' && <PlaceholderView title="수납 관리" icon="💰" description="수강료 수납 현황을 확인하고 관리합니다" badge="미수납 12건" />}
          {activeMenu === 'revenue' && <PlaceholderView title="매출 리포트" icon="📊" description="월별/분기별 매출 현황을 확인합니다" />}
          {activeMenu === 'parent-report' && <PlaceholderView title="학부모 리포트" icon="📄" description="학부모에게 발송할 리포트를 생성합니다" badge="NEW" badgeType="info" />}
          {activeMenu === 'analytics' && <PlaceholderView title="성과 분석" icon="📈" description="학생 성적 향상도와 출석률을 분석합니다" />}
          {activeMenu === 'academy-settings' && <AcademySettingsView />}
          {activeMenu === 'notification' && <PlaceholderView title="알림 설정" icon="🔔" description="알림 수신 설정을 관리합니다" />}
        </main>
      </div>
    </div>
  );
}

// ============================================
// Sub Views
// ============================================

function PlaceholderView({
  title,
  icon,
  description,
  badge,
  badgeType = 'warning',
}: {
  title: string;
  icon: string;
  description: string;
  badge?: string;
  badgeType?: 'warning' | 'info';
}) {
  return (
    <div className="flex flex-col items-center justify-center h-[500px]">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-grey-900 mb-2">{title}</h2>
      <p className="text-grey-500 text-center max-w-md">{description}</p>
      {badge && (
        <span
          className={`
            mt-4 px-3 py-1 text-sm font-medium rounded-full
            ${badgeType === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}
          `}
        >
          {badge}
        </span>
      )}
      <p className="mt-6 text-sm text-grey-400">이 기능은 개발 중입니다</p>
    </div>
  );
}

// ============================================
// Academy Settings View (학원 설정)
// Stage 9 확장: 학년 승급 기능 포함
// ============================================

// ============================================
// Academy Settings View (Mock Data)
// ============================================

interface AcademySetting {
  id: string;
  category: string;
  label: string;
  value: string;
  editable: boolean;
}

const MOCK_SETTINGS: AcademySetting[] = [
  { id: 's1', category: '기본 정보', label: '학원명', value: '혜윰학원', editable: true },
  { id: 's2', category: '기본 정보', label: '대표자', value: '홍길동', editable: true },
  { id: 's3', category: '기본 정보', label: '주소', value: '서울시 강남구 테헤란로 123', editable: true },
  { id: 's4', category: '기본 정보', label: '연락처', value: '02-1234-5678', editable: true },
  { id: 's5', category: '운영 시간', label: '평일 운영', value: '10:00 ~ 22:00', editable: true },
  { id: 's6', category: '운영 시간', label: '토요일 운영', value: '10:00 ~ 18:00', editable: true },
  { id: 's7', category: '운영 시간', label: '일요일 운영', value: '휴무', editable: true },
  { id: 's8', category: '수업 설정', label: '수업 단위', value: '50분', editable: true },
  { id: 's9', category: '수업 설정', label: '쉬는 시간', value: '10분', editable: true },
  { id: 's10', category: '수업 설정', label: '최대 정원', value: '15명', editable: true },
  { id: 's11', category: '알림 설정', label: '출결 알림', value: '활성화', editable: true },
  { id: 's12', category: '알림 설정', label: '숙제 알림', value: '활성화', editable: true },
];

function AcademySettingsView() {
  const navigate = useNavigate();
  const categories = [...new Set(MOCK_SETTINGS.map((s) => s.category))];

  // 학년 승급 관련 상태 및 훅
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionStep, setPromotionStep] = useState<'preview' | 'confirm' | 'result' | 'assign'>('preview');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rollbackBatchId, setRollbackBatchId] = useState<string | null>(null);

  // assign step 관련 상태
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [assignGradeFilter, setAssignGradeFilter] = useState<string | null>(null);
  const [targetClassId, setTargetClassId] = useState<string | null>(null);

  const { data: gradeStats, isLoading: statsLoading } = useGradeStats();
  const { data: preview, refetch: fetchPreview, isFetching: previewLoading } = usePromotionPreviewV2();
  const { data: historyData, refetch: fetchHistory, isFetching: historyLoading } = usePromotionHistory();
  const executePromotion = useExecutePromotionV2();
  const rollbackPromotion = useRollbackPromotion();
  const batchAssign = useBatchAssignEnrollments();

  // 미배정 학생 추출 (preview 데이터에서)
  const unassignedStudents = React.useMemo(() => {
    if (!preview?.students) return [];

    return preview.students
      .flatMap(student =>
        student.class_promotions
          .filter(cp => cp.status === 'unassigned')
          .map(cp => ({
            studentId: student.id,
            studentName: student.name,
            enrollmentId: cp.enrollment_id,
            previousClassName: cp.current_class_name,
            newGrade: student.next_grade || '',
            reason: cp.reason || ''
          }))
      );
  }, [preview]);

  // 학년별 그룹화
  const unassignedByGrade = React.useMemo(() => {
    return unassignedStudents.reduce((acc, student) => {
      const grade = student.newGrade;
      if (!grade) return acc;
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    }, {} as Record<string, typeof unassignedStudents>);
  }, [unassignedStudents]);

  // 필터된 학생 목록
  const filteredUnassignedStudents = React.useMemo(() => {
    if (!assignGradeFilter) return unassignedStudents;
    return unassignedStudents.filter(s => s.newGrade === assignGradeFilter);
  }, [unassignedStudents, assignGradeFilter]);

  // 선택된 학년의 반 목록 조회
  const selectedGradeForClasses = assignGradeFilter || (Object.keys(unassignedByGrade)[0] ?? null);
  const { data: classesForGrade } = useClasses({
    is_active: true
  });

  // 모달 열기
  const handleOpenPromotionModal = async () => {
    setPromotionStep('preview');
    setShowPromotionModal(true);
    await fetchPreview();
  };

  // 승급 실행
  const handleExecutePromotion = async () => {
    try {
      await executePromotion.mutateAsync();
      setPromotionStep('result');
    } catch (error) {
      console.error('학년 승급 실패:', error);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowPromotionModal(false);
    setPromotionStep('preview');
    executePromotion.reset();
    // assign step 상태 초기화
    setSelectedEnrollmentIds(new Set());
    setAssignGradeFilter(null);
    setTargetClassId(null);
  };

  // 일괄 배정 실행
  const handleQuickAssign = async () => {
    if (!targetClassId || selectedEnrollmentIds.size === 0) return;

    try {
      await batchAssign.mutateAsync({
        enrollment_ids: Array.from(selectedEnrollmentIds),
        new_class_id: targetClassId
      });

      // 배정 완료 후 선택 초기화
      setSelectedEnrollmentIds(new Set());
      setTargetClassId(null);

      // preview 다시 불러오기 (미배정 목록 갱신)
      await fetchPreview();
    } catch (error) {
      console.error('배정 실패:', error);
    }
  };

  // 선택된 학년에 해당하는 반만 필터링
  const filteredClassesForGrade = useMemo(() => {
    if (!classesForGrade || !selectedGradeForClasses) return [];
    // 반 이름에서 학년 추출해서 매칭
    return classesForGrade.filter(cls => cls.name.startsWith(selectedGradeForClasses));
  }, [classesForGrade, selectedGradeForClasses]);

  // 이력 모달 열기
  const handleOpenHistoryModal = async () => {
    setShowHistoryModal(true);
    setRollbackBatchId(null);
    await fetchHistory();
  };

  // 롤백 실행
  const handleRollback = async (batchId: string) => {
    try {
      await rollbackPromotion.mutateAsync(batchId);
      setRollbackBatchId(null);
      await fetchHistory();
    } catch (error) {
      console.error('롤백 실패:', error);
    }
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-grey-900">⚙️ 학원 설정</h1>
          <DataSourceBadge />
        </div>
        <button className="px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2">
          <span>💾</span> 저장하기
        </button>
      </div>

      {/* 학년 승급 섹션 */}
      <div className="bg-white rounded-xl border border-grey-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-grey-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-grey-900">학년 관리</h2>
          </div>
        </div>
        <div className="p-5">
          {/* 현재 학년별 현황 */}
          <div className="mb-5">
            <div className="text-sm font-medium text-grey-700 mb-3">현재 학년별 학생 수</div>
            {statsLoading ? (
              <div className="text-sm text-grey-400">로딩 중...</div>
            ) : gradeStats ? (
              <div className="flex flex-wrap gap-2">
                {gradeStats.by_grade.map((item) => (
                  <span
                    key={item.grade}
                    className="px-3 py-1.5 bg-grey-100 text-grey-700 text-sm rounded-lg"
                  >
                    {item.grade}: <strong>{item.count}명</strong>
                  </span>
                ))}
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg font-medium">
                  총 {gradeStats.total_active}명
                </span>
              </div>
            ) : (
              <div className="text-sm text-grey-400">데이터 없음</div>
            )}
          </div>

          {/* 학년 승급 버튼 */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div>
              <div className="text-sm font-medium text-grey-900 flex items-center gap-2">
                <ChevronUp className="w-4 h-4 text-amber-600" />
                학년 일괄 승급
              </div>
              <div className="text-xs text-grey-500 mt-1">
                모든 활성 학생의 학년을 한 단계 올립니다. 고3 학생은 졸업 처리됩니다.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenHistoryModal}
                className="px-4 py-2 text-sm font-medium text-grey-600 bg-white border border-grey-300 hover:bg-grey-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                이력/롤백
              </button>
              <button
                onClick={handleOpenPromotionModal}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                승급 시작
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 섹션 */}
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category} className="bg-white rounded-xl border border-grey-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-grey-100 bg-grey-50">
              <h2 className="text-sm font-semibold text-grey-900">{category}</h2>
            </div>
            <div className="divide-y divide-grey-100">
              {MOCK_SETTINGS.filter((s) => s.category === category).map((setting) => (
                <div key={setting.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-grey-900">{setting.label}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-grey-600">{setting.value}</span>
                    {setting.editable && (
                      <button className="p-1.5 text-grey-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 위험 영역 */}
      <div className="mt-8 bg-red-50 rounded-xl border border-red-200 p-5">
        <h2 className="text-sm font-semibold text-red-700 mb-3">⚠️ 위험 영역</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-grey-900">모든 데이터 초기화</div>
            <div className="text-xs text-grey-500">모든 학생, 수업, 출결 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-lg transition-colors">
            초기화
          </button>
        </div>
      </div>

      {/* 학년 승급 모달 */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-grey-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                  <h2 className="text-lg font-bold text-grey-900">학년 일괄 승급</h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {promotionStep === 'preview' && (
                <>
                  {previewLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                      <div className="text-grey-500">미리보기 로딩 중...</div>
                    </div>
                  ) : preview ? (
                    <div className="space-y-4">
                      {/* 학년 승급 요약 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{preview.to_promote}</div>
                          <div className="text-sm text-grey-600">승급 예정</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">{preview.to_graduate}</div>
                          <div className="text-sm text-grey-600">졸업 예정 (고3)</div>
                        </div>
                        <div className="bg-grey-100 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-grey-500">{preview.inactive_count}</div>
                          <div className="text-sm text-grey-600">이미 비활성</div>
                        </div>
                      </div>

                      {/* 반 승급 요약 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                          <div className="text-2xl font-bold text-green-600">{preview.class_auto_count}</div>
                          <div className="text-sm text-grey-600">반 자동 이동</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                          <div className="text-2xl font-bold text-amber-600">{preview.class_unassigned_count}</div>
                          <div className="text-sm text-grey-600">수동 배정 필요</div>
                        </div>
                      </div>

                      {/* 학생 목록 (스크롤) */}
                      <div className="border border-grey-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-grey-50 border-b border-grey-200">
                          <div className="text-sm font-medium text-grey-700">변경 예정 학생 목록</div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-grey-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">이름</th>
                                <th className="px-3 py-2 text-center text-grey-600 font-medium">학년</th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">현재 반</th>
                                <th className="px-3 py-2 text-center text-grey-600 font-medium">→</th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">새 반</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-grey-100">
                              {preview.students.map((student) => (
                                <tr key={student.id} className="hover:bg-grey-50">
                                  <td className="px-3 py-2.5 font-medium text-grey-900">
                                    {student.name}
                                    <div className="text-xs text-grey-500">
                                      {student.current_grade} → {student.next_grade || '졸업'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {student.next_grade ? (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                                        {student.next_grade}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                        졸업
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5" colSpan={3}>
                                    {student.class_promotions.length > 0 ? (
                                      <div className="space-y-1">
                                        {student.class_promotions.map((cp) => (
                                          <div key={cp.enrollment_id} className="flex items-center gap-2 text-xs">
                                            <span className="px-2 py-0.5 bg-grey-100 text-grey-700 rounded truncate max-w-[120px]" title={cp.current_class_name}>
                                              {cp.current_class_name}
                                            </span>
                                            <span className="text-grey-400">→</span>
                                            {cp.status === 'auto' ? (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded truncate max-w-[120px] flex items-center gap-1" title={cp.new_class_name || ''}>
                                                ✓ {cp.new_class_name}
                                              </span>
                                            ) : cp.status === 'graduated' ? (
                                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                                🎓 졸업
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1" title={cp.reason}>
                                                ⚠️ 수동 배정
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-grey-400">등록된 반 없음</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-grey-500">
                      미리보기를 불러올 수 없습니다.
                    </div>
                  )}
                </>
              )}

              {promotionStep === 'confirm' && (
                <div className="text-center py-8">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-grey-900 mb-2">정말 실행하시겠습니까?</h3>
                  <p className="text-grey-600 mb-4">
                    롤백 기능이 있어 되돌릴 수 있습니다.
                  </p>
                  <div className="bg-grey-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-grey-600">학년 승급:</span>
                        <span className="font-medium">{preview?.to_promote}명</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-grey-600">졸업 처리:</span>
                        <span className="font-medium">{preview?.to_graduate}명</span>
                      </div>
                      <div className="border-t border-grey-200 pt-2 mt-2">
                        <div className="flex justify-between text-green-600">
                          <span>반 자동 이동:</span>
                          <span className="font-medium">{preview?.class_auto_count}개</span>
                        </div>
                        <div className="flex justify-between text-amber-600">
                          <span>수동 배정 필요:</span>
                          <span className="font-medium">{preview?.class_unassigned_count}개</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setPromotionStep('preview')}
                      className="px-6 py-2.5 text-sm font-medium text-grey-600 bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
                    >
                      뒤로
                    </button>
                    <button
                      onClick={handleExecutePromotion}
                      disabled={executePromotion.isPending}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {executePromotion.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          처리 중...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          승급 실행
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {promotionStep === 'result' && (
                <div className="text-center py-8">
                  {executePromotion.isSuccess ? (
                    <>
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-grey-900 mb-2">학년 승급 완료!</h3>
                      <div className="bg-grey-50 rounded-xl p-4 mb-4 max-w-md mx-auto">
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-grey-600">학년 승급:</span>
                            <span className="font-medium text-blue-600">{executePromotion.data?.promoted_count}명</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-grey-600">졸업 처리:</span>
                            <span className="font-medium text-purple-600">{executePromotion.data?.graduated_count}명</span>
                          </div>
                          <div className="border-t border-grey-200 pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-grey-600">반 자동 이동:</span>
                              <span className="font-medium text-green-600">{executePromotion.data?.class_auto_moved}개</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-grey-600">수동 배정 필요:</span>
                              <span className="font-medium text-amber-600">{executePromotion.data?.class_unassigned}개</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-grey-500 mb-4">
                        '이력/롤백' 버튼에서 되돌릴 수 있습니다.
                      </p>

                      {/* 수동 배정 필요 시 안내 */}
                      {(executePromotion.data?.class_unassigned ?? 0) > 0 && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left max-w-md mx-auto">
                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium">
                              {executePromotion.data?.class_unassigned}개 반 등록이 해제되었습니다
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 mb-3">
                            번호 반(정규1, 정규2 등) 또는 매칭되는 반이 없는 학생들입니다.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPromotionStep('assign')}
                              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                            >
                              바로 배정하기
                            </button>
                            <button
                              onClick={() => {
                                setShowPromotionModal(false);
                                navigate('/admin/class-assignment');
                              }}
                              className="px-3 py-2 text-sm text-amber-700 hover:text-amber-800 hover:underline"
                            >
                              반 배정 페이지로 →
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : executePromotion.isError ? (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="w-8 h-8 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-grey-900 mb-2">오류 발생</h3>
                      <p className="text-red-600 mb-4">
                        {executePromotion.error?.message || '알 수 없는 오류가 발생했습니다.'}
                      </p>
                    </>
                  ) : null}
                </div>
              )}

              {/* assign step: 빠른 배정 */}
              {promotionStep === 'assign' && (
                <div className="space-y-4">
                  {/* 헤더 */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-grey-900">
                      수동 배정이 필요한 학생 ({unassignedStudents.length}명)
                    </h3>
                    <button
                      onClick={() => setPromotionStep('result')}
                      className="text-sm text-grey-500 hover:text-grey-700"
                    >
                      ← 결과로 돌아가기
                    </button>
                  </div>

                  {unassignedStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-bold text-grey-900 mb-2">모든 배정 완료!</h3>
                      <p className="text-grey-600">더 이상 미배정 학생이 없습니다.</p>
                    </div>
                  ) : (
                    <>
                      {/* 학년 필터 탭 */}
                      <div className="flex gap-2 border-b border-grey-200 pb-2 overflow-x-auto">
                        <button
                          onClick={() => {
                            setAssignGradeFilter(null);
                            setSelectedEnrollmentIds(new Set());
                            setTargetClassId(null);
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
                            assignGradeFilter === null
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : 'text-grey-600 hover:bg-grey-100'
                          }`}
                        >
                          전체 ({unassignedStudents.length})
                        </button>
                        {Object.entries(unassignedByGrade).map(([grade, students]) => (
                          <button
                            key={grade}
                            onClick={() => {
                              setAssignGradeFilter(grade);
                              setSelectedEnrollmentIds(new Set());
                              setTargetClassId(null);
                            }}
                            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
                              assignGradeFilter === grade
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-grey-600 hover:bg-grey-100'
                            }`}
                          >
                            {grade} ({students.length})
                          </button>
                        ))}
                      </div>

                      {/* 학생 목록 (체크박스) */}
                      <div className="border border-grey-200 rounded-xl overflow-hidden">
                        <div className="max-h-[250px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-grey-50 sticky top-0">
                              <tr>
                                <th className="w-10 px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedEnrollmentIds.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedEnrollmentIds(new Set(filteredUnassignedStudents.map(s => s.enrollmentId)));
                                      } else {
                                        setSelectedEnrollmentIds(new Set());
                                      }
                                    }}
                                    className="rounded border-grey-300"
                                  />
                                </th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">이름</th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">학년</th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">이전 반</th>
                                <th className="px-3 py-2 text-left text-grey-600 font-medium">사유</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-grey-100">
                              {filteredUnassignedStudents.map((student) => (
                                <tr key={student.enrollmentId} className="hover:bg-grey-50">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedEnrollmentIds.has(student.enrollmentId)}
                                      onChange={(e) => {
                                        setSelectedEnrollmentIds(prev => {
                                          const next = new Set(prev);
                                          if (e.target.checked) {
                                            next.add(student.enrollmentId);
                                          } else {
                                            next.delete(student.enrollmentId);
                                          }
                                          return next;
                                        });
                                      }}
                                      className="rounded border-grey-300"
                                    />
                                  </td>
                                  <td className="px-3 py-2 font-medium">{student.studentName}</td>
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                      {student.newGrade}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-grey-600 truncate max-w-[150px]" title={student.previousClassName}>
                                    {student.previousClassName}
                                  </td>
                                  <td className="px-3 py-2 text-grey-500 text-xs truncate max-w-[120px]" title={student.reason}>
                                    {student.reason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 반 선택 + 배정 버튼 */}
                      {selectedEnrollmentIds.size > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-sm text-blue-700 font-medium">
                              {selectedEnrollmentIds.size}명 선택됨
                            </span>
                            <div className="flex items-center gap-2">
                              <select
                                value={targetClassId || ''}
                                onChange={(e) => setTargetClassId(e.target.value || null)}
                                className="text-sm border border-grey-300 rounded-lg px-3 py-1.5 min-w-[180px]"
                              >
                                <option value="">반 선택...</option>
                                {filteredClassesForGrade.map((cls) => (
                                  <option key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={handleQuickAssign}
                                disabled={!targetClassId || batchAssign.isPending}
                                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
                              >
                                {batchAssign.isPending ? (
                                  <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    배정 중...
                                  </>
                                ) : (
                                  '배정하기'
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-grey-200 bg-grey-50">
              {promotionStep === 'preview' && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-grey-600 hover:text-grey-800 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => setPromotionStep('confirm')}
                    disabled={!preview || preview.total_students === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <ChevronUp className="w-4 h-4" />
                    다음 단계
                  </button>
                </div>
              )}
              {promotionStep === 'result' && (
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    완료
                  </button>
                </div>
              )}
              {promotionStep === 'assign' && (
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 이력/롤백 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
            {/* 모달 헤더 */}
            <div className="px-6 py-4 border-b border-grey-200 bg-gradient-to-r from-grey-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-grey-600" />
                  <h2 className="text-lg font-bold text-grey-900">승급 이력 / 롤백</h2>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <div className="text-grey-500">이력 로딩 중...</div>
                </div>
              ) : historyData && historyData.history.length > 0 ? (
                <div className="space-y-3">
                  {historyData.history.map((item) => (
                    <div
                      key={item.batch_id}
                      className={`border rounded-xl p-4 ${
                        item.is_rolled_back
                          ? 'border-grey-200 bg-grey-50'
                          : 'border-blue-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-grey-900">
                              {formatDate(item.promoted_at)}
                            </span>
                            {item.is_rolled_back && (
                              <span className="px-2 py-0.5 text-xs bg-grey-200 text-grey-600 rounded-full">
                                롤백됨
                              </span>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-blue-600">
                              승급 {item.promoted_count}명
                            </span>
                            <span className="text-purple-600">
                              졸업 {item.graduated_count}명
                            </span>
                            <span className="text-grey-500">
                              총 {item.total_affected}명
                            </span>
                          </div>
                          {item.is_rolled_back && item.rolled_back_at && (
                            <div className="mt-2 text-xs text-grey-500">
                              롤백 시간: {formatDate(item.rolled_back_at)}
                            </div>
                          )}
                        </div>

                        {/* 롤백 버튼 */}
                        {!item.is_rolled_back && (
                          <div>
                            {rollbackBatchId === item.batch_id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleRollback(item.batch_id)}
                                  disabled={rollbackPromotion.isPending}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {rollbackPromotion.isPending ? (
                                    <>
                                      <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                                      처리 중
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-3 h-3" />
                                      확인
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setRollbackBatchId(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-grey-600 bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRollbackBatchId(item.batch_id)}
                                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                롤백
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-grey-300 mx-auto mb-3" />
                  <p className="text-grey-500">승급 이력이 없습니다.</p>
                  <p className="text-sm text-grey-400 mt-1">
                    학년 승급을 실행하면 이력이 저장됩니다.
                  </p>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-6 py-4 border-t border-grey-200 bg-grey-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-grey-600 hover:text-grey-800 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MakeEdu Sync View (Phase 6 통합)
// ============================================

type SyncStep = 'idle' | 'loading' | 'preview' | 'executing' | 'completed' | 'error';

const POLLING_INTERVAL = 2000;
const MAX_POLLING_TIME = 120000;

// Mock 동기화 기록
const MOCK_SYNC_HISTORY = [
  { id: '1', date: '2025-12-15 10:30', new: 2, updated: 1, deleted: 0 },
  { id: '2', date: '2025-12-14 09:00', new: 0, updated: 0, deleted: 0 },
  { id: '3', date: '2025-12-13 11:20', new: 1, updated: 0, deleted: 0 },
  { id: '4', date: '2025-12-12 14:45', new: 3, updated: 2, deleted: 1 },
];

// 단계별 체크리스트 메시지
const STEP_MESSAGES: Record<string, { icon: string; label: string }> = {
  connecting: { icon: '🔗', label: '메이크에듀 연결 중...' },
  logging_in: { icon: '🔐', label: '로그인 중...' },
  scraping: { icon: '📥', label: '학생 데이터 수집 중...' },
  syncing: { icon: '🔄', label: '변경사항 분석 중...' },
  completed: { icon: '✅', label: '완료!' },
};

function MakeeduSyncView() {
  const [step, setStep] = useState<SyncStep>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string>('');

  // 폴링 상태 조회
  const pollStatus = useCallback(async (id: string) => {
    try {
      const response = await syncApi.getStatus(id);
      setStatus(response);

      // 단계 메시지 업데이트
      if (response.status === 'scraping') {
        setCurrentPhase('scraping');
      } else if (response.status === 'syncing') {
        setCurrentPhase('syncing');
      }

      if (response.status === 'completed') {
        setCurrentPhase('completed');
        setStep(response.preview ? 'preview' : 'completed');
      } else if (response.status === 'failed') {
        setStep('error');
        setError(response.error || '알 수 없는 에러');
      }

      return response.status;
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '상태 조회 실패');
      return 'failed';
    }
  }, []);

  // 미리보기 시작
  const startPreview = async () => {
    setStep('loading');
    setError(null);
    setStatus(null);
    setCurrentPhase('connecting');

    try {
      const response = await syncApi.trigger(true);
      setJobId(response.jobId);
      setCurrentPhase('logging_in');

      const startTime = Date.now();
      const pollInterval = setInterval(async () => {
        const currentStatus = await pollStatus(response.jobId);

        if (currentStatus === 'completed' || currentStatus === 'failed') {
          clearInterval(pollInterval);
        }

        if (Date.now() - startTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setStep('error');
          setError('작업 시간 초과 (2분)');
        }
      }, POLLING_INTERVAL);
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '동기화 시작 실패');
    }
  };

  // 실제 동기화 실행
  const executeSync = async () => {
    setStep('executing');
    setError(null);
    setCurrentPhase('syncing');

    try {
      const response = await syncApi.trigger(false);
      setJobId(response.jobId);

      const startTime = Date.now();
      const pollInterval = setInterval(async () => {
        const currentStatus = await pollStatus(response.jobId);

        if (currentStatus === 'completed' || currentStatus === 'failed') {
          clearInterval(pollInterval);
        }

        if (Date.now() - startTime > MAX_POLLING_TIME) {
          clearInterval(pollInterval);
          setStep('error');
          setError('작업 시간 초과 (2분)');
        }
      }, POLLING_INTERVAL);
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : '동기화 실행 실패');
    }
  };

  // 초기화
  const reset = () => {
    setStep('idle');
    setJobId(null);
    setStatus(null);
    setError(null);
    setCurrentPhase('');
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-grey-900">🔄 메이크에듀 동기화</h1>
          <DataSourceBadge />
        </div>
      </div>

      {/* 동기화 카드 */}
      <div className="bg-white rounded-2xl border border-grey-200 overflow-hidden mb-6">
        <div className="p-6">
          {/* 유휴 상태 */}
          {step === 'idle' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🔄</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-2">
                메이크에듀에서 학생 데이터 가져오기
              </h2>
              <p className="text-grey-500 mb-6 max-w-md mx-auto">
                메이크에듀에 등록된 학생 정보를 가져와<br />
                Supabase DB와 동기화합니다.
              </p>
              <button
                onClick={startPreview}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                미리보기 시작
              </button>
            </div>
          )}

          {/* 로딩/실행 중 */}
          {(step === 'loading' || step === 'executing') && (
            <div className="py-8">
              <div className="max-w-md mx-auto">
                {/* 체크리스트 */}
                <div className="space-y-3 mb-6">
                  {Object.entries(STEP_MESSAGES).map(([key, { icon, label }]) => {
                    const phases = ['connecting', 'logging_in', 'scraping', 'syncing', 'completed'];
                    const currentIdx = phases.indexOf(currentPhase);
                    const itemIdx = phases.indexOf(key);
                    const isCompleted = itemIdx < currentIdx;
                    const isCurrent = key === currentPhase;

                    return (
                      <div
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          isCurrent ? 'bg-blue-50' : isCompleted ? 'bg-green-50' : 'bg-grey-50'
                        }`}
                      >
                        <span className="text-xl">
                          {isCompleted ? '✅' : isCurrent ? icon : '○'}
                        </span>
                        <span className={`text-sm ${
                          isCurrent ? 'text-blue-600 font-medium' :
                          isCompleted ? 'text-green-600' : 'text-grey-400'
                        }`}>
                          {label}
                        </span>
                        {isCurrent && (
                          <div className="ml-auto">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 프로그레스바 */}
                <div className="w-full bg-grey-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${status?.progress || 10}%` }}
                  />
                </div>
                <p className="text-center text-sm text-grey-500">
                  {status?.message || '처리 중...'}
                </p>
              </div>
            </div>
          )}

          {/* 미리보기 결과 */}
          {step === 'preview' && status?.result && (
            <div className="py-6">
              <h2 className="text-lg font-semibold text-grey-900 mb-4 text-center">
                ✅ 미리보기 완료
              </h2>

              <SyncStatsCards stats={status.result.stats} />

              <div className="flex gap-3 mt-6 max-w-md mx-auto">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={executeSync}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  동기화 실행
                </button>
              </div>
            </div>
          )}

          {/* 완료 */}
          {step === 'completed' && status?.result && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-4">동기화 완료!</h2>

              <SyncStatsCards stats={status.result.stats} />

              <button
                onClick={reset}
                className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                확인
              </button>
            </div>
          )}

          {/* 에러 */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-lg font-semibold text-grey-900 mb-2">오류 발생</h2>
              <p className="text-red-600 mb-6">{error}</p>

              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 rounded-xl font-medium hover:bg-grey-200 transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={startPreview}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 동기화 기록 */}
      <div className="bg-white rounded-2xl border border-grey-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-grey-100">
          <h2 className="text-base font-semibold text-grey-900">📜 동기화 기록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grey-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grey-500 uppercase tracking-wider">일시</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">신규</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">업데이트</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-grey-500 uppercase tracking-wider">퇴원</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {MOCK_SYNC_HISTORY.map((record) => (
                <tr key={record.id} className="hover:bg-grey-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-grey-900">{record.date}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.new > 0 ? 'bg-green-100 text-green-700' : 'text-grey-400'
                    }`}>
                      {record.new > 0 ? `+${record.new}명` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.updated > 0 ? 'bg-blue-100 text-blue-700' : 'text-grey-400'
                    }`}>
                      {record.updated > 0 ? `${record.updated}명` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      record.deleted > 0 ? 'bg-red-100 text-red-700' : 'text-grey-400'
                    }`}>
                      {record.deleted > 0 ? `${record.deleted}명` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 동기화 통계 카드
function SyncStatsCards({ stats }: { stats: SyncStats }) {
  return (
    <div className="max-w-lg mx-auto">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">+{stats.new}</p>
          <p className="text-sm text-green-700">신규</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.updated}</p>
          <p className="text-sm text-blue-700">업데이트</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.deleted}</p>
          <p className="text-sm text-red-700">퇴원</p>
        </div>
      </div>

      {/* 상세 목록 */}
      {stats.new > 0 && (
        <div className="bg-green-50 rounded-xl p-4 mb-3">
          <h4 className="text-sm font-medium text-green-800 mb-2">신규 학생</h4>
          <ul className="space-y-1 text-sm text-green-700">
            {stats.new_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name} ({s.grade || '미정'})</li>
            ))}
            {stats.new_students.length > 5 && (
              <li className="text-green-600">... 외 {stats.new_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.updated > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 mb-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">정보 변경</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            {stats.updated_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name}: 연락처 변경</li>
            ))}
            {stats.updated_students.length > 5 && (
              <li className="text-blue-600">... 외 {stats.updated_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.deleted > 0 && (
        <div className="bg-red-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">퇴원 처리</h4>
          <ul className="space-y-1 text-sm text-red-700">
            {stats.deleted_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name} ({s.grade || '미정'})</li>
            ))}
            {stats.deleted_students.length > 5 && (
              <li className="text-red-600">... 외 {stats.deleted_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.new === 0 && stats.updated === 0 && stats.deleted === 0 && (
        <div className="bg-grey-50 rounded-xl p-4 text-center">
          <p className="text-grey-600">변경사항이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
