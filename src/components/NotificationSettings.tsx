import { useState, useEffect } from 'react';
import { initPushNotifications, requestNotificationPermission, isFCMSupported } from '../services/pushService';

export const NotificationSettings: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setPermission(Notification.permission);
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const isSupported = await isFCMSupported();
    setSupported(isSupported);
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted' && supported) {
        const fcmToken = await initPushNotifications();
        setToken(fcmToken);
      }
    } catch (error) {
      console.error('[NotificationSettings] Error enabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      // Note: In a real implementation, you'd want to unregister the token from server
      // await apiService.unregisterPushToken(token);
      console.log('[NotificationSettings] Notifications disabled');
    } catch (error) {
      console.error('[NotificationSettings] Error disabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-bold mb-2">Push-уведомления</h3>
        <p className="text-sm text-gray-600">
          Ваш браузер не поддерживает push-уведомления (FCM).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-2">Push-уведомления</h3>
      <p className="text-sm text-gray-600 mb-4">
        Получайте уведомления о новых зашифрованных сообщениях, когда приложение закрыто.
        <br />
        <span className="text-xs text-gray-500">
          В уведомлении НЕ будет текста сообщения (E2EE).
        </span>
      </p>
      
      {permission === 'granted' ? (
        <div className="space-y-2">
          <div className="text-green-600 flex items-center gap-2">
            <span className="text-lg">✅</span>
            <span>Уведомления включены</span>
          </div>
          {token && (
            <details className="text-xs text-gray-500">
              <summary>FCM Token (для отладки)</summary>
              <code className="block mt-1 break-all bg-gray-100 p-2 rounded">{token}</code>
            </details>
          )}
          <button 
            onClick={handleDisable}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {loading ? 'Отключение...' : 'Отключить уведомления'}
          </button>
        </div>
      ) : permission === 'denied' ? (
        <div className="text-red-600 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">❌</span>
            <span>Уведомления заблокированы в браузере</span>
          </div>
          <p className="text-sm text-gray-600">
            Разрешите уведомления в настройках браузера (значок замка в адресной строке), затем обновите страницу.
          </p>
        </div>
      ) : (
        <button 
          onClick={handleEnable}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Включение...' : 'Включить уведомления'}
        </button>
      )}
    </div>
  );
};