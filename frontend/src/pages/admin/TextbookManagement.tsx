/**
 * TextbookManagement - 교재 관리 페이지
 * Stage 18-E: 교재 관리 페이지
 *
 * /admin/textbooks
 *
 * - 전체 교재 목록 표시
 * - 교재 추가/편집/삭제
 * - 검색/필터 (학부, 과목 버튼 필터)
 */

import { useState, useMemo } from 'react';
import { Book, Plus, Search, HardDrive } from 'lucide-react';
import {
  useAllTextbooks,
  useDeleteTextbook,
  SUBJECT_OPTIONS,
  formatFileSize,
  calculateTotalStorage,
} from '@/hooks/useAllTextbooks';
import {
  TextbookList,
  TextbookUploadModal,
  TextbookEditModal,
} from '@/components/admin/textbook';
import type { TextbookWithUsage } from '@/types/textbook';

/** 학부 타입 */
type Division = 'middle' | 'high' | null;

/** 학부 옵션 */
const DIVISION_OPTIONS: { value: Division; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'middle', label: '중등' },
  { value: 'high', label: '고등' },
];

export function TextbookManagement() {
  const { data: textbooks = [], isLoading } = useAllTextbooks();
  const deleteMutation = useDeleteTextbook();

  // 모달 상태
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingTextbook, setEditingTextbook] = useState<TextbookWithUsage | null>(
    null
  );

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  // 필터링된 교재 목록
  const filteredTextbooks = useMemo(() => {
    return textbooks.filter((t) => {
      // 검색어 필터
      if (
        searchQuery &&
        !t.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // 학부 필터 (curriculum 기준: 중1-1~중3-2 = 중등, 나머지 = 고등)
      if (divisionFilter) {
        const curriculum = t.curriculum || '';
        const isMiddle = curriculum.startsWith('중');
        if (divisionFilter === 'middle' && !isMiddle) return false;
        if (divisionFilter === 'high' && isMiddle) return false;
      }
      // 과목 필터
      if (subjectFilter && t.subject !== subjectFilter) {
        return false;
      }
      return true;
    });
  }, [textbooks, searchQuery, divisionFilter, subjectFilter]);

  // 필터별 교재 수 계산
  const filterCounts = useMemo(() => {
    const counts = {
      division: { middle: 0, high: 0 },
      subject: {} as Record<string, number>,
    };

    textbooks.forEach((t) => {
      const curriculum = t.curriculum || '';
      const isMiddle = curriculum.startsWith('중');
      if (isMiddle) counts.division.middle++;
      else counts.division.high++;

      if (t.subject) {
        counts.subject[t.subject] = (counts.subject[t.subject] || 0) + 1;
      }
    });

    return counts;
  }, [textbooks]);

  // 통계
  const totalStorage = calculateTotalStorage(textbooks);

  // 삭제 핸들러
  const handleDelete = async (textbook: TextbookWithUsage) => {
    try {
      await deleteMutation.mutateAsync(textbook);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Book className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">교재 관리</h1>
                <p className="text-sm text-gray-500">
                  PDF 교재를 등록하고 관리합니다
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              교재 추가
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 필터 바 */}
        <div className="bg-white rounded-xl border p-4 mb-6 space-y-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="교재명 검색..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 학부 필터 버튼 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">학부</span>
            {DIVISION_OPTIONS.map((opt) => {
              const isActive = divisionFilter === opt.value;
              const count = opt.value === null
                ? textbooks.length
                : filterCounts.division[opt.value] || 0;

              return (
                <button
                  key={opt.label}
                  onClick={() => setDivisionFilter(opt.value)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    flex items-center gap-1.5
                    ${isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* 과목 필터 버튼 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">과목</span>
            <button
              onClick={() => setSubjectFilter(null)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${subjectFilter === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              전체
            </button>
            {SUBJECT_OPTIONS.map((s) => {
              const isActive = subjectFilter === s;
              const count = filterCounts.subject[s] || 0;

              return (
                <button
                  key={s}
                  onClick={() => setSubjectFilter(isActive ? null : s)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    flex items-center gap-1.5
                    ${isActive
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  <span>{s}</span>
                  {count > 0 && (
                    <span className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 교재 목록 */}
        <div className="bg-white rounded-xl border">
          <TextbookList
            textbooks={filteredTextbooks}
            isLoading={isLoading}
            onEdit={setEditingTextbook}
            onDelete={handleDelete}
          />
        </div>

        {/* 하단 통계 */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            {filteredTextbooks.length === textbooks.length
              ? `총 ${textbooks.length}개 교재`
              : `${filteredTextbooks.length}개 표시 / 전체 ${textbooks.length}개`}
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            저장 공간 {formatFileSize(totalStorage)} 사용
          </div>
        </div>
      </div>

      {/* 업로드 모달 */}
      <TextbookUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* 편집 모달 */}
      <TextbookEditModal
        isOpen={!!editingTextbook}
        textbook={editingTextbook}
        onClose={() => setEditingTextbook(null)}
      />
    </div>
  );
}

export default TextbookManagement;
