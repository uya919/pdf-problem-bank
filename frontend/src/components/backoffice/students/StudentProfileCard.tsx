/**
 * 학생 프로필 카드 (상세 페이지용)
 */
import { Student, StudentAlert, getAvatarColors } from './index';

interface StudentProfileCardProps {
  student: Student;
  alerts: StudentAlert[];
  onCall?: () => void;
  onMessage?: () => void;
}

export function StudentProfileCard({
  student,
  alerts,
  onCall,
  onMessage,
}: StudentProfileCardProps) {
  const avatarColors = getAvatarColors(alerts);
  const initial = student.name.charAt(0);

  const handleCall = () => {
    if (onCall) {
      onCall();
    } else if (student.parentPhone) {
      window.location.href = `tel:${student.parentPhone}`;
    }
  };

  const handleMessage = () => {
    if (onMessage) {
      onMessage();
    } else if (student.parentPhone) {
      window.location.href = `sms:${student.parentPhone}`;
    }
  };

  return (
    <div className="bg-white mx-4 mt-4 rounded-2xl p-5">
      <div className="flex items-center gap-4">
        {/* 프로필 아바타 */}
        <div
          className={`w-16 h-16 ${avatarColors.bg} rounded-full flex items-center justify-center`}
        >
          <span className={`text-2xl font-bold ${avatarColors.text}`}>
            {initial}
          </span>
        </div>

        {/* 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#191F28]">
              {student.name}
            </span>
            <span className="text-sm text-[#8B95A1]">{student.grade}</span>
          </div>
          <div className="text-sm text-[#6B7684] mt-1">
            {student.className}
            {student.schedule && ` · ${student.schedule}`}
          </div>
        </div>
      </div>

      {/* 연락처 버튼 */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleCall}
          className="flex-1 py-3 bg-[#3182F6] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#1B64DA] transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          전화
        </button>
        <button
          onClick={handleMessage}
          className="flex-1 py-3 bg-[#F2F4F6] text-[#6B7684] rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#E5E8EB] transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          문자
        </button>
      </div>
    </div>
  );
}
