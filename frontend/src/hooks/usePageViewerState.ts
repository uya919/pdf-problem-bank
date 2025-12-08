/**
 * PageViewer 상태 관리 훅
 * Phase 61-A: PageViewer 컴포넌트에서 상태 로직 분리
 *
 * 이 훅은 PageViewer의 모든 상태와 기본 데이터 페칭을 관리합니다.
 */
import { useState, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePageBlocks,
  usePageGroups,
  useSavePageGroups,
  useBookPage,
  useDocumentSettings,
  useSaveDocumentSettings,
} from './useDocuments';
import { useProblemNumberContext } from './useProblemNumberContext';
import { useVisitedPages } from './useVisitedPages';
import { useWorkSessionStore } from '../stores/workSessionStore';
import type { ProblemGroup, WorkSession } from '../api/client';

// 크로스 페이지 선택 상태 타입
export interface CrossPageSelectionState {
  isActive: boolean;
  sourcePageIndex: number;
  sourceColumn: "L" | "R";
  sourceBlockIds: number[];
}

// 모문제 등록 모드 상태 타입
export interface ParentProblemModeState {
  isActive: boolean;
  parentGroupId: string | null;
  childNumbers: string[];
}

// 훅 파라미터
interface UsePageViewerStateParams {
  documentId: string;
  totalPages: number;
  initialPage?: number;
}

// 훅 반환 타입
export interface PageViewerState {
  // 기본 상태
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  selectedBlocks: number[];
  setSelectedBlocks: React.Dispatch<React.SetStateAction<number[]>>;
  localGroups: ProblemGroup[];
  setLocalGroups: React.Dispatch<React.SetStateAction<ProblemGroup[]>>;

  // 저장 상태
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  lastSaved: Date | null;
  setLastSaved: React.Dispatch<React.SetStateAction<Date | null>>;

  // UI 상태
  autoEditGroupId: string | null;
  setAutoEditGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  confirmingGroupId: string | null;
  setConfirmingGroupId: React.Dispatch<React.SetStateAction<string | null>>;
  isPageChanging: boolean;
  setIsPageChanging: React.Dispatch<React.SetStateAction<boolean>>;
  selectedGroupId: string | null;
  setSelectedGroupId: React.Dispatch<React.SetStateAction<string | null>>;

  // 모달 상태
  showDocumentSettings: boolean;
  setShowDocumentSettings: React.Dispatch<React.SetStateAction<boolean>>;
  hasCheckedSettings: boolean;
  setHasCheckedSettings: React.Dispatch<React.SetStateAction<boolean>>;

  // 크로스 페이지 상태
  crossPageSelection: CrossPageSelectionState;
  setCrossPageSelection: React.Dispatch<React.SetStateAction<CrossPageSelectionState>>;

  // 모문제 모드 상태
  parentProblemMode: ParentProblemModeState;
  setParentProblemMode: React.Dispatch<React.SetStateAction<ParentProblemModeState>>;

  // Refs
  debounceTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  isInitialLoadRef: React.MutableRefObject<boolean>;
  prevPageRef: React.MutableRefObject<number>;
  localGroupsRef: React.MutableRefObject<ProblemGroup[]>;
  hasUnsavedChangesRef: React.MutableRefObject<boolean>;

  // 데이터 쿼리
  blocksData: ReturnType<typeof usePageBlocks>['data'];
  blocksLoading: boolean;
  groupsData: ReturnType<typeof usePageGroups>['data'];
  bookPage: number | undefined;
  documentSettings: ReturnType<typeof useDocumentSettings>['data'];
  saveSettingsMutation: ReturnType<typeof useSaveDocumentSettings>;
  saveGroupsMutation: ReturnType<typeof useSavePageGroups>;

  // 파생 데이터
  previousPageLastNumber: string | null;
  displayPages: number[];
  sectionTitle: string;
  currentSession: WorkSession | null;
  previousPageParentGroups: Array<ProblemGroup & { pageIndex: number }>;
  prevPageGroupsData: ReturnType<typeof usePageGroups>['data'];

  // QueryClient
  queryClient: ReturnType<typeof useQueryClient>;
}

/**
 * PageViewer의 모든 상태를 관리하는 훅
 */
