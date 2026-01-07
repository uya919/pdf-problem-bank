/**
 * useHolidays - 공휴일 및 휴강 관리 훅
 *
 * Stage 30: 공휴일 자동 휴강 시스템
 *
 * 기능:
 * - 특정 날짜의 휴강 여부 확인
 * - 공휴일 목록 조회
 * - 휴강 예외 관리 (관리자용)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// =====================================================
// 타입 정의
// =====================================================

export interface Holiday {
  id: string;
  date: string;
  name: string;
  year: number;
  is_substitute: boolean;
}

export interface HolidayException {
  id: string;
  date: string;
  is_open: boolean;
  reason: string | null;
  created_by: string | null;
}

export interface HolidayStatus {
  isHoliday: boolean;
  holidayName: string | null;
  hasException: boolean;
}

// =====================================================
// 공휴일별 이모지 매핑
// =====================================================

const HOLIDAY_EMOJIS: Record<string, string> = {
  '설날': '🧧',
  '추석': '🌕',
  '크리스마스': '🎄',
  '어린이날': '🎈',
  '광복절': '🇰🇷',
  '삼일절': '🇰🇷',
  '현충일': '🕯️',
  '개천절': '🇰🇷',
  '한글날': '🇰🇷',
  '신정': '🎉',
  '부처님오신날': '🪷',
};

export function getHolidayEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(HOLIDAY_EMOJIS)) {
    if (name.includes(key)) return emoji;
  }
  return '🎉';
}

// =====================================================
// 휴강 여부 확인 함수 (단일 날짜)
// =====================================================

export async function checkHolidayStatus(date: string): Promise<HolidayStatus> {
  // 1. 예외 테이블 확인 (관리자 설정 우선)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exception } = await (supabase as any)
    .from('holiday_exceptions')
    .select('is_open, reason')
    .eq('date', date)
    .maybeSingle();

  // 예외가 있고 is_open=true면 수업 있음
  if ((exception as HolidayException | null)?.is_open) {
    return { isHoliday: false, holidayName: null, hasException: true };
  }

  // 2. 공휴일 테이블 확인
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: holiday } = await (supabase as any)
    .from('holidays')
    .select('name')
    .eq('date', date)
    .maybeSingle();

  if (holiday) {
    return { isHoliday: true, holidayName: (holiday as Holiday).name, hasException: false };
  }

  // 3. 공휴일 아님 → 정상 수업
  return { isHoliday: false, holidayName: null, hasException: false };
}

// =====================================================
// React Query 훅
// =====================================================

/**
 * 특정 날짜의 휴강 여부 조회
 */
export function useHolidayStatus(date: string) {
  return useQuery({
    queryKey: ['holidayStatus', date],
    queryFn: () => checkHolidayStatus(date),
    staleTime: 1000 * 60 * 5, // 5분 캐시
    enabled: !!date,
  });
}

/**
 * 연간 공휴일 목록 조회
 */
export function useHolidays(year: number) {
  return useQuery({
    queryKey: ['holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', year)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Holiday[];
    },
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

/**
 * 휴강 예외 목록 조회
 */
export function useHolidayExceptions(year?: number) {
  return useQuery({
    queryKey: ['holidayExceptions', year],
    queryFn: async () => {
      let query = supabase
        .from('holiday_exceptions')
        .select('*')
        .order('date', { ascending: true });

      if (year) {
        query = query
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HolidayException[];
    },
  });
}

/**
 * 휴강 예외 토글 (수업 있음 ↔ 휴강)
 */
export function useToggleHolidayException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, isOpen, reason }: { date: string; isOpen: boolean; reason?: string }) => {
      if (isOpen) {
        // 수업 있음으로 변경 → 예외 추가
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('holiday_exceptions')
          .upsert({
            date,
            is_open: true,
            reason: reason || '수업 진행',
          }, { onConflict: 'date' });

        if (error) throw error;
      } else {
        // 휴강으로 변경 → 예외 삭제
        const { error } = await supabase
          .from('holiday_exceptions')
          .delete()
          .eq('date', date);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      // 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['holidayStatus', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['holidayExceptions'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

/**
 * 월별 공휴일 + 예외 통합 조회 (캘린더용)
 */
export function useMonthHolidayStatus(year: number, month: number) {
  return useQuery({
    queryKey: ['monthHolidayStatus', year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

      // 공휴일 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: holidays } = await (supabase as any)
        .from('holidays')
        .select('date, name')
        .gte('date', startDate)
        .lte('date', endDate);

      // 예외 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: exceptions } = await (supabase as any)
        .from('holiday_exceptions')
        .select('date, is_open')
        .gte('date', startDate)
        .lte('date', endDate);

      // 날짜별 상태 맵 생성
      const statusMap: Record<string, HolidayStatus> = {};

      // 공휴일 먼저 설정
      (holidays as Array<{ date: string; name: string }> | null)?.forEach(h => {
        statusMap[h.date] = {
          isHoliday: true,
          holidayName: h.name,
          hasException: false,
        };
      });

      // 예외로 오버라이드
      (exceptions as Array<{ date: string; is_open: boolean }> | null)?.forEach(e => {
        if (statusMap[e.date] && e.is_open) {
          statusMap[e.date] = {
            isHoliday: false,
            holidayName: statusMap[e.date].holidayName,
            hasException: true,
          };
        }
      });

      return statusMap;
    },
    staleTime: 1000 * 60 * 5,
  });
}
