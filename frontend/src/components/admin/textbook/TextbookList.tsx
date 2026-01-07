/**
 * TextbookList - 교재 목록 테이블
 * Stage 18-E: 교재 관리 페이지
 *
 * - 교재명, 파일 크기, 페이지 수 표시
 * - 학년/과목 태그
 * - 사용 중인 반 수 표시
 * - 편집/삭제 버튼
 */

import { FileText, Edit2, Trash2, Users } from 'lucide-react';
import type { TextbookWithUsage } from '@/types/textbook';
import { formatFileSize } from '@/hooks/useAllTextbooks';

interface TextbookListProps {
  textbooks: TextbookWithUsage[];
  isLoading: boolean;
  onEdit: (textbook: TextbookWithUsage) => void;
  onDelete: (textbook: TextbookWithUsage) => void;
}

export function TextbookList({
  textbooks,
  isLoading,
  onEdit,
  onDelete,
}: TextbookListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (textbooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">등록된 교재가 없습니다</p>
        <p className="text-sm mt-1">첫 번째 교재를 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      {/* 테이블 헤더 */}
      <div className="hidden md:grid grid-cols-[1fr_100px_80px_80px_80px_80px_100px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
        <div>교재명</div>
        <div className="text-center">크기</div>
        <div className="text-center">페이지</div>
        <div className="text-center">학년</div>
        <div className="text-center">과목</div>
        <div className="text-center">사용</div>
        <div className="text-center">작업</div>
      </div>

      {/* 테이블 바디 */}
      <div className="divide-y divide-gray-100">
        {textbooks.map((textbook) => (
          <TextbookRow
            key={textbook.id}
            textbook={textbook}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 교재 Row 컴포넌트
// =====================================================

interface TextbookRowProps {
  textbook: TextbookWithUsage;
  onEdit: (textbook: TextbookWithUsage) => void;
  onDelete: (textbook: TextbookWithUsage) => void;
}

function TextbookRow({ textbook, onEdit, onDelete }: TextbookRowProps) {
  const handleDelete = () => {
    if (textbook.usageCount > 0) {
      alert(
        `이 교재는 ${textbook.usageCount}개 반에서 사용 중입니다.\n먼저 반에서 교재를 제거해주세요.`
      );
      return;
    }

    if (
      confirm(
        `"${textbook.displayName}" 교재를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      onDelete(textbook);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_100px_80px_80px_80px_80px_100px] gap-2 md:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
      {/* 교재명 */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {textbook.displayName}
          </div>
          <div className="text-xs text-gray-500 truncate md:hidden">
            {formatFileSize(textbook.fileSize)}
            {textbook.pageCount && ` · ${textbook.pageCount}p`}
            {textbook.grade && ` · ${textbook.grade}`}
          </div>
        </div>
      </div>

      {/* 크기 */}
      <div className="hidden md:flex items-center justify-center text-sm text-gray-600">
        {formatFileSize(textbook.fileSize)}
      </div>

      {/* 페이지 */}
      <div className="hidden md:flex items-center justify-center text-sm text-gray-600">
        {textbook.pageCount ? `${textbook.pageCount}p` : '-'}
      </div>

      {/* 학년 */}
      <div className="hidden md:flex items-center justify-center">
        {textbook.grade ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
            {textbook.grade}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>

      {/* 과목 */}
      <div className="hidden md:flex items-center justify-center">
        {textbook.subject ? (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            {textbook.subject}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>

      {/* 사용 */}
      <div className="hidden md:flex items-center justify-center">
        {textbook.usageCount > 0 ? (
          <span className="flex items-center gap-1 text-sm text-blue-600">
            <Users className="w-3.5 h-3.5" />
            {textbook.usageCount}개반
          </span>
        ) : (
          <span className="text-gray-400 text-sm">미사용</span>
        )}
      </div>

      {/* 작업 버튼 */}
      <div className="flex items-center justify-end md:justify-center gap-1">
        <button
          onClick={() => onEdit(textbook)}
          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title="편집"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={textbook.usageCount > 0}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title={
            textbook.usageCount > 0
              ? '사용 중인 교재는 삭제할 수 없습니다'
              : '삭제'
          }
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default TextbookList;
