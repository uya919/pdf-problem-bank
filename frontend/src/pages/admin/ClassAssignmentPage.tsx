/**
 * Phase 7: ClassAssignmentPage
 *
 * PC 일괄 반 배정 페이지
 * - 학부/학년/상태 토글 필터
 * - 학생 테이블 + 다중 선택
 * - 키보드 단축키 지원
 * - 일괄 반 배정 기능
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayoutV5 } from '../../components/admin/layout';
import { PageHeader } from '../../components/admin/common';
import { useStudents, useClasses } from '../../hooks/useBackofficeData';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { StudentWithEnrollments, Class } from '../../types/database';

// ============================================
// Types
// ============================================

type Division = 'elementary' | 'middle' | 'high';
type AssignmentStatus = 'all' | 'unassigned' | 'assigned';

interface FilterState {
  division: Division;
  grade: number;
  status: AssignmentStatus;
}

// Mock 학생 데이터 (미배정 학생 포함)
interface MockStudent {
  id: string;
  name: string;
  grade: string;
  school: string;
  phone: string;
  parent_phone: string;
  status: 'active' | 'inactive';
  enrollments: { id: string; status: string; class: { id: string; name: string } }[];
}

// ============================================
// Constants
// ============================================

const DIVISION_CONFIG = {
  elementary: { label: '초등', grades: [3, 4, 5, 6], prefix: '초' },
  middle: { label: '중등', grades: [1, 2, 3], prefix: '중' },
  high: { label: '고등', grades: [1, 2, 3], prefix: '고' },
};

// Mock 학생 데이터 (미배정 학생 포함)
const MOCK_STUDENTS: MockStudent[] = [
  // 미배정 학생들
  { id: 'u1', name: '김미배정', grade: '중1', school: '혜윰중학교', phone: '010-1111-1001', parent_phone: '010-2222-1001', status: 'active', enrollments: [] },
  { id: 'u2', name: '이미배정', grade: '중1', school: '혜윰중학교', phone: '010-1111-1002', parent_phone: '010-2222-1002', status: 'active', enrollments: [] },
  { id: 'u3', name: '박미배정', grade: '중2', school: '혜윰중학교', phone: '010-1111-1003', parent_phone: '010-2222-1003', status: 'active', enrollments: [] },
  { id: 'u4', name: '최미배정', grade: '중2', school: '다른중학교', phone: '010-1111-1004', parent_phone: '010-2222-1004', status: 'active', enrollments: [] },
  { id: 'u5', name: '정미배정', grade: '중3', school: '혜윰중학교', phone: '010-1111-1005', parent_phone: '010-2222-1005', status: 'active', enrollments: [] },
  { id: 'u6', name: '강미배정', grade: '고1', school: '혜윰고등학교', phone: '010-1111-1006', parent_phone: '010-2222-1006', status: 'active', enrollments: [] },
  { id: 'u7', name: '윤미배정', grade: '고2', school: '혜윰고등학교', phone: '010-1111-1007', parent_phone: '010-2222-1007', status: 'active', enrollments: [] },
  { id: 'u8', name: '임미배정', grade: '초3', school: '혜윰초등학교', phone: '010-1111-1008', parent_phone: '010-2222-1008', status: 'active', enrollments: [] },
  { id: 'u9', name: '한미배정', grade: '초4', school: '혜윰초등학교', phone: '010-1111-1009', parent_phone: '010-2222-1009', status: 'active', enrollments: [] },
  { id: 'u10', name: '송미배정', grade: '초5', school: '혜윰초등학교', phone: '010-1111-1010', parent_phone: '010-2222-1010', status: 'active', enrollments: [] },

  // 배정된 학생들
  { id: 'a1', name: '김배정', grade: '중1', school: '혜윰중학교', phone: '010-1111-2001', parent_phone: '010-2222-2001', status: 'active', enrollments: [{ id: 'e1', status: 'active', class: { id: 'c1', name: '중1 수학A' } }] },
  { id: 'a2', name: '이배정', grade: '중2', school: '혜윰중학교', phone: '010-1111-2002', parent_phone: '010-2222-2002', status: 'active', enrollments: [{ id: 'e2', status: 'active', class: { id: 'c2', name: '중2 수학A' } }] },
  { id: 'a3', name: '박배정', grade: '중3', school: '혜윰중학교', phone: '010-1111-2003', parent_phone: '010-2222-2003', status: 'active', enrollments: [{ id: 'e3', status: 'active', class: { id: 'c3', name: '중3 수학A' } }] },
];

// Mock 반 데이터
const MOCK_CLASSES: { id: string; name: string; grade: string; subject: string; level: string }[] = [
  { id: 'c1', name: '중1 수학A', grade: '중1', subject: '수학', level: '정규' },
  { id: 'c2', name: '중1 수학B', grade: '중1', subject: '수학', level: '심화' },
  { id: 'c3', name: '중2 수학A', grade: '중2', subject: '수학', level: '정규' },
  { id: 'c4', name: '중2 수학B', grade: '중2', subject: '수학', level: '기초' },
  { id: 'c5', name: '중3 수학A', grade: '중3', subject: '수학', level: '정규' },
  { id: 'c6', name: '고1 수학A', grade: '고1', subject: '수학', level: '정규' },
  { id: 'c7', name: '고2 수학A', grade: '고2', subject: '수학', level: '정규' },
  { id: 'c8', name: '초3 수학A', grade: '초3', subject: '수학', level: '정규' },
  { id: 'c9', name: '초4 수학A', grade: '초4', subject: '수학', level: '정규' },
];

// ============================================
// Helpers
// ============================================

/** 학생의 학년 문자열 추출 */
function getGradeString(student: MockStudent | StudentWithEnrollments): string {
  const grade = student.grade;
  if (!grade) return '';
  if (typeof grade === 'object' && grade !== null && 'name' in grade) {
    return (grade as { name: string }).name || '';
  }
  return String(grade);
}

