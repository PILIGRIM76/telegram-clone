// v3.18: Forward Messages Modal
// Модальное окно для пересылки сообщения контактам и группам.

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Contact, Group, Message } from '../types';
import { CheckIcon, SearchIcon, UserCircleIcon, UserPlusIcon } from './icons';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: Message | null;
  contacts: Contact[];
  groups: Group[];
  currentUserUid: string;
  onConfirm: (targetChatIds: string[]) => void;
}

interface ForwardTarget {
  id: string;
  name: string;
  type: 'contact' | 'group';
  avatar?: string;
}

const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  messageToForward,
  contacts,
  groups,
  currentUserUid,
  onConfirm,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedTargets(new Set());
    }
  }, [isOpen]);

  const allTargets: ForwardTarget[] = [
    ...contacts
      .filter(c => c.uid !== currentUserUid)
      .map(c => ({
        id: c.uid,
        name: c.name,
        type: 'contact' as const,
      })),
    ...groups
      .filter(g => g.members.includes(currentUserUid))
      .map(g => ({
        id: g.id,
        name: g.name,
        type: 'group' as const,
      })),
  ];

  const filteredTargets = allTargets.filter(target =>
    target.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleTarget = (targetId: string) => {
    const newSelected = new Set(selectedTargets);
    if (newSelected.has(targetId)) {
      newSelected.delete(targetId);
    } else {
      newSelected.add(targetId);
    }
    setSelectedTargets(newSelected);
  };

  const handleConfirm = () => {
    if (selectedTargets.size > 0) {
      onConfirm(Array.from(selectedTargets));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="forward-backdrop"
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
          key="forward-modal"
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forward-title"
          data-testid="forward-modal"
          className="bg-tg-modal-bg dark:bg-tg-dark-modal-bg rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-tg-border dark:border-tg-dark-border">
            <h2
              id="forward-title"
              className="text-lg font-semibold text-tg-text dark:text-tg-dark-text"
            >
              Переслать сообщение
            </h2>
            <button
              ref={cancelRef}
              onClick={onClose}
              aria-label="Закрыть"
              className="p-2 rounded-lg hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Message preview */}
          <div className="p-4 bg-tg-hover dark:bg-tg-dark-hover border-b border-tg-border dark:border-tg-dark-border">
            <div className="text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary mb-1">
              Пересылаемое сообщение:
            </div>
            <div className="text-sm text-tg-text dark:text-tg-dark-text max-h-24 overflow-hidden text-ellipsis whitespace-pre-wrap">
              {messageToForward?.text || messageToForward?.encryptedPayload || '[Медиа]'}
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-tg-border dark:border-tg-dark-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tg-textSecondary dark:text-tg-dark-textSecondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск контактов и групп..."
                className="w-full pl-10 pr-4 py-2 bg-tg-background dark:bg-tg-dark-background border border-tg-border dark:border-tg-dark-border rounded-lg text-tg-text dark:text-tg-dark-text placeholder-tg-textSecondary dark:placeholder-tg-dark-textSecondary focus:outline-none focus:ring-2 focus:ring-tg-primary"
              />
            </div>
          </div>
          {/* Targets List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTargets.length === 0 ? (
              <div className="text-center text-tg-textSecondary dark:text-tg-dark-textSecondary py-8">
                {searchQuery ? 'Ничего не найдено' : 'Нет доступных контактов или групп'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTargets.map(target => (
                  <button
                    key={target.id}
                    onClick={() => handleToggleTarget(target.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      selectedTargets.has(target.id)
                        ? 'bg-tg-primary/10 dark:bg-tg-primary/20'
                        : 'hover:bg-tg-hover dark:hover:bg-tg-dark-hover'
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        target.type === 'contact'
                          ? 'bg-tg-primary/10 dark:bg-tg-primary/20'
                          : 'bg-tg-primary/10 dark:bg-tg-primary/20'
                      }`}
                    >
                      {target.type === 'contact' ? (
                        <UserCircleIcon className="w-5 h-5 text-tg-primary dark:text-tg-primary" />
                      ) : (
                        <UserPlusIcon className="w-5 h-5 text-tg-primary dark:text-tg-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-tg-text dark:text-tg-dark-text truncate">
                        {target.name}
                      </div>
                      <div className="text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary">
                        {target.type === 'contact' ? 'Контакт' : 'Группа'}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedTargets.has(target.id) ? (
                        <div className="w-6 h-6 rounded-full border-2 border-tg-primary flex items-center justify-center">
                          <CheckIcon className="w-4 h-4 text-tg-primary" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-tg-border dark:border-tg-dark-border" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected count */}
          {selectedTargets.size > 0 && (
            <div className="px-4 py-3 border-t border-tg-border dark:border-tg-dark-border bg-tg-hover dark:bg-tg-dark-hover">
              <div className="text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
                Выбрано:{' '}
                <span className="font-medium text-tg-primary dark:text-tg-primary">
                  {selectedTargets.size}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-tg-border dark:border-tg-dark-border flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-text dark:hover:text-tg-dark-text transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedTargets.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-tg-primary hover:bg-tg-primaryHover disabled:bg-tg-border dark:disabled:bg-tg-dark-border disabled:text-tg-textSecondary dark:disabled:text-tg-dark-textSecondary rounded-lg transition-colors"
            >
              Переслать
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ForwardModal;
