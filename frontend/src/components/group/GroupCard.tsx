/**
 * GroupCard Component (Phase 62-D-3)
 *
 * 그룹 카드 표시 컴포넌트
 * GroupPanel에서 분리
 */
import {
  Trash2,
  Edit2,
  Check,
  CheckCircle,
  Loader2,
  Link2,
  FileText,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ProblemGroup, ProblemInfo } from '../../api/client';
import { LinkedBadge } from '../matching/LinkedBadge';
import { GroupEditForm } from './GroupEditForm';

export interface GroupCardProps {
  /** 그룹 데이터 */
  group: ProblemGroup;
  /** 카드 인덱스 (애니메이션 딜레이용) */
  index: number;
  /** 편집 모드 여부 */
  isEditing: boolean;
  /** 편집 폼 데이터 */
  editForm: Partial<ProblemInfo>;
  /** 확정 중 여부 */
  isConfirming: boolean;

  // 핸들러
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onFormChange: (field: keyof ProblemInfo, value: string | number) => void;
  onSave: () => void;
  onCancel: () => void;

  // 선택적 기능
  onConfirm?: () => void;
  onToggleIsParent?: () => void;
  onNavigateToLinked?: (documentId: string, pageIndex: number) => void;
  onUnlink?: () => void;
  onSetParentGroup?: (parentGroupId: string | null) => void;

  // 모문제 관련
  parentGroups?: Array<ProblemGroup & { pageIndex?: number }>;
  allParentGroups?: Array<ProblemGroup & { pageIndex?: number }>;

  // Refs
  problemNumberInputRef?: React.RefObject<HTMLInputElement>;
}

/**
 * 그룹 타입에 따른 스타일 클래스 반환
 */
function getGroupTypeStyle(group: ProblemGroup): string {
  if (group.isParent) {
    return 'border-amber-300 bg-amber-50/50'; // 모문제: 노란색
  }
  if (group.parentGroupId) {
    return 'border-blue-300 bg-blue-50/50'; // 하위문제: 파란색
  }
  return 'border-grey-200'; // 일반 문제
}

/**
 * 모문제 이름 가져오기
 */
function getParentGroupName(
  parentGroupId: string,
  allParentGroups: Array<ProblemGroup & { pageIndex?: number }>
): string {
  const parent = allParentGroups.find((g) => g.id === parentGroupId);
  if (!parent) return parentGroupId;
  return parent.problemInfo?.displayName || parent.problemInfo?.problemNumber || parent.id;
}