/** 학년 문자열에서 학부/학년 파싱 */
function parseGrade(gradeStr: string): { division: Division; grade: number } | null {
  const match = gradeStr.match(/^(초|중|고)(\d)$/);
  if (!match) return null;

  const divisionMap: Record<string, Division> = { '초': 'elementary', '중': 'middle', '고': 'high' };
  return {
    division: divisionMap[match[1]],
    grade: parseInt(match[2]),
  };
}

/** 학생이 미배정인지 확인 */
function isUnassigned(student: MockStudent | StudentWithEnrollments): boolean {
  return !student.enrollments || student.enrollments.length === 0 ||
    student.enrollments.every(e => e.status !== 'active');
}

// ============================================
// Main Component
// ============================================

export default function ClassAssignmentPage() {
  const navigate = useNavigate();

  // 필터 상태 (기본값: 중등, 1학년, 미배정)
  const [filter, setFilter] = useState<FilterState>({
    division: 'middle',
    grade: 1,
    status: 'unassigned',
  });

  // 선택 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // 반 선택 모달
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // 배정 성공 토스트
  const [showSuccess, setShowSuccess] = useState(false);

  // Supabase 데이터 조회
  const { data: supabaseStudents } = useStudents({ status: 'active' });
  const { data: supabaseClasses } = useClasses({});

  // 실제 사용할 데이터
  const allStudents = useMemo(() => {
    if (isSupabaseConfigured && supabaseStudents && supabaseStudents.length > 0) {
      return supabaseStudents;
    }
    return MOCK_STUDENTS;
  }, [supabaseStudents]);

  const allClasses = useMemo(() => {
    if (isSupabaseConfigured && supabaseClasses && supabaseClasses.length > 0) {
      return supabaseClasses;
    }
    return MOCK_CLASSES;
  }, [supabaseClasses]);

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    const config = DIVISION_CONFIG[filter.division];
    const targetGrade = `${config.prefix}${filter.grade}`;

    return allStudents.filter((student) => {
      const gradeStr = getGradeString(student);

      // 학년 필터
      if (gradeStr !== targetGrade) return false;

      // 상태 필터
      if (filter.status === 'unassigned' && !isUnassigned(student)) return false;
      if (filter.status === 'assigned' && isUnassigned(student)) return false;

      return true;
    });
  }, [allStudents, filter]);

  // 필터링된 반 목록 (현재 학년에 맞는 반만)
  const filteredClasses = useMemo(() => {
    const config = DIVISION_CONFIG[filter.division];
    const targetGrade = `${config.prefix}${filter.grade}`;

    return allClasses.filter((cls) => {
      const clsGrade = 'grade' in cls ? cls.grade : '';
      return clsGrade === targetGrade;
    });
  }, [allClasses, filter]);

  // 전체 선택/해제
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  }, [selectedIds, filteredStudents]);

  // 선택 취소
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  // 개별 선택 (Shift 범위 선택 지원)
  const handleRowClick = useCallback((id: string, event: React.MouseEvent) => {
    const isShiftKey = event.shiftKey;
    const isCtrlKey = event.ctrlKey || event.metaKey;

    setSelectedIds((prev) => {
      const newSet = new Set(prev);

      if (isShiftKey && lastSelectedId) {
        // 범위 선택
        const ids = filteredStudents.map(s => s.id);
        const startIdx = ids.indexOf(lastSelectedId);
        const endIdx = ids.indexOf(id);
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

        for (let i = from; i <= to; i++) {
          newSet.add(ids[i]);
        }
      } else if (isCtrlKey) {
        // 토글 선택
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      } else {
        // 단일 선택
        if (newSet.has(id) && newSet.size === 1) {
          newSet.delete(id);
        } else {
          newSet.clear();
          newSet.add(id);
        }
      }

      return newSet;
    });

    setLastSelectedId(id);
  }, [lastSelectedId, filteredStudents]);

  // 배정 실행
  const handleAssign = useCallback(() => {
    if (selectedIds.size === 0 || !selectedClassId) return;

    // TODO: Supabase enrollments 테이블에 insert
    console.log('배정 실행:', {
      studentIds: Array.from(selectedIds),
      classId: selectedClassId,
    });

    // 성공 처리
    setShowClassModal(false);
    setSelectedClassId(null);
    clearSelection();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }, [selectedIds, selectedClassId, clearSelection]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      // Ctrl+숫자: 학부 변경
      if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const divisions: Division[] = ['elementary', 'middle', 'high'];
        const newDivision = divisions[parseInt(e.key) - 1];
        setFilter(prev => ({
          ...prev,
          division: newDivision,
          grade: 1, // 학부 변경 시 1학년으로 리셋
        }));
        clearSelection();
        return;
      }

      // 숫자: 학년 변경
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const grade = parseInt(e.key);
        const config = DIVISION_CONFIG[filter.division];
        if (config.grades.includes(grade)) {
          setFilter(prev => ({ ...prev, grade }));
          clearSelection();
        }
        return;
      }

      // Ctrl+A: 전체 선택
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        toggleSelectAll();
        return;
      }

      // Escape: 선택 취소 또는 모달 닫기
      if (e.key === 'Escape') {
        if (showClassModal) {
          setShowClassModal(false);
          setSelectedClassId(null);
        } else {
          clearSelection();
        }
        return;
      }

      // Enter: 배정 모달 열기 또는 배정 실행
      if (e.key === 'Enter') {
        if (showClassModal && selectedClassId) {
          handleAssign();
        } else if (selectedIds.size > 0) {
          setShowClassModal(true);
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filter, selectedIds, showClassModal, selectedClassId, toggleSelectAll, clearSelection, handleAssign]);

  const config = DIVISION_CONFIG[filter.division];

  return (
    <AdminLayoutV5>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="반 배정"
          description="미배정 학생을 반에 배정합니다"
          actions={
            <button
              onClick={() => navigate('/admin/students')}
              className="px-4 py-2 text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
            >
              ← 학생 관리로 돌아가기
            </button>
          }
        />

        {/* 필터 영역 */}
        <div className="bg-white border border-grey-200 rounded-xl p-4">
          <div className="flex items-center gap-6">
            {/* 학부 토글 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500 mr-2">학부</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                {(['elementary', 'middle', 'high'] as Division[]).map((div, idx) => (
                  <button
                    key={div}
                    onClick={() => {
                      setFilter(prev => ({ ...prev, division: div, grade: 1 }));
                      clearSelection();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter.division === div
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-600 hover:text-grey-900'
                    }`}
                  >
                    {DIVISION_CONFIG[div].label}
                    <span className="ml-1 text-xs text-grey-400">Ctrl+{idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 학년 토글 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-grey-500 mr-2">학년</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                {config.grades.map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setFilter(prev => ({ ...prev, grade: g }));
                      clearSelection();
                    }}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      filter.grade === g
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-600 hover:text-grey-900'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* 상태 토글 */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-grey-500 mr-2">상태</span>
              <div className="flex gap-1 p-1 bg-grey-100 rounded-lg">
                {[
                  { value: 'unassigned', label: '미배정' },
                  { value: 'assigned', label: '배정됨' },
                  { value: 'all', label: '전체' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setFilter(prev => ({ ...prev, status: opt.value as AssignmentStatus }));
                      clearSelection();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filter.status === opt.value
                        ? 'bg-white text-grey-900 shadow-sm'
                        : 'text-grey-600 hover:text-grey-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 키보드 단축키 힌트 */}
          <div className="mt-3 pt-3 border-t border-grey-100 flex items-center gap-4 text-xs text-grey-400">
            <span>단축키:</span>
            <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">1-{config.grades.length}</kbd> 학년</span>
            <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">Ctrl+A</kbd> 전체선택</span>
            <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">Shift+클릭</kbd> 범위선택</span>
            <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">Enter</kbd> 배정</span>
            <span><kbd className="px-1.5 py-0.5 bg-grey-100 rounded">Esc</kbd> 취소</span>
          </div>
        </div>

        {/* 선택 툴바 */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-blue-700 font-medium">
                {selectedIds.size}명 선택됨
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                선택 취소
              </button>
            </div>
            <button
              onClick={() => setShowClassModal(true)}
              className="px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              반 배정하기
            </button>
          </div>
        )}

        {/* 학생 테이블 */}
        <section className="bg-white border border-grey-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-grey-100 flex items-center justify-between">
            <h3 className="font-semibold text-grey-900 flex items-center gap-2">
              <span>👥</span>
              {config.prefix}{filter.grade} 학생 목록
            </h3>
            <span className="text-sm text-grey-500">
              {filteredStudents.length}명
            </span>
          </div>

          {filteredStudents.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-grey-50 text-xs font-semibold text-grey-500 uppercase">
                  <th className="px-5 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredStudents.length && filteredStudents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-grey-300"
                    />
                  </th>
                  <th className="px-5 py-3 text-left">이름</th>
                  <th className="px-5 py-3 text-left">학교</th>
                  <th className="px-5 py-3 text-left">연락처</th>
                  <th className="px-5 py-3 text-left">학부모 연락처</th>
                  <th className="px-5 py-3 text-left">현재 반</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grey-100">
                {filteredStudents.map((student) => {
                  const isSelected = selectedIds.has(student.id);
                  const enrolledClass = student.enrollments?.find(e => e.status === 'active')?.class?.name;

                  return (
                    <tr
                      key={student.id}
                      onClick={(e) => handleRowClick(student.id, e)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-grey-50'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-grey-300"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-grey-200 flex items-center justify-center text-grey-600 text-sm font-medium">
                            {student.name?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-grey-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-grey-600">{student.school || '-'}</td>
                      <td className="px-5 py-4 text-grey-600">{student.phone || '-'}</td>
                      <td className="px-5 py-4 text-grey-600">{student.parent_phone || '-'}</td>
                      <td className="px-5 py-4">
                        {enrolledClass ? (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded">
                            {enrolledClass}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-50 text-orange-600 text-sm rounded">
                            미배정
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-grey-500">
              <div className="text-4xl mb-3">📭</div>
              {filter.status === 'unassigned'
                ? `${config.prefix}${filter.grade} 미배정 학생이 없습니다`
                : `${config.prefix}${filter.grade} 학생이 없습니다`}
            </div>
          )}
        </section>
      </div>

      {/* 반 선택 모달 */}
      {showClassModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowClassModal(false);
              setSelectedClassId(null);
            }}
          />
          <div className="relative bg-white rounded-2xl w-[500px] max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-grey-200">
              <h2 className="text-lg font-bold text-grey-900">반 선택</h2>
              <p className="text-sm text-grey-500 mt-1">
                {selectedIds.size}명의 학생을 배정할 반을 선택하세요
              </p>
            </div>

            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedClassId === cls.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-grey-200 hover:border-grey-300'
                    }`}
                  >
                    <div className="font-medium text-grey-900">{cls.name}</div>
                    <div className="text-sm text-grey-500 mt-1">
                      {'level' in cls && (cls as any).level}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center text-grey-500 py-8">
                  {config.prefix}{filter.grade} 학년에 등록된 반이 없습니다
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-grey-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowClassModal(false);
                  setSelectedClassId(null);
                }}
                className="px-4 py-2 text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedClassId}
                className={`px-6 py-2 font-medium rounded-lg transition-colors ${
                  selectedClassId
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-grey-200 text-grey-400 cursor-not-allowed'
                }`}
              >
                배정하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 성공 토스트 */}
      {showSuccess && (
        <div className="fixed bottom-6 right-6 z-[300] bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <span>✓</span>
          <span>배정이 완료되었습니다</span>
        </div>
      )}
    </AdminLayoutV5>
  );
}
