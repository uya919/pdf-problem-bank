# Phase 34.5: 2단계 문서 선택 UI 개발 계획

> **목표**: 100개+ 문서 환경에서 3초 내 문서 선택 가능한 UI 구현
> **작성일**: 2025-12-03
> **예상 소요**: 4-5시간
> **기반 문서**: `59_ux_redesign_large_scale_document_management.md`

---

## 1. 구현 목표

### 1.1 핵심 기능

```
┌─────────────────────────────────────────────────────────────┐
│  1. 학년 선택 (GradeSelector)                                │
│     → 중1~고3 6개 학년 버튼/탭                               │
│                                                             │
│  2. 시리즈 선택 (SeriesSelector)                             │
│     → 선택된 학년의 시리즈 그리드 표시                        │
│     → 검색 기능                                              │
│     → 최근 사용 표시                                         │
│                                                             │
│  3. 자동 페어링 (AutoPairing)                                │
│     → 시리즈 선택 시 문제+해설 자동 매칭                      │
│                                                             │
│  4. 파일명 파싱 (DocumentParser)                             │
│     → {학년}_{시리즈}_{타입}.pdf 자동 인식                    │
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
│  │  │  학년 선택                                      │ │   │
│  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │ │   │
│  │  │  │중1 │ │중2 │ │중3 │ │고1 │ │고2 │ │고3 │   │ │   │
│  │  │  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   │ │   │
│  │  │                        ▲선택                   │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  시리즈 선택 (고1)                              │ │   │
│  │  │  🔍 검색...                                    │ │   │
│  │  │                                                │ │   │
│  │  │  ⭐ 최근 사용                                  │ │   │
│  │  │  ┌──────────┐ ┌──────────┐                    │ │   │
│  │  │  │수학의바이블│ │   쎈    │                    │ │   │
│  │  │  └──────────┘ └──────────┘                    │ │   │
│  │  │                                                │ │   │
│  │  │  📚 전체 시리즈                                │ │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │ │   │
│  │  │  │개념원리 │ │기출문제│ │블랙라벨 │ │수학의정석│ │ │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │  ✅ 선택됨: 고1 수학의바이블                    │ │   │
│  │  │  📄 문제: 고1_수학의바이블_문제.pdf             │ │   │
│  │  │  📖 해설: 고1_수학의바이블_해설.pdf             │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │                  [ ▶ 작업 시작 ]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  📂 진행 중인 작업 (2)                                      │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 컴포넌트 구조

### 2.1 컴포넌트 트리

```
MainPage
└── HeroSection (수정)
    ├── GradeSelector (신규)
    │   └── GradeButton × 6
    │
    ├── SeriesSelector (신규)
    │   ├── SearchInput
    │   ├── RecentSeriesSection
    │   │   └── SeriesCard × N
    │   └── AllSeriesSection
    │       └── SeriesCard × N
    │
    └── SelectionSummary (신규)
        ├── SelectedDocuments
        └── StartButton
```

### 2.2 파일 구조

```
frontend/src/
├── components/main/
│   ├── index.ts                    # 내보내기 업데이트
│   ├── HeroSection.tsx             # 수정
│   ├── GradeSelector.tsx           # 신규
│   ├── SeriesSelector.tsx          # 신규
│   ├── SeriesCard.tsx              # 신규
│   └── SelectionSummary.tsx        # 신규
│
├── hooks/
│   ├── useDocumentParser.ts        # 신규: 파일명 파싱
│   ├── useDocumentIndex.ts         # 신규: 학년/시리즈 인덱스
│   └── useRecentSeries.ts          # 신규: 최근 사용 시리즈
│
└── lib/
    └── documentParser.ts           # 신규: 파싱 로직
```

---

## 3. 개발 단계

### Phase 34.5-A: 파일명 파싱 로직 (30분)

#### 34.5-A-1: documentParser.ts

```typescript
// frontend/src/lib/documentParser.ts

export interface ParsedDocument {
  grade: string | null;       // "고1", "중3", etc.
  series: string | null;      // "수학의바이블", etc.
  type: 'problem' | 'solution' | null;
  original: string;           // 원본 파일명
}

export interface DocumentIndex {
  grades: Map<string, GradeInfo>;
}

export interface GradeInfo {
  label: string;              // "고등학교 1학년"
  series: Map<string, SeriesInfo>;
}

