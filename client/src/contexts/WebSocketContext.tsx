// WebSocket 전역 컨텍스트 — 앱 레벨에서 단일 WS 연결을 관리한다.
// useWebSocket, useNotifications 등 여러 훅이 하나의 연결을 공유하여
// 탭 이동 시 연결이 끊기거나 중복 연결이 생기는 문제를 방지한다.
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

type MessageHandler = (data: any) => void;

interface WebSocketContextValue {
  isConnected: boolean;
  send: (message: Record<string, unknown>) => boolean;
  subscribe: (type: string, handler: MessageHandler) => void;
  /** handler를 생략하면 해당 type의 모든 핸들러를 제거한다 */
  unsubscribe: (type: string, handler?: MessageHandler) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }, [stopHeartbeat]);

  const connect = useCallback(() => {
    if (!user?.id) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      ws.send(JSON.stringify({ type: 'auth' }));
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = handlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach((h) => h(message));
        }
      } catch {
        // 파싱 실패는 무시
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      setIsConnected(false);
      stopHeartbeat();

      if (
        event.code !== 1000 &&
        user?.id &&
        reconnectAttemptsRef.current < maxReconnectAttempts
      ) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        wsRef.current = null;
      }
    };
  }, [user?.id, startHeartbeat, stopHeartbeat]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close(1000);
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [stopHeartbeat]);

  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      disconnect();
    }
    return () => { disconnect(); };
  }, [user?.id, connect, disconnect]);

  const send = useCallback((message: Record<string, unknown>): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);
  }, []);

  const unsubscribe = useCallback((type: string, handler?: MessageHandler) => {
    if (handler) {
      handlersRef.current.get(type)?.delete(handler);
    } else {
      handlersRef.current.delete(type);
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ isConnected, send, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextValue {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used inside WebSocketProvider');
  return ctx;
}
