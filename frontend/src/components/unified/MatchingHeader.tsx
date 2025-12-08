/**
 * 매칭 헤더 (Phase 31-C)
 *
 * 탭 전환 + 분리 버튼 + 문서 정보
 */
import { FileText, BookOpen, Monitor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMatchingStore } from '../../stores/matchingStore';
import { Button } from '../ui/Button';

export function MatchingHeader() {
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    problemDocName,
    solutionDocName,
    problems,
    links,
  } = useMatchingStore();

  const linkedCount = links.length;
  const totalCount = problems.length;

  return (
    <div className="bg-white border-b px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* 왼쪽: 뒤로가기 + 문서명 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
            title="대시보드로"
          >
            <ArrowLeft className="w-5 h-5 text-grey-600" />
          </button>

          <div className="text-sm text-grey-500 truncate max-w-[200px]">
            {activeTab === 'problem' ? problemDocName : solutionDocName}
          </div>
        </div>

        {/* 중앙: 탭 */}
        <div className="flex bg-grey-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('problem')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'problem'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-grey-600 hover:text-grey-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>문제</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'problem'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-grey-200 text-grey-500'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('solution')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-medium ${
              activeTab === 'solution'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-grey-600 hover:text-grey-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>해설</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'solution'
                ? 'bg-purple-100 text-purple-600'
                : 'bg-grey-200 text-grey-500'
            }`}>
              {linkedCount}/{totalCount}
            </span>
          </button>
        </div>

        {/* 오른쪽: 분리 버튼 */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Step 10에서 구현
              alert('듀얼 윈도우 분리 기능은 Step 10에서 구현됩니다');
            }}
            className="flex items-center gap-2"
          >
            <Monitor className="w-4 h-4" />
            분리
          </Button>
        </div>
      </div>
    </div>
  );
}
