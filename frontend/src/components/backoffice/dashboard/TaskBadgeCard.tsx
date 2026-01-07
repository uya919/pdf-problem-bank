/**
 * TaskBadgeCard - 통합 업무 뱃지 카드 (드롭다운 기능)
 *
 * 목업: docs/mockups/all-badges-dropdown.html 기준
 * - 4개 뱃지 (공지, 출결, 진도, 숙제) 1줄 표시
 * - 탭하면 드롭다운 열림
 * - 항목 완료 시 숫자 감소
 * - 모두 완료 시 회색 + 체크 표시
 */
import { useState, useEffect, type ReactNode } from 'react';
import { BellIcon, NoteIcon, CheckIcon, ChecklistIcon } from '../../ui/Icons';
import { ChevronUp, PartyPopper, Check } from 'lucide-react';

// ============ 타입 정의 ============

/** 공지 유형 */
type NoticeType = 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation';

/** 중요 공지 유형 */
const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'holiday', 'absence'];

interface NoticeItem {
  id: string;
  title: string;
  subtitle?: string;
  read: boolean;
  /** 공지 유형 (옵션) - 중요 공지 강조용 */
  type?: NoticeType;
}

interface AttendanceItem {
  id: string;
  className: string;
  studentCount: number;
  time: string;
  status: 'completed' | 'upcoming';
  checked: boolean;
}

interface ProgressItem {
  id: string;
  className: string;
  time: string;
  lastProgress?: string;
  recorded: boolean;
}

interface HomeworkItem {
  id: string;
  className: string;
  range: string;
  submitted: number;
  notSubmitted: number;
  checked: boolean;
}

interface TaskBadgeCardProps {
  notices: NoticeItem[];
  attendances: AttendanceItem[];
  progresses: ProgressItem[];
  homeworks: HomeworkItem[];
  onNoticeRead?: (id: string) => void;
  onAttendanceCheck?: (id: string) => void;
  onProgressRecord?: (id: string) => void;
  onHomeworkCheck?: (id: string) => void;
}

// ============ 뱃지 설정 ============

type BadgeType = 'notice' | 'attendance' | 'progress' | 'homework';

const BADGE_CONFIG: Record<BadgeType, {
  icon: ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  actionLabel: string;
}> = {
  notice: {
    icon: <BellIcon size={16} />,
    label: '공지',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-500',
    actionLabel: '확인',
  },
  attendance: {
    icon: <CheckIcon size={16} />,
    label: '출결',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    dotColor: 'bg-green-500',
    actionLabel: '체크',
  },
  progress: {
    icon: <ChecklistIcon size={16} />,
    label: '진도',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-500',
    actionLabel: '기록',
  },
  homework: {
    icon: <NoteIcon size={16} />,
    label: '숙제',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-500',
    actionLabel: '확인',
  },
};

// ============ 메인 컴포넌트 ============

