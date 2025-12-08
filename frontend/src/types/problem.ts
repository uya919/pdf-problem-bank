/**
 * 문제(Problem) 타입 정의
 *
 * Phase 21+ A-2: Problem 데이터 모델
 */

import type { ClassificationPath } from './classification';

/**
 * 문제 출처 정보
 */
export interface ProblemSource {
  /** 출처 유형 */
  type: 'book' | 'exam' | 'custom';
  /** 출처 이름 */
  name: string;
  /** 페이지 번호 */
  page?: number;
  /** 문제 번호 */
  problemNumber?: string;
  /** 출제 연도 (기출용) */
  year?: number;
  /** 출제 월 (기출용) */
  month?: number;
  /** 출제 기관 */
  organization?: string;
  /** 원본 문서 ID (라벨링 연동) */
  documentId?: string;
  /** 원본 그룹 ID (라벨링 연동) */
  groupId?: string;
}

/**
 * 문제 콘텐츠
 */
export interface ProblemContent {
  /** 문제 이미지 경로 */
  imageUrl: string;
  /** 썸네일 경로 */
  thumbnailUrl?: string;
  /** LaTeX 수식 */
  latex?: string;
  /** OCR 추출 텍스트 */
  ocrText?: string;
  /** 객관식 선지 */
  choices?: string[];
  /** 정답 */
  answer?: string;
  /** 정답 유형 */
  answerType?: 'number' | 'text' | 'choice';
  /** 해설 텍스트 */
  solution?: string;
  /** 해설 이미지 경로 */
  solutionImageUrl?: string;
}

/**
 * 문제 유형
 */
export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';

/**
 * 문제 엔티티
 */
export interface Problem {
  /** 문제 고유 ID */
  id: string;
  /** 분류 경로 */
  classification?: ClassificationPath;
  /** 문제 유형 */
  questionType: QuestionType;
  /** 난이도 (1-10) */
  difficulty: number;
  /** 배점 */
  points?: number;
  /** 문제 콘텐츠 */
  content: ProblemContent;
  /** 출처 정보 */
  source: ProblemSource;
  /** 태그 목록 */
  tags: string[];
  /** 생성 시각 */
  createdAt: string;
  /** 수정 시각 */
  updatedAt: string;
  /** 생성자 */
  createdBy: string;
  /** 시험지 사용 횟수 */
  usageCount: number;
  /** 마지막 사용 시각 */
  lastUsedAt?: string;
  /** 즐겨찾기 여부 */
  isFavorite: boolean;
}

/**
 * 문제 생성 요청
 */
export interface ProblemCreate {
  classification?: ClassificationPath;
  questionType?: QuestionType;
  difficulty?: number;
  points?: number;
  content: ProblemContent;
  source: ProblemSource;
  tags?: string[];
}

/**
 * 문제 수정 요청
 */
export interface ProblemUpdate {
  classification?: ClassificationPath;
  questionType?: QuestionType;
  difficulty?: number;
  points?: number;
  content?: ProblemContent;
  source?: ProblemSource;
  tags?: string[];
  isFavorite?: boolean;
}

/**
 * 문제 필터링 조건
 */
export interface ProblemFilter {
  /** 학년 ID 목록 */
  gradeIds?: number[];
  /** 대단원 ID 목록 */
  majorUnitIds?: number[];
  /** 중단원 ID 목록 */
  middleUnitIds?: number[];
  /** 소단원 ID 목록 */
  minorUnitIds?: number[];
  /** 유형 ID 목록 */
  typeIds?: number[];
  /** 문제 유형 목록 */
  questionTypes?: QuestionType[];
  /** 최소 난이도 */
  difficultyMin?: number;
  /** 최대 난이도 */
  difficultyMax?: number;
  /** 출처 유형 목록 */
  sourceTypes?: ('book' | 'exam' | 'custom')[];
  /** 출제 연도 목록 */
  years?: number[];
  /** 출제 기관 목록 */
  organizations?: string[];
  /** 태그 목록 */
  tags?: string[];
  /** 정답 있는 문제만 */
  hasAnswer?: boolean;
  /** 해설 있는 문제만 */
  hasSolution?: boolean;
  /** 즐겨찾기만 */
  isFavorite?: boolean;
  /** 검색어 */
  searchQuery?: string;
}

/**
 * 문제 목록 응답
 */
export interface ProblemListResponse {
  /** 문제 목록 */
  items: Problem[];
  /** 전체 개수 */
  total: number;
  /** 현재 페이지 */
  page: number;
  /** 페이지 크기 */
  pageSize: number;
  /** 전체 페이지 수 */
  totalPages: number;
}

/**
 * 문제 통계
 */
export interface ProblemStats {
  /** 전체 문제 수 */
  total: number;
  /** 문제 유형별 개수 */
  byQuestionType: Record<string, number>;
  /** 난이도별 개수 */
  byDifficulty: Record<string, number>;
  /** 학년별 개수 */
  byGrade: Record<string, number>;
  /** 최근 추가된 문제 수 */
  recentlyAdded: number;
  /** 즐겨찾기 수 */
  favorites: number;
}

/**
 * 정렬 옵션
 */
export interface ProblemSortOptions {
  /** 정렬 기준 필드 */
  sortBy: 'createdAt' | 'updatedAt' | 'difficulty' | 'usageCount';
  /** 내림차순 정렬 */
  sortDesc: boolean;
}
