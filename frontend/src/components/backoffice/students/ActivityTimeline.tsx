/**
 * 최근 활동 타임라인 컴포넌트
 */
import { ActivityRecord } from './index';

interface ActivityTimelineProps {
  activities: ActivityRecord[];
  limit?: number;
}

export function ActivityTimeline({ activities, limit = 10 }: ActivityTimelineProps) {
  // 날짜별 그룹핑
  const groupedActivities = activities.slice(0, limit).reduce((acc, activity) => {
    const date = activity.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as Record<string, ActivityRecord[]>);

  const dates = Object.keys(groupedActivities).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // 오늘 날짜 체크
  const today = new Date().toISOString().split('T')[0];

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day} (${dayName})`;
  };

  // 활동 타입별 스타일
  const getActivityStyle = (activity: ActivityRecord) => {
    switch (activity.type) {
      case 'attendance':
        return {
          label: '출석',
          bg: 'bg-[#E8F4FF]',
          text: 'text-[#3182F6]',
          dot: 'bg-[#3182F6]',
        };
      case 'absence':
        return {
          label: '결석',
          bg: 'bg-[#FEE2E2]',
          text: 'text-[#DC2626]',
          dot: 'bg-[#EF4444]',
        };
      case 'homework':
        if (activity.status === 'submitted') {
          return {
            label: '숙제',
            bg: 'bg-[#E8F5E9]',
            text: 'text-[#2E7D32]',
            dot: 'bg-[#4CAF50]',
          };
        }
        return {
          label: '숙제',
          bg: 'bg-[#FEF3C7]',
          text: 'text-[#B45309]',
          dot: 'bg-[#F59E0B]',
        };
      case 'test':
        const score = activity.score || 0;
        if (score >= 80) {
          return {
            label: '시험',
            bg: 'bg-[#E8F4FF]',
            text: 'text-[#3182F6]',
            dot: 'bg-[#3182F6]',
          };
        } else if (score >= 70) {
          return {
            label: '시험',
            bg: 'bg-[#FEF3C7]',
            text: 'text-[#B45309]',
            dot: 'bg-[#F59E0B]',
          };
        }
        return {
          label: '시험',
          bg: 'bg-[#FEE2E2]',
          text: 'text-[#DC2626]',
          dot: 'bg-[#EF4444]',
        };
      default:
        return {
          label: '메모',
          bg: 'bg-[#F2F4F6]',
          text: 'text-[#6B7684]',
          dot: 'bg-[#8B95A1]',
        };
    }
  };

  // 활동 상세 텍스트
  const getActivityDetail = (activity: ActivityRecord) => {
    switch (activity.type) {
      case 'attendance':
        return '정상 출석';
      case 'absence':
        return activity.detail || '무단 결석';
      case 'homework':
        if (activity.status === 'submitted') {
          return activity.detail || '제출 완료';
        }
        return '미제출';
      case 'test':
        let text = `${activity.score}점`;
        if (activity.scoreDiff) {
          text += activity.scoreDiff > 0
            ? ` (↑${activity.scoreDiff}점)`
            : ` (↓${Math.abs(activity.scoreDiff)}점)`;
        }
        return text;
      default:
        return activity.detail || '';
    }
  };

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl p-5">
      <div className="text-sm font-semibold text-[#191F28] mb-4">최근 활동</div>

      {dates.length > 0 ? (
        <div className="space-y-4">
          {dates.map((date, dateIdx) => {
            const dayActivities = groupedActivities[date];
            const isToday = date === today;
            const isLast = dateIdx === dates.length - 1;

            // 해당 날짜의 가장 심각한 상태로 dot 색상 결정
            const hasCritical = dayActivities.some(
              (a) => a.type === 'absence' || (a.type === 'test' && (a.score || 0) < 70)
            );
            const hasWarning = dayActivities.some(
              (a) => (a.type === 'homework' && a.status === 'missing') ||
                     (a.type === 'test' && (a.score || 0) < 80)
            );
            const dotColor = hasCritical
              ? 'bg-[#EF4444]'
              : hasWarning
              ? 'bg-[#F59E0B]'
              : 'bg-[#3182F6]';

            return (
              <div key={date} className="flex gap-3">
                {/* 타임라인 dot + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 ${dotColor} rounded-full`} />
                  {!isLast && <div className="w-0.5 flex-1 bg-[#F2F4F6]" />}
                </div>

                {/* 내용 */}
                <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="text-xs font-medium text-[#EF4444]">
                        오늘
                      </span>
                    )}
                    <span className="text-xs text-[#8B95A1]">
                      {formatDate(date)}
                    </span>
                  </div>

                  <div className="mt-2 space-y-2">
                    {dayActivities.map((activity) => {
                      const style = getActivityStyle(activity);
                      const detail = getActivityDetail(activity);

                      return (
                        <div key={activity.id} className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 ${style.bg} ${style.text} rounded`}
                          >
                            {style.label}
                          </span>
                          <span className="text-sm text-[#6B7684]">{detail}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-[#8B95A1]">
          활동 기록이 없습니다
        </div>
      )}
    </div>
  );
}
