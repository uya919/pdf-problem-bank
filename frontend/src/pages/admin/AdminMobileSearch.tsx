/**
 * AdminMobileSearch - 관리자 모바일 검색 페이지 (목업)
 *
 * UX 연구 리포트 기반:
 * - 통합 검색 (학생, 반)
 * - 검색 결과 카드
 * - 빠른 액션
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminBottomNav } from '../../components/admin/mobile/AdminBottomNav';
import {
  Search,
  X,
  Users,
  User,
  Phone,
  FileText,
  ChevronRight,
  Clock,
} from 'lucide-react';

// ============ Mock 데이터 ============

const mockRecentSearches = ['김민수', '중3A', '박지민', '고1B'];

const mockStudentResults = [
  {
    id: '1',
    name: '김민수',
    class: '중3A',
    subject: '수학',
    stats: { attendance: 92, homework: 85 },
  },
  {
    id: '2',
    name: '김민수',
    class: '초6B',
    subject: '수학',
    stats: { attendance: 100, homework: 95 },
  },
];

const mockClassResults = [
  {
    id: '1',
    name: '중3A반',
    teacher: '김수학',
    studentCount: 8,
    subject: '수학',
    schedule: '월/수/금 17:00',
  },
];

// ============ 컴포넌트 ============

export default function AdminMobileSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 검색 결과 표시 여부
  const showResults = query.length >= 2;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* 검색 헤더 */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="학생, 반 이름으로 검색"
              className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-600 font-medium"
          >
            취소
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4">
        {!showResults ? (
          /* 최근 검색 */
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">최근 검색</h3>
              <button className="text-xs text-gray-500">전체 삭제</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mockRecentSearches.map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(term)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 검색 결과 */
          <div className="space-y-4">
            {/* 학생 검색 결과 */}
            {mockStudentResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900">학생</span>
                  <span className="text-xs text-gray-500">
                    {mockStudentResults.length}명
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {mockStudentResults.map((student) => (
                    <div key={student.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {student.name}
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded">
                              {student.class}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            출결 {student.stats.attendance}% · 숙제 {student.stats.homework}%
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                      </div>

                      {/* 빠른 액션 */}
                      <div className="flex gap-2 mt-3 ml-13">
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                          <Phone className="w-3 h-3" />
                          연락
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                          <FileText className="w-3 h-3" />
                          메모
                        </button>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                          상세 보기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 반 검색 결과 */}
            {mockClassResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-900">반</span>
                  <span className="text-xs text-gray-500">
                    {mockClassResults.length}개
                  </span>
                </div>

                <div className="divide-y divide-gray-50">
                  {mockClassResults.map((cls) => (
                    <div key={cls.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {cls.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {cls.studentCount}명
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {cls.teacher} · {cls.schedule}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 하단 네비게이션 */}
      <AdminBottomNav badges={{ notice: 3 }} />
    </div>
  );
}
