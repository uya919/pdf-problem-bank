/**
 * 시험지 미리보기 모달
 *
 * Phase 21+ D-3: 시험지 미리보기 UI
 * Phase F-1: useBulkProblems 훅으로 문제 데이터 자동 로드
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Eye,
  Printer,
  Loader2,
  ZoomIn,
  ZoomOut,
  Download,
} from 'lucide-react';
import type { ExamPaper, ExamPaperSettings } from '../../types/examPaper';
import type { Problem } from '../../types/problem';
import { useBulkProblems } from '../../api/problems';

const API_BASE = 'http://localhost:8000';

interface ExamPreviewModalProps {
  open: boolean;
  exam: ExamPaper;
  onClose: () => void;
  onExport?: (format: 'pdf' | 'print') => void;
}

// 미리보기 렌더링을 위한 스타일
const getPreviewStyles = (settings: ExamPaperSettings) => {
  const fontSizes = {
    small: { title: '18px', subtitle: '14px', body: '11px', problemNum: '12px' },
    medium: { title: '22px', subtitle: '16px', body: '13px', problemNum: '14px' },
    large: { title: '26px', subtitle: '18px', body: '15px', problemNum: '16px' },
  };

  return fontSizes[settings.fontSize];
};

export function ExamPreviewModal({
  open,
  exam,
  onClose,
  onExport,
}: ExamPreviewModalProps) {
  const [zoom, setZoom] = useState(100);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Phase F-1: 시험지에 포함된 모든 문제 ID 추출
  const problemIds = useMemo(() => {
    const ids: string[] = [];
    for (const section of exam.sections) {
      for (const item of section.problems) {
        ids.push(item.problemId);
      }
    }
    return ids;
  }, [exam.sections]);

  // Phase F-1: 문제 일괄 조회
  const { data: problemsData, isLoading: isLoadingProblems } = useBulkProblems(problemIds, open);

  // 조회된 문제를 Map으로 변환
  const problems = useMemo(() => {
    const map = new Map<string, Problem>();
    if (problemsData) {
      for (const problem of problemsData) {
        map.set(problem.id, problem);
      }
    }
    return map;
  }, [problemsData]);

  const styles = useMemo(() => getPreviewStyles(exam.settings), [exam.settings]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  const handlePrint = () => {
    window.print();
  };

  // Phase E-1: PDF 다운로드
  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const url = `${API_BASE}/api/exams/${exam.id}/export/pdf?include_answer_key=${showAnswerKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('PDF 생성 실패');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${exam.name.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert('PDF 다운로드에 실패했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-grey-900/95">
      {/* 로딩 오버레이 */}
      {isLoadingProblems && (
        <div className="absolute inset-0 bg-grey-900/50 flex items-center justify-center z-10">
          <div className="bg-grey-800 rounded-xl p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="text-grey-300 text-sm">문제 불러오는 중...</span>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex-shrink-0 h-14 bg-grey-800 border-b border-grey-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-grey-700 rounded-lg text-grey-300">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5" />
            <span className="font-medium">미리보기</span>
            <span className="text-grey-400">- {exam.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 정답지 토글 */}
          {exam.settings.generateAnswerKey && (
            <button
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showAnswerKey
                  ? 'bg-green-600 text-white'
                  : 'bg-grey-700 text-grey-300 hover:bg-grey-600'
              }`}
            >
              {showAnswerKey ? '정답지' : '문제지'}
            </button>
          )}

          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 bg-grey-700 rounded-lg px-2">
            <button onClick={handleZoomOut} className="p-1.5 hover:bg-grey-600 rounded">
              <ZoomOut className="w-4 h-4 text-grey-300" />
            </button>
            <span className="text-grey-300 text-sm w-12 text-center">{zoom}%</span>
            <button onClick={handleZoomIn} className="p-1.5 hover:bg-grey-600 rounded">
              <ZoomIn className="w-4 h-4 text-grey-300" />
            </button>
          </div>

          {/* 내보내기 버튼들 */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 bg-grey-700 text-grey-300
              hover:bg-grey-600 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>

          {/* Phase E-1: PDF 다운로드 버튼 */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white
              hover:bg-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed
              rounded-lg text-sm font-medium"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'PDF 생성 중...' : 'PDF 다운로드'}
          </button>
        </div>
      </div>

      {/* 미리보기 영역 */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div
          className="bg-white shadow-2xl transition-transform origin-top"
          style={{
            width: exam.settings.paperSize === 'A4' ? '210mm' : exam.settings.paperSize === 'B4' ? '250mm' : '216mm',
            minHeight: exam.settings.orientation === 'portrait' ? '297mm' : '210mm',
            transform: `scale(${zoom / 100})`,
            padding: '20mm',
          }}
        >
          {/* 헤더 영역 */}
          {exam.settings.showHeader && (
            <div className="border-b-2 border-grey-800 pb-4 mb-6">
              {/* 기관명 */}
              {exam.settings.institution && (
                <div className="text-center text-grey-600 text-sm mb-1">
                  {exam.settings.institution}
                </div>
              )}

              {/* 시험 제목 */}
              <h1
                className="text-center font-bold text-grey-900"
                style={{ fontSize: styles.title }}
              >
                {exam.settings.title}
                {showAnswerKey && ' (정답지)'}
              </h1>

              {/* 부제목 */}
              {exam.settings.subtitle && (
                <div
                  className="text-center text-grey-700 mt-1"
                  style={{ fontSize: styles.subtitle }}
                >
                  {exam.settings.subtitle}
                </div>
              )}

              {/* 정보 행 */}
              <div className="flex items-center justify-between mt-4 text-sm text-grey-600">
                <div className="flex items-center gap-4">
                  {exam.settings.subject && <span>과목: {exam.settings.subject}</span>}
                  {exam.settings.grade && <span>학년: {exam.settings.grade}</span>}
                </div>
                <div className="flex items-center gap-4">
                  {exam.settings.date && <span>날짜: {exam.settings.date}</span>}
                  {exam.settings.duration && <span>시간: {exam.settings.duration}분</span>}
                  {exam.settings.showTotalPoints && <span>총점: {exam.totalPoints}점</span>}
                </div>
              </div>

              {/* 이름/반 */}
              <div className="flex items-center gap-8 mt-4 pt-3 border-t border-grey-300">
                <div className="flex items-center gap-2">
                  <span className="text-sm">반:</span>
                  <div className="w-20 border-b border-grey-400"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">번호:</span>
                  <div className="w-16 border-b border-grey-400"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">이름:</span>
                  <div className="w-32 border-b border-grey-400"></div>
                </div>
              </div>
            </div>
          )}

          {/* 문제 영역 */}
          <div
            className={exam.settings.columns === 2 ? 'columns-2 gap-8' : ''}
            style={{ fontSize: styles.body }}
          >
            {exam.sections.map((section, sectionIndex) => (
              <div key={section.id} className="mb-6 break-inside-avoid-column">
                {/* 섹션 제목 */}
                {exam.sections.length > 1 && (
                  <div className="font-bold text-grey-800 mb-3 pb-1 border-b border-grey-300">
                    {section.title}
                    {section.description && (
                      <span className="font-normal text-grey-600 ml-2 text-sm">
                        {section.description}
                      </span>
                    )}
                  </div>
                )}

                {/* 문제들 */}
                <div className="space-y-4">
                  {section.problems.map((problemItem, problemIndex) => {
                    const problem = problems.get(problemItem.problemId);
                    const globalNumber =
                      exam.sections.slice(0, sectionIndex).reduce((sum, s) => sum + s.problems.length, 0) +
                      problemIndex +
                      1;

                    return (
                      <div key={problemItem.id} className="break-inside-avoid">
                        {/* 문제 번호 및 배점 */}
                        <div className="flex items-start gap-2 mb-2">
                          <span
                            className="font-bold text-grey-900"
                            style={{ fontSize: styles.problemNum }}
                          >
                            {problemItem.customNumber || globalNumber}.
                          </span>
                          {exam.settings.showPoints && (
                            <span className="text-xs text-grey-500 mt-0.5">
                              [{problemItem.points}점]
                            </span>
                          )}
                        </div>

                        {/* 문제 이미지 */}
                        {problem && (
                          <div className="ml-6">
                            {showAnswerKey ? (
                              // 정답지 모드
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="text-sm text-green-800">
                                  <strong>정답:</strong>{' '}
                                  {problem.content.answer || '(정답 미입력)'}
                                </div>
                                {problem.content.solution && (
                                  <div className="mt-2 text-sm text-grey-700">
                                    <strong>해설:</strong> {problem.content.solution}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // 문제지 모드
                              <>
                                <img
                                  src={
                                    problem.content.imageUrl.startsWith('http')
                                      ? problem.content.imageUrl
                                      : `${API_BASE}${problem.content.imageUrl}`
                                  }
                                  alt={`문제 ${globalNumber}`}
                                  className="max-w-full"
                                  style={{ maxHeight: '200px', objectFit: 'contain' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />

                                {/* 답안 작성란 */}
                                {exam.settings.showAnswerSpace && (
                                  <div className="mt-3 border border-grey-300 rounded p-2">
                                    <div className="text-xs text-grey-500 mb-1">답:</div>
                                    {Array.from({ length: exam.settings.answerSpaceLines }).map(
                                      (_, i) => (
                                        <div
                                          key={i}
                                          className="h-6 border-b border-grey-200 last:border-0"
                                        />
                                      )
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* 문제를 찾을 수 없는 경우 */}
                        {!problem && (
                          <div className="ml-6 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                            문제를 찾을 수 없습니다 (ID: {problemItem.problemId})
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 푸터 */}
          {exam.settings.showFooter && (
            <div className="mt-8 pt-4 border-t border-grey-300 text-center text-xs text-grey-500">
              {exam.settings.showPageNumbers && <span>- 1 -</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExamPreviewModal;
