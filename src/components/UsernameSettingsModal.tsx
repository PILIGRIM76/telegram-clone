// v3.19: Username Settings Modal
// Модальное окно для установки/изменения уникального @username.

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { CheckCircleIcon, SettingsIcon, XMarkIcon } from './icons';

interface UsernameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername?: string;
  onUsernameUpdated: (newUsername: string) => void;
}

const UsernameSettingsModal: React.FC<UsernameSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  onUsernameUpdated,
}) => {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUsername(currentUsername || '');
      setStatus('idle');
      setError('');
    }
  }, [isOpen, currentUsername]);

  useEffect(() => {
    if (!username || username.length < 3) {
      setStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      if (!/^[a-z0-9_]{3,32}$/.test(username)) {
        setStatus('invalid');
        return;
      }
      setStatus('checking');
      setTimeout(() => {
        setStatus('available');
      }, 300);
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = async () => {
    if (status !== 'available') return;
    setSaving(true);
    try {
      const apiService = (await import('../services/apiService')).apiService;
      const result = await apiService.updateUsername(username);
      if (result.success && result.profile) {
        onUsernameUpdated(result.profile.username);
        onClose();
      } else {
        setError(result.error || 'Failed to update username');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="username-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 24,
        }}
      >
        <motion.div
          key="username-modal"
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="username-title"
          data-testid="username-settings-modal"
          className="bg-tg-modal-bg dark:bg-tg-dark-modal-bg rounded-2xl shadow-xl max-w-md w-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-tg-border dark:border-tg-dark-border">
            <h2
              id="username-title"
              className="text-lg font-semibold text-tg-text dark:text-tg-dark-text"
            >
              Имя пользователя
            </h2>
            <button
              ref={cancelRef}
              onClick={onClose}
              aria-label="Закрыть"
              className="p-2 rounded-lg hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
              Установите уникальное имя пользователя, чтобы вас можно было найти по @username.
              Только латиница, цифры и подчёркивание (3-32 символа).
            </div>

            <div className="relative">
              <label htmlFor="username-input" className="sr-only">
                Имя пользователя
              </label>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-textSecondary dark:text-tg-dark-textSecondary">
                @
              </span>
              <input
                ref={inputRef}
                id="username-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full pl-8 pr-4 py-2.5 bg-tg-background dark:bg-tg-dark-background border rounded-lg text-tg-text dark:text-tg-dark-text placeholder-tg-textSecondary dark:placeholder-tg-dark-textSecondary focus:outline-none focus:ring-2 focus:ring-tg-primary"
                maxLength={32}
              />
              {status === 'checking' && (
                <SettingsIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-tg-primary" />
              )}
              {status === 'available' && (
                <CheckCircleIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>

            {error && <div className="text-sm text-red-500 dark:text-red-400">{error}</div>}

            {status === 'invalid' && username.length > 0 && (
              <div className="text-sm text-red-500 dark:text-red-400">
                3-32 символа: только латиница, цифры и подчёркивание
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-tg-border dark:border-tg-dark-border flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-text dark:hover:text-tg-dark-text transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={status !== 'available' || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-tg-primary hover:bg-tg-primaryHover disabled:bg-tg-border dark:disabled:bg-tg-dark-border disabled:text-tg-textSecondary dark:disabled:text-tg-dark-textSecondary rounded-lg transition-colors"
            >
              {saving ? <SettingsIcon className="w-4 h-4 animate-spin mr-2" /> : null}
              Сохранить
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UsernameSettingsModal;
