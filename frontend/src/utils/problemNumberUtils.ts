/**
 * Phase 9-2: Problem Number Auto-Increment Utilities
 *
 * Handles intelligent increment of problem numbers:
 * - Simple numbers: "3" → "4"
 * - Compound numbers: "3-1" → "3-2"
 * - Ranges: "3~5" → "6~8"
 * - Korean letters: "3-(가)" → "3-(나)"
 */

/**
 * Increment a problem number string intelligently
 */
export function incrementProblemNumber(problemNumber: string): string {
  if (!problemNumber || problemNumber.trim() === '') {
    return '1';
  }

  const trimmed = problemNumber.trim();

  // 패턴 1: 숫자-숫자 (예: "3-1" → "3-2")
  const compoundMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (compoundMatch) {
    const [, major, minor] = compoundMatch;
    const nextMinor = parseInt(minor, 10) + 1;
    return `${major}-${nextMinor}`;
  }

  // 패턴 2: 범위 (예: "3~5" → "6~8")
  const rangeMatch = trimmed.match(/^(\d+)~(\d+)$/);
  if (rangeMatch) {
    const [, start, end] = rangeMatch;
    const startNum = parseInt(start, 10);
    const endNum = parseInt(end, 10);
    const range = endNum - startNum;
    return `${endNum + 1}~${endNum + 1 + range}`;
  }

  // 패턴 3: 한글 자음/모음 (예: "3-(가)" → "3-(나)")
  const koreanMatch = trimmed.match(/^(\d+)-\(([가-힣])\)$/);
  if (koreanMatch) {
    const [, number, letter] = koreanMatch;
    const nextLetter = incrementKoreanLetter(letter);
    return `${number}-(${nextLetter})`;
  }

  // 패턴 4: 순수 숫자 (예: "3" → "4")
  const simpleMatch = trimmed.match(/^(\d+)$/);
  if (simpleMatch) {
    const num = parseInt(trimmed, 10);
    return String(num + 1);
  }

  // 알 수 없는 패턴: 그대로 반환
  return trimmed;
}

/**
 * Increment Korean letter (가, 나, 다, ...)
 */
function incrementKoreanLetter(letter: string): string {
  // 한글 유니코드 범위: 가(0xAC00) ~ 힣(0xD7A3)
  const code = letter.charCodeAt(0);

  // 가, 나, 다, 라, 마, ... 순서 (초성이 같은 글자)
  const koreanSequence = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
  const index = koreanSequence.indexOf(letter);

  if (index !== -1 && index < koreanSequence.length - 1) {
    return koreanSequence[index + 1];
  }

  // 시퀀스에 없으면 유니코드 1 증가 (fallback)
  if (code >= 0xAC00 && code < 0xD7A3) {
    return String.fromCharCode(code + 1);
  }

  // 범위 밖이면 그대로 반환
  return letter;
}

/**
 * Get the last used problem number from existing groups in the same column
 * @deprecated Use getLastProblemNumberOnPage for page-wide numbering (Phase 9)
 */
export function getLastProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  column: string
): string | null {
  // Filter groups in the same column that have problem numbers
  const sameColumnGroups = groups
    .filter(g => g.column === column && g.problemInfo?.problemNumber)
    .map(g => g.problemInfo!.problemNumber!);

  if (sameColumnGroups.length === 0) {
    return null;
  }

  // Return the last one (most recently created)
  return sameColumnGroups[sameColumnGroups.length - 1];
}

/**
 * Get the last used problem number from existing groups on the page (column-independent)
 * Phase 9: 페이지 전체 통합 문항번호
 * Phase 56-H: 모문제(isParent) 제외, 숫자로 시작하는 번호만 유효
 */
export function getLastProblemNumberOnPage(
  groups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;
  }>
): string | null {
  // Filter all groups that have problem numbers (column-independent)
  // Phase 56-H: 모문제 제외 + 숫자로 시작하는 번호만 유효
  const groupsWithProblemNumber = groups
    .filter(g => {
      const num = g.problemInfo?.problemNumber;
      if (!num) return false;
      if (g.isParent) return false;  // 모문제 제외
      return /^\d/.test(num);  // 숫자로 시작하는 번호만
    })
    .map(g => g.problemInfo!.problemNumber!);

  if (groupsWithProblemNumber.length === 0) {
    return null;
  }

  // Return the last one (most recently created)
  return groupsWithProblemNumber[groupsWithProblemNumber.length - 1];
}

/**
 * Get the suggested next problem number for a new group
 * Phase 9: column 파라미터 생략 시 페이지 전체 기준으로 번호 증가
 */
export function getNextProblemNumber(
  groups: Array<{ column: string; problemInfo?: { problemNumber?: string } }>,
  column?: string
): string {
  // Phase 9: column이 없으면 페이지 전체 기준
  const lastNumber = column
    ? getLastProblemNumber(groups, column)
    : getLastProblemNumberOnPage(groups);

  if (!lastNumber) {
    return '1'; // First problem on page/column
  }

  return incrementProblemNumber(lastNumber);
}

/**
 * Phase 10-2: Get the suggested next problem number with cross-page context
 * 현재 페이지의 마지막 문항번호가 없으면 이전 페이지의 마지막 문항번호를 기준으로 증가
 * Phase 56-H: 모문제(isParent) 제외
 *
 * @param currentPageGroups 현재 페이지의 그룹들
 * @param previousPageLastNumber 이전 페이지들 중 마지막 문항번호 (useProblemNumberContext에서 제공)
 * @returns 다음 문항번호
 */
export function getNextProblemNumberWithContext(
  currentPageGroups: Array<{
    column: string;
    problemInfo?: { problemNumber?: string };
    isParent?: boolean;
  }>,
  previousPageLastNumber: string | null
): string {
  // 먼저 현재 페이지의 마지막 문항번호 확인
  const currentPageLast = getLastProblemNumberOnPage(currentPageGroups);

  if (currentPageLast) {
    // 현재 페이지에 문항번호가 있으면 그것 기준으로 증가
    return incrementProblemNumber(currentPageLast);
  }

  if (previousPageLastNumber) {
    // 현재 페이지에 없지만 이전 페이지에 있으면 이전 페이지 기준으로 증가
    return incrementProblemNumber(previousPageLastNumber);
  }

  // 둘 다 없으면 1부터 시작
  return '1';
}
