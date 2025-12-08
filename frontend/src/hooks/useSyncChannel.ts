/**
 * BroadcastChannel 기반 창 간 동기화 훅
 *
 * Phase 22-A: 듀얼 윈도우 매칭 시스템
 *
 * 같은 origin의 브라우저 탭/창 간 실시간 메시지 전달
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { SyncMessage, SyncMessageType } from '@/types/matching';

interface UseSyncChannelOptions {
  onMessage?: (message: SyncMessage) => void;
}

interface UseSyncChannelReturn {
  /** 메시지 전송 */
  send: <T>(type: SyncMessageType, payload: T) => void;
  /** 연결 상태 */
  isConnected: boolean;
  /** 현재 창 ID */
  windowId: string;
  /** 연결된 창 수 */
  connectedWindows: number;
}

/**
 * BroadcastChannel 기반 동기화 훅
 *
 * @param sessionId - 매칭 세션 ID
 * @param options - 옵션 (onMessage 콜백)
 */
export function useSyncChannel(
  sessionId: string | null,
  options: UseSyncChannelOptions = {}
): UseSyncChannelReturn {
  const { onMessage } = options;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const windowIdRef = useRef<string>(generateWindowId());
  const [isConnected, setIsConnected] = useState(false);
  const [connectedWindows, setConnectedWindows] = useState(1);

  // 메시지 핸들러를 ref로 저장 (최신 상태 유지)
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  // 채널 연결
  useEffect(() => {
    if (!sessionId) {
      setIsConnected(false);
      return;
    }

    console.log(`[Phase 22-A] Connecting to channel: matching-${sessionId}`);

    const channel = new BroadcastChannel(`matching-${sessionId}`);
    channelRef.current = channel;

    // 메시지 수신 핸들러
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;
      console.log(`[Phase 22-A] Received:`, message.type, message.payload);

      // 자기 자신이 보낸 메시지는 무시
      if (message.windowId === windowIdRef.current) {
        return;
      }

      // WINDOW_JOINED 처리
      if (message.type === 'WINDOW_JOINED') {
        setConnectedWindows(prev => prev + 1);
        // Phase 22-I-fix: 응답이 아닌 경우에만 응답 전송 (무한 루프 방지)
        const payload = message.payload as { isResponse?: boolean };
        if (!payload.isResponse) {
          channel.postMessage({
            type: 'WINDOW_JOINED',
            payload: { windowId: windowIdRef.current, isResponse: true },
            timestamp: Date.now(),
            windowId: windowIdRef.current
          });
        }
      }

      // WINDOW_LEFT 처리
      if (message.type === 'WINDOW_LEFT') {
        setConnectedWindows(prev => Math.max(1, prev - 1));
      }

      // 콜백 호출
      onMessageRef.current?.(message);
    };

    // 연결 완료
    setIsConnected(true);

    // 참여 알림
    channel.postMessage({
      type: 'WINDOW_JOINED',
      payload: { windowId: windowIdRef.current },
      timestamp: Date.now(),
      windowId: windowIdRef.current
    });

    // 정리 함수
    return () => {
      console.log(`[Phase 22-A] Disconnecting from channel`);

      // 떠남 알림
      channel.postMessage({
        type: 'WINDOW_LEFT',
        payload: { windowId: windowIdRef.current },
        timestamp: Date.now(),
        windowId: windowIdRef.current
      });

      channel.close();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId]);

  // 메시지 전송 함수
  const send = useCallback(<T,>(type: SyncMessageType, payload: T) => {
    if (!channelRef.current) {
      console.warn('[Phase 22-A] Cannot send: channel not connected');
      return;
    }

    const message: SyncMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      windowId: windowIdRef.current
    };

    console.log(`[Phase 22-A] Sending:`, type, payload);
    channelRef.current.postMessage(message);
  }, []);

  return {
    send,
    isConnected,
    windowId: windowIdRef.current,
    connectedWindows
  };
}

/**
 * 고유 창 ID 생성
 * Phase 22-I-fix: sessionStorage 사용 제거
 *
 * 이유: window.open()으로 새 창을 열면 sessionStorage가 복사되어
 * 두 창이 같은 windowId를 가지게 됨 → 메시지가 "자기 메시지"로 무시됨
 */
function generateWindowId(): string {
  // 매번 새로운 고유 ID 생성 (sessionStorage 사용 안 함)
  return `win-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
