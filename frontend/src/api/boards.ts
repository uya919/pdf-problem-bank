/**
 * Boards API - Timetable Studio 보드 저장/불러오기
 *
 * Stage 5: FigJam 스타일 캔버스 데이터 저장
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { CanvasState, TimetableBoard, CreateBoardInput, UpdateBoardInput } from '../types/canvas';

// ============================================
// API Functions
// ============================================

/**
 * 보드 목록 조회
 */
export async function fetchBoards(): Promise<TimetableBoard[]> {
  if (!isSupabaseConfigured) {
    return getLocalBoards();
  }

  const { data, error } = await supabase
    .from('timetable_boards')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch boards:', error);
    throw error;
  }

  return data || [];
}

/**
 * 단일 보드 조회
 */
export async function fetchBoard(id: string): Promise<TimetableBoard | null> {
  if (!isSupabaseConfigured) {
    return getLocalBoard(id);
  }

  const { data, error } = await supabase
    .from('timetable_boards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch board:', error);
    return null;
  }

  return data;
}

/**
 * 보드 생성
 */
export async function createBoard(input: CreateBoardInput): Promise<TimetableBoard> {
  if (!isSupabaseConfigured) {
    return createLocalBoard(input);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_boards')
    .insert({
      name: input.name,
      data: input.data,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create board:', error);
    throw error;
  }

  return data;
}

/**
 * 보드 업데이트
 */
export async function updateBoard(id: string, input: UpdateBoardInput): Promise<TimetableBoard> {
  if (!isSupabaseConfigured) {
    return updateLocalBoard(id, input);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('timetable_boards')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update board:', error);
    throw error;
  }

  return data;
}

/**
 * 보드 삭제
 */
export async function deleteBoard(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    deleteLocalBoard(id);
    return;
  }

  const { error } = await supabase
    .from('timetable_boards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete board:', error);
    throw error;
  }
}

// ============================================
// LocalStorage Fallback (Supabase 미연결 시)
// ============================================

const LOCAL_STORAGE_KEY = 'timetable_studio_boards';

interface LocalBoardsData {
  boards: TimetableBoard[];
}

function getLocalBoardsData(): LocalBoardsData {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : { boards: [] };
  } catch {
    return { boards: [] };
  }
}

function saveLocalBoardsData(data: LocalBoardsData): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
}

function getLocalBoards(): TimetableBoard[] {
  return getLocalBoardsData().boards;
}

function getLocalBoard(id: string): TimetableBoard | null {
  const { boards } = getLocalBoardsData();
  return boards.find((b) => b.id === id) || null;
}

function createLocalBoard(input: CreateBoardInput): TimetableBoard {
  const { boards } = getLocalBoardsData();
  const newBoard: TimetableBoard = {
    id: `local-${Date.now()}`,
    name: input.name,
    data: input.data,
    created_by: 'local',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  boards.unshift(newBoard);
  saveLocalBoardsData({ boards });

  return newBoard;
}

function updateLocalBoard(id: string, input: UpdateBoardInput): TimetableBoard {
  const { boards } = getLocalBoardsData();
  const index = boards.findIndex((b) => b.id === id);

  if (index === -1) {
    throw new Error('Board not found');
  }

  boards[index] = {
    ...boards[index],
    ...input,
    updated_at: new Date().toISOString(),
  };

  saveLocalBoardsData({ boards });
  return boards[index];
}

function deleteLocalBoard(id: string): void {
  const { boards } = getLocalBoardsData();
  const filtered = boards.filter((b) => b.id !== id);
  saveLocalBoardsData({ boards: filtered });
}

// ============================================
// 자동 저장 (localStorage)
// ============================================

const AUTO_SAVE_KEY = 'timetable_studio_autosave';

/**
 * 자동 저장
 */
export function autoSave(state: CanvasState): void {
  try {
    localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({
      state,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('Auto-save failed:', e);
  }
}

/**
 * 자동 저장 불러오기
 */
export function loadAutoSave(): { state: CanvasState; savedAt: string } | null {
  try {
    const data = localStorage.getItem(AUTO_SAVE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * 자동 저장 삭제
 */
export function clearAutoSave(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
}
