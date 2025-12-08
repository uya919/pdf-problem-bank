/**
 * Task Card Component (Phase 6-7)
 *
 * Displays individual task/job status and progress
 */
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from './Badge';
import { cn } from '../../lib/utils';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface Task {
  id: string;
  name: string;
  type: 'pdf_analysis' | 'block_detection' | 'problem_export' | 'batch_upload';
  status: TaskStatus;
  progress: number; // 0-100
  total: number;
  current: number;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  error?: string;
}

interface TaskCardProps {
  task: Task;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-grey-600',
    bgColor: 'bg-grey-100',
    borderColor: 'border-grey-200',
    label: '대기 중',
    variant: 'secondary' as const,
  },
  running: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: '실행 중',
    variant: 'primary' as const,
  },
  paused: {
    icon: Pause,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: '일시정지',
    variant: 'warning' as const,
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: '완료',
    variant: 'success' as const,
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '실패',
    variant: 'error' as const,
  },
};

const TASK_TYPE_LABELS = {
  pdf_analysis: 'PDF 분석',
  block_detection: '블록 검출',
  problem_export: '문제 내보내기',
  batch_upload: '일괄 업로드',
};

export function TaskCard({ task, onPause, onResume, onCancel }: TaskCardProps) {
  const config = STATUS_CONFIG[task.status];
  const Icon = config.icon;

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getElapsedTime = () => {
    if (!task.started_at) return '-';
    const elapsed = Date.now() - task.started_at;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    }
    return `${seconds}초`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'rounded-xl border-2 p-6 transition-all duration-300',
        config.bgColor,
        config.borderColor,
        task.status === 'running' && 'shadow-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
              config.bgColor,
              'ring-2 ring-offset-2',
              task.status === 'running'
                ? 'ring-blue-600'
                : task.status === 'completed'
                ? 'ring-emerald-600'
                : task.status === 'failed'
                ? 'ring-red-600'
                : 'ring-grey-300'
            )}
          >
            <Icon
              className={cn('w-6 h-6', config.color, task.status === 'running' && 'animate-spin')}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-grey-900 truncate" title={task.name}>
              {task.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {TASK_TYPE_LABELS[task.type]}
              </Badge>
              <Badge variant={config.variant} className="text-xs">
                {config.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.status === 'running' && onPause && (
            <button
              onClick={() => onPause(task.id)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              title="일시정지"
            >
              <Pause className="w-4 h-4 text-grey-700" />
            </button>
          )}
          {task.status === 'paused' && onResume && (
            <button
              onClick={() => onResume(task.id)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              title="재개"
            >
              <Play className="w-4 h-4 text-grey-700" />
            </button>
          )}
          {(task.status === 'running' || task.status === 'paused' || task.status === 'pending') &&
            onCancel && (
              <button
                onClick={() => onCancel(task.id)}
                className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                title="취소"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            )}
        </div>
      </div>

      {/* Progress Bar */}
      {(task.status === 'running' || task.status === 'paused') && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-grey-600 mb-2">
            <span>
              {task.current} / {task.total}
            </span>
            <span className="font-medium">{task.progress}%</span>
          </div>
          <div className="h-2 bg-grey-200 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                task.status === 'running'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-grey-500">생성 시간</p>
          <p className="font-medium text-grey-900">{formatTime(task.created_at)}</p>
        </div>
        {task.started_at && (
          <div>
            <p className="text-grey-500">경과 시간</p>
            <p className="font-medium text-grey-900">{getElapsedTime()}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {task.status === 'failed' && task.error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-900">오류 발생</p>
              <p className="text-red-700 mt-1">{task.error}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
