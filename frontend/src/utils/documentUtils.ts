/**
 * 문서 관련 유틸리티 함수
 * Phase 34-A-2: document_id 파싱
 */

export interface ParsedDocumentId {
  grade: string;      // "고1", "고2", "중1" 등
  course: string;     // "공통수학1", "미적분" 등
  series: string;     // "베이직쎈", "블랙라벨" 등
  type: string;       // "문제" 또는 "해설"
}

const VALID_GRADES = ['고1', '고2', '고3', '중1', '중2', '중3'];
const VALID_TYPES = ['문제', '해설'];

/**
 * document_id에서 메타데이터를 파싱합니다.
 *
 * document_id 형식: {학년}_{과정}_{시리즈}_{타입}
 * 예: "고1_공통수학1_베이직쎈_문제"
 *
 * @param documentId - 문서 ID
 * @returns 파싱된 메타데이터 또는 null (파싱 실패 시)
 */
export function parseDocumentId(documentId: string): ParsedDocumentId | null {
  if (!documentId) return null;

  const parts = documentId.split('_');

  // 최소 4개 부분 필요: 학년_과정_시리즈_타입
  if (parts.length < 4) return null;

  // 타입 (마지막)
  const type = parts[parts.length - 1];
  if (!VALID_TYPES.includes(type)) return null;

  // 학년 (첫번째)
  const grade = parts[0];
  if (!VALID_GRADES.includes(grade)) return null;

  // 시리즈 (마지막에서 2번째)
  const series = parts[parts.length - 2];

  // 과정 (중간 부분들을 합침)
  const course = parts.slice(1, -2).join('_');

  return { grade, course, series, type };
}

/**
 * document_id에서 기본 책이름(시리즈)을 추출합니다.
 * 파싱 실패 시 document_id 전체를 반환합니다.
 */
export function extractBookName(documentId: string): string {
  const parsed = parseDocumentId(documentId);
  return parsed?.series || documentId;
}

/**
 * document_id에서 기본 과정명을 추출합니다.
 * 파싱 실패 시 빈 문자열을 반환합니다.
 */
export function extractCourse(documentId: string): string {
  const parsed = parseDocumentId(documentId);
  return parsed?.course || '';
}

/**
 * document_id에서 책이름과 과정을 한번에 추출합니다.
 */
export function extractBookNameAndCourse(documentId: string): {
  bookName: string;
  course: string;
} {
  const parsed = parseDocumentId(documentId);
  if (parsed) {
    return {
      bookName: parsed.series,
      course: parsed.course,
    };
  }
  return {
    bookName: documentId,
    course: '',
  };
}
