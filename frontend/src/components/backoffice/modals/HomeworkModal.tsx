/**
 * HomeworkModal - 숙제 확인 모달 (토스 스타일)
 *
 * 목업: docs/mockups/class-modals-v2.html 기준
 * - iOS 스타일 토글 스위치로 제출/미제출 체크
 * - 필터 탭 (전체/제출/미제출)
 * - 52px 컴팩트 행
 */
import { useState, useEffect, useCallback } from 'react';

// ============ 타입 정의 ============

export interface HomeworkStudent {
  id: string;
  name: string;
  submitted: boolean | null; // null = 미확인
  reason?: string; // 미제출 사유
}

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  range: string; // 숙제 범위 (예: "p.46-48")
  students: HomeworkStudent[];
  onSave: (students: HomeworkStudent[]) => void;
}

type FilterType = 'all' | 'submitted' | 'not_submitted';

// ============ 메인 컴포넌트 ============

export function HomeworkModal({
  isOpen,
  onClose,
  className,
  range,
  students: initialStudents,
  onSave,
}: HomeworkModalProps) {
  const [students, setStudents] = useState<HomeworkStudent[]>(initialStudents);
  const [filter, setFilter] = useState<FilterType>('all');

  // 모달 열릴 때 students 초기화
  useEffect(() => {
    if (isOpen) {
      setStudents(initialStudents);
      setFilter('all');
    }
  }, [isOpen, initialStudents]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 제출 상태 토글
  const toggleSubmitted = useCallback((id: string) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, submitted: !s.submitted, reason: undefined } : s
    ));
  }, []);

  // 저장
  const handleSave = useCallback(() => {
    onSave(students);
    onClose();
  }, [students, onSave, onClose]);

  // 통계
  const submittedCount = students.filter(s => s.submitted === true).length;
  const notSubmittedCount = students.filter(s => s.submitted === false).length;
  const checkedCount = students.filter(s => s.submitted !== null).length;
  const totalCount = students.length;
  const allChecked = checkedCount === totalCount;

  // 필터링된 학생 목록
  const filteredStudents = students.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'submitted') return s.submitted === true;
    if (filter === 'not_submitted') return s.submitted === false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] max-h-[85vh] flex flex-col animate-slide-up shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F6]">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-lg text-[#8B95A1]">
              ←
            </button>
            <span className="text-base font-semibold text-[#191F28]">
              {className} 숙제
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={!allChecked}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              allChecked
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed'
            }`}
          >
            완료
          </button>
        </div>

        {/* 요약 바 */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#F9FAFB] border-b border-[#F2F4F6]">
          <span className="text-[13px] text-[#6B7684]">
            <strong className="text-[#191F28]">{range}</strong> · {totalCount}명
          </span>
          <span className={`text-[13px] font-semibold ${allChecked ? 'text-[#3182F6]' : 'text-[#F59E0B]'}`}>
            {submittedCount}/{totalCount} 제출
          </span>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-1.5 px-5 py-2.5 border-b border-[#F2F4F6]">
          <FilterChip
            label={`전체 ${totalCount}`}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label={`제출 ${submittedCount}`}
            active={filter === 'submitted'}
            onClick={() => setFilter('submitted')}
          />
          <FilterChip
            label={`미제출 ${notSubmittedCount}`}
            active={filter === 'not_submitted'}
            onClick={() => setFilter('not_submitted')}
            variant="danger"
          />
        </div>

        {/* 학생 리스트 */}
        <div className="flex-1 overflow-y-auto py-2">
          {filteredStudents.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[#8B95A1] text-sm">
              해당하는 학생이 없습니다
            </div>
          ) : (
            filteredStudents.map((student, index) => (
              <div key={student.id}>
                <StudentRow
                  student={student}
                  onToggle={() => toggleSubmitted(student.id)}
                />
                {index < filteredStudents.length - 1 && (
                  <div className="h-px bg-[#F2F4F6] mx-5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-5 py-4 pb-safe border-t border-[#F2F4F6]">
          <button
            onClick={handleSave}
            disabled={!allChecked}
            className={`w-full py-4 rounded-xl text-base font-semibold transition-all active:scale-[0.98] ${
              allChecked
                ? 'bg-[#3182F6] text-white'
                : 'bg-[#E5E8EB] text-[#8B95A1] cursor-not-allowed'
            }`}
          >
            {allChecked ? '저장' : `저장 (${checkedCount}/${totalCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 필터 칩 컴포넌트 ============

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function FilterChip({ label, active, onClick, variant = 'default' }: FilterChipProps) {
  const baseClasses = 'px-3 py-1.5 rounded-2xl text-xs font-medium transition-all';

  if (active) {
    return (
      <button onClick={onClick} className={`${baseClasses} bg-[#191F28] text-white`}>
        {label}
      </button>
    );
  }

  if (variant === 'danger') {
    return (
      <button onClick={onClick} className={`${baseClasses} bg-[#FEF2F2] text-[#EF4444]`}>
        {label}
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`${baseClasses} bg-[#F5F6F7] text-[#6B7684]`}>
      {label}
    </button>
  );
}

// ============ 학생 행 컴포넌트 ============

interface StudentRowProps {
  student: HomeworkStudent;
  onToggle: () => void;
}

function StudentRow({ student, onToggle }: StudentRowProps) {
  const { name, submitted, reason } = student;

  return (
    <div
      className={`flex items-center h-[52px] px-5 transition-colors ${
        submitted === false ? 'bg-[#FEF2F2]' : ''
      }`}
    >
      {/* 상태 점 */}
      <div
        className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
          submitted === true
            ? 'bg-[#10B981]'
            : submitted === false
            ? 'bg-[#EF4444]'
            : 'bg-[#E5E8EB]'
        }`}
      />

      {/* 이름 */}
      <span className="flex-1 text-[15px] text-[#191F28]">{name}</span>

      {/* 미제출 사유 (있을 경우) */}
      {submitted === false && reason && (
        <span className="text-xs text-[#8B95A1] bg-[#F5F6F7] px-2 py-0.5 rounded mr-3">
          {reason}
        </span>
      )}

      {/* iOS 스타일 토글 스위치 */}
      <button
        onClick={onToggle}
        className={`relative w-11 h-7 rounded-full transition-colors flex-shrink-0 ${
          submitted === true ? 'bg-[#10B981]' : 'bg-[#E5E8EB]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
            submitted === true ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export default HomeworkModal;
