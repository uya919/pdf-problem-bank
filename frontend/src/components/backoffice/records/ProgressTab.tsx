/**
 * ProgressTab - 진도 탭 컴포넌트
 * RecordsPage에서 분리됨
 */
import { useState, useMemo, useEffect } from 'react';
import { useProgressForTeacherByDate } from '../../../hooks/useBackofficeData';
import { supabase } from '../../../lib/supabase';
import type { TabProps } from './types';
import { formatDate } from './utils';

interface ClassProgressItem {
  classId: string;
  className: string;
  recorded: boolean;
  currentUnit?: number;
  totalUnits?: number;
  recentTopic?: string;
}

interface RecentProgressRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  pages: string;
  topic: string;
}

export function ProgressTab({ selectedClassId, teacherId }: TabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateStr = currentDate.toISOString().split('T')[0];

  // Supabase 데이터 조회
  const { data: progressData, isLoading } = useProgressForTeacherByDate(teacherId, dateStr);

  // 최근 진도 기록 조회 (별도 쿼리)
  const [recentProgress, setRecentProgress] = useState<RecentProgressRecord[]>([]);

  useEffect(() => {
    async function fetchRecentProgress() {
      if (!teacherId) return;

      // 선생님 담당 반 조회
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .or(`teacher_id.eq.${teacherId},assistant_teacher_id.eq.${teacherId},homeroom_teacher_id.eq.${teacherId}`)
        .eq('is_active', true);

      type ClassRow = { id: string; name: string };
      const typedClasses = (classes || []) as ClassRow[];
      if (typedClasses.length === 0) return;

      const classIds = typedClasses.map(c => c.id);
      const classMap = Object.fromEntries(typedClasses.map(c => [c.id, c.name]));

      // 최근 10개 진도 조회
      const { data: progress } = await supabase
        .from('progress')
        .select('id, class_id, date, pages, topic')
        .in('class_id', classIds)
        .order('date', { ascending: false })
        .limit(10);

      type ProgressRow = { id: string; class_id: string; date: string; pages: string | null; topic: string | null };
      const typedProgress = (progress || []) as ProgressRow[];
      if (typedProgress.length > 0) {
        setRecentProgress(typedProgress.map(p => ({
          id: p.id,
          classId: p.class_id,
          className: classMap[p.class_id] || '',
          date: new Date(p.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
          pages: p.pages || '',
          topic: p.topic || '',
        })));
      }
    }

    fetchRecentProgress();
  }, [teacherId]);

  // Supabase 데이터 사용
  const classProgress = useMemo((): ClassProgressItem[] => {
    if (progressData && (progressData.recorded.length > 0 || progressData.notRecorded.length > 0)) {
      const allClasses = [...progressData.recorded, ...progressData.notRecorded];
      return allClasses.map(cls => ({
        classId: cls.id,
        className: cls.name,
        recorded: progressData.recorded.some(r => r.id === cls.id),
      }));
    }
    return [];
  }, [progressData]);

  // 필터링 적용
  const filteredProgress = selectedClassId
    ? classProgress.filter(p => p.classId === selectedClassId)
    : classProgress;

  const filteredHistory = selectedClassId
    ? recentProgress.filter(h => h.classId === selectedClassId)
    : recentProgress;

  return (
    <>
      {/* 날짜 선택 */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm">
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() - 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-[15px] font-semibold text-[#191F28]">{formatDate(currentDate)}</div>
        <button
          onClick={() => {
            const d = new Date(currentDate);
            d.setDate(d.getDate() + 1);
            setCurrentDate(d);
          }}
          className="p-2 rounded-lg hover:bg-[#F2F4F6] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7684" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 진도 기록 현황 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="text-[13px] font-semibold text-[#191F28] mb-3">오늘 진도 현황</div>
        {isLoading ? (
          <div className="text-center py-4 text-[#8B95A1]">로딩 중...</div>
        ) : (
          <div className="space-y-2">
            {filteredProgress.map((p) => (
              <div key={p.classId} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-xl">
                <span className="text-[14px] text-[#191F28]">{p.className}</span>
                {p.currentUnit !== undefined && p.totalUnits !== undefined ? (
                  <span className="text-[12px] text-[#8B95A1]">
                    {p.currentUnit}/{p.totalUnits}단원
                  </span>
                ) : (
                  <span className={`px-2.5 py-1 text-[12px] font-medium rounded-full ${
                    p.recorded
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF3E0] text-[#E65100]'
                  }`}>
                    {p.recorded ? '기록됨' : '미기록'}
                  </span>
                )}
              </div>
            ))}
            {filteredProgress.length === 0 && (
              <div className="text-center py-4 text-[#8B95A1] text-[13px]">
                오늘 수업이 없습니다
              </div>
            )}
          </div>
        )}
      </div>

      {/* 최근 진도 기록 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#F2F4F6]">
          <div className="text-[13px] font-semibold text-[#191F28]">최근 진도 기록</div>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {filteredHistory.map((record) => (
            <div key={record.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-medium text-[#191F28]">{record.className}</span>
                  <span className="text-[12px] text-[#8B95A1] ml-2">{record.date}</span>
                </div>
                <span className="text-[12px] text-[#3182F6] font-medium">{record.pages}</span>
              </div>
              {record.topic && (
                <div className="text-[13px] text-[#6B7684] mt-1">{record.topic}</div>
              )}
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="px-4 py-6 text-center text-[#8B95A1] text-[13px]">
              진도 기록이 없습니다
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ProgressTab;
