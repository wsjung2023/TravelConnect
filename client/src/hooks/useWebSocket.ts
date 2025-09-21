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
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const messageHandlersRef = useRef<Map<string, (data: any) => void>>(new Map());

  // 하트비트 관리 함수
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // 기존 하트비트 정리
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        try {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.warn('하트비트 전송 실패:', error);
        }
      }
    }, 30000); // 30초마다 ping
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  const connect = useCallback(() => {
    if (!user?.id) return;

    // 이미 연결되어 있다면 건너뛰기
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket 연결이 이미 진행 중...');
      return;
    }

    // WebSocket URL 생성 - 보안 강화 및 URL 문제 해결
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // hostname:port 포함
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('WebSocket 연결 시도:', wsUrl);

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket 연결됨');
        reconnectAttemptsRef.current = 0; // 연결 성공 시 재연결 카운터 리셋
        
        // JWT 토큰으로 인증 메시지 전송 (보안 강화)
        if (ws.current && user?.id) {
          try {
            const token = localStorage.getItem('token');
            if (token) {
              ws.current.send(JSON.stringify({
                type: 'auth',
                token: token
              }));
            } else {
              console.error('JWT 토큰이 없어 WebSocket 인증 실패');
              ws.current.close();
              return;
            }
          } catch (sendError) {
            console.error('WebSocket 인증 메시지 전송 실패:', sendError);
            return;
          }
        }

        // 하트비트 시작
        startHeartbeat();
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
        stopHeartbeat();
        
        // 비정상 종료인 경우에만 재연결 시도 (코드 1000이 정상 종료)
        if (event.code !== 1000 && user?.id && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          
          console.log(`WebSocket 재연결 시도 ${reconnectAttemptsRef.current}/${maxReconnectAttempts} - ${backoffDelay}ms 후`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user?.id && reconnectAttemptsRef.current <= maxReconnectAttempts) {
              console.log('WebSocket 재연결 시도...');
              connect();
            }
          }, backoffDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('WebSocket 최대 재연결 횟수 초과');
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
    stopHeartbeat();
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, [stopHeartbeat]);

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

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    sendMessage,
    addMessageHandler,
    removeMessageHandler,
    connect,
    disconnect
  };
}