/**
 * Phase 40: 방문한 페이지 추적 훅
 *
 * 사용자가 방문한 페이지들을 추적하고 localStorage에 영속화
 */
import { useState, useEffect, useCallback } from 'react';

interface VisitedPagesState {
  visitedPages: Set<number>;
  markVisited: (pageIndex: number) => void;
  clearVisited: () => void;
  isVisited: (pageIndex: number) => boolean;
  getVisitedList: () => number[];
}

/**
 * 방문한 페이지를 추적하는 훅
 * @param documentId - 문서 ID (localStorage 키에 사용)
 * @param currentPage - 현재 페이지 (자동으로 방문 처리)
 */
export function useVisitedPages(
  documentId: string,
  currentPage: number
): VisitedPagesState {
  const storageKey = `visited_pages_${documentId}`;

  // localStorage에서 초기값 로드
  const [visitedPages, setVisitedPages] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set<number>(parsed);
      }
    } catch (e) {
      console.warn('Failed to load visited pages:', e);
    }
    return new Set<number>();
  });

  // localStorage에 저장
  useEffect(() => {
    try {
      const arr = Array.from(visitedPages);
      localStorage.setItem(storageKey, JSON.stringify(arr));
    } catch (e) {
      console.warn('Failed to save visited pages:', e);
    }
  }, [visitedPages, storageKey]);

  // 현재 페이지 자동 방문 처리
  useEffect(() => {
    if (!visitedPages.has(currentPage)) {
      setVisitedPages(prev => new Set([...prev, currentPage]));
    }
  }, [currentPage]);

  // 페이지 방문 표시
  const markVisited = useCallback((pageIndex: number) => {
    setVisitedPages(prev => {
      if (prev.has(pageIndex)) return prev;
      return new Set([...prev, pageIndex]);
    });
  }, []);

  // 방문 기록 초기화
  const clearVisited = useCallback(() => {
    setVisitedPages(new Set());
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // 방문 여부 확인
  const isVisited = useCallback((pageIndex: number) => {
    return visitedPages.has(pageIndex);
  }, [visitedPages]);

  // 방문한 페이지 목록 (정렬됨)
  const getVisitedList = useCallback(() => {
    return Array.from(visitedPages).sort((a, b) => a - b);
  }, [visitedPages]);

  return {
    visitedPages,
    markVisited,
    clearVisited,
    isVisited,
    getVisitedList,
  };
}
