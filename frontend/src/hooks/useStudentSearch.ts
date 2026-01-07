/**
 * useStudentSearch - 학생 검색 훅
 *
 * Stage 17: 공지 등록 모달
 * - @mention 학생 검색용
 * - Supabase 미연결 시 Mock 데이터 사용
 * - debounce 적용
 */

import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from './useDebouncedValue';
import type { TaggedStudent } from '../types/admin';

// =====================================================
// Mock 데이터 (Supabase 연결 전)
// =====================================================

const MOCK_STUDENTS: TaggedStudent[] = [
  { id: 'student-1', name: '홍길동', grade: '중3', school: '서울중학교' },
  { id: 'student-2', name: '김철수', grade: '고1', school: '강남고등학교' },
  { id: 'student-3', name: '이영희', grade: '중2', school: '한강중학교' },
  { id: 'student-4', name: '박민수', grade: '고2', school: '서초고등학교' },
  { id: 'student-5', name: '정수진', grade: '중1', school: '역삼중학교' },
  { id: 'student-6', name: '최동현', grade: '고3', school: '압구정고등학교' },
  { id: 'student-7', name: '강예진', grade: '중3', school: '대치중학교' },
  { id: 'student-8', name: '윤서연', grade: '고1', school: '휘문고등학교' },
  { id: 'student-9', name: '임재현', grade: '중2', school: '도곡중학교' },
  { id: 'student-10', name: '한소희', grade: '고2', school: '은광여고' },
  { id: 'student-11', name: '김민지', grade: '중1', school: '서울중학교' },
  { id: 'student-12', name: '이준호', grade: '고1', school: '강남고등학교' },
];

// =====================================================
// 타입 정의
// =====================================================

interface UseStudentSearchOptions {
  /** debounce 지연 시간 (ms), 기본 300ms */
  debounceDelay?: number;
  /** 최대 결과 수, 기본 10개 */
  maxResults?: number;
  /** 최소 검색어 길이, 기본 1자 */
  minQueryLength?: number;
}

interface UseStudentSearchResult {
  /** 검색어 */
  query: string;
  /** 검색어 설정 */
  setQuery: (query: string) => void;
  /** 검색 결과 */
  results: TaggedStudent[];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 검색 중인지 (debounce 대기 포함) */
  isSearching: boolean;
  /** 결과 초기화 */
  clear: () => void;
}

// =====================================================
// 훅 구현
// =====================================================

/**
 * 학생 검색 훅
 *
 * @param options - 검색 옵션
 * @returns 검색 결과 및 상태
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isLoading } = useStudentSearch();
 *
 * return (
 *   <div>
 *     <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *     {results.map(student => (
 *       <div key={student.id}>{student.name}</div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useStudentSearch(
  options: UseStudentSearchOptions = {}
): UseStudentSearchResult {
  const {
    debounceDelay = 300,
    maxResults = 10,
    minQueryLength = 1,
  } = options;

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // debounce된 검색어
  const debouncedQuery = useDebouncedValue(query, debounceDelay);

  // 검색 중인지 (실제 query와 debounced query가 다르면 대기 중)
  const isSearching = query !== debouncedQuery || isLoading;

  // 검색 결과 (메모이제이션)
  const results = useMemo(() => {
    // 최소 길이 미만이면 빈 배열
    if (debouncedQuery.length < minQueryLength) {
      return [];
    }

    // Mock 검색 로직 (추후 Supabase로 교체)
    const normalizedQuery = debouncedQuery.toLowerCase().trim();

    const filtered = MOCK_STUDENTS.filter((student) => {
      // 이름으로 검색
      if (student.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      // 학년으로 검색
      if (student.grade?.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      // 학교로 검색
      if (student.school?.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      return false;
    });

    // 이름 일치 우선 정렬
    const sorted = filtered.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(normalizedQuery);
      const bNameMatch = b.name.toLowerCase().startsWith(normalizedQuery);

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return a.name.localeCompare(b.name, 'ko');
    });

    return sorted.slice(0, maxResults);
  }, [debouncedQuery, minQueryLength, maxResults]);

  // 시뮬레이션 로딩 (실제 API 호출 시 제거)
  useEffect(() => {
    if (debouncedQuery.length >= minQueryLength) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
    setIsLoading(false);
  }, [debouncedQuery, minQueryLength]);

  // 초기화 함수
  const clear = () => {
    setQuery('');
  };

  return {
    query,
    setQuery,
    results,
    isLoading,
    isSearching,
    clear,
  };
}

export default useStudentSearch;
