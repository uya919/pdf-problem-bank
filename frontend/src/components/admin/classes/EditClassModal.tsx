/**
 * 반 수정 모달
 * 탭 UI: 정보 수정 / 학생 목록 / 교재
 * 반 이름 자동 생성: {학년} {과목} {수준}반 + [구분자]
 */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ClassData, ClassLevel } from '../../../api/classes';
import { useUpdateClass, useTeachers, useGrades, useSubjects, useClassStudentCounts, DAY_NAMES } from '../../../hooks/useClasses';
import { ClassStudentsTab } from './ClassStudentsTab';
import { ClassTextbookSection } from '../classTextbook/ClassTextbookSection';
import { generateClassName, extractSuffixFromName } from '../../../utils/classNameGenerator';
import { DAY_NAMES_FULL, createScheduleArrays, allSame, formatTime } from '../../../utils/scheduleUtils';

// Level 옵션 정의
const LEVEL_OPTIONS: { value: ClassLevel; label: string }[] = [
  { value: 'advanced', label: '심화' },
  { value: 'regular', label: '정규' },
  { value: 'regular2', label: '정규2' },
  { value: 'basic', label: '기초' },
];

type TabType = 'info' | 'students' | 'textbooks';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: ClassData;
}

export function EditClassModal({ isOpen, onClose, classData }: EditClassModalProps) {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // 폼 상태
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
  const { data: studentCounts } = useClassStudentCounts();

  const updateMutation = useUpdateClass();

  // 학생 수 계산
  const studentCount = studentCounts?.[classData.id] || 0;

  // 반 이름에서 학년 추출 (예: "고1 국어" → "고1")
  const extractGradeFromName = (name: string): string | null => {
    const match = name.match(/(초|중|고)\d/);
    return match ? match[0] : null;
  };

  // 반 이름에서 과목 추출 (예: "고1 국어 심화" → "국어")
  const extractSubjectFromName = (name: string): string | null => {
    const subjectKeywords = ['수학', '국어', '영어'];
    for (const keyword of subjectKeywords) {
      if (name.includes(keyword)) {
        return keyword;
      }
    }
    return null;
  };

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

  // 필수 필드 검증
  const isValid = useMemo(() => {
    return subjectId && gradeId && generatedName.length > 0;
  }, [subjectId, gradeId, generatedName]);

  // 초기값 설정
  useEffect(() => {
    if (isOpen && classData && subjects && grades) {
      // 탭 초기화
      setActiveTab('info');

      setSubject(classData.subject || '');
      setTeacherId(classData.teacher_id);
      setDayOfWeek(classData.day_of_week || []);
      setStartTime(classData.start_time?.slice(0, 5) || '14:00');
      setEndTime(classData.end_time?.slice(0, 5) || '16:00');
      setMaxStudents(classData.max_students || 8);

      // level 설정 (유효한 값만, 'mid' 같은 잘못된 값은 'regular'로)
      const validLevels: ClassLevel[] = ['advanced', 'regular', 'regular2', 'basic'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const classLevel = (classData as any).level;
      const resolvedLevel = validLevels.includes(classLevel) ? classLevel : 'regular';
      setLevel(resolvedLevel);

      // subject_id 설정
      let resolvedSubjectId: string | null = null;
      if (classData.subject_id) {
        resolvedSubjectId = classData.subject_id;
      } else {
        const subjectName = extractSubjectFromName(classData.name);
        if (subjectName) {
          const foundSubject = subjects.find(s => s.name === subjectName);
          resolvedSubjectId = foundSubject?.id || null;
        }
      }
      setSubjectId(resolvedSubjectId);

      // grade_id 설정
      let resolvedGradeId: string | null = null;
      if (classData.grade_id) {
        resolvedGradeId = classData.grade_id;
      } else {
        const gradeName = extractGradeFromName(classData.name);
        if (gradeName) {
          const foundGrade = grades.find(g => g.name === gradeName);
          resolvedGradeId = foundGrade?.id || null;
        }
      }
      setGradeId(resolvedGradeId);

      // suffix 추출
      const resolvedGradeName = resolvedGradeId
        ? grades.find(g => g.id === resolvedGradeId)?.name || null
        : null;
      const resolvedSubjectName = resolvedSubjectId
        ? subjects.find(s => s.id === resolvedSubjectId)?.name || null
        : null;

      const extractedSuffix = extractSuffixFromName(
        classData.name,
        resolvedGradeName,
        resolvedSubjectName,
        resolvedLevel
      );
      setSuffix(extractedSuffix);

      // Stage 31: 담임/부담임 초기값 설정
      setHomeroomTeacherId(classData.homeroom_teacher_id || null);
      setAssistantTeacherId(classData.assistant_teacher_id || null);

      // Stage 34: 요일별 시간 로드
      const days = classData.day_of_week || [];
      const startTimes = classData.start_times || [];
      const endTimes = classData.end_times || [];

      // 모든 시간이 동일한지 체크
      const isSameTime = allSame(startTimes) && allSame(endTimes);
      setUseSameTime(isSameTime);

      // dayTimes 구성
      const times: Record<number, { start: string; end: string }> = {};
      days.forEach((day, idx) => {
        times[day] = {
          start: formatTime(startTimes[idx]) || '14:00',
          end: formatTime(endTimes[idx]) || '16:00',
        };
      });
      setDayTimes(times);
    }
  }, [isOpen, classData, subjects, grades]);

  // 과목 선택 시 subject 필드도 업데이트
  useEffect(() => {
    if (selectedSubject) {
      setSubject(selectedSubject.code);
    }
  }, [selectedSubject]);

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
      await updateMutation.mutateAsync({
        id: classData.id,
        input: {
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
        },
      });

      onClose();
    } catch (error) {
      console.error('반 수정 실패:', error);
    }
  };

  const toggleDay = (day: number) => {
    setDayOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  if (!isOpen) return null;

  // 과목 이름 찾기 (헤더용)
  const displaySubjectName = subjects?.find(s => s.id === classData.subject_id)?.name
    || classData.subjects?.name
    || classData.subject
    || '과목 미지정';

  // 담당 강사 이름 찾기 (헤더용)
  const displayTeacherName = teachers?.find(t => t.id === classData.teacher_id)?.name
    || classData.teachers?.name
    || '미배정';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 - 반 요약 정보 */}
        <div className="p-4 pb-3 border-b border-grey-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-grey-900">{classData.name}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 text-grey-400 hover:text-grey-600 text-xl"
            >
              &times;
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-grey-500">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
              {displaySubjectName}
            </span>
            <span className="text-grey-300">|</span>
            <span>담당: {displayTeacherName}</span>
            <span className="text-grey-300">|</span>
            <span>학생 {studentCount}명</span>
          </div>
        </div>

        {/* 탭 */}
        <div className="px-4 pt-3">
          <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'info'
                  ? 'bg-white text-grey-900 shadow-sm'
                  : 'text-grey-500 hover:text-grey-700'
              }`}
            >
              정보 수정
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'students'
                  ? 'bg-white text-grey-900 shadow-sm'
                  : 'text-grey-500 hover:text-grey-700'
              }`}
            >
              학생 ({studentCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('textbooks')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'textbooks'
                  ? 'bg-white text-grey-900 shadow-sm'
                  : 'text-grey-500 hover:text-grey-700'
              }`}
            >
              교재
            </button>
          </div>
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' ? (
            <form onSubmit={handleSubmit}>
              <div className="p-4">
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
                      <p className="text-xs text-blue-600 mb-1">변경될 반 이름</p>
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
                      {Object.entries(DAY_NAMES).map(([day, dayName]) => (
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
                          {dayName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 수업 시간 - Stage 34: 요일별 개별 시간 지원 */}
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
                                value={dayTimes[day]?.start || '14:00'}
                                onChange={(e) => setDayTimes(prev => ({
                                  ...prev,
                                  [day]: { ...prev[day], start: e.target.value, end: prev[day]?.end || '16:00' }
                                }))}
                                className="flex-1 px-3 py-2 border border-grey-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-grey-400">~</span>
                              <input
                                type="time"
                                value={dayTimes[day]?.end || '16:00'}
                                onChange={(e) => setDayTimes(prev => ({
                                  ...prev,
                                  [day]: { start: prev[day]?.start || '14:00', end: e.target.value }
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
                  {updateMutation.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        {(updateMutation.error as Error).message}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-3 p-4 pt-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !isValid}
                  className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
                >
                  {updateMutation.isPending ? '저장 중...' : '저장하기'}
                </button>
              </div>
            </form>
          ) : activeTab === 'students' ? (
            <ClassStudentsTab classId={classData.id} />
          ) : (
            <div className="p-4">
              <ClassTextbookSection
                classId={classData.id}
                className={classData.name}
                classGrade={classData.grades?.name || extractGradeFromName(classData.name) || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
