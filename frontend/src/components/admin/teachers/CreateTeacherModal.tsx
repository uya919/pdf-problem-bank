/**
 * CreateTeacherModal - 강사 추가 모달
 *
 * Phase 9-1: Mock 데이터 기반 강사 추가
 * - React Portal 사용 (z-index: 9999)
 * - 입력 필드: 이름, 과목, 연락처, 이메일, 메모
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';

/** Mock 강사 타입 */
export interface MockTeacher {
  id: string;
  name: string;
  subject: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive';
  classes: string[];
  joinDate: string;
  note?: string;
}

interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: MockTeacher) => void;
}

/** 과목 옵션 */
const SUBJECT_OPTIONS = ['수학', '국어', '영어', '과학', '사회', '기타'];

export function CreateTeacherModal({ isOpen, onClose, onSave }: CreateTeacherModalProps) {
  // 폼 상태
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('수학');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newTeacher: MockTeacher = {
        id: `teacher-${Date.now()}`,
        name: name.trim(),
        subject,
        phone: phone.trim(),
        email: email.trim(),
        status: 'active',
        classes: [],
        joinDate: new Date().toISOString().split('T')[0],
        note: note.trim() || undefined,
      };

      onSave(newTeacher);
      handleClose();
    } catch (err) {
      setError('강사 추가 중 오류가 발생했습니다.');
      console.error('강사 추가 실패:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 모달 닫기 및 폼 초기화
   */
  const handleClose = () => {
    setName('');
    setSubject('수학');
    setPhone('');
    setEmail('');
    setNote('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* 모달 컨테이너 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-grey-900">새 강사 추가</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-grey-400 hover:text-grey-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* 이름 (필수) */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="강사 이름"
                  required
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 과목 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  담당 과목
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* 연락처 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  연락처
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@hyeyum.com"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  메모
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="추가 정보 (선택)"
                  rows={3}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '추가 중...' : '강사 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
