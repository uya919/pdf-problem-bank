/**
 * HomeworkTab - 숙제 탭 컴포넌트
 * RecordsPage에서 분리됨
 */
import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { TabProps } from './types';

interface HomeworkData {
  id: string;
  classId: string;
  className: string;
  date: string;
  title: string;
  submitted: number;
  total: number;
  notSubmittedStudents: Array<{ id: string; name: string }>;
}

export function HomeworkTab({ selectedClassId, teacherId }: TabProps) {
  const [homeworkData, setHomeworkData] = useState<HomeworkData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchHomework() {
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
          setHomeworkData([]);
          return;
        }

        const classIds = typedClasses.map(c => c.id);
        const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

        // 최근 7일간 숙제 조회
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: homework } = await supabase
          .from('homework')
          .select(`
            id,
            class_id,
            title,
            description,
            due_date,
            submissions:homework_submissions(
              id,
              student_id,
              status,
              student:students(id, name)
            )
          `)
          .in('class_id', classIds)
          .gte('due_date', weekAgo.toISOString().split('T')[0])
          .order('due_date', { ascending: false });

        type HomeworkRow = {
          id: string;
          class_id: string;
          title: string | null;
          description: string | null;
          due_date: string;
          submissions: Array<{
            id: string;
            student_id: string;
            status: string;
            student: { id: string; name: string } | null;
          }> | null;
        };
        const typedHomework = (homework || []) as HomeworkRow[];

        if (typedHomework.length > 0) {
          const processed = typedHomework.map(hw => {
            const submissions = hw.submissions || [];
            const submitted = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
            const notSubmittedStudents = submissions
              .filter(s => s.status === 'pending')
              .map(s => ({
                id: s.student?.id || s.student_id,
                name: s.student?.name || '알 수 없음',
              }));

            return {
              id: hw.id,
              classId: hw.class_id,
              className: classMap[hw.class_id] || '',
              date: new Date(hw.due_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
              title: hw.title || hw.description || '',
              submitted,
              total: submissions.length,
              notSubmittedStudents,
            };
          });
          setHomeworkData(processed);
        }
      } catch (error) {
        console.error('숙제 데이터 조회 실패:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHomework();
  }, [teacherId]);

  // 필터링 적용
  const filteredHomework = selectedClassId
    ? homeworkData.filter(h => h.classId === selectedClassId)
    : homeworkData;

  // 반별로 숙제 데이터 그룹화
  const groupedByClass = useMemo(() => {
    const grouped: Record<string, {
      className: string;
      homework: typeof filteredHomework;
      notSubmittedStudents: Array<{ id: string; name: string }>;
    }> = {};

    filteredHomework.forEach(h => {
      if (!grouped[h.classId]) {
        grouped[h.classId] = { className: h.className, homework: [], notSubmittedStudents: [] };
      }
      grouped[h.classId].homework.push(h);
      // 중복 제거하며 미제출 학생 추가
      h.notSubmittedStudents.forEach(s => {
        if (!grouped[h.classId].notSubmittedStudents.some(ns => ns.id === s.id)) {
          grouped[h.classId].notSubmittedStudents.push(s);
        }
      });
    });

    return Object.entries(grouped).map(([classId, data]) => ({ classId, ...data }));
  }, [filteredHomework]);

  // 전체 통계
  const stats = useMemo(() => {
    return filteredHomework.reduce(
      (acc, h) => {
        acc.submitted += h.submitted;
        acc.total += h.total;
        return acc;
      },
      { submitted: 0, total: 0 }
    );
  }, [filteredHomework]);

  const submissionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0;

  return (
    <>
      {/* 전체 요약 카드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">이번 주 숙제 현황</div>
        {isLoading ? (
          <div className="text-center py-4 text-[#8B95A1]">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[24px] font-bold text-[#00C896]">{stats.submitted}</div>
              <div className="text-[11px] text-[#8B95A1]">제출</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#F04452]">{stats.total - stats.submitted}</div>
              <div className="text-[11px] text-[#8B95A1]">미제출</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#3182F6]">{submissionRate}%</div>
              <div className="text-[11px] text-[#8B95A1]">제출률</div>
            </div>
          </div>
        )}
      </div>

      {/* 반별 숙제 현황 카드 (그룹핑) */}
      <div className="space-y-3">
        {groupedByClass.map(({ classId, className, homework, notSubmittedStudents }) => {
          const classSubmitted = homework.reduce((sum, h) => sum + h.submitted, 0);
          const classTotal = homework.reduce((sum, h) => sum + h.total, 0);
          const isAllSubmitted = classSubmitted === classTotal && classTotal > 0;

          return (
            <div key={classId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* 반 헤더 */}
              <div className="p-4 border-b border-[#F2F4F6]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#191F28]">{className}</span>
                    {classTotal === 0 ? (
                      <span className="px-2 py-0.5 bg-[#F2F4F6] text-[#8B95A1] text-[11px] font-bold rounded-full">
                        숙제 없음
                      </span>
                    ) : isAllSubmitted ? (
                      <span className="px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[11px] font-bold rounded-full">
                        완료
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#FFF3E0] text-[#E65100] text-[11px] font-bold rounded-full">
                        {classTotal - classSubmitted}명 미제출
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[15px] font-bold text-[#3182F6]">{classSubmitted}</span>
                    <span className="text-[12px] text-[#8B95A1]">/{classTotal}</span>
                  </div>
                </div>
              </div>

              {/* 미제출 학생 */}
              {notSubmittedStudents.length > 0 && (
                <div className="px-4 py-3 bg-[#FFFBEB] border-b border-[#FEF3C7]">
                  <div className="flex flex-wrap gap-2">
                    {notSubmittedStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg">
                        <span className="text-[12px] text-[#191F28]">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 최근 숙제 */}
              <div className="divide-y divide-[#F2F4F6]">
                {homework.map(h => (
                  <div key={h.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] text-[#6B7684]">{h.date}</span>
                      <span className="text-[13px] text-[#191F28] ml-2">{h.title}</span>
                    </div>
                    <div className="text-[12px] text-[#8B95A1]">
                      {h.submitted}/{h.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {groupedByClass.length === 0 && !isLoading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-3">📝</div>
            <div className="text-[15px] font-medium text-[#191F28] mb-1">숙제 현황</div>
            <div className="text-[13px] text-[#8B95A1]">이번 주 숙제가 없습니다</div>
          </div>
        )}
      </div>
    </>
  );
}

export default HomeworkTab;
