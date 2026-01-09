/**
 * 진도 관련 훅
 *
 * - useProgress: 진도 조회 (반별)
 * - useSaveProgress: 진도 저장
 * - useTodayProgress: 오늘 진도 현황
 * - useLastProgress: 마지막 진도
 * - useLastProgressBefore: 특정 날짜 이전 진도
 * - useProgressByDate: 날짜별 진도
 * - useProgressForTeacherByDate: 선생님별 날짜 진도
 * - useTextbooks: 교재 목록
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from './types';
import type { Progress, ProgressClassInfo, LastProgressWithHomework } from './types';

/**
 * 진도 조회 (반별)
 *
 * @param classId - 반 ID
 */
export function useProgress(classId: string | null) {
  return useQuery({
    queryKey: ['progress', classId],
    queryFn: async (): Promise<Progress[]> => {
      if (!classId) return [];

      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Progress[];
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}

/**
 * 진도 저장 mutation
 *
 * Stage 50: pages → start_page, end_page 분리 (Supabase 스키마 일치)
 * Stage 59: INSERT → UPSERT 변경 (기존 데이터 있으면 UPDATE)
 */
export function useSaveProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      class_id: string;
      date: string;
      textbook: string;
      startPage?: string;
      endPage?: string;
      topic?: string;
      notes?: string;
    }) => {
      // Stage 59d: 디버그 로그 - 저장 요청 확인
      console.log('[useSaveProgress] Input:', {
        class_id: data.class_id,
        date: data.date,
        topic: data.topic,
      });

      // Stage 59h: 기존 데이터 확인 (중복 시에도 안전하게 최신 1개만 조회)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingList } = await (supabase as any)
        .from('progress')
        .select('id')
        .eq('class_id', data.class_id)
        .eq('date', data.date)
        .order('created_at', { ascending: false })
        .limit(1);

      const existing = existingList?.[0] || null;

      // Stage 59d: 디버그 로그 - 기존 데이터 확인
      console.log('[useSaveProgress] Existing record:', existing);

      const progressData = {
        textbook: data.textbook,
        start_page: data.startPage ? parseInt(data.startPage, 10) : null,
        end_page: data.endPage ? parseInt(data.endPage, 10) : null,
        topic: data.topic || '',
        note: data.notes || '',
      };

      if (existing) {
        // UPDATE: 기존 레코드 수정
        console.log('[useSaveProgress] UPDATE id:', existing.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('progress')
          .update(progressData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // INSERT: 새 레코드 생성
        console.log('[useSaveProgress] INSERT new record');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from('progress').insert({
          class_id: data.class_id,
          date: data.date,
          ...progressData,
          created_by: null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Stage 59g: 저장한 날짜의 쿼리를 명시적으로 무효화하여 즉시 refetch
      console.log('[useSaveProgress] onSuccess - invalidating queries for:', {
        class_id: variables.class_id,
        date: variables.date,
      });

      // 모든 progress 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['textbooks'] });

      // 해당 날짜의 진도 쿼리 강제 refetch
      queryClient.refetchQueries({
        queryKey: ['progress', 'byDate', variables.class_id, variables.date],
      });
    },
    onError: (error) => {
      console.error('Progress save failed:', error);
    },
  });
}

/**
 * 오늘 진도 기록 현황 조회
 *
 * @param teacherId - 선생님 ID
 */
export function useTodayProgress(teacherId: string | null) {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['progress', 'today', teacherId, today],
    queryFn: async (): Promise<{ recorded: ProgressClassInfo[]; notRecorded: ProgressClassInfo[] }> => {
      if (!teacherId) return { recorded: [], notRecorded: [] };

      // Stage 35: 선생님의 오늘 수업 목록 (주담임, 부담임, 담임 모두 포함)
      const dow = new Date().getDay();
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .contains('day_of_week', [dow])
        .order('start_time');

      if (classError) throw classError;

      const typedClasses = (classes || []) as unknown as ProgressClassInfo[];

      const classIds = typedClasses.map((c) => c.id);
      if (classIds.length === 0) return { recorded: [], notRecorded: [] };

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('class_id')
        .eq('date', today)
        .in('class_id', classIds);

      if (progressError) throw progressError;

      const typedProgress = (progressData || []) as unknown as { class_id: string }[];
      const recordedClassIds = new Set(typedProgress.map((p) => p.class_id));
      return {
        recorded: typedClasses.filter((c) => recordedClassIds.has(c.id)),
        notRecorded: typedClasses.filter((c) => !recordedClassIds.has(c.id)),
      };
    },
    enabled: isSupabaseConfigured && !!teacherId,
  });
}

/**
 * 반의 마지막 진도 + 숙제 조회
 *
 * @param classId - 반 ID
 */
export function useLastProgress(classId: string | null) {
  return useQuery({
    queryKey: ['progress', 'last', classId],
    queryFn: async (): Promise<LastProgressWithHomework | null> => {
      if (!classId) return null;

      const { data: progressList, error } = await supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      const progress = progressList?.[0];
      if (!progress) return null;

      const typedProgress = progress as unknown as Progress;

      const { data: homeworkList } = await supabase
        .from('homework')
        .select('textbook, page_range, description')
        .eq('class_id', classId)
        .eq('assigned_date', typedProgress.date)
        .limit(1);

      const hw = (homeworkList?.[0] ?? null) as { textbook?: string; page_range?: string; description?: string } | null;

      return {
        ...typedProgress,
        homework: hw?.textbook && hw?.page_range ? `${hw.textbook} ${hw.page_range}` : null,
        homeworkDescription: hw?.description || null,
      };
    },
    enabled: isSupabaseConfigured && !!classId,
  });
}

/**
 * 특정 날짜 이전의 마지막 진도 + 숙제 조회
 *
 * @param classId - 반 ID
 * @param beforeDate - 이 날짜 이전 조회 (YYYY-MM-DD)
 */
export function useLastProgressBefore(
  classId: string | null,
  beforeDate: string | null
) {
  return useQuery({
    queryKey: ['progress', 'lastBefore', classId, beforeDate],
    queryFn: async (): Promise<LastProgressWithHomework | null> => {
      if (!classId || !beforeDate) return null;

      const { data: progressList, error } = await supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .lt('date', beforeDate)
        .order('date', { ascending: false })
        .limit(1);

      if (error) throw error;
      const progress = progressList?.[0];
      if (!progress) return null;

      const typedProgress = progress as unknown as Progress;

      const { data: homeworkList } = await supabase
        .from('homework')
        .select('textbook, page_range, description')
        .eq('class_id', classId)
        .eq('assigned_date', typedProgress.date)
        .limit(1);

      const hw = (homeworkList?.[0] ?? null) as { textbook?: string; page_range?: string; description?: string } | null;

      return {
        ...typedProgress,
        homework: hw?.textbook && hw?.page_range ? `${hw.textbook} ${hw.page_range}` : null,
        homeworkDescription: hw?.description || null,
      };
    },
    enabled: isSupabaseConfigured && !!classId && !!beforeDate,
  });
}

/**
 * 특정 날짜의 진도 + 숙제 조회
 *
 * @param classId - 반 ID
 * @param date - 날짜 (YYYY-MM-DD)
 */
export function useProgressByDate(classId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['progress', 'byDate', classId, date],
    queryFn: async (): Promise<LastProgressWithHomework | null> => {
      if (!classId || !date) return null;

      // Stage 59h: 해당 날짜 진도 (최신순 정렬하여 중복 시에도 안전)
      const { data: progressList, error } = await supabase
        .from('progress')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      const progress = progressList?.[0];
      if (!progress) return null;

      // 해당 날짜 숙제 조회
      const { data: homeworkList } = await supabase
        .from('homework')
        .select('textbook, page_range, description')
        .eq('class_id', classId)
        .eq('assigned_date', date)
        .limit(1);

      const hw = (homeworkList?.[0] ?? null) as { textbook?: string; page_range?: string; description?: string } | null;

      return {
        ...(progress as Progress),
        homework: hw?.textbook && hw?.page_range ? `${hw.textbook} ${hw.page_range}` : null,
        homeworkDescription: hw?.description || null,
      };
    },
    enabled: isSupabaseConfigured && !!classId && !!date,
  });
}

