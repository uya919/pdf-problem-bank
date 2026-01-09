/**
 * DataSourceBadge - 데이터 소스 연결 상태 표시
 */
import { Circle } from 'lucide-react';
import { isSupabaseConfigured } from '../../../lib/supabase';

export function DataSourceBadge() {
  return (
    <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
      isSupabaseConfigured ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
    }`}>
      <Circle className={`w-2 h-2 ${isSupabaseConfigured ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'}`} />
      {isSupabaseConfigured ? 'Supabase' : 'Mock 데이터'}
    </span>
  );
}
