/**
 * UploadNamingModal Component (Phase 35, Phase 34-B, Phase 34-C)
 *
 * 파일 업로드 시 이름 지정 모달
 * - 학년/과정/시리즈/타입 선택
 * - 토스 스타일 UI
 * - Phase 34-B: 메타데이터 전달
 * - Phase 34-C: 과정 동적 로딩 + 추가 기능
 */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, ChevronDown, Plus } from 'lucide-react';
import { api, type CoursesConfig } from '../../api/client';

// Phase 34-B: 업로드 메타데이터 인터페이스
export interface UploadNamingResult {
  documentId: string;
  grade: string;
  course: string;
  series: string;
  docType: string;
}

interface UploadNamingModalProps {
  file: File | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: UploadNamingResult) => void;
  isUploading?: boolean;
}

// 학년 목록
const GRADES = ['고1', '고2', '고3', '중1', '중2', '중3'];

// Phase 34-C: 하드코딩된 COURSES는 API 로딩 실패 시 fallback으로만 사용
const FALLBACK_COURSES: Record<string, string[]> = {
  고1: ['공통수학1', '공통수학2', '수학'],
  고2: ['미적분', '확률과통계', '기하', '수학I', '수학II'],
  고3: ['미적분', '확률과통계', '기하', '수학I', '수학II'],
  중1: ['수학'],
  중2: ['수학'],
  중3: ['수학'],
};

// 인기 시리즈 (자동완성용)
const POPULAR_SERIES = [
  '수학의바이블',
  '개념원리',
  '쎈',
  '베이직쎈',
  '라이트쎈',
  '블랙라벨',
  '자이스토리',
  '수학의정석',
  '개념플러스유형',
  '일품',
  'RPM',
  '마플',
];

