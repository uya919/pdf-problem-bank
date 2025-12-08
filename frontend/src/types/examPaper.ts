/**
 * 시험지(ExamPaper) 타입 정의
 *
 * Phase 21+ D-1: 시험지 모델
 */

import type { Problem } from './problem';

/**
 * 시험지 문제 항목
 */
export interface ExamProblemItem {
  id: string;                    // 항목 ID (UUID)
  problemId: string;             // 원본 문제 ID
  order: number;                 // 문제 순서 (1부터 시작)
  points: number;                // 배점
  customNumber?: string;         // 커스텀 문제 번호 (예: "1-1", "가")
  note?: string;                 // 출제자 메모
}

/**
 * 시험지 섹션 (파트)
 */
export interface ExamSection {
  id: string;                    // 섹션 ID (UUID)
  title: string;                 // 섹션 제목 (예: "1부. 객관식", "Part A")
  description?: string;          // 섹션 설명
  problems: ExamProblemItem[];   // 섹션 내 문제들
  order: number;                 // 섹션 순서
}

/**
 * 시험지 설정
 */
export interface ExamPaperSettings {
  // 기본 정보
  title: string;                 // 시험 제목
  subtitle?: string;             // 부제목
  institution?: string;          // 기관명
  subject?: string;              // 과목
  grade?: string;                // 학년
  date?: string;                 // 시험 날짜
  duration?: number;             // 시험 시간 (분)

  // 레이아웃
  paperSize: 'A4' | 'B4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  columns: 1 | 2;                // 단/양단
  fontSize: 'small' | 'medium' | 'large';

  // 헤더/푸터
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  showTotalPoints: boolean;

  // 문제 표시
  showPoints: boolean;           // 배점 표시
  showAnswerSpace: boolean;      // 답안 작성란 표시
  answerSpaceLines: number;      // 답안 작성란 줄 수

  // 정답지
  generateAnswerKey: boolean;    // 정답지 생성
}

/**
 * 시험지 상태
 */
export type ExamPaperStatus = 'draft' | 'ready' | 'archived';

/**
 * 시험지 모델
 */
export interface ExamPaper {
  id: string;                    // 시험지 ID (UUID)

  // 메타데이터
  name: string;                  // 시험지 이름 (관리용)
  description?: string;          // 설명
  status: ExamPaperStatus;       // 상태

  // 구조
  sections: ExamSection[];       // 섹션 목록
  settings: ExamPaperSettings;   // 설정

  // 통계
  totalProblems: number;         // 총 문제 수
  totalPoints: number;           // 총 배점

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

/**
 * 시험지 생성 요청
 */
export interface ExamPaperCreate {
  name: string;
  description?: string;
  settings?: Partial<ExamPaperSettings>;
}

/**
 * 시험지 수정 요청
 */
export interface ExamPaperUpdate {
  name?: string;
  description?: string;
  status?: ExamPaperStatus;
  sections?: ExamSection[];
  settings?: Partial<ExamPaperSettings>;
}

/**
 * 시험지에 문제 추가 요청
 */
export interface AddProblemToExam {
  problemId: string;
  sectionId?: string;            // 미지정 시 첫 번째 섹션에 추가
  points?: number;               // 미지정 시 기본값 사용
}

/**
 * 시험지 목록 응답
 */
export interface ExamPaperListResponse {
  items: ExamPaper[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 시험지 내보내기 형식
 */
export type ExportFormat = 'pdf' | 'docx' | 'hwp';

/**
 * 시험지 내보내기 요청
 */
export interface ExportExamRequest {
  examId: string;
  format: ExportFormat;
  includeAnswerKey: boolean;
}

/**
 * 시험지 미리보기 데이터
 */
export interface ExamPreviewData {
  html: string;                  // 렌더링된 HTML
  answerKeyHtml?: string;        // 정답지 HTML
  pageCount: number;             // 페이지 수
}

/**
 * 기본 시험지 설정
 */
export const DEFAULT_EXAM_SETTINGS: ExamPaperSettings = {
  title: '시험',
  paperSize: 'A4',
  orientation: 'portrait',
  columns: 1,
  fontSize: 'medium',
  showHeader: true,
  showFooter: true,
  showPageNumbers: true,
  showTotalPoints: true,
  showPoints: true,
  showAnswerSpace: false,
  answerSpaceLines: 3,
  generateAnswerKey: true,
};

/**
 * 기본 배점
 */
export const DEFAULT_POINTS = 5;
