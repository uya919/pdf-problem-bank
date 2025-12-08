# Phase 34.5: 하이브리드 문서 선택 UI 개발 계획 (수정판)

> **목표**: 500개+ 조합에서 3초 내 문서 선택 가능한 UI
> **작성일**: 2025-12-03
> **예상 소요**: 5-6시간
> **기반 문서**: `61_ux_research_complex_curriculum_hierarchy.md`

---

## 1. 설계 원칙

### 1.1 핵심 전략

```
┌─────────────────────────────────────────────────────────────┐
│  "계층을 UI에 그대로 반영하지 말고, 사용 패턴에 맞게 재구성" │
│                                                             │
│  80% → 최근 사용 (1클릭)                                    │
│  15% → 스마트 검색 (3글자)                                  │
│   5% → 전체 찾아보기 (탐색)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 완성 UI 미리보기

```
┌─────────────────────────────────────────────────────────────┐
│  문제은행                                    [+ 파일 추가]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 🎯 새 작업 시작하기                    │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ 🔍 검색... (예: "고1 공통 수바", "중2 쎈")      │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │  ───────────────────────────────────────────────── │   │
│  │                                                      │   │
│  │  ⭐ 최근 사용                                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │📘 고1       │ │📗 고2       │ │📙 중3       │   │   │
│  │  │  공통수학1  │ │  미적분     │ │  수학       │   │   │
│  │  │  수학의바이블│ │  쎈        │ │  개념원리   │   │   │
│  │  │            │ │            │ │            │   │   │
│  │  │[▶ 바로시작]│ │[▶ 바로시작]│ │[▶ 바로시작]│   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │                                                      │   │
│  │  ───────────────────────────────────────────────── │   │
│  │                                                      │   │
│  │  📂 전체 찾아보기                             [▼]   │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📂 진행 중인 작업 (2)                                      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 구조

### 2.1 컴포넌트 트리

```
MainPage
└── HeroSection (전체 리팩토링)
    │
    ├── SmartSearchBox (신규)
    │   ├── SearchInput
    │   └── SearchResults
    │       └── SearchResultItem × N
    │
    ├── RecentUsedSection (신규)
    │   └── QuickStartCard × 4
    │
    └── BrowseAllSection (신규, 접이식)
        ├── SchoolTabs (초/중/고)
        ├── GradeCourseSelector
        │   ├── GradeButtons
        │   └── CourseButtons (고등학교만)
        └── SeriesGrid
            └── SeriesCard × N
```

### 2.2 파일 구조

```
frontend/src/
├── lib/
│   └── documentParser.ts           # 파일명 파싱 (확장)
│
├── hooks/
│   ├── useDocumentIndex.ts         # 문서 인덱스 (확장)
│   ├── useRecentUsed.ts            # 최근 사용 (신규)
│   └── useDocumentSearch.ts        # 검색 훅 (신규)
│
└── components/main/
    ├── index.ts                    # 내보내기
    ├── HeroSection.tsx             # 전체 리팩토링
    │
    ├── SmartSearchBox.tsx          # 검색창 + 결과
    ├── SearchResultItem.tsx        # 검색 결과 항목
    │
    ├── RecentUsedSection.tsx       # 최근 사용 섹션
    ├── QuickStartCard.tsx          # 빠른 시작 카드
    │
    ├── BrowseAllSection.tsx        # 전체 찾아보기
    ├── SchoolTabs.tsx              # 초/중/고 탭
    ├── GradeCourseSelector.tsx     # 학년+과정 선택
    └── SeriesGrid.tsx              # 시리즈 그리드
```

---

## 3. 데이터 구조

### 3.1 파일 네이밍 컨벤션

```
{학년}_{과정}_{시리즈}_{타입}.pdf

예시:
- 고1_공통수학1_수학의바이블_문제.pdf
- 고1_공통수학1_수학의바이블_해설.pdf
- 고2_미적분_쎈_문제.pdf
- 중3_수학_개념원리_해설.pdf      (과정 = "수학")
- 초5_수학_기본서_문제.pdf        (과정 = "수학")
```

### 3.2 파싱 결과 타입

