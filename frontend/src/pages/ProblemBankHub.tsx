/**
 * Phase 23-D: 문제은행 허브 페이지
 *
 * 크롭/한글 문제은행을 통합하는 탭 기반 허브 UI
 * - 이미지 크롭 탭: CropProblemBank
 * - 한글 파일 탭: HangulProblemBank (기존 IntegratedProblemBankPage 내용)
 */
import { useState, useMemo } from 'react';
import { Image, FileText, Trash2, BarChart3 } from 'lucide-react';
import { CropProblemBank } from '../components/problemBank/CropProblemBank';
import { useAllExportedProblems } from '../hooks/useDocuments';

type TabType = 'crop' | 'hangul' | 'stats';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function ProblemBankHub() {
  const [activeTab, setActiveTab] = useState<TabType>('crop');

  // 크롭 문제 개수 조회
  const { data: cropData } = useAllExportedProblems({ limit: 0 });
  const cropCount = cropData?.total || 0;

  // TODO: 한글 문제 개수는 별도 API 필요
  const hangulCount = 0;

  const tabs: TabConfig[] = useMemo(() => [
    {
      id: 'crop',
      label: '이미지 크롭',
      icon: <Image className="w-5 h-5" />,
      description: 'PDF에서 크롭된 문제 이미지',
    },
    {
      id: 'hangul',
      label: '한글 파일',
      icon: <FileText className="w-5 h-5" />,
      description: 'HML/HWPX에서 파싱된 문제',
    },
    {
      id: 'stats',
      label: '통계',
      icon: <BarChart3 className="w-5 h-5" />,
      description: '문제은행 통계',
    },
  ], []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">문제은행</h1>
        <p className="mt-1 text-indigo-100">
          크롭된 이미지와 한글 파일에서 추출한 문제를 관리합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-grey-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-grey-600">이미지 크롭 문제</p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">{cropCount}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Image className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-grey-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-grey-600">한글 파일 문제</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{hangulCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-grey-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-grey-600">총 문제 수</p>
              <p className="mt-1 text-2xl font-bold text-grey-800">{cropCount + hangulCount}</p>
            </div>
            <div className="w-12 h-12 bg-grey-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-grey-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 탭 바 */}
      <div className="bg-white rounded-lg border border-grey-200">
        <div className="border-b border-grey-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-grey-500 hover:text-grey-700 hover:border-grey-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.id === 'crop' && cropCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">
                    {cropCount}
                  </span>
                )}
                {tab.id === 'hangul' && hangulCount > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded-full">
                    {hangulCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-4">
          {activeTab === 'crop' && <CropProblemBank />}

          {activeTab === 'hangul' && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-grey-300 mb-4" />
              <p className="text-grey-500">한글 파일 문제은행</p>
              <p className="text-sm text-grey-400 mt-1">
                HML/HWPX 파일에서 파싱된 문제가 여기에 표시됩니다
              </p>
              <a
                href="/integrated-problem-bank"
                className="mt-4 inline-block px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                통합 문제은행으로 이동
              </a>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto text-grey-300 mb-4" />
              <p className="text-grey-500">문제은행 통계</p>
              <p className="text-sm text-grey-400 mt-1">
                문제 유형, 난이도, 출처별 통계를 확인할 수 있습니다
              </p>
              <p className="mt-4 text-xs text-grey-400">(추후 구현 예정)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
