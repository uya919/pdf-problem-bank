/**
 * Phase 12-3: 키보드 단축키 훅
 *
 * 컴포넌트별 키보드 단축키 관리
 */
import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // 입력 필드에서는 단축키 무시
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Escape는 예외적으로 처리
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * 단축키 설명 목록 생성 (도움말용)
 */
export function formatShortcuts(shortcuts: KeyboardShortcut[]): string[] {
  return shortcuts
    .filter((s) => s.description)
    .map((s) => {
      const parts: string[] = [];
      if (s.ctrl) parts.push('Ctrl');
      if (s.shift) parts.push('Shift');
      if (s.alt) parts.push('Alt');
      parts.push(s.key.toUpperCase());
      return `${parts.join('+')} - ${s.description}`;
    });
}