export function TaskBadgeCard({
  notices,
  attendances,
  progresses,
  homeworks,
  onNoticeRead,
  onAttendanceCheck,
  onProgressRecord,
  onHomeworkCheck,
}: TaskBadgeCardProps) {
  // 각 뱃지별 미완료 개수
  const noticeCount = notices.filter((n) => !n.read).length;
  const attendanceCount = attendances.filter((a) => !a.checked).length;
  const progressCount = progresses.filter((p) => !p.recorded).length;
  const homeworkCount = homeworks.filter((h) => !h.checked).length;

  // 기본 열림 상태: 공지 > 출결 > 진도 > 숙제 순으로 첫 번째 미완료 항목
  const getDefaultOpenBadge = (): BadgeType | null => {
    if (noticeCount > 0) return 'notice';
    if (attendanceCount > 0) return 'attendance';
    if (progressCount > 0) return 'progress';
    if (homeworkCount > 0) return 'homework';
    return null;
  };

  const [openBadge, setOpenBadge] = useState<BadgeType | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 데이터 로딩 완료 시 기본 열림 상태 설정 (최초 1회만)
  useEffect(() => {
    if (!hasInitialized && (noticeCount > 0 || attendanceCount > 0 || progressCount > 0 || homeworkCount > 0)) {
      setOpenBadge(getDefaultOpenBadge());
      setHasInitialized(true);
    }
  }, [noticeCount, attendanceCount, progressCount, homeworkCount, hasInitialized]);

  const counts: Record<BadgeType, number> = {
    notice: noticeCount,
    attendance: attendanceCount,
    progress: progressCount,
    homework: homeworkCount,
  };

  // 모든 업무 완료 여부
  const allDone = noticeCount === 0 && attendanceCount === 0 && progressCount === 0 && homeworkCount === 0;

  const handleBadgeClick = (type: BadgeType) => {
    if (counts[type] === 0) return; // 완료된 뱃지는 클릭 불가
    setOpenBadge(openBadge === type ? null : type);
  };

  // 모두 완료 시 축하 메시지
  if (allDone) {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* 완료된 뱃지들 */}
        <div className="flex gap-2 p-4">
          {(['notice', 'attendance', 'progress', 'homework'] as BadgeType[]).map((type) => (
            <button
              key={type}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-3 rounded-xl bg-gray-100 text-gray-400 text-[13px] font-semibold"
            >
              <CheckIcon size={16} />
              <span>{BADGE_CONFIG[type].label}</span>
              <CheckIcon size={12} />
            </button>
          ))}
        </div>
        {/* 축하 배너 */}
        <div className="mx-4 mb-4 p-5 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white text-center">
          <div className="mb-2 flex justify-center">
            <PartyPopper className="w-8 h-8" />
          </div>
          <div className="font-bold text-base mb-1">오늘 할 일을 모두 완료했어요!</div>
          <div className="text-sm opacity-90">수고하셨습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* 뱃지 Row */}
      <div className="flex gap-2 p-4">
        {(['notice', 'attendance', 'progress', 'homework'] as BadgeType[]).map((type) => {
          const config = BADGE_CONFIG[type];
          const count = counts[type];
          const isOpen = openBadge === type;
          const isDone = count === 0;

          return (
            <button
              key={type}
              onClick={() => handleBadgeClick(type)}
              className={`flex items-center justify-center gap-1 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ease-out ${
                isDone
                  ? 'flex-[0.9] bg-gray-100 text-gray-400 opacity-80'
                  : isOpen
                    ? `flex-[1.15] ${config.bgColor} ${config.textColor} shadow-md outline outline-2 -outline-offset-2 outline-current`
                    : `flex-[0.9] ${config.bgColor} ${config.textColor} opacity-80`
              }`}
            >
              {isDone ? <CheckIcon size={16} /> : config.icon}
              <span className="flex items-center gap-0.5">
                {config.label} {isDone ? <CheckIcon size={12} /> : count}
              </span>
              {isOpen && <ChevronUp size={12} className="ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 드롭다운 영역 */}
      {openBadge && (
        <div className="border-t border-gray-100 animate-slide-down">
          {openBadge === 'notice' && (
            <NoticeDropdown
              items={notices}
              onRead={onNoticeRead}
            />
          )}
          {openBadge === 'attendance' && (
            <AttendanceDropdown
              items={attendances}
              onCheck={onAttendanceCheck}
            />
          )}
          {openBadge === 'progress' && (
            <ProgressDropdown
              items={progresses}
              onRecord={onProgressRecord}
            />
          )}
          {openBadge === 'homework' && (
            <HomeworkDropdown
              items={homeworks}
              onCheck={onHomeworkCheck}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============ 드롭다운 컴포넌트들 ============

/** 중요 공지 유형별 스타일 */
const IMPORTANT_NOTICE_STYLES: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
  urgent: { label: '긴급', bgColor: 'bg-red-100', textColor: 'text-red-700', dotColor: 'bg-red-500' },
  holiday: { label: '휴원', bgColor: 'bg-orange-100', textColor: 'text-orange-700', dotColor: 'bg-orange-500' },
  absence: { label: '결석', bgColor: 'bg-amber-100', textColor: 'text-amber-700', dotColor: 'bg-amber-500' },
};

function NoticeDropdown({
  items,
  onRead,
}: {
  items: NoticeItem[];
  onRead?: (id: string) => void;
}) {
  const config = BADGE_CONFIG.notice;

  // 중요 공지 먼저, 나머지는 그대로
  const sortedItems = [...items].sort((a, b) => {
    const aImportant = a.type && IMPORTANT_NOTICE_TYPES.includes(a.type);
    const bImportant = b.type && IMPORTANT_NOTICE_TYPES.includes(b.type);
    if (aImportant && !bImportant) return -1;
    if (!aImportant && bImportant) return 1;
    return 0;
  });

  return (
    <div className="px-4 py-3 space-y-0">
      {sortedItems.map((item, index) => {
        const isImportant = item.type && IMPORTANT_NOTICE_TYPES.includes(item.type);
        const importantStyle = item.type ? IMPORTANT_NOTICE_STYLES[item.type] : null;

        return (
          <div
            key={item.id}
            onClick={() => !item.read && onRead?.(item.id)}
            className={`flex items-center gap-3 py-3 cursor-pointer ${
              index > 0 ? 'border-t border-gray-50' : ''
            } ${item.read ? 'opacity-50' : ''} ${
              isImportant && !item.read ? 'bg-red-50/50 -mx-4 px-4 rounded-lg' : ''
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.read ? 'bg-gray-300' : importantStyle?.dotColor || config.dotColor
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {/* 중요 공지 뱃지 */}
                {isImportant && importantStyle && !item.read && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${importantStyle.bgColor} ${importantStyle.textColor}`}>
                    {importantStyle.label}
                  </span>
                )}
                <span className={`text-[13px] font-medium ${isImportant && !item.read ? 'text-gray-900 font-semibold' : 'text-gray-900'}`}>
                  {item.title}
                </span>
              </div>
              {item.subtitle && (
                <div className="text-[11px] text-gray-500 mt-0.5">{item.subtitle}</div>
              )}
            </div>
            {!item.read && (
              <button
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${
                  isImportant && importantStyle
                    ? `${importantStyle.bgColor} ${importantStyle.textColor}`
                    : `${config.bgColor} ${config.textColor}`
                }`}
              >
                {config.actionLabel}
              </button>
            )}
            {item.read && <Check className="w-4 h-4 text-green-500" />}
          </div>
        );
      })}
    </div>
  );
}

function AttendanceDropdown({
  items,
  onCheck,
}: {
  items: AttendanceItem[];
  onCheck?: (id: string) => void;
}) {
  const config = BADGE_CONFIG.attendance;

  return (
    <div className="px-4 py-3 space-y-0">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 py-3 ${
            index > 0 ? 'border-t border-gray-50' : ''
          } ${item.checked ? 'opacity-50' : ''}`}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              item.checked ? 'bg-gray-300' : config.dotColor
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-gray-900">
              {item.className} ({item.studentCount}명)
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {item.time} {item.status === 'completed' ? '완료' : '예정'}
            </div>
          </div>
          {!item.checked && (
            <button
              onClick={() => onCheck?.(item.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${config.bgColor} ${config.textColor}`}
            >
              {config.actionLabel}
            </button>
          )}
          {item.checked && <Check className="w-4 h-4 text-green-500" />}
        </div>
      ))}
    </div>
  );
}

function ProgressDropdown({
  items,
  onRecord,
}: {
  items: ProgressItem[];
  onRecord?: (id: string) => void;
}) {
  const config = BADGE_CONFIG.progress;

  return (
    <div className="px-4 py-3 space-y-0">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`flex items-center gap-3 py-3 ${
            index > 0 ? 'border-t border-gray-50' : ''
          } ${item.recorded ? 'opacity-50' : ''}`}
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              item.recorded ? 'bg-gray-300' : config.dotColor
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-gray-900">{item.className}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{item.time} 수업</div>
            {item.lastProgress && (
              <div className="text-[11px] text-blue-500 mt-0.5">
                최근: {item.lastProgress}
              </div>
            )}
          </div>
          {!item.recorded && (
            <button
              onClick={() => onRecord?.(item.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${config.bgColor} ${config.textColor}`}
            >
              {config.actionLabel}
            </button>
          )}
          {item.recorded && <Check className="w-4 h-4 text-green-500" />}
        </div>
      ))}
    </div>
  );
}

function HomeworkDropdown({
  items,
  onCheck,
}: {
  items: HomeworkItem[];
  onCheck?: (id: string) => void;
}) {
  const config = BADGE_CONFIG.homework;

  return (
    <div className="px-4 py-3 space-y-0">
      {items.map((item, index) => {
        const hasNotSubmitted = item.notSubmitted > 0;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 py-3 ${
              index > 0 ? 'border-t border-gray-50' : ''
            } ${item.checked ? 'opacity-50' : ''}`}
          >
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                item.checked ? 'bg-gray-300' : hasNotSubmitted ? 'bg-red-500' : config.dotColor
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900">{item.className}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                {item.range} | 제출 {item.submitted}명
                {hasNotSubmitted && (
                  <span className="text-red-600 font-medium"> · 미제출 {item.notSubmitted}명</span>
                )}
              </div>
            </div>
            {!item.checked && (
              <button
                onClick={() => onCheck?.(item.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${config.bgColor} ${config.textColor}`}
              >
                {config.actionLabel}
              </button>
            )}
            {item.checked && <Check className="w-4 h-4 text-green-500" />}
          </div>
        );
      })}
    </div>
  );
}

export default TaskBadgeCard;
