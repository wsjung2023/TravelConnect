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

    // 이미 연결되어 있다면 건너뛰기
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket 연결이 이미 진행 중...');
      return;
    }

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
          try {
            ws.current.send(JSON.stringify({
              type: 'auth',
              userId: user.id
            }));
          } catch (sendError) {
            console.error('WebSocket 인증 메시지 전송 실패:', sendError);
          }
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

      ws.current.onclose = (event) => {
        console.log('WebSocket 연결 종료 - 코드:', event.code, '이유:', event.reason);
        ws.current = null;
        
        // 비정상 종료인 경우에만 재연결 시도 (코드 1000이 정상 종료)
        if (event.code !== 1000 && user?.id) {
          console.log('WebSocket 재연결 예약...');
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user?.id) {
              console.log('WebSocket 재연결 시도...');
              connect();
            }
          }, 5000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket 오류:', error);
        // 연결이 안 되는 경우 null로 설정해서 재연결 시도
        if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
          ws.current = null;
        }
      };

    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
      ws.current = null;
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