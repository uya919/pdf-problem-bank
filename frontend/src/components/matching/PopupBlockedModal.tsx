/**
 * 팝업 차단 안내 모달
 *
 * Phase 22-F-5: 팝업이 차단되었을 때 사용자에게 안내하는 모달
 */
import { AlertTriangle, ExternalLink, RefreshCw, Monitor } from 'lucide-react';

interface PopupBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onSingleWindow: () => void;
}

export function PopupBlockedModal({
  isOpen,
  onClose,
  onRetry,
  onSingleWindow,
}: PopupBlockedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center gap-3 text-amber-600">
          <div className="rounded-full bg-amber-100 p-2">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">팝업이 차단되었습니다</h2>
        </div>

        {/* 본문 */}
        <div className="mt-4 space-y-4 text-grey-600">
          <p>
            듀얼 윈도우 매칭을 사용하려면 팝업 허용이 필요합니다.
          </p>

          {/* 안내 단계 */}
          <div className="rounded-lg bg-grey-50 p-4">
            <h3 className="mb-3 font-medium text-grey-900">팝업 허용 방법:</h3>
            <ol className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                  1
                </span>
                <span>
                  브라우저 주소창 오른쪽의{' '}
                  <span className="inline-flex items-center gap-1 rounded bg-grey-200 px-1.5 py-0.5 text-xs font-mono">
                    <ExternalLink className="h-3 w-3" />
                  </span>
                  {' '}아이콘을 클릭하세요
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                  2
                </span>
                <span>
                  "이 사이트의 팝업 항상 허용"을 선택하세요
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                  3
                </span>
                <span>
                  아래 "다시 시도" 버튼을 클릭하세요
                </span>
              </li>
            </ol>
          </div>

          {/* 브라우저별 추가 안내 */}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-grey-700 hover:text-grey-900">
              브라우저별 상세 안내
            </summary>
            <div className="mt-2 space-y-2 pl-4 text-grey-500">
              <p>
                <strong>Chrome:</strong> 주소창 오른쪽 팝업 차단 아이콘 클릭 → "항상 허용" 선택
              </p>
              <p>
                <strong>Edge:</strong> 주소창 오른쪽 팝업 차단 아이콘 클릭 → "허용" 선택
              </p>
              <p>
                <strong>Firefox:</strong> 설정 → 개인 정보 및 보안 → 팝업 창 차단 예외 추가
              </p>
            </div>
          </details>
        </div>

        {/* 버튼 */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={onRetry}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-5 w-5" />
            다시 시도
          </button>
          <button
            onClick={onSingleWindow}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-grey-300 px-4 py-3 font-medium text-grey-700 transition-colors hover:bg-grey-50"
          >
            <Monitor className="h-5 w-5" />
            단일 창으로 진행
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-grey-500 transition-colors hover:text-grey-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