export interface SeriesInfo {
  name: string;
  problemDocId: string | null;
  solutionDocId: string | null;
}

/**
 * 파일명에서 학년/시리즈/타입 파싱
 */
export function parseDocumentName(filename: string): ParsedDocument {
  // 패턴: {학년}_{시리즈}_{타입}.pdf
  const pattern = /^(중[1-3]|고[1-3])_(.+?)_(문제|해설)\.pdf$/i;
  const match = filename.match(pattern);

  if (match) {
    return {
      grade: match[1],
      series: match[2],
      type: match[3] === '문제' ? 'problem' : 'solution',
      original: filename,
    };
  }

  // 대안 패턴들 시도...
  return {
    grade: null,
    series: null,
    type: null,
    original: filename,
  };
}

/**
 * 문서 목록에서 학년/시리즈 인덱스 생성
 */
export function buildDocumentIndex(documents: Array<{document_id: string}>): DocumentIndex {
  const index: DocumentIndex = {
    grades: new Map(),
  };

  // 기본 학년 초기화
  const gradeLabels: Record<string, string> = {
    '중1': '중학교 1학년',
    '중2': '중학교 2학년',
    '중3': '중학교 3학년',
    '고1': '고등학교 1학년',
    '고2': '고등학교 2학년',
    '고3': '고등학교 3학년',
  };

  Object.entries(gradeLabels).forEach(([grade, label]) => {
    index.grades.set(grade, { label, series: new Map() });
  });

  // 문서 파싱 및 인덱스 구축
  documents.forEach((doc) => {
    const parsed = parseDocumentName(doc.document_id);
    if (parsed.grade && parsed.series) {
      const gradeInfo = index.grades.get(parsed.grade);
      if (gradeInfo) {
        if (!gradeInfo.series.has(parsed.series)) {
          gradeInfo.series.set(parsed.series, {
            name: parsed.series,
            problemDocId: null,
            solutionDocId: null,
          });
        }
        const seriesInfo = gradeInfo.series.get(parsed.series)!;
        if (parsed.type === 'problem') {
          seriesInfo.problemDocId = doc.document_id;
        } else {
          seriesInfo.solutionDocId = doc.document_id;
        }
      }
    }
  });

  return index;
}
```

#### 34.5-A-2: useDocumentIndex.ts

```typescript
// frontend/src/hooks/useDocumentIndex.ts

import { useMemo } from 'react';
import { useDocuments } from './useDocuments';
import { buildDocumentIndex, DocumentIndex } from '../lib/documentParser';

export function useDocumentIndex() {
  const { data: documents, isLoading } = useDocuments();

  const index = useMemo(() => {
    if (!documents) return null;
    return buildDocumentIndex(documents);
  }, [documents]);

  return { index, isLoading };
}
```

---

### Phase 34.5-B: GradeSelector 컴포넌트 (45분)

#### 34.5-B-1: GradeSelector.tsx

```typescript
// frontend/src/components/main/GradeSelector.tsx

import { motion } from 'framer-motion';

interface GradeSelectorProps {
  value: string | null;
  onChange: (grade: string) => void;
  seriesCountByGrade: Map<string, number>;
}

const GRADES = [
  { id: '중1', label: '중1', group: 'middle' },
  { id: '중2', label: '중2', group: 'middle' },
  { id: '중3', label: '중3', group: 'middle' },
  { id: '고1', label: '고1', group: 'high' },
  { id: '고2', label: '고2', group: 'high' },
  { id: '고3', label: '고3', group: 'high' },
];

