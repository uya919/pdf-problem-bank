/**
 * ClassSelectorBottomSheet - 반 선택 바텀시트
 * RecordsPage에서 분리됨
 */
import type { ClassInfo } from './types';

interface ClassSelectorBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClassId: string | null;
  onSelect: (id: string | null) => void;
  classes: ClassInfo[];
}

export function ClassSelectorBottomSheet({
  isOpen,
  onClose,
  selectedClassId,
  onSelect,
  classes,
}: ClassSelectorBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-fade-in"
        onClick={onClose}
      />
      {/* 바텀시트 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up safe-area-bottom">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#E5E8EB] rounded-full" />
        </div>
        {/* 헤더 */}
        <div className="px-5 pb-3">
          <div className="text-[17px] font-bold text-[#191F28]">반 선택</div>
        </div>
        {/* 옵션 목록 */}
        <div className="px-4 pb-8 pb-safe">
          {/* 전체 반 */}
          <button
            onClick={() => onSelect(null)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-1 transition-colors ${
              selectedClassId === null ? 'bg-[#F2F4F6]' : 'hover:bg-[#F9FAFB]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3182F6] via-[#00C896] to-[#FF9800] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[15px] font-medium text-[#191F28]">전체 반</div>
                <div className="text-[12px] text-[#8B95A1]">
                  {classes.reduce((sum, c) => sum + c.studentCount, 0)}명
                </div>
              </div>
            </div>
            {selectedClassId === null && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>

          {/* 개별 반 */}
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => onSelect(cls.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl mb-1 transition-colors ${
                selectedClassId === cls.id ? 'bg-[#F2F4F6]' : 'hover:bg-[#F9FAFB]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[14px] font-bold"
                  style={{ backgroundColor: cls.color }}
                >
                  {cls.shortName}
                </div>
                <div className="text-left">
                  <div className="text-[15px] font-medium text-[#191F28]">{cls.name}</div>
                  <div className="text-[12px] text-[#8B95A1]">{cls.studentCount}명</div>
                </div>
              </div>
              {selectedClassId === cls.id && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3182F6" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default ClassSelectorBottomSheet;
