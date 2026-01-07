/**
 * ContactBottomSheet - 연락하기 바텀시트
 *
 * 목업: classes-page-v3-segment-control.html
 * - 학생 본인 연락처
 * - 보호자 연락처
 * - 전화/문자 버튼
 */
import { useEffect } from 'react';

interface ContactInfo {
  phone: string;
  label: string; // "본인", "보호자 (어머니)" 등
}

interface ContactBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  contacts: ContactInfo[];
}

export function ContactBottomSheet({
  isOpen,
  onClose,
  studentName,
  contacts,
}: ContactBottomSheetProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSms = (phone: string) => {
    window.location.href = `sms:${phone}`;
  };

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50" />

      {/* 바텀시트 */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-[#D1D5DB] rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* 타이틀 */}
          <h3 className="text-lg font-bold text-[#191F28] mb-4">
            {studentName} 학생 연락
          </h3>

          {/* 연락처 목록 */}
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📱</span>
                  <div>
                    <div className="text-sm text-[#333D4B]">{contact.phone}</div>
                    <div className="text-xs text-[#8B95A1]">{contact.label}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(contact.phone)}
                    className="px-3 py-1.5 bg-[#3182F6] text-white text-xs font-medium rounded-lg hover:bg-[#1B64DA] transition-colors"
                  >
                    전화
                  </button>
                  <button
                    onClick={() => handleSms(contact.phone)}
                    className="px-3 py-1.5 bg-[#E5E8EB] text-[#333D4B] text-xs font-medium rounded-lg hover:bg-[#D1D5DB] transition-colors"
                  >
                    문자
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-[#8B95A1] text-sm"
          >
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease;
        }
      `}</style>
    </div>
  );
}

export default ContactBottomSheet;