export function usePageViewerState({
  documentId,
  totalPages,
  initialPage = 0,
}: UsePageViewerStateParams): PageViewerState {
  const queryClient = useQueryClient();

  // 기본 상태
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [localGroups, setLocalGroups] = useState<ProblemGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // UI 상태
  const [autoEditGroupId, setAutoEditGroupId] = useState<string | null>(null);
  const [confirmingGroupId, setConfirmingGroupId] = useState<string | null>(null);
  const [isPageChanging, setIsPageChanging] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // 모달 상태
  const [showDocumentSettings, setShowDocumentSettings] = useState(false);
  const [hasCheckedSettings, setHasCheckedSettings] = useState(false);

  // 크로스 페이지 상태
  const [crossPageSelection, setCrossPageSelection] = useState<CrossPageSelectionState>({
    isActive: false,
    sourcePageIndex: -1,
    sourceColumn: "L",
    sourceBlockIds: [],
  });

  // 모문제 모드 상태
  const [parentProblemMode, setParentProblemMode] = useState<ParentProblemModeState>({
    isActive: false,
    parentGroupId: null,
    childNumbers: [],
  });

  // Refs
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const prevPageRef = useRef(currentPage);
  const localGroupsRef = useRef<ProblemGroup[]>([]);
  const hasUnsavedChangesRef = useRef(false);

  // 데이터 쿼리
  const { data: blocksData, isLoading: blocksLoading } = usePageBlocks(
    documentId,
    currentPage
  );

  const { data: groupsData } = usePageGroups(documentId, currentPage);

  const { bookPage } = useBookPage(documentId, currentPage);
  const { data: documentSettings } = useDocumentSettings(documentId);
  const saveSettingsMutation = useSaveDocumentSettings();
  const saveGroupsMutation = useSavePageGroups();

  // 이전 페이지 그룹 조회 (XP 그룹용)
  const hasXPGroups = localGroups.some(g => g.column === 'XP');
  const { data: prevPageGroupsData } = usePageGroups(
    documentId,
    currentPage > 0 ? currentPage - 1 : -1
  );

  // 이전 페이지의 모문제 그룹 목록
  const previousPageParentGroups = useMemo(() => {
    if (!hasXPGroups || !prevPageGroupsData?.groups) return [];
    return prevPageGroupsData.groups
      .filter(g => g.isParent === true)
      .map(g => ({
        ...g,
        pageIndex: currentPage - 1,
      }));
  }, [hasXPGroups, prevPageGroupsData, currentPage]);

  // 문항번호 연속성
  const { getLastProblemNumberBefore } = useProblemNumberContext(documentId);
  const previousPageLastNumber = getLastProblemNumberBefore(currentPage);

  // 방문한 페이지 추적
  const { getVisitedList } = useVisitedPages(documentId, currentPage);
  const visitedPages = getVisitedList().filter(p => p !== currentPage);

  // 저장된 페이지 (세션 데이터)
  const currentSession = useWorkSessionStore(state => state.currentSession);
  const savedPages = useMemo(() => {
    if (!currentSession?.problems) return [];
    const pages = [...new Set(currentSession.problems.map(p => p.pageIndex))];
    return pages.filter(p => p !== currentPage).sort((a, b) => a - b);
  }, [currentSession?.problems, currentPage]);

  // 표시할 페이지 목록
  const displayPages = currentSession ? savedPages : visitedPages;
  const sectionTitle = currentSession ? "저장된 페이지" : "방문한 페이지";

  return {
    // 기본 상태
    currentPage,
    setCurrentPage,
    selectedBlocks,
    setSelectedBlocks,
    localGroups,
    setLocalGroups,

    // 저장 상태
    isSaving,
    setIsSaving,
    lastSaved,
    setLastSaved,

    // UI 상태
    autoEditGroupId,
    setAutoEditGroupId,
    confirmingGroupId,
    setConfirmingGroupId,
    isPageChanging,
    setIsPageChanging,
    selectedGroupId,
    setSelectedGroupId,

    // 모달 상태
    showDocumentSettings,
    setShowDocumentSettings,
    hasCheckedSettings,
    setHasCheckedSettings,

    // 크로스 페이지 상태
    crossPageSelection,
    setCrossPageSelection,

    // 모문제 모드 상태
    parentProblemMode,
    setParentProblemMode,

    // Refs
    debounceTimerRef,
    isInitialLoadRef,
    prevPageRef,
    localGroupsRef,
    hasUnsavedChangesRef,

    // 데이터 쿼리
    blocksData,
    blocksLoading,
    groupsData,
    bookPage,
    documentSettings,
    saveSettingsMutation,
    saveGroupsMutation,

    // 파생 데이터
    previousPageLastNumber,
    displayPages,
    sectionTitle,
    currentSession,
    previousPageParentGroups,
    prevPageGroupsData,

    // QueryClient
    queryClient,
  };
}
