/**
 * 진도 데이터 파싱 유틸리티 (Phase 314)
 *
 * Supabase progress.pages 필드에 교재명이 포함되어 저장되는 문제 해결
 * 예: "최상위s 6-2 90-97" → "p.90-97"
 */

/**
 * pages 문자열에서 교재명을 제거하고 페이지 번호만 추출
 *
 * @param pages - progress.pages 값 (예: "최상위s 6-2 90-97")
 * @param textbook - progress.textbook 값 (예: "최상위s 6-2")
 * @returns 정제된 페이지 문자열 (예: "p.90-97") 또는 빈 문자열
 *
 * @example
 * parsePages("최상위s 6-2 90-97", "최상위s 6-2") // => "p.90-97"
 * parsePages("우공비 Q+Q 6-1_표준 페이지 없음", "우공비 Q+Q 6-1_표준") // => ""
 * parsePages("최상위수학_s_4-2 46-53", "최상위수학_s_4-2") // => "p.46-53"
 * parsePages(null, null) // => ""
 */
export function parsePages(pages: string | null, textbook: string | null): string {
  if (!pages) return '';
  if (pages === '페이지 없음' || pages.endsWith('페이지 없음')) return '';

  let cleaned = pages;

  // textbook이 있으면 pages에서 제거
  if (textbook) {
    cleaned = cleaned.replace(textbook, '').trim();
  }

  // "XX-XX" 또는 "XX~XX" 형식 추출
  const rangeMatch = cleaned.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (rangeMatch) {
    return `p.${rangeMatch[1]}-${rangeMatch[2]}`;
  }

  // 단일 페이지 (숫자만)
  const singleMatch = cleaned.match(/^(\d+)$/);
  if (singleMatch) {
    return `p.${singleMatch[1]}`;
  }

  // 그 외의 경우 정제된 문자열 반환 (빈 문자열일 수 있음)
  return cleaned.trim() ? `p.${cleaned.trim()}` : '';
}

/**
 * pages 문자열에서 시작/끝 페이지 숫자 추출
 *
 * @param pages - progress.pages 값
 * @returns { start, end } 객체 또는 null
 *
 * @example
 * extractPageRange("최상위s 6-2 90-97") // => { start: 90, end: 97 }
 * extractPageRange("46-53") // => { start: 46, end: 53 }
 * extractPageRange("페이지 없음") // => null
 * extractPageRange(null) // => null
 */
export function extractPageRange(pages: string | null): { start: number; end: number } | null {
  if (!pages) return null;
  if (pages === '페이지 없음' || pages.endsWith('페이지 없음')) return null;

  // "XX-XX" 또는 "XX~XX" 형식 찾기
  const match = pages.match(/(\d+)\s*[-~]\s*(\d+)/);
  if (match) {
    return {
      start: parseInt(match[1], 10),
      end: parseInt(match[2], 10),
    };
  }

  return null;
}

/**
 * homework.description을 파싱하여 표시용 문자열 배열 반환 (Phase 316)
 *
 * hyeyum 앱의 ClassDayCard.tsx와 동일한 파싱 로직
 * description 형식: "교재명1 페이지범위\n교재명2 페이지범위"
 *
 * @param description - homework.description 값
 * @returns 표시용 문자열 배열 (예: ["최상위s_6-2 p.84-89", "최상위s 6-2_복습책 p.9-10"])
 *
 * @example
 * parseHomeworkDescription("최상위s_6-2 84-89\n최상위s 6-2_복습책 9-10")
 * // => ["최상위s_6-2 p.84-89", "최상위s 6-2_복습책 p.9-10"]
 * parseHomeworkDescription(null) // => []
 */
export function parseHomeworkDescription(description: string | null): string[] {
  if (!description) return [];

  const lines = description.split('\n').filter((line) => line.trim());
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 공백으로 토큰 분리
    const tokens = trimmed.split(/\s+/);
    const lastToken = tokens[tokens.length - 1];

    // 마지막 토큰이 페이지 번호 패턴인지 확인 (예: "84-89" 또는 "84")
    const pagePattern = /^(\d+-\d+|\d+)$/;

    if (tokens.length > 1 && pagePattern.test(lastToken)) {
      // 교재명 + 페이지
      const textbookName = tokens.slice(0, -1).join(' ');
      result.push(`${textbookName} p.${lastToken}`);
    } else {
      // 페이지 없이 교재명만
      result.push(trimmed);
    }
  }

  return result;
}

/**
 * homework.description을 단일 문자열로 포맷 (Phase 316)
 *
 * @param description - homework.description 값
 * @returns 쉼표로 구분된 단일 문자열
 *
 * @example
 * formatHomeworkDescription("최상위s_6-2 84-89\n최상위s 6-2_복습책 9-10")
 * // => "최상위s_6-2 p.84-89, 최상위s 6-2_복습책 p.9-10"
 */
export function formatHomeworkDescription(description: string | null): string {
  const parsed = parseHomeworkDescription(description);
  return parsed.join(', ');
}
