/**
 * AdminMobileNotice - 관리자 모바일 공지 페이지
 *
 * 강사용 RecordsPage와 비교:
 * - 강사: 내 수업 기록 (진도, 숙제, 성적)
 * - 관리자: 공지사항 등록/확인 (결석, 상담, 회의 등)
 *
 * 차이점:
 * - 강사는 "내 기록" 관리
 * - 관리자는 "학원 공지" 관리 (선생님들께 공유)
 *
 * 공통점:
 * - 캘린더 기반 날짜 선택
 */
import { useState } from 'react';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import { DateSelector } from '../../components/backoffice/dashboard';
import {
  Plus,
  X,
  AlertCircle,
  Calendar,
  Users,
  MessageSquare,
  Check,
} from 'lucide-react';

// ============ Mock 데이터 ============

type NoticeCategory = 'all' | 'absent' | 'meeting' | 'consult' | 'etc';

const CATEGORY_CONFIG: Record<NoticeCategory, { label: string; color: string; bgColor: string }> = {
  all: { label: '전체', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  absent: { label: '결석', color: 'text-red-600', bgColor: 'bg-red-100' },
  meeting: { label: '회의', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  consult: { label: '상담', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  etc: { label: '기타', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const mockNotices = [
  {
    id: '1',
    category: 'absent' as NoticeCategory,
    title: '김민수(중3A) 무단결석',
    content: '어머니께 연락 필요. 3일 연속 결석.',
    time: '09:30',
    author: '원장',
    read: false,
  },
  {
    id: '2',
    category: 'absent' as NoticeCategory,
    title: '이영희(중2B) 병결',
    content: '어머니 연락 완료. 감기 몸살.',
    time: '10:00',
    author: '원장',
    read: true,
  },
  {
    id: '3',
    category: 'consult' as NoticeCategory,
    title: '박지민 학부모 상담 예약',
    content: '진로 상담. 14:00 원장실.',
    time: '11:00',
    author: '원장',
    read: false,
  },
  {
    id: '4',
    category: 'meeting' as NoticeCategory,
    title: '전체 강사 회의',
    content: '12월 일정 조율. 18:00 회의실.',
    time: '14:00',
    author: '원장',
    read: false,
  },
  {
    id: '5',
    category: 'etc' as NoticeCategory,
    title: '냉난방기 점검 안내',
    content: '내일 오전 10시 점검 예정.',
    time: '15:00',
    author: '원장',
    read: true,
  },
];

// ============ 컴포넌트 ============

export default function AdminMobileNotice() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState<NoticeCategory>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 카테고리 필터링
  const filteredNotices = activeCategory === 'all'
    ? mockNotices
    : mockNotices.filter((n) => n.category === activeCategory);

  // 카테고리별 개수
  const categoryCounts = {
    all: mockNotices.length,
    absent: mockNotices.filter((n) => n.category === 'absent').length,
    meeting: mockNotices.filter((n) => n.category === 'meeting').length,
    consult: mockNotices.filter((n) => n.category === 'consult').length,
    etc: mockNotices.filter((n) => n.category === 'etc').length,
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <h1 className="text-lg font-bold text-gray-900">공지사항</h1>
        <p className="text-xs text-gray-500">학원 내 공지 등록 및 확인</p>
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

        {/* 카테고리 필터 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(Object.keys(CATEGORY_CONFIG) as NoticeCategory[]).map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const isActive = activeCategory === cat;
            const count = categoryCounts[cat];

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {config.label}
                <span className={`text-xs ${isActive ? '' : 'text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 공지 리스트 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filteredNotices.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>등록된 공지가 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredNotices.map((notice) => {
                const catConfig = CATEGORY_CONFIG[notice.category];
                return (
                  <div
                    key={notice.id}
                    className={`px-4 py-3 ${notice.read ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 카테고리 아이콘 */}
                      <div className={`w-8 h-8 rounded-full ${catConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                        {notice.category === 'absent' && <AlertCircle className={`w-4 h-4 ${catConfig.color}`} />}
                        {notice.category === 'meeting' && <Users className={`w-4 h-4 ${catConfig.color}`} />}
                        {notice.category === 'consult' && <Calendar className={`w-4 h-4 ${catConfig.color}`} />}
                        {notice.category === 'etc' && <MessageSquare className={`w-4 h-4 ${catConfig.color}`} />}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{notice.title}</span>
                          {notice.read && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notice.content}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {notice.time} · {notice.author}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* FAB: 공지 등록 */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* 공지 등록 모달 */}
      {isModalOpen && (
        <NoticeCreateModal onClose={() => setIsModalOpen(false)} />
      )}

      {/* 하단 네비게이션 */}
      <AdminBottomNav badges={{ notice: mockNotices.filter((n) => !n.read).length }} />
    </div>
  );
}

// 공지 등록 모달
function NoticeCreateModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<NoticeCategory>('absent');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    console.log('공지 등록:', { category, title, content });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold">공지 등록</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* 폼 */}
        <div className="p-4 space-y-4">
          {/* 카테고리 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">카테고리</label>
            <div className="flex gap-2 flex-wrap">
              {(['absent', 'meeting', 'consult', 'etc'] as NoticeCategory[]).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const isActive = category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? `${config.bgColor} ${config.color} ring-2 ring-current`
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 김민수(중3A) 무단결석"
              className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="상세 내용을 입력하세요"
              rows={4}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 알림 대상 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">알림 대상</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="target" defaultChecked className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">전체 선생님</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="target" className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">담당 선생님만</span>
              </label>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={!title}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            등록하기
          </button>
        </div>
      </div>
    </div>
  );
}
