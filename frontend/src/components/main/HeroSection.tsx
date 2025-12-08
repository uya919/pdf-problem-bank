/**
 * HeroSection Component (Phase 34.5-I)
 *
 * 하이브리드 문서 선택 UI
 * - 스마트 검색 (fuzzy search)
 * - 최근 사용 (1클릭 시작)
 * - 전체 찾아보기 (계층적 탐색)
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { SmartSearchBox } from './SmartSearchBox';
import { RecentUsedSection } from './RecentUsedSection';
import { BrowseAllSection } from './BrowseAllSection';
import { useDocumentIndex } from '../../hooks/useDocumentIndex';
import { useRecentUsed } from '../../hooks/useRecentUsed';
import type { RecentUsedItem } from '../../hooks/useRecentUsed';
import { useWorkSessionStore } from '../../stores/workSessionStore';
import type { DocumentCombo } from '../../lib/documentParser';

export function HeroSection() {
  const navigate = useNavigate();
  const { index, isLoading } = useDocumentIndex();
  const { recentItems, addRecentUsed } = useRecentUsed();
  const { createSession, findSessionByDocument, isLoading: sessionLoading } = useWorkSessionStore();

  // Phase 35: 세션 확인 중 상태
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  // 세션 시작 핸들러 (Phase 35: 스마트 재개)
  const handleStartSession = useCallback(
    async (combo: DocumentCombo) => {
      if (!combo.problemDocId || !combo.solutionDocId) {
        // 불완전한 조합 - 안내
        alert(`${combo.series}의 문제 또는 해설 파일이 없습니다.\n두 파일 모두 필요합니다.`);
        return;
      }

      setIsCheckingSession(true);

      try {
        // Phase 35: 기존 활성 세션 확인
        const existingSession = await findSessionByDocument(combo.problemDocId);

        if (existingSession) {
          // 기존 세션 재개
          console.log('[Phase 35] Resuming existing session:', existingSession.sessionId);

          // 최근 사용에 추가
          addRecentUsed({
            comboId: combo.id,
            grade: combo.grade,
            course: combo.course,
            series: combo.series,
            problemDocId: combo.problemDocId,
            solutionDocId: combo.solutionDocId,
          });

          navigate(`/work/${existingSession.sessionId}`);
          return;
        }

        // 새 세션 생성
        console.log('[Phase 35] Creating new session');

        // 최근 사용에 추가
        addRecentUsed({
          comboId: combo.id,
          grade: combo.grade,
          course: combo.course,
          series: combo.series,
          problemDocId: combo.problemDocId,
          solutionDocId: combo.solutionDocId,
        });

        // 세션 생성
        const session = await createSession({
          problemDocumentId: combo.problemDocId,
          problemDocumentName: combo.problemDocId,
          solutionDocumentId: combo.solutionDocId,
          solutionDocumentName: combo.solutionDocId,
          name: `${combo.grade} ${combo.course} - ${combo.series}`,
        });

        navigate(`/work/${session.sessionId}`);
      } catch (error) {
        console.error('[Phase 35] 세션 처리 실패:', error);
        alert('세션 처리에 실패했습니다. 다시 시도해주세요.');
      } finally {
        setIsCheckingSession(false);
      }
    },
    [createSession, findSessionByDocument, navigate, addRecentUsed]
  );

  // 최근 사용에서 시작
  const handleRecentStart = useCallback(
    (item: RecentUsedItem) => {
      const combo: DocumentCombo = {
        id: item.comboId,
        schoolLevel: item.grade.startsWith('초')
          ? 'elementary'
          : item.grade.startsWith('중')
            ? 'middle'
            : 'high',
        grade: item.grade,
        course: item.course,
        series: item.series,
        problemDocId: item.problemDocId,
        solutionDocId: item.solutionDocId,
        isComplete: true,
      };
      handleStartSession(combo);
    },
    [handleStartSession]
  );

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-toss-blue/5 via-white to-purple-500/5 rounded-2xl p-8 mb-8 border border-grey-100">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin w-8 h-8 border-2 border-grey-200 border-t-toss-blue rounded-full" />
            <p className="text-grey-500 text-sm">문서 목록을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 35: 세션 확인/생성 중 오버레이
  const isProcessing = sessionLoading || isCheckingSession;
  const LoadingOverlay = isProcessing && (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-2 border-grey-200 border-t-toss-blue rounded-full" />
        <p className="text-grey-600 font-medium">
          {isCheckingSession ? '세션 확인 중...' : '세션 생성 중...'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative bg-gradient-to-br from-toss-blue/5 via-white to-purple-500/5 rounded-2xl p-8 mb-8 border border-grey-100">
      {LoadingOverlay}

      {/* 타이틀 */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-toss-blue/10 text-toss-blue rounded-full text-sm font-medium mb-3">
          <Sparkles className="w-4 h-4" />
          새 작업
        </div>
        <h2 className="text-2xl font-bold text-grey-900 mb-2">라벨링을 시작하세요</h2>
        <p className="text-grey-600">
          학년, 과정, 시리즈를 검색하거나 최근 사용에서 바로 시작하세요
        </p>
      </div>

      {/* 스마트 검색창 */}
      <div className="max-w-xl mx-auto mb-6">
        <SmartSearchBox combos={index?.allCombos || []} onSelect={handleStartSession} />
      </div>

      {/* 구분선 */}
      <div className="my-6 border-t border-grey-200" />

      {/* 최근 사용 */}
      <RecentUsedSection items={recentItems} onStart={handleRecentStart} />

      {/* 전체 찾아보기 */}
      {index && (
        <>
          <div className="my-6" />
          <BrowseAllSection index={index} onSelect={handleStartSession} />
        </>
      )}

      {/* 문서 없음 안내 */}
      {!index && !isLoading && (
        <div className="text-center py-8 text-grey-500">
          <p>등록된 문서가 없습니다</p>
          <p className="text-sm mt-1">우측 상단의 파일 추가 버튼으로 PDF를 업로드하세요</p>
        </div>
      )}
    </div>
  );
}
