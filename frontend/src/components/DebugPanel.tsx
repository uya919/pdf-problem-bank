/**
 * Phase 20-B: Debug Panel Component
 *
 * 개발 환경에서 컨버터 상태 확인 및 디버깅을 위한 패널
 * 접을 수 있는 형태로 HangulUploadPage 하단에 표시
 */
import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, RefreshCw, Play, Bug, Cpu, Clock } from 'lucide-react';
import { debugApi, type DebugStatus, type TestConvertResponse } from '../api/debug';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface DebugPanelProps {
  className?: string;
}

export function DebugPanel({ className = '' }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testInput, setTestInput] = useState('rm A');
  const [testResult, setTestResult] = useState<TestConvertResponse | null>(null);
  const queryClient = useQueryClient();

  // 디버그 상태 조회
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['debug-status'],
    queryFn: debugApi.getStatus,
    enabled: isExpanded,
    refetchInterval: isExpanded ? 5000 : false, // 5초마다 자동 갱신
  });

  // 패턴 정보 조회
  const { data: patterns, isLoading: patternsLoading } = useQuery({
    queryKey: ['debug-patterns'],
    queryFn: debugApi.getPatterns,
    enabled: isExpanded,
  });

  // 테스트 변환
  const testConvertMutation = useMutation({
    mutationFn: (hwpEquation: string) => debugApi.testConvert(hwpEquation),
    onSuccess: (data) => {
      setTestResult(data);
      refetchStatus();
    },
  });

  // 컨버터 리로드
  const reloadMutation = useMutation({
    mutationFn: debugApi.reloadConverter,
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['debug-patterns'] });
    },
  });

  const handleTestConvert = useCallback(() => {
    if (testInput.trim()) {
      testConvertMutation.mutate(testInput);
    }
  }, [testInput, testConvertMutation]);

  const handleReload = useCallback(() => {
    reloadMutation.mutate();
  }, [reloadMutation]);

  // 개발 환경이 아니면 렌더링하지 않음
  if (status && status.environment.is_production) {
    return null;
  }

  return (
    <Card className={`mt-4 ${className}`} padding="sm">
      {/* 헤더 (접기/펼치기) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-grey-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 text-grey-600">
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium">Debug Panel</span>
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded ${
              status.environment.is_development
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {status.environment.environment}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-grey-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-grey-400" />
        )}
      </button>

      {/* 본문 */}
      {isExpanded && (
        <div className="mt-3 space-y-4">
          {/* 상태 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 컨버터 상태 */}
            <div className="bg-grey-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm font-medium text-grey-700">Converter Status</h4>
              </div>
              {statusLoading ? (
                <div className="text-sm text-grey-500">Loading...</div>
              ) : status ? (
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-grey-500">Instance:</span>
                    <span className={status.converter.instance_exists ? 'text-green-600' : 'text-grey-400'}>
                      {status.converter.instance_exists ? 'Active' : 'Not created'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-grey-500">Instance ID:</span>
                    <span className="text-grey-700">
                      {status.converter.instance_id
                        ? `...${String(status.converter.instance_id).slice(-8)}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-grey-500">Auto-reload:</span>
                    <span className={status.features.auto_reload_on_change ? 'text-green-600' : 'text-yellow-600'}>
                      {status.features.auto_reload_on_change ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* 패턴 정보 */}
            <div className="bg-grey-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">Pattern Info</span>
              </div>
              {patternsLoading ? (
                <div className="text-sm text-grey-500">Loading...</div>
              ) : patterns ? (
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-grey-500">Total patterns:</span>
                    <span className="text-grey-700">{patterns.total_patterns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-grey-500">Converter:</span>
                    <span className="text-grey-700">{patterns.converter_class}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* 테스트 변환 */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Test Conversion</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="HWP equation (e.g., rm A)"
                className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                onKeyDown={(e) => e.key === 'Enter' && handleTestConvert()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleTestConvert}
                disabled={testConvertMutation.isPending}
              >
                <Play className="w-3 h-3 mr-1" />
                Test
              </Button>
            </div>

            {/* 변환 결과 */}
            {testResult && (
              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                <div className="text-xs space-y-1 font-mono">
                  <div className="flex gap-2">
                    <span className="text-grey-500 w-16">Input:</span>
                    <span className="text-grey-700">{testResult.input}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-grey-500 w-16">Output:</span>
                    <span className="text-green-700">{testResult.output}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Clock className="w-3 h-3 text-grey-400" />
                    <span className="text-grey-500">{testResult.conversion_time_ms.toFixed(2)} ms</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>

            {status?.features.force_reload_available && (
              <Button
                variant="warning"
                size="sm"
                onClick={handleReload}
                disabled={reloadMutation.isPending}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
                Force Reload Converter
              </Button>
            )}
          </div>

          {/* 리로드 결과 */}
          {reloadMutation.isSuccess && reloadMutation.data && (
            <div className="text-xs p-2 bg-green-50 border border-green-200 rounded text-green-700 font-mono">
              Reloaded: {reloadMutation.data.old_instance_id
                ? `...${String(reloadMutation.data.old_instance_id).slice(-8)}`
                : 'N/A'}
              {' -> '}
              {reloadMutation.data.new_instance_id
                ? `...${String(reloadMutation.data.new_instance_id).slice(-8)}`
                : 'N/A'}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
