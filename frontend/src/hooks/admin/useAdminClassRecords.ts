/**
 * 반별 기록 훅
 *
 * useClassProgressRecords - 반별 진도/숙제 기록 조회
 * useClassSummary - 반별 요약 통계 조회
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ClassProgressRecord, ProgressRow, HomeworkRow } from './types';

// =====================================================
// 반별 기록 훅
// =====================================================

/**
 * 반별 진도/숙제 기록 조회
 *
 * 새 스키마: progress (start_page, end_page), homework (page_range)
 */
export function useClassProgressRecords(
  classId: string | null,
  options?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: ['classProgressRecords', classId, options?.startDate, options?.endDate],
    queryFn: async (): Promise<ClassProgressRecord[]> => {
      if (!classId) return [];

      // 1. 진도 기록 조회 (새 스키마: start_page, end_page)
      let progressQuery = supabase
        .from('progress')
        .select('id, class_id, date, textbook, start_page, end_page, topic, note')
        .eq('class_id', classId)
        .order('date', { ascending: true });

      if (options?.startDate) {
        progressQuery = progressQuery.gte('date', options.startDate);
      }
      if (options?.endDate) {
        progressQuery = progressQuery.lte('date', options.endDate);
      }

      const { data: progressRaw, error: progressError } = await progressQuery;
      if (progressError) throw progressError;

      // 2. 숙제 기록 조회 (새 스키마: textbook, page_range)
      let homeworkQuery = supabase
        .from('homework')
        .select('id, class_id, textbook, page_range, description, due_date, assigned_date')
        .eq('class_id', classId)
        .order('due_date', { ascending: true });

      if (options?.startDate) {
        homeworkQuery = homeworkQuery.gte('due_date', options.startDate);
      }
      if (options?.endDate) {
        homeworkQuery = homeworkQuery.lte('due_date', options.endDate);
      }

      const { data: homeworkRaw, error: homeworkError } = await homeworkQuery;
      if (homeworkError) throw homeworkError;

      // 타입 단언
      const progressData = (progressRaw || []) as unknown as ProgressRow[];
      const homeworkData = (homeworkRaw || []) as unknown as HomeworkRow[];

      // 3. 날짜별로 합치기
      const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dateMap = new Map<string, ClassProgressRecord>();

      // 진도 데이터 처리 (start_page, end_page 직접 사용)
      progressData.forEach((p) => {
        const date = new Date(p.date);
        const dateKey = p.date;
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

        const record = dateMap.get(dateKey) || {
          date: dateLabel,
          weekday: weekdays[date.getDay()],
        };

        record.progress = {
          textbook: p.textbook || '미등록',
          pageStart: p.start_page || 0,
          pageEnd: p.end_page || 0,
          topic: p.topic || undefined,
        };

        dateMap.set(dateKey, record);
      });

      // 숙제 데이터 처리 (page_range에서 추출)
      homeworkData.forEach((h) => {
        const date = new Date(h.due_date);
        const dateKey = h.due_date;
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;

        // page_range에서 페이지 범위 추출 (예: "p.83-86")
        const pageMatch = h.page_range?.match(/(\d+)\s*[-~]\s*(\d+)/);
        const pageStart = pageMatch ? parseInt(pageMatch[1]) : 0;
        const pageEnd = pageMatch ? parseInt(pageMatch[2]) : 0;

        const record = dateMap.get(dateKey) || {
          date: dateLabel,
          weekday: weekdays[date.getDay()],
        };

        record.homework = {
          textbook: h.textbook || '미등록',
          pageStart,
          pageEnd,
        };

        dateMap.set(dateKey, record);
      });

      // 날짜순 정렬 후 반환
      return Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, record]) => record);
    },
    enabled: isSupabaseConfigured && !!classId,
    staleTime: 60 * 1000,
  });
}

/**
 * 반별 요약 통계 조회
 */
export function useClassSummary(
  classId: string | null,
  options?: { startDate?: string; endDate?: string }
) {
  const { data: records } = useClassProgressRecords(classId, options);

  if (!records || records.length === 0) {
    return null;
  }

  // 수업 횟수 (진도 기록 있는 날)
  const classCount = records.filter((r) => r.progress).length;

  // 수업 요일
  const weekdays = [...new Set(records.filter((r) => r.progress).map((r) => r.weekday.replace('요일', '')))];
  const classDays = weekdays.join(', ');

  // 주간 진도량
  const weeklyProgress = records.reduce((sum, r) => {
    if (r.progress) {
      return sum + (r.progress.pageEnd - r.progress.pageStart + 1);
    }
    return sum;
  }, 0);

  // 주간 숙제량
  const weeklyHomework = records.reduce((sum, r) => {
    if (r.homework) {
      return sum + (r.homework.pageEnd - r.homework.pageStart + 1);
    }
    return sum;
  }, 0);

  const homeworkCount = records.filter((r) => r.homework).length;

  return {
    classCount,
    classDays,
    weeklyProgress,
    progressDiff: '+0', // TODO: 이전 주와 비교
    weeklyHomework,
    homeworkCount,
    submissionRate: 85, // TODO: 실제 제출률 계산
    submissionCount: '7/8', // TODO: 실제 제출 현황
  };
}
