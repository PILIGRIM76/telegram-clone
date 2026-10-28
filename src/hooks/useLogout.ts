import { logger } from '../services/logger';
// v3.0 Logout: очистка identity из localStorage + закрытие WebSocket.
// При автономной работе выход удаляет identity с этого устройства.
// Identity можно восстановить по seed-фразе на любом другом устройстве.

import { useCallback } from 'react';

interface UseLogoutOptions {
  onLogout?: () => void;
  clearData?: boolean; // если true — очищает contacts/chats/groups тоже
}

export function useLogout(options: UseLogoutOptions = {}) {
  const { onLogout, clearData = false } = options;

  const logout = useCallback(() => {
    logger.info('[PILIGRIM] Logout initiated');

    // 1. Очистить identity (обязательно)
    try {
      localStorage.removeItem('piligrim-identity');
    } catch (e) {
      logger.error('[PILIGRIM] Failed to remove piligrim-identity:', e);
    }

    // 2. Опционально очистить данные (для "delete account")
    if (clearData) {
      try {
        localStorage.removeItem('piligrim-contacts');
        localStorage.removeItem('piligrim-chats');
        localStorage.removeItem('piligrim-groups');
        logger.info('[PILIGRIM] All user data cleared');
      } catch (e) {
        logger.error('[PILIGRIM] Failed to clear data:', e);
      }
    }

    // 3. Закрыть WebSocket соединение если открыто
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = (window as any).__piligrim_ws;
    if (ws && typeof ws.close === 'function') {
      try {
        ws.close();
      } catch (e) {
        // Ошибка закрытия сокета не должна прерывать выход из учётной записи.
      }
    }

    logger.info('[PILIGRIM] Logout complete, identity forgotten');

    // 4. Сбрасываем состояние React через обратный вызов, если он передан.
    onLogout?.();

    // 5. Reload для полного сброса (надёжнее чем state reset)
    // Используем setTimeout чтобы дать React отрендерить cleanup
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, [onLogout, clearData]);

  return logout;
}