```typescript
// frontend/src/lib/documentParser.ts

export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface ParsedDocument {
  schoolLevel: SchoolLevel | null;
  grade: string | null;           // "고1", "중3", "초5"
  course: string | null;          // "공통수학1", "미적분", "수학"
  series: string | null;          // "수학의바이블", "쎈"
  type: 'problem' | 'solution' | null;
  original: string;
}

export interface DocumentCombo {
  id: string;                     // 고유 ID (학년_과정_시리즈)
  schoolLevel: SchoolLevel;
  grade: string;
  course: string;
  series: string;
  problemDocId: string | null;
  solutionDocId: string | null;
  isComplete: boolean;            // 문제+해설 모두 있음
}
```

### 3.3 인덱스 구조

```typescript
export interface DocumentIndex {
  // 전체 조합 리스트 (검색용)
  allCombos: DocumentCombo[];

  // 학교급별 구조 (찾아보기용)
  schools: {
    elementary: SchoolInfo;
    middle: SchoolInfo;
    high: SchoolInfo;
  };
}

export interface SchoolInfo {
  label: string;                  // "초등학교"
  grades: GradeInfo[];
}

export interface GradeInfo {
  id: string;                     // "고1"
  label: string;                  // "1학년"
  courses: CourseInfo[];
}

export interface CourseInfo {
  id: string;                     // "공통수학1"
  label: string;                  // "공통수학1"
  series: SeriesInfo[];
}

export interface SeriesInfo {
  name: string;
  problemDocId: string | null;
  solutionDocId: string | null;
}
```

### 3.4 최근 사용 저장 구조

```typescript
// localStorage에 저장
export interface RecentUsedItem {
  comboId: string;                // "고1_공통수학1_수학의바이블"
  grade: string;
  course: string;
  series: string;
  problemDocId: string;
  solutionDocId: string;
  lastUsedAt: number;             // timestamp
  useCount: number;
}
```

---

## 4. 개발 단계

### Phase 34.5-A: 파싱 로직 확장 (30분)

#### documentParser.ts

```typescript
// frontend/src/lib/documentParser.ts

export type SchoolLevel = 'elementary' | 'middle' | 'high';

export interface ParsedDocument {
  schoolLevel: SchoolLevel | null;
  grade: string | null;
  course: string | null;
  series: string | null;
  type: 'problem' | 'solution' | null;
  original: string;
}

/**
 * 파일명 파싱
 * 패턴: {학년}_{과정}_{시리즈}_{타입}.pdf
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

  // .pdf 제거
  const name = filename.replace(/\.pdf$/i, '');

  // 패턴 매칭: 학년_과정_시리즈_타입
  const pattern = /^(초[3-6]|중[1-3]|고[1-3])_(.+?)_(.+?)_(문제|해설)$/;
  const match = name.match(pattern);

  if (match) {
    const [, grade, course, series, type] = match;

    result.grade = grade;
    result.course = course;
    result.series = series;
    result.type = type === '문제' ? 'problem' : 'solution';

    // 학교급 결정
    if (grade.startsWith('초')) {
      result.schoolLevel = 'elementary';
    } else if (grade.startsWith('중')) {
      result.schoolLevel = 'middle';
    } else if (grade.startsWith('고')) {
      result.schoolLevel = 'high';
    }
  }

  return result;
}

/**
 * 검색 키워드 생성
 */
export function generateSearchKeywords(doc: ParsedDocument): string[] {
  const keywords: string[] = [];

  if (doc.grade) keywords.push(doc.grade);
  if (doc.course) keywords.push(doc.course);
  if (doc.series) keywords.push(doc.series);

  // 축약어 추가
  if (doc.series) {
    // "수학의바이블" → "수바"
    if (doc.series.includes('수학의바이블')) keywords.push('수바');
    if (doc.series.includes('개념원리')) keywords.push('개원');
    if (doc.series.includes('블랙라벨')) keywords.push('블라');
  }

  return keywords;
}
```

---

### Phase 34.5-B: useDocumentIndex 확장 (30분)

```typescript
// frontend/src/hooks/useDocumentIndex.ts

import { useMemo } from 'react';
import { useDocuments } from './useDocuments';
import { parseDocumentName, DocumentCombo, DocumentIndex } from '../lib/documentParser';

export function useDocumentIndex() {
  const { data: documents, isLoading } = useDocuments();

  const index = useMemo<DocumentIndex | null>(() => {
    if (!documents) return null;

    const combosMap = new Map<string, DocumentCombo>();

    // 모든 문서 파싱
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
        } else {
          combo.solutionDocId = doc.document_id;
        }
        combo.isComplete = !!(combo.problemDocId && combo.solutionDocId);
      }
    });

    const allCombos = Array.from(combosMap.values());

    // 학교급별 구조 생성
    const schools = buildSchoolStructure(allCombos);

    return { allCombos, schools };
  }, [documents]);

  return { index, isLoading };
}

function buildSchoolStructure(combos: DocumentCombo[]) {
  // ... 구조화 로직
}
```

