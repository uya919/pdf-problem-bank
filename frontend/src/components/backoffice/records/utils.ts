/**
 * RecordsPage 공통 유틸 함수
 */
import type { ClassWithDetails } from '../../../types/database';
import type { ClassInfo } from './types';
import { CLASS_COLORS } from './types';

/** 반 이름에서 짧은 이름 추출 (예: "중3A반" → "3A") */
export function getShortName(name: string): string {
  const match = name.match(/[가-힣]*(\d+[A-Za-z]?)/);
  return match ? match[1] : name.slice(0, 2);
}

/** ClassWithDetails → ClassInfo 변환 */
export function toClassInfo(cls: ClassWithDetails, index: number): ClassInfo {
  return {
    id: cls.id,
    name: cls.name,
    shortName: getShortName(cls.name),
    color: CLASS_COLORS[index % CLASS_COLORS.length],
    studentCount: cls.student_count || 0,
  };
}

/** 날짜 포맷 (한글) */
export function formatDate(date: Date): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}

/** 날짜 문자열 변환 (YYYY-MM-DD) */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}
