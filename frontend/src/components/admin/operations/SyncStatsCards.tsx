/**
 * SyncStatsCards - 동기화 통계 카드
 */
import type { SyncStats } from '../../../api/sync';

interface SyncStatsCardsProps {
  stats: SyncStats;
}

export function SyncStatsCards({ stats }: SyncStatsCardsProps) {
  return (
    <div className="max-w-lg mx-auto">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">+{stats.new}</p>
          <p className="text-sm text-green-700">신규</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.updated}</p>
          <p className="text-sm text-blue-700">업데이트</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.deleted}</p>
          <p className="text-sm text-red-700">퇴원</p>
        </div>
      </div>

      {/* 상세 목록 */}
      {stats.new > 0 && (
        <div className="bg-green-50 rounded-xl p-4 mb-3">
          <h4 className="text-sm font-medium text-green-800 mb-2">신규 학생</h4>
          <ul className="space-y-1 text-sm text-green-700">
            {stats.new_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name} ({s.grade || '미정'})</li>
            ))}
            {stats.new_students.length > 5 && (
              <li className="text-green-600">... 외 {stats.new_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.updated > 0 && (
        <div className="bg-blue-50 rounded-xl p-4 mb-3">
          <h4 className="text-sm font-medium text-blue-800 mb-2">정보 변경</h4>
          <ul className="space-y-1 text-sm text-blue-700">
            {stats.updated_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name}: 연락처 변경</li>
            ))}
            {stats.updated_students.length > 5 && (
              <li className="text-blue-600">... 외 {stats.updated_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.deleted > 0 && (
        <div className="bg-red-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">퇴원 처리</h4>
          <ul className="space-y-1 text-sm text-red-700">
            {stats.deleted_students.slice(0, 5).map((s, i) => (
              <li key={i}>• {s.name} ({s.grade || '미정'})</li>
            ))}
            {stats.deleted_students.length > 5 && (
              <li className="text-red-600">... 외 {stats.deleted_students.length - 5}명</li>
            )}
          </ul>
        </div>
      )}

      {stats.new === 0 && stats.updated === 0 && stats.deleted === 0 && (
        <div className="bg-grey-50 rounded-xl p-4 text-center">
          <p className="text-grey-600">변경사항이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
