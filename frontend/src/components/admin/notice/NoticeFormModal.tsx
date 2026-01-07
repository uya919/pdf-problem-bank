/**
 * NoticeFormModal - 공지 등록 모달
 *
 * Stage 17: 공지 등록 모달
 * - 공지 유형 선택
 * - 제목/설명 입력
 * - 날짜/시간 선택
 * - 대상 권한 선택
 * - @학생 멘션 (결석 유형)
 *
 * Stage 17-B: 중요 체크
 * - 중요 체크 시 캘린더 날짜 셀에 미리보기 표시
 */

import { useState, useCallback, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { NoticeTypeSelector } from './NoticeTypeSelector';
import { VisibilitySelector } from './VisibilitySelector';
import { StudentMention } from './StudentMention';
import type {
  NoticeType,
  NoticeVisibility,
  TaggedStudent,
  CreateNoticeInput,
} from '../../../types/admin';
import { IMPORTANT_NOTICE_TYPES } from '../../../types/admin';

interface NoticeFormModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 공지 생성 핸들러 */
  onSubmit: (input: CreateNoticeInput) => Promise<unknown>;
  /** 기본 날짜 (선택된 날짜) */
  defaultDate?: string;
}

/** 폼 초기 상태 */
const INITIAL_FORM_STATE = {
  type: 'urgent' as NoticeType,
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  visibility: 'all' as NoticeVisibility,
  taggedStudent: null as TaggedStudent | null,
  absenceReason: '',
  isImportant: false,  // Stage 17-B: 중요 체크
};

/** 결석 사유 옵션 */
const ABSENCE_REASONS = [
  '병결',
  '가사',
  '학교 행사',
  '개인 사정',
  '기타',
];

/**
 * 공지 등록 폼 모달
 */
