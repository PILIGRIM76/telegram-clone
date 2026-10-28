import { useEffect, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { apiService } from '../services/apiService';
import { logger } from '../services/logger';
import {
  deleteFCMToken,
  getFCMToken,
  initPushNotifications,
  isFCMSupported,
  requestNotificationPermission,
} from '../services/pushService';

export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'default' : Notification.permission
  );
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void isFCMSupported()
      .then(async isSupported => {
        setSupported(isSupported);
        if (
          isSupported &&
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          const currentToken = await getFCMToken();
          setToken(currentToken);
          setNotificationsEnabled(!!currentToken);
        }
      })
      .catch(error => logger.error('[NotificationSettings] Error checking notifications:', error));
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission === 'granted' && supported) {
        const fcmToken = await initPushNotifications();
        setToken(fcmToken);
        setNotificationsEnabled(!!fcmToken);
      }
    } catch (error) {
      setErrorMessage(t('push_enable_error'));
      logger.error('[NotificationSettings] Error enabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      setErrorMessage(null);
      const currentToken = token || (await getFCMToken());
      if (currentToken && !(await apiService.unregisterPushToken(currentToken))) {
        throw new Error('Не удалось удалить токен уведомлений с сервера');
      }
      if (currentToken && !(await deleteFCMToken())) {
        throw new Error('Не удалось удалить локальный токен уведомлений');
      }
      setToken(null);
      setNotificationsEnabled(false);
      logger.info('[NotificationSettings] Notifications disabled');
    } catch (error) {
      setErrorMessage(t('push_disable_error'));
      logger.error('[NotificationSettings] Error disabling notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-lg border border-tg-border bg-tg-background p-4 text-tg-text dark:border-tg-dark-border dark:bg-tg-dark-background dark:text-tg-dark-text">
        <h3 className="mb-2 font-bold">{t('push_title')}</h3>
        <p className="text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
          {t('push_unsupported')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-tg-border bg-tg-background p-4 text-tg-text dark:border-tg-dark-border dark:bg-tg-dark-background dark:text-tg-dark-text">
      <h3 className="mb-2 font-bold">{t('push_title')}</h3>
      <p className="mb-4 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
        {t('push_description')}
        <br />
        <span className="text-xs">{t('push_no_message_text')}</span>
      </p>
      {errorMessage && (
        <p role="alert" className="mb-3 text-sm text-tg-danger dark:text-tg-dark-danger">
          {errorMessage}
        </p>
      )}

      {notificationsEnabled ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-tg-success dark:text-tg-dark-success">
            <span className="text-lg">✅</span>
            <span>{t('push_enabled')}</span>
          </div>
          <button
            onClick={() => void handleDisable()}
            disabled={loading}
            className="rounded-lg bg-tg-hover px-4 py-2 text-tg-text transition-colors hover:opacity-80 disabled:opacity-50 dark:bg-tg-dark-hover dark:text-tg-dark-text"
          >
            {loading ? t('push_disabling') : t('push_disable')}
          </button>
        </div>
      ) : permission === 'denied' ? (
        <div className="space-y-2 text-tg-danger dark:text-tg-dark-danger">
          <div className="flex items-center gap-2">
            <span className="text-lg">❌</span>
            <span>{t('push_blocked')}</span>
          </div>
          <p className="text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
            {t('push_permission_help')}
          </p>
        </div>
      ) : (
        <button
          onClick={() => void handleEnable()}
          disabled={loading}
          className="rounded-lg bg-tg-primary px-4 py-2 text-white transition-colors hover:bg-tg-primaryHover disabled:opacity-50 dark:bg-tg-dark-primary dark:hover:bg-tg-dark-primaryHover"
        >
          {loading ? t('push_enabling') : t('push_enable')}
        </button>
      )}
    </div>
  );
};
