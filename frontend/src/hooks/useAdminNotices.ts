/**
 * 관리자 공지사항 데이터 훅
 *
 * Stage 13: PC 대시보드 캘린더 UI
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 * Stage 17-B: isImportant 필드 지원 (캘린더 미리보기)
 *
 * 주간/월간 캘린더에 표시할 공지사항 데이터 조회
 * - Supabase notices 테이블 연동
 * - 권한별 필터링 (admin, teacher, all)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Notice, NoticesByDate, WeekRange, NoticeVisibility, MonthRange } from '@/types/admin';
import { IMPORTANT_NOTICE_TYPES } from '@/types/admin';
import { getMonthDateRange } from '@/utils/weekUtils';

// =====================================================
// 타입 정의
// =====================================================

/** Supabase notices 테이블 행 타입 */
interface NoticeRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  priority: number;
  visibility: string;
  is_important: boolean;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
  target_class_ids: string[] | null;  // Stage 35: 특정 반 담당자만 볼 수 있도록
}

/**
 * DB 행 → Notice 타입 변환
 */
function rowToNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    type: row.type as Notice['type'],
    priority: row.priority || 0,
    visibility: row.visibility as Notice['visibility'],
    isImportant: row.is_important ?? false,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    isActive: row.is_active,
    targetClassIds: row.target_class_ids ?? undefined,  // Stage 35
  };
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * 공지 배열을 날짜별 맵으로 변환
 */
function groupNoticesByDate(notices: Notice[]): NoticesByDate {
  const grouped: NoticesByDate = {};

  notices.forEach((notice) => {
    if (!grouped[notice.date]) {
      grouped[notice.date] = [];
    }
    grouped[notice.date].push(notice);
  });

  // 각 날짜별로 priority 기준 정렬 (높은 우선순위 먼저)
  Object.keys(grouped).forEach((date) => {
    grouped[date].sort((a, b) => b.priority - a.priority);
  });

  return grouped;
}

/**
 * 권한에 따라 공지 필터링
 */
function filterByVisibility(notices: Notice[], userRole: 'admin' | 'teacher'): Notice[] {
  return notices.filter((notice) => {
    if (notice.visibility === 'all') return true;
    if (notice.visibility === 'admin' && userRole === 'admin') return true;
    if (notice.visibility === 'teacher' && userRole === 'teacher') return true;
    // admin은 teacher 공지도 볼 수 있음
    if (notice.visibility === 'teacher' && userRole === 'admin') return true;
    return false;
  });
}

// =====================================================
// 공지사항 훅
// =====================================================

interface UseAdminNoticesOptions {
  weekRange?: WeekRange;
  enabled?: boolean;
  userRole?: 'admin' | 'teacher'; // 기본값: admin (PC 대시보드)
  myClassIds?: string[];  // Stage 35: 강사 담당 반 ID 목록 (target_class_ids 필터링용)
}

/**
 * 주간 공지사항 조회 훅
 *
 * @param options.weekRange - 조회할 주간 범위 (미지정 시 이번 주)
 * @param options.enabled - 쿼리 활성화 여부
 * @param options.userRole - 사용자 권한 (기본: admin)
 * @param options.myClassIds - Stage 35: 강사 담당 반 ID 목록 (target_class_ids 필터링용)
 */
