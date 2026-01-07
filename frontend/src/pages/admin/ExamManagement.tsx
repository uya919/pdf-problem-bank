/**
 * 시험 관리 메인 페이지
 * - 목록 → 상세 → 성적입력 → 분석 → 반배정 플로우 관리
 */
import { useState, useCallback } from 'react';
import { AdminLayout } from '../../components/admin/layout/AdminLayout';
import {
  ExamList,
  CreateExamModal,
  ScoreInputView,
  ExamAnalysisView,
  ClassAssignmentView,
} from '../../components/admin/exam';
import type { Exam } from '../../types/exam';

type ViewMode = 'list' | 'score_input' | 'analysis' | 'class_assignment';

export default function ExamManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 시험 선택 (상태에 따라 화면 결정)
  const handleExamClick = useCallback((exam: Exam) => {
    setSelectedExam(exam);

    switch (exam.status) {
      case 'draft':
      case 'scoring':
        setViewMode('score_input');
        break;
      case 'completed':
        setViewMode('analysis');
        break;
      default:
        setViewMode('score_input');
    }
  }, []);

  // 시험 생성 성공
  const handleCreateSuccess = useCallback((exam: Exam) => {
    setIsCreateModalOpen(false);
    setSelectedExam(exam);
    setViewMode('score_input');
  }, []);

  // 목록으로 돌아가기
  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedExam(null);
  }, []);

  // 성적 입력 완료 → 분석 화면
  const handleScoreComplete = useCallback(() => {
    setViewMode('analysis');
  }, []);

  // 분석 → 반배정
  const handleGoToAssignment = useCallback(() => {
    setViewMode('class_assignment');
  }, []);

  // 반배정 완료
  const handleAssignmentComplete = useCallback(() => {
    setViewMode('list');
    setSelectedExam(null);
  }, []);

  const renderContent = () => {
    switch (viewMode) {
      case 'score_input':
        return selectedExam ? (
          <ScoreInputView
            examId={selectedExam.id}
            onBack={handleBackToList}
            onComplete={handleScoreComplete}
          />
        ) : null;

      case 'analysis':
        return selectedExam ? (
          <ExamAnalysisView
            examId={selectedExam.id}
            onBack={handleBackToList}
            onAssign={handleGoToAssignment}
          />
        ) : null;

      case 'class_assignment':
        return selectedExam ? (
          <ClassAssignmentView
            examId={selectedExam.id}
            onBack={() => setViewMode('analysis')}
            onComplete={handleAssignmentComplete}
          />
        ) : null;

      case 'list':
      default:
        return (
          <ExamList
            onCreateClick={() => setIsCreateModalOpen(true)}
            onExamClick={handleExamClick}
          />
        );
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {renderContent()}
      </div>

      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </AdminLayout>
  );
}
