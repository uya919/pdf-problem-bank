/**
 * 반 생성 모달
 * 반 이름 자동 생성: {학년} {과목} {수준}반 + [구분자]
 */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCreateClass, useTeachers, useGrades, useSubjects, DAY_NAMES } from '../../../hooks/useClasses';
import { ClassLevel } from '../../../api/classes';
import { generateClassName } from '../../../utils/classNameGenerator';
import { DAY_NAMES_FULL, createScheduleArrays } from '../../../utils/scheduleUtils';

// Level 옵션 정의
const LEVEL_OPTIONS: { value: ClassLevel; label: string }[] = [
  { value: 'advanced', label: '심화' },
  { value: 'regular', label: '정규' },
  { value: 'regular2', label: '정규2' },
  { value: 'basic', label: '기초' },
];

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateClassModal({ isOpen, onClose }: CreateClassModalProps) {
  // 폼 상태 (반 이름 대신 suffix 사용)
  const [subject, setSubject] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [level, setLevel] = useState<ClassLevel>('regular');
  const [suffix, setSuffix] = useState(''); // 구분자 (A, B, 오후 등)
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('16:00');
  const [maxStudents, setMaxStudents] = useState(8);
  // Stage 34: 요일별 수업 시간
  const [useSameTime, setUseSameTime] = useState(true);
  const [dayTimes, setDayTimes] = useState<Record<number, { start: string; end: string }>>({});
  // Stage 31: 담임/부담임 (초등부용)
  const [homeroomTeacherId, setHomeroomTeacherId] = useState<string | null>(null);
  const [assistantTeacherId, setAssistantTeacherId] = useState<string | null>(null);

  // 데이터 조회
  const { data: teachers } = useTeachers();
  const { data: grades } = useGrades();
  const { data: subjects } = useSubjects();

  const createMutation = useCreateClass();

  // 선택된 학년/과목 이름 가져오기
  const selectedGrade = useMemo(() =>
    grades?.find(g => g.id === gradeId), [grades, gradeId]);
  const selectedSubject = useMemo(() =>
    subjects?.find(s => s.id === subjectId), [subjects, subjectId]);

  // 반 이름 자동 생성
  const generatedName = useMemo(() => {
    return generateClassName({
      gradeName: selectedGrade?.name || null,
      subjectName: selectedSubject?.name || null,
      level,
      suffix,
    });
  }, [selectedGrade, selectedSubject, level, suffix]);

  // Stage 31: 초등부 여부 확인
  const isElementary = useMemo(() => {
    return selectedGrade?.name?.startsWith('초') || false;
  }, [selectedGrade]);

  // 과목 선택 시 subject 필드도 업데이트
  useEffect(() => {
    if (selectedSubject) {
      setSubject(selectedSubject.code);
    }
  }, [selectedSubject]);

  // 필수 필드 검증
  const isValid = useMemo(() => {
    return subjectId && gradeId && generatedName.length > 0;
  }, [subjectId, gradeId, generatedName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) return;

    // Stage 34: 요일별 시간 배열 생성
    const { startTimes, endTimes } = createScheduleArrays(
      dayOfWeek,
      useSameTime,
      startTime,
      endTime,
      dayTimes
    );

    try {
      await createMutation.mutateAsync({
        name: generatedName,
        subject: subject || 'math',
        subject_id: subjectId,
        grade_id: gradeId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek.length > 0 ? dayOfWeek : null,
        start_time: startTime || null,
        end_time: endTime || null,
        // Stage 34: 요일별 시간 배열
        start_times: startTimes.length > 0 ? startTimes : null,
        end_times: endTimes.length > 0 ? endTimes : null,
        max_students: maxStudents,
        level: level,
        // Stage 31: 초등부는 담임/부담임, 그 외는 null
        homeroom_teacher_id: isElementary ? homeroomTeacherId : null,
        assistant_teacher_id: isElementary ? assistantTeacherId : null,
        homeroom_days: isElementary ? [1, 3, 5] : null,
        assistant_days: isElementary ? [2, 4] : null,
      });

      handleClose();
    } catch (error) {
      console.error('반 생성 실패:', error);
    }
  };

  const handleClose = () => {
    setSubject('');
    setSubjectId(null);
    setGradeId(null);
    setLevel('regular');
    setSuffix('');
    setTeacherId(null);
    setDayOfWeek([]);
    setStartTime('14:00');
    setEndTime('16:00');
    setMaxStudents(8);
    // Stage 34: 요일별 시간 리셋
    setUseSameTime(true);
    setDayTimes({});
    setHomeroomTeacherId(null);
    setAssistantTeacherId(null);
    onClose();
  };

  const toggleDay = (day: number) => {
    setDayOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-grey-900">새 반 만들기</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-grey-400 hover:text-grey-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* 과목 (필수) */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  과목 <span className="text-red-500">*</span>
                </label>
                <select
                  value={subjectId || ''}
                  onChange={(e) => setSubjectId(e.target.value || null)}
                  required
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">과목 선택</option>
                  {subjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 학년 (필수) */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  학년 <span className="text-red-500">*</span>
                </label>
                <select
                  value={gradeId || ''}
                  onChange={(e) => setGradeId(e.target.value || null)}
                  required
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">학년 선택</option>
                  {grades?.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 수준 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  수준
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ClassLevel)}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LEVEL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 구분 (선택) */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  구분 <span className="text-grey-400 text-xs">(선택)</span>
                </label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="A, B, 오후 등"
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 반 이름 미리보기 */}
              {generatedName && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-600 mb-1">생성될 반 이름</p>
                  <p className="text-base font-semibold text-blue-800">{generatedName}</p>
                </div>
              )}

              {/* Stage 31: 초등부는 담임/부담임, 그 외는 담당 강사 */}
              {isElementary ? (
                <>
                  {/* 담임 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      담임 (월/수/금)
                    </label>
                    <select
                      value={homeroomTeacherId || ''}
                      onChange={(e) => setHomeroomTeacherId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택 안함</option>
                      {teachers?.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.subject ? `(${t.subject})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 부담임 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-grey-700 mb-1.5">
                      부담임 (화/목)
                    </label>
                    <select
                      value={assistantTeacherId || ''}
                      onChange={(e) => setAssistantTeacherId(e.target.value || null)}
                      className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">선택 안함</option>
                      {teachers?.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.subject ? `(${t.subject})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                /* 기존 담당 강사 선택 (중등부/고등부) */
                <div>
                  <label className="block text-sm font-medium text-grey-700 mb-1.5">
                    담당 강사
                  </label>
                  <select
                    value={teacherId || ''}
                    onChange={(e) => setTeacherId(e.target.value || null)}
                    className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">강사 선택</option>
                    {teachers?.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.subject ? `(${t.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 수업 요일 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  수업 요일
                </label>
                <div className="flex gap-2">
                  {Object.entries(DAY_NAMES).map(([day, name]) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(parseInt(day))}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        dayOfWeek.includes(parseInt(day))
                          ? 'bg-blue-500 text-white'
                          : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage 34: 수업 시간 - 요일별 개별 시간 지원 */}
              {dayOfWeek.length > 0 && (
                <div className="space-y-3">
                  {/* 동일 시간 토글 (요일 2개 이상일 때만 표시) */}
                  {dayOfWeek.length > 1 && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameTime}
                        onChange={(e) => setUseSameTime(e.target.checked)}
                        className="w-4 h-4 rounded border-grey-300 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-grey-700">모든 요일 동일 시간</span>
                    </label>
                  )}

                  {useSameTime ? (
                    /* 단일 시간 입력 */
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-grey-700 mb-1.5">
                          시작 시간
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-grey-700 mb-1.5">
                          종료 시간
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    /* 요일별 개별 시간 입력 */
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-grey-700">
                        요일별 수업 시간
                      </label>
                      {dayOfWeek.sort((a, b) => a - b).map(day => (
                        <div key={day} className="flex items-center gap-3 p-3 bg-grey-50 rounded-xl">
                          <span className="w-16 text-sm font-medium text-grey-700">
                            {DAY_NAMES_FULL[day]}
                          </span>
                          <input
                            type="time"
                            value={dayTimes[day]?.start || startTime}
                            onChange={(e) => setDayTimes(prev => ({
                              ...prev,
                              [day]: { start: e.target.value, end: prev[day]?.end || endTime }
                            }))}
                            className="flex-1 px-3 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-grey-400">~</span>
                          <input
                            type="time"
                            value={dayTimes[day]?.end || endTime}
                            onChange={(e) => setDayTimes(prev => ({
                              ...prev,
                              [day]: { start: prev[day]?.start || startTime, end: e.target.value }
                            }))}
                            className="flex-1 px-3 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 정원 */}
              <div>
                <label className="block text-sm font-medium text-grey-700 mb-1.5">
                  정원
                </label>
                <input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(parseInt(e.target.value) || 8)}
                  min={1}
                  max={30}
                  className="w-full px-4 py-3 border border-grey-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 에러 */}
              {createMutation.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {(createMutation.error as Error).message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 p-6 pt-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !isValid}
              className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? '생성 중...' : '반 만들기'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