export function UploadNamingModal({
  file,
  isOpen,
  onClose,
  onConfirm,
  isUploading = false,
}: UploadNamingModalProps) {
  const queryClient = useQueryClient();
  const [grade, setGrade] = useState<string>('고1');
  const [course, setCourse] = useState<string>('');
  const [series, setSeries] = useState<string>('');
  const [type, setType] = useState<'문제' | '해설'>('문제');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState('');

  // Phase 34-C: 과정 목록 API 로드
  const { data: coursesConfig } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api.getCourses(),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });

  // Phase 34-C: 과정 추가 mutation
  const addCourseMutation = useMutation({
    mutationFn: ({ grade, course }: { grade: string; course: string }) =>
      api.addCourse(grade, course),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowAddCourse(false);
      setNewCourse('');
    },
  });

  // Phase 34-C: 학년별 과정 목록 (API + fallback)
  const availableCourses = useMemo(() => {
    if (!coursesConfig) {
      return FALLBACK_COURSES[grade] || [];
    }
    const defaults = coursesConfig.defaultCourses[grade] || [];
    const customs = coursesConfig.customCourses[grade] || [];
    return [...defaults, ...customs];
  }, [coursesConfig, grade]);

  // 학년 변경 시 과정 초기화
  useEffect(() => {
    setCourse(availableCourses[0] || '');
  }, [grade, availableCourses]);

  // 파일명에서 힌트 추출
  useEffect(() => {
    if (file) {
      const filename = file.name.toLowerCase();

      // 타입 추출
      if (filename.includes('해설')) {
        setType('해설');
      } else if (filename.includes('문제') || filename.includes('정답')) {
        setType('문제');
      }

      // 학년 추출
      if (filename.includes('고등') || filename.includes('고1') || filename.includes('고2') || filename.includes('고3')) {
        if (filename.includes('고2')) setGrade('고2');
        else if (filename.includes('고3')) setGrade('고3');
        else setGrade('고1');
      } else if (filename.includes('중등') || filename.includes('중1') || filename.includes('중2') || filename.includes('중3')) {
        if (filename.includes('중2')) setGrade('중2');
        else if (filename.includes('중3')) setGrade('중3');
        else setGrade('중1');
      }

      // 시리즈 추출 시도
      for (const s of POPULAR_SERIES) {
        if (filename.includes(s.toLowerCase().replace(/\s/g, ''))) {
          setSeries(s);
          break;
        }
      }
    }
  }, [file]);

  // 시리즈 필터링
  const filteredSeries = useMemo(() => {
    if (!series) return POPULAR_SERIES;
    return POPULAR_SERIES.filter((s) =>
      s.toLowerCase().includes(series.toLowerCase())
    );
  }, [series]);

  // 미리보기 파일명
  const previewName = useMemo(() => {
    if (!grade || !course || !series || !type) return '';
    return `${grade}_${course}_${series}_${type}`;
  }, [grade, course, series, type]);

  // 유효성 검사
  const isValid = grade && course && series.trim() && type;

  // Phase 34-B: 제출 핸들러 (메타데이터 포함)
  const handleSubmit = () => {
    console.log('[UploadNamingModal] handleSubmit called', { isValid, previewName, grade, course, series, type });
    if (!isValid) {
      console.warn('[UploadNamingModal] Form is not valid');
      return;
    }
    const result: UploadNamingResult = {
      documentId: previewName,
      grade,
      course,
      series,
      docType: type,
    };
    console.log('[UploadNamingModal] Calling onConfirm with:', result);
    onConfirm(result);
  };

  // ESC 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        // Phase 35.1: Flexbox 기반 반응형 센터링
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isUploading ? undefined : onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* 헤더 - 고정 */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-grey-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-toss-blue/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-toss-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-grey-900">파일 이름 지정</h2>
                  <p className="text-sm text-grey-500 truncate max-w-[280px]">
                    {file.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isUploading}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-grey-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-grey-500" />
              </button>
            </div>

            {/* 본문 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* 학년 선택 */}
              <div>
                <label className="block text-sm font-semibold text-grey-700 mb-2">
                  학년
                </label>
                <div className="flex flex-wrap gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      disabled={isUploading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        grade === g
                          ? 'bg-toss-blue text-white shadow-sm'
                          : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                      } disabled:opacity-50`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* 과정 선택 */}
              <div>
                <label className="block text-sm font-semibold text-grey-700 mb-2">
                  과정
                </label>
                <div className="relative">
                  <select
                    value={course}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAddCourse(true);
                      } else {
                        setCourse(e.target.value);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full px-4 py-3 bg-grey-50 border border-grey-200 rounded-xl text-grey-900 appearance-none focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue disabled:opacity-50"
                  >
                    {availableCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__add_new__">+ 새 과정 추가...</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-grey-400 pointer-events-none" />
                </div>
                {/* Phase 34-C: 새 과정 추가 인라인 폼 */}
                {showAddCourse && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      placeholder="새 과정 이름"
                      className="flex-1 px-3 py-2 bg-white border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCourse.trim()) {
                          addCourseMutation.mutate({ grade, course: newCourse.trim() });
                          setCourse(newCourse.trim());
                        }
                      }}
                      disabled={!newCourse.trim() || addCourseMutation.isPending}
                      className="px-3 py-2 bg-toss-blue text-white rounded-lg text-sm font-medium hover:bg-toss-blue/90 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCourse(false);
                        setNewCourse('');
                      }}
                      className="px-3 py-2 bg-grey-100 text-grey-600 rounded-lg text-sm font-medium hover:bg-grey-200"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>

              {/* 시리즈 입력 */}
              <div className="relative">
                <label className="block text-sm font-semibold text-grey-700 mb-2">
                  시리즈
                </label>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  disabled={isUploading}
                  placeholder="예: 수학의바이블, 개념원리, 쎈"
                  className="w-full px-4 py-3 bg-grey-50 border border-grey-200 rounded-xl text-grey-900 placeholder:text-grey-400 focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue disabled:opacity-50"
                />

                {/* 자동완성 제안 */}
                {showSuggestions && filteredSeries.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-grey-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-10">
                    {filteredSeries.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSeries(s);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-grey-700 hover:bg-grey-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 타입 선택 */}
              <div>
                <label className="block text-sm font-semibold text-grey-700 mb-2">
                  타입
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setType('문제')}
                    disabled={isUploading}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      type === '문제'
                        ? 'border-toss-blue bg-toss-blue/5 text-toss-blue'
                        : 'border-grey-200 bg-grey-50 text-grey-600 hover:border-grey-300'
                    } disabled:opacity-50`}
                  >
                    문제집
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('해설')}
                    disabled={isUploading}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      type === '해설'
                        ? 'border-toss-blue bg-toss-blue/5 text-toss-blue'
                        : 'border-grey-200 bg-grey-50 text-grey-600 hover:border-grey-300'
                    } disabled:opacity-50`}
                  >
                    해설집
                  </button>
                </div>
              </div>

              {/* 미리보기 */}
              {previewName && (
                <div className="bg-grey-50 rounded-xl p-4">
                  <p className="text-xs text-grey-500 mb-1">저장될 이름</p>
                  <p className="text-sm font-mono text-grey-900 break-all">
                    {previewName}.pdf
                  </p>
                </div>
              )}
            </div>

            {/* 푸터 - 고정 */}
            <div className="flex-shrink-0 flex gap-3 px-6 py-4 bg-grey-50 border-t border-grey-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="flex-1 px-4 py-3 bg-white border border-grey-200 rounded-xl text-grey-700 font-medium hover:bg-grey-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || isUploading}
                className="flex-1 px-4 py-3 bg-toss-blue text-white rounded-xl font-medium hover:bg-toss-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    업로드
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