/**
 * 선택된 날짜의 진도 현황 조회
 *
 * @param teacherId - 선생님 ID
 * @param date - 선택된 날짜 (YYYY-MM-DD)
 */
export function useProgressForTeacherByDate(teacherId: string | null, date: string | null) {
  return useQuery({
    queryKey: ['progress', 'byDate', 'teacher', teacherId, date],
    queryFn: async (): Promise<{ recorded: ProgressClassInfo[]; notRecorded: ProgressClassInfo[] }> => {
      if (!teacherId || !date) return { recorded: [], notRecorded: [] };

      const targetDate = new Date(date);
      const dow = targetDate.getDay();

      // Stage 35-B: 선생님의 모든 담당 수업 가져온 후 역할별 요일 필터링
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time, teacher_id, assistant_teacher_id, homeroom_teacher_id, day_of_week, assistant_days, homeroom_days')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true)
        .order('start_time');

      if (classError) throw classError;

      interface ProgressClassRowWithRole {
        id: string;
        name: string;
        start_time: string | null;
        end_time: string | null;
        teacher_id: string | null;
        assistant_teacher_id: string | null;
        homeroom_teacher_id: string | null;
        day_of_week: number[] | null;
        assistant_days: number[] | null;
        homeroom_days: number[] | null;
      }

      // Stage 35-B: 역할별 요일 필터링
      const typedClasses = ((classes || []) as unknown as ProgressClassRowWithRole[]).filter((cls) => {
        if (cls.teacher_id === teacherId) {
          return cls.day_of_week?.includes(dow);
        }
        if (cls.assistant_teacher_id === teacherId) {
          return cls.assistant_days?.includes(dow);
        }
        if (cls.homeroom_teacher_id === teacherId) {
          return cls.homeroom_days?.includes(dow);
        }
        return false;
      }) as unknown as ProgressClassInfo[];

      const classIds = typedClasses.map((c) => c.id);
      if (classIds.length === 0) return { recorded: [], notRecorded: [] };

      const { data: progressData, error: progressError } = await supabase
        .from('progress')
        .select('class_id')
        .eq('date', date)
        .in('class_id', classIds);

      if (progressError) throw progressError;

      const typedProgress = (progressData || []) as unknown as { class_id: string }[];
      const recordedClassIds = new Set(typedProgress.map((p) => p.class_id));
      return {
        recorded: typedClasses.filter((c) => recordedClassIds.has(c.id)),
        notRecorded: typedClasses.filter((c) => !recordedClassIds.has(c.id)),
      };
    },
    enabled: isSupabaseConfigured && !!teacherId && !!date,
  });
}

