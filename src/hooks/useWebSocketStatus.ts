import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

type WebSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export function useWebSocketStatus() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  useEffect(() => {
    const handleOpen = useCallback(() => setStatus('connected'), []);
    const handleClose = useCallback(() => setStatus('disconnected'), []);
    const handleError = useCallback(() => setStatus('error'), []);

    apiService.onOpen(handleOpen);
    apiService.onClose(handleClose);
    apiService.onError(handleError);

    return () => {
      // cleanup
    };
  }, []);

  const statusText = {
    connected: '🟢 Подключено',
    connecting: '🔵 Подключаюсь...',
    disconnected: '⚪ Отключено',
    error: '🔴 Ошибка'
  }[status];

  return { status, statusText };
}
