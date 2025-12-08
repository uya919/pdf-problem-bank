/**
 * Phase 40: 간소화된 라벨링 헤더
 *
 * 토스 스타일의 미니멀한 헤더
 * - 뒤로가기 + 문서명 + 진행률 + 내보내기
 */
import { ArrowLeft, HelpCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LabelingHeaderProps {
  documentName: string;
  progress: { completed: number; total: number };
  onExport: () => void;
  onSettingsClick?: () => void;
  exportDisabled?: boolean;
}

export function LabelingHeader({
  documentName,
  progress,
  onExport,
  onSettingsClick,
  exportDisabled = false,
}: LabelingHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-grey-100">
      {/* 왼쪽: 뒤로가기 + 문서 정보 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-grey-600" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-grey-900">{documentName}</h1>
          <p className="text-sm text-grey-500">
            {progress.completed}/{progress.total} 완료
          </p>
        </div>
      </div>

      {/* 오른쪽: 도움말 + 설정 + 내보내기 */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
          title="도움말"
        >
          <HelpCircle className="w-5 h-5 text-grey-500" />
        </button>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 hover:bg-grey-100 rounded-lg transition-colors"
            title="설정"
          >
            <Settings className="w-5 h-5 text-grey-500" />
          </button>
        )}
        <button
          onClick={onExport}
          disabled={exportDisabled}
          className="px-4 py-2 bg-toss-blue text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:bg-grey-300 disabled:cursor-not-allowed transition-colors"
        >
          내보내기
        </button>
      </div>
    </header>
  );
}
