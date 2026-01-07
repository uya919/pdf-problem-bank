/**
 * AttendanceModal - 출결 모달 (토스 스타일 v3)
 *
 * 기능:
 * - 3단계 토글: [출석][지각][결석]
 * - 지각/결석 선택 시 사유 칩 표시
 * - "기타" 선택 시 직접 입력 필드 확장
 * - 일괄 처리 버튼 (전체 출석)
 * - 52px 컴팩트 행
 */
import { useState, useEffect, useCallback, useRef } from 'react';

// ============ 타입 정의 ============

export type AttendanceStatus = 'present' | 'late' | 'absent' | null;

export interface AttendanceStudent {
  id: string;
  name: string;
  status: AttendanceStatus;
  reason?: string;
  customReason?: string; // 기타 선택 시 직접 입력한 사유
}

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  time: string;
  students: AttendanceStudent[];
  onSave: (students: AttendanceStudent[]) => void;
}

// ============ 사유 옵션 ============

const LATE_REASONS = ['교통', '이전수업', '개인사정', '기타'];
const ABSENT_REASONS = ['병원', '가족행사', '학교행사', '기타'];

// ============ 색상 설정 ============

const STATUS_COLORS: Record<string, { bg: string; text: string; activeBg: string }> = {
  present: { bg: 'bg-white', text: 'text-[#10B981]', activeBg: 'bg-[#E8F5E9]' },
  late: { bg: 'bg-white', text: 'text-[#F59E0B]', activeBg: 'bg-[#FFF3E0]' },
  absent: { bg: 'bg-white', text: 'text-[#EF4444]', activeBg: 'bg-[#FFEBEE]' },
};

// ============ 메인 컴포넌트 ============

