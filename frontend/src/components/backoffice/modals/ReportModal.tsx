/**
 * ReportModal - 주간 학생 리포트 작성 모달
 *
 * Stage 58: 강사가 주담임 학생에 대해 주간 평가 작성
 *
 * 디자인: Option 1 (v3) - 현재 시스템 스타일
 * 시험 점수: Option F - 토스증권 스타일 (큰 점수 + 하단 정보)
 *
 * 기능:
 * 1. 이번 주 요약 (출결, 시험)
 * 2. 숙제/태도/이해도/참여도 5점 평가
 * 3. 텍스트 평가 + 템플릿 칩
 * 4. 저장/임시저장
 */
import { useState, useEffect } from 'react';
import { Star, TrendingUp, Calendar, BookOpen, Save } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import {
  useStudentWeeklyReport,
  useSaveWeeklyReport,
  type HomeroomStudent,
  type WeeklyReportInput,
  STRENGTH_TEMPLATES,
  IMPROVEMENT_TEMPLATES,
  PARENT_MESSAGE_TEMPLATES,
} from '../../../hooks/backoffice/useWeeklyReports';

// =====================================================
// Props
// =====================================================

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: HomeroomStudent | null;
  weekStart: string;
  teacherId: string | null;
}

// =====================================================
// 폼 데이터 타입
// =====================================================

interface ReportFormData {
  attendance_present: number;
  attendance_total: number;
  test_type: 'daily' | 'weekly' | 'monthly' | 'quiz' | null;
  test_count: number;
  test_score: number | null;
  test_class_avg: number | null;
  test_rank: number | null;
  test_total_students: number | null;
  homework_score: number | null;
  attitude_score: number | null;
  understanding_score: number | null;
  participation_score: number | null;
  strengths: string;
  improvements: string;
  parent_message: string;
  teacher_note: string;
  is_draft: boolean;
}

const initialFormData: ReportFormData = {
  attendance_present: 0,
  attendance_total: 0,
  test_type: null,
  test_count: 0,
  test_score: null,
  test_class_avg: null,
  test_rank: null,
  test_total_students: null,
  homework_score: null,
  attitude_score: null,
  understanding_score: null,
  participation_score: null,
  strengths: '',
  improvements: '',
  parent_message: '',
  teacher_note: '',
  is_draft: true,
};

// =====================================================
// 5점 별점 컴포넌트
// =====================================================

interface StarRatingProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

