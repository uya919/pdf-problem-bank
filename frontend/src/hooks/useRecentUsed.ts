/**
 * useRecentUsed Hook (Phase 34.5-D)
 *
 * 최근 사용한 문서 조합 관리 (localStorage)
 */
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

  // localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems));
    } catch (e) {
      console.error('Failed to save recent items:', e);
    }
  }, [recentItems]);

  // 최근 사용에 추가/업데이트
  const addRecentUsed = useCallback((item: Omit<RecentUsedItem, 'lastUsedAt'>) => {
    setRecentItems((prev) => {
      // 기존 항목 제거
      const filtered = prev.filter((i) => i.comboId !== item.comboId);

      // 새 항목 추가 (맨 앞)
      const newItem: RecentUsedItem = {
        ...item,
        lastUsedAt: Date.now(),
      };

      // 최대 개수 유지
      return [newItem, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  // 특정 항목 제거
  const removeRecentUsed = useCallback((comboId: string) => {
    setRecentItems((prev) => prev.filter((i) => i.comboId !== comboId));
  }, []);

  // 전체 삭제
  const clearRecentUsed = useCallback(() => {
    setRecentItems([]);
  }, []);

  return {
    recentItems,
    addRecentUsed,
    removeRecentUsed,
    clearRecentUsed,
  };
}
