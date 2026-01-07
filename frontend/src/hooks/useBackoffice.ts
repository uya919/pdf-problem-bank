/**
 * useBackoffice - 백오피스 데이터 훅 모음
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// 타입 정의
interface ClassInfo {
  id: string;
  name: string;
  subject: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  teacher_id: string;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  status: string;
}

interface Progress {
  id: string;
  class_id: string;
  date: string;
  textbook: string;
  start_page: number;
  end_page: number;
  topic: string;
}

/**
 * 오늘 수업 목록 조회
 */
export function useTodayClasses(teacherId?: string) {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    const fetchClasses = async () => {
      try {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase().slice(0, 3);

        // Stage 35: 주담임, 부담임, 담임 모두 포함
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`);

        if (error) throw error;

        // 오늘 요일에 해당하는 수업만 필터링
        const todayClasses = (data || []).filter((c: ClassInfo) =>
          c.schedule?.some((s) => s.day === today)
        );

        setClasses(todayClasses);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [teacherId]);

  return { classes, loading, error };
}

/**
 * 반별 학생 목록 조회
 */
export function useClassStudents(classId: string) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('student:students(*)')
          .eq('class_id', classId)
          .eq('is_active', true);

        if (error) throw error;

        setStudents((data || []).map((d: any) => d.student));
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classId]);

  return { students, loading };
}

/**
 * 최근 진도 조회
 */
export function useLastProgress(classId: string) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('progress')
          .select('*')
          .eq('class_id', classId)
          .order('date', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        setProgress(data);
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [classId]);

  return { progress, loading };
}

/**
 * 진도 저장
 * hyeyum 스키마: pages는 문자열 (예: "p.42-45")
 */
export function useSaveProgress() {
  const [saving, setSaving] = useState(false);

  const saveProgress = async (data: {
    class_id: string;
    date: string;
    textbook: string;
    pages: string;  // hyeyum 스키마: "p.42-45" 형식
    topic: string;
    notes?: string;
    created_by?: string;
  }) => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('progress').insert(data);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    } finally {
      setSaving(false);
    }
  };

  return { saveProgress, saving };
}
