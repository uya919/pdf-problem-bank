/**
 * Group Management Panel (Phase 6-4: Redesigned, Phase 8: Problem Info Support, Phase 9: Auto Edit, Phase 11-1: Auto Confirm)
 *
 * Modern panel with cards, animations, and better UX
 * Now supports problem info display and editing
 * Phase 9: Auto-enter edit mode when group is created
 * Phase 11-1: Auto-confirm when block selection changes (if unmodified)
 * Phase 23: 확정 시스템 - 그룹 확정 시 자동 문제은행 등록
 * Phase 42-B: 해설 그룹 연결 상태 표시
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, Layers, Box, Edit2, BookOpen, Check, X, CheckCircle, Loader2, Link2, ChevronDown, ChevronUp, ArrowRight, XCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProblemGroup, ProblemInfo } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { LinkedBadge } from './matching/LinkedBadge';
import { getNextProblemNumber, getNextProblemNumberWithContext } from '../utils/problemNumberUtils';
import { GROUP_PREVIEW_COUNT } from '../constants/ui';

export interface GroupPanelProps {
  groups: ProblemGroup[];
  selectedBlocks: number[];
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onGroupSelect: (blockIds: number[]) => void;
  // Phase 8: 문항 정보 관련
  bookPage?: number;
  defaultBookName?: string;
  defaultCourse?: string;
  onUpdateGroupInfo?: (groupId: string, problemInfo: ProblemInfo) => void;
  // Phase 9: 자동 편집 모드
  autoEditGroupId?: string | null;
  onAutoEditComplete?: () => void;
  // Phase 10-2: 페이지간 문항번호 연속성
  previousPageLastNumber?: string | null;
  // Phase 22-K: 연결 관계 관리
  onNavigateToLinked?: (documentId: string, pageIndex: number) => void;
  onUnlinkGroup?: (groupId: string) => void;
  // Phase 23: 확정 시스템
  onConfirmGroup?: (groupId: string) => Promise<void>;
  onConfirmAll?: () => Promise<void>;
  confirmingGroupId?: string | null;
  // Phase 41-B: 선택된 문제 정보 (해설 자동 맵핑용)
  selectedProblemInfo?: {
    bookName?: string;
    course?: string;
    page?: number;
    problemNumber?: string;
  };
  // Phase 50-C: 크로스 페이지 모드
  crossPageMode?: {
    isActive: boolean;
    sourcePageIndex: number;
    sourceColumn: "L" | "R";
    sourceBlockCount: number;
  };
  onStartCrossPage?: () => void;
  onCancelCrossPage?: () => void;
  // Phase 56: 모문제-하위문제 연결
  onSetParentGroup?: (groupId: string, parentGroupId: string | null) => void;
  onToggleIsParent?: (groupId: string) => void;
  // Phase 56-G: 모문제 등록 모드 표시
  parentProblemMode?: {
    isActive: boolean;
    parentGroupId: string | null;
    childNumbers: string[];
  };
  // Phase 58-B: 이전 페이지 모문제 목록 (XP 그룹용)
  previousPageParentGroups?: Array<ProblemGroup & { pageIndex: number }>;
}

export function GroupPanel({
  groups,
  selectedBlocks,
  onCreateGroup,
  onDeleteGroup,
  onGroupSelect,
  bookPage,
  defaultBookName = '',
  defaultCourse = '',
  onUpdateGroupInfo,
  autoEditGroupId,
  onAutoEditComplete,
  previousPageLastNumber,
  onNavigateToLinked,
  onUnlinkGroup,
  onConfirmGroup,
  onConfirmAll,
  confirmingGroupId,
  selectedProblemInfo,
  // Phase 50-C: 크로스 페이지 모드
  crossPageMode,
  onStartCrossPage,
  onCancelCrossPage,
  // Phase 56: 모문제-하위문제 연결
  onSetParentGroup,
  onToggleIsParent,
  // Phase 56-G: 모문제 등록 모드
  parentProblemMode,
  // Phase 58-B: 이전 페이지 모문제 목록
  previousPageParentGroups = [],
}: GroupPanelProps) {
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProblemInfo>>({});
  const problemNumberInputRef = useRef<HTMLInputElement>(null);

  // Phase 11-1: 자동 확정을 위한 초기값 추적
  const [initialSuggestedNumber, setInitialSuggestedNumber] = useState<string | null>(null);

  // Phase 49-B: 그룹 접기 상태
  const [showAllGroups, setShowAllGroups] = useState(false);
  // Phase 61-C: GROUP_PREVIEW_COUNT moved to constants/ui.ts

  // Phase 56: 모문제 그룹 목록 (드롭다운용)
  // Phase 58-B: 이전 페이지 모문제도 포함
  const parentGroups = useMemo(() => {
    const currentPageParents = groups.filter(g => g.isParent === true);
    return currentPageParents;
  }, [groups]);

  // Phase 58-B: 현재 페이지 + 이전 페이지 모문제 통합 (XP 그룹용)
  const allParentGroups = useMemo(() => {
    const currentPageParents = groups.filter(g => g.isParent === true).map(g => ({
      ...g,
      pageIndex: undefined as number | undefined, // 현재 페이지
    }));
    return [...currentPageParents, ...previousPageParentGroups];
  }, [groups, previousPageParentGroups]);

  // Phase 49-C: 표시할 그룹 계산 (편집 중인 그룹 최상단 배치)
  const displayedGroups = useMemo(() => {
    const editingId = editingGroupId || autoEditGroupId;

    // 편집 중인 그룹이 있으면 최상단에 배치
    if (editingId) {
      const editingGroup = groups.find(g => g.id === editingId);
      const otherGroups = groups.filter(g => g.id !== editingId);

      if (editingGroup) {
        // 편집 그룹 + 나머지 (최대 4개 = GROUP_PREVIEW_COUNT - 1)
        const restCount = GROUP_PREVIEW_COUNT - 1;
        const displayedOthers = showAllGroups
          ? otherGroups
          : otherGroups.slice(0, restCount);
        return [editingGroup, ...displayedOthers];
      }
    }

    // 편집 중이 아니면 기존 로직
    if (showAllGroups || groups.length <= GROUP_PREVIEW_COUNT) {
      return groups;
    }
    return groups.slice(0, GROUP_PREVIEW_COUNT);
  }, [groups, showAllGroups, editingGroupId, autoEditGroupId]);

  const hiddenGroupCount = Math.max(0, groups.length - GROUP_PREVIEW_COUNT);

  // Phase 9: 자동 편집 모드 트리거
  useEffect(() => {
    if (autoEditGroupId) {
      const targetGroup = groups.find(g => g.id === autoEditGroupId);
      if (targetGroup) {
        // 애니메이션 충돌 방지를 위한 100ms 지연
        setTimeout(() => {
          startEditing(targetGroup);
          onAutoEditComplete?.();
        }, 100);
      }
    }
  }, [autoEditGroupId, groups]);

  // Phase 11-1: 자동 확정 (블록 선택 변경 시)
  useEffect(() => {
    // 편집 중이 아니면 무시
    if (!editingGroupId) return;

    // 블록이 선택되지 않았으면 무시 (선택 해제는 자동 확정 안 함)
    if (selectedBlocks.length === 0) return;

    // 수정되었으면 자동 확정 안 함
    const isUnmodified =
      initialSuggestedNumber !== null &&
      editForm.problemNumber === initialSuggestedNumber;

    if (!isUnmodified) return;

    // 필수 필드 검증
    if (!editForm.bookName || !editForm.problemNumber) return;

    console.log('[Auto-Confirm] Triggered by block selection change');

    // ✅ 자동 확정 실행
    saveEdit(editingGroupId);
  }, [selectedBlocks]);

  // Phase 49-B: 선택된 그룹이 숨겨진 경우 자동 펼침
  useEffect(() => {
    if (selectedBlocks.length > 0 && !showAllGroups) {
      const selectedGroupIndex = groups.findIndex(
        g => g.block_ids.some(id => selectedBlocks.includes(id))
      );
      if (selectedGroupIndex >= GROUP_PREVIEW_COUNT) {
        setShowAllGroups(true);
      }
    }
  }, [selectedBlocks, groups, showAllGroups]);

  // 편집 시작
  const startEditing = (group: ProblemGroup) => {
    setEditingGroupId(group.id);

    // Phase 41-B: 해설 모드 (selectedProblemInfo가 있으면) 선택된 문제 정보 사용
    const useMatchingDefaults = selectedProblemInfo != null;

    // Phase 10-2: 문항번호 자동 증가 (페이지간 연속성 지원)
    const suggestedProblemNumber = useMatchingDefaults
      ? selectedProblemInfo.problemNumber || '1'
      : (group.problemInfo?.problemNumber || getNextProblemNumberWithContext(groups, previousPageLastNumber || null));

    // Phase 11-1: 초기 제안값 저장 (자동 확정 판단용)
    setInitialSuggestedNumber(suggestedProblemNumber);

    setEditForm({
      bookName: useMatchingDefaults
        ? (selectedProblemInfo.bookName || defaultBookName)
        : (group.problemInfo?.bookName || defaultBookName),
      course: useMatchingDefaults
        ? (selectedProblemInfo.course || defaultCourse)
        : (group.problemInfo?.course || defaultCourse),
      page: useMatchingDefaults
        ? (selectedProblemInfo.page || bookPage || 1)
        : (group.problemInfo?.page || bookPage || 1),
      problemNumber: suggestedProblemNumber,
    });

    // Phase 9: 문항번호 필드 자동 포커스
    // Phase 56-K: preventScroll 옵션으로 강제 스크롤 방지
    setTimeout(() => {
      problemNumberInputRef.current?.focus({ preventScroll: true });
      problemNumberInputRef.current?.select();
    }, 50);

    if (useMatchingDefaults) {
      console.log('[Phase 41-B] Using selected problem info:', selectedProblemInfo);
    }
  };

  // 편집 저장
  const saveEdit = (groupId: string) => {
    if (onUpdateGroupInfo && editForm.bookName && editForm.problemNumber) {
      // Phase 34-A: 새로운 displayName 형식
      // 형식: 시리즈_과정_p페이지_문항번호번 (예: 베이직쎈_공통수학1_p13_3번)
      const parts = [
        editForm.bookName,
        editForm.course,
        editForm.page ? `p${editForm.page}` : null,
        `${editForm.problemNumber}번`,
      ].filter(Boolean);
      const displayName = parts.join('_');
      onUpdateGroupInfo(groupId, {
        bookName: editForm.bookName,
        course: editForm.course || '',
        page: editForm.page || 1,
        problemNumber: editForm.problemNumber,
        displayName,
      });
    }
    setEditingGroupId(null);
    setEditForm({});
    // Phase 11-1: 초기값 리셋
    setInitialSuggestedNumber(null);
  };

  // 편집 취소
  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditForm({});
    // Phase 11-1: 초기값 리셋
    setInitialSuggestedNumber(null);
  };

  // 편집 모드 키보드 핸들러 (Phase 9 추가: Enter 키 저장)
  const handleEditFormKeyDown = (e: React.KeyboardEvent, groupId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      saveEdit(groupId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit();
    }
  };

  // 표시 이름 가져오기
  const getDisplayName = (group: ProblemGroup): string => {
    if (group.problemInfo?.displayName) {
      return group.problemInfo.displayName;
    }
    return group.id; // 기본값: "L1", "R2" 등
  };

  // Get column color
  const getColumnColor = (column: string): string => {
    if (column === 'L') return 'bg-blue-100 text-blue-800';
    if (column === 'R') return 'bg-purple-100 text-purple-800';
    return 'bg-grey-100 text-grey-800';
  };

  // Phase 56: 그룹 타입에 따른 색상
  const getGroupTypeStyle = (group: ProblemGroup): string => {
    if (group.isParent) {
      return 'border-amber-300 bg-amber-50/50'; // 모문제: 노란색
    }
    if (group.parentGroupId) {
      return 'border-blue-300 bg-blue-50/50'; // 하위문제: 파란색
    }
    return 'border-grey-200'; // 일반 문제
  };

  // Phase 56: 모문제 이름 가져오기
  const getParentGroupName = (parentGroupId: string): string => {
    const parent = groups.find(g => g.id === parentGroupId);
    if (!parent) return parentGroupId;
    return parent.problemInfo?.displayName || parent.problemInfo?.problemNumber || parent.id;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            문제 그룹
          </CardTitle>
          <Badge variant="secondary">{groups.length}개</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Phase 50-C: 크로스 페이지 모드 상태 표시 */}
        {crossPageMode?.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  크로스 페이지 모드
                </span>
              </div>
              <button
                onClick={onCancelCrossPage}
                className="p-1 hover:bg-amber-100 rounded"
                title="취소 (Esc)"
                aria-label="크로스 페이지 모드 취소"
              >
                <XCircle className="w-4 h-4 text-amber-600" />
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              페이지 {crossPageMode.sourcePageIndex + 1}에서 {crossPageMode.sourceBlockCount}개 블록 선택됨
              ({crossPageMode.sourceColumn}컬럼)
            </p>
            <p className="text-xs text-amber-600 mt-1">
              이어지는 블록을 선택하고 Enter를 누르세요
            </p>
          </motion.div>
        )}

        {/* Phase 56-G: 모문제 등록 모드 상태 표시 */}
        {parentProblemMode?.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                모문제 등록 모드
              </span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              L키: 하위문제 추가 | G키: 완료 | ESC: 취소
            </p>
            {parentProblemMode.childNumbers.length > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                등록된 하위문제: {parentProblemMode.childNumbers.join(', ')}
              </p>
            )}
          </motion.div>
        )}

        {/* Create Group Button */}
        <Button
          onClick={onCreateGroup}
          disabled={selectedBlocks.length === 0 || crossPageMode?.isActive}
          variant={selectedBlocks.length > 0 && !crossPageMode?.isActive ? 'solid' : 'ghost'}
          size="md"
          className="w-full"
        >
          <Plus className="w-5 h-5 mr-2" />
          {crossPageMode?.isActive
            ? '크로스 페이지 모드 활성화됨'
            : selectedBlocks.length > 0
              ? `선택한 ${selectedBlocks.length}개 블록으로 그룹 생성`
              : '블록을 선택하세요'}
        </Button>

        {/* Phase 50-C: 크로스 페이지 시작 버튼 */}
        {selectedBlocks.length > 0 && !crossPageMode?.isActive && onStartCrossPage && (
          <Button
            onClick={onStartCrossPage}
            variant="outline"
            size="sm"
            className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            다음 페이지로 이어서 (P)
          </Button>
        )}

        {/* Group List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="w-16 h-16 text-grey-300 mb-4" />
              <p className="text-sm font-medium text-grey-900">아직 그룹이 없습니다</p>
              <p className="text-xs text-grey-500 mt-2">
                블록을 선택하고
                <br />
                그룹을 생성하세요
              </p>
            </div>
          ) : (
            <>
            <AnimatePresence>
              {/* Phase 49-B: 표시 제한된 그룹 목록 */}
              {displayedGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  layout  // Phase 49-C: 위치 변경 시 부드러운 애니메이션
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={() => editingGroupId !== group.id && onGroupSelect(group.block_ids)}
                  className={`group relative p-3 border rounded-lg transition-all ${
                    editingGroupId === group.id
                      ? 'border-green-400 bg-green-50 p-4'
                      : group.link?.linkType === 'solution'
                        // Phase 42-B: 해설 그룹 스타일 (보라색 계열)
                        ? 'border-purple-200 bg-purple-50/50 cursor-pointer hover:border-purple-400 hover:bg-purple-50'
                        // Phase 56: 모문제/하위문제 스타일
                        : `${getGroupTypeStyle(group)} cursor-pointer hover:border-blue-400 hover:bg-grey-50`
                  }`}
                >
                  {/* Gradient Background on Hover */}
                  {/* Phase 42-B: 해설 그룹은 보라색 그라데이션 */}
                  {editingGroupId !== group.id && (
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity ${
                      group.link?.linkType === 'solution'
                        ? 'bg-gradient-to-r from-purple-50 to-violet-50'
                        : 'bg-gradient-to-r from-blue-50 to-purple-50'
                    }`} />
                  )}

                  <div className="relative">
                    {/* 편집 모드 */}
                    {editingGroupId === group.id ? (
                      <div
                        className="space-y-3"
                        onKeyDown={(e) => handleEditFormKeyDown(e, group.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-green-700">문항 정보 편집</span>
                            <span className="text-xs text-green-600">Enter: 저장 | Esc: 취소</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); saveEdit(group.id); }}
                              className="p-1.5 bg-green-100 hover:bg-green-200 rounded transition-colors"
                              title="저장"
                              aria-label="문항 정보 저장"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                              className="p-1.5 hover:bg-grey-100 rounded transition-colors"
                              title="취소"
                              aria-label="편집 취소"
                            >
                              <X className="w-4 h-4 text-grey-600" />
                            </button>
                          </div>
                        </div>

                        {/* 책이름 */}
                        <div>
                          <label className="block text-xs font-medium text-grey-600 mb-1">책이름</label>
                          <input
                            type="text"
                            value={editForm.bookName || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, bookName: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="수학의 바이블"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* 과정 */}
                        <div>
                          <label className="block text-xs font-medium text-grey-600 mb-1">과정</label>
                          <input
                            type="text"
                            value={editForm.course || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, course: e.target.value }))}
                            className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="공통수학2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        {/* 페이지 & 문항번호 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-grey-600 mb-1">페이지</label>
                            <input
                              type="number"
                              value={editForm.page || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, page: parseInt(e.target.value, 10) || 1 }))}
                              className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-grey-600 mb-1">문항번호</label>
                            <input
                              ref={problemNumberInputRef}
                              type="text"
                              value={editForm.problemNumber || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, problemNumber: e.target.value }))}
                              className="w-full px-2 py-1.5 text-sm border border-grey-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              placeholder="3"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Phase 29-C: 토스 스타일 간소화된 카드 */}
                        <div className="flex items-center justify-between">
                          {/* 왼쪽: 문항번호 + 요약 정보 */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Phase 56: 모문제 아이콘 */}
                            {group.isParent && (
                              <span className="flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full" title="모문제">
                                <FileText className="w-3.5 h-3.5 text-amber-600" />
                              </span>
                            )}
                            {/* 문항번호 (큰 글씨) */}
                            <span className={`text-lg font-bold whitespace-nowrap ${group.isParent ? 'text-amber-700' : 'text-grey-900'}`}>
                              {group.problemInfo?.problemNumber || `#${index + 1}`}
                            </span>

                            {/* 요약 정보 */}
                            <div className="flex items-center gap-2 text-sm text-grey-500 truncate">
                              {group.problemInfo ? (
                                <>
                                  <span className="truncate">{group.problemInfo.bookName}</span>
                                  <span className="text-grey-300">·</span>
                                  <span>{group.problemInfo.page}p</span>
                                </>
                              ) : (
                                <span className="text-grey-400">정보 없음</span>
                              )}
                              <span className="text-grey-300">·</span>
                              <span className="text-xs text-grey-400">{group.block_ids.length}블록</span>
                              {/* Phase 53-E: 크로스 컬럼 표시 */}
                              {group.column === 'X' && (
                                <>
                                  <span className="text-grey-300">·</span>
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">좌우 합성</span>
                                </>
                              )}
                              {/* Phase 56: 모문제 연결 표시 */}
                              {group.parentGroupId && (
                                <>
                                  <span className="text-grey-300">·</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Link2 className="w-3 h-3" />
                                    {getParentGroupName(group.parentGroupId)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* 오른쪽: 액션 버튼들 */}
                          <div className="flex items-center gap-1 ml-2">
                            {/* 확정 상태/버튼 */}
                            {group.status === 'confirmed' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" aria-label="확정됨" />
                            ) : onConfirmGroup ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onConfirmGroup(group.id);
                                }}
                                disabled={confirmingGroupId === group.id}
                                className="p-1.5 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                                title="확정"
                                aria-label="그룹 확정"
                              >
                                {confirmingGroupId === group.id ? (
                                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" aria-label="확정 중" />
                                ) : (
                                  <Check className="w-5 h-5 text-grey-400 hover:text-green-600" />
                                )}
                              </button>
                            ) : null}

                            {/* Phase 56: 모문제 토글 버튼 */}
                            {onToggleIsParent && !group.parentGroupId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleIsParent(group.id);
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  group.isParent
                                    ? 'bg-amber-100 hover:bg-amber-200'
                                    : 'hover:bg-amber-100 opacity-0 group-hover:opacity-100'
                                }`}
                                title={group.isParent ? "모문제 해제" : "모문제로 지정"}
                                aria-label={group.isParent ? "모문제 해제" : "모문제로 지정"}
                              >
                                <FileText className={`w-4 h-4 ${group.isParent ? 'text-amber-600' : 'text-grey-400 hover:text-amber-600'}`} />
                              </button>
                            )}

                            {/* 편집 버튼 (호버 시만) */}
                            {onUpdateGroupInfo && (
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditing(group); }}
                                className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="편집"
                                aria-label="문항 정보 편집"
                              >
                                <Edit2 className="w-4 h-4 text-grey-400 hover:text-blue-600" />
                              </button>
                            )}

                            {/* 삭제 버튼 (호버 시만) */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`그룹을 삭제하시겠습니까?`)) {
                                  onDeleteGroup(group.id);
                                }
                              }}
                              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="삭제"
                              aria-label="그룹 삭제"
                            >
                              <Trash2 className="w-4 h-4 text-grey-400 hover:text-red-600" />
                            </button>
                          </div>
                        </div>

                        {/* Phase 22-K: 연결 정보 (있을 때만) */}
                        {group.link && (
                          <div className="mt-1.5 pt-1.5 border-t border-grey-100">
                            <LinkedBadge
                              linkType={group.link.linkType}
                              linkedName={group.link.linkedName}
                              onNavigate={onNavigateToLinked ? () => {
                                onNavigateToLinked(
                                  group.link!.linkedDocumentId,
                                  group.link!.linkedPageIndex
                                );
                              } : undefined}
                              onUnlink={onUnlinkGroup ? () => {
                                if (confirm('연결을 해제하시겠습니까?')) {
                                  onUnlinkGroup(group.id);
                                }
                              } : undefined}
                            />
                          </div>
                        )}

                        {/* Phase 56: 모문제 연결 드롭다운 (모문제가 아닌 경우에만) */}
                        {/* Phase 58-B: XP 그룹은 이전 페이지 모문제도 표시 */}
                        {onSetParentGroup && !group.isParent && (
                          (group.column === 'XP' ? allParentGroups.length > 0 : parentGroups.length > 0) && (
                          <div className="mt-1.5 pt-1.5 border-t border-grey-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-grey-500">모문제:</span>
                              <select
                                value={group.parentGroupId || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onSetParentGroup(group.id, e.target.value || null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs border border-grey-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">연결 없음</option>
                                {/* Phase 58-B: XP 그룹은 allParentGroups 사용 */}
                                {(group.column === 'XP' ? allParentGroups : parentGroups)
                                  .filter(pg => pg.id !== group.id)
                                  .map(pg => (
                                  <option key={pg.id} value={pg.id}>
                                    {pg.problemInfo?.problemNumber || pg.id}
                                    {pg.problemInfo?.displayName ? ` (${pg.problemInfo.displayName})` : ''}
                                    {/* Phase 58-B: 이전 페이지 표시 */}
                                    {'pageIndex' in pg && typeof pg.pageIndex === 'number' ? ` [p${pg.pageIndex + 1}]` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

              {/* Phase 49-B: 접기/펼치기 버튼 */}
              {groups.length > GROUP_PREVIEW_COUNT && (
                <button
                  onClick={() => setShowAllGroups(!showAllGroups)}
                  className="
                    w-full mt-2 px-3 py-2.5
                    bg-white hover:bg-grey-50
                    border border-grey-200
                    rounded-lg
                    transition-all duration-200
                    flex items-center justify-between
                    text-sm font-medium
                  "
                  aria-label={showAllGroups ? "그룹 목록 접기" : `${hiddenGroupCount}개 그룹 더보기`}
                  aria-expanded={showAllGroups}
                >
                  <span className="flex items-center gap-2">
                    {showAllGroups ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-grey-500" />
                        <span className="text-grey-700">접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600">{hiddenGroupCount}개 더보기</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-grey-400">
                    전체 {groups.length}개
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer Info */}
        {groups.length > 0 && (
          <div className="pt-4 border-t border-grey-200 space-y-3">
            {/* Phase 23: 전체 확정 버튼 */}
            {onConfirmAll && groups.some(g => g.status !== 'confirmed') && (
              <Button
                onClick={onConfirmAll}
                disabled={!!confirmingGroupId}
                variant="primary"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {confirmingGroupId ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                미확정 그룹 전체 확정
                <Badge variant="secondary" className="ml-2 bg-green-500 text-white">
                  {groups.filter(g => g.status !== 'confirmed').length}
                </Badge>
              </Button>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-grey-600">전체 블록:</span>
              <span className="font-semibold text-grey-900">
                {groups.reduce((sum, g) => sum + g.block_ids.length, 0)}개
              </span>
            </div>

            {/* Phase 23: 확정 상태 통계 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-grey-600">확정됨:</span>
              <span className="font-semibold text-green-600">
                {groups.filter(g => g.status === 'confirmed').length} / {groups.length}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