export function AttendanceModal({
  isOpen,
  onClose,
  className,
  time,
  students: initialStudents,
  onSave,
}: AttendanceModalProps) {
  const [students, setStudents] = useState<AttendanceStudent[]>(initialStudents);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customInputId, setCustomInputId] = useState<string | null>(null); // 기타 입력 중인 학생

  // 모달 열릴 때 students 초기화
  useEffect(() => {
    if (isOpen) {
      setStudents(initialStudents);
      setExpandedId(null);
      setCustomInputId(null);
    }
  }, [isOpen, initialStudents]);

  // ESC 키로 닫기 (기타 입력 중이 아닐 때만)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !customInputId) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, customInputId]);

  // 학생 상태 변경
  const setStatus = useCallback((id: string, newStatus: AttendanceStatus) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, status: newStatus, reason: undefined, customReason: undefined } : s
    ));
    setCustomInputId(null);
    // 지각/결석 선택 시 확장
    if (newStatus === 'late' || newStatus === 'absent') {
      setExpandedId(id);
    } else {
      setExpandedId(null);
    }
  }, []);

  // 사유 설정
  const setReason = useCallback((id: string, reason: string) => {
    if (reason === '기타') {
      // 기타 선택 시 입력 필드 열기
      setStudents(prev => prev.map(s =>
        s.id === id ? { ...s, reason: '기타', customReason: '' } : s
      ));
      setCustomInputId(id);
    } else {
      setStudents(prev => prev.map(s =>
        s.id === id ? { ...s, reason, customReason: undefined } : s
      ));
      setExpandedId(null);
      setCustomInputId(null);
    }
  }, []);

  // 기타 사유 직접 입력 완료
  const setCustomReason = useCallback((id: string, customReason: string) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, customReason: customReason.trim() || undefined } : s
    ));
    setExpandedId(null);
    setCustomInputId(null);
  }, []);

  // 기타 입력 취소
  const cancelCustomInput = useCallback((id: string) => {
    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, reason: undefined, customReason: undefined } : s
    ));
    setCustomInputId(null);
  }, []);

  // 전체 출석 처리
  const markAllPresent = useCallback(() => {
    setStudents(prev => prev.map(s => ({
      ...s,
      status: 'present' as const,
      reason: undefined,
      customReason: undefined
    })));
    setExpandedId(null);
    setCustomInputId(null);
  }, []);

  // 저장
  const handleSave = useCallback(() => {
    onSave(students);
    onClose();
  }, [students, onSave, onClose]);

  // 통계
  const checkedCount = students.filter(s => s.status !== null).length;
  const totalCount = students.length;
  const allChecked = checkedCount === totalCount;
  const presentCount = students.filter(s => s.status === 'present').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const absentCount = students.filter(s => s.status === 'absent').length;

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
              {className} 출결
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
            <strong className="text-[#191F28]">{time}</strong> · {totalCount}명
          </span>
          <div className="flex items-center gap-2 text-[12px]">
            {presentCount > 0 && (
              <span className="text-[#10B981] font-medium">출석 {presentCount}</span>
            )}
            {lateCount > 0 && (
              <span className="text-[#F59E0B] font-medium">지각 {lateCount}</span>
            )}
            {absentCount > 0 && (
              <span className="text-[#EF4444] font-medium">결석 {absentCount}</span>
            )}
            {!allChecked && (
              <span className="text-[#8B95A1]">미확인 {totalCount - checkedCount}</span>
            )}
          </div>
        </div>

        {/* 일괄 액션 */}
        <div className="flex gap-2 px-5 py-3 border-b border-[#F2F4F6]">
          <button
            onClick={markAllPresent}
            className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-[#E5E8EB] bg-white text-[#6B7684] hover:bg-[#10B981] hover:text-white hover:border-[#10B981] transition-colors active:scale-[0.97]"
          >
            전체 출석
          </button>
        </div>

        {/* 학생 리스트 */}
        <div className="flex-1 overflow-y-auto py-2">
          {students.map((student, index) => (
            <div key={student.id}>
              <StudentRow
                student={student}
                isExpanded={expandedId === student.id}
                isCustomInputOpen={customInputId === student.id}
                onSetStatus={(status) => setStatus(student.id, status)}
                onSetReason={(reason) => setReason(student.id, reason)}
                onSetCustomReason={(customReason) => setCustomReason(student.id, customReason)}
                onCancelCustomInput={() => cancelCustomInput(student.id)}
              />
              {index < students.length - 1 && (
                <div className="h-px bg-[#F2F4F6] mx-5" />
              )}
            </div>
          ))}
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

// ============ 학생 행 컴포넌트 ============

interface StudentRowProps {
  student: AttendanceStudent;
  isExpanded: boolean;
  isCustomInputOpen: boolean;
  onSetStatus: (status: AttendanceStatus) => void;
  onSetReason: (reason: string) => void;
  onSetCustomReason: (customReason: string) => void;
  onCancelCustomInput: () => void;
}

function StudentRow({
  student,
  isExpanded,
  isCustomInputOpen,
  onSetStatus,
  onSetReason,
  onSetCustomReason,
  onCancelCustomInput,
}: StudentRowProps) {
  const { name, status, reason, customReason } = student;
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 기타 입력 필드 열릴 때 포커스
  useEffect(() => {
    if (isCustomInputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomInputOpen]);

  // 입력값 초기화
  useEffect(() => {
    if (isCustomInputOpen) {
      setInputValue(customReason || '');
    }
  }, [isCustomInputOpen, customReason]);

  // 키보드 핸들링
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSetCustomReason(inputValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelCustomInput();
    }
  };

  // 확인 버튼 클릭
  const handleConfirm = () => {
    onSetCustomReason(inputValue);
  };

  // 행 배경색
  const rowBg = status === 'late' ? 'bg-[#FFFBEB]' : status === 'absent' ? 'bg-[#FEF2F2]' : '';

  // 사유 표시 텍스트
  const displayReason = reason === '기타' && customReason ? customReason : reason;

  return (
    <div className={`${rowBg} transition-colors`}>
      {/* 메인 행 */}
      <div className="flex items-center h-[52px] px-5">
        <span className="flex-1 text-[15px] text-[#191F28]">{name}</span>

        {/* 사유 표시 (인라인) - 기타 입력 중이 아닐 때만 */}
        {displayReason && !isCustomInputOpen && (
          <span className={`text-xs px-2 py-0.5 rounded mr-3 ${
            status === 'late' ? 'bg-[#FEF3C7] text-[#D97706]' :
            status === 'absent' ? 'bg-[#FEE2E2] text-[#DC2626]' :
            'bg-[#F5F6F7] text-[#8B95A1]'
          }`}>
            {displayReason}
          </span>
        )}

        {/* 3단계 토글 */}
        <div className="flex bg-[#F5F6F7] rounded-lg p-0.5">
          <button
            onClick={() => onSetStatus('present')}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              status === 'present'
                ? `${STATUS_COLORS.present.bg} ${STATUS_COLORS.present.text} shadow-sm`
                : 'text-[#8B95A1]'
            }`}
          >
            출석
          </button>
          <button
            onClick={() => onSetStatus('late')}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              status === 'late'
                ? `${STATUS_COLORS.late.bg} ${STATUS_COLORS.late.text} shadow-sm`
                : 'text-[#8B95A1]'
            }`}
          >
            지각
          </button>
          <button
            onClick={() => onSetStatus('absent')}
            className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
              status === 'absent'
                ? `${STATUS_COLORS.absent.bg} ${STATUS_COLORS.absent.text} shadow-sm`
                : 'text-[#8B95A1]'
            }`}
          >
            결석
          </button>
        </div>
      </div>

      {/* 사유 선택 (확장 영역) */}
      {isExpanded && (status === 'late' || status === 'absent') && (
        <div className="px-5 pb-3 animate-fade-in">
          <div className="flex flex-wrap gap-2 pl-0">
            <span className="text-[11px] text-[#8B95A1] mr-1">사유:</span>
            {(status === 'late' ? LATE_REASONS : ABSENT_REASONS).map((r) => (
              <button
                key={r}
                onClick={() => onSetReason(r)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all active:scale-[0.95] ${
                  reason === r
                    ? status === 'late'
                      ? 'bg-[#F59E0B] text-white'
                      : 'bg-[#EF4444] text-white'
                    : 'bg-[#F5F6F7] text-[#6B7684] hover:bg-[#E5E8EB]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* 기타 직접 입력 필드 */}
          {isCustomInputOpen && (
            <div className="mt-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.slice(0, 20))}
                    onKeyDown={handleKeyDown}
                    placeholder="직접 입력..."
                    className={`w-full h-10 px-3 pr-14 text-[14px] rounded-lg border-[1.5px] outline-none transition-colors ${
                      status === 'late'
                        ? 'border-[#F59E0B] focus:border-[#F59E0B]'
                        : 'border-[#EF4444] focus:border-[#EF4444]'
                    }`}
                    aria-label={`${status === 'late' ? '지각' : '결석'} 사유 직접 입력`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#8B95A1]">
                    {inputValue.length}/20
                  </span>
                </div>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-all active:scale-[0.97] ${
                    status === 'late' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                  }`}
                >
                  확인
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#8B95A1]">
                Enter로 확인, ESC로 취소
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AttendanceModal;
