/**
 * useBackofficeModals - 강사 대시보드 모달 상태 관리 훅
 *
 * BackofficeDemo.tsx에서 모달 상태 로직을 분리
 * - 월간 캘린더, 진도, 출결, 숙제 모달 상태
 * - 모달별 열기/닫기 핸들러
 */
import { useState, useCallback } from 'react';
import type { AttendanceStudent, AttendanceStatus } from '../components/backoffice/modals';

// 출결 모달에 전달할 반 정보
interface AttendanceClassInfo {
  classId: string;
  className: string;
  time: string;
  students: AttendanceStudent[];
}

// 숙제 모달에 전달할 반 정보
interface HomeworkClassInfo {
  classId: string;
  className: string;
  range: string;
  students: { id: string; name: string; completed: boolean }[];
}

interface UseBackofficeModalsResult {
  // 월간 캘린더 모달
  monthlyModalOpen: boolean;
  openMonthlyModal: () => void;
  closeMonthlyModal: () => void;

  // 진도 모달
  progressModalOpen: boolean;
  openProgressModal: () => void;
  closeProgressModal: () => void;

  // 출결 모달
  attendanceModalOpen: boolean;
  selectedAttendanceClass: AttendanceClassInfo | null;
  openAttendanceModal: (classInfo: AttendanceClassInfo) => void;
  closeAttendanceModal: () => void;

  // 숙제 모달
  homeworkModalOpen: boolean;
  selectedHomeworkClass: HomeworkClassInfo | null;
  openHomeworkModal: (classInfo: HomeworkClassInfo) => void;
  closeHomeworkModal: () => void;

  // 선택된 반 ID (진도 모달용)
  selectedClassId: string | null;
  setSelectedClassId: (id: string | null) => void;
}

export function useBackofficeModals(): UseBackofficeModalsResult {
  // 모달 상태
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);

  // 모달에 전달할 데이터
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<AttendanceClassInfo | null>(null);
  const [selectedHomeworkClass, setSelectedHomeworkClass] = useState<HomeworkClassInfo | null>(null);

  // 월간 캘린더 모달
  const openMonthlyModal = useCallback(() => setMonthlyModalOpen(true), []);
  const closeMonthlyModal = useCallback(() => setMonthlyModalOpen(false), []);

  // 진도 모달
  const openProgressModal = useCallback(() => setProgressModalOpen(true), []);
  const closeProgressModal = useCallback(() => setProgressModalOpen(false), []);

  // 출결 모달
  const openAttendanceModal = useCallback((classInfo: AttendanceClassInfo) => {
    setSelectedAttendanceClass(classInfo);
    setAttendanceModalOpen(true);
  }, []);
  const closeAttendanceModal = useCallback(() => {
    setAttendanceModalOpen(false);
  }, []);

  // 숙제 모달
  const openHomeworkModal = useCallback((classInfo: HomeworkClassInfo) => {
    setSelectedHomeworkClass(classInfo);
    setHomeworkModalOpen(true);
  }, []);
  const closeHomeworkModal = useCallback(() => {
    setHomeworkModalOpen(false);
  }, []);

  return {
    monthlyModalOpen,
    openMonthlyModal,
    closeMonthlyModal,
    progressModalOpen,
    openProgressModal,
    closeProgressModal,
    attendanceModalOpen,
    selectedAttendanceClass,
    openAttendanceModal,
    closeAttendanceModal,
    homeworkModalOpen,
    selectedHomeworkClass,
    openHomeworkModal,
    closeHomeworkModal,
    selectedClassId,
    setSelectedClassId,
  };
}

export default useBackofficeModals;
export type { AttendanceClassInfo, HomeworkClassInfo };
