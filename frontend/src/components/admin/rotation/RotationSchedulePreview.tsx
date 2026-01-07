/**
 * 순환수업 일정 미리보기 탭
 * - 이번 주 순환수업 하이라이트
 * - 학년별 활동 카드
 * - 향후 일정 리스트
 */
import { ACTIVITY_TYPES, DAY_OF_WEEK_NAMES } from '../../../types/rotation';
import type { RotationActivity, RotationSchedule } from '../../../types/rotation';

interface RotationSchedulePreviewProps {
  schedule: RotationSchedule;
  activities: RotationActivity[];
  today: RotationActivity | null;
}

export function RotationSchedulePreview({
  schedule,
  activities,
  today,
}: RotationSchedulePreviewProps) {
  const dayName = DAY_OF_WEEK_NAMES[schedule.day_of_week];
  const startTime = schedule.start_time.slice(0, 5);
  const endTime = schedule.end_time.slice(0, 5);

  // 첫 번째 활동 (이번 주 또는 다음 예정)
  const nextActivity = activities[0];

  return (
    <div className="space-y-6">
      {/* 현재/다음 순환수업 하이라이트 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-600 font-medium">
              {today ? '오늘 순환수업' : '다음 순환수업'}
            </div>
            <div className="text-lg font-bold text-blue-900 mt-1">
              {nextActivity ? (
                <>
                  {formatDate(nextActivity.date)} ({dayName}) -{' '}
                  {nextActivity.isHoliday
                    ? '휴일'
                    : `${nextActivity.weekNumber}주차`}
                </>
              ) : (
                '일정 없음'
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600">
              {startTime} ~ {endTime}
            </div>
            <div className="text-xs text-blue-500 mt-1">
              {schedule.cycle_weeks}주 주기
            </div>
          </div>
        </div>
      </div>

      {/* 이번 주/다음 학년별 활동 */}
      {nextActivity && !nextActivity.isHoliday && nextActivity.activities.length > 0 && (
        <div className="bg-white rounded-xl border border-grey-200 p-4">
          <h3 className="font-bold text-grey-900 mb-4">
            {formatDate(nextActivity.date)} ({dayName}) 순환수업
            {nextActivity.isCarriedOver && (
              <span className="ml-2 text-xs text-orange-600 font-normal">
                (이월됨)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextActivity.activities.map((activity) => {
              const typeInfo = ACTIVITY_TYPES[activity.activityType];
              return (
                <div
                  key={activity.gradeId}
                  className={`p-4 rounded-xl border ${
                    activity.activityType === 'english_class'
                      ? 'bg-emerald-50 border-emerald-200'
                      : activity.activityType === 'math_class'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-white text-xs font-bold rounded ${
                        activity.activityType === 'english_class'
                          ? 'bg-emerald-500'
                          : activity.activityType === 'math_class'
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                    >
                      {activity.gradeName}
                    </span>
                    <span
                      className={`font-bold ${
                        activity.activityType === 'english_class'
                          ? 'text-emerald-900'
                          : activity.activityType === 'math_class'
                          ? 'text-blue-900'
                          : 'text-amber-900'
                      }`}
                    >
                      {activity.activityName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 향후 일정 리스트 */}
      <div className="bg-white rounded-xl border border-grey-200 p-4">
        <h3 className="font-bold text-grey-900 mb-4">향후 순환수업 일정</h3>

        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div
              key={activity.date}
              className={`flex items-center gap-4 p-3 rounded-lg border-l-4 ${
                activity.isHoliday
                  ? 'bg-red-50 border-red-400'
                  : index === 0
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-grey-50 border-grey-300'
              }`}
            >
              {/* 날짜 */}
              <div className="w-20 text-center flex-shrink-0">
                <div
                  className={`text-xs ${
                    activity.isHoliday ? 'text-red-500' : 'text-grey-500'
                  }`}
                >
                  {activity.isHoliday ? '휴일' : `${activity.weekNumber}주차`}
                </div>
                <div
                  className={`font-bold ${
                    activity.isHoliday
                      ? 'text-red-600 line-through'
                      : 'text-grey-900'
                  }`}
                >
                  {formatShortDate(activity.date)}
                </div>
                {activity.isCarriedOver && !activity.isHoliday && (
                  <div className="text-xs text-orange-500">(이월)</div>
                )}
              </div>

              {/* 활동 내용 */}
              {activity.isHoliday ? (
                <div className="flex-1">
                  <span className="text-sm text-red-600">
                    {activity.holidayReason} - 다음 주로 이월
                  </span>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                  {activity.activities.map((act) => (
                    <div key={act.gradeId} className="flex items-center gap-1">
                      <span className="w-8 text-xs font-bold text-grey-500">
                        {act.gradeName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          ACTIVITY_TYPES[act.activityType].bgClass
                        } ${ACTIVITY_TYPES[act.activityType].textClass}`}
                      >
                        {act.activityName.replace(' 수업', '').replace(' ', '')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 오늘 표시 */}
              {index === 0 && !activity.isHoliday && (
                <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                  {today ? '오늘' : '다음'}
                </span>
              )}
            </div>
          ))}

          {activities.length === 0 && (
            <div className="text-center py-8 text-grey-500">
              순환수업 일정이 없습니다.
              <br />
              패턴을 설정해주세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 날짜 포맷 헬퍼
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
