/**
 * Document Parser (Phase 34.5-A)
 *
 * Filename parsing and document index generation
 * Pattern: {grade}_{course}_{series}_{type}.pdf
 */

export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface ParsedDocument {
  schoolLevel: SchoolLevel | null;
  grade: string | null;
  course: string | null;
  series: string | null;
  type: 'problem' | 'solution' | null;
  original: string;
}

export interface DocumentCombo {
  id: string;
  schoolLevel: SchoolLevel;
  grade: string;
  course: string;
  series: string;
  problemDocId: string | null;
  solutionDocId: string | null;
  isComplete: boolean;
}

export interface SeriesInfo {
  name: string;
  problemDocId: string | null;
  solutionDocId: string | null;
}

export interface CourseInfo {
  id: string;
  label: string;
  series: SeriesInfo[];
}

export interface GradeInfo {
  id: string;
  label: string;
  courses: CourseInfo[];
}

export interface SchoolInfo {
  label: string;
  grades: GradeInfo[];
}

export interface DocumentIndex {
  allCombos: DocumentCombo[];
  schools: {
    elementary: SchoolInfo;
    middle: SchoolInfo;
    high: SchoolInfo;
  };
}

/**
 * Parse filename
 * Pattern: {grade}_{course}_{series}_{type}.pdf
 */
export function parseDocumentName(filename: string): ParsedDocument {
  const result: ParsedDocument = {
    schoolLevel: null,
    grade: null,
    course: null,
    series: null,
    type: null,
    original: filename,
  };

  // Remove .pdf extension
  const name = filename.replace(/\.pdf$/i, '');

  // Pattern 1: grade_course_series_type (4 parts)
  const pattern4 = /^([초중고][1-6]?)_(.+?)_(.+?)_(문제|해설)$/;
  const match4 = name.match(pattern4);

  if (match4) {
    const [, grade, course, series, type] = match4;
    result.grade = grade;
    result.course = course;
    result.series = series;
    result.type = type === '문제' ? 'problem' : 'solution';
    result.schoolLevel = getSchoolLevel(grade);
    return result;
  }

  // Pattern 2: grade_series_type (3 parts, course defaults to "수학")
  const pattern3 = /^([초중고][1-6]?)_(.+?)_(문제|해설)$/;
  const match3 = name.match(pattern3);

  if (match3) {
    const [, grade, series, type] = match3;
    result.grade = grade;
    result.course = '수학';
    result.series = series;
    result.type = type === '문제' ? 'problem' : 'solution';
    result.schoolLevel = getSchoolLevel(grade);
    return result;
  }

  return result;
}

/**
 * Determine school level from grade string
 */
function getSchoolLevel(grade: string): SchoolLevel | null {
  if (grade.startsWith('초')) return 'elementary';
  if (grade.startsWith('중')) return 'middle';
  if (grade.startsWith('고')) return 'high';
  return null;
}

/**
 * Generate search keywords including abbreviations
 */
export function generateSearchKeywords(doc: ParsedDocument): string[] {
  const keywords: string[] = [];

  if (doc.grade) keywords.push(doc.grade);
  if (doc.course) keywords.push(doc.course);
  if (doc.series) keywords.push(doc.series);

  // Series abbreviations
  if (doc.series) {
    const abbrevMap: Record<string, string[]> = {
      '수학의바이블': ['수바', '바이블'],
      '개념원리': ['개원', '개념'],
      '블랙라벨': ['블라', '블랙'],
      '수학의정석': ['정석'],
      '자이스토리': ['자이'],
    };

    Object.entries(abbrevMap).forEach(([full, abbrevs]) => {
      if (doc.series?.includes(full)) {
        keywords.push(...abbrevs);
      }
    });
  }

  // Course abbreviations
  if (doc.course) {
    if (doc.course.includes('공통수학')) keywords.push('공통');
    if (doc.course.includes('미적분')) keywords.push('미적');
    if (doc.course.includes('확률과통계')) keywords.push('확통');
  }

  return keywords;
}

