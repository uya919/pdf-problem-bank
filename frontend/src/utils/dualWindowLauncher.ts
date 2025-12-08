/**
 * 듀얼 창 열기 유틸리티
 *
 * Phase 22-M: 원클릭 듀얼 실행
 *
 * 문제집과 해설집을 각각 별도 창으로 열어 매칭 세션을 시작
 */

import { api } from '@/api/client';
import type { DocumentPair } from '@/api/client';

export interface DualWindowOptions {
  /** 창 너비 (기본: 화면의 절반) */
  windowWidth?: number;
  /** 창 높이 (기본: 화면 높이) */
  windowHeight?: number;
  /** 세션 이름 (선택) */
  sessionName?: string;
}

export interface DualLaunchResult {
  success: boolean;
  sessionId?: string;
  problemWindow?: Window | null;
  solutionWindow?: Window | null;
  error?: string;
}

/**
 * 고유 세션 ID 생성
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 듀얼 창으로 문제집-해설집 열기
 */
export async function launchDualWindows(
  pair: DocumentPair,
  options: DualWindowOptions = {}
): Promise<DualLaunchResult> {
  try {
    // 세션 ID 생성
    const sessionId = generateSessionId();

    // 화면 크기 계산
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const windowWidth = options.windowWidth || Math.floor(screenWidth / 2);
    const windowHeight = options.windowHeight || screenHeight;

    // URL 생성
    const baseUrl = window.location.origin;
    const problemUrl = `${baseUrl}/labeling?` + new URLSearchParams({
      documentId: pair.problem_document_id,
      sessionId,
      role: 'problem'
    }).toString();

    const solutionUrl = `${baseUrl}/labeling?` + new URLSearchParams({
      documentId: pair.solution_document_id,
      sessionId,
      role: 'solution'
    }).toString();

    // 문제 창 열기 (왼쪽)
    const problemWindow = window.open(
      problemUrl,
      `problem-${sessionId}`,
      `width=${windowWidth},height=${windowHeight},left=0,top=0,menubar=no,toolbar=no,location=no,status=no`
    );

    // 약간의 지연 후 해설 창 열기 (오른쪽)
    await new Promise(resolve => setTimeout(resolve, 100));

    const solutionWindow = window.open(
      solutionUrl,
      `solution-${sessionId}`,
      `width=${windowWidth},height=${windowHeight},left=${windowWidth},top=0,menubar=no,toolbar=no,location=no,status=no`
    );

    // 팝업 차단 확인
    if (!problemWindow || !solutionWindow) {
      return {
        success: false,
        error: '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.'
      };
    }

    // 백엔드에 매칭 세션 생성 (선택적)
    try {
      await api.createMatchingSession({
        name: options.sessionName || `듀얼 세션 - ${new Date().toLocaleString('ko-KR')}`,
        problemDocumentId: pair.problem_document_id,
        solutionDocumentId: pair.solution_document_id
      });
    } catch (e) {
      // 세션 생성 실패해도 창은 정상 동작
      console.warn('[Phase 22-M] 매칭 세션 생성 실패 (무시됨):', e);
    }

    console.log(`[Phase 22-M] 듀얼 창 실행 완료: sessionId=${sessionId}`);

    return {
      success: true,
      sessionId,
      problemWindow,
      solutionWindow
    };
  } catch (error) {
    console.error('[Phase 22-M] 듀얼 창 실행 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 개별 문서 2개로 듀얼 창 열기
 */
export async function launchDualWindowsFromDocs(
  problemDocId: string,
  solutionDocId: string,
  options: DualWindowOptions = {}
): Promise<DualLaunchResult> {
  // 임시 페어 객체 생성
  const tempPair: DocumentPair = {
    id: 'temp',
    problem_document_id: problemDocId,
    solution_document_id: solutionDocId,
    created_at: new Date().toISOString(),
    status: 'active',
    matched_count: 0
  };

  return launchDualWindows(tempPair, options);
}
