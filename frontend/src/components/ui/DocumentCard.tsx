/**
 * Document Card Component (Phase 6-3)
 *
 * Modern card design with gradient background, hover animations, and progress bar
 * Phase 27-B: 문서 선택 상태 (문제/해설) 표시
 */
import { FileText, Clock, CheckCircle, MoreVertical, Trash2, Eye, Download, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Document } from '../../api/client';
import { Badge } from './Badge';
import { cn } from '../../lib/utils';

interface DocumentCardProps {
  document: Document;
  onSelect?: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  selected?: boolean;
  // Phase 27-B: 페어링 선택 상태
  pairingRole?: 'problem' | 'solution' | null;
  onSetAsProblem?: () => void;
  onSetAsSolution?: () => void;
}

export function DocumentCard({
  document,
  onSelect,
  onDelete,
  selected,
  // Phase 27-B
  pairingRole,
  onSetAsProblem,
  onSetAsSolution
}: DocumentCardProps) {
  const [showActions, setShowActions] = useState(false);

  const progress = (document.analyzed_pages / document.total_pages) * 100;
  const isCompleted = progress === 100;
  const isProcessing = progress > 0 && progress < 100;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return '방금 전';
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const getStatusInfo = () => {
    if (isCompleted) {
      return {
        variant: 'success' as const,
        label: '완료',
        icon: CheckCircle,
        color: 'text-emerald-600',
      };
    }
    if (isProcessing) {
      return {
        variant: 'warning' as const,
        label: '분석 중',
        icon: Clock,
        color: 'text-amber-600',
      };
    }
    return {
      variant: 'secondary' as const,
      label: '대기',
      icon: Clock,
      color: 'text-grey-600',
    };
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(document);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`문서 '${document.document_id}'를 삭제하시겠습니까?`)) {
      onDelete(document.document_id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300',
        'hover:shadow-lg hover:border-blue-300',
        selected && 'ring-2 ring-blue-500 border-blue-500',
        // Phase 27-B: 페어링 선택 상태 스타일
        pairingRole === 'problem' && 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30',
        pairingRole === 'solution' && 'ring-2 ring-green-500 border-green-500 bg-green-50/30'
      )}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Phase 27-B: 페어링 역할 뱃지 */}
      {pairingRole && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm',
            pairingRole === 'problem' && 'bg-blue-600 text-white',
            pairingRole === 'solution' && 'bg-green-600 text-white'
          )}
        >
          {pairingRole === 'problem' ? (
            <>
              <FileText className="w-3 h-3" />
              문제집
            </>
          ) : (
            <>
              <BookOpen className="w-3 h-3" />
              해설집
            </>
          )}
        </motion.div>
      )}

      {/* Content */}
      <div className="relative p-6 cursor-pointer" onClick={handleCardClick}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          {/* Icon & Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center shadow-md',
              // Phase 27-B: 역할에 따른 아이콘 색상
              pairingRole === 'problem' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
              pairingRole === 'solution' ? 'bg-gradient-to-br from-green-500 to-green-700' :
              'bg-gradient-to-br from-blue-600 to-purple-600'
            )}>
              {pairingRole === 'solution' ? (
                <BookOpen className="w-6 h-6 text-white" />
              ) : (
                <FileText className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-grey-900 truncate" title={document.document_id}>
                {document.document_id}
              </h3>
              <p className="text-sm text-grey-500 mt-1">
                {document.total_pages}페이지
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 rounded-lg hover:bg-grey-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-grey-600" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-10 z-10 bg-white rounded-lg shadow-xl border border-grey-200 py-2 w-48">
                {/* Phase 27-B: 페어링 메뉴 */}
                {(onSetAsProblem || onSetAsSolution) && (
                  <>
                    <div className="px-3 py-1 text-xs text-grey-400 font-medium">페어링</div>
                    {onSetAsProblem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(false);
                          onSetAsProblem();
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                          pairingRole === 'problem'
                            ? 'bg-blue-50 text-blue-600'
                            : 'hover:bg-blue-50 text-grey-700 hover:text-blue-600'
                        )}
                      >
                        <FileText className="w-4 h-4" />
                        {pairingRole === 'problem' ? '문제 지정 해제' : '문제로 지정'}
                      </button>
                    )}
                    {onSetAsSolution && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowActions(false);
                          onSetAsSolution();
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm flex items-center gap-2',
                          pairingRole === 'solution'
                            ? 'bg-green-50 text-green-600'
                            : 'hover:bg-green-50 text-grey-700 hover:text-green-600'
                        )}
                      >
                        <BookOpen className="w-4 h-4" />
                        {pairingRole === 'solution' ? '해설 지정 해제' : '해설로 지정'}
                      </button>
                    )}
                    <hr className="my-1" />
                  </>
                )}

                <button
                  onClick={handleCardClick}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-grey-50 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  보기
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert('내보내기 기능 준비 중');
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-grey-50 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  내보내기
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <StatusIcon className={cn('w-4 h-4', status.color)} />
          <Badge variant={status.variant}>{status.label}</Badge>
          {isProcessing && (
            <span className="text-sm text-grey-600">{Math.round(progress)}%</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-grey-600 mb-2">
            <span>분석 진행률</span>
            <span>
              {document.analyzed_pages} / {document.total_pages}
            </span>
          </div>
          <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full transition-all',
                isCompleted
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600'
              )}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-grey-500">
          <span>{formatDate(document.created_at)}</span>
          {selected && (
            <span className="text-blue-600 font-medium">선택됨</span>
          )}
        </div>
      </div>

      {/* Hover Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:translate-x-full transition-all duration-700 ease-in-out transform -translate-x-full" />
    </motion.div>
  );
}
