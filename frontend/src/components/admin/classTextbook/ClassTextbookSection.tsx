/**
 * ClassTextbookSection - 반 설정 내 교재 관리 섹션
 * Stage 18-F: 반-교재 연결 시스템
 *
 * - 연결된 교재 목록 표시
 * - 교재 추가 버튼
 * - 교재 연결 해제
 * - 드래그앤드롭 순서 변경 (추후 구현)
 */

import { useState } from 'react';
import { Plus, BookMarked, Trash2, FileText, GripVertical } from 'lucide-react';
import { useClassTextbooks, useUnlinkTextbook } from '@/hooks/useClassTextbooks';
import { formatFileSize } from '@/hooks/useAllTextbooks';
import { TextbookSelectorModal } from './TextbookSelectorModal';
import type { ClassTextbook } from '@/types/textbook';

interface ClassTextbookSectionProps {
  /** 반 ID */
  classId: string;
  /** 반 이름 */
  className: string;
  /** 반 학년 (예: "중3", "고1") - 교재 선택 시 기본 필터용 */
  classGrade?: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

export function ClassTextbookSection({
  classId,
  className,
  classGrade,
  readOnly = false,
}: ClassTextbookSectionProps) {
  const { data: classTextbooks = [], isLoading } = useClassTextbooks(classId);
  const unlinkMutation = useUnlinkTextbook();

  const [showSelector, setShowSelector] = useState(false);

  // 교재 연결 해제
  const handleUnlink = async (classTextbook: ClassTextbook) => {
    if (!confirm(`"${classTextbook.textbook.displayName}" 교재를 이 반에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      await unlinkMutation.mutateAsync({
        classId,
        classTextbookId: classTextbook.id,
      });
    } catch (error) {
      console.error('교재 연결 해제 실패:', error);
      alert('교재 제거에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <BookMarked className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">연결된 교재</h3>
            <p className="text-sm text-gray-500">
              {classTextbooks.length}개 교재
            </p>
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>교재 추가</span>
          </button>
        )}
      </div>

      {/* 교재 목록 */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : classTextbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FileText className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">연결된 교재가 없습니다</p>
            {!readOnly && (
              <button
                onClick={() => setShowSelector(true)}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>첫 번째 교재 추가하기</span>
              </button>
            )}
          </div>
        ) : (
          classTextbooks.map((classTextbook, index) => (
            <LinkedTextbookItem
              key={classTextbook.id}
              classTextbook={classTextbook}
              index={index + 1}
              onUnlink={() => handleUnlink(classTextbook)}
              isUnlinking={unlinkMutation.isPending}
              readOnly={readOnly}
            />
          ))
        )}
      </div>

      {/* 교재 선택 모달 */}
      {showSelector && (
        <TextbookSelectorModal
          classId={classId}
          className={className}
          classGrade={classGrade}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

// =====================================================
// 연결된 교재 아이템 컴포넌트
// =====================================================

interface LinkedTextbookItemProps {
  classTextbook: ClassTextbook;
  index: number;
  onUnlink: () => void;
  isUnlinking: boolean;
  readOnly: boolean;
}

function LinkedTextbookItem({
  classTextbook,
  index,
  onUnlink,
  isUnlinking,
  readOnly,
}: LinkedTextbookItemProps) {
  const { textbook } = classTextbook;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
      {/* 드래그 핸들 (추후 드래그앤드롭 구현 시 활성화) */}
      {!readOnly && (
        <div className="flex-shrink-0 text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* 순서 번호 */}
      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
        <span className="text-xs font-bold text-blue-600">{index}</span>
      </div>

      {/* 교재 아이콘 */}
      <div className="flex-shrink-0 w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>

      {/* 교재 정보 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {textbook.displayName}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">
            {formatFileSize(textbook.fileSize)}
          </span>
          {textbook.pageCount && (
            <span className="text-xs text-gray-500">
              · {textbook.pageCount}p
            </span>
          )}
        </div>
      </div>

      {/* 학년/과목 태그 */}
      <div className="flex-shrink-0 hidden sm:flex items-center gap-1.5">
        {textbook.grade && (
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
            {textbook.grade}
          </span>
        )}
        {textbook.subject && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            {textbook.subject}
          </span>
        )}
      </div>

      {/* 제거 버튼 */}
      {!readOnly && (
        <button
          onClick={onUnlink}
          disabled={isUnlinking}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
          title="교재 제거"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ClassTextbookSection;
