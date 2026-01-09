/**
 * ProgressModal - 진도 기록 모달
 *
 * 목업: progress-modal-with-test.html 기준
 * - 지난 수업 정보 (단원, 진도, 숙제)
 * - 오늘 수업 폼 (단원명, 진도, 숙제, 비고)
 * - 시험 토글 (Daily/Weekly/Monthly + 학생별 점수)
 *
 * Stage 48: 스와이프 후 진도 데이터 중복 버그 수정
 * - 모달 내부에서 useLastProgressBefore, useProgressByDate 훅 호출
 * - classId 변경 시 자동으로 새 데이터 로드 (stale data 방지)
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { BookIcon, NoteIcon } from '../../ui/Icons';
import { FileText, Loader2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { TestInputSection } from './TestInputSection';
import { TextbookAutocomplete } from './TextbookAutocomplete';
import { PdfViewerModal } from '../../pdf';
import { useTextbooksByClass } from '../../../hooks/useTextbooks';
import { useLastProgress } from '../../../hooks/useBackofficeData';
import { useTextbooksGrouped, useLastProgressBefore, useProgressByDate } from '../../../hooks/backoffice/useProgress';
import { parsePages, extractPageRange, formatHomeworkDescription } from '../../../utils/progressUtils';
import type { TestType, StudentScore, TestRecord } from '../../../types/test';
import type { PageRange } from '../../../types/textbook';

interface LastProgress {
  date: string; // "12/9 (월)"
  topic: string; // "이차방정식 풀이"
  textbook: string; // "베이직쎈"
  pages: string; // "p.42-45"
  homework?: string; // 교재명만 (homework.title)
  homeworkDescription?: string; // 교재명 + 페이지 (homework.description)
  homeworkStatus?: string; // "제출 6/8"
  notes?: string; // 메모 (Phase 317)
}

/** 선택일에 기록된 진도 (Phase 317) */
interface TodayProgress {
  textbook: string;
  pages: string;
  homework?: string;
  homeworkDescription?: string;
  notes?: string;
}

interface ProgressFormData {
  topic: string;
  textbook: string;
  startPage: string;
  endPage: string;
  homeworkTextbook: string;
  homeworkStartPage: string;
  homeworkEndPage: string;
  notes: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: {
    id?: string;
    name: string;
    subject?: string;
    studentCount?: number;
    startTime?: string;
  };
  /** 학생 목록 (시험 점수 입력용) */
  students?: Array<{ id: string; name: string }>;
  /**
   * @deprecated Stage 48: 모달 내부에서 훅으로 직접 조회
   * 호환성을 위해 유지하나 무시됨
   */
  lastProgress?: LastProgress;
  /**
   * @deprecated Stage 48: 모달 내부에서 훅으로 직접 조회
   * 호환성을 위해 유지하나 무시됨
   */
  todayProgress?: TodayProgress;
  onSave: (data: ProgressFormData) => void;
  /** 시험 저장 콜백 */
  onSaveTest?: (testData: Omit<TestRecord, 'id' | 'createdAt'>) => void;
  /** 교재 목록 (자동완성용) */
  textbooks?: string[];
  /** 선택된 날짜 (Phase 310-B) - Stage 48: 필수로 변경 */
  selectedDate: Date;
  /** 모달 스타일: "bottom" (모바일), "center" (PC) - Stage 19 */
  variant?: 'bottom' | 'center';
}