---

### Phase 34.5-C: useDocumentSearch 훅 (30분)

```typescript
// frontend/src/hooks/useDocumentSearch.ts

import { useState, useMemo, useCallback } from 'react';
import { DocumentCombo } from '../lib/documentParser';

interface UseDocumentSearchProps {
  combos: DocumentCombo[];
}

export function useDocumentSearch({ combos }: UseDocumentSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const terms = query.toLowerCase().split(/\s+/);

    return combos
      .map((combo) => {
        const searchText = `${combo.grade} ${combo.course} ${combo.series}`.toLowerCase();

        // 모든 검색어가 포함되어야 함
        const matchCount = terms.filter((term) => searchText.includes(term)).length;
        const isMatch = matchCount === terms.length;

        return { combo, matchCount, isMatch };
      })
      .filter((item) => item.isMatch)
      .sort((a, b) => {
        // 완전 매치 우선, 그 다음 완비(문제+해설) 우선
        if (b.combo.isComplete !== a.combo.isComplete) {
          return b.combo.isComplete ? 1 : -1;
        }
        return b.matchCount - a.matchCount;
      })
      .slice(0, 10)  // 최대 10개
      .map((item) => item.combo);
  }, [combos, query]);

  return {
    query,
    setQuery,
    results,
    hasResults: results.length > 0,
    isSearching: query.trim().length > 0,
  };
}
```

---

### Phase 34.5-D: useRecentUsed 훅 (30분)

```typescript
// frontend/src/hooks/useRecentUsed.ts

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'recent_used_documents';
const MAX_RECENT = 4;

export interface RecentUsedItem {
  comboId: string;
  grade: string;
  course: string;
  series: string;
  problemDocId: string;
  solutionDocId: string;
  lastUsedAt: number;
}

export function useRecentUsed() {
  const [recentItems, setRecentItems] = useState<RecentUsedItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems));
  }, [recentItems]);

  // 추가/업데이트
  const addRecentUsed = useCallback((item: Omit<RecentUsedItem, 'lastUsedAt'>) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((i) => i.comboId !== item.comboId);
      const newItem: RecentUsedItem = {
        ...item,
        lastUsedAt: Date.now(),
      };
      return [newItem, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  return { recentItems, addRecentUsed };
}
```

---

### Phase 34.5-E: SmartSearchBox 컴포넌트 (45분)

```typescript
// frontend/src/components/main/SmartSearchBox.tsx

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchResultItem } from './SearchResultItem';
import { DocumentCombo } from '../../lib/documentParser';
import { useDocumentSearch } from '../../hooks/useDocumentSearch';

interface SmartSearchBoxProps {
  combos: DocumentCombo[];
  onSelect: (combo: DocumentCombo) => void;
}

export function SmartSearchBox({ combos, onSelect }: SmartSearchBoxProps) {
  const { query, setQuery, results, isSearching } = useDocumentSearch({ combos });
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showResults = isFocused && isSearching;

  return (
    <div className="relative">
      {/* 검색 입력창 */}
      <div className={`
        flex items-center gap-3 px-4 py-3 bg-grey-50 rounded-xl border-2 transition-all
        ${isFocused ? 'border-toss-blue bg-white shadow-lg' : 'border-transparent'}
      `}>
        <Search className="w-5 h-5 text-grey-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder='검색... (예: "고1 공통 수바", "중2 쎈")'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="flex-1 bg-transparent outline-none text-grey-900 placeholder:text-grey-400"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 hover:bg-grey-100 rounded">
            <X className="w-4 h-4 text-grey-400" />
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-grey-200 overflow-hidden z-50"
          >
            {results.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {results.map((combo) => (
                  <SearchResultItem
                    key={combo.id}
                    combo={combo}
                    query={query}
                    onClick={() => {
                      onSelect(combo);
                      setQuery('');
                      setIsFocused(false);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-grey-500">
                <p>검색 결과가 없습니다</p>
                <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
              </div>
            )}

            {/* 검색 팁 */}
            <div className="px-4 py-2 bg-grey-50 border-t border-grey-100">
              <p className="text-xs text-grey-500">
                💡 학년, 과정, 시리즈 일부만 입력해도 검색됩니다
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### Phase 34.5-F: SearchResultItem 컴포넌트 (20분)

```typescript
// frontend/src/components/main/SearchResultItem.tsx

