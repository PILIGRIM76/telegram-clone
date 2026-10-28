import { logger } from '../services/logger';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAccentColor } from '../hooks/useAccentColor';
import type { Chat, Contact, Group, IdentityType } from '../types';
import AddContactModal from './AddContactModal';
import { AnimatedAvatar } from './AnimatedAvatar';
import CreateGroupModal from './CreateGroupModal';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { BellSlashIcon } from './icons/BellSlashIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { StoreIcon } from './icons/StoreIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { UsersIcon } from './icons/UsersIcon';

interface ContactListProps {
  identity: IdentityType;
  contacts: Contact[];
  groups: Group[];
  onAddContact: (name: string, uid: string, publicKey?: string) => void;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  chats: Record<string, Chat>;
  onOpenProfile: () => void;
  onMuteChat: (contactId: string, duration: number | 'forever' | null) => void;
  onArchiveChat: (contactId: string, archive: boolean) => void;
  onCreateGroup: (name: string, type: 'public' | 'private') => void;
  onOpenStore: () => void;
  onOpenBoards: () => void;
}

const ContactList: React.FC<ContactListProps> = ({
  identity,
  contacts,
  groups: _groups,
  onAddContact,
  selectedChatId,
  onSelectChat,
  chats,
  onOpenProfile,
  onMuteChat,
  onArchiveChat,
  onCreateGroup,
  onOpenStore,
  onOpenBoards,
}) => {
  const { t } = useTranslation();
  // Динамическая тема акцентного цвета.
  const theme = useAccentColor();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [_copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; contact: Contact } | null>(
    null
  );
  const [showArchive, setShowArchive] = useState(false);

  // Этап 2: запись состояния для отладки.
  useEffect(() => {
    logger.info('🔔 [ContactList] isContactModalOpen changed:', isContactModalOpen);
  }, [isContactModalOpen]);

  // Этап 2C: слушаем пользовательское событие от FAB для открытия AddContactModal.
  useEffect(() => {
    const handler = () => {
      logger.info('[PILIGRIM] ContactList: received FAB event, opening AddContactModal');
      setIsContactModalOpen(true);
    };
    window.addEventListener('piligrim:open-add-contact', handler);
    return () => window.removeEventListener('piligrim:open-add-contact', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsGroupModalOpen(true);
    window.addEventListener('piligrim:open-create-group', handler);
    return () => window.removeEventListener('piligrim:open-create-group', handler);
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, contact: Contact) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, contact });
  };

  const setMute = (duration: number | 'forever' | null) => {
    if (contextMenu) {
      const contactId = contextMenu.contact.id;
      let until: number | 'forever' | null = null;
      if (duration) {
        until = duration === 'forever' ? 'forever' : Date.now() + duration;
      }
      onMuteChat(contactId, until);
      setContextMenu(null);
    }
  };

  const toggleArchive = (contactId: string, toArchive: boolean) => {
    onArchiveChat(contactId, toArchive);
    setContextMenu(null);
  };

  const _handleCopyUid = () => {
    void navigator.clipboard.writeText(identity.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Фильтрация списков
  const activeContacts = contacts.filter(c => !c.archived && c.uid !== 'system');
  const archivedContacts = contacts.filter(c => c.archived);
  const systemChat = contacts.find(c => c.uid === 'system');

  const displayedContacts = showArchive ? archivedContacts : activeContacts;
  const formatChatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toDateString() === new Date().toDateString()
      ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Фиксируем время один раз за рендер, чтобы не вызывать Date.now() в JSX.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return (
    <>
      <aside
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--color-bg-primary)',
          borderRight: '1px solid var(--color-border)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
        onClick={e => {
          // Делегируем обработку кликов по кнопкам заголовка.
          const target = e.target as HTMLElement;
          const button = target.closest('button[data-action]');
          if (button) {
            const action = button.getAttribute('data-action');
            logger.info('🎯 [ContactList] Delegated click:', action);
            if (action === 'add-contact') {
              logger.info('🎯 [ContactList] Setting isContactModalOpen = true');
              setIsContactModalOpen(true);
              logger.info('🎯 [ContactList] After setState, isContactModalOpen is now:', true);
            } else if (action === 'create-group') setIsGroupModalOpen(true);
            else if (action === 'open-profile') onOpenProfile();
          }
        }}
      >
        {/* Заголовок */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border-strong)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-surface)',
            flexShrink: 0,
            minHeight: '56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {showArchive && (
              <button
                onClick={() => setShowArchive(false)}
                className="pg-icon-btn"
                style={{ marginRight: '8px' }}
              >
                ←
              </button>
            )}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {showArchive ? t('archive_title') : t('chats_title')}
            </h2>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              position: 'relative',
              zIndex: 100,
            }}
          >
            <button
              data-action="add-contact"
              onClick={() => setIsContactModalOpen(true)}
              className="pg-primary-btn"
              style={{ padding: '6px 12px', minWidth: 60, minHeight: 36, fontSize: 14 }}
              title={t('add_contact')}
            >
              <UserPlusIcon className="w-5 h-5" />
              <span>+</span>
            </button>
            <button
              data-action="create-group"
              onClick={() => setIsGroupModalOpen(true)}
              className="pg-icon-btn"
              style={{ minWidth: 36, minHeight: 36 }}
              title={t('create_group')}
            >
              <UsersIcon className="w-5 h-5" />
            </button>
            <button
              data-action="open-profile"
              onClick={onOpenProfile}
              className="pg-icon-btn"
              style={{ minWidth: 36, minHeight: 36 }}
              title="Настройки"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Список */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Системный чат (всегда сверху, если не в архиве) */}
          {!showArchive && systemChat && (
            <button
              onClick={() => onSelectChat(systemChat.id)}
              className="pg-list-row"
              style={{ borderRadius: 0, borderBottom: '1px solid var(--color-divider)' }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--color-danger-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BellSlashIcon className="w-6 h-6" />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                  {t('system_notifications')}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--color-text-tertiary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('system_desc')}
                </p>
              </div>
            </button>
          )}

          {/* Папка Архив */}
          {!showArchive && archivedContacts.length > 0 && (
            <button
              onClick={() => setShowArchive(true)}
              className="pg-list-row"
              style={{ borderRadius: 0, borderBottom: '1px solid var(--color-divider)' }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--color-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArchiveBoxIcon className="w-6 h-6" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                  {t('archive_title')}
                </p>
                <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: 0 }}>
                  {archivedContacts.length} чатов
                </p>
              </div>
            </button>
          )}

          {/* Группы (если мы не в архиве) */}
          {!showArchive &&
            _groups.map(group => {
              const selected = group.id === selectedChatId;
              const lastMessage = chats[group.id]?.messages.slice(-1)[0];
              return (
                <button
                  key={group.id}
                  onClick={() => onSelectChat(group.id)}
                  className={`pg-list-row ${selected ? 'is-selected' : ''}`}
                  style={{ borderRadius: 0, borderBottom: '1px solid var(--color-divider)' }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'var(--color-accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <UsersIcon className="w-6 h-6" />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {group.name}
                      </p>
                      {group.type === 'private' && (
                        <span
                          style={{ fontSize: 12, color: 'var(--color-warning)', flexShrink: 0 }}
                        >
                          🔒
                        </span>
                      )}
                    </div>
                    {lastMessage && (
                      <p
                        style={{
                          fontSize: 14,
                          color: 'var(--color-text-tertiary)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lastMessage.text.startsWith('{"') ? 'Системное сообщение' : 'Сообщение…'}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}

          {/* Контакты */}
          {displayedContacts.length === 0 && _groups.length === 0 && !systemChat ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                fontSize: 14,
              }}
            >
              {showArchive ? 'Архив пуст' : 'Нет активных чатов'}
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              // prettier-ignore
              {displayedContacts.map(contact => {
                const selected = contact.id === selectedChatId;
                const isMuted =
                  contact.mutedUntil === 'forever' ||
                  (typeof contact.mutedUntil === 'number' && contact.mutedUntil > now);
                const lastMessage = chats[contact.id]?.messages.slice(-1)[0];

                return (
                  <li key={contact.id} onContextMenu={e => handleContextMenu(e, contact)}>
                    <button
                      onClick={() => onSelectChat(contact.id)}
                      className={`pg-list-row ${selected ? 'is-selected' : ''}`}
                      style={{ borderRadius: 0, borderBottom: '1px solid var(--color-divider)' }}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <AnimatedAvatar
                          name={contact.name}
                          size={54}
                          accentColor={theme.color}
                          isOnline={contact.isOnline}
                          e2eeStatus={
                            contact.e2eeStatus || (contact.verified ? 'verified' : 'unverified')
                          }
                        />
                        {!contact.e2eeStatus && contact.verified && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: -1,
                              right: -1,
                              background: 'var(--color-surface)',
                              borderRadius: '50%',
                              padding: 1,
                            }}
                          >
                            <CheckCircleIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <p
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text-primary)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {contact.name}
                          </p>
                          <span
                            className="ml-2 flex-shrink-0 text-xs"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {formatChatTime(lastMessage?.timestamp)}
                          </span>
                          {isMuted && (
                            <span
                              style={{
                                color: 'var(--color-text-tertiary)',
                                display: 'flex',
                                flexShrink: 0,
                              }}
                            >
                              <BellSlashIcon className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                        {lastMessage && (
                          <p
                            style={{
                              fontSize: 14,
                              color: 'var(--color-text-tertiary)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {lastMessage.senderId === identity.uid ? 'Вы: ' : ''}
                            {lastMessage.text.startsWith('{"') ? 'Скрытые данные…' : 'Сообщение…'}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Футер */}
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
            <button onClick={onOpenStore} className="pg-footer-btn">
              <StoreIcon className="w-6 h-6" />
              <span style={{ fontSize: 10 }}>{t('store_btn')}</span>
            </button>
            <button onClick={onOpenBoards} className="pg-footer-btn">
              <ClipboardDocumentListIcon className="w-6 h-6" />
              <span style={{ fontSize: 10 }}>{t('boards_btn')}</span>
            </button>
          </div>
          <div
            style={{
              background: 'var(--color-surface-2)',
              borderRadius: 12,
              padding: 8,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-accent-soft)',
                color: 'var(--color-accent)',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
                flexShrink: 0,
              }}
            >
              {identity.avatar || identity.uid.substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden', marginRight: 8 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {identity.username || 'Anonymous'}
              </p>
              <p
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-tertiary)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'var(--font-family-mono)',
                }}
              >
                {identity.uid}
              </p>
            </div>
            <button
              onClick={_handleCopyUid}
              className="pg-icon-btn"
              style={{ flexShrink: 0, color: _copied ? 'var(--color-success)' : undefined }}
            >
              {_copied ? (
                <CheckCircleIcon className="w-5 h-5" />
              ) : (
                <ClipboardIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {isContactModalOpen && (
        <AddContactModal onClose={() => setIsContactModalOpen(false)} onAddContact={onAddContact} />
      )}
      {isGroupModalOpen && (
        <CreateGroupModal onClose={() => setIsGroupModalOpen(false)} onCreate={onCreateGroup} />
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            zIndex: 50,
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--shadow-3)',
            padding: '4px 0',
            width: 208,
            border: '1px solid var(--color-border)',
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            {contextMenu.contact.name}
          </div>

          <button
            onClick={() => toggleArchive(contextMenu.contact.id, !contextMenu.contact.archived)}
            className="pg-menu-row"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            <span>{contextMenu.contact.archived ? 'Разархивировать' : 'Архивировать'}</span>
          </button>

          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

          {contextMenu.contact.mutedUntil ? (
            <button onClick={() => setMute(null)} className="pg-menu-row">
              Разблокировать уведомления
            </button>
          ) : (
            <>
              <div
                style={{
                  padding: '4px 12px',
                  fontSize: 10,
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                }}
              >
                Заглушить уведомления
              </div>
              <button
                onClick={() => setMute(3600 * 1000)}
                className="pg-menu-row"
                style={{ paddingLeft: 24 }}
              >
                На 1 час
              </button>
              <button
                onClick={() => setMute(8 * 3600 * 1000)}
                className="pg-menu-row"
                style={{ paddingLeft: 24 }}
              >
                На 8 часов
              </button>
              <button
                onClick={() => setMute('forever')}
                className="pg-menu-row"
                style={{ paddingLeft: 24 }}
              >
                Навсегда
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ContactList;
