/**
 * Solution Matching Page (Phase 6-6)
 *
 * Match problems with their solutions
 */
import { useState } from 'react';
import {
  Link2,
  FileText,
  BookOpen,
  ArrowRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

// Mock data structures
interface Problem {
  id: string;
  document_id: string;
  page_index: number;
  group_id: string;
  preview_url: string;
  matched_solution_id?: string;
}

interface Solution {
  id: string;
  document_id: string;
  page_index: number;
  group_id: string;
  preview_url: string;
  matched_problem_id?: string;
}

interface Match {
  problem_id: string;
  solution_id: string;
}

// Mock data
const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'p1',
    document_id: '베이직쎈_수학2_문제',
    page_index: 5,
    group_id: 'L1',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 'p2',
    document_id: '베이직쎈_수학2_문제',
    page_index: 5,
    group_id: 'L2',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 'p3',
    document_id: '베이직쎈_수학2_문제',
    page_index: 5,
    group_id: 'R1',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 'p4',
    document_id: '베이직쎈_수학2_문제',
    page_index: 6,
    group_id: 'L1',
    preview_url: '/api/placeholder/200/300',
  },
];

const MOCK_SOLUTIONS: Solution[] = [
  {
    id: 's1',
    document_id: '베이직쎈_수학2_해설',
    page_index: 5,
    group_id: 'L1',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 's2',
    document_id: '베이직쎈_수학2_해설',
    page_index: 5,
    group_id: 'L2',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 's3',
    document_id: '베이직쎈_수학2_해설',
    page_index: 5,
    group_id: 'R1',
    preview_url: '/api/placeholder/200/300',
  },
  {
    id: 's4',
    document_id: '베이직쎈_수학2_해설',
    page_index: 6,
    group_id: 'L1',
    preview_url: '/api/placeholder/200/300',
  },
];

