/**
 * PromotionModal - 학년 승급 모달
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, X, ChevronUp, AlertTriangle, Check } from 'lucide-react';
import { useClasses } from '../../../../hooks/useClasses';
import type { PromotionStep, UnassignedStudent } from '../types';
import type {
  PromotionPreviewResponseV2,
  PromotionExecuteResponseV2,
  BatchAssignRequest,
  BatchAssignResponse,
} from '../../../../api/gradePromotion';
import type { UseMutationResult } from '@tanstack/react-query';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionStep: PromotionStep;
  setPromotionStep: (step: PromotionStep) => void;
  preview: PromotionPreviewResponseV2 | undefined;
  previewLoading: boolean;
  executePromotion: UseMutationResult<PromotionExecuteResponseV2, Error, void, unknown>;
  batchAssign: UseMutationResult<BatchAssignResponse, Error, BatchAssignRequest, unknown>;
  fetchPreview: () => void;
}

export function PromotionModal({
  isOpen,
  onClose,
  promotionStep,
  setPromotionStep,
  preview,
  previewLoading,
  executePromotion,
  batchAssign,
  fetchPreview,
}: PromotionModalProps) {
  const navigate = useNavigate();

  // assign step 관련 상태
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = React.useState<Set<string>>(new Set());
  const [assignGradeFilter, setAssignGradeFilter] = React.useState<string | null>(null);
  const [targetClassId, setTargetClassId] = React.useState<string | null>(null);

  // 미배정 학생 추출
  const unassignedStudents: UnassignedStudent[] = useMemo(() => {
    if (!preview?.students) return [];

    return preview.students
      .flatMap(student =>
        student.class_promotions
          .filter(cp => cp.status === 'unassigned')
          .map(cp => ({
            studentId: student.id,
            studentName: student.name,
            enrollmentId: cp.enrollment_id,
            previousClassName: cp.current_class_name,
            newGrade: student.next_grade || '',
            reason: cp.reason || ''
          }))
      );
  }, [preview]);

  // 학년별 그룹화
  const unassignedByGrade = useMemo(() => {
    return unassignedStudents.reduce((acc, student) => {
      const grade = student.newGrade;
      if (!grade) return acc;
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(student);
      return acc;
    }, {} as Record<string, UnassignedStudent[]>);
  }, [unassignedStudents]);

  // 필터된 학생 목록
  const filteredUnassignedStudents = useMemo(() => {
    if (!assignGradeFilter) return unassignedStudents;
    return unassignedStudents.filter(s => s.newGrade === assignGradeFilter);
  }, [unassignedStudents, assignGradeFilter]);

  // 반 목록 조회
  const selectedGradeForClasses = assignGradeFilter || (Object.keys(unassignedByGrade)[0] ?? null);
  const { data: classesForGrade } = useClasses({ is_active: true });

  // 선택된 학년에 해당하는 반만 필터링
  const filteredClassesForGrade = useMemo(() => {
    if (!classesForGrade || !selectedGradeForClasses) return [];
    return classesForGrade.filter(cls => cls.name.startsWith(selectedGradeForClasses));
  }, [classesForGrade, selectedGradeForClasses]);

  // 승급 실행
  const handleExecutePromotion = async () => {
    try {
      await executePromotion.mutateAsync();
      setPromotionStep('result');
    } catch (error) {
      console.error('학년 승급 실패:', error);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    onClose();
    setSelectedEnrollmentIds(new Set());
    setAssignGradeFilter(null);
    setTargetClassId(null);
  };

  // 일괄 배정 실행
  const handleQuickAssign = async () => {
    if (!targetClassId || selectedEnrollmentIds.size === 0) return;

    try {
      await batchAssign.mutateAsync({
        enrollment_ids: Array.from(selectedEnrollmentIds),
        new_class_id: targetClassId
      });

      setSelectedEnrollmentIds(new Set());
      setTargetClassId(null);
      await fetchPreview();
    } catch (error) {
      console.error('배정 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* 모달 헤더 */}
        <div className="px-6 py-4 border-b border-grey-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-bold text-grey-900">학년 일괄 승급</h2>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Preview Step */}
          {promotionStep === 'preview' && (
            <PreviewStep
              preview={preview}
              previewLoading={previewLoading}
            />
          )}

          {/* Confirm Step */}
          {promotionStep === 'confirm' && (
            <ConfirmStep
              preview={preview}
              executePromotion={executePromotion}
              onBack={() => setPromotionStep('preview')}
              onExecute={handleExecutePromotion}
            />
          )}

          {/* Result Step */}
          {promotionStep === 'result' && (
            <ResultStep
              executePromotion={executePromotion}
              onAssign={() => setPromotionStep('assign')}
              onNavigate={() => {
                handleCloseModal();
                navigate('/admin/class-assignment');
              }}
            />
          )}

          {/* Assign Step */}
          {promotionStep === 'assign' && (
            <AssignStep
              unassignedStudents={unassignedStudents}
              unassignedByGrade={unassignedByGrade}
              filteredUnassignedStudents={filteredUnassignedStudents}
              selectedEnrollmentIds={selectedEnrollmentIds}
              setSelectedEnrollmentIds={setSelectedEnrollmentIds}
              assignGradeFilter={assignGradeFilter}
              setAssignGradeFilter={setAssignGradeFilter}
              targetClassId={targetClassId}
              setTargetClassId={setTargetClassId}
              filteredClassesForGrade={filteredClassesForGrade}
              batchAssign={batchAssign}
              onBack={() => setPromotionStep('result')}
              onQuickAssign={handleQuickAssign}
            />
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-6 py-4 border-t border-grey-200 bg-grey-50">
          {promotionStep === 'preview' && (
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-grey-600 hover:text-grey-800 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => setPromotionStep('confirm')}
                disabled={!preview || preview.total_students === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronUp className="w-4 h-4" />
                다음 단계
              </button>
            </div>
          )}
          {(promotionStep === 'result' || promotionStep === 'assign') && (
            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                {promotionStep === 'result' ? '완료' : '닫기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Preview Step Component
function PreviewStep({
  preview,
  previewLoading,
}: {
  preview: PromotionModalProps['preview'];
  previewLoading: boolean;
}) {
  if (previewLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
        <div className="text-grey-500">미리보기 로딩 중...</div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="text-center py-8 text-grey-500">
        미리보기를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 학년 승급 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{preview.to_promote}</div>
          <div className="text-sm text-grey-600">승급 예정</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{preview.to_graduate}</div>
          <div className="text-sm text-grey-600">졸업 예정 (고3)</div>
        </div>
        <div className="bg-grey-100 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-grey-500">{preview.inactive_count}</div>
          <div className="text-sm text-grey-600">이미 비활성</div>
        </div>
      </div>

      {/* 반 승급 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{preview.class_auto_count}</div>
          <div className="text-sm text-grey-600">반 자동 이동</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
          <div className="text-2xl font-bold text-amber-600">{preview.class_unassigned_count}</div>
          <div className="text-sm text-grey-600">수동 배정 필요</div>
        </div>
      </div>

      {/* 학생 목록 */}
      <div className="border border-grey-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-grey-50 border-b border-grey-200">
          <div className="text-sm font-medium text-grey-700">변경 예정 학생 목록</div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-grey-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">이름</th>
                <th className="px-3 py-2 text-center text-grey-600 font-medium">학년</th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">현재 반</th>
                <th className="px-3 py-2 text-center text-grey-600 font-medium">→</th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">새 반</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {preview.students.map((student) => (
                <tr key={student.id} className="hover:bg-grey-50">
                  <td className="px-3 py-2.5 font-medium text-grey-900">
                    {student.name}
                    <div className="text-xs text-grey-500">
                      {student.current_grade} → {student.next_grade || '졸업'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {student.next_grade ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                        {student.next_grade}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                        졸업
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5" colSpan={3}>
                    {student.class_promotions.length > 0 ? (
                      <div className="space-y-1">
                        {student.class_promotions.map((cp) => (
                          <div key={cp.enrollment_id} className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-grey-100 text-grey-700 rounded truncate max-w-[120px]" title={cp.current_class_name}>
                              {cp.current_class_name}
                            </span>
                            <span className="text-grey-400">→</span>
                            {cp.status === 'auto' ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded truncate max-w-[120px] flex items-center gap-1" title={cp.new_class_name || ''}>
                                ✓ {cp.new_class_name}
                              </span>
                            ) : cp.status === 'graduated' ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                                🎓 졸업
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded flex items-center gap-1" title={cp.reason}>
                                ⚠️ 수동 배정
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-grey-400">등록된 반 없음</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Confirm Step Component
function ConfirmStep({
  preview,
  executePromotion,
  onBack,
  onExecute,
}: {
  preview: PromotionModalProps['preview'];
  executePromotion: PromotionModalProps['executePromotion'];
  onBack: () => void;
  onExecute: () => void;
}) {
  return (
    <div className="text-center py-8">
      <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-grey-900 mb-2">정말 실행하시겠습니까?</h3>
      <p className="text-grey-600 mb-4">
        롤백 기능이 있어 되돌릴 수 있습니다.
      </p>
      <div className="bg-grey-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-grey-600">학년 승급:</span>
            <span className="font-medium">{preview?.to_promote}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-600">졸업 처리:</span>
            <span className="font-medium">{preview?.to_graduate}명</span>
          </div>
          <div className="border-t border-grey-200 pt-2 mt-2">
            <div className="flex justify-between text-green-600">
              <span>반 자동 이동:</span>
              <span className="font-medium">{preview?.class_auto_count}개</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>수동 배정 필요:</span>
              <span className="font-medium">{preview?.class_unassigned_count}개</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-medium text-grey-600 bg-grey-100 hover:bg-grey-200 rounded-lg transition-colors"
        >
          뒤로
        </button>
        <button
          onClick={onExecute}
          disabled={executePromotion.isPending}
          className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {executePromotion.isPending ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              처리 중...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              승급 실행
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Result Step Component
function ResultStep({
  executePromotion,
  onAssign,
  onNavigate,
}: {
  executePromotion: PromotionModalProps['executePromotion'];
  onAssign: () => void;
  onNavigate: () => void;
}) {
  if (executePromotion.isError) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-grey-900 mb-2">오류 발생</h3>
        <p className="text-red-600 mb-4">
          {executePromotion.error?.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
      </div>
    );
  }

  if (!executePromotion.isSuccess) return null;

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-grey-900 mb-2">학년 승급 완료!</h3>
      <div className="bg-grey-50 rounded-xl p-4 mb-4 max-w-md mx-auto">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-grey-600">학년 승급:</span>
            <span className="font-medium text-blue-600">{executePromotion.data?.promoted_count}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-grey-600">졸업 처리:</span>
            <span className="font-medium text-purple-600">{executePromotion.data?.graduated_count}명</span>
          </div>
          <div className="border-t border-grey-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-grey-600">반 자동 이동:</span>
              <span className="font-medium text-green-600">{executePromotion.data?.class_auto_moved}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grey-600">수동 배정 필요:</span>
              <span className="font-medium text-amber-600">{executePromotion.data?.class_unassigned}개</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-grey-500 mb-4">
        '이력/롤백' 버튼에서 되돌릴 수 있습니다.
      </p>

      {(executePromotion.data?.class_unassigned ?? 0) > 0 && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left max-w-md mx-auto">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">
              {executePromotion.data?.class_unassigned}개 반 등록이 해제되었습니다
            </span>
          </div>
          <p className="text-xs text-amber-600 mb-3">
            번호 반(정규1, 정규2 등) 또는 매칭되는 반이 없는 학생들입니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onAssign}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              바로 배정하기
            </button>
            <button
              onClick={onNavigate}
              className="px-3 py-2 text-sm text-amber-700 hover:text-amber-800 hover:underline"
            >
              반 배정 페이지로 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Assign Step Component
function AssignStep({
  unassignedStudents,
  unassignedByGrade,
  filteredUnassignedStudents,
  selectedEnrollmentIds,
  setSelectedEnrollmentIds,
  assignGradeFilter,
  setAssignGradeFilter,
  targetClassId,
  setTargetClassId,
  filteredClassesForGrade,
  batchAssign,
  onBack,
  onQuickAssign,
}: {
  unassignedStudents: UnassignedStudent[];
  unassignedByGrade: Record<string, UnassignedStudent[]>;
  filteredUnassignedStudents: UnassignedStudent[];
  selectedEnrollmentIds: Set<string>;
  setSelectedEnrollmentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  assignGradeFilter: string | null;
  setAssignGradeFilter: React.Dispatch<React.SetStateAction<string | null>>;
  targetClassId: string | null;
  setTargetClassId: React.Dispatch<React.SetStateAction<string | null>>;
  filteredClassesForGrade: Array<{ id: string; name: string }>;
  batchAssign: { isPending: boolean };
  onBack: () => void;
  onQuickAssign: () => void;
}) {
  if (unassignedStudents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-grey-900 mb-2">모든 배정 완료!</h3>
        <p className="text-grey-600">더 이상 미배정 학생이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-grey-900">
          수동 배정이 필요한 학생 ({unassignedStudents.length}명)
        </h3>
        <button
          onClick={onBack}
          className="text-sm text-grey-500 hover:text-grey-700"
        >
          ← 결과로 돌아가기
        </button>
      </div>

      {/* 학년 필터 탭 */}
      <div className="flex gap-2 border-b border-grey-200 pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setAssignGradeFilter(null);
            setSelectedEnrollmentIds(new Set());
            setTargetClassId(null);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
            assignGradeFilter === null
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'text-grey-600 hover:bg-grey-100'
          }`}
        >
          전체 ({unassignedStudents.length})
        </button>
        {Object.entries(unassignedByGrade).map(([grade, students]) => (
          <button
            key={grade}
            onClick={() => {
              setAssignGradeFilter(grade);
              setSelectedEnrollmentIds(new Set());
              setTargetClassId(null);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
              assignGradeFilter === grade
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-grey-600 hover:bg-grey-100'
            }`}
          >
            {grade} ({students.length})
          </button>
        ))}
      </div>

      {/* 학생 목록 (체크박스) */}
      <div className="border border-grey-200 rounded-xl overflow-hidden">
        <div className="max-h-[250px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-grey-50 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedEnrollmentIds.size === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEnrollmentIds(new Set(filteredUnassignedStudents.map(s => s.enrollmentId)));
                      } else {
                        setSelectedEnrollmentIds(new Set());
                      }
                    }}
                    className="rounded border-grey-300"
                  />
                </th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">이름</th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">학년</th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">이전 반</th>
                <th className="px-3 py-2 text-left text-grey-600 font-medium">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grey-100">
              {filteredUnassignedStudents.map((student) => (
                <tr key={student.enrollmentId} className="hover:bg-grey-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedEnrollmentIds.has(student.enrollmentId)}
                      onChange={(e) => {
                        setSelectedEnrollmentIds(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(student.enrollmentId);
                          } else {
                            next.delete(student.enrollmentId);
                          }
                          return next;
                        });
                      }}
                      className="rounded border-grey-300"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{student.studentName}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {student.newGrade}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-grey-600 truncate max-w-[150px]" title={student.previousClassName}>
                    {student.previousClassName}
                  </td>
                  <td className="px-3 py-2 text-grey-500 text-xs truncate max-w-[120px]" title={student.reason}>
                    {student.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 반 선택 + 배정 버튼 */}
      {selectedEnrollmentIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-blue-700 font-medium">
              {selectedEnrollmentIds.size}명 선택됨
            </span>
            <div className="flex items-center gap-2">
              <select
                value={targetClassId || ''}
                onChange={(e) => setTargetClassId(e.target.value || null)}
                className="text-sm border border-grey-300 rounded-lg px-3 py-1.5 min-w-[180px]"
              >
                <option value="">반 선택...</option>
                {filteredClassesForGrade.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onQuickAssign}
                disabled={!targetClassId || batchAssign.isPending}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {batchAssign.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    배정 중...
                  </>
                ) : (
                  '배정하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