export function ProgressModal({
  isOpen,
  onClose,
  classInfo,
  students = [],
  lastProgress: _lastProgressProp,  // deprecated, 무시됨
  todayProgress: _todayProgressProp, // deprecated, 무시됨
  onSave,
  onSaveTest,
  textbooks = [],
  selectedDate,
  variant = 'bottom',
}: ProgressModalProps) {
  // Stage 48: 모달 내부에서 직접 진도 데이터 조회 (stale data 방지)
  // Stage 59: UTC → Local 시간 기준 날짜 사용 (타임존 버그 수정)
  const classId = classInfo.id || null;
  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  // Stage 59d: 디버그 로그
  console.log('[ProgressModal] Render:', { classId, dateStr, isOpen });

  // 선택일 이전 진도 (지난 수업용) + 선택일 당일 진도
  const { data: lastProgressData, isLoading: isLoadingLast, isFetching: isFetchingLast } = useLastProgressBefore(classId, dateStr);
  const { data: todayProgressData, isLoading: isLoadingToday, isFetching: isFetchingToday } = useProgressByDate(classId, dateStr);

  // Stage 59d: 디버그 로그 - 조회된 데이터
  console.log('[ProgressModal] Data:', { lastProgressData, todayProgressData });

  // 로딩 상태 (isLoading: 초기 로딩, isFetching: classId 변경 후 refetch 중)
  const isDataLoading = isLoadingLast || isLoadingToday || isFetchingLast || isFetchingToday;

  // Stage 48: DB 데이터를 컴포넌트 내부 형식으로 변환
  const lastProgress: LastProgress | undefined = lastProgressData ? {
    date: new Date(lastProgressData.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }),
    topic: lastProgressData.topic || '',
    textbook: lastProgressData.textbook || '',
    pages: lastProgressData.pages || '',
    homework: lastProgressData.homework || '',
    homeworkDescription: lastProgressData.homeworkDescription || '',
    notes: lastProgressData.notes || '',
  } : undefined;

  const todayProgress: TodayProgress | undefined = todayProgressData ? {
    textbook: todayProgressData.textbook || '',
    pages: todayProgressData.pages || '',
    homework: todayProgressData.homework || '',
    homeworkDescription: todayProgressData.homeworkDescription || '',
    notes: todayProgressData.notes || '',
  } : undefined;

  // 진도 폼 상태 (Phase 314: 하드코딩 제거, useEffect에서 설정)
  const [formData, setFormData] = useState<ProgressFormData>({
    topic: '',
    textbook: '',
    startPage: '',
    endPage: '',
    homeworkTextbook: '',
    homeworkStartPage: '',
    homeworkEndPage: '',
    notes: '',
  });

  // Stage 59f: 모달 열릴 때 폼 초기화 (버그 수정)
  // 문제: 날짜 변경 후 모달 열면 이전 날짜 데이터가 폼에 남아있었음
  // 해결: isOpen 변경 시 무조건 폼 리셋 + 데이터 로딩 후 채우기
  const prevClassIdRef = useRef<string | null>(null);
  const prevDateStrRef = useRef<string | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);
  const [formInitialized, setFormInitialized] = useState(false);

  useEffect(() => {
    // 모달이 열릴 때 또는 classId/dateStr이 변경되었을 때 폼 리셋
    const isNewOpen = isOpen && !prevIsOpenRef.current;
    const isContextChanged = classId !== prevClassIdRef.current || dateStr !== prevDateStrRef.current;

    if (isNewOpen || (isOpen && isContextChanged)) {
      console.log('[ProgressModal] Form reset:', { isNewOpen, isContextChanged, classId, dateStr });
      setFormData({
        topic: '',
        textbook: '',
        startPage: '',
        endPage: '',
        homeworkTextbook: '',
        homeworkStartPage: '',
        homeworkEndPage: '',
        notes: '',
      });
      setFormInitialized(false); // 데이터 로딩 후 다시 초기화되도록
      prevClassIdRef.current = classId;
      prevDateStrRef.current = dateStr;
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, classId, dateStr]);

  // 시험 토글 상태
  const [testEnabled, setTestEnabled] = useState(false);
  const [testType, setTestType] = useState<TestType>('daily');
  const [testRange, setTestRange] = useState('');
  const [totalScore, setTotalScore] = useState(100);
  const [studentScores, setStudentScores] = useState<StudentScore[]>([]);

  // 학생 목록 초기화
  useEffect(() => {
    if (students.length > 0) {
      setStudentScores(
        students.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          score: null,
        }))
      );
    }
  }, [students]);

  // 모달이 닫힐 때 시험 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      setTestEnabled(false);
      setTestType('daily');
      setTestRange('');
      setTotalScore(100);
      setStudentScores(
        students.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          score: null,
        }))
      );
    }
  }, [isOpen, students]);

  // Phase 317 + Stage 59f: 데이터 로딩 완료 후 폼 채우기
  // formInitialized가 false일 때만 채움 (중복 채움 방지)
  useEffect(() => {
    // 데이터 로딩 중이거나 이미 초기화된 경우 스킵
    if (isDataLoading || formInitialized) return;

    console.log('[ProgressModal] Auto-fill check:', {
      formInitialized,
      hasTodayProgress: !!todayProgress,
      hasLastProgress: !!lastProgress,
      dateStr
    });

    if (todayProgress) {
      // 기존 기록이 있으면 해당 데이터로 폼 채우기
      const pageRange = extractPageRange(todayProgress.pages);
      console.log('[ProgressModal] Filling from todayProgress:', todayProgress);
      setFormData((prev) => ({
        ...prev,
        textbook: todayProgress.textbook || prev.textbook,
        startPage: pageRange?.start?.toString() || '',
        endPage: pageRange?.end?.toString() || '',
        homeworkTextbook: todayProgress.textbook || prev.homeworkTextbook,
        homeworkStartPage: '',
        homeworkEndPage: '',
        notes: todayProgress.notes || '',
      }));
      setFormInitialized(true);
    } else if (lastProgress) {
      // 기존 기록 없으면 지난 진도 기반으로 다음 페이지 자동 설정
      const pageRange = extractPageRange(lastProgress.pages);
      const nextStart = pageRange ? (pageRange.end + 1).toString() : '';
      const nextEnd = pageRange ? (pageRange.end + 5).toString() : '';

      console.log('[ProgressModal] Filling from lastProgress:', lastProgress);
      setFormData((prev) => ({
        ...prev,
        topic: lastProgress.topic || '',
        textbook: lastProgress.textbook || prev.textbook,
        startPage: nextStart || prev.startPage,
        endPage: nextEnd || prev.endPage,
        homeworkTextbook: lastProgress.textbook || prev.homeworkTextbook,
        homeworkStartPage: nextStart || prev.homeworkStartPage,
        homeworkEndPage: nextEnd || prev.homeworkEndPage,
      }));
      setFormInitialized(true);
    }
  }, [lastProgress, todayProgress, isDataLoading, formInitialized, dateStr]);

  const handleSave = () => {
    // 진도 저장
    onSave(formData);

    // 시험이 활성화되어 있고 점수가 입력되어 있으면 시험도 저장
    if (testEnabled && onSaveTest) {
      const hasAnyScore = studentScores.some((s) => s.score !== null);
      if (hasAnyScore) {
        onSaveTest({
          classId: classInfo.id || classInfo.name,
          className: classInfo.name,
          testType,
          date: new Date().toISOString().split('T')[0],
          range: testRange,
          totalScore,
          scores: studentScores,
        });
      }
    }

    onClose();
  };

  const updateField = (field: keyof ProgressFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScoreChange = (studentId: string, score: number | null) => {
    setStudentScores((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, score } : s))
    );
  };

  // Phase 310-B: 선택된 날짜 또는 오늘 날짜 사용
  const displayDate = selectedDate;
  const displayDateStr = displayDate.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const timeStr = classInfo.startTime || '17:00';

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${classInfo.name} 수업 기록`}
      subtitle={`${displayDateStr} ${timeStr}`}
      variant={variant}
    >
      {/* Stage 48: 데이터 로딩 중일 때 스피너 표시 */}
      {isDataLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#3182F6] animate-spin mb-3" />
          <p className="text-sm text-[#6B7684]">진도 정보 로딩 중...</p>
        </div>
      ) : (
        <>
      {/* 지난 수업 카드 */}
      {lastProgress && (
        <div className="bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl p-3.5 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-[#6B7684]">지난 수업</span>
            <span className="text-[11px] text-[#8B95A1]">
              {lastProgress.date}
            </span>
          </div>

          <div className="space-y-1.5">
            {/* 진도 (Phase 314) */}
            <div className="flex items-start gap-2 text-sm text-[#333D4B]">
              <span className="text-[#6B7684] flex-shrink-0 min-w-[32px]">진도:</span>
              <span>
                {lastProgress.textbook}
                {parsePages(lastProgress.pages, lastProgress.textbook) && (
                  <> {parsePages(lastProgress.pages, lastProgress.textbook)}</>
                )}
              </span>
            </div>
            {/* 숙제 (Phase 313 + Phase 316: description으로 페이지 표시) */}
            {(lastProgress.homeworkDescription || lastProgress.homework) && (
              <div className="flex items-start gap-2 text-sm text-[#333D4B]">
                <span className="text-[#6B7684] flex-shrink-0 min-w-[32px]">숙제:</span>
                <span>
                  {lastProgress.homeworkDescription
                    ? formatHomeworkDescription(lastProgress.homeworkDescription)
                    : lastProgress.homework}
                </span>
              </div>
            )}
            {/* 메모 (Phase 317) */}
            {lastProgress.notes && (
              <div className="flex items-start gap-2 text-sm text-[#333D4B]">
                <span className="text-[#6B7684] flex-shrink-0 min-w-[32px]">메모:</span>
                <span>{lastProgress.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 오늘 수업 (Phase 317: 항상 폼 표시, 기존 기록 있으면 미리 채움) */}
      <div className="bg-white border border-[#E5E8EB] rounded-xl p-3.5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-medium text-[#6B7684]">
            오늘 수업 {todayProgress && <span className="text-[#3182F6]">(수정)</span>}
          </span>
          <span className="text-[11px] text-[#8B95A1]">
            {displayDateStr.replace(' ', '')}
          </span>
        </div>

        {/* 단원명 */}
        <div className="mb-4">
          <label className="flex items-center gap-1 text-xs font-medium text-[#6B7684] mb-2">
            <BookIcon size={14} />
            <span>단원명</span>
          </label>
          <input
            type="text"
            value={formData.topic}
            onChange={(e) => updateField('topic', e.target.value)}
            placeholder="단원명 입력"
            className="w-full h-10 px-3 border border-[#E5E8EB] rounded-lg text-sm text-[#191F28] focus:outline-none focus:border-[#3182F6]"
          />
        </div>

        {/* 진도 */}
        <div className="mb-4">
          <label className="flex items-center gap-1 text-xs font-medium text-[#6B7684] mb-2">
            <FileText size={14} />
            <span>진도</span>
          </label>
          <ProgressRow
            classId={classInfo.id}
            textbook={formData.textbook}
            startPage={formData.startPage}
            endPage={formData.endPage}
            onTextbookChange={(v) => updateField('textbook', v)}
            onStartPageChange={(v) => updateField('startPage', v)}
            onEndPageChange={(v) => updateField('endPage', v)}
            textbooks={textbooks}
          />
        </div>

        {/* 숙제 */}
        <div className="mb-4">
          <label className="flex items-center gap-1 text-xs font-medium text-[#6B7684] mb-2">
            <NoteIcon size={14} />
            <span>숙제</span>
          </label>
          <ProgressRow
            classId={classInfo.id}
            textbook={formData.homeworkTextbook}
            startPage={formData.homeworkStartPage}
            endPage={formData.homeworkEndPage}
            onTextbookChange={(v) => updateField('homeworkTextbook', v)}
            onStartPageChange={(v) => updateField('homeworkStartPage', v)}
            onEndPageChange={(v) => updateField('homeworkEndPage', v)}
            textbooks={textbooks}
          />
        </div>

        {/* 비고 */}
        <div>
          <label className="flex items-center gap-1 text-xs font-medium text-[#6B7684] mb-2">
            <span className="text-[13px]">💬</span>
            <span>비고</span>
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="특이사항, 전달사항..."
            className="w-full min-h-[40px] max-h-24 px-3 py-2.5 border border-[#E5E8EB] rounded-lg text-sm text-[#191F28] resize-none focus:outline-none focus:border-[#3182F6]"
          />
        </div>
      </div>

      {/* 시험 섹션 (학생 목록이 있을 때만 표시) */}
      {students.length > 0 && (
        <div className="mb-4">
          <TestInputSection
            enabled={testEnabled}
            onToggle={setTestEnabled}
            testType={testType}
            onTestTypeChange={setTestType}
            range={testRange}
            onRangeChange={setTestRange}
            totalScore={totalScore}
            onTotalScoreChange={setTotalScore}
            students={studentScores}
            onScoreChange={handleScoreChange}
          />
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#F2F4F6]">
        <button
          onClick={handleSave}
          className="w-full h-12 bg-[#3182F6] text-white rounded-xl text-base font-semibold hover:bg-[#1B64DA] transition-colors"
        >
          저장하기
        </button>
      </div>
        </>
      )}
    </BottomSheet>
  );
}

/**
 * ProgressRow - 진도/숙제 입력 행 (교재 자동완성 + 페이지 + PDF 버튼)
 * Stage 18: PDF 교재 뷰어 통합
 */
interface ProgressRowProps {
  /** 반 ID (PDF 교재 조회용) */
  classId?: string;
  textbook: string;
  startPage: string;
  endPage: string;
  onTextbookChange: (v: string) => void;
  onStartPageChange: (v: string) => void;
  onEndPageChange: (v: string) => void;
  textbooks?: string[];
}

function ProgressRow({
  classId,
  textbook,
  startPage,
  endPage,
  onTextbookChange,
  onStartPageChange,
  onEndPageChange,
  textbooks = [],
}: ProgressRowProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // 반별 PDF 교재 목록 조회
  const { data: pdfTextbooks = [] } = useTextbooksByClass(classId || null);

  // Stage 40: 그룹핑된 교재 목록 조회
  const { data: groupedTextbooks } = useTextbooksGrouped(classId);

  // 마지막 진도 조회 (지난 수업 표시용)
  const { data: lastProgressData } = useLastProgress(classId || null);

  // 현재 교재와 일치하는 마지막 진도 계산
  const lastTextbookProgress = useMemo(() => {
    if (!lastProgressData || !textbook) return undefined;

    // 교재명이 일치하는지 확인
    const isMatch =
      lastProgressData.textbook === textbook ||
      lastProgressData.textbook?.includes(textbook) ||
      textbook.includes(lastProgressData.textbook || '');

    if (!isMatch) return undefined;

    // start_page, end_page가 있으면 사용
    if (lastProgressData.start_page && lastProgressData.end_page) {
      return {
        startPage: lastProgressData.start_page,
        endPage: lastProgressData.end_page,
        date: lastProgressData.date,
      };
    }

    return undefined;
  }, [lastProgressData, textbook]);

  // 현재 선택된 교재의 PDF 정보 찾기
  const currentPdf = pdfTextbooks.find(
    (t) => t.displayName === textbook || t.fileName.includes(textbook)
  );

  // PDF에서 페이지 범위 선택 완료 시
  const handlePageRangeSelect = (range: PageRange) => {
    onStartPageChange(range.startPage.toString());
    onEndPageChange(range.endPage.toString());
    setShowPdfViewer(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 교재 검색 자동완성 + PDF 버튼 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <TextbookAutocomplete
            value={textbook}
            onChange={onTextbookChange}
            textbooks={groupedTextbooks?.all || textbooks}
            groupedTextbooks={groupedTextbooks ? {
              linked: groupedTextbooks.linked,
              recent: groupedTextbooks.recent,
            } : undefined}
            placeholder="교재 검색..."
          />
        </div>

        {/* PDF 열기 버튼 (PDF가 있을 때만 표시) */}
        {currentPdf && (
          <button
            type="button"
            onClick={() => setShowPdfViewer(true)}
            className="flex items-center gap-1 px-3 h-10 bg-[#EBF4FF] text-[#3182F6] rounded-lg hover:bg-[#D4E8FF] transition-colors flex-shrink-0"
            title="PDF에서 페이지 선택"
          >
            <FileText className="w-4 h-4" />
            <span className="text-xs font-semibold">PDF</span>
          </button>
        )}
      </div>

      {/* 페이지 입력 행 */}
      <div className="flex items-center gap-2">
        {/* p. 라벨 */}
        <span className="text-sm text-[#6B7684] flex-shrink-0">p.</span>

        {/* 시작 페이지 */}
        <input
          type="text"
          value={startPage}
          onChange={(e) => onStartPageChange(e.target.value)}
          placeholder="시작"
          className="w-[60px] h-10 text-center border border-[#E5E8EB] rounded-lg text-sm font-semibold text-[#191F28] focus:outline-none focus:border-[#3182F6] flex-shrink-0"
        />

        {/* ~ */}
        <span className="text-sm text-[#8B95A1] flex-shrink-0">~</span>

        {/* 끝 페이지 */}
        <input
          type="text"
          value={endPage}
          onChange={(e) => onEndPageChange(e.target.value)}
          placeholder="끝"
          className="w-[60px] h-10 text-center border border-[#E5E8EB] rounded-lg text-sm font-semibold text-[#191F28] focus:outline-none focus:border-[#3182F6] flex-shrink-0"
        />
      </div>

      {/* PDF 뷰어 모달 */}
      {currentPdf && (
        <PdfViewerModal
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          fileUrl={currentPdf.fileUrl}
          textbookName={currentPdf.displayName}
          onSelectRange={handlePageRangeSelect}
          initialRange={
            startPage && endPage
              ? { startPage: parseInt(startPage), endPage: parseInt(endPage) }
              : undefined
          }
          lastProgress={lastTextbookProgress}
        />
      )}
    </div>
  );
}
