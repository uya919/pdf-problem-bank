/**
 * AdminStudentsPage 상수 정의
 */
import type { Division, SubjectCode } from './types';

// 학부별 학년 목록
export const DIVISION_GRADES: Record<Exclude<Division, 'all'>, string[]> = {
  elementary: ['초3', '초4', '초5', '초6'],
  middle: ['중1', '중2', '중3'],
  high: ['고1', '고2', '고3'],
};

// 학부별 한글 이름
export const DIVISION_LABELS: Record<Division, string> = {
  all: '전체',
  elementary: '초등부',
  middle: '중등부',
  high: '고등부',
};

/** 과목별 설정 */
export const SUBJECT_CONFIG: Record<SubjectCode, {
  name: string;
  short: string;
  bgActive: string;
  bgInactive: string;
  textActive: string;
  textInactive: string;
  borderActive: string;
  borderInactive: string;
}> = {
  math: {
    name: '수학',
    short: '수',
    bgActive: 'bg-blue-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-blue-300',
    borderActive: 'border-blue-500',
    borderInactive: 'border-blue-200',
  },
  korean: {
    name: '국어',
    short: '국',
    bgActive: 'bg-green-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-green-300',
    borderActive: 'border-green-500',
    borderInactive: 'border-green-200',
  },
  english: {
    name: '영어',
    short: '영',
    bgActive: 'bg-purple-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-purple-300',
    borderActive: 'border-purple-500',
    borderInactive: 'border-purple-200',
  },
  science: {
    name: '과학',
    short: '과',
    bgActive: 'bg-orange-500',
    bgInactive: 'bg-white',
    textActive: 'text-white',
    textInactive: 'text-orange-300',
    borderActive: 'border-orange-500',
    borderInactive: 'border-orange-200',
  },
};

/** 레벨별 라벨 */
export const LEVEL_LABELS: Record<string, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
  mid: '정규',  // Supabase에서 mid로 저장된 경우
};

/** 레벨 표시 (가독성 개선: 심→심화, 정→정규, 기→기초) */
export const LEVEL_DISPLAY: Record<string, string> = {
  advanced: '심화',
  regular: '정규',
  regular2: '정규2',
  basic: '기초',
  mid: '정규',  // Supabase에서 mid로 저장된 경우
};
