/**
 * TextbookEditModal - 교재 정보 편집 모달
 * Stage 18-E: 교재 관리 페이지
 *
 * - 교재명 수정
 * - 학년/과목 수정
 * - 파일은 수정 불가 (삭제 후 재업로드 필요)
 */

import { useState, useEffect } from 'react';
import { X, FileText, Save } from 'lucide-react';
import type { TextbookWithUsage } from '@/types/textbook';
import {
  useUpdateTextbook,
  GRADE_OPTIONS,
  SUBJECT_OPTIONS,
  formatFileSize,
} from '@/hooks/useAllTextbooks';

interface TextbookEditModalProps {
  isOpen: boolean;
  textbook: TextbookWithUsage | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TextbookEditModal({
  isOpen,
  textbook,
  onClose,
  onSuccess,
}: TextbookEditModalProps) {
  const updateMutation = useUpdateTextbook();

  const [displayName, setDisplayName] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [subject, setSubject] = useState('');

  // 교재 데이터로 폼 초기화
  useEffect(() => {
    if (textbook) {
      setDisplayName(textbook.displayName);
      setCurriculum(textbook.curriculum || '');
      setSubject(textbook.subject || '');
    }
  }, [textbook]);

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!textbook || !displayName.trim()) return;

    try {
      await updateMutation.mutateAsync({
        id: textbook.id,
        displayName: displayName.trim(),
        curriculum: curriculum || undefined,
        subject: subject || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  if (!isOpen || !textbook) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">교재 정보 편집</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 파일 정보 (읽기 전용) */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {textbook.fileName}
                </div>
                <div className="text-sm text-gray-500">
                  {formatFileSize(textbook.fileSize)}
                  {textbook.pageCount && ` · ${textbook.pageCount}페이지`}
                </div>
              </div>
            </div>
          </div>

          {/* 교재명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              교재명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 베이직쎈 고1 공통수학"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {/* 과정/과목 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                과정
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">선택 안함</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                과목
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
              >
                <option value="">선택 안함</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 사용 현황 */}
          {textbook.usageCount > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              이 교재는 <strong>{textbook.usageCount}개 반</strong>에서 사용 중입니다.
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!displayName.trim() || updateMutation.isPending}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TextbookEditModal;
