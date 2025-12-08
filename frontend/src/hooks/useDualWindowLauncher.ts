/**
 * 듀얼 윈도우 런처 훅
 *
 * Phase 22-F-2: 문제/해설 PDF를 두 개의 브라우저 창에서
 * 자동으로 열고 매칭 세션에 연결하는 기능
 */
import { useState, useCallback } from 'react';
import { api } from '../api/client';

interface UseDualWindowLauncherOptions {
  problemDocId: string;
  solutionDocId: string;
  onPopupBlocked?: () => void;
}

interface UseDualWindowLauncherReturn {
  launchDualWindows: () => Promise<void>;
  isLaunching: boolean;
  error: string | null;
}

/**
 * 화면 크기에 따른 윈도우 위치 계산
 */
function calculateWindowPositions() {
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;

  // 좌우 반반 분할
  const windowWidth = Math.floor(screenWidth / 2);
  const windowHeight = screenHeight;

  return {
    problem: {
      width: windowWidth,
      height: windowHeight,
      left: 0,
      top: 0,
    },
    solution: {
      width: windowWidth,
      height: windowHeight,
      left: windowWidth,
      top: 0,
    },
  };
}

/**
 * 윈도우 옵션 문자열 생성
 */
function buildWindowFeatures(config: { width: number; height: number; left: number; top: number }) {
  return `width=${config.width},height=${config.height},left=${config.left},top=${config.top},menubar=no,toolbar=no,location=no,status=no`;
}

export function useDualWindowLauncher({
  problemDocId,
  solutionDocId,
  onPopupBlocked,
}: UseDualWindowLauncherOptions): UseDualWindowLauncherReturn {
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchDualWindows = useCallback(async () => {
    if (!problemDocId || !solutionDocId) {
      setError('문제 PDF와 해설 PDF를 모두 업로드해주세요.');
      return;
    }

    setIsLaunching(true);
    setError(null);

    try {
      // 1. 팝업 차단 우회: 클릭 컨텍스트에서 먼저 빈 창 열기
      // 이렇게 해야 브라우저가 팝업을 허용함
      const positions = calculateWindowPositions();

      const solutionWindow = window.open(
        'about:blank',
        '_blank',
        buildWindowFeatures(positions.solution)
      );

      if (!solutionWindow) {
        setError('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.');
        setIsLaunching(false);
        onPopupBlocked?.();
        return;
      }

      // 해설 창에 로딩 메시지 표시
      solutionWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>해설 뷰어 - 로딩 중...</title>
            <style>
              body {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .loader {
                text-align: center;
              }
              .spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <p>매칭 세션 생성 중...</p>
            </div>
          </body>
        </html>
      `);

      // 2. 매칭 세션 생성
      const session = await api.createMatchingSession({
        name: `매칭 ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR')}`,
        problemDocumentId: problemDocId,
        solutionDocumentId: solutionDocId,
      });

      // 3. URL 생성
      const baseUrl = window.location.origin;
      const solutionUrl = `${baseUrl}/viewer/${encodeURIComponent(solutionDocId)}?session=${session.sessionId}&role=solution`;
      const problemUrl = `${baseUrl}/viewer/${encodeURIComponent(problemDocId)}?session=${session.sessionId}&role=problem`;

      // 4. 해설 창 URL 설정
      solutionWindow.location.href = solutionUrl;

      // 5. 현재 창을 문제 창으로 (약간의 딜레이 후)
      // 이렇게 하면 해설 창이 먼저 로드되고 문제 창이 뒤따라 로드됨
      setTimeout(() => {
        window.location.href = problemUrl;
      }, 100);

    } catch (err) {
      console.error('[Phase 22-F] Failed to launch dual windows:', err);
      setError(err instanceof Error ? err.message : '듀얼 윈도우 실행에 실패했습니다.');
      setIsLaunching(false);
    }
  }, [problemDocId, solutionDocId, onPopupBlocked]);

  return {
    launchDualWindows,
    isLaunching,
    error,
  };
}

/**
 * 듀얼 윈도우에서 현재 창만 새로 열기 (재연결용)
 */
export function openMatchingWindow(
  documentId: string,
  sessionId: string,
  role: 'problem' | 'solution'
): Window | null {
  const positions = calculateWindowPositions();
  const config = role === 'problem' ? positions.problem : positions.solution;

  const url = `${window.location.origin}/viewer/${encodeURIComponent(documentId)}?session=${sessionId}&role=${role}`;

  return window.open(url, '_blank', buildWindowFeatures(config));
}