function StarRating({ label, value, onChange }: StarRatingProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                i <= (value || 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 시험 점수 섹션 (Option F - 토스증권 스타일)
// =====================================================

interface TestScoreSectionProps {
  form: ReportFormData;
  onChange: (updates: Partial<ReportFormData>) => void;
}

function TestScoreSection({ form, onChange }: TestScoreSectionProps) {
  const hasScore = form.test_score !== null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-blue-600 mb-3">
        <TrendingUp className="w-4 h-4" />
        <span className="text-sm font-medium">시험 점수</span>
      </div>

      {hasScore ? (
        <>
          <div className="text-4xl font-bold text-[#3182F6] mb-3">
            {form.test_score}점
          </div>
          <div className="flex gap-4 pt-3 border-t border-blue-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">반 평균</span>
              <span className="text-sm font-medium text-gray-700">
                {form.test_class_avg ?? '-'}점
              </span>
            </div>
            {form.test_rank && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">석차</span>
                <span className="text-sm font-medium text-green-600">
                  {form.test_rank}위/{form.test_total_students}명
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-3">시험 점수를 입력하세요</p>
          <input
            type="number"
            placeholder="점수 입력"
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-center text-lg font-medium"
            onChange={(e) => {
              const score = e.target.value ? parseFloat(e.target.value) : null;
              onChange({ test_score: score });
            }}
          />
        </div>
      )}
    </div>
  );
}

// =====================================================
// 출결 요약 섹션
// =====================================================

interface AttendanceSectionProps {
  present: number;
  total: number;
  onChange: (present: number, total: number) => void;
}

function AttendanceSection({ present, total, onChange }: AttendanceSectionProps) {
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-gray-600 mb-3">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">출석</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={present}
            onChange={(e) => onChange(parseInt(e.target.value) || 0, total)}
            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-lg font-medium"
          />
          <span className="text-gray-500">/</span>
          <input
            type="number"
            min="0"
            value={total}
            onChange={(e) => onChange(present, parseInt(e.target.value) || 0)}
            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-lg font-medium"
          />
          <span className="text-sm text-gray-500">일</span>
        </div>
        <div className="text-lg font-bold text-gray-900">
          {rate}%
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 템플릿 칩 컴포넌트
// =====================================================

interface TemplateChipsProps {
  templates: string[];
  onSelect: (text: string) => void;
}

function TemplateChips({ templates, onSelect }: TemplateChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {templates.map((template) => (
        <button
          key={template}
          type="button"
          onClick={() => onSelect(template)}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
        >
          + {template}
        </button>
      ))}
    </div>
  );
}

// =====================================================
// 텍스트 입력 섹션
// =====================================================

interface TextInputSectionProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  templates?: string[];
  placeholder?: string;
}

function TextInputSection({
  label,
  icon,
  value,
  onChange,
  templates,
  placeholder,
}: TextInputSectionProps) {
  const handleTemplateSelect = (text: string) => {
    onChange(value ? `${value}\n${text}` : text);
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-gray-700 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
        rows={3}
      />
      {templates && (
        <TemplateChips templates={templates} onSelect={handleTemplateSelect} />
      )}
    </div>
  );
}

// =====================================================
// 메인 컴포넌트
// =====================================================

export function ReportModal({
  isOpen,
  onClose,
  student,
  weekStart,
  teacherId,
}: ReportModalProps) {
  const [form, setForm] = useState<ReportFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // 기존 리포트 조회
  const { data: existingReport } = useStudentWeeklyReport(
    teacherId,
    student?.id || null,
    weekStart
  );

  // 저장 뮤테이션
  const saveReport = useSaveWeeklyReport(teacherId);

  // 기존 데이터로 폼 초기화
  useEffect(() => {
    if (existingReport) {
      setForm({
        attendance_present: existingReport.attendance_present,
        attendance_total: existingReport.attendance_total,
        test_type: existingReport.test_type,
        test_count: existingReport.test_count,
        test_score: existingReport.test_score,
        test_class_avg: existingReport.test_class_avg,
        test_rank: existingReport.test_rank,
        test_total_students: existingReport.test_total_students,
        homework_score: existingReport.homework_score,
        attitude_score: existingReport.attitude_score,
        understanding_score: existingReport.understanding_score,
        participation_score: existingReport.participation_score,
        strengths: existingReport.strengths || '',
        improvements: existingReport.improvements || '',
        parent_message: existingReport.parent_message || '',
        teacher_note: existingReport.teacher_note || '',
        is_draft: existingReport.is_draft,
      });
    } else {
      setForm(initialFormData);
    }
  }, [existingReport, student?.id]);

  const updateForm = (updates: Partial<ReportFormData>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async (isDraft: boolean) => {
    if (!student) return;

    setIsSaving(true);
    try {
      const input: WeeklyReportInput = {
        student_id: student.id,
        class_id: student.class_id,
        week_start: weekStart,
        ...form,
        is_draft: isDraft,
      };

      await saveReport.mutateAsync(input);
      onClose();
    } catch (error) {
      console.error('Failed to save report:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!student) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${student.name} 주간 리포트`}
      subtitle={`${student.class_name} · ${weekStart} 주차`}
    >
      <div className="space-y-6">
        {/* 출결 + 시험 */}
        <div className="grid gap-4">
          <AttendanceSection
            present={form.attendance_present}
            total={form.attendance_total}
            onChange={(present, total) =>
              updateForm({ attendance_present: present, attendance_total: total })
            }
          />
          <TestScoreSection form={form} onChange={updateForm} />
        </div>

        {/* 5점 평가 */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">학습 평가</span>
          </div>
          <div className="divide-y divide-gray-100">
            <StarRating
              label="숙제 완료도"
              value={form.homework_score}
              onChange={(v) => updateForm({ homework_score: v })}
            />
            <StarRating
              label="수업 태도"
              value={form.attitude_score}
              onChange={(v) => updateForm({ attitude_score: v })}
            />
            <StarRating
              label="이해도"
              value={form.understanding_score}
              onChange={(v) => updateForm({ understanding_score: v })}
            />
            <StarRating
              label="참여도"
              value={form.participation_score}
              onChange={(v) => updateForm({ participation_score: v })}
            />
          </div>
        </div>

        {/* 텍스트 평가 */}
        <div className="space-y-4">
          <TextInputSection
            label="잘한 점"
            icon={<span className="text-green-500">✓</span>}
            value={form.strengths}
            onChange={(v) => updateForm({ strengths: v })}
            templates={STRENGTH_TEMPLATES}
            placeholder="이번 주 잘한 점을 작성해주세요"
          />
          <TextInputSection
            label="개선할 점"
            icon={<span className="text-amber-500">!</span>}
            value={form.improvements}
            onChange={(v) => updateForm({ improvements: v })}
            templates={IMPROVEMENT_TEMPLATES}
            placeholder="개선이 필요한 점을 작성해주세요"
          />
          <TextInputSection
            label="학부모 전달사항"
            icon={<span className="text-blue-500">📝</span>}
            value={form.parent_message}
            onChange={(v) => updateForm({ parent_message: v })}
            templates={PARENT_MESSAGE_TEMPLATES}
            placeholder="학부모님께 전달할 내용을 작성해주세요"
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            임시저장
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