export function SolutionMatchingPage() {
  const { showToast } = useToast();
  const [problems, setProblems] = useState<Problem[]>(MOCK_PROBLEMS);
  const [solutions, setSolutions] = useState<Solution[]>(MOCK_SOLUTIONS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [draggingProblem, setDraggingProblem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Auto-match based on page and group
  const handleAutoMatch = () => {
    const newMatches: Match[] = [];
    const unmatchedProblems = problems.filter((p) => !p.matched_solution_id);
    const unmatchedSolutions = solutions.filter((s) => !s.matched_problem_id);

    unmatchedProblems.forEach((problem) => {
      const matchingSolution = unmatchedSolutions.find(
        (solution) =>
          solution.page_index === problem.page_index && solution.group_id === problem.group_id
      );

      if (matchingSolution) {
        newMatches.push({
          problem_id: problem.id,
          solution_id: matchingSolution.id,
        });
      }
    });

    if (newMatches.length > 0) {
      setMatches([...matches, ...newMatches]);

      // Update matched status
      setProblems((prev) =>
        prev.map((p) => {
          const match = newMatches.find((m) => m.problem_id === p.id);
          return match ? { ...p, matched_solution_id: match.solution_id } : p;
        })
      );

      setSolutions((prev) =>
        prev.map((s) => {
          const match = newMatches.find((m) => m.solution_id === s.id);
          return match ? { ...s, matched_problem_id: match.problem_id } : s;
        })
      );

      showToast(`${newMatches.length}개의 자동 매칭이 완료되었습니다`, 'success');
    } else {
      showToast('자동 매칭 가능한 항목이 없습니다', 'info');
    }
  };

  // Manual match
  const handleManualMatch = () => {
    if (!selectedProblem || !selectedSolution) {
      showToast('문제와 해설을 모두 선택해주세요', 'warning');
      return;
    }

    const newMatch: Match = {
      problem_id: selectedProblem,
      solution_id: selectedSolution,
    };

    setMatches([...matches, newMatch]);

    setProblems((prev) =>
      prev.map((p) => (p.id === selectedProblem ? { ...p, matched_solution_id: selectedSolution } : p))
    );

    setSolutions((prev) =>
      prev.map((s) => (s.id === selectedSolution ? { ...s, matched_problem_id: selectedProblem } : s))
    );

    setSelectedProblem(null);
    setSelectedSolution(null);
    showToast('매칭이 완료되었습니다', 'success');
  };

  // Remove match
  const handleRemoveMatch = (matchToRemove: Match) => {
    setMatches(matches.filter((m) => m !== matchToRemove));

    setProblems((prev) =>
      prev.map((p) => (p.id === matchToRemove.problem_id ? { ...p, matched_solution_id: undefined } : p))
    );

    setSolutions((prev) =>
      prev.map((s) =>
        s.id === matchToRemove.solution_id ? { ...s, matched_problem_id: undefined } : s
      )
    );

    showToast('매칭이 해제되었습니다', 'info');
  };

  // Drag and drop handlers
  const handleDragStart = (problemId: string) => {
    setDraggingProblem(problemId);
  };

  const handleDragEnd = () => {
    if (draggingProblem && dropTarget) {
      // Create match via drag and drop
      const newMatch: Match = {
        problem_id: draggingProblem,
        solution_id: dropTarget,
      };

      setMatches([...matches, newMatch]);

      setProblems((prev) =>
        prev.map((p) => (p.id === draggingProblem ? { ...p, matched_solution_id: dropTarget } : p))
      );

      setSolutions((prev) =>
        prev.map((s) => (s.id === dropTarget ? { ...s, matched_problem_id: draggingProblem } : s))
      );

      showToast('드래그로 매칭이 완료되었습니다', 'success');
    }

    setDraggingProblem(null);
    setDropTarget(null);
  };

  const handleSolutionHover = (solutionId: string, isHovering: boolean) => {
    if (draggingProblem && isHovering) {
      setDropTarget(solutionId);
    } else if (!isHovering && dropTarget === solutionId) {
      setDropTarget(null);
    }
  };

  const unmatchedProblems = problems.filter((p) => !p.matched_solution_id);
  const unmatchedSolutions = solutions.filter((s) => !s.matched_problem_id);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">해설 연결</h1>
              <p className="mt-2 text-purple-100">문제와 해설을 매칭하여 연결하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleAutoMatch}
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              자동 매칭
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase">전체 문제</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{problems.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase">전체 해설</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{solutions.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase">매칭 완료</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{matches.length}</p>
              </div>
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase">미매칭</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {unmatchedProblems.length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matching Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problems List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              문제 목록 ({unmatchedProblems.length}개 미매칭)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {unmatchedProblems.map((problem) => (
                <motion.div
                  key={problem.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={0.1}
                  onDragStart={() => handleDragStart(problem.id)}
                  onDragEnd={handleDragEnd}
                  whileDrag={{
                    scale: 1.05,
                    opacity: 0.8,
                    zIndex: 50,
                    cursor: 'grabbing',
                  }}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all',
                    draggingProblem === problem.id
                      ? 'border-blue-500 bg-blue-100 cursor-grabbing'
                      : selectedProblem === problem.id
                      ? 'border-blue-500 bg-blue-50 cursor-grab'
                      : 'border-grey-200 hover:border-blue-300 bg-white cursor-grab'
                  )}
                  onClick={() => !draggingProblem && setSelectedProblem(problem.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-grey-100 rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-grey-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-grey-900 truncate" title={problem.document_id}>
                        P{problem.page_index + 1}-{problem.group_id}
                      </p>
                      <p className="text-xs text-grey-500 truncate">{problem.document_id}</p>
                    </div>
                    {selectedProblem === problem.id && !draggingProblem && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                    {draggingProblem === problem.id && (
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="flex-shrink-0"
                      >
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

              {unmatchedProblems.length === 0 && (
                <div className="text-center py-12 text-grey-500">
                  <Check className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm font-medium">모든 문제가 매칭되었습니다!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Matching Control */}
        <Card className="flex flex-col">
          <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="text-center space-y-6">
              {selectedProblem && selectedSolution ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <Link2 className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-grey-900">매칭 준비 완료</h3>
                    <p className="text-sm text-grey-600 mt-2">
                      문제와 해설을 연결하시겠습니까?
                    </p>
                  </div>
                  <Button onClick={handleManualMatch} className="w-full">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    매칭 실행
                  </Button>
                  <button
                    onClick={() => {
                      setSelectedProblem(null);
                      setSelectedSolution(null);
                    }}
                    className="text-sm text-grey-600 hover:text-grey-900"
                  >
                    선택 취소
                  </button>
                </>
              ) : (
                <>
                  {draggingProblem ? (
                    <>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <ArrowRight className="w-10 h-10 text-white" />
                        </motion.div>
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-semibold text-grey-900">드래그 중...</h3>
                        <p className="text-sm text-grey-600 mt-2">
                          해설 카드 위에 놓아서 매칭하세요
                        </p>
                      </div>
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-xs text-purple-600 font-medium"
                      >
                        드롭 가능 영역이 초록색으로 표시됩니다
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-grey-100 rounded-full flex items-center justify-center mx-auto">
                        <Link2 className="w-10 h-10 text-grey-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-grey-900">수동 매칭</h3>
                        <p className="text-sm text-grey-600 mt-2">
                          드래그 앤 드롭 또는 클릭 선택으로 매칭하세요
                        </p>
                      </div>
                      <div className="space-y-2 text-xs text-grey-500">
                        <div className="flex items-center gap-2 justify-center">
                          {selectedProblem ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <X className="w-4 h-4 text-grey-400" />
                          )}
                          <span>문제 선택</span>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                          {selectedSolution ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <X className="w-4 h-4 text-grey-400" />
                          )}
                          <span>해설 선택</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Solutions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              해설 목록 ({unmatchedSolutions.length}개 미매칭)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {unmatchedSolutions.map((solution) => (
                <motion.div
                  key={solution.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={draggingProblem ? { scale: 1.02 } : {}}
                  className={cn(
                    'p-4 rounded-lg border-2 cursor-pointer transition-all relative',
                    dropTarget === solution.id
                      ? 'border-emerald-500 bg-emerald-100 shadow-lg ring-2 ring-emerald-500 ring-offset-2'
                      : selectedSolution === solution.id
                      ? 'border-purple-500 bg-purple-50'
                      : draggingProblem
                      ? 'border-purple-300 bg-purple-50/50 hover:border-purple-400'
                      : 'border-grey-200 hover:border-purple-300 bg-white'
                  )}
                  onClick={() => !draggingProblem && setSelectedSolution(solution.id)}
                  onMouseEnter={() => handleSolutionHover(solution.id, true)}
                  onMouseLeave={() => handleSolutionHover(solution.id, false)}
                >
                  {/* Drop target indicator */}
                  {dropTarget === solution.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 bg-emerald-500/10 rounded-lg pointer-events-none"
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 bg-grey-100 rounded flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-grey-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-grey-900 truncate" title={solution.document_id}>
                        S{solution.page_index + 1}-{solution.group_id}
                      </p>
                      <p className="text-xs text-grey-500 truncate">{solution.document_id}</p>
                    </div>
                    {selectedSolution === solution.id && !draggingProblem && (
                      <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    )}
                    {dropTarget === solution.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}

              {unmatchedSolutions.length === 0 && (
                <div className="text-center py-12 text-grey-500">
                  <Check className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
                  <p className="text-sm font-medium">모든 해설이 매칭되었습니다!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matched Pairs */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              매칭된 쌍 ({matches.length}개)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <AnimatePresence>
                {matches.map((match, index) => {
                  const problem = problems.find((p) => p.id === match.problem_id);
                  const solution = solutions.find((s) => s.id === match.solution_id);
                  if (!problem || !solution) return null;

                  return (
                    <motion.div
                      key={`${match.problem_id}-${match.solution_id}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                    >
                      <Badge variant="secondary">{index + 1}</Badge>

                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">
                            P{problem.page_index + 1}-{problem.group_id}
                          </span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-grey-400" />

                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">
                            S{solution.page_index + 1}-{solution.group_id}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveMatch(match)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="매칭 해제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-grey-900">해설 연결 시스템 안내</h3>
              <p className="mt-2 text-sm text-grey-600">
                현재는 데모 데이터로 UI를 표시하고 있습니다. 다음 방법으로 매칭할 수 있습니다:
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-grey-900">드래그 앤 드롭</h4>
                  </div>
                  <p className="text-sm text-grey-600">
                    왼쪽 문제 카드를 드래그하여 오른쪽 해설 카드 위에 놓으세요. 드롭 가능한 영역이 초록색으로 강조됩니다.
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-grey-900">클릭 선택</h4>
                  </div>
                  <p className="text-sm text-grey-600">
                    문제와 해설을 각각 클릭한 후 중앙의 "매칭 실행" 버튼을 누르세요.
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-grey-900">자동 매칭</h4>
                  </div>
                  <p className="text-sm text-grey-600">
                    페이지와 그룹 ID가 일치하는 항목을 자동으로 연결합니다.
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-amber-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <h4 className="font-medium text-grey-900">향후 추가 예정</h4>
                  </div>
                  <p className="text-sm text-grey-600">
                    실제 이미지 프리뷰, 고급 매칭 알고리즘, 백엔드 저장 기능 등이 추가될 예정입니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