export function useAdminNotices(options: UseAdminNoticesOptions = {}) {
  const { weekRange, enabled = true, userRole = 'admin', myClassIds } = options;

  return useQuery({
    queryKey: ['admin', 'notices', weekRange?.start, weekRange?.end, userRole, myClassIds?.join(',')],
    queryFn: async (): Promise<NoticesByDate> => {
      // Supabase 연결 확인
      if (!isSupabaseConfigured) {
        return {};
      }

      try {
        // notices 테이블 조회
        let query = supabase
          .from('notices')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false });

        // 주간 범위 필터
        if (weekRange) {
          query = query
            .gte('date', weekRange.start)
            .lte('date', weekRange.end);
        }

        // 권한별 필터
        const visibilityFilter: NoticeVisibility[] =
          userRole === 'admin'
            ? ['all', 'admin', 'teacher']
            : ['all', 'teacher'];

        query = query.in('visibility', visibilityFilter);

        const { data, error } = await query;

        if (error) {
          console.warn('[useAdminNotices] 조회 실패:', error.message);
          return {};
        }

        if (!data || data.length === 0) {
          return {};
        }

        let notices = (data as NoticeRow[]).map(rowToNotice);

        // Stage 35: target_class_ids 필터링
        // - 관리자: 모든 공지 볼 수 있음
        // - 강사: target_class_ids가 없는 공지 + 본인 담당 반이 포함된 공지만
        if (userRole === 'teacher' && myClassIds && myClassIds.length > 0) {
          notices = notices.filter((notice) => {
            // target_class_ids가 없으면 모든 강사가 볼 수 있음
            if (!notice.targetClassIds || notice.targetClassIds.length === 0) {
              return true;
            }
            // target_class_ids가 있으면 본인 담당 반이 포함되어 있어야 함
            return notice.targetClassIds.some((classId) => myClassIds.includes(classId));
          });
        }

        return groupNoticesByDate(notices);
      } catch (err) {
        console.warn('[useAdminNotices] 예외 발생:', err);
        return {};
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1분 캐시
  });
}

/**
 * 특정 날짜의 공지사항 조회 훅
 */
export function useAdminNoticesByDate(
  date: string,
  userRole: 'admin' | 'teacher' = 'admin',
  myClassIds?: string[]
) {
  const { data: noticesByDate, ...rest } = useAdminNotices({ userRole, myClassIds });

  return {
    data: noticesByDate?.[date] || [],
    ...rest,
  };
}

/**
 * 특정 날짜의 공지를 중요/일반으로 분리하여 조회
 *
 * @param date - 조회할 날짜 (YYYY-MM-DD)
 * @param userRole - 사용자 권한
 * @param myClassIds - Stage 35: 강사 담당 반 ID 목록
 * @returns { important, general, isLoading, ... }
 */
export function useNoticesByImportance(
  date: string,
  userRole: 'admin' | 'teacher' = 'admin',
  myClassIds?: string[]
) {
  const { data: allNotices, isLoading, ...rest } = useAdminNoticesByDate(date, userRole, myClassIds);

  // 중요 알림 (긴급, 휴원, 결석)
  const important = allNotices.filter((n) =>
    IMPORTANT_NOTICE_TYPES.includes(n.type)
  );

  // 일반 공지 (시험, 특강, 행사, 운영)
  const general = allNotices.filter((n) =>
    !IMPORTANT_NOTICE_TYPES.includes(n.type)
  );

  return {
    important,
    general,
    all: allNotices,
    isLoading,
    ...rest,
  };
}

/**
 * 주간 범위 내 공지 있는 날짜 목록 조회
 * (캘린더 뱃지 표시용)
 */
export function useNoticesInWeek(weekRange: WeekRange, userRole: 'admin' | 'teacher' = 'admin') {
  const { data: noticesByDate, ...rest } = useAdminNotices({ weekRange, userRole });

  // 날짜별 공지 존재 여부 + 가장 높은 우선순위 공지 타입
  const dateNoticeInfo = Object.entries(noticesByDate || {}).reduce(
    (acc, [date, notices]) => {
      if (notices.length > 0) {
        // 가장 높은 우선순위 공지의 타입
        const topNotice = notices[0];
        acc[date] = {
          hasNotice: true,
          topType: topNotice.type,
          count: notices.length,
        };
      }
      return acc;
    },
    {} as Record<string, { hasNotice: boolean; topType: Notice['type']; count: number }>
  );

  return {
    dateNoticeInfo,
    ...rest,
  };
}

// =====================================================
// 월간 캘린더 훅 (Stage 20)
// =====================================================

interface UseMonthlyNoticesOptions {
  monthRange: MonthRange;
  enabled?: boolean;
  userRole?: 'admin' | 'teacher';
  myClassIds?: string[];  // Stage 35: 강사 담당 반 ID 목록 (target_class_ids 필터링용)
}

