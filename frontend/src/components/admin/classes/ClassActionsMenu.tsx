/**
 * 반 액션 메뉴
 * 수정, 비활성화/활성화, 삭제
 *
 * Stage 11-12: 드롭다운 위치 자동 조정
 * - 화면 하단에 가까우면 위로 열림
 */
import { useState, useRef, useEffect } from 'react';
import { ClassData } from '../../../api/classes';
import { useDeactivateClass, useActivateClass, useDeleteClass } from '../../../hooks/useClasses';

interface ClassActionsMenuProps {
  classData: ClassData;
  onEdit: () => void;
}

export function ClassActionsMenu({ classData, onEdit }: ClassActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const deactivateMutation = useDeactivateClass();
  const activateMutation = useActivateClass();
  const deleteMutation = useDeleteClass();

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowDeleteConfirm(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 메뉴 열릴 때 위치 계산
  const handleToggleMenu = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 180; // 예상 메뉴 높이
      setOpenUpward(spaceBelow < menuHeight);
    }
    setIsOpen(!isOpen);
  };

  const handleToggleActive = async () => {
    try {
      if (classData.is_active) {
        await deactivateMutation.mutateAsync(classData.id);
      } else {
        await activateMutation.mutateAsync(classData.id);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('상태 변경 실패:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(classData.id);
      setIsOpen(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={handleToggleMenu}
        className="p-2 text-grey-400 hover:text-grey-600 hover:bg-grey-100 rounded-lg transition-colors"
      >
        ...
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 w-40 bg-white rounded-xl shadow-lg border border-grey-200 py-1 z-50 ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* 수정 */}
          <button
            onClick={() => {
              onEdit();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-grey-700 hover:bg-grey-50"
          >
            수정
          </button>

          {/* 비활성화/활성화 */}
          <button
            onClick={handleToggleActive}
            disabled={deactivateMutation.isPending || activateMutation.isPending}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-grey-50 disabled:opacity-50 ${
              classData.is_active ? 'text-amber-600' : 'text-green-600'
            }`}
          >
            {classData.is_active ? '비활성화' : '활성화'}
          </button>

          <div className="border-t border-grey-100 my-1" />

          {/* 삭제 */}
          {showDeleteConfirm ? (
            <div className="px-3 py-2">
              <p className="text-xs text-red-600 mb-2">정말 삭제하시겠습니까?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-2 py-1 text-xs bg-grey-100 rounded hover:bg-grey-200"
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '...' : '삭제'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-grey-50"
            >
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