export function NoticeFormModal({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
}: NoticeFormModalProps) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 기본 날짜 설정
  useEffect(() => {
    if (defaultDate && isOpen) {
      setForm((prev) => ({ ...prev, date: defaultDate }));
    }
  }, [defaultDate, isOpen]);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM_STATE);
      setErrors({});
    }
  }, [isOpen]);

  // 유형 변경 시 관련 필드 초기화
  const handleTypeChange = useCallback((type: NoticeType) => {
    setForm((prev) => ({
      ...prev,
      type,
      // 결석이 아니면 학생 태그 초기화
      taggedStudent: type === 'absence' ? prev.taggedStudent : null,
      absenceReason: type === 'absence' ? prev.absenceReason : '',
      // 결석이면 강사 전용으로 변경
      visibility: type === 'absence' ? 'teacher' : prev.visibility,
      // 중요 유형(긴급, 신규등원, 결석, 휴원)은 자동으로 중요 체크
      isImportant: IMPORTANT_NOTICE_TYPES.includes(type) ? true : prev.isImportant,
    }));
    setErrors({});
  }, []);

  // 유효성 검사
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = '제목을 입력하세요';
    }

    if (!form.date) {
      newErrors.date = '날짜를 선택하세요';
    }

    // 결석 유형일 때 학생 필수
    if (form.type === 'absence' && !form.taggedStudent) {
      newErrors.student = '결석 학생을 선택하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // 제출 핸들러
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await onSubmit({
          type: form.type,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          date: form.date,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          visibility: form.visibility,
          taggedStudentId: form.taggedStudent?.id,
          absenceReason: form.absenceReason || undefined,
          isImportant: form.isImportant,  // Stage 17-B
        });
        onClose();
      } catch (error) {
        console.error('공지 생성 실패:', error);
        setErrors({ submit: '공지 등록에 실패했습니다' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, validate, onSubmit, onClose]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="공지 등록"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 공지 유형 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            공지 유형
          </label>
          <NoticeTypeSelector
            value={form.type}
            onChange={handleTypeChange}
            disabled={isSubmitting}
          />
        </div>

        {/* Stage 17-B: 중요 체크 */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isImportant}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isImportant: e.target.checked }))
              }
              disabled={isSubmitting}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-amber-500">📌</span>
            <span className="text-sm font-medium text-gray-700">중요</span>
            <span className="text-xs text-gray-500">(캘린더에 표시)</span>
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="공지 제목을 입력하세요"
            disabled={isSubmitting}
            className={`
              w-full px-4 py-2.5 border rounded-lg
              text-sm text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${errors.title ? 'border-red-300' : 'border-gray-200'}
            `}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title}</p>
          )}
        </div>

        {/* 결석 유형일 때: 학생 멘션 */}
        {form.type === 'absence' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                결석 학생 <span className="text-red-500">*</span>
              </label>
              <StudentMention
                value={form.taggedStudent}
                onChange={(student) =>
                  setForm((prev) => ({ ...prev, taggedStudent: student }))
                }
                placeholder="학생이름으로 검색"
                disabled={isSubmitting}
                error={errors.student}
              />
            </div>

            {/* 결석 사유 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                결석 사유
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {ABSENCE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, absenceReason: reason }))
                    }
                    disabled={isSubmitting}
                    className={`
                      px-3 py-1.5 rounded-full text-sm
                      transition-colors
                      ${
                        form.absenceReason === reason
                          ? 'bg-red-100 text-red-700 border-2 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }
                    `}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {form.absenceReason === '기타' && (
                <input
                  type="text"
                  placeholder="사유를 직접 입력하세요"
                  disabled={isSubmitting}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      absenceReason: e.target.value,
                    }))
                  }
                  className="
                    w-full px-4 py-2 border border-gray-200 rounded-lg
                    text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                  "
                />
              )}
            </div>
          </>
        )}

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
            disabled={isSubmitting}
            className={`
              w-full px-4 py-2.5 border rounded-lg
              text-sm text-gray-900
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              disabled:bg-gray-50 disabled:cursor-not-allowed
              ${errors.date ? 'border-red-300' : 'border-gray-200'}
            `}
          />
          {errors.date && (
            <p className="mt-1 text-xs text-red-500">{errors.date}</p>
          )}
        </div>

        {/* 시간 (선택) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              시작 시간
            </label>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startTime: e.target.value }))
              }
              disabled={isSubmitting}
              className="
                w-full px-4 py-2.5 border border-gray-200 rounded-lg
                text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
              "
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              종료 시간
            </label>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, endTime: e.target.value }))
              }
              disabled={isSubmitting}
              className="
                w-full px-4 py-2.5 border border-gray-200 rounded-lg
                text-sm text-gray-900
                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                disabled:bg-gray-50 disabled:cursor-not-allowed
              "
            />
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            설명
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="추가 설명을 입력하세요 (선택)"
            disabled={isSubmitting}
            rows={3}
            className="
              w-full px-4 py-2.5 border border-gray-200 rounded-lg
              text-sm text-gray-900 placeholder:text-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              disabled:bg-gray-50 disabled:cursor-not-allowed
              resize-none
            "
          />
        </div>

        {/* 공지 대상 (결석이 아닐 때만) */}
        {form.type !== 'absence' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              공지 대상
            </label>
            <VisibilitySelector
              value={form.visibility}
              onChange={(visibility) =>
                setForm((prev) => ({ ...prev, visibility }))
              }
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* 결석일 때 안내 문구 */}
        {form.type === 'absence' && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-700">
              결석 공지는 담당 강사에게만 표시됩니다.
              강사가 확인 후 출석부에 반영합니다.
            </p>
          </div>
        )}

        {/* 에러 메시지 */}
        {errors.submit && (
          <div className="p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="
              flex-1 px-4 py-2.5
              bg-gray-100 text-gray-700 rounded-lg
              text-sm font-medium
              hover:bg-gray-200 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="
              flex-1 px-4 py-2.5
              bg-blue-500 text-white rounded-lg
              text-sm font-medium
              hover:bg-blue-600 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2
            "
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                등록 중...
              </>
            ) : (
              '공지 등록'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NoticeFormModal;
