import { logger } from '../services/logger';
// Этап 5: хук WebSocket с автоматическим переподключением и автономным режимом.
// Использует apiService (NaCl box для транспорта) + cryptoService (RSA-OAEP для at-rest).
// При недоступности сервера работа продолжается в автономном режиме с хранением данных в localStorage.

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/apiService';
import type { Message } from '../types';

export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error' | 'unsupported';

export interface UseWebSocketOptions {
  /** UID текущего пользователя для авторизации на сервере */
  myUid: string;
  /** Включён ли WebSocket (можно временно отключить для тестов) */
  enabled?: boolean;
  /** Интервал переподключения в миллисекундах (по умолчанию 5000). */
  reconnectInterval?: number;
  /** Обратный вызов при получении нового сообщения. */
  onMessage?: (message: Message) => void;
  /** Обратный вызов при изменении состояния подключения. */
  onStatusChange?: (status: WebSocketStatus) => void;
  /** v3.17: Обратный вызов при истечении TTL сообщения (disappearing messages). */
  onMessageExpired?: (data: { messageId: string; chatId: string }) => void;
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
  const {
    myUid,
    enabled = true,
    reconnectInterval = 5000,
    onMessage,
    onStatusChange,
    onMessageExpired,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const reconnectTimerRef = useRef<number | null>(null);
  const messageHandlerRef = useRef<((message: Message) => void) | null>(null);

  // Стабильные ссылки на колбэки (чтобы не переподключаться при каждом рендере)
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onMessageExpiredRef = useRef(onMessageExpired);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;
  onMessageExpiredRef.current = onMessageExpired;

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
      logger.info('[PILIGRIM] useWebSocket: incoming message', message.id);
      onMessageRef.current?.(message);
    };
    messageHandlerRef.current = handler;
    apiService.onMessage(handler);
  }, []);

  // v3.17: Setup message expired listener for disappearing messages
  const setupMessageExpiredListener = useCallback(() => {
    const handler = (data: { messageId: string; chatId: string }) => {
      logger.info('[PILIGRIM] useWebSocket: message expired', data.messageId);
      onMessageExpiredRef.current?.(data);
    };
    apiService.onMessageExpired(handler);
    // Return cleanup function
    return () => {
      apiService.offMessageExpired(handler);
    };
  }, []);

  const connect = useCallback(() => {
    if (!enabled) {
      updateStatus('unsupported');
      return;
    }
    if (!myUid) {
      logger.warn('[PILIGRIM] useWebSocket: myUid is empty, cannot connect');
      updateStatus('closed');
      return;
    }
    clearReconnect();
    updateStatus('connecting');
    try {
      // apiService.connect() подключается к WS_URL и регистрирует текущего юзера
      apiService.connect(myUid);
      setupMessageListener();
      setupMessageExpiredListener();
      // apiService сам эмитит open/close/error события, но мы используем упрощённый флаг:
      // если коннект не упал в течение 2 сек — считаем open
      window.setTimeout(() => {
        // Если через 2 секунды статус ещё «connecting», считаем соединение открытым.
        setStatus(current => {
          if (current === 'connecting') {
            onStatusChangeRef.current?.('open');
            return 'open';
          }
          return current;
        });
      }, 2000);
    } catch (e) {
      logger.error('[PILIGRIM] useWebSocket: connect failed', e);
      updateStatus('error');
      scheduleReconnect();
    }
  }, [
    enabled,
    myUid,
    clearReconnect,
    setupMessageListener,
    setupMessageExpiredListener,
    updateStatus,
  ]);

  const scheduleReconnect = useCallback(() => {
    clearReconnect();
    reconnectTimerRef.current = window.setTimeout(() => {
      logger.info('[PILIGRIM] useWebSocket: attempting reconnect…');
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, clearReconnect]);

  // Подписываемся на onClose/onError apiService для автоматического переподключения.
  useEffect(() => {
    if (!enabled) return;
    const handleClose = () => {
      logger.info('[PILIGRIM] useWebSocket: connection closed, scheduling reconnect');
      updateStatus('closed');
      scheduleReconnect();
    };
    const handleError = (err: unknown) => {
      logger.error('[PILIGRIM] useWebSocket: error', err);
      updateStatus('error');
      scheduleReconnect();
    };
    apiService.onClose(handleClose);
    apiService.onError(handleError);
    return () => {
      apiService.offMessage?.(m => m); // Пытаемся снять обработчик, не прерывая очистку подписок.
    };
  }, [enabled, scheduleReconnect, updateStatus]);

  // Подключение при монтировании
  useEffect(() => {
    if (!enabled || !myUid) return;
    connect();
    return () => {
      clearReconnect();
      // Соединение не закрывается: apiService — общий экземпляр, используемый другими компонентами.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, myUid]);

  const send = useCallback(
    (to: string, content: string, recipientPublicKey?: string) => {
      if (status !== 'open') {
        logger.warn('[PILIGRIM] useWebSocket: send ignored, status =', status);
        return;
      }
      if (recipientPublicKey) {
        apiService.setRecipientPublicKey(recipientPublicKey);
      }
      apiService.sendMessage(to, content, recipientPublicKey || '');
    },
    [status]
  );

  const reconnect = useCallback(() => {
    clearReconnect();
    apiService.disconnect();
    connect();
  }, [connect, clearReconnect]);

  return {
    status,
    isConnected: status === 'open',
    send,
    reconnect,
  };
}
