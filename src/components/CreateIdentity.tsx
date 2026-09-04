
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { useTranslation } from '../contexts/LanguageContext';
import FeaturesList from './FeaturesList';

interface CreateIdentityProps {
  onCreateIdentity: () => void;
  onRestore?: () => void;
  onLogin?: () => void;
}

const CreateIdentity: React.FC<CreateIdentityProps> = ({ onCreateIdentity, onRestore, onLogin }) => {
  const { language, t } = useTranslation();

  return (
    <div
      data-testid="create-identity-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        padding: '20px',
        overflowY: 'auto'
      }}
    >
      {/* Логотип + заголовок */}
      <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <ShieldCheckIcon className="w-16 h-16 text-cyan-400" />
        </div>
        <h1 style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
          {t('welcome_title')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
          {t('welcome_desc')}
        </p>
      </div>

      {/* Карточка с кнопками */}
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          background: '#1e293b',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          border: '1px solid #334155',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            padding: '12px',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid #eab308',
            borderRadius: '8px',
            color: '#fde047',
            fontSize: '13px',
            lineHeight: 1.5,
            marginBottom: '16px'
          }}
        >
          {t('backup_warning')}
        </div>

        <button
          type="button"
          onClick={onCreateIdentity}
          data-testid="create-identity-btn"
          aria-label={t('create_identity_btn')}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '12px',
            cursor: 'pointer'
          }}
        >
          {t('create_identity_btn')}
        </button>

                {/* v3.0 LoginPage: кнопка входа с паролем/2FA */}
        <button
          type="button"
          onClick={() => {
            if (onLogin) {
              onLogin();
            } else {
              alert(
                language === 'ru'
                  ? 'Вход по паролю в разработке. Используйте "Создать безопасную личность" — ваша идентичность хранится только на этом устройстве.'
                  : 'Password login is in development. Use "Create Secure Identity" — your identity is stored only on this device.'
              );
            }
          }}
          data-testid="login-btn"
          aria-label="Login with existing account"
          style={{
            width: '100%',
            padding: '12px 20px',
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          {language === 'ru' ? 'Войти с существующим аккаунтом' : 'Login with existing account'}
        </button>

        {/* v3.0 Restore Identity: открыть экран восстановления через 12 seed-слов */}
                {onRestore && (
          <button
            type="button"
            onClick={onRestore}
            data-testid="restore-identity-btn"
            aria-label="Restore identity from seed phrase"
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            {language === 'ru' ? 'Восстановить через seed-фразу' : 'Restore via Seed Phrase'}
          </button>
        )}
      </div>

      {/* FeaturesList — МАКСИМАЛЬНО ВИДИМЫЙ на CreateIdentity */}
      <div style={{ width: '100%', maxWidth: '720px', marginBottom: '40px' }}>
        <FeaturesList lang={language} />
      </div>
    </div>
  );
};

export default CreateIdentity;