export function GroupCard({
  group,
  index,
  isEditing,
  editForm,
  isConfirming,
  onSelect,
  onDelete,
  onEdit,
  onFormChange,
  onSave,
  onCancel,
  onConfirm,
  onToggleIsParent,
  onNavigateToLinked,
  onUnlink,
  onSetParentGroup,
  parentGroups = [],
  allParentGroups = [],
  problemNumberInputRef,
}: GroupCardProps) {
  // 카드 클릭 핸들러
  const handleCardClick = () => {
    if (!isEditing) {
      onSelect();
    }
  };

  // 카드 스타일 결정
  const cardClassName = isEditing
    ? 'border-green-400 bg-green-50 p-4'
    : group.link?.linkType === 'solution'
      ? 'border-purple-200 bg-purple-50/50 cursor-pointer hover:border-purple-400 hover:bg-purple-50'
      : `${getGroupTypeStyle(group)} cursor-pointer hover:border-blue-400 hover:bg-grey-50`;

  // 그라데이션 배경 스타일
  const gradientClassName =
    group.link?.linkType === 'solution'
      ? 'bg-gradient-to-r from-purple-50 to-violet-50'
      : 'bg-gradient-to-r from-blue-50 to-purple-50';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={handleCardClick}
      className={`group relative p-3 border rounded-lg transition-all ${cardClassName}`}
    >
      {/* Gradient Background on Hover */}
      {!isEditing && (
        <div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity ${gradientClassName}`}
        />
      )}

      <div className="relative">
        {isEditing ? (
          <GroupEditForm
            groupId={group.id}
            editForm={editForm}
            onFormChange={onFormChange}
            onSave={onSave}
            onCancel={onCancel}
            problemNumberInputRef={problemNumberInputRef}
          />
        ) : (
          <>
            {/* 카드 헤더 */}
            <div className="flex items-center justify-between">
              {/* 왼쪽: 문항번호 + 요약 정보 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* 모문제 아이콘 */}
                {group.isParent && (
                  <span
                    className="flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full"
                    title="모문제"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </span>
                )}
                {/* 문항번호 */}
                <span
                  className={`text-lg font-bold whitespace-nowrap ${
                    group.isParent ? 'text-amber-700' : 'text-grey-900'
                  }`}
                >
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

                  {/* 크로스 컬럼 표시 */}
                  {group.column === 'X' && (
                    <>
                      <span className="text-grey-300">·</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">
                        좌우 합성
                      </span>
                    </>
                  )}

                  {/* 모문제 연결 표시 */}
                  {group.parentGroupId && (
                    <>
                      <span className="text-grey-300">·</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Link2 className="w-3 h-3" />
                        {getParentGroupName(group.parentGroupId, allParentGroups)}
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
                ) : onConfirm ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfirm();
                    }}
                    disabled={isConfirming}
                    className="p-1.5 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                    title="확정"
                    aria-label="그룹 확정"
                  >
                    {isConfirming ? (
                      <Loader2
                        className="w-5 h-5 text-green-600 animate-spin"
                        aria-label="확정 중"
                      />
                    ) : (
                      <Check className="w-5 h-5 text-grey-400 hover:text-green-600" />
                    )}
                  </button>
                ) : null}

                {/* 모문제 토글 버튼 */}
                {onToggleIsParent && !group.parentGroupId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleIsParent();
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      group.isParent
                        ? 'bg-amber-100 hover:bg-amber-200'
                        : 'hover:bg-amber-100 opacity-0 group-hover:opacity-100'
                    }`}
                    title={group.isParent ? '모문제 해제' : '모문제로 지정'}
                    aria-label={group.isParent ? '모문제 해제' : '모문제로 지정'}
                  >
                    <FileText
                      className={`w-4 h-4 ${
                        group.isParent ? 'text-amber-600' : 'text-grey-400 hover:text-amber-600'
                      }`}
                    />
                  </button>
                )}

                {/* 편집 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="편집"
                  aria-label="문항 정보 편집"
                >
                  <Edit2 className="w-4 h-4 text-grey-400 hover:text-blue-600" />
                </button>

                {/* 삭제 버튼 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('그룹을 삭제하시겠습니까?')) {
                      onDelete();
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

            {/* 연결 정보 */}
            {group.link && (
              <div className="mt-1.5 pt-1.5 border-t border-grey-100">
                <LinkedBadge
                  linkType={group.link.linkType}
                  linkedName={group.link.linkedName}
                  onNavigate={
                    onNavigateToLinked
                      ? () => {
                          onNavigateToLinked(
                            group.link!.linkedDocumentId,
                            group.link!.linkedPageIndex
                          );
                        }
                      : undefined
                  }
                  onUnlink={
                    onUnlink
                      ? () => {
                          if (confirm('연결을 해제하시겠습니까?')) {
                            onUnlink();
                          }
                        }
                      : undefined
                  }
                />
              </div>
            )}

            {/* 모문제 연결 드롭다운 */}
            {onSetParentGroup && !group.isParent && (
              (group.column === 'XP' ? allParentGroups.length > 0 : parentGroups.length > 0) && (
                <div className="mt-1.5 pt-1.5 border-t border-grey-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-grey-500">모문제:</span>
                    <select
                      value={group.parentGroupId || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSetParentGroup(e.target.value || null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-xs border border-grey-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">연결 없음</option>
                      {(group.column === 'XP' ? allParentGroups : parentGroups)
                        .filter((pg) => pg.id !== group.id)
                        .map((pg) => (
                          <option key={pg.id} value={pg.id}>
                            {pg.problemInfo?.problemNumber || pg.id}
                            {pg.problemInfo?.displayName ? ` (${pg.problemInfo.displayName})` : ''}
                            {'pageIndex' in pg && typeof pg.pageIndex === 'number'
                              ? ` [p${pg.pageIndex + 1}]`
                              : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default GroupCard;
