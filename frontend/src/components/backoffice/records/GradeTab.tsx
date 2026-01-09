/**
 * GradeTab - 성적 탭 컴포넌트
 * RecordsPage에서 분리됨
 */
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { TabProps } from './types';

interface ExamTestData {
  id: string;
  classId: string;
  className: string;
  date: string;
  testName: string;
  scores: Array<{
    studentId: string;
    studentName: string;
    score: number;
    previousScore?: number;
  }>;
}

export function GradeTab({ selectedClassId, teacherId }: TabProps) {
  const [examData, setExamData] = useState<ExamTestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchExamScores() {
      if (!teacherId) return;
      setIsLoading(true);

      try {
        // 선생님 담당 반 조회
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
          .eq('is_active', true);

        type ClassRow = { id: string; name: string };
        const typedClasses = (classes || []) as ClassRow[];
        if (typedClasses.length === 0) {
          setExamData([]);
          return;
        }

        const classIds = typedClasses.map(c => c.id);
        const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

        // 최근 성적 조회
        const { data: scores } = await supabase
          .from('exam_scores')
          .select(`
            id,
            class_id,
            student_id,
            exam_type,
            exam_date,
            exam_name,
            correct_answers,
            total_questions,
            manual_score,
            student:students(id, name)
          `)
          .in('class_id', classIds)
          .order('exam_date', { ascending: false })
          .limit(100);

        type ScoreRow = {
          id: string;
          class_id: string;
          student_id: string;
          exam_type: string | null;
          exam_date: string;
          exam_name: string | null;
          correct_answers: number | null;
          total_questions: number | null;
          manual_score: number | null;
          student: { id: string; name: string } | null;
        };
        const typedScores = (scores || []) as ScoreRow[];

        if (typedScores.length > 0) {
          // 시험별로 그룹핑 (class_id + exam_date + exam_name 기준)
          const examGroups: Record<string, ExamTestData> = {};

          typedScores.forEach(score => {
            const examKey = `${score.class_id}_${score.exam_date}_${score.exam_name || score.exam_type}`;
            const student = score.student;

            // 점수 계산 (manual_score 우선, 없으면 정답률 계산)
            let calculatedScore = 0;
            if (score.manual_score !== null && score.manual_score !== undefined) {
              calculatedScore = score.manual_score;
            } else if (score.correct_answers !== null && score.total_questions !== null && score.total_questions > 0) {
              calculatedScore = Math.round((score.correct_answers / score.total_questions) * 100);
            }

            if (!examGroups[examKey]) {
              examGroups[examKey] = {
                id: examKey,
                classId: score.class_id,
                className: classMap[score.class_id] || '',
                date: new Date(score.exam_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                testName: score.exam_name || score.exam_type || '시험',
                scores: [],
              };
            }

            examGroups[examKey].scores.push({
              studentId: score.student_id,
              studentName: student?.name || '알 수 없음',
              score: calculatedScore,
            });
          });

          setExamData(Object.values(examGroups));
          // 첫 번째 시험 펼침
          const firstExam = Object.values(examGroups)[0];
          if (firstExam) {
            setExpandedTestId(firstExam.id);
          }
        } else {
          setExamData([]);
        }
      } catch (error) {
        console.error('성적 데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExamScores();
  }, [teacherId]);

  // 필터링 적용
  const filteredTests = selectedClassId
    ? examData.filter(t => t.classId === selectedClassId)
    : examData;

  // 전체 성적 하락 학생 (필터된 반 기준)
  const allDecliningStudents = useMemo(() => {
    const declining: Array<{ studentId: string; studentName: string; className: string; score: number; previousScore: number }> = [];
    filteredTests.forEach(test => {
      test.scores.forEach(s => {
        if (s.previousScore && s.score < s.previousScore && s.previousScore - s.score >= 5) {
          declining.push({
            studentId: s.studentId,
            studentName: s.studentName,
            className: test.className,
            score: s.score,
            previousScore: s.previousScore,
          });
        }
      });
    });
    return declining.sort((a, b) => (b.previousScore - b.score) - (a.previousScore - a.score));
  }, [filteredTests]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="text-[#8B95A1]">로딩 중...</div>
      </div>
    );
  }

  if (filteredTests.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="text-4xl mb-3">📊</div>
        <div className="text-[15px] font-medium text-[#191F28] mb-1">성적 기록</div>
        <div className="text-[13px] text-[#8B95A1]">시험 기록이 없습니다</div>
      </div>
    );
  }

  return (
    <>
      {/* 성적 하락 학생 경고 (전체) */}
      {allDecliningStudents.length > 0 && (
        <div className="bg-[#FFEBEE] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            <span className="text-[13px] font-semibold text-[#991B1B]">성적 하락 주의</span>
          </div>
          <div className="space-y-2">
            {allDecliningStudents.map((student) => (
              <div key={student.studentId} className="flex items-center justify-between bg-white/50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-[14px] font-medium text-[#191F28]">{student.studentName}</span>
                  <span className="text-[12px] text-[#8B95A1] ml-2">({student.className})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-[#191F28]">{student.score}점</span>
                  <span className="text-[12px] text-[#DC2626] font-medium">
                    ({student.previousScore - student.score}점 ↓)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 반별 성적 카드 (그룹핑) */}
      <div className="space-y-3">
        {filteredTests.map((test) => {
          const avg = test.scores.length > 0
            ? Math.round(test.scores.reduce((sum, s) => sum + s.score, 0) / test.scores.length)
            : 0;
          const max = test.scores.length > 0 ? Math.max(...test.scores.map((s) => s.score)) : 0;
          const min = test.scores.length > 0 ? Math.min(...test.scores.map((s) => s.score)) : 0;
          const isExpanded = expandedTestId === test.id;

          // 성적 분포 계산
          const distribution = [0, 0, 0, 0, 0];
          test.scores.forEach((s) => {
            if (s.score < 60) distribution[0]++;
            else if (s.score < 70) distribution[1]++;
            else if (s.score < 80) distribution[2]++;
            else if (s.score < 90) distribution[3]++;
            else distribution[4]++;
          });

          return (
            <div key={test.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 반 헤더 (클릭하면 펼침/접힘) */}
              <button
                onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                className="w-full p-4 border-b border-[#F2F4F6] text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#191F28]">{test.className}</span>
                      <span className="text-[12px] text-[#8B95A1]">{test.testName} · {test.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[18px] font-bold text-[#3182F6]">{avg}</span>
                      <span className="text-[12px] text-[#8B95A1]">점</span>
                    </div>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#8B95A1"
                      strokeWidth="2"
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>
                {/* 요약 정보 (항상 표시) */}
                <div className="flex gap-4 mt-2 text-[12px]">
                  <span className="text-[#8B95A1]">최고 <span className="text-[#00C896] font-bold">{max}</span></span>
                  <span className="text-[#8B95A1]">최저 <span className="text-[#F04452] font-bold">{min}</span></span>
                  <span className="text-[#8B95A1]">인원 <span className="text-[#191F28] font-bold">{test.scores.length}</span></span>
                </div>
              </button>

              {/* 펼침 컨텐츠 */}
              {isExpanded && (
                <>
                  {/* 성적 분포 바 */}
                  <div className="px-4 py-3 border-b border-[#F2F4F6] bg-[#F9FAFB]">
                    <div className="text-[11px] text-[#8B95A1] mb-2">성적 분포</div>
                    <div className="flex gap-1 h-12 items-end">
                      {['0-59', '60-69', '70-79', '80-89', '90-100'].map((label, idx) => {
                        const count = distribution[idx];
                        const maxCount = Math.max(...distribution, 1);
                        const height = (count / maxCount) * 100;
                        const colors = ['#F04452', '#FF9800', '#FFC107', '#00C896', '#3182F6'];
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full rounded-t transition-all"
                              style={{ height: `${height}%`, minHeight: count > 0 ? '6px' : '0', backgroundColor: colors[idx] }}
                            />
                            <div className="text-[9px] text-[#8B95A1] mt-1">{label}</div>
                            <div className="text-[10px] font-bold text-[#191F28]">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 개인별 성적 */}
                  <div className="divide-y divide-[#F2F4F6]">
                    {[...test.scores]
                      .sort((a, b) => b.score - a.score)
                      .map((student, idx) => {
                        const diff = student.previousScore ? student.score - student.previousScore : null;
                        return (
                          <div key={student.studentId} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${idx < 3 ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#6B7684]'}`}>
                                {idx + 1}
                              </div>
                              <span className="text-[14px] text-[#191F28]">{student.studentName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-bold text-[#191F28]">{student.score}점</span>
                              {diff !== null && (
                                <span className={`text-[11px] font-medium ${diff > 0 ? 'text-[#00C896]' : diff < 0 ? 'text-[#F04452]' : 'text-[#8B95A1]'}`}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default GradeTab;
