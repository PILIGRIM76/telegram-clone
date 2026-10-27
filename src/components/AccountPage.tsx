import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAccentColor } from '../hooks/useAccentColor';
import { db } from '../services/databaseService';
import { logger } from '../services/logger';
import type { TranslationKey } from '../translations';
import AnimatedAvatar from './AnimatedAvatar';
import { NotificationSettings } from './NotificationSettings';
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  KeyIcon,
  LogoutIcon,
  MoonIcon,
  ShieldIcon,
} from './icons';

type SettingsCategory =
  'profile' | 'general' | 'notifications' | 'privacy' | 'security' | 'storage';

const settingsCategories: { id: SettingsCategory; label: TranslationKey }[] = [
  { id: 'profile', label: 'settings_profile' },
  { id: 'general', label: 'settings_general' },
  { id: 'notifications', label: 'settings_notifications' },
  { id: 'privacy', label: 'settings_privacy' },
  { id: 'security', label: 'settings_security' },
  { id: 'storage', label: 'settings_storage' },
];

interface AccountPageProps {
  user: {
    name: string;
    uid: string;
    keyFingerprint?: string;
    usesSeedPhrase: boolean;
  };
  onBack: () => void;
  onLogout: () => void;
  onBackupSeed: () => void;
  onUpdateName: (name: string) => boolean;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div
    style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    }}
  >
    <h3
      style={{
        margin: '0 0 16px',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--color-text-secondary)',
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      {title}
    </h3>
    {children}
  </div>
);

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  onClick?: () => void;
  danger?: boolean;
  toggle?: boolean;
  isOn?: boolean;
  accentColor: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  subLabel,
  onClick,
  danger,
  toggle,
  isOn,
  accentColor,
}) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 0',
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: '1px solid var(--color-divider)',
      transition: 'opacity 0.2s ease',
    }}
    role={toggle ? 'switch' : onClick ? 'button' : undefined}
    aria-checked={toggle ? isOn : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={event => {
      if (onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onClick();
      }
    }}
    onMouseEnter={e => {
      if (onClick) e.currentTarget.style.opacity = '0.7';
    }}
    onMouseLeave={e => {
      if (onClick) e.currentTarget.style.opacity = '1';
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: danger ? 'var(--color-danger-soft)' : 'var(--color-accent-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: danger ? 'var(--color-danger)' : accentColor,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {label}
      </div>
      {subLabel && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {subLabel}
        </div>
      )}
    </div>
    {toggle && (
      <div
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: isOn ? 'var(--color-success)' : 'var(--color-surface-variant)',
          position: 'relative',
          transition: 'background 0.3s ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: isOn ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#FFFFFF',
            transition: 'left 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    )}
  </div>
);

const AccountPage: React.FC<AccountPageProps> = ({
  user,
  onBack,
  onLogout,
  onBackupSeed,
  onUpdateName,
}) => {
  const theme = useAccentColor();
  const { language, setLanguage, t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const [copiedUid, setCopiedUid] = useState(false);
  const [displayName, setDisplayName] = useState(user.name);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('cipherlink-theme') === 'dark'
  );

  const handleToggleTheme = () => {
    const nextMode = darkMode ? 'light' : 'dark';
    setDarkMode(nextMode === 'dark');
    localStorage.setItem('cipherlink-theme', nextMode);
    window.dispatchEvent(new CustomEvent('cipherlink:theme-change', { detail: nextMode }));
  };

  const handleSaveName = () => {
    const name = displayName.trim();
    if (!name) {
      setProfileMessage(t('account_name_empty'));
      return;
    }

    const saved = onUpdateName(name);
    setProfileMessage(saved ? t('account_saved') : t('account_save_failed'));
  };

  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    setCacheMessage(null);
    try {
      const deletedCount = await db.cleanupOldCache();
      setCacheMessage(`${t('account_deleted_cache')}${deletedCount}.`);
    } catch (error) {
      logger.error('[AccountPage] Failed to clean cached files:', error);
      setCacheMessage(t('account_cache_failed'));
    } finally {
      setIsCleaningCache(false);
    }
  };

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch (e) {
      logger.error('[PILIGRIM] Clipboard failed:', e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        padding: '24px 16px',
        background: 'var(--color-bg-primary)',
        boxSizing: 'border-box',
        zIndex: 100,
      }}
      data-testid="account-page"
    >
      <header className="mx-auto mb-4 flex w-full max-w-4xl items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('account_back')}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-tg-textSecondary transition-colors hover:bg-tg-hover hover:text-tg-text dark:text-tg-dark-textSecondary dark:hover:bg-tg-dark-hover dark:hover:text-tg-dark-text"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="m-0 text-xl font-semibold text-tg-text dark:text-tg-dark-text">
          {t('settings_title')}
        </h1>
      </header>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-block', marginBottom: 16 }}>
          <AnimatedAvatar name={user.name} size={80} accentColor={theme.color} />
        </div>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {user.name}
        </h1>
        <div
          onClick={() => void handleCopyUid()}
          data-testid="account-uid-copy"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 8,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = theme.color + '50';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {user.uid.slice(0, 16)}...
          </span>
          {copiedUid ? (
            <CheckIcon size={14} color="#4CAF50" />
          ) : (
            <CopyIcon size={14} color="var(--color-text-secondary)" />
          )}
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav
          aria-label={t('settings_categories')}
          className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible"
        >
          {settingsCategories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              aria-current={activeCategory === category.id ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-left text-sm transition-colors duration-150 ${
                activeCategory === category.id
                  ? 'bg-tg-hover font-semibold text-tg-primary dark:bg-tg-dark-hover dark:text-tg-dark-primary'
                  : 'text-tg-textSecondary hover:bg-tg-hover dark:text-tg-dark-textSecondary dark:hover:bg-tg-dark-hover'
              }`}
            >
              {t(category.label)}
            </button>
          ))}
        </nav>

        <main className="min-w-0">
          {activeCategory === 'profile' && (
            <Section title={t('settings_profile')}>
              <label
                htmlFor="account-display-name"
                className="mb-2 block text-sm font-medium text-tg-text dark:text-tg-dark-text"
              >
                {t('account_profile_name')}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="account-display-name"
                  data-testid="account-display-name"
                  value={displayName}
                  onChange={event => {
                    setDisplayName(event.target.value);
                    setProfileMessage(null);
                  }}
                  maxLength={64}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-tg-hover px-3 py-2 text-tg-text outline-none focus:border-tg-primary dark:bg-tg-dark-hover dark:text-tg-dark-text"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="rounded-lg bg-tg-primary px-4 py-2 font-medium text-white hover:bg-tg-primaryHover dark:bg-tg-dark-primary dark:hover:bg-tg-dark-primaryHover"
                >
                  {t('account_save')}
                </button>
              </div>
              {profileMessage && (
                <p
                  role="status"
                  className="mt-2 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary"
                >
                  {profileMessage}
                </p>
              )}
              <p className="mb-2 mt-5 text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary">
                {t('account_uid')}
              </p>
              <button
                type="button"
                onClick={() => void handleCopyUid()}
                className="flex w-full items-center justify-between gap-3 rounded-lg bg-tg-hover px-3 py-2 text-left font-mono text-sm text-tg-text hover:opacity-80 dark:bg-tg-dark-hover dark:text-tg-dark-text"
              >
                <span className="truncate">{user.uid}</span>
                <span aria-live="polite">
                  {copiedUid ? t('account_copied') : t('account_copy')}
                </span>
              </button>
            </Section>
          )}

          {activeCategory === 'general' && (
            <Section title={t('settings_general')}>
              <MenuItem
                icon={<MoonIcon className="w-5 h-5" />}
                label={t('account_dark_theme')}
                subLabel={darkMode ? t('account_enabled') : t('account_disabled')}
                toggle
                isOn={darkMode}
                onClick={handleToggleTheme}
                accentColor={theme.color}
              />
              <label
                htmlFor="account-language"
                className="flex items-center justify-between gap-4 border-b border-tg-border py-3 text-sm text-tg-text dark:border-tg-dark-border dark:text-tg-dark-text"
              >
                <span>{t('account_language')}</span>
                <select
                  id="account-language"
                  data-testid="account-language"
                  value={language}
                  onChange={event => setLanguage(event.target.value as 'ru' | 'en')}
                  className="rounded-lg bg-tg-hover px-3 py-2 text-tg-text outline-none focus:ring-2 focus:ring-tg-primary dark:bg-tg-dark-hover dark:text-tg-dark-text"
                >
                  <option value="ru">{t('language_russian')}</option>
                  <option value="en">{t('language_english')}</option>
                </select>
              </label>
            </Section>
          )}

          {activeCategory === 'notifications' && (
            <Section title={t('settings_notifications')}>
              <NotificationSettings />
            </Section>
          )}

          {activeCategory === 'privacy' && (
            <Section title={t('settings_privacy')}>
              <div className="rounded-lg bg-tg-hover p-4 text-sm text-tg-text dark:bg-tg-dark-hover dark:text-tg-dark-text">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <ShieldIcon size={18} />
                  {t('account_content_protection')}
                </div>
                <p className="m-0 text-tg-textSecondary dark:text-tg-dark-textSecondary">
                  {t('account_e2ee_description')}
                </p>
              </div>
              <p className="mb-0 mt-4 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
                {t('account_tor_unavailable')}
              </p>
            </Section>
          )}

          {activeCategory === 'security' && (
            <Section title={t('settings_security')}>
              <MenuItem
                icon={<ShieldIcon size={20} />}
                label={t('account_protocol')}
                subLabel={t('account_protocol_description')}
                accentColor={theme.color}
              />
              {user.keyFingerprint && (
                <div className="border-b border-tg-border py-3 dark:border-tg-dark-border">
                  <p className="mb-1 text-sm font-medium text-tg-text dark:text-tg-dark-text">
                    {t('account_key_fingerprint')}
                  </p>
                  <code className="break-all text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary">
                    {user.keyFingerprint}
                  </code>
                </div>
              )}
              {user.usesSeedPhrase ? (
                <MenuItem
                  icon={<KeyIcon size={20} />}
                  label={t('account_seed_phrase')}
                  subLabel={t('account_seed_phrase_description')}
                  onClick={onBackupSeed}
                  accentColor={theme.color}
                />
              ) : (
                <p className="mb-0 mt-4 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
                  {t('account_seed_phrase_unavailable')}
                </p>
              )}
            </Section>
          )}

          {activeCategory === 'storage' && (
            <Section title={t('settings_storage')}>
              <p className="mb-4 mt-0 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
                {t('account_old_cache_description')}
              </p>
              <button
                type="button"
                onClick={() => void handleCleanCache()}
                disabled={isCleaningCache}
                className="rounded-lg bg-tg-hover px-4 py-2 text-sm font-medium text-tg-text transition-colors hover:opacity-80 disabled:opacity-50 dark:bg-tg-dark-hover dark:text-tg-dark-text"
              >
                {isCleaningCache ? t('account_clearing_cache') : t('account_clear_cache')}
              </button>
              {cacheMessage && (
                <p
                  role="status"
                  className="mb-0 mt-3 text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary"
                >
                  {cacheMessage}
                </p>
              )}
              <p className="mb-0 mt-4 text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary">
                {t('account_local_data_notice')}
              </p>
            </Section>
          )}
        </main>
      </div>

      <div style={{ marginTop: 32, paddingBottom: 32 }}>
        <button
          onClick={onLogout}
          data-testid="account-logout"
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            background: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--color-danger-soft)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-danger-soft)';
          }}
        >
          <LogoutIcon size={18} /> {t('account_logout')}
        </button>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 12,
            lineHeight: 1.4,
          }}
        >
          {t('account_logout_warning')}
        </p>
      </div>
    </motion.div>
  );
};

export default AccountPage;