import { FileText, BookOpen, Check, AlertCircle } from 'lucide-react';
import { DocumentCombo } from '../../lib/documentParser';

interface SearchResultItemProps {
  combo: DocumentCombo;
  query: string;
  onClick: () => void;
}

export function SearchResultItem({ combo, query, onClick }: SearchResultItemProps) {
  // 검색어 하이라이트
  const highlightText = (text: string) => {
    const terms = query.toLowerCase().split(/\s+/);
    let result = text;

    terms.forEach((term) => {
      if (term) {
        const regex = new RegExp(`(${term})`, 'gi');
        result = result.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
      }
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-grey-50 transition-colors text-left"
    >
      {/* 아이콘 */}
      <div className={`
        p-2 rounded-lg
        ${combo.isComplete ? 'bg-green-100' : 'bg-amber-100'}
      `}>
        <FileText className={`w-5 h-5 ${combo.isComplete ? 'text-green-600' : 'text-amber-600'}`} />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-grey-900">
          {highlightText(`${combo.grade} ${combo.course}`)}
        </div>
        <div className="text-sm text-grey-500">
          {highlightText(combo.series)}
        </div>
      </div>

      {/* 상태 */}
      <div className="flex items-center gap-1 text-xs">
        {combo.isComplete ? (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="w-3 h-3" />
            완비
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertCircle className="w-3 h-3" />
            일부
          </span>
        )}
      </div>
    </button>
  );
}
```

---

### Phase 34.5-G: RecentUsedSection + QuickStartCard (45분)

```typescript
// frontend/src/components/main/RecentUsedSection.tsx

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { QuickStartCard } from './QuickStartCard';
import { RecentUsedItem } from '../../hooks/useRecentUsed';

interface RecentUsedSectionProps {
  items: RecentUsedItem[];
  onStart: (item: RecentUsedItem) => void;
}

export function RecentUsedSection({ items, onStart }: RecentUsedSectionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-grey-400">
        <Clock className="w-8 h-8 mx-auto mb-2" />
        <p>최근 사용한 문서가 없습니다</p>
        <p className="text-sm mt-1">검색하거나 전체 찾아보기에서 선택하세요</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-500">⭐</span>
        <span className="text-sm font-medium text-grey-600">최근 사용</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item, index) => (
          <motion.div
            key={item.comboId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <QuickStartCard item={item} onStart={() => onStart(item)} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// frontend/src/components/main/QuickStartCard.tsx

import { motion } from 'framer-motion';
import { Play, FileText, BookOpen } from 'lucide-react';
import { RecentUsedItem } from '../../hooks/useRecentUsed';

interface QuickStartCardProps {
  item: RecentUsedItem;
  onStart: () => void;
}

// 학년별 색상
const gradeColors: Record<string, { bg: string; text: string; icon: string }> = {
  '초': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
  '중': { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
  '고': { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
};

export function QuickStartCard({ item, onStart }: QuickStartCardProps) {
  const colorKey = item.grade.charAt(0) as '초' | '중' | '고';
  const colors = gradeColors[colorKey] || gradeColors['고'];

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onStart}
      className={`
        w-full p-4 rounded-xl text-left transition-shadow
        ${colors.bg} hover:shadow-md
      `}
    >
      {/* 학년 뱃지 */}
      <div className={`text-xs font-semibold ${colors.text} mb-1`}>
        {item.grade}
      </div>

      {/* 과정 */}
      <div className="font-medium text-grey-900 truncate">
        {item.course}
      </div>

      {/* 시리즈 */}
      <div className="text-sm text-grey-500 truncate mt-0.5">
        {item.series}
      </div>

      {/* 바로 시작 버튼 */}
      <div className={`
        flex items-center gap-1 mt-3 text-sm font-medium ${colors.text}
      `}>
        <Play className="w-4 h-4" />
        바로 시작
      </div>
    </motion.button>
  );
}
```

---

### Phase 34.5-H: BrowseAllSection (1시간)

```typescript
// frontend/src/components/main/BrowseAllSection.tsx

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { SchoolTabs } from './SchoolTabs';
import { GradeCourseSelector } from './GradeCourseSelector';
import { SeriesGrid } from './SeriesGrid';
import { DocumentIndex, DocumentCombo, SchoolLevel } from '../../lib/documentParser';

interface BrowseAllSectionProps {
  index: DocumentIndex;
  onSelect: (combo: DocumentCombo) => void;
}

export function BrowseAllSection({ index, onSelect }: BrowseAllSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolLevel>('high');
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // 선택된 학년의 과정 목록
  const courses = selectedGrade
    ? index.schools[selectedSchool].grades
        .find((g) => g.id === selectedGrade)
        ?.courses || []
    : [];

  // 선택된 과정의 시리즈 목록
  const seriesList = selectedCourse
    ? courses.find((c) => c.id === selectedCourse)?.series || []
    : [];

  return (
    <div className="border-t border-grey-200 pt-4">
      {/* 헤더 (토글) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-2 text-grey-600 hover:text-grey-900"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <FolderOpen className="w-4 h-4" />
          전체 찾아보기
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {/* 내용 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 space-y-4">
              {/* 학교급 탭 */}
              <SchoolTabs
                value={selectedSchool}
                onChange={(school) => {
                  setSelectedSchool(school);
                  setSelectedGrade(null);
                  setSelectedCourse(null);
                }}
              />

              {/* 학년 + 과정 선택 */}
              <GradeCourseSelector
                school={selectedSchool}
                grades={index.schools[selectedSchool].grades}
                selectedGrade={selectedGrade}
                selectedCourse={selectedCourse}
                onGradeChange={(grade) => {
                  setSelectedGrade(grade);
                  setSelectedCourse(null);
                }}
                onCourseChange={setSelectedCourse}
              />

              {/* 시리즈 그리드 */}
              {selectedCourse && (
                <SeriesGrid
                  grade={selectedGrade!}
                  course={selectedCourse}
                  series={seriesList}
                  onSelect={(series) => {
                    const combo = index.allCombos.find(
                      (c) => c.grade === selectedGrade &&
                            c.course === selectedCourse &&
                            c.series === series.name
                    );
                    if (combo) onSelect(combo);
                  }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

```typescript
// frontend/src/components/main/SchoolTabs.tsx

import { SchoolLevel } from '../../lib/documentParser';

interface SchoolTabsProps {
  value: SchoolLevel;
  onChange: (school: SchoolLevel) => void;
}

const SCHOOLS: { id: SchoolLevel; label: string }[] = [
  { id: 'elementary', label: '초등학교' },
  { id: 'middle', label: '중학교' },
  { id: 'high', label: '고등학교' },
];

export function SchoolTabs({ value, onChange }: SchoolTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
      {SCHOOLS.map((school) => (
        <button
          key={school.id}
          onClick={() => onChange(school.id)}
          className={`
            flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all
            ${value === school.id
              ? 'bg-white text-grey-900 shadow-sm'
              : 'text-grey-500 hover:text-grey-700'}
          `}
        >
          {school.label}
        </button>
      ))}
    </div>
  );
}
```

```typescript
// frontend/src/components/main/GradeCourseSelector.tsx

import { GradeInfo, SchoolLevel } from '../../lib/documentParser';

interface GradeCourseSelectorProps {
  school: SchoolLevel;
  grades: GradeInfo[];
  selectedGrade: string | null;
  selectedCourse: string | null;
  onGradeChange: (grade: string) => void;
  onCourseChange: (course: string) => void;
}

export function GradeCourseSelector({
  school,
  grades,
  selectedGrade,
  selectedCourse,
  onGradeChange,
  onCourseChange,
}: GradeCourseSelectorProps) {
  const selectedGradeInfo = grades.find((g) => g.id === selectedGrade);

  return (
    <div className="space-y-3">
      {/* 학년 선택 */}
      <div>
        <div className="text-xs text-grey-500 mb-2">학년</div>
        <div className="flex flex-wrap gap-2">
          {grades.map((grade) => (
            <button
              key={grade.id}
              onClick={() => onGradeChange(grade.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedGrade === grade.id
                  ? 'bg-toss-blue text-white'
                  : 'bg-grey-100 text-grey-700 hover:bg-grey-200'}
              `}
            >
              {grade.label}
              <span className="ml-1 text-xs opacity-60">
                ({grade.courses.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 과정 선택 (학년 선택 후) */}
      {selectedGradeInfo && selectedGradeInfo.courses.length > 1 && (
        <div>
          <div className="text-xs text-grey-500 mb-2">과정</div>
          <div className="flex flex-wrap gap-2">
            {selectedGradeInfo.courses.map((course) => (
              <button
                key={course.id}
                onClick={() => onCourseChange(course.id)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${selectedCourse === course.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-grey-100 text-grey-700 hover:bg-grey-200'}
                `}
              >
                {course.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 과정이 1개인 경우 자동 선택 */}
      {selectedGradeInfo && selectedGradeInfo.courses.length === 1 && !selectedCourse && (
        <div className="text-sm text-grey-500">
          {/* 자동으로 onCourseChange 호출 */}
        </div>
      )}
    </div>
  );
}
```

---

### Phase 34.5-I: HeroSection 통합 (30분)

```typescript
// frontend/src/components/main/HeroSection.tsx

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { SmartSearchBox } from './SmartSearchBox';
import { RecentUsedSection } from './RecentUsedSection';
import { BrowseAllSection } from './BrowseAllSection';
import { useDocumentIndex } from '../../hooks/useDocumentIndex';
import { useRecentUsed } from '../../hooks/useRecentUsed';
import { useWorkSessionStore } from '../../stores/workSessionStore';
import { DocumentCombo } from '../../lib/documentParser';

export function HeroSection() {
  const navigate = useNavigate();
  const { index, isLoading } = useDocumentIndex();
  const { recentItems, addRecentUsed } = useRecentUsed();
  const { createSession } = useWorkSessionStore();

  // 세션 시작 핸들러
  const handleStartSession = useCallback(async (combo: DocumentCombo) => {
    if (!combo.problemDocId || !combo.solutionDocId) {
      alert('문제와 해설 파일이 모두 필요합니다.');
      return;
    }

    try {
      // 최근 사용에 추가
      addRecentUsed({
        comboId: combo.id,
        grade: combo.grade,
        course: combo.course,
        series: combo.series,
        problemDocId: combo.problemDocId,
        solutionDocId: combo.solutionDocId,
      });

      // 세션 생성
      const session = await createSession({
        problemDocumentId: combo.problemDocId,
        problemDocumentName: combo.problemDocId,
        solutionDocumentId: combo.solutionDocId,
        solutionDocumentName: combo.solutionDocId,
        name: `${combo.grade} ${combo.course} - ${combo.series}`,
      });

      navigate(`/work/${session.sessionId}`);
    } catch (error) {
      console.error('세션 생성 실패:', error);
    }
  }, [createSession, navigate, addRecentUsed]);

  // 최근 사용에서 시작
  const handleRecentStart = useCallback((item: RecentUsedItem) => {
    handleStartSession({
      id: item.comboId,
      schoolLevel: item.grade.startsWith('초') ? 'elementary' :
                   item.grade.startsWith('중') ? 'middle' : 'high',
      grade: item.grade,
      course: item.course,
      series: item.series,
      problemDocId: item.problemDocId,
      solutionDocId: item.solutionDocId,
      isComplete: true,
    });
  }, [handleStartSession]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-toss-blue/5 via-white to-purple-500/5 rounded-2xl p-8 mb-8 border border-grey-100">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-grey-200 border-t-toss-blue rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-toss-blue/5 via-white to-purple-500/5 rounded-2xl p-8 mb-8 border border-grey-100">
      {/* 타이틀 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-toss-blue/10 text-toss-blue rounded-full text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" />
          새 작업
        </div>
        <h2 className="text-2xl font-bold text-grey-900 mb-2">
          라벨링을 시작하세요
        </h2>
        <p className="text-grey-600">
          학년, 과정, 시리즈를 검색하거나 최근 사용에서 바로 시작하세요
        </p>
      </div>

      {/* 검색창 */}
      <SmartSearchBox
        combos={index?.allCombos || []}
        onSelect={handleStartSession}
      />

      {/* 구분선 */}
      <div className="my-6 border-t border-grey-200" />

      {/* 최근 사용 */}
      <RecentUsedSection
        items={recentItems}
        onStart={handleRecentStart}
      />

      {/* 구분선 */}
      <div className="my-6 border-t border-grey-200" />

      {/* 전체 찾아보기 */}
      {index && (
        <BrowseAllSection
          index={index}
          onSelect={handleStartSession}
        />
      )}
    </div>
  );
}
```

---

## 5. 파일 변경 요약

### 신규 파일 (12개)

```
frontend/src/
├── lib/
│   └── documentParser.ts           # 파일명 파싱 (확장)
│
├── hooks/
│   ├── useDocumentIndex.ts         # 문서 인덱스 (확장)
│   ├── useRecentUsed.ts            # 최근 사용 훅
│   └── useDocumentSearch.ts        # 검색 훅
│
└── components/main/
    ├── SmartSearchBox.tsx          # 검색창
    ├── SearchResultItem.tsx        # 검색 결과 항목
    ├── RecentUsedSection.tsx       # 최근 사용 섹션
    ├── QuickStartCard.tsx          # 빠른 시작 카드
    ├── BrowseAllSection.tsx        # 전체 찾아보기
    ├── SchoolTabs.tsx              # 초/중/고 탭
    ├── GradeCourseSelector.tsx     # 학년+과정 선택
    └── SeriesGrid.tsx              # 시리즈 그리드
```

### 수정 파일 (2개)

```
frontend/src/components/main/
├── index.ts                        # 내보내기 업데이트
└── HeroSection.tsx                 # 전체 리팩토링
```

### 삭제 파일 (4개)

```
frontend/src/components/main/
├── DocumentDropdown.tsx            # 더 이상 사용 안 함
├── GradeSelector.tsx               # 더 이상 사용 안 함 (기존 계획)
├── SeriesSelector.tsx              # 더 이상 사용 안 함 (기존 계획)
└── SelectionSummary.tsx            # 더 이상 사용 안 함 (기존 계획)
```

---

## 6. 마일스톤

| 단계 | 작업 | 예상 시간 | 체크 |
|------|------|-----------|------|
| **34.5-A** | 파싱 로직 확장 | 30분 | ⬜ |
| **34.5-B** | useDocumentIndex 확장 | 30분 | ⬜ |
| **34.5-C** | useDocumentSearch 훅 | 30분 | ⬜ |
| **34.5-D** | useRecentUsed 훅 | 30분 | ⬜ |
| **34.5-E** | SmartSearchBox | 45분 | ⬜ |
| **34.5-F** | SearchResultItem | 20분 | ⬜ |
| **34.5-G** | RecentUsedSection + QuickStartCard | 45분 | ⬜ |
| **34.5-H** | BrowseAllSection + 하위 컴포넌트 | 1시간 | ⬜ |
| **34.5-I** | HeroSection 통합 | 30분 | ⬜ |
| **34.5-J** | 테스트 및 버그 수정 | 30분 | ⬜ |
| | **총계** | **5시간 30분** | |

---

## 7. 테스트 체크리스트

### 검색 기능

- [ ] "고1 공통 수바" 검색 → 결과 표시
- [ ] "중2 쎈" 검색 → 결과 표시
- [ ] 검색어 하이라이트
- [ ] 완비(문제+해설) 상태 표시
- [ ] 검색 결과 클릭 → 세션 시작

### 최근 사용

- [ ] 세션 시작 시 최근 사용에 추가
- [ ] 최대 4개 표시
- [ ] 바로 시작 클릭 → 세션 시작
- [ ] 새로고침 후에도 유지 (localStorage)

### 전체 찾아보기

- [ ] 접기/펼치기 동작
- [ ] 초/중/고 탭 전환
- [ ] 학년 선택 → 과정 표시
- [ ] 과정 선택 → 시리즈 표시
- [ ] 시리즈 선택 → 세션 시작

### 파일 네이밍

- [ ] `고1_공통수학1_수학의바이블_문제.pdf` 파싱
- [ ] `중3_수학_개념원리_해설.pdf` 파싱 (과정 단일)
- [ ] 파싱 실패 시 무시 (에러 없음)

---

## 8. 성공 지표

| 시나리오 | 목표 시간 | 클릭 수 |
|----------|----------|---------|
| 반복 사용 (80%) | **2초** | **1클릭** |
| 새 파일 검색 (15%) | **5초** | **2클릭** |
| 전체 탐색 (5%) | **10초** | **4클릭** |

---

*계획 작성: Claude Code*
*최종 업데이트: 2025-12-03*
