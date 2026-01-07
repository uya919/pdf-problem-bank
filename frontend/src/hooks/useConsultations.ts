/**
 * 상담 관리 훅
 * Stage 33: 상담 관리 시스템
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConsultations,
  getConsultation,
  createConsultation,
  updateConsultation,
  deleteConsultation,
  confirmEnrollment,
  getEnrollmentCalendar,
  getStudentConsultations,
  confirmEnrollmentWithStudent,
} from '../api/consultations';
import type {
  Consultation,
  ConsultationFilters,
  CreateConsultationInput,
  UpdateConsultationInput,
} from '../types/consultation';

/**
 * 상담 목록 조회 훅
 */
export function useConsultations(filters?: ConsultationFilters) {
  return useQuery({
    queryKey: ['consultations', filters],
    queryFn: () => getConsultations(filters),
    staleTime: 1000 * 60 * 5, // 5분
  });
}

/**
 * 상담 상세 조회 훅
 */
export function useConsultation(id: string | null) {
  return useQuery({
    queryKey: ['consultation', id],
    queryFn: () => (id ? getConsultation(id) : null),
    enabled: !!id,
  });
}

/**
 * 상담 생성 훅
 */
export function useCreateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateConsultationInput) => createConsultation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
    },
  });
}

/**
 * 상담 수정 훅
 */
export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateConsultationInput }) =>
      updateConsultation(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
    },
  });
}

/**
 * 상담 삭제 훅
 */
export function useDeleteConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteConsultation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
    },
  });
}

/**
 * 등원 확정 훅
 */
export function useConfirmEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      consultationId,
      enrollmentDate,
    }: {
      consultationId: string;
      enrollmentDate: string;
    }) => confirmEnrollment(consultationId, enrollmentDate),
    onSuccess: (_, { consultationId }) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', consultationId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
      // 알림 관련 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
  });
}

/**
 * 캘린더용 등원 예정 조회 훅
 */
export function useEnrollmentCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['enrollment-calendar', startDate, endDate],
    queryFn: () => getEnrollmentCalendar(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5분
    enabled: !!startDate && !!endDate,
  });
}

/**
 * 학생별 상담 이력 조회 훅
 */
export function useStudentConsultations(studentId: string | null) {
  return useQuery({
    queryKey: ['student-consultations', studentId],
    queryFn: () => (studentId ? getStudentConsultations(studentId) : []),
    enabled: !!studentId,
  });
}

/**
 * Stage 34-C: 등원 확정 + 학생 자동 생성 훅
 * 신규상담에서 등원 확정 시 학생 자동 생성 및 반 배치
 */
export function useConfirmEnrollmentWithStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) =>
      confirmEnrollmentWithStudent(consultationId),
    onSuccess: (result) => {
      if (result.success) {
        // 관련 쿼리 무효화
        queryClient.invalidateQueries({ queryKey: ['consultations'] });
        queryClient.invalidateQueries({ queryKey: ['students'] });
        queryClient.invalidateQueries({ queryKey: ['class-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
      }
    },
  });
}

/**
 * Stage 33-Fix: 등원 완료 처리 훅
 * confirmed 상태에서 enrolled 상태로 변경
 */
export function useCompleteEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (consultationId: string) =>
      updateConsultation(consultationId, { enrollment_status: 'enrolled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-calendar'] });
    },
  });
}
