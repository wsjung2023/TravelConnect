import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const { user } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());

  const connect = useCallback(() => {
    if (!user?.id) return;

    // WebSocket URL 생성 - 현재 도메인의 포트 5000 사용
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '5000'; // 명시적으로 포트 설정
    const wsUrl = `${protocol}//${host}:${port}/ws`;
    
    console.log('WebSocket 연결 시도:', wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket 연결됨');
        // 인증 메시지 전송
        if (ws.current && user?.id) {
          ws.current.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket 메시지 수신:', message);
          
          // 등록된 핸들러 호출
          const handler = messageHandlersRef.current.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (error) {
          console.error('WebSocket 메시지 파싱 오류:', error);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket 연결 종료');
        ws.current = null;
        
        // 5초 후 재연결 시도
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user?.id) {
            console.log('WebSocket 재연결 시도...');
            connect();
          }
        }, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket 오류:', error);
      };

    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  }, [user?.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket이 연결되지 않음');
    return false;
  }, []);

  const addMessageHandler = useCallback((type: string, handler: (data: any) => void) => {
    messageHandlersRef.current.set(type, handler);
  }, []);

  const removeMessageHandler = useCallback((type: string) => {
    messageHandlersRef.current.delete(type);
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
    connect,
    disconnect
  };
}