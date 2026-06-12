// WebSocket 훅 — 공유 WebSocketContext를 통해 메시지 송수신 및 핸들러 등록을 제공한다.
// 이전: 훅 인스턴스마다 별도 WS 연결 생성 → 현재: 앱 레벨 단일 연결 공유.
import { useCallback } from 'react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

export function useWebSocket() {
  const { isConnected, send, subscribe, unsubscribe } = useWebSocketContext();

  const sendMessage = useCallback(
    (message: Record<string, unknown>): boolean => send(message),
    [send]
  );

  const addMessageHandler = useCallback(
    (type: string, handler: (data: any) => void) => subscribe(type, handler),
    [subscribe]
  );

  const removeMessageHandler = useCallback(
    (type: string, handler?: (data: any) => void) => unsubscribe(type, handler),
    [unsubscribe]
  );

  return {
    isConnected,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
  };
}
