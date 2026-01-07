/**
 * TextbookSelectorModal - 교재 선택 모달
 * Stage 18-F: 반-교재 연결 시스템
 *
 * - 연결 가능한 교재 목록 표시
 * - 과정/과목 필터 (반 학년 기본값)
 * - 검색 기능
 * - 교재 선택 및 연결
 */

import { useState, useMemo } from 'react';
import { X, Search, BookMarked, Plus, Check } from 'lucide-react';
import { useAvailableTextbooks, useLinkTextbook } from '@/hooks/useClassTextbooks';
import { formatFileSize, CURRICULUM_OPTIONS, SUBJECT_OPTIONS } from '@/hooks/useAllTextbooks';
import type { Textbook } from '@/types/textbook';

interface TextbookSelectorModalProps {
  /** 반 ID */
  classId: string;
  /** 반 이름 (표시용) */
  className: string;
  /** 반 학년 (기본 필터용) */
  classGrade?: string;
  /** 모달 닫기 */
  onClose: () => void;
}

/**
 * 반 이름에서 학년 추출하여 과정 기본값 계산
 * 예: "중3 수학 기초" → "중3-1" (중3 학기는 1학기로 기본)
 */
function getDefaultCurriculumFromClassName(className: string, classGrade?: string): string {
  // classGrade가 있으면 우선 사용
  const gradeName = classGrade || className;

  // 중등: 중1, 중2, 중3 → 중1-1, 중2-1, 중3-1
  const middleMatch = gradeName.match(/중([1-3])/);
  if (middleMatch) {
    return `중${middleMatch[1]}-1`;
  }

  // 고등: 고1, 고2, 고3
  const highMatch = gradeName.match(/고([1-3])/);
  if (highMatch) {
    const grade = highMatch[1];
    if (grade === '1') return '공통수학1';
    if (grade === '2') return '수학Ⅰ';
    if (grade === '3') return '미적분';
  }

  return ''; // 기본값 없음
}

export function TextbookSelectorModal({
  classId,
  className,
  classGrade,
  onClose,
}: TextbookSelectorModalProps) {
  const { data: availableTextbooks = [], isLoading } = useAvailableTextbooks(classId);
  const linkMutation = useLinkTextbook();

  // 반 학년에서 기본 과정 추출
  const defaultCurriculum = useMemo(
    () => getDefaultCurriculumFromClassName(className, classGrade),
    [className, classGrade]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(defaultCurriculum);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 필터링된 교재 목록
  const filteredTextbooks = useMemo(() => {
    return availableTextbooks.filter((textbook) => {
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!textbook.displayName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 과정 필터 (curriculum)
      if (selectedCurriculum && textbook.curriculum !== selectedCurriculum) {
        return false;
      }

      // 과목 필터
      if (selectedSubject && textbook.subject !== selectedSubject) {
        return false;
      }

      return true;
    });
  }, [availableTextbooks, searchQuery, selectedCurriculum, selectedSubject]);

  // 교재 선택/해제 토글
  const toggleSelection = (textbookId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(textbookId)) {
        next.delete(textbookId);
      } else {
        next.add(textbookId);
      }
      return next;
    });
  };

  // 선택된 교재 연결
  const handleLink = async () => {
    if (selectedIds.size === 0) return;

    try {
      // 순차적으로 연결 (병렬 처리 시 순서 문제 발생 가능)
      for (const textbookId of selectedIds) {
        await linkMutation.mutateAsync({ classId, textbookId });
      }
      onClose();
    } catch (error) {
      console.error('교재 연결 실패:', error);
      alert('교재 연결에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">교재 추가</h2>
            <p className="text-sm text-gray-500">{className}에 교재를 연결합니다</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 필터 영역 */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="교재명으로 검색"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 과정/과목 필터 */}
          <div className="flex gap-2">
            <select
              value={selectedCurriculum}
              onChange={(e) => setSelectedCurriculum(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">전체 과정</option>
              <optgroup label="중등">
                {CURRICULUM_OPTIONS.filter(c => c.startsWith('중')).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              <optgroup label="고등 공통">
                {CURRICULUM_OPTIONS.filter(c => c.startsWith('공통')).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              <optgroup label="고등 선택">
                {CURRICULUM_OPTIONS.filter(c =>
                  !c.startsWith('중') && !c.startsWith('공통') && c !== '기타'
                ).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
              <option value="기타">기타</option>
            </select>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">전체 과목</option>
              {SUBJECT_OPTIONS.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 교재 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTextbooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BookMarked className="w-12 h-12 mb-3 opacity-50" />
              <p className="font-medium">
                {availableTextbooks.length === 0
                  ? '연결 가능한 교재가 없습니다'
                  : '검색 결과가 없습니다'}
              </p>
              <p className="text-sm mt-1">
                {availableTextbooks.length === 0
                  ? '교재 관리에서 교재를 먼저 등록해주세요'
                  : '다른 조건으로 검색해보세요'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTextbooks.map((textbook) => (
                <TextbookItem
                  key={textbook.id}
                  textbook={textbook}
                  isSelected={selectedIds.has(textbook.id)}
                  onToggle={() => toggleSelection(textbook.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedIds.size > 0 ? (
              <span className="font-medium text-blue-600">
                {selectedIds.size}개 선택됨
              </span>
            ) : (
              <span>교재를 선택하세요</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              취소
            </button>
            <button
              onClick={handleLink}
              disabled={selectedIds.size === 0 || linkMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {linkMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>연결 중...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>연결하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 교재 아이템 컴포넌트
// =====================================================

interface TextbookItemProps {
  textbook: Textbook;
  isSelected: boolean;
  onToggle: () => void;
}

function TextbookItem({ textbook, isSelected, onToggle }: TextbookItemProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
        ${isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }
      `}
    >
      {/* 체크박스 */}
      <div
        className={`
          flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors
          ${isSelected
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300'
          }
        `}
      >
        {isSelected && <Check className="w-4 h-4 text-white" />}
      </div>

      {/* 교재 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">
            {textbook.displayName}
          </span>
          {textbook.curriculum && (
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
              {textbook.curriculum}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
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

      {/* 과목 태그 */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {textbook.subject && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            {textbook.subject}
          </span>
        )}
      </div>
    </button>
  );
}

export default TextbookSelectorModal;
