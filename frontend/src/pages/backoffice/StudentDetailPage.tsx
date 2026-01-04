/**
 * StudentDetailPage - 학생 상세 페이지
 *
 * Stage 37: Supabase 연결 (2026-01-04)
 * - Mock 데이터 제거
 * - Supabase 훅으로 실데이터 조회
 */
import { useParams, useNavigate } from 'react-router-dom';
import { BottomNavBar } from './components/BottomNavBar';
import {
  getStudentAlerts,
  StudentProfileCard,
  StudentStatsCard,
  ScoreChart,
  ActivityTimeline,
  StudentNotes,
} from '../../components/backoffice/students';
import type { Student, StudentAlert } from '../../components/backoffice/students';
import {
  useStudent,
  useStudentStats,
  useStudentScores,
  useStudentActivities,
  useStudentNotes,
  useAddStudentNote,
} from '../../hooks/backoffice';

// ============ 컴포넌트 ============

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Supabase 데이터 조회
  const { data: studentData, isLoading: isLoadingStudent } = useStudent(studentId || null);
  const { data: stats, isLoading: isLoadingStats } = useStudentStats(studentId || null);
  const { data: scores = [] } = useStudentScores(studentId || null);
  const { data: activities = [] } = useStudentActivities(studentId || null);
  const { data: notes = [] } = useStudentNotes(studentId || null);
  const addNoteMutation = useAddStudentNote();

  // 로딩 상태
  if (isLoadingStudent || isLoadingStats) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8B95A1]">학생 정보 불러오는 중...</p>
        </div>
        <BottomNavBar active="students" />
      </div>
    );
  }

  // 학생 데이터 변환
  const student: Student | null = studentData
    ? {
        id: studentData.id,
        name: studentData.name,
        grade: (studentData as { grade?: { name?: string } }).grade?.name || '',
        classId: studentData.enrollments?.[0]?.class_id || '',
        className: (studentData.enrollments?.[0] as { class?: { name?: string } })?.class?.name || '',
        schedule: '',
        parentPhone: studentData.parent_phone || undefined,
      }
    : null;

  if (!student || !stats) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">😕</div>
          <div className="text-[#191F28] font-medium">학생을 찾을 수 없습니다</div>
          <button
            onClick={() => navigate('/students')}
            className="mt-4 px-4 py-2 bg-[#3182F6] text-white rounded-lg text-sm"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const alerts: StudentAlert[] = getStudentAlerts(stats);

  // 알림 상세 메시지 생성
  const getAlertDetails = () => {
    const details: string[] = [];
    if (stats.absenceCount >= 2) {
      details.push(`이번 달 결석 ${stats.absenceCount}회`);
    }
    if (stats.scoreTrend <= -10) {
      details.push(`최근 시험 성적 ${Math.abs(stats.scoreTrend)}점 하락`);
    }
    if (stats.homeworkRate < 50) {
      details.push('숙제 제출률 50% 미만');
    }
    return details;
  };

  const handleAddNote = (content: string) => {
    if (!studentId) return;
    addNoteMutation.mutate({ studentId, content });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 헤더 */}
      <div className="bg-white px-4 py-4 border-b border-[#F2F4F6] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="w-8 h-8 flex items-center justify-center"
          >
            <svg
              className="w-6 h-6 text-[#191F28]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="text-lg font-bold text-[#191F28]">{student.name}</div>
        </div>
      </div>

      {/* 프로필 카드 */}
      <StudentProfileCard student={student} alerts={alerts} />

      {/* 주의 알림 배너 */}
      {alerts.length > 0 && (
        <div className="mx-4 mt-4 bg-[#FEE2E2] rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#EF4444] rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[#991B1B] text-sm">주의 필요</div>
              <div className="text-xs text-[#DC2626] mt-1 space-y-1">
                {getAlertDetails().map((detail, idx) => (
                  <div key={idx}>• {detail}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 통계 요약 */}
      <StudentStatsCard stats={stats} />

      {/* 성적 추이 */}
      <ScoreChart scores={scores} classAverage={82} />

      {/* 최근 활동 */}
      <ActivityTimeline activities={activities} />

      {/* 메모 */}
      <StudentNotes notes={notes} onAddNote={handleAddNote} />

      <BottomNavBar active="students" />
    </div>
  );
}
