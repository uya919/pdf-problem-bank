/**
 * 성적 입력 화면
 * - 좌측: 학생 목록 (입력 상태 표시)
 * - 우측: 선택된 학생의 O/X 그리드
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useExamDetail, useSaveAnswers } from '../../../hooks/useExams';
import type { AnswerStatus, StudentAnswer } from '../../../types/exam';

interface ScoreInputViewProps {
  examId: string;
  onBack: () => void;
  onComplete?: () => void;
}

export function ScoreInputView({ examId, onBack, onComplete }: ScoreInputViewProps) {
  const { data: examDetail, isLoading } = useExamDetail(examId);
  const saveAnswers = useSaveAnswers();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<AnswerStatus[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 첫 번째 학생 자동 선택
  useEffect(() => {
    if (examDetail?.answers && examDetail.answers.length > 0 && !selectedStudentId) {
      const firstStudent = examDetail.answers[0];
      setSelectedStudentId(firstStudent.student_id);
      setCurrentAnswers([...firstStudent.answers]);
    }
  }, [examDetail, selectedStudentId]);

  // 학생 선택 시 답안 로드
  const handleSelectStudent = useCallback((studentId: string) => {
    // 변경사항 있으면 저장
    if (hasChanges && selectedStudentId && examDetail) {
      saveAnswers.mutate({
        examId,
        studentId: selectedStudentId,
        answers: currentAnswers,
      });
    }

    const student = examDetail?.answers.find(a => a.student_id === studentId);
    if (student) {
      setSelectedStudentId(studentId);
      setCurrentAnswers([...student.answers]);
      setHasChanges(false);
    }
  }, [hasChanges, selectedStudentId, examId, currentAnswers, examDetail, saveAnswers]);

  // O/X 토글
  const toggleAnswer = useCallback((index: number) => {
    setCurrentAnswers(prev => {
      const newAnswers = [...prev];
      const current = newAnswers[index];
      if (current === 'none' || current === 'wrong') {
        newAnswers[index] = 'correct';
      } else {
        newAnswers[index] = 'wrong';
      }
      return newAnswers;
    });
    setHasChanges(true);
  }, []);

  // 전체 O
  const setAllCorrect = useCallback(() => {
    setCurrentAnswers(prev => prev.map(() => 'correct'));
    setHasChanges(true);
  }, []);

  // 전체 X
  const setAllWrong = useCallback(() => {
    setCurrentAnswers(prev => prev.map(() => 'wrong'));
    setHasChanges(true);
  }, []);

  // 초기화
  const resetAll = useCallback(() => {
    setCurrentAnswers(prev => prev.map(() => 'none'));
    setHasChanges(true);
  }, []);

  // 저장
  const handleSave = useCallback(async () => {
    if (!selectedStudentId) return;
    await saveAnswers.mutateAsync({
      examId,
      studentId: selectedStudentId,
      answers: currentAnswers,
    });
    setHasChanges(false);
  }, [selectedStudentId, examId, currentAnswers, saveAnswers]);

  // 이전/다음 학생
  const navigateStudent = useCallback((direction: 'prev' | 'next') => {
    if (!examDetail?.answers || !selectedStudentId) return;

    const currentIndex = examDetail.answers.findIndex(a => a.student_id === selectedStudentId);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < examDetail.answers.length) {
      handleSelectStudent(examDetail.answers[newIndex].student_id);
    }
  }, [examDetail, selectedStudentId, handleSelectStudent]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      if (key === 'O' || key === 'X') {
        // 미입력 상태인 첫 번째 문항에 입력
        const noneIndex = currentAnswers.findIndex(a => a === 'none');
        if (noneIndex >= 0) {
          setCurrentAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[noneIndex] = key === 'O' ? 'correct' : 'wrong';
            return newAnswers;
          });
          setHasChanges(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentAnswers]);

  if (isLoading || !examDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { exam, answers } = examDetail;
  const selectedStudent = answers.find(a => a.student_id === selectedStudentId);

  // 점수 계산
  const correctCount = currentAnswers.filter(a => a === 'correct').length;
  const wrongCount = currentAnswers.filter(a => a === 'wrong').length;
  const noneCount = currentAnswers.filter(a => a === 'none').length;
  const score = Math.round((correctCount / exam.total_questions) * 100);
  const wrongQuestions = currentAnswers
    .map((a, i) => a === 'wrong' ? i + 1 : null)
    .filter((q): q is number => q !== null);

  // 진행률
  const completedCount = answers.filter(a => !a.answers.includes('none')).length;
  const progress = Math.round((completedCount / answers.length) * 100);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-grey-500 hover:text-grey-700 hover:bg-grey-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-grey-900">{exam.name}</h1>
            <p className="text-sm text-grey-500">성적 입력</p>
          </div>
        </div>

        {/* 진행률 */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-grey-500">입력 진행률</div>
            <div className="text-lg font-semibold text-blue-600">{completedCount}/{answers.length}명 ({progress}%)</div>
          </div>
          {progress === 100 && onComplete && (
            <button
              onClick={onComplete}
              className="px-4 py-2.5 bg-green-500 text-white text-sm font-medium rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              결과 확인
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 좌측: 학생 목록 */}
        <div className="col-span-4 bg-white rounded-2xl border border-grey-200 p-4">
          <h3 className="text-sm font-semibold text-grey-900 mb-3">학생 목록</h3>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {answers.map((student) => {
              const isSelected = student.student_id === selectedStudentId;
              const isCompleted = !student.answers.includes('none');

              return (
                <button
                  key={student.student_id}
                  onClick={() => handleSelectStudent(student.student_id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors
                    ${isSelected
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-grey-50 text-grey-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : 'bg-grey-100 text-grey-400'
                    }`}>
                      {isCompleted ? '✓' : '○'}
                    </span>
                    <span className="font-medium">{student.student_name}</span>
                  </div>
                  <span className={isCompleted ? 'font-semibold text-blue-600' : 'text-grey-400'}>
                    {isCompleted ? `${student.total_score}점` : '-'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 우측: O/X 입력 */}
        <div className="col-span-8 bg-white rounded-2xl border border-grey-200 p-5">
          {selectedStudent ? (
            <>
              {/* 학생 정보 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-grey-900">
                    {selectedStudent.student_name} 정오 입력
                  </h3>
                  <p className="text-sm text-grey-500">O/X 버튼을 클릭하거나 키보드 O, X로 입력</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {score}<span className="text-base font-normal text-grey-400">/100점</span>
                  </div>
                  <div className="text-xs text-grey-500">
                    정답 {correctCount}개 / 오답 {wrongCount}개
                  </div>
                </div>
              </div>

              {/* O/X 그리드 */}
              <div className="mb-4 p-4 bg-grey-50 rounded-xl">
                {/* 빠른 입력 버튼 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-grey-700">빠른 입력</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={setAllCorrect}
                      className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                    >
                      전체 O
                    </button>
                    <button
                      onClick={setAllWrong}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      전체 X
                    </button>
                    <button
                      onClick={resetAll}
                      className="px-3 py-1.5 text-xs font-medium text-grey-600 bg-grey-200 hover:bg-grey-300 rounded-lg transition-colors"
                    >
                      초기화
                    </button>
                  </div>
                </div>

                {/* O/X 버튼 그리드 */}
                <div className="grid grid-cols-10 gap-2">
                  {currentAnswers.map((answer, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-grey-500 mb-1">{index + 1}</div>
                      <button
                        onClick={() => toggleAnswer(index)}
                        className={`
                          w-10 h-10 rounded-lg font-bold text-lg transition-colors
                          ${answer === 'correct'
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : answer === 'wrong'
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-grey-100 text-grey-400 hover:bg-grey-200'
                          }
                        `}
                      >
                        {answer === 'correct' ? 'O' : answer === 'wrong' ? 'X' : '-'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 요약 정보 */}
              <div className="flex items-center gap-6 p-4 bg-grey-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center font-bold">O</span>
                  <span className="text-sm text-grey-700">
                    정답 <strong className="text-green-600">{correctCount}</strong>개
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center font-bold">X</span>
                  <span className="text-sm text-grey-700">
                    오답 <strong className="text-red-600">{wrongCount}</strong>개
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-grey-300 text-grey-500 rounded-lg flex items-center justify-center font-bold">-</span>
                  <span className="text-sm text-grey-700">
                    미입력 <strong className="text-grey-500">{noneCount}</strong>개
                  </span>
                </div>
                <div className="ml-auto text-sm text-grey-500">
                  오답 문항: <span className="font-medium text-red-600">
                    {wrongQuestions.length > 0 ? wrongQuestions.join(', ') : '-'}
                  </span>
                </div>
              </div>

              {/* 하단 네비게이션 */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-grey-100">
                <button
                  onClick={() => navigateStudent('prev')}
                  disabled={answers.findIndex(a => a.student_id === selectedStudentId) === 0}
                  className="px-4 py-2 text-sm font-medium text-grey-600 hover:bg-grey-100 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전 학생
                </button>

                {hasChanges && (
                  <button
                    onClick={handleSave}
                    disabled={saveAnswers.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saveAnswers.isPending ? '저장 중...' : '저장'}
                  </button>
                )}

                <button
                  onClick={() => navigateStudent('next')}
                  disabled={answers.findIndex(a => a.student_id === selectedStudentId) === answers.length - 1}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음 학생
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-grey-500">
              학생을 선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