/**
 * Build document index from document list
 */
export function buildDocumentIndex(documents: Array<{ document_id: string }>): DocumentIndex {
  const combosMap = new Map<string, DocumentCombo>();

  // Parse all documents
  documents.forEach((doc) => {
    const parsed = parseDocumentName(doc.document_id);

    if (parsed.grade && parsed.course && parsed.series && parsed.schoolLevel) {
      const comboId = `${parsed.grade}_${parsed.course}_${parsed.series}`;

      if (!combosMap.has(comboId)) {
        combosMap.set(comboId, {
          id: comboId,
          schoolLevel: parsed.schoolLevel,
          grade: parsed.grade,
          course: parsed.course,
          series: parsed.series,
          problemDocId: null,
          solutionDocId: null,
          isComplete: false,
        });
      }

      const combo = combosMap.get(comboId)!;
      if (parsed.type === 'problem') {
        combo.problemDocId = doc.document_id;
      } else if (parsed.type === 'solution') {
        combo.solutionDocId = doc.document_id;
      }
      combo.isComplete = !!(combo.problemDocId && combo.solutionDocId);
    }
  });

  const allCombos = Array.from(combosMap.values());

  // Build school structure
  const schools = buildSchoolStructure(allCombos);

  return { allCombos, schools };
}

/**
 * Build hierarchical school structure
 */
function buildSchoolStructure(combos: DocumentCombo[]): DocumentIndex['schools'] {
  const schools: DocumentIndex['schools'] = {
    elementary: { label: '초등학교', grades: [] },
    middle: { label: '중학교', grades: [] },
    high: { label: '고등학교', grades: [] },
  };

  // Grade label mapping
  const gradeLabelMap: Record<string, string> = {
    '초3': '3학년', '초4': '4학년', '초5': '5학년', '초6': '6학년',
    '중1': '1학년', '중2': '2학년', '중3': '3학년',
    '고1': '1학년', '고2': '2학년', '고3': '3학년',
  };

  // Grouping: school -> grade -> course -> series
  const grouped = new Map<string, Map<string, Map<string, SeriesInfo[]>>>();

  combos.forEach((combo) => {
    if (!grouped.has(combo.schoolLevel)) {
      grouped.set(combo.schoolLevel, new Map());
    }
    const schoolMap = grouped.get(combo.schoolLevel)!;

    if (!schoolMap.has(combo.grade)) {
      schoolMap.set(combo.grade, new Map());
    }
    const gradeMap = schoolMap.get(combo.grade)!;

    if (!gradeMap.has(combo.course)) {
      gradeMap.set(combo.course, []);
    }
    const seriesList = gradeMap.get(combo.course)!;

    seriesList.push({
      name: combo.series,
      problemDocId: combo.problemDocId,
      solutionDocId: combo.solutionDocId,
    });
  });

  // Build structure
  (['elementary', 'middle', 'high'] as SchoolLevel[]).forEach((schoolLevel) => {
    const schoolMap = grouped.get(schoolLevel);
    if (!schoolMap) return;

    const grades: GradeInfo[] = [];

    // Sort grades
    const sortedGrades = Array.from(schoolMap.keys()).sort((a, b) => {
      const numA = parseInt(a.slice(1));
      const numB = parseInt(b.slice(1));
      return numA - numB;
    });

    sortedGrades.forEach((gradeId) => {
      const gradeMap = schoolMap.get(gradeId)!;
      const courses: CourseInfo[] = [];

      gradeMap.forEach((seriesList, courseId) => {
        courses.push({
          id: courseId,
          label: courseId,
          series: seriesList.sort((a, b) => a.name.localeCompare(b.name)),
        });
      });

      grades.push({
        id: gradeId,
        label: gradeLabelMap[gradeId] || gradeId,
        courses: courses.sort((a, b) => a.label.localeCompare(b.label)),
      });
    });

    schools[schoolLevel].grades = grades;
  });

  return schools;
}
