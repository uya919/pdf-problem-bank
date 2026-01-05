/**
 * 학생 상세 정보 모달
 *
 * 출결, 성적, 숙제 현황을 보여주는 바텀시트 스타일 모달
 * 전화번호도 여기서 다시 확인 가능
 */
import { X, Phone, TrendingUp, TrendingDown, CheckCircle, Clock, BookOpen, CalendarCheck } from 'lucide-react';
import type { MyStudent } from '../../../hooks/useMyStudents';
import { useStudentDetail, type StudentDetail } from '../../../hooks/useStudentDetail';

interface StudentDetailModalProps {
  student: MyStudent;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 통계 카드 컴포넌트
 */
function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && (
        <div className="text-xs opacity-70 mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

/**
 * 성적 목록 아이템
 */
function ScoreItem({
  examName,
  examDate,
  score,
}: {
  examName: string;
  examDate: string;
  score: number | null;
}) {
  const scoreColor = score === null
    ? 'text-gray-400'
    : score >= 90
    ? 'text-green-600'
    : score >= 70
    ? 'text-blue-600'
    : score >= 50
    ? 'text-yellow-600'
    : 'text-red-600';

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{examName}</div>
        <div className="text-xs text-gray-400">{examDate}</div>
      </div>
      <div className={`text-lg font-bold ${scoreColor}`}>
        {score !== null ? `${score}점` : '-'}
      </div>
    </div>
  );
}

/**
 * 전화번호 포맷팅
 */
function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function StudentDetailModal({
  student,
  isOpen,
  onClose,
}: StudentDetailModalProps) {
  const { data: detail, isLoading } = useStudentDetail(
    isOpen ? student.id : null,
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  // 학년/학교 정보
  const gradeText = student.grade_info?.name || '';
  const schoolText = student.school || '';

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 모달 (바텀시트 스타일) */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">
                {student.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
              <p className="text-sm text-gray-500">
                {[gradeText, schoolText].filter(Boolean).join(' · ') || '정보 없음'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-5">
          {/* 연락처 섹션 */}
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3">연락처</h3>
            <div className="flex gap-3">
              <a
                href={student.phone ? `tel:${student.phone.replace(/\D/g, '')}` : undefined}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl ${
                  student.phone ? 'bg-blue-50 active:bg-blue-100' : 'bg-gray-100'
                }`}
              >
                <Phone className={`w-4 h-4 ${student.phone ? 'text-blue-500' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs text-gray-500">학생</div>
                  <div className={`text-sm font-medium ${student.phone ? 'text-blue-600' : 'text-gray-400'}`}>
                    {formatPhone(student.phone)}
                  </div>
                </div>
              </a>
              <a
                href={student.parent_phone ? `tel:${student.parent_phone.replace(/\D/g, '')}` : undefined}
                className={`flex-1 flex items-center gap-2 p-3 rounded-xl ${
                  student.parent_phone ? 'bg-green-50 active:bg-green-100' : 'bg-gray-100'
                }`}
              >
                <Phone className={`w-4 h-4 ${student.parent_phone ? 'text-green-500' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs text-gray-500">학부모</div>
                  <div className={`text-sm font-medium ${student.parent_phone ? 'text-green-600' : 'text-gray-400'}`}>
                    {formatPhone(student.parent_phone)}
                  </div>
                </div>
              </a>
            </div>
          </section>

          {isLoading ? (
            <div className="py-10 text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              불러오는 중...
            </div>
          ) : detail ? (
            <>
              {/* 통계 그리드 */}
              <section className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">이번 달 현황</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={CalendarCheck}
                    label="출석률"
                    value={`${detail.attendance.rate}%`}
                    subValue={`출석 ${detail.attendance.present}회`}
                    color={detail.attendance.rate >= 80 ? 'green' : detail.attendance.rate >= 60 ? 'yellow' : 'red'}
                  />
                  <StatCard
                    icon={BookOpen}
                    label="숙제 제출률"
                    value={`${detail.homework.rate}%`}
                    subValue={`${detail.homework.submitted}/${detail.homework.total}개`}
                    color={detail.homework.rate >= 80 ? 'green' : detail.homework.rate >= 60 ? 'yellow' : 'red'}
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="평균 점수"
                    value={detail.averageScore !== null ? `${detail.averageScore}점` : '-'}
                    color="blue"
                  />
                  <StatCard
                    icon={Clock}
                    label="결석/지각"
                    value={detail.attendance.absent + detail.attendance.late}
                    subValue={`결석 ${detail.attendance.absent}, 지각 ${detail.attendance.late}`}
                    color={detail.attendance.absent + detail.attendance.late === 0 ? 'green' : 'yellow'}
                  />
                </div>
              </section>

              {/* 최근 성적 */}
              <section className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">최근 성적</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  {detail.recentScores.length > 0 ? (
                    detail.recentScores.map((score) => (
                      <ScoreItem
                        key={score.id}
                        examName={score.exam_name}
                        examDate={score.exam_date}
                        score={score.score}
                      />
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      성적 기록이 없습니다
                    </div>
                  )}
                </div>
              </section>

              {/* 등록된 반 */}
              {student.enrolled_classes && student.enrolled_classes.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">수강 중인 반</h3>
                  <div className="space-y-2">
                    {student.enrolled_classes.map((cls) => (
                      <div
                        key={cls.class_id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{cls.class_name}</div>
                          <div className="text-xs text-gray-500">{cls.subject}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 메모 */}
              {student.notes && (
                <section className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">메모</h3>
                  <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-800">
                    {student.notes}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* 슬라이드 업 애니메이션 */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
