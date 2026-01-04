/**
 * 시험 관리 API
 * @module api/exams
 *
 * Stage 19-H: Supabase 연결 (2026-01-04)
 */

import { supabase } from '../lib/supabase';
import type {
  Exam,
  ExamDetail,
  ExamFilters,
  CreateExamInput,
  StudentAnswer,
  ExamResult,
  AnswerStatus,
} from '../types/exam';

// ===== API 함수 =====

/**
 * 시험 목록 조회
 */
export async function getExams(filters?: ExamFilters): Promise<Exam[]> {
  let query = supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: false });

  if (filters?.subject) {
    query = query.eq('subject', filters.subject);
  }
  if (filters?.grade) {
    query = query.eq('grade', filters.grade);
  }
  if (filters?.month) {
    query = query.gte('exam_date', `${filters.month}-01`)
                 .lt('exam_date', `${filters.month}-32`);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // 각 시험에 대한 통계 계산
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exams: Exam[] = await Promise.all(
    ((data || []) as any[]).map(async (exam) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: answers } = await (supabase as any)
        .from('exam_answers')
        .select('is_completed, total_score')
        .eq('exam_id', exam.id);

      const typedAnswers = (answers || []) as { is_completed: boolean; total_score: number }[];
      const totalStudents = typedAnswers.length;
      const completedAnswers = typedAnswers.filter(a => a.is_completed);
      const attendedCount = completedAnswers.length;
      const inputProgress = totalStudents > 0
        ? Math.round((attendedCount / totalStudents) * 100)
        : 0;
      const averageScore = completedAnswers.length > 0
        ? Math.round(completedAnswers.reduce((sum, a) => sum + (a.total_score || 0), 0) / completedAnswers.length)
        : undefined;

      return {
        id: exam.id,
        name: exam.name,
        exam_date: exam.exam_date,
        subject: exam.subject,
        grade: exam.grade,
        exam_type: exam.exam_type,
        total_questions: exam.total_questions,
        total_score: exam.total_score,
        status: exam.status,
        created_at: exam.created_at,
        attended_count: attendedCount,
        total_students: totalStudents,
        average_score: averageScore,
        input_progress: inputProgress,
      };
    })
  );

  return exams;
}

/**
 * 시험 상세 조회
 */
