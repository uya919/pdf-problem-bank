/**
 * DocumentDropdown Component (Phase 34-A)
 *
 * 문서 선택용 드롭다운 컴포넌트
 * - 문제/해설 문서 선택
 * - 색상 구분 (문제: 파란색, 해설: 보라색)
 * - 같은 문서 양쪽 선택 방지
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, BookOpen, ChevronDown, Check, Upload } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';

interface DocumentDropdownProps {
  type: 'problem' | 'solution';
  value: string | null;
  onChange: (docId: string | null) => void;
  disabledValue: string | null;
}

export function DocumentDropdown({
  type,
  value,
  onChange,
  disabledValue,
}: DocumentDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: documents, isLoading } = useDocuments();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isProblem = type === 'problem';
  const Icon = isProblem ? FileText : BookOpen;
  const label = isProblem ? '문제 문서' : '해설 문서';
  const colorClass = isProblem ? 'toss-blue' : 'purple-600';

  // PDF 문서만 필터링
  const pdfDocuments = documents?.filter((doc) => doc.document_id.endsWith('.pdf')) || [];

  const selectedDoc = pdfDocuments.find((d) => d.document_id === value);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 탐색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-64 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left
          transition-all duration-200 bg-white
          ${value
            ? isProblem
              ? 'border-toss-blue bg-toss-blue/5'
              : 'border-purple-600 bg-purple-600/5'
            : 'border-grey-200 hover:border-grey-300'}
        `}
      >
        <Icon className={`w-5 h-5 ${value ? (isProblem ? 'text-toss-blue' : 'text-purple-600') : 'text-grey-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-grey-500">{label}</div>
          <div className={`truncate ${value ? 'text-grey-900 font-medium' : 'text-grey-400'}`}>
            {selectedDoc?.document_id || '선택하세요'}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-grey-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-grey-200 py-2 z-50 max-h-64 overflow-y-auto"
          >
            {isLoading ? (
              <div className="px-4 py-8 text-center text-grey-400">
                <div className="animate-spin w-6 h-6 border-2 border-grey-200 border-t-toss-blue rounded-full mx-auto mb-2" />
                <p className="text-sm">문서 목록 로딩 중...</p>
              </div>
            ) : pdfDocuments.length > 0 ? (
              pdfDocuments.map((doc) => {
                const isSelected = doc.document_id === value;
                const isDisabled = doc.document_id === disabledValue;

                return (
                  <button
                    key={doc.document_id}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        onChange(isSelected ? null : doc.document_id);
                        setIsOpen(false);
                      }
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      transition-colors duration-150
                      ${isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-grey-50'
                        : isSelected
                          ? isProblem
                            ? 'bg-toss-blue/10'
                            : 'bg-purple-600/10'
                          : 'hover:bg-grey-50'}
                    `}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected
                          ? isProblem
                            ? 'text-toss-blue'
                            : 'text-purple-600'
                          : 'text-grey-400'
                      }`}
                    />
                    <span className={`truncate text-sm flex-1 ${isSelected ? 'font-medium text-grey-900' : 'text-grey-700'}`}>
                      {doc.document_id}
                    </span>
                    {isSelected && (
                      <Check className={`w-4 h-4 ${isProblem ? 'text-toss-blue' : 'text-purple-600'}`} />
                    )}
                    {isDisabled && (
                      <span className="text-xs text-grey-400">다른 쪽 선택됨</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-grey-400">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">등록된 문서가 없습니다</p>
                <p className="text-xs mt-1">아래에서 파일을 업로드하세요</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