export function GradeSelector({
  value,
  onChange,
  seriesCountByGrade,
}: GradeSelectorProps) {
  return (
    <div className="mb-6">
      <div className="text-sm font-medium text-grey-600 mb-3">학년 선택</div>

      <div className="flex gap-2 justify-center">
        {/* 중학교 그룹 */}
        <div className="flex gap-1.5 pr-3 border-r border-grey-200">
          {GRADES.filter((g) => g.group === 'middle').map((grade) => (
            <GradeButton
              key={grade.id}
              grade={grade}
              isSelected={value === grade.id}
              seriesCount={seriesCountByGrade.get(grade.id) || 0}
              onClick={() => onChange(grade.id)}
            />
          ))}
        </div>

        {/* 고등학교 그룹 */}
        <div className="flex gap-1.5 pl-3">
          {GRADES.filter((g) => g.group === 'high').map((grade) => (
            <GradeButton
              key={grade.id}
              grade={grade}
              isSelected={value === grade.id}
              seriesCount={seriesCountByGrade.get(grade.id) || 0}
              onClick={() => onChange(grade.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface GradeButtonProps {
  grade: { id: string; label: string };
  isSelected: boolean;
  seriesCount: number;
  onClick: () => void;
}

function GradeButton({ grade, isSelected, seriesCount, onClick }: GradeButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative px-4 py-3 rounded-xl font-medium transition-all
        ${isSelected
          ? 'bg-toss-blue text-white shadow-lg shadow-toss-blue/30'
          : 'bg-white text-grey-700 border border-grey-200 hover:border-toss-blue hover:text-toss-blue'}
      `}
    >
      <span className="text-base">{grade.label}</span>
      {seriesCount > 0 && (
        <span className={`
          block text-xs mt-0.5
          ${isSelected ? 'text-white/70' : 'text-grey-400'}
        `}>
          {seriesCount}개
        </span>
      )}
    </motion.button>
  );
}
```

---

### Phase 34.5-C: SeriesSelector 컴포넌트 (1시간)

#### 34.5-C-1: SeriesCard.tsx

```typescript
// frontend/src/components/main/SeriesCard.tsx

import { motion } from 'framer-motion';
import { BookOpen, Check, Star } from 'lucide-react';

interface SeriesCardProps {
  name: string;
  isSelected: boolean;
  isRecent: boolean;
  hasProblem: boolean;
  hasSolution: boolean;
  onClick: () => void;
}

export function SeriesCard({
  name,
  isSelected,
  isRecent,
  hasProblem,
  hasSolution,
  onClick,
}: SeriesCardProps) {
  const isComplete = hasProblem && hasSolution;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-xl text-left transition-all
        ${isSelected
          ? 'bg-toss-blue text-white shadow-lg'
          : 'bg-white border border-grey-200 hover:border-toss-blue hover:shadow-md'}
      `}
    >
      {/* 즐겨찾기 / 최근 사용 뱃지 */}
      {isRecent && !isSelected && (
        <Star className="absolute top-2 right-2 w-4 h-4 text-amber-400 fill-amber-400" />
      )}

      {/* 시리즈명 */}
      <div className="flex items-center gap-2">
        <BookOpen className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-grey-400'}`} />
        <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-grey-900'}`}>
          {name}
        </span>
      </div>

      {/* 상태 표시 */}
      <div className={`flex items-center gap-2 mt-2 text-xs ${isSelected ? 'text-white/70' : 'text-grey-500'}`}>
        {isComplete ? (
          <>
            <Check className="w-3 h-3" />
            <span>문제+해설</span>
          </>
        ) : (
          <span>
            {hasProblem ? '문제만' : hasSolution ? '해설만' : '파일 없음'}
          </span>
        )}
      </div>

      {/* 선택됨 체크 */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow"
        >
          <Check className="w-3 h-3 text-toss-blue" />
        </motion.div>
      )}
    </motion.button>
  );
}
```

#### 34.5-C-2: SeriesSelector.tsx

```typescript
// frontend/src/components/main/SeriesSelector.tsx

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SeriesCard } from './SeriesCard';
import { SeriesInfo } from '../../lib/documentParser';

interface SeriesSelectorProps {
  grade: string | null;
  seriesMap: Map<string, SeriesInfo> | null;
  value: string | null;
  onChange: (series: string | null) => void;
  recentSeries: string[];
}

export function SeriesSelector({
  grade,
  seriesMap,
  value,
  onChange,
  recentSeries,
}: SeriesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 시리즈 목록
  const allSeries = useMemo(() => {
    if (!seriesMap) return [];
    return Array.from(seriesMap.entries()).map(([name, info]) => ({
      name,
      ...info,
    }));
  }, [seriesMap]);

  // 검색 필터링
  const filteredSeries = useMemo(() => {
    if (!searchQuery) return allSeries;
    const query = searchQuery.toLowerCase();
    return allSeries.filter((s) => s.name.toLowerCase().includes(query));
  }, [allSeries, searchQuery]);

  // 최근 사용 시리즈
  const recentSeriesList = useMemo(() => {
    return allSeries.filter((s) => recentSeries.includes(s.name));
  }, [allSeries, recentSeries]);

  // 학년 미선택 시
  if (!grade) {
    return (
      <div className="p-8 text-center text-grey-400">
        <p>먼저 학년을 선택해주세요</p>
      </div>
    );
  }

  // 시리즈 없음
  if (allSeries.length === 0) {
    return (
      <div className="p-8 text-center text-grey-400">
        <p>등록된 시리즈가 없습니다</p>
        <p className="text-sm mt-1">파일을 업로드해주세요</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-medium text-grey-600 mb-3">
        시리즈 선택 ({grade})
      </div>

      {/* 검색창 - 10개 초과 시 표시 */}
      {allSeries.length > 10 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
          <input
            type="text"
            placeholder="시리즈 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {searchQuery ? (
          // 검색 결과
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-xs text-grey-500 mb-2">
              검색 결과 ({filteredSeries.length}개)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filteredSeries.map((series) => (
                <SeriesCard
                  key={series.name}
                  name={series.name}
                  isSelected={value === series.name}
                  isRecent={recentSeries.includes(series.name)}
                  hasProblem={!!series.problemDocId}
                  hasSolution={!!series.solutionDocId}
                  onClick={() => onChange(series.name)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          // 기본 뷰
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* 최근 사용 */}
            {recentSeriesList.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-grey-500 mb-2 flex items-center gap-1">
                  <span>⭐</span> 최근 사용
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {recentSeriesList.slice(0, 3).map((series) => (
                    <SeriesCard
                      key={series.name}
                      name={series.name}
                      isSelected={value === series.name}
                      isRecent={true}
                      hasProblem={!!series.problemDocId}
                      hasSolution={!!series.solutionDocId}
                      onClick={() => onChange(series.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 전체 시리즈 */}
            <div>
              <div className="text-xs text-grey-500 mb-2">
                📚 전체 시리즈 ({allSeries.length}개)
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {allSeries.map((series) => (
                  <SeriesCard
                    key={series.name}
                    name={series.name}
                    isSelected={value === series.name}
                    isRecent={recentSeries.includes(series.name)}
                    hasProblem={!!series.problemDocId}
                    hasSolution={!!series.solutionDocId}
                    onClick={() => onChange(series.name)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

### Phase 34.5-D: SelectionSummary 컴포넌트 (30분)

```typescript
// frontend/src/components/main/SelectionSummary.tsx

import { motion } from 'framer-motion';
import { FileText, BookOpen, Check, AlertCircle } from 'lucide-react';

interface SelectionSummaryProps {
  grade: string | null;
  series: string | null;
  problemDocId: string | null;
  solutionDocId: string | null;
}

export function SelectionSummary({
  grade,
  series,
  problemDocId,
  solutionDocId,
}: SelectionSummaryProps) {
  if (!grade || !series) return null;

  const isComplete = problemDocId && solutionDocId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        mt-4 p-4 rounded-xl border-2
        ${isComplete
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        {isComplete ? (
          <>
            <Check className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">
              {grade} {series} 선택됨
            </span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">
              {grade} {series} - 일부 파일 없음
            </span>
          </>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <FileText className={`w-4 h-4 ${problemDocId ? 'text-toss-blue' : 'text-grey-300'}`} />
          <span className={problemDocId ? 'text-grey-700' : 'text-grey-400'}>
            {problemDocId || '문제 파일 없음'}
          </span>
          {problemDocId && <Check className="w-4 h-4 text-green-500" />}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <BookOpen className={`w-4 h-4 ${solutionDocId ? 'text-purple-600' : 'text-grey-300'}`} />
          <span className={solutionDocId ? 'text-grey-700' : 'text-grey-400'}>
            {solutionDocId || '해설 파일 없음'}
          </span>
          {solutionDocId && <Check className="w-4 h-4 text-green-500" />}
        </div>
      </div>
    </motion.div>
  );
}
```

---

### Phase 34.5-E: HeroSection 통합 (1시간)

#### 34.5-E-1: HeroSection.tsx 수정

```typescript
// frontend/src/components/main/HeroSection.tsx (전체 교체)

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { GradeSelector } from './GradeSelector';
import { SeriesSelector } from './SeriesSelector';
import { SelectionSummary } from './SelectionSummary';
import { useDocumentIndex } from '../../hooks/useDocumentIndex';
import { useRecentSeries } from '../../hooks/useRecentSeries';
import { useWorkSessionStore } from '../../stores/workSessionStore';

export function HeroSection() {
  const navigate = useNavigate();
  const { index, isLoading } = useDocumentIndex();
  const { createSession, isLoading: sessionLoading } = useWorkSessionStore();
  const { recentSeries, addRecentSeries } = useRecentSeries();

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  // 학년별 시리즈 수
  const seriesCountByGrade = useMemo(() => {
    const counts = new Map<string, number>();
    if (index) {
      index.grades.forEach((gradeInfo, grade) => {
        counts.set(grade, gradeInfo.series.size);
      });
    }
    return counts;
  }, [index]);

  // 선택된 학년의 시리즈 맵
  const currentSeriesMap = useMemo(() => {
    if (!index || !selectedGrade) return null;
    return index.grades.get(selectedGrade)?.series || null;
  }, [index, selectedGrade]);

  // 선택된 시리즈의 문서 정보
  const selectedSeriesInfo = useMemo(() => {
    if (!currentSeriesMap || !selectedSeries) return null;
    return currentSeriesMap.get(selectedSeries) || null;
  }, [currentSeriesMap, selectedSeries]);

  // 시작 가능 여부
  const canStart = selectedSeriesInfo?.problemDocId && selectedSeriesInfo?.solutionDocId && !sessionLoading;

  // 학년 변경 시 시리즈 초기화
  const handleGradeChange = useCallback((grade: string) => {
    setSelectedGrade(grade);
    setSelectedSeries(null);
  }, []);

  // 작업 시작
  const handleStart = useCallback(async () => {
    if (!selectedSeriesInfo?.problemDocId || !selectedSeriesInfo?.solutionDocId) return;
    if (!selectedGrade || !selectedSeries) return;

    try {
      // 최근 사용 저장
      addRecentSeries(selectedGrade, selectedSeries);

      const session = await createSession({
        problemDocumentId: selectedSeriesInfo.problemDocId,
        problemDocumentName: selectedSeriesInfo.problemDocId,
        solutionDocumentId: selectedSeriesInfo.solutionDocId,
        solutionDocumentName: selectedSeriesInfo.solutionDocId,
        name: sessionName || `${selectedGrade} ${selectedSeries}`,
      });

      navigate(`/work/${session.sessionId}`);
    } catch (error) {
      console.error('[Phase 34.5] 세션 생성 실패:', error);
    }
  }, [selectedSeriesInfo, selectedGrade, selectedSeries, sessionName, createSession, navigate, addRecentSeries]);

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
          학년과 시리즈를 선택하면 문제와 해설이 자동으로 매칭됩니다
        </p>
      </div>

      {/* 세션 이름 (선택) */}
      <div className="flex justify-center mb-6">
        <input
          type="text"
          placeholder="세션 이름 (선택사항)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="w-80 px-4 py-2.5 text-sm border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
        />
      </div>

      {/* Step 1: 학년 선택 */}
      <GradeSelector
        value={selectedGrade}
        onChange={handleGradeChange}
        seriesCountByGrade={seriesCountByGrade}
      />

      {/* Step 2: 시리즈 선택 */}
      <div className="bg-white rounded-xl border border-grey-200 p-4">
        <SeriesSelector
          grade={selectedGrade}
          seriesMap={currentSeriesMap}
          value={selectedSeries}
          onChange={setSelectedSeries}
          recentSeries={recentSeries[selectedGrade || ''] || []}
        />
      </div>

      {/* 선택 요약 */}
      <SelectionSummary
        grade={selectedGrade}
        series={selectedSeries}
        problemDocId={selectedSeriesInfo?.problemDocId || null}
        solutionDocId={selectedSeriesInfo?.solutionDocId || null}
      />

      {/* 시작 버튼 */}
      <div className="flex justify-center mt-6">
        <Button
          variant="solid"
          size="lg"
          disabled={!canStart}
          onClick={handleStart}
          className="px-8"
        >
          {sessionLoading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
              세션 생성 중...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              작업 시작
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
```

---

### Phase 34.5-F: useRecentSeries 훅 (30분)

```typescript
// frontend/src/hooks/useRecentSeries.ts

import { useState, useCallback } from 'react';

interface RecentSeriesStore {
  [grade: string]: string[];  // 학년별 최근 시리즈 목록
}

const STORAGE_KEY = 'recent_series';
const MAX_RECENT = 5;

export function useRecentSeries() {
  const [recentSeries, setRecentSeries] = useState<RecentSeriesStore>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const addRecentSeries = useCallback((grade: string, series: string) => {
    setRecentSeries((prev) => {
      const gradeRecent = prev[grade] || [];
      const filtered = gradeRecent.filter((s) => s !== series);
      const updated = [series, ...filtered].slice(0, MAX_RECENT);

      const newState = { ...prev, [grade]: updated };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  return { recentSeries, addRecentSeries };
}
```

---

## 4. 파일 변경 요약

### 신규 파일 (8개)

```
frontend/src/
├── lib/
│   └── documentParser.ts           # 파일명 파싱 유틸리티
│
├── hooks/
│   ├── useDocumentIndex.ts         # 문서 인덱스 훅
│   └── useRecentSeries.ts          # 최근 사용 시리즈 훅
│
└── components/main/
    ├── GradeSelector.tsx           # 학년 선택 컴포넌트
    ├── SeriesSelector.tsx          # 시리즈 선택 컴포넌트
    ├── SeriesCard.tsx              # 시리즈 카드 컴포넌트
    └── SelectionSummary.tsx        # 선택 요약 컴포넌트
```

### 수정 파일 (2개)

```
frontend/src/components/main/
├── index.ts                        # 내보내기 추가
└── HeroSection.tsx                 # 전체 리팩토링
```

### 삭제 파일 (2개)

```
frontend/src/components/main/
├── DocumentDropdown.tsx            # 더 이상 사용 안 함
└── (기존 HeroSection 백업 권장)
```

---

## 5. 마일스톤

| 단계 | 작업 | 예상 시간 | 체크 |
|------|------|-----------|------|
| **34.5-A** | 파일명 파싱 로직 | 30분 | ⬜ |
| **34.5-B** | GradeSelector | 45분 | ⬜ |
| **34.5-C** | SeriesSelector + SeriesCard | 1시간 | ⬜ |
| **34.5-D** | SelectionSummary | 30분 | ⬜ |
| **34.5-E** | HeroSection 통합 | 1시간 | ⬜ |
| **34.5-F** | useRecentSeries | 30분 | ⬜ |
| **34.5-G** | 테스트 및 버그 수정 | 30분 | ⬜ |
| | **총계** | **4시간 45분** | |

---

## 6. 의존성 순서

```
34.5-A (파싱 로직) ───────────────────────────┐
                                              │
34.5-B (GradeSelector) ──┐                    │
                         ├──► 34.5-E (통합) ──┼──► 34.5-G (테스트)
34.5-C (SeriesSelector) ─┤                    │
                         │                    │
34.5-D (Summary) ────────┘                    │
                                              │
34.5-F (useRecentSeries) ─────────────────────┘
```

---

## 7. 테스트 체크리스트

### 기능 테스트

- [ ] 학년 버튼 클릭 시 시리즈 목록 변경
- [ ] 시리즈 검색 (10개 초과 시 검색창 표시)
- [ ] 최근 사용 시리즈 상단 표시
- [ ] 시리즈 선택 시 문제/해설 자동 매칭
- [ ] 작업 시작 버튼 활성화 조건
- [ ] 세션 생성 및 페이지 이동

### 파일명 파싱 테스트

- [ ] `고1_수학의바이블_문제.pdf` → 정상 파싱
- [ ] `중3_쎈_해설.pdf` → 정상 파싱
- [ ] `random_file.pdf` → null 반환 (미분류)
- [ ] 대소문자 혼용 처리

### 엣지 케이스

- [ ] 문서가 없을 때 빈 상태 표시
- [ ] 특정 학년에 문서가 없을 때
- [ ] 문제만 있고 해설이 없을 때
- [ ] 해설만 있고 문제가 없을 때

---

## 8. 성공 지표

| 지표 | 현재 (드롭다운) | 목표 (2단계) |
|------|----------------|--------------|
| 선택 시간 | 15초+ | **3초 이하** |
| 클릭 수 | 5+ | **3회** |
| 오선택률 | 10%+ | **2% 이하** |

---

*계획 작성: Claude Code*
*최종 업데이트: 2025-12-03*
