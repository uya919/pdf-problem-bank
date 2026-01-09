/**
 * OperationsPage 공통 타입 정의
 */
import { ReactNode } from 'react';

// 메뉴 아이템 타입
export interface MenuItem {
  id: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  badgeType?: 'warning' | 'info';
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

// 학원 설정 타입
export interface AcademySetting {
  id: string;
  category: string;
  label: string;
  value: string;
  editable: boolean;
}

// 동기화 관련 타입
export type SyncStep = 'idle' | 'loading' | 'preview' | 'executing' | 'completed' | 'error';

export interface SyncHistoryRecord {
  id: string;
  date: string;
  new: number;
  updated: number;
  deleted: number;
}

// 승급 모달 스텝 타입
export type PromotionStep = 'preview' | 'confirm' | 'result' | 'assign';

// 미배정 학생 타입
export interface UnassignedStudent {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  previousClassName: string;
  newGrade: string;
  reason: string;
}
