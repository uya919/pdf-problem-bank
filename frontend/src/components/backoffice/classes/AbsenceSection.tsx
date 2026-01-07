/**
 * AbsenceSection - 기간별 결석자 섹션
 *
 * 목업: classes-page-v3-segment-control.html
 * - 날짜별 결석자 그룹핑
 * - 결석 사유 표시
 * - 연락 버튼
 */
import { useState } from 'react';
import { ContactBottomSheet } from '../modals/ContactBottomSheet';

export interface AbsentStudent {
  id: string;
  name: string;
  reason?: string; // "병원", "무단" 등
  contacts?: Array<{ phone: string; label: string }>;
}

export interface AbsenceByDate {
  date: string; // "12/11 (수)"
  isToday?: boolean;
  students: AbsentStudent[];
}

interface AbsenceSectionProps {
  absences: AbsenceByDate[];
}

export function AbsenceSection({ absences }: AbsenceSectionProps) {
  const [contactSheet, setContactSheet] = useState<{
    isOpen: boolean;
    studentName: string;
    contacts: Array<{ phone: string; label: string }>;
  }>({
    isOpen: false,
    studentName: '',
    contacts: [],
  });

  // 총 결석자 수 계산
  const totalAbsent = absences.reduce(
    (sum, day) => sum + day.students.length,
    0
  );

  const openContact = (student: AbsentStudent) => {
    setContactSheet({
      isOpen: true,
      studentName: student.name,
      contacts: student.contacts || [
        { phone: '010-1234-5678', label: '본인' },
        { phone: '010-9876-5432', label: '보호자 (어머니)' },
      ],
    });
  };

  const closeContact = () => {
    setContactSheet((prev) => ({ ...prev, isOpen: false }));
  };

  // 결석자 없음
  if (totalAbsent === 0) {
    return (
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚨</span>
              <span className="text-sm font-semibold text-[#191F28]">결석</span>
            </div>
          </div>
          <div className="text-center py-4">
            <span className="text-2xl">👏</span>
            <p className="text-sm text-[#22C55E] font-medium mt-2">
              전원 출석!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="p-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚨</span>
              <span className="text-sm font-semibold text-[#191F28]">결석</span>
            </div>
            <span className="text-xs text-[#8B95A1]">총 {totalAbsent}명</span>
          </div>

          {/* 날짜별 결석자 */}
          <div className="space-y-3">
            {absences.map((day, dayIndex) => (
              <div key={dayIndex}>
                {/* 날짜 라벨 */}
                <div className="text-xs text-[#6B7684] mb-1.5">
                  {day.date}
                  {day.isToday && ' - 오늘'}
                </div>

                {/* 결석자 칩들 */}
                <div className="flex flex-wrap gap-2">
                  {day.students.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        student.reason === '무단'
                          ? 'bg-[#FEF3F2]'
                          : 'bg-[#FFF7ED]'
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          student.reason === '무단'
                            ? 'text-[#B42318]'
                            : 'text-[#C2410C]'
                        }`}
                      >
                        {student.name}
                      </span>
                      {student.reason && (
                        <span className="text-xs text-[#8B95A1]">
                          ({student.reason})
                        </span>
                      )}
                      <button
                        onClick={() => openContact(student)}
                        className="text-xs text-[#3182F6] font-medium hover:underline"
                      >
                        연락
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 연락하기 바텀시트 */}
      <ContactBottomSheet
        isOpen={contactSheet.isOpen}
        onClose={closeContact}
        studentName={contactSheet.studentName}
        contacts={contactSheet.contacts}
      />
    </>
  );
}

export default AbsenceSection;
