/**
 * CompressionProgress - PDF 압축 진행률 표시 컴포넌트
 * Stage 18-G: PDF 압축 기능
 *
 * - 압축 단계별 진행률 표시
 * - 압축 전/후 크기 비교
 * - 압축률 표시
 */

import { FileDown, Check, Loader2 } from 'lucide-react';
import type { CompressionProgress as ProgressType, CompressionResult } from '@/utils/pdfCompressor';
import { formatBytes, formatCompressionRatio } from '@/utils/pdfCompressor';

interface CompressionProgressProps {
  /** 현재 진행 상태 */
  progress: ProgressType | null;
  /** 압축 결과 (완료 시) */
  result: CompressionResult | null;
}

export function CompressionProgress({ progress, result }: CompressionProgressProps) {
  // 결과 표시 (압축 완료)
  if (result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-medium text-green-800">압축 완료</div>
            <div className="text-sm text-green-600 mt-1">
              {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
              <span className="ml-2 font-medium">
                ({formatCompressionRatio(result.compressionRatio)})
              </span>
            </div>
            <div className="text-xs text-green-500 mt-1">
              {result.pageCount}페이지
            </div>
          </div>
        </div>

        {/* 크기 비교 바 */}
        <div className="mt-3">
          <div className="flex items-center gap-2 text-xs text-green-600 mb-1">
            <span>원본</span>
            <div className="flex-1 h-2 bg-green-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: '100%' }} />
            </div>
            <span>{formatBytes(result.originalSize)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-700">
            <span>압축</span>
            <div className="flex-1 h-2 bg-green-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full"
                style={{
                  width: `${(result.compressedSize / result.originalSize) * 100}%`,
                }}
              />
            </div>
            <span>{formatBytes(result.compressedSize)}</span>
          </div>
        </div>
      </div>
    );
  }

  // 진행 중 표시
  if (!progress) return null;

  const stageLabels: Record<ProgressType['stage'], string> = {
    loading: 'PDF 로딩 중',
    processing: '최적화 처리 중',
    saving: 'PDF 저장 중',
    complete: '완료',
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <FileDown className="w-5 h-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-medium text-blue-800">
              {stageLabels[progress.stage]}
            </span>
          </div>
          <div className="text-sm text-blue-600 mt-1">
            {progress.message}
          </div>
        </div>

        <div className="flex-shrink-0 text-sm font-medium text-blue-600">
          {progress.progress}%
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-3">
        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default CompressionProgress;
