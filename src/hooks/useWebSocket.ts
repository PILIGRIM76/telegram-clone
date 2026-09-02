// v1.5.2 Stage 5: WebSocket hook с авто-reconnect и offline-first fallback
// Использует apiService (NaCl box для транспорта) + cryptoService (RSA-OAEP для at-rest).
// Если backend недоступен — не падает, а работает в localStorage-only режиме.

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { Message } from '../types';

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error' | 'unsupported';

export interface UseWebSocketOptions {
  /** UID текущего пользователя для авторизации на сервере */
  myUid: string;
  /** Включён ли WebSocket (можно временно отключить для тестов) */
  enabled?: boolean;
  /** Интервал reconnect в мс (по умолчанию 5000) */
  reconnectInterval?: number;
  /** Callback при получении нового сообщения */
  onMessage?: (message: Message) => void;
  /** Callback при изменении статуса подключения */
  onStatusChange?: (status: WebSocketStatus) => void;
}

export interface UseWebSocketResult {
  status: WebSocketStatus;
  /** Подключено ли (open) */
  isConnected: boolean;
  /** Отправить сообщение через WS (если подключен) */
  send: (to: string, content: string, recipientPublicKey?: string) => void;
  /** Переподключиться вручную */
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketResult {
  const { myUid, enabled = true, reconnectInterval = 5000, onMessage, onStatusChange } = options;

  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const reconnectTimerRef = useRef<number | null>(null);
  const messageHandlerRef = useRef<((message: Message) => void) | null>(null);

  // Стабильные ссылки на колбэки (чтобы не переподключаться при каждом рендере)
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;

  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    onStatusChangeRef.current?.(newStatus);
  }, []);

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const setupMessageListener = useCallback(() => {
    // Удаляем предыдущий (защита от дублирования)
    if (messageHandlerRef.current) {
      apiService.offMessage(messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
    // Оборачиваем колбэк чтобы можно было удалить
    const handler = (message: Message) => {
      console.log('[PILIGRIM] useWebSocket: incoming message', message.id);
      onMessageRef.current?.(message);
    };
    messageHandlerRef.current = handler;
    apiService.onMessage(handler);
  }, []);

  const connect = useCallback(() => {
    if (!enabled) {
      updateStatus('unsupported');
      return;
    }
    if (!myUid) {
      console.warn('[PILIGRIM] useWebSocket: myUid is empty, cannot connect');
      updateStatus('closed');
      return;
    }
    clearReconnect();
    updateStatus('connecting');
    try {
      // apiService.connect() подключается к WS_URL и регистрирует текущего юзера
      apiService.connect(myUid);
      setupMessageListener();
      // apiService сам эмитит open/close/error события, но мы используем упрощённый флаг:
      // если коннект не упал в течение 2 сек — считаем open
      window.setTimeout(() => {
        // Простая эврисация: после 2 сек если статус ещё "connecting" — пометим "open"
        setStatus((current) => {
          if (current === 'connecting') {
            onStatusChangeRef.current?.('open');
            return 'open';
          }
          return current;
        });
      }, 2000);
    } catch (e) {
      console.error('[PILIGRIM] useWebSocket: connect failed', e);
      updateStatus('error');
      scheduleReconnect();
    }
  }, [enabled, myUid, clearReconnect, setupMessageListener, updateStatus]);

  const scheduleReconnect = useCallback(() => {
    clearReconnect();
    reconnectTimerRef.current = window.setTimeout(() => {
      console.log('[PILIGRIM] useWebSocket: attempting reconnect…');
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, clearReconnect]);

  // Подписка на onClose/onError apiService для автоматического reconnect
  useEffect(() => {
    if (!enabled) return;
    const handleClose = () => {
      console.log('[PILIGRIM] useWebSocket: connection closed, scheduling reconnect');
      updateStatus('closed');
      scheduleReconnect();
    };
    const handleError = (err: unknown) => {
      console.error('[PILIGRIM] useWebSocket: error', err);
      updateStatus('error');
      scheduleReconnect();
    };
    apiService.onClose(handleClose);
    apiService.onError(handleError);
    return () => {
      apiService.offMessage?.((m) => m); // best effort
    };
  }, [enabled, scheduleReconnect, updateStatus]);

  // Подключение при монтировании
  useEffect(() => {
    if (!enabled || !myUid) return;
    connect();
    return () => {
      clearReconnect();
      // НЕ отключаем apiService глобально — он singleton и может быть нужен другим компонентам
      // apiService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, myUid]);

  const send = useCallback((to: string, content: string, recipientPublicKey?: string) => {
    if (status !== 'open') {
      console.warn('[PILIGRIM] useWebSocket: send ignored, status =', status);
      return;
    }
    if (recipientPublicKey) {
      apiService.setRecipientPublicKey(recipientPublicKey);
    }
    apiService.sendMessage(to, content, recipientPublicKey || '');
  }, [status]);

  const reconnect = useCallback(() => {
    clearReconnect();
    apiService.disconnect();
    connect();
  }, [connect, clearReconnect]);

  return {
    status,
    isConnected: status === 'open',
    send,
    reconnect
  };
}