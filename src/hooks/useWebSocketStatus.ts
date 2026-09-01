import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

type WebSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export function useWebSocketStatus() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  useEffect(() => {
    const handleOpen = () => setStatus('connected');
    const handleClose = () => setStatus('disconnected');
    const handleError = () => setStatus('error');

    apiService.onOpen(handleOpen);
    apiService.onClose(handleClose);
    apiService.onError(handleError);

    return () => {
      // cleanup
    };
  }, []);

  const statusText = {
    connected: 'Подключено',
    connecting: 'Подключаюсь...',
    disconnected: 'Отключено',
    error: 'Ошибка'
  }[status];

  return { status, statusText };
}
