/**
 * Phase 51: displayName 생성 유틸리티
 *
 * Backend sync-problems와 동일한 형식 보장:
 * {bookName}_{course}_p{page}_{problemNumber}번
 *
 * 예: 베이직쎈_공통수학_p10_3번
 */

import type { ProblemInfo } from '../api/client';

export interface DisplayNameParams {
  bookName?: string;
  course?: string;
  page?: number;
  problemNumber?: string;
}

/**
 * problemInfo에서 일관된 displayName 생성
 *
 * @example
 * formatDisplayName({ bookName: '베이직쎈', course: '공통수학', page: 10, problemNumber: '3' })
 * // => '베이직쎈_공통수학_p10_3번'
 *
 * @example
 * formatDisplayName({ bookName: '베이직쎈', page: 10, problemNumber: '3' })
 * // => '베이직쎈_p10_3번'
 */
export function formatDisplayName(params: DisplayNameParams): string {
  const { bookName, course, page, problemNumber } = params;

  const parts: string[] = [];

  // bookName (있으면 추가)
  if (bookName) {
    parts.push(bookName);
  }

  // course (있으면 추가)
  if (course) {
    parts.push(course);
  }

  // page (필수 - 없으면 1)
  parts.push(`p${page || 1}`);

  // problemNumber (필수 - 없으면 '?')
  parts.push(`${problemNumber || '?'}번`);

  return parts.join('_');
}

/**
 * ProblemInfo 객체에서 displayName 생성
 *
 * @param problemInfo - 그룹의 problemInfo
 * @param pageIndex - 0-based 페이지 인덱스
 * @param fallbackProblemNumber - problemInfo에 번호가 없을 때 사용할 대체값
 */
export function formatDisplayNameFromInfo(
  problemInfo: ProblemInfo | undefined,
  pageIndex: number,
  fallbackProblemNumber?: string
): string {
  return formatDisplayName({
    bookName: problemInfo?.bookName,
    course: problemInfo?.course,
    page: problemInfo?.page || pageIndex + 1,
    problemNumber: problemInfo?.problemNumber || fallbackProblemNumber,
  });
}
