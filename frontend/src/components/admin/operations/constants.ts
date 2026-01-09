/**
 * OperationsPage 공통 상수
 */
import {
  BookOpen,
  Calendar,
  Users,
  RefreshCw,
  Wallet,
  BarChart3,
  FileText,
  TrendingUp,
  Settings,
  Bell,
  Scroll,
} from 'lucide-react';
import type { MenuSection, AcademySetting, SyncHistoryRecord } from './types';
import React from 'react';

// 운영 메뉴 구조
export const MENU_SECTIONS: MenuSection[] = [
  {
    title: '운영 도구',
    items: [
      { id: 'classes', icon: React.createElement(BookOpen, { className: 'w-5 h-5' }), label: '반 관리' },
      { id: 'schedule', icon: React.createElement(Calendar, { className: 'w-5 h-5' }), label: '시간표 관리' },
      { id: 'rotation', icon: React.createElement(RefreshCw, { className: 'w-5 h-5' }), label: '순환수업' },
      { id: 'users', icon: React.createElement(Users, { className: 'w-5 h-5' }), label: '사용자 관리' },
      { id: 'textbooks', icon: React.createElement(Scroll, { className: 'w-5 h-5' }), label: '교재 관리' },
      { id: 'students', icon: React.createElement(Users, { className: 'w-5 h-5' }), label: '학생 관리' },
    ],
  },
  {
    title: '데이터 관리',
    items: [
      { id: 'sync', icon: React.createElement(RefreshCw, { className: 'w-5 h-5' }), label: '메이크에듀 동기화' },
    ],
  },
  {
    title: '재무',
    items: [
      { id: 'payment', icon: React.createElement(Wallet, { className: 'w-5 h-5' }), label: '수납 관리', badge: '12', badgeType: 'warning' as const },
      { id: 'revenue', icon: React.createElement(BarChart3, { className: 'w-5 h-5' }), label: '매출 리포트' },
    ],
  },
  {
    title: '리포트',
    items: [
      { id: 'parent-report', icon: React.createElement(FileText, { className: 'w-5 h-5' }), label: '학부모 리포트', badge: 'NEW', badgeType: 'info' as const },
      { id: 'analytics', icon: React.createElement(TrendingUp, { className: 'w-5 h-5' }), label: '성과 분석' },
    ],
  },
  {
    title: '설정',
    items: [
      { id: 'academy-settings', icon: React.createElement(Settings, { className: 'w-5 h-5' }), label: '학원 설정' },
      { id: 'notification', icon: React.createElement(Bell, { className: 'w-5 h-5' }), label: '알림 설정' },
    ],
  },
];

// Mock 학원 설정
export const MOCK_SETTINGS: AcademySetting[] = [
  { id: 's1', category: '기본 정보', label: '학원명', value: '혜윰학원', editable: true },
  { id: 's2', category: '기본 정보', label: '대표자', value: '홍길동', editable: true },
  { id: 's3', category: '기본 정보', label: '주소', value: '서울시 강남구 테헤란로 123', editable: true },
  { id: 's4', category: '기본 정보', label: '연락처', value: '02-1234-5678', editable: true },
  { id: 's5', category: '운영 시간', label: '평일 운영', value: '10:00 ~ 22:00', editable: true },
  { id: 's6', category: '운영 시간', label: '토요일 운영', value: '10:00 ~ 18:00', editable: true },
  { id: 's7', category: '운영 시간', label: '일요일 운영', value: '휴무', editable: true },
  { id: 's8', category: '수업 설정', label: '수업 단위', value: '50분', editable: true },
  { id: 's9', category: '수업 설정', label: '쉬는 시간', value: '10분', editable: true },
  { id: 's10', category: '수업 설정', label: '최대 정원', value: '15명', editable: true },
  { id: 's11', category: '알림 설정', label: '출결 알림', value: '활성화', editable: true },
  { id: 's12', category: '알림 설정', label: '숙제 알림', value: '활성화', editable: true },
];

// Mock 동기화 기록
export const MOCK_SYNC_HISTORY: SyncHistoryRecord[] = [
  { id: '1', date: '2025-12-15 10:30', new: 2, updated: 1, deleted: 0 },
  { id: '2', date: '2025-12-14 09:00', new: 0, updated: 0, deleted: 0 },
  { id: '3', date: '2025-12-13 11:20', new: 1, updated: 0, deleted: 0 },
  { id: '4', date: '2025-12-12 14:45', new: 3, updated: 2, deleted: 1 },
];

// 동기화 단계 메시지
export const STEP_MESSAGES: Record<string, { icon: string; label: string }> = {
  connecting: { icon: '🔗', label: '메이크에듀 연결 중...' },
  logging_in: { icon: '🔐', label: '로그인 중...' },
  scraping: { icon: '📥', label: '학생 데이터 수집 중...' },
  syncing: { icon: '🔄', label: '변경사항 분석 중...' },
  completed: { icon: '✅', label: '완료!' },
};

// 동기화 상수
export const POLLING_INTERVAL = 2000;
export const MAX_POLLING_TIME = 120000;
