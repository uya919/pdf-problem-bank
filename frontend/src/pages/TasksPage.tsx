/**
 * Tasks Page (Phase 6-7)
 *
 * Batch job management and monitoring
 */
import { useState, useMemo } from 'react';
import {
  Activity,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Pause,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { TaskCard } from '../components/ui/TaskCard';
import type { Task, TaskStatus } from '../components/ui/TaskCard';
import { useToast } from '../components/Toast';
import { AnimatePresence } from 'framer-motion';

// Mock data for demonstration
const MOCK_TASKS: Task[] = [
  {
    id: '1',
    name: '베이직쎈 수학2 2022_본문.pdf',
    type: 'pdf_analysis',
    status: 'running',
    progress: 65,
    total: 150,
    current: 98,
    created_at: Date.now() - 1000 * 60 * 15, // 15 minutes ago
    started_at: Date.now() - 1000 * 60 * 10, // 10 minutes ago
  },
  {
    id: '2',
    name: '수학의 정석 미적분.pdf',
    type: 'block_detection',
    status: 'completed',
    progress: 100,
    total: 200,
    current: 200,
    created_at: Date.now() - 1000 * 60 * 60, // 1 hour ago
    started_at: Date.now() - 1000 * 60 * 50,
    completed_at: Date.now() - 1000 * 60 * 30,
  },
  {
    id: '3',
    name: '개념원리 수학I.pdf',
    type: 'problem_export',
    status: 'pending',
    progress: 0,
    total: 180,
    current: 0,
    created_at: Date.now() - 1000 * 60 * 5,
  },
  {
    id: '4',
    name: '쎈 수학II 해설집.pdf',
    type: 'pdf_analysis',
    status: 'failed',
    progress: 45,
    total: 120,
    current: 54,
    created_at: Date.now() - 1000 * 60 * 120,
    started_at: Date.now() - 1000 * 60 * 115,
    error: 'PDF 파일이 손상되어 처리할 수 없습니다.',
  },
  {
    id: '5',
    name: '일괄 업로드 작업 (10개 파일)',
    type: 'batch_upload',
    status: 'paused',
    progress: 30,
    total: 10,
    current: 3,
    created_at: Date.now() - 1000 * 60 * 25,
    started_at: Date.now() - 1000 * 60 * 20,
  },
];

type FilterType = 'all' | TaskStatus;

export function TasksPage() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: tasks.length,
      running: tasks.filter((t) => t.status === 'running').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      paused: tasks.filter((t) => t.status === 'paused').length,
    };
  }, [tasks]);

  // Task actions
  const handlePause = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: 'paused' as TaskStatus } : task))
    );
    showToast('작업이 일시정지되었습니다', 'info');
  };

  const handleResume = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, status: 'running' as TaskStatus } : task))
    );
    showToast('작업이 재개되었습니다', 'success');
  };

  const handleCancel = (taskId: string) => {
    if (confirm('이 작업을 취소하시겠습니까?')) {
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      showToast('작업이 취소되었습니다', 'success');
    }
  };

  const handleNewTask = () => {
    showToast('새 작업 추가 기능은 개발 중입니다', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">작업 관리</h1>
              <p className="mt-2 text-amber-100">배치 작업 및 진행 상황을 모니터링하세요</p>
            </div>
          </div>
          <button
            onClick={handleNewTask}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            새 작업 추가
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card
          className={`cursor-pointer transition-all ${
            filter === 'all' ? 'ring-2 ring-grey-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-grey-600 uppercase">전체</p>
                <p className="text-2xl font-bold text-grey-900 mt-1">{stats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-grey-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            filter === 'running' ? 'ring-2 ring-blue-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('running')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">실행 중</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{stats.running}</p>
              </div>
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            filter === 'pending' ? 'ring-2 ring-grey-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('pending')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-grey-600 uppercase">대기 중</p>
                <p className="text-2xl font-bold text-grey-900 mt-1">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-grey-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            filter === 'paused' ? 'ring-2 ring-amber-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('paused')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase">일시정지</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{stats.paused}</p>
              </div>
              <Pause className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            filter === 'completed' ? 'ring-2 ring-emerald-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('completed')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase">완료</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            filter === 'failed' ? 'ring-2 ring-red-400 shadow-md' : 'hover:shadow-md'
          }`}
          onClick={() => setFilter('failed')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase">실패</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Indicator */}
      {filter !== 'all' && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              필터: <span className="font-bold">{filter}</span> ({filteredTasks.length}개 작업)
            </span>
          </div>
          <button
            onClick={() => setFilter('all')}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
          >
            필터 해제
          </button>
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto h-20 w-20 rounded-full bg-grey-100 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-grey-400" />
            </div>
            <h3 className="text-xl font-semibold text-grey-900">
              {filter === 'all' ? '작업이 없습니다' : `${filter} 상태의 작업이 없습니다`}
            </h3>
            <p className="text-grey-600">
              {filter === 'all'
                ? '새 작업을 추가하거나 PDF를 업로드하여 시작하세요.'
                : '다른 필터를 선택하거나 전체 작업을 확인해보세요.'}
            </p>
          </div>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-grey-900">배치 작업 관리 안내</h3>
              <p className="mt-2 text-sm text-grey-600">
                현재는 데모 데이터로 UI를 표시하고 있습니다. 향후 다음 기능이 추가될 예정입니다:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-grey-600 list-disc list-inside">
                <li>실제 백그라운드 작업 처리 (Python Celery + Redis)</li>
                <li>폴더 일괄 업로드 및 자동 처리</li>
                <li>실시간 진행률 WebSocket 업데이트</li>
                <li>작업 우선순위 관리</li>
                <li>작업 히스토리 및 로그 조회</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
