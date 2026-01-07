/**
 * 학생 메모 섹션 컴포넌트
 */
import { useState } from 'react';
import { StudentNote } from './index';

interface StudentNotesProps {
  notes: StudentNote[];
  onAddNote?: (content: string) => void;
}

export function StudentNotes({ notes, onAddNote }: StudentNotesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');

  // 날짜 포맷 (MM/DD)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleAdd = () => {
    if (newNote.trim() && onAddNote) {
      onAddNote(newNote.trim());
      setNewNote('');
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setNewNote('');
    setIsAdding(false);
  };

  return (
    <div className="mx-4 mt-4 mb-6 bg-white rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-[#191F28]">메모</div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-[#3182F6] font-medium"
          >
            + 추가
          </button>
        )}
      </div>

      {/* 새 메모 입력 */}
      {isAdding && (
        <div className="mb-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="메모를 입력하세요..."
            className="w-full p-3 bg-[#F9FAFB] rounded-xl text-sm placeholder-[#8B95A1] focus:outline-none focus:ring-2 focus:ring-[#3182F6] resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 bg-[#F2F4F6] text-[#6B7684] rounded-lg text-sm font-medium"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={!newNote.trim()}
              className="flex-1 py-2 bg-[#3182F6] text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* 메모 목록 */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-[#F9FAFB] rounded-xl p-3">
              <div className="text-xs text-[#8B95A1]">{formatDate(note.date)}</div>
              <div className="text-sm text-[#4E5968] mt-1 whitespace-pre-wrap">
                {note.content}
              </div>
            </div>
          ))}
        </div>
      ) : !isAdding ? (
        <div className="py-6 text-center text-sm text-[#8B95A1]">
          메모가 없습니다
        </div>
      ) : null}
    </div>
  );
}