/**
 * 월간 공지사항 조회 훅
 *
 * @param options.monthRange - 조회할 월 범위
 * @param options.enabled - 쿼리 활성화 여부
 * @param options.userRole - 사용자 권한 (기본: admin)
 * @param options.myClassIds - Stage 35: 강사 담당 반 ID 목록 (target_class_ids 필터링용)
 */
export function useMonthlyNotices(options: UseMonthlyNoticesOptions) {
  const { monthRange, enabled = true, userRole = 'admin', myClassIds } = options;

  // 월간 날짜 범위 계산 (42일)
  const dateRange = getMonthDateRange(monthRange);

  return useQuery({
    queryKey: ['admin', 'notices', 'monthly', monthRange.year, monthRange.month, userRole, myClassIds?.join(',')],
    queryFn: async (): Promise<NoticesByDate> => {
      // Supabase 연결 확인
      if (!isSupabaseConfigured) {
        return {};
      }

      try {
        // notices 테이블 조회
        let query = supabase
          .from('notices')
          .select('*')
          .eq('is_active', true)
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .order('priority', { ascending: false });

        // 권한별 필터
        const visibilityFilter: NoticeVisibility[] =
          userRole === 'admin'
            ? ['all', 'admin', 'teacher']
            : ['all', 'teacher'];

        query = query.in('visibility', visibilityFilter);

        const { data, error } = await query;

        if (error) {
          console.warn('[useMonthlyNotices] 조회 실패:', error.message);
          return {};
        }

        if (!data || data.length === 0) {
          return {};
        }

        let notices = (data as NoticeRow[]).map(rowToNotice);

        // Stage 35: target_class_ids 필터링
        // - 관리자: 모든 공지 볼 수 있음
        // - 강사: target_class_ids가 없는 공지 + 본인 담당 반이 포함된 공지만
        if (userRole === 'teacher' && myClassIds && myClassIds.length > 0) {
          notices = notices.filter((notice) => {
            // target_class_ids가 없으면 모든 강사가 볼 수 있음
            if (!notice.targetClassIds || notice.targetClassIds.length === 0) {
              return true;
            }
            // target_class_ids가 있으면 본인 담당 반이 포함되어 있어야 함
            return notice.targetClassIds.some((classId) => myClassIds.includes(classId));
          });
        }

        return groupNoticesByDate(notices);
      } catch (err) {
        console.warn('[useMonthlyNotices] 예외 발생:', err);
        return {};
      }
    },
    enabled,
    staleTime: 60 * 1000, // 1분 캐시
  });
}

/**
 * 월간 중요 공지 정보 조회 (날짜별 공지 개수 + 중요 공지 미리보기)
 *
 * Stage 20: 월간 캘린더 뱃지 표시용
 * Stage 35: myClassIds로 강사 담당 반 필터링
 *
 * @returns 날짜별 { count: 공지 개수, importantPreview: 중요 공지 제목 미리보기 }
 */
export function useMonthlyImportantNotices(
  monthRange: MonthRange,
  userRole: 'admin' | 'teacher' = 'admin',
  myClassIds?: string[]
) {
  const { data: noticesByDate, ...rest } = useMonthlyNotices({
    monthRange,
    userRole,
    myClassIds,
  });

  // 날짜별 공지 정보 집계
  const monthlyInfo = Object.entries(noticesByDate || {}).reduce(
    (acc, [date, notices]) => {
      if (notices.length > 0) {
        // 중요 공지 (isImportant=true 또는 긴급/휴원/결석)
        const importantNotice = notices.find(
          (n) => n.isImportant || IMPORTANT_NOTICE_TYPES.includes(n.type)
        );

        acc[date] = {
          count: notices.length,
          importantPreview: importantNotice
            ? importantNotice.title.length > 8
              ? importantNotice.title.slice(0, 8) + '...'
              : importantNotice.title
            : null,
          hasImportant: !!importantNotice,
        };
      }
      return acc;
    },
    {} as Record<string, {
      count: number;
      importantPreview: string | null;
      hasImportant: boolean;
    }>
  );

  return {
    monthlyInfo,
    noticesByDate: noticesByDate || {},
    ...rest,
  };
}