/** 교재 목록 반환 타입 (그룹핑 지원) */
export interface TextbookList {
  /** 반에 연결된 교재 (최우선) */
  linked: string[];
  /** 이 반에서 최근 사용한 교재 */
  recent: string[];
  /** 전체 목록 (검색용) */
  all: string[];
}

/**
 * 교재 목록 조회 (자동완성용) - Stage 40 개선
 *
 * 개선 사항:
 * - 반 연결 교재 우선 표시
 * - 해당 반의 최근 진도에서 사용된 교재만 조회 (전체 X)
 * - 그룹핑 지원 (linked / recent / all)
 *
 * @param classId - 반 ID (필수로 변경)
 */
export function useTextbooks(classId?: string) {
  return useQuery({
    queryKey: ['textbooks', classId],
    queryFn: async (): Promise<string[]> => {
      const linkedTextbooks = new Set<string>();
      const recentTextbooks = new Set<string>();

      // 1. class_textbooks 테이블에서 반에 연결된 교재 (최우선)
      if (classId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: linkedData } = await (supabase as any)
            .from('class_textbooks')
            .select(`
              textbooks (
                display_name
              )
            `)
            .eq('class_id', classId);

          interface LinkedTextbookRow {
            textbooks: { display_name: string } | null;
          }
          const typedLinkedData = (linkedData || []) as LinkedTextbookRow[];

          typedLinkedData.forEach((row) => {
            if (row.textbooks?.display_name) {
              linkedTextbooks.add(row.textbooks.display_name);
            }
          });
        } catch (err) {
          console.warn('class_textbooks 조회 실패:', err);
        }
      }

      // 2. 해당 반의 최근 진도에서 사용된 교재만 조회 (Stage 40 핵심 수정)
      if (classId) {
        try {
          const { data: progressData } = await supabase
            .from('progress')
            .select('textbook')
            .eq('class_id', classId)  // ← 핵심: 해당 반만 조회
            .not('textbook', 'is', null)
            .order('date', { ascending: false })
            .limit(20);  // 최근 20개 진도만

          interface TextbookRow { textbook: string | null }
          const typedProgressData = (progressData || []) as unknown as TextbookRow[];

          typedProgressData.forEach((p) => {
            if (p.textbook && p.textbook.trim()) {
              // 반 연결 교재가 아닌 것만 최근 사용에 추가
              if (!linkedTextbooks.has(p.textbook)) {
                recentTextbooks.add(p.textbook);
              }
            }
          });
        } catch (err) {
          console.warn('progress 교재 조회 실패:', err);
        }
      }

      // 반 연결 교재 먼저, 그 다음 최근 사용 교재
      const result = [
        ...Array.from(linkedTextbooks).sort((a, b) => a.localeCompare(b, 'ko')),
        ...Array.from(recentTextbooks).sort((a, b) => a.localeCompare(b, 'ko')),
      ];

      return result;
    },
    enabled: isSupabaseConfigured && !!classId,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

/**
 * 교재 목록 조회 (그룹핑 버전) - Stage 40
 *
 * TextbookAutocomplete에서 그룹핑 UI에 사용
 */
export function useTextbooksGrouped(classId?: string) {
  return useQuery({
    queryKey: ['textbooks-grouped', classId],
    queryFn: async (): Promise<TextbookList> => {
      const linked: string[] = [];
      const recent: string[] = [];

      // 1. 반 연결 교재
      if (classId) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: linkedData } = await (supabase as any)
            .from('class_textbooks')
            .select(`textbooks (display_name)`)
            .eq('class_id', classId);

          interface LinkedTextbookRow {
            textbooks: { display_name: string } | null;
          }
          const typedLinkedData = (linkedData || []) as LinkedTextbookRow[];
          typedLinkedData.forEach((row) => {
            if (row.textbooks?.display_name) {
              linked.push(row.textbooks.display_name);
            }
          });
        } catch (err) {
          console.warn('class_textbooks 조회 실패:', err);
        }
      }

      // 2. 해당 반의 최근 사용 교재
      if (classId) {
        try {
          const { data: progressData } = await supabase
            .from('progress')
            .select('textbook')
            .eq('class_id', classId)
            .not('textbook', 'is', null)
            .order('date', { ascending: false })
            .limit(10);

          interface TextbookRow { textbook: string | null }
          const typedProgressData = (progressData || []) as unknown as TextbookRow[];
          const linkedSet = new Set(linked);
          const seen = new Set<string>();

          typedProgressData.forEach((p) => {
            if (p.textbook && p.textbook.trim() && !linkedSet.has(p.textbook) && !seen.has(p.textbook)) {
              recent.push(p.textbook);
              seen.add(p.textbook);
            }
          });
        } catch (err) {
          console.warn('progress 교재 조회 실패:', err);
        }
      }

      return {
        linked: linked.sort((a, b) => a.localeCompare(b, 'ko')),
        recent: recent.slice(0, 5),  // 최근 5개만
        all: [...linked, ...recent].sort((a, b) => a.localeCompare(b, 'ko')),
      };
    },
    enabled: isSupabaseConfigured && !!classId,
    staleTime: 5 * 60 * 1000,
  });
}
