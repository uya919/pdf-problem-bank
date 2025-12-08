/**
 * DocumentPairCard 컴포넌트
 *
 * Phase 22-M: 문서 페어 카드
 * Phase 27-E: 시작하기 버튼으로 개선
 *
 * 문제집-해설집 쌍을 표시하고 듀얼 창으로 열 수 있는 카드
 */
import { FileText, BookOpen, Rocket, Trash2, Link2, Calendar, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { DocumentPair } from '@/api/client';

interface DocumentPairCardProps {
  pair: DocumentPair;
  onOpenDual: (pair: DocumentPair) => void;
  onDelete?: (pairId: string) => void;
}

export function DocumentPairCard({ pair, onOpenDual, onDelete }: DocumentPairCardProps) {
  // 문서 ID에서 파일명 추출 (경로 제거)
  const getPrettyName = (docId: string) => {
    const parts = docId.split(/[/\\]/);
    const fileName = parts[parts.length - 1];
    // .pdf 확장자 제거
    return fileName.replace(/\.pdf$/i, '');
  };

  const problemName = getPrettyName(pair.problem_document_id);
  const solutionName = getPrettyName(pair.solution_document_id);

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-grey-500">문서 페어</span>
          </div>
          {pair.matched_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pair.matched_count}개 매칭
            </Badge>
          )}
        </div>

        {/* 문서 쌍 표시 */}
        <div className="space-y-2 mb-4">
          {/* 문제집 */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-900 truncate" title={pair.problem_document_id}>
              {problemName}
            </span>
            <Badge variant="outline" className="ml-auto text-xs bg-white">
              문제
            </Badge>
          </div>

          {/* 화살표 */}
          <div className="flex justify-center">
            <div className="w-px h-3 bg-grey-300" />
          </div>

          {/* 해설집 */}
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <BookOpen className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-green-900 truncate" title={pair.solution_document_id}>
              {solutionName}
            </span>
            <Badge variant="outline" className="ml-auto text-xs bg-white">
              해설
            </Badge>
          </div>
        </div>

        {/* 생성일 */}
        <div className="flex items-center gap-1 text-xs text-grey-400 mb-4">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(pair.created_at)}</span>
        </div>

        {/* Phase 27-E: 액션 버튼 개선 */}
        <div className="flex gap-2">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => onOpenDual(pair)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-shadow"
            >
              <Rocket className="w-4 h-4 mr-2" />
              듀얼 라벨링 시작
            </Button>
          </motion.div>
          {onDelete && (
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('이 페어를 삭제하시겠습니까?')) {
                  onDelete(pair.id);
                }
              }}
              className="text-grey-400 hover:text-red-600 hover:bg-red-50"
              title="페어 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
