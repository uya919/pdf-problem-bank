/**
 * Phase 45: 문제 표시 유틸리티
 *
 * displayName을 파싱하여 구조화된 정보로 변환
 * 형식: "책이름_과정_p페이지_문항번호번" → { bookName, course, page, problemNumber }
 */

export interface ParsedProblemInfo {
  bookName: string;
  course?: string;
  page: string;
  problemNumber: string;
}

/**
 * displayName을 파싱하여 구조화된 객체로 반환
 *
 * 지원 형식:
 * - "베이직쎈_공통수학1_p10_3번" → { bookName: "베이직쎈", course: "공통수학1", page: "10", problemNumber: "3" }
 * - "수학의바이블_p10_3번" → { bookName: "수학의바이블", page: "10", problemNumber: "3" }
 * - "문제 L1" → { bookName: "문제", page: "-", problemNumber: "L1" } (레거시)
 * - "3번" → { bookName: "-", page: "-", problemNumber: "3" } (단순)
 *
 * @param displayName 문제 표시 이름
 * @returns 파싱된 정보 또는 null (파싱 실패 시)
 */
export function parseProblemDisplayName(displayName: string | undefined): ParsedProblemInfo | null {
  if (!displayName) return null;

  // Phase 45-Fix: 레거시 "문제 X" 형식 처리 (공백으로 구분)
  const legacyMatch = displayName.match(/^문제\s+(.+)$/);
  if (legacyMatch) {
    return {
      bookName: '문제',
      page: '-',
      problemNumber: legacyMatch[1].replace('번', ''),
    };
  }

  // Phase 45-Fix: 단순 "X번" 또는 "LX" 형식 처리
  const simpleMatch = displayName.match(/^([A-Za-z]?\d+)번?$/);
  if (simpleMatch) {
    return {
      bookName: '-',
      page: '-',
      problemNumber: simpleMatch[1],
    };
  }

  const parts = displayName.split('_');

  // Phase 45-Fix: 2파트 "책이름_번호" 형식
  if (parts.length === 2) {
    return {
      bookName: parts[0],
      page: '-',
      problemNumber: parts[1].replace('번', ''),
    };
  }

  // 최소 3개 파트 필요: 책이름_p페이지_번호
  if (parts.length < 3) return null;

  // 마지막 파트: 문항번호 (예: "3번")
  const lastPart = parts[parts.length - 1];
  const problemNumber = lastPart.replace('번', '');

  // 마지막에서 두 번째: 페이지 (예: "p10")
  const pagePart = parts[parts.length - 2];

  // Phase 45-Fix: 페이지 파트가 'p'로 시작하지 않으면 다른 형식으로 처리
  if (!pagePart.toLowerCase().startsWith('p')) {
    // "책이름_과정_번호" 형식으로 가정
    return {
      bookName: parts[0],
      course: parts.slice(1, -1).join('_'),
      page: '-',
      problemNumber,
    };
  }

  const page = pagePart.substring(1); // 'p' 제거

  // 나머지: 책이름과 과정
  const remainingParts = parts.slice(0, -2);

  if (remainingParts.length === 0) return null;

  // 4파트 형식: 책이름_과정_p페이지_번호
  if (remainingParts.length >= 2) {
    return {
      bookName: remainingParts[0],
      course: remainingParts.slice(1).join('_'), // 과정에 _가 있을 수 있음
      page,
      problemNumber,
    };
  }

  // 3파트 형식: 책이름_p페이지_번호
  return {
    bookName: remainingParts[0],
    page,
    problemNumber,
  };
}

/**
 * 파싱된 정보를 "베이직쎈 · 10p · 3번" 형식으로 포맷
 *
 * @param parsed 파싱된 문제 정보
 * @returns 포맷된 문자열
 */
export function formatProblemLabel(parsed: ParsedProblemInfo): string {
  return `${parsed.bookName} · ${parsed.page}p · ${parsed.problemNumber}번`;
}

/**
 * displayName을 바로 포맷된 라벨로 변환
 * 파싱 실패 시 fallback 반환
 *
 * @param displayName 문제 표시 이름
 * @param fallback 파싱 실패 시 반환할 값
 * @returns 포맷된 라벨 또는 fallback
 */
export function formatProblemDisplayName(displayName: string | undefined, fallback: string): string {
  const parsed = parseProblemDisplayName(displayName);
  if (!parsed) return fallback;
  return formatProblemLabel(parsed);
}
