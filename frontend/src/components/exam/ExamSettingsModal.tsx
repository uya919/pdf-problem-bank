/**
 * 시험지 설정 모달
 *
 * Phase 21+ D-3: 시험지 설정 UI
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Settings,
  FileText,
  Layout,
  Type,
  Hash,
  Calendar,
  Clock,
  Check,
  Loader2,
} from 'lucide-react';
import type { ExamPaperSettings } from '../../types/examPaper';
import { DEFAULT_EXAM_SETTINGS } from '../../types/examPaper';

interface ExamSettingsModalProps {
  open: boolean;
  settings: ExamPaperSettings;
  onClose: () => void;
  onSave: (settings: ExamPaperSettings) => void;
  isSaving?: boolean;
}

export function ExamSettingsModal({
  open,
  settings,
  onClose,
  onSave,
  isSaving = false,
}: ExamSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ExamPaperSettings>(settings);
  const [activeTab, setActiveTab] = useState<'basic' | 'layout' | 'display'>('basic');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = <K extends keyof ExamPaperSettings>(
    key: K,
    value: ExamPaperSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleReset = () => {
    setLocalSettings({ ...DEFAULT_EXAM_SETTINGS, title: settings.title });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-xl mx-4
          flex flex-col overflow-hidden"
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-grey-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-grey-900">시험지 설정</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-grey-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="px-6 py-3 border-b border-grey-100 flex gap-2">
          {[
            { id: 'basic', label: '기본 정보', icon: FileText },
            { id: 'layout', label: '레이아웃', icon: Layout },
            { id: 'display', label: '표시 옵션', icon: Type },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-grey-600 hover:bg-grey-50'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'basic' && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* 시험 제목 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    시험 제목 *
                  </label>
                  <input
                    type="text"
                    value={localSettings.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="예: 2024학년도 1학기 중간고사"
                    className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 부제목 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    부제목
                  </label>
                  <input
                    type="text"
                    value={localSettings.subtitle || ''}
                    onChange={(e) => handleChange('subtitle', e.target.value || undefined)}
                    placeholder="예: 수학 I"
                    className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 기관/학교명 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    기관/학교명
                  </label>
                  <input
                    type="text"
                    value={localSettings.institution || ''}
                    onChange={(e) => handleChange('institution', e.target.value || undefined)}
                    placeholder="예: OO고등학교"
                    className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 과목/학년 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      과목
                    </label>
                    <input
                      type="text"
                      value={localSettings.subject || ''}
                      onChange={(e) => handleChange('subject', e.target.value || undefined)}
                      placeholder="예: 수학"
                      className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      학년
                    </label>
                    <input
                      type="text"
                      value={localSettings.grade || ''}
                      onChange={(e) => handleChange('grade', e.target.value || undefined)}
                      placeholder="예: 고1"
                      className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* 날짜/시간 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      시험 날짜
                    </label>
                    <input
                      type="date"
                      value={localSettings.date || ''}
                      onChange={(e) => handleChange('date', e.target.value || undefined)}
                      className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      <Clock className="w-4 h-4 inline mr-1" />
                      시험 시간 (분)
                    </label>
                    <input
                      type="number"
                      value={localSettings.duration || ''}
                      onChange={(e) =>
                        handleChange('duration', e.target.value ? parseInt(e.target.value) : undefined)
                      }
                      placeholder="예: 50"
                      min="1"
                      className="w-full px-4 py-2.5 bg-grey-50 border border-grey-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'layout' && (
              <motion.div
                key="layout"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                {/* 용지 크기 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-2">
                    용지 크기
                  </label>
                  <div className="flex gap-2">
                    {(['A4', 'B4', 'Letter'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleChange('paperSize', size)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          localSettings.paperSize === size
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-grey-200 hover:border-grey-300'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 용지 방향 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-2">
                    용지 방향
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'portrait', label: '세로' },
                      { value: 'landscape', label: '가로' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleChange('orientation', opt.value as 'portrait' | 'landscape')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          localSettings.orientation === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-grey-200 hover:border-grey-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 단 수 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-2">
                    단 수
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 1, label: '1단' },
                      { value: 2, label: '2단' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleChange('columns', opt.value as 1 | 2)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          localSettings.columns === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-grey-200 hover:border-grey-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 글꼴 크기 */}
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-2">
                    글꼴 크기
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'small', label: '작게' },
                      { value: 'medium', label: '보통' },
                      { value: 'large', label: '크게' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleChange('fontSize', opt.value as 'small' | 'medium' | 'large')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                          localSettings.fontSize === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-grey-200 hover:border-grey-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'display' && (
              <motion.div
                key="display"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* 토글 옵션들 */}
                {[
                  { key: 'showHeader', label: '헤더 표시', desc: '시험 정보를 페이지 상단에 표시' },
                  { key: 'showFooter', label: '푸터 표시', desc: '페이지 하단에 정보 표시' },
                  { key: 'showPageNumbers', label: '페이지 번호', desc: '페이지 번호 표시' },
                  { key: 'showTotalPoints', label: '총점 표시', desc: '시험지 총 배점 표시' },
                  { key: 'showPoints', label: '문제별 배점', desc: '각 문제의 배점 표시' },
                  { key: 'showAnswerSpace', label: '답안 작성란', desc: '답안 작성 공간 추가' },
                  { key: 'generateAnswerKey', label: '정답지 생성', desc: '정답지 자동 생성' },
                ].map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center justify-between p-4 bg-grey-50 rounded-xl"
                  >
                    <div>
                      <div className="font-medium text-grey-900">{option.label}</div>
                      <div className="text-sm text-grey-500">{option.desc}</div>
                    </div>
                    <button
                      onClick={() =>
                        handleChange(
                          option.key as keyof ExamPaperSettings,
                          !localSettings[option.key as keyof ExamPaperSettings]
                        )
                      }
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        localSettings[option.key as keyof ExamPaperSettings]
                          ? 'bg-blue-500'
                          : 'bg-grey-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          localSettings[option.key as keyof ExamPaperSettings]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}

                {/* 답안 작성란 줄 수 */}
                {localSettings.showAnswerSpace && (
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <label className="block text-sm font-medium text-grey-700 mb-2">
                      답안 작성란 줄 수
                    </label>
                    <input
                      type="number"
                      value={localSettings.answerSpaceLines}
                      onChange={(e) => handleChange('answerSpaceLines', parseInt(e.target.value) || 3)}
                      min="1"
                      max="20"
                      className="w-24 px-3 py-2 border border-grey-200 rounded-lg text-center"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-grey-100 flex items-center justify-between bg-grey-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-grey-600 hover:text-grey-800 text-sm font-medium"
          >
            기본값으로 초기화
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-grey-600 bg-grey-100 rounded-xl font-medium
                hover:bg-grey-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !localSettings.title.trim()}
              className="px-5 py-2 text-white bg-blue-500 rounded-xl font-medium
                hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ExamSettingsModal;