export async function getExamDetail(examId: string): Promise<ExamDetail> {
  // 시험 정보 조회
  const { data: examData, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();

  if (examError) throw examError;
  if (!examData) throw new Error('시험을 찾을 수 없습니다');

  // 답안 조회 (학생 정보 포함)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answersData, error: answersError } = await (supabase as any)
    .from('exam_answers')
    .select(`
      id,
      student_id,
      answers,
      total_score,
      is_completed,
      student:students(name)
    `)
    .eq('exam_id', examId);

  if (answersError) throw answersError;

  interface AnswerRow {
    id: string;
    student_id: string;
    answers: AnswerStatus[] | null;
    total_score: number | null;
    is_completed: boolean | null;
    student: { name: string } | null;
  }

  // StudentAnswer 형식으로 변환
  const answers: StudentAnswer[] = ((answersData || []) as AnswerRow[]).map(a => {
    const answersArray = (a.answers || []) as AnswerStatus[];
    const wrongQuestions: number[] = [];
    answersArray.forEach((status, idx) => {
      if (status === 'wrong') wrongQuestions.push(idx + 1);
    });

    return {
      student_id: a.student_id,
      student_name: a.student?.name || '알 수 없음',
      answers: answersArray,
      total_score: a.total_score || 0,
      wrong_questions: wrongQuestions,
      is_completed: a.is_completed || false,
    };
  });

  // 순위 계산
  const sortedAnswers = [...answers].sort((a, b) => b.total_score - a.total_score);
  const results: ExamResult[] = sortedAnswers.map((a, idx) => ({
    student_id: a.student_id,
    student_name: a.student_name,
    total_score: a.total_score,
    rank: idx + 1,
    wrong_questions: a.wrong_questions,
  }));

  // 통계 계산
  const completedAnswers = answers.filter(a => a.is_completed);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedExamData = examData as any;
  const exam: Exam = {
    id: typedExamData.id,
    name: typedExamData.name,
    exam_date: typedExamData.exam_date,
    subject: typedExamData.subject,
    grade: typedExamData.grade,
    exam_type: typedExamData.exam_type,
    total_questions: typedExamData.total_questions,
    total_score: typedExamData.total_score,
    status: typedExamData.status,
    created_at: typedExamData.created_at,
    attended_count: completedAnswers.length,
    total_students: answers.length,
    average_score: completedAnswers.length > 0
      ? Math.round(completedAnswers.reduce((sum, a) => sum + a.total_score, 0) / completedAnswers.length)
      : undefined,
    input_progress: answers.length > 0
      ? Math.round((completedAnswers.length / answers.length) * 100)
      : 0,
  };

  return { exam, answers, results };
}

/**
 * 시험 생성
 */
export async function createExam(input: CreateExamInput): Promise<Exam> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exams')
    .insert({
      name: input.name,
      exam_date: input.exam_date,
      subject: input.subject,
      grade: input.grade,
      exam_type: input.exam_type,
      total_questions: input.total_questions,
      total_score: 100,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedData = data as any;
  return {
    id: typedData.id,
    name: typedData.name,
    exam_date: typedData.exam_date,
    subject: typedData.subject,
    grade: typedData.grade,
    exam_type: typedData.exam_type,
    total_questions: typedData.total_questions,
    total_score: typedData.total_score,
    status: typedData.status,
    created_at: typedData.created_at,
    attended_count: 0,
    total_students: 0,
    input_progress: 0,
  };
}

/**
 * 답안 저장 (O/X)
 */
export async function saveAnswers(
  examId: string,
  studentId: string,
  answers: AnswerStatus[]
): Promise<StudentAnswer> {
  // 시험 정보 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: examData, error: examError } = await (supabase as any)
    .from('exams')
    .select('total_questions')
    .eq('id', examId)
    .single();

  if (examError) throw examError;

  // 점수 계산
  const correctCount = answers.filter(a => a === 'correct').length;
  const scorePerQuestion = 100 / (examData?.total_questions || 1);
  const totalScore = Math.round(correctCount * scorePerQuestion);
  const isCompleted = !answers.includes('none');

  // 오답 번호 계산
  const wrongQuestions: number[] = [];
  answers.forEach((a, idx) => {
    if (a === 'wrong') wrongQuestions.push(idx + 1);
  });

  // upsert (있으면 업데이트, 없으면 삽입)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('exam_answers')
    .upsert({
      exam_id: examId,
      student_id: studentId,
      answers: answers,
      total_score: totalScore,
      is_completed: isCompleted,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'exam_id,student_id',
    })
    .select(`
      student_id,
      student:students(name)
    `)
    .single();

  if (error) throw error;

  // 시험 상태 업데이트 (모든 답안 완료 시 completed로 변경)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allAnswers } = await (supabase as any)
    .from('exam_answers')
    .select('is_completed')
    .eq('exam_id', examId);

  const typedAllAnswers = (allAnswers || []) as { is_completed: boolean }[];
  const allCompleted = typedAllAnswers.every(a => a.is_completed);
  const newStatus = allCompleted ? 'completed' : 'scoring';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('exams')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', examId);

  return {
    student_id: studentId,
    student_name: (data?.student as { name: string } | null)?.name || '알 수 없음',
    answers: answers,
    total_score: totalScore,
    wrong_questions: wrongQuestions,
    is_completed: isCompleted,
  };
}

/**
 * 반배정 적용
 */
export async function applyClassAssignment(
  examId: string,
  assignments: { studentId: string; className: string }[]
): Promise<void> {
  // 반배정은 학생 테이블의 class를 업데이트
  // 여기서는 로그만 남기고 실제 구현은 추후
  console.log('반배정 적용:', { examId, assignments });

  // TODO: 실제 반배정 로직 구현
  // - enrollments 테이블에서 학생의 반 업데이트
  // - 또는 별도의 exam_class_assignments 테이블 생성
}

/**
 * 시험 삭제
 */
export async function deleteExam(examId: string): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId);

  if (error) throw error;
}

/**
 * 시험 상태 변경
 */
export async function updateExamStatus(
  examId: string,
  status: 'draft' | 'scoring' | 'completed'
): Promise<void> {
  const { error } = await supabase
    .from('exams')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', examId);

  if (error) throw error;
}

export const examApi = {
  getExams,
  getExamDetail,
  createExam,
  saveAnswers,
  applyClassAssignment,
  deleteExam,
  updateExamStatus,
};
