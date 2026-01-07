/**
 * 반배정 화면
 * - 점수 구간별 학생 목록
 * - 드래그 & 드롭으로 반 변경
 * - 일괄 저장
 */
import { useState, useCallback } from 'react';
import { ArrowLeft, Save, RotateCcw, GripVertical } from 'lucide-react';
import { useExamDetail, useApplyClassAssignment } from '../../../hooks/useExams';
import type { ExamResult } from '../../../types/exam';

interface ClassAssignmentViewProps {
  examId: string;
  onBack: () => void;
  onComplete?: () => void;
}

interface ClassBucket {
  name: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  students: ExamResult[];
}

type DragItem = {
  studentId: string;
  fromClass: string;
};

export function ClassAssignmentView({ examId, onBack, onComplete }: ClassAssignmentViewProps) {
  const { data: examDetail, isLoading } = useExamDetail(examId);
  const applyAssignment = useApplyClassAssignment();

  // 반별 학생 배정 상태
  const [buckets, setBuckets] = useState<ClassBucket[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dragOverClass, setDragOverClass] = useState<string | null>(null);

  // 초기 반배정 (점수 기준)
  const initializeBuckets = useCallback((results: ExamResult[]) => {
    const classA: ExamResult[] = [];
    const classB: ExamResult[] = [];
    const classC: ExamResult[] = [];
    const classD: ExamResult[] = [];

    results.forEach((r) => {
      const percentile = (r.rank / results.length) * 100;
      if (percentile <= 25) classA.push(r);
      else if (percentile <= 50) classB.push(r);
      else if (percentile <= 75) classC.push(r);
      else classD.push(r);
    });

    setBuckets([
      {
        name: 'A',
        label: 'A반 (상위 25%)',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        students: classA,
      },
      {
        name: 'B',
        label: 'B반 (상위 50%)',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        students: classB,
      },
      {
        name: 'C',
        label: 'C반 (상위 75%)',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        students: classC,
      },
      {
        name: 'D',
        label: 'D반 (하위 25%)',
        color: 'text-grey-600',
        bgColor: 'bg-grey-50',
        borderColor: 'border-grey-200',
        students: classD,
      },
    ]);
    setIsInitialized(true);
  }, []);

  // 데이터 로드 시 초기화
  if (examDetail?.results && !isInitialized) {
    initializeBuckets(examDetail.results);
  }

  // 드래그 시작
  const handleDragStart = useCallback((studentId: string, fromClass: string) => {
    setDragItem({ studentId, fromClass });
  }, []);

  // 드래그 오버
  const handleDragOver = useCallback((e: React.DragEvent, className: string) => {
    e.preventDefault();
    setDragOverClass(className);
  }, []);

  // 드래그 종료
  const handleDragLeave = useCallback(() => {
    setDragOverClass(null);
  }, []);

  // 드롭
  const handleDrop = useCallback((toClass: string) => {
    if (!dragItem || dragItem.fromClass === toClass) {
      setDragItem(null);
      setDragOverClass(null);
      return;
    }

    setBuckets((prev) => {
      const newBuckets = prev.map((bucket) => ({ ...bucket, students: [...bucket.students] }));
      const fromBucket = newBuckets.find((b) => b.name === dragItem.fromClass);
      const toBucket = newBuckets.find((b) => b.name === toClass);

      if (fromBucket && toBucket) {
        const studentIndex = fromBucket.students.findIndex((s) => s.student_id === dragItem.studentId);
        if (studentIndex >= 0) {
          const [student] = fromBucket.students.splice(studentIndex, 1);
          toBucket.students.push(student);
          // 정렬 유지 (점수순)
          toBucket.students.sort((a, b) => b.total_score - a.total_score);
        }
      }

      return newBuckets;
    });

    setHasChanges(true);
    setDragItem(null);
    setDragOverClass(null);
  }, [dragItem]);

  // 초기화
  const handleReset = useCallback(() => {
    if (examDetail?.results) {
      initializeBuckets(examDetail.results);
      setHasChanges(false);
    }
  }, [examDetail, initializeBuckets]);

  // 저장
  const handleSave = useCallback(async () => {
    const assignments = buckets.flatMap((bucket) =>
      bucket.students.map((student) => ({
        studentId: student.student_id,
        className: bucket.name,
      }))
    );

    await applyAssignment.mutateAsync({ examId, assignments });
    setHasChanges(false);
    onComplete?.();
  }, [buckets, examId, applyAssignment, onComplete]);

  if (isLoading || !examDetail) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { exam } = examDetail;

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
            <p className="text-sm text-grey-500">반배정</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2.5 border border-grey-200 text-grey-600 text-sm font-medium rounded-xl hover:bg-grey-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
          <button
            onClick={handleSave}
            disabled={applyAssignment.isPending}
            className="px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {applyAssignment.isPending ? '저장 중...' : '반배정 저장'}
          </button>
        </div>
      </div>

      {/* 안내 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-700">
          학생을 드래그하여 다른 반으로 이동할 수 있습니다. 변경사항은 &quot;반배정 저장&quot; 버튼을 클릭해야 적용됩니다.
        </p>
      </div>

      {/* 반별 컬럼 */}
      <div className="grid grid-cols-4 gap-4">
        {buckets.map((bucket) => (
          <div
            key={bucket.name}
            className={`
              rounded-2xl border-2 transition-colors
              ${dragOverClass === bucket.name
                ? 'border-blue-400 bg-blue-50'
                : `${bucket.borderColor} bg-white`
              }
            `}
            onDragOver={(e) => handleDragOver(e, bucket.name)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(bucket.name)}
          >
            {/* 반 헤더 */}
            <div className={`p-4 border-b ${bucket.borderColor}`}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${bucket.color}`}>{bucket.label}</h3>
                <span className={`text-sm font-medium ${bucket.color}`}>
                  {bucket.students.length}명
                </span>
              </div>
            </div>

            {/* 학생 목록 */}
            <div className="p-3 space-y-2 min-h-[300px] max-h-[500px] overflow-y-auto">
              {bucket.students.map((student) => (
                <div
                  key={student.student_id}
                  draggable
                  onDragStart={() => handleDragStart(student.student_id, bucket.name)}
                  className={`
                    flex items-center gap-2 p-3 rounded-xl cursor-grab active:cursor-grabbing
                    ${bucket.bgColor} hover:shadow-md transition-shadow
                    ${dragItem?.studentId === student.student_id ? 'opacity-50' : ''}
                  `}
                >
                  <GripVertical className="w-4 h-4 text-grey-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-grey-900 truncate">
                      {student.student_name}
                    </div>
                    <div className="text-xs text-grey-500">
                      {student.rank}위 · {student.total_score}점
                    </div>
                  </div>
                  <div className={`
                    px-2 py-0.5 rounded text-xs font-semibold
                    ${student.total_score >= 90 ? 'bg-blue-100 text-blue-600' :
                      student.total_score >= 70 ? 'bg-green-100 text-green-600' :
                      student.total_score >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                    }
                  `}>
                    {student.total_score}점
                  </div>
                </div>
              ))}

              {bucket.students.length === 0 && (
                <div className="flex items-center justify-center h-32 text-grey-400 text-sm">
                  학생을 여기로 드래그하세요
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 요약 */}
      <div className="mt-6 p-4 bg-grey-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {buckets.map((bucket) => (
              <div key={bucket.name} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${bucket.bgColor} border ${bucket.borderColor}`} />
                <span className="text-sm text-grey-600">
                  {bucket.name}반: <strong className={bucket.color}>{bucket.students.length}명</strong>
                </span>
              </div>
            ))}
          </div>
          <div className="text-sm text-grey-500">
            총 {buckets.reduce((sum, b) => sum + b.students.length, 0)}명
          </div>
        </div>
      </div>

      {/* 변경사항 알림 */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-grey-900 text-white rounded-xl shadow-lg flex items-center gap-4">
          <span className="text-sm">변경사항이 있습니다</span>
          <button
            onClick={handleSave}
            disabled={applyAssignment.isPending}
            className="px-4 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {applyAssignment.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </div>
  );
}
