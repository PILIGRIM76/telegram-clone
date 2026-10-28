import { logger } from '../services/logger';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../services/apiService';
import { decryptAESGCM, decryptFile, getPrivateKey } from '../services/cryptoService';
import type { Contact, IdentityType, Message } from '../types';
import type { MenuItem } from './ContextMenu';
import { ContextMenu } from './ContextMenu';
import { ClockIcon } from './icons/ClockIcon';
import { VoicePlayer } from './VoicePlayer';

interface MessageItemProps {
  message: Message;
  currentIdentity: IdentityType;
  onDelete?: (messageId: string) => void;
  disappearTimer?: number;
  currentUserUid?: string;
  isAdmin?: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  showAvatar?: boolean;
  partner?: (Contact | { name: string }) & {
    isOnline?: boolean;
    lastSeen?: number;
    uid?: string;
  };
}

function getEncryptedPayload(payload: unknown): string | undefined {
  if (typeof payload === 'string') return payload;
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'encryptedPayload' in payload &&
    typeof payload.encryptedPayload === 'string'
  ) {
    return payload.encryptedPayload;
  }
  return undefined;
}

// Вспомогательный компонент значков статуса сообщения в стиле настольного Telegram.
const MessageStatusIcons: React.FC<{
  message: Message;
  sentByMe: boolean;
  disappearTimer?: number;
}> = ({ message, sentByMe, disappearTimer }) => {
  const incomingEncryptedPayload = getEncryptedPayload(message.payload);
  const hasEncryptedPayload = !!(message.encryptedPayload || incomingEncryptedPayload);
  const isPlaintextFallback = incomingEncryptedPayload?.startsWith('PLAINTEXT_FALLBACK:');
  const isDecrypted = !hasEncryptedPayload || !isPlaintextFallback;
  const disappearDuration = message.disappearIn || disappearTimer;

  // v3.17: Таймер обратного отсчёта для исчезающих сообщений
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!message.expiresAt) return null;
    const remaining = Math.ceil((message.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  useEffect(() => {
    if (!message.expiresAt) return;
    const updateRemaining = () => {
      const remaining = Math.ceil((message.expiresAt! - Date.now()) / 1000);
      setRemainingSeconds(remaining > 0 ? remaining : 0);
    };
    updateRemaining();
    // Обновление каждые 10 секунд, чтобы избежать лишних перерисовок
    const interval = setInterval(updateRemaining, 10000);
    return () => clearInterval(interval);
  }, [message.expiresAt]);

  const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Форматирование оставшегося времени для отображения
  const formatRemaining = (seconds: number): string => {
    if (seconds <= 0) return '0с';
    if (seconds < 60) return `${seconds}с`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}м`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}ч`;
    return `${Math.floor(seconds / 86400)}д`;
  };

  return (
    <div className="inline-flex items-center space-x-1 mt-1 text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary select-none">
      {hasEncryptedPayload && isPlaintextFallback && (
        <span
          title="Не зашифровано (fallback)"
          className="text-[10px] opacity-60"
          aria-label="not-encrypted"
        >
          🔓⚠
        </span>
      )}
      {hasEncryptedPayload && isDecrypted && !isPlaintextFallback && (
        <span title="E2EE: расшифровано" className="text-[10px] opacity-60" aria-label="decrypted">
          🔓
        </span>
      )}
      {hasEncryptedPayload && !isDecrypted && (
        <span title="E2EE: зашифровано" className="text-[10px] opacity-60" aria-label="encrypted">
          🔒
        </span>
      )}
      {message.status === 'received' && (
        <span title="Получено" className="text-[10px] opacity-70" aria-label="received">
          ⬇
        </span>
      )}
      {disappearDuration && (
        <span title={`Исчезнет через ${disappearDuration} сек`}>
          <ClockIcon className="w-3 h-3 opacity-70 text-yellow-300" />
        </span>
      )}
      {remainingSeconds !== null && remainingSeconds > 0 && (
        <span
          className="text-[10px] opacity-80 text-yellow-300"
          title={`Осталось: ${formatRemaining(remainingSeconds)}`}
        >
          ⏳ {formatRemaining(remainingSeconds)}
        </span>
      )}
      {remainingSeconds !== null && remainingSeconds <= 0 && (
        <span className="text-[10px] opacity-80 text-red-400" title="Сообщение истекло">
          ⏳ 0с
        </span>
      )}
      <span className="text-[10px] opacity-70 whitespace-nowrap">{time}</span>
      {sentByMe && message.status && message.status !== 'received' && (
        <span
          className={`text-[10px] ${message.status === 'read' ? 'text-blue-500 dark:text-blue-400' : 'text-tg-textSecondary dark:text-tg-dark-textSecondary'}`}
          title={
            message.status === 'read'
              ? 'Прочитано'
              : message.status === 'delivered'
                ? 'Доставлено'
                : 'Отправлено'
          }
        >
          {message.status === 'sent' ? '✓' : '✓✓'}
        </span>
      )}
    </div>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentIdentity,
  onDelete,
  disappearTimer,
  currentUserUid,
  isAdmin = false,
  onEdit,
  onReply,
  onForward,
  showAvatar = false,
  partner,
}) => {
  const [visible, setVisible] = useState(true);
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [decryptedBlobs, setDecryptedBlobs] = useState<{ [key: string]: Blob }>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const currentUid = currentUserUid || currentIdentity?.uid || '';
  const voiceAttachment = message.encryptedAttachments?.[0];
  const encryptedVoiceBlob = useMemo(
    () =>
      voiceAttachment ? new Blob([voiceAttachment.ciphertext], { type: 'application/json' }) : null,
    [voiceAttachment?.ciphertext]
  );

  useEffect(() => {
    let cancelled = false;
    if (message.type === 'user' && !message.isDeleted && !decryptedText) {
      const attemptDecrypt = async () => {
        try {
          const privateKeyHex = getPrivateKey(currentIdentity);
          const encryptedPayload = message.encryptedPayload || getEncryptedPayload(message.payload);
          if (!encryptedPayload) return;
          const decrypted = await decryptAESGCM(encryptedPayload, privateKeyHex);
          if (!cancelled) setDecryptedText(decrypted);
        } catch (err) {
          logger.debug('[PILIGRIM] MessageItem decrypt failed:', err);
        }
      };
      void attemptDecrypt();
    } else if (message.type === 'user' && !message.isDeleted && message.text) {
      queueMicrotask(() => {
        if (!cancelled) setDecryptedText(message.text);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [message, currentIdentity, decryptedText]);

  useEffect(() => {
    const attachments = message.encryptedAttachments;
    if (!attachments?.length || message.type === 'voice') return;
    let cancelled = false;
    const decrypt = async () => {
      const privateKey = getPrivateKey(currentIdentity);
      if (!privateKey) return;
      const blobs: { [key: string]: Blob } = {};
      for (const att of attachments) {
        try {
          const blob = await decryptFile(
            att.ciphertext,
            att.iv,
            att.key,
            privateKey,
            att.type,
            att.size
          );
          blobs[att.id] = blob;
        } catch (e) {
          logger.error('[PILIGRIM] Failed to decrypt attachment:', att.name, e);
        }
      }
      if (!cancelled) setDecryptedBlobs(blobs);
    };
    void decrypt();
    return () => {
      cancelled = true;
    };
  }, [message.encryptedAttachments, currentIdentity]);

  useEffect(() => {
    let timeUntilExpiry: number | null = null;

    const { timerSetAt, disappearIn } = message;

    if (disappearIn && timerSetAt) {
      const elapsed = (Date.now() - timerSetAt) / 1000;
      timeUntilExpiry = Math.max(0, disappearIn - elapsed);
    } else if (disappearTimer) {
      timeUntilExpiry = disappearTimer;
    }

    if (timeUntilExpiry !== null) {
      const timer = setTimeout(
        () => {
          setVisible(false);
        },
        Math.max(timeUntilExpiry, 0) * 1000
      );
      return () => clearTimeout(timer);
    }
  }, [message, disappearTimer]);

  if (!visible) return null;

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleEdit = () => {
    setEditText(decryptedText || message.text || '');
    setIsEditing(true);
    handleCloseContextMenu();
  };

  const handleSaveEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
    handleCloseContextMenu();
  };

  const handleDeleteForMe = () => {
    if (onDelete) onDelete(message.id);
    handleCloseContextMenu();
  };

  const handleDeleteForAll = () => {
    if (onDelete) onDelete(message.id);
    handleCloseContextMenu();
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(decryptedText)
        .catch((err: unknown) => logger.warn('[PILIGRIM] Clipboard write failed:', err));
    }
    handleCloseContextMenu();
  };

  const handleForward = () => {
    onForward?.(message);
    handleCloseContextMenu();
  };

  const handleReply = () => {
    onReply?.(message);
    handleCloseContextMenu();
  };

  const handleReactionClick = (emoji: string) => {
    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    const userReacted = existingReaction?.users?.includes(currentUid) || false;
    const action = userReacted ? 'remove' : 'add';

    // Отправка на сервер - WS-событие обновит UI
    void apiService.addReaction(message.id, emoji, action);
  };

  const isOwn = message.senderId === currentUid;
  const canEdit = isOwn && message.type === 'user' && !message.isDeleted;
  const canDelete = isOwn || isAdmin;

  const contextMenuItems: MenuItem[] = [
    { id: 'reply', icon: '↩️', label: 'Ответить', onClick: handleReply },
    { id: 'copy', icon: '📋', label: 'Копировать', onClick: handleCopy },
    { id: 'forward', icon: '↪️', label: 'Переслать', onClick: handleForward },
  ];

  if (canEdit) {
    contextMenuItems.splice(1, 0, {
      id: 'edit',
      icon: '✏️',
      label: 'Редактировать',
      onClick: handleEdit,
    });
  }

  if (canDelete) {
    contextMenuItems.push({
      id: 'delete_me',
      icon: '🗑️',
      label: 'Удалить для себя',
      dividerBefore: true,
      dangerous: true,
      onClick: handleDeleteForMe,
    });
    if (isOwn) {
      contextMenuItems.push({
        id: 'delete_all',
        icon: '🗑️',
        label: 'Удалить для всех',
        dangerous: true,
        onClick: handleDeleteForAll,
      });
    }
  }

  // Render context menu
  const contextMenuContent = contextMenu ? (
    <ContextMenu
      isOpen={true}
      x={contextMenu.x}
      y={contextMenu.y}
      items={contextMenuItems}
      onClose={handleCloseContextMenu}
    />
  ) : null;

  return (
    <div
      ref={messageRef}
      className={`animate-fade-in ${message.highlighted ? 'bg-yellow-100/50 dark:bg-yellow-900/30 animate-pulse' : ''}`}
      onContextMenu={handleContextMenu}
    >
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 min-w-0`}>
        {!isOwn && showAvatar && partner && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-tg-border dark:border-tg-dark-border">
              <div className="flex items-center justify-center w-full h-full bg-gray-300 dark:bg-gray-600 text-xs font-semibold text-tg-text dark:text-tg-dark-text">
                {partner.name
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        )}

        <div
          className={`max-w-[65%] px-3 py-2 rounded-2xl shadow-sm ${
            isOwn
              ? 'bg-tg-outgoing dark:bg-tg-dark-outgoing text-tg-text dark:text-tg-dark-text rounded-tr-sm'
              : 'bg-tg-incoming dark:bg-tg-dark-incoming text-tg-text dark:text-tg-dark-text rounded-tl-sm'
          }`}
        >
          {isEditing && (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  handleCloseContextMenu();
                }
              }}
              className="w-full bg-transparent outline-none text-tg-text dark:text-tg-dark-text resize-none py-1 px-0 max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words"
              rows={1}
              autoFocus
            />
          )}
          {!isEditing && (
            <>
              {message.type === 'voice' &&
                voiceAttachment &&
                encryptedVoiceBlob &&
                message.voiceMetadata && (
                  <VoicePlayer
                    encryptedBlob={encryptedVoiceBlob}
                    metadata={message.voiceMetadata}
                    privateKeyHex={getPrivateKey(currentIdentity)}
                    isOwn={isOwn}
                  />
                )}

              {decryptedText && (
                <>
                  <div className="whitespace-pre-wrap break-words">{decryptedText}</div>
                  {message.forwardedFrom && (
                    <div className="mt-1 text-xs font-medium text-tg-textSecondary dark:text-tg-dark-textSecondary flex items-center gap-1">
                      <span>Переслано от:</span>
                      <span className="text-tg-primary">
                        {message.forwardedFrom.originalSenderName || 'Unknown'}
                      </span>
                      {message.forwardedFrom.forwardCount > 1 && (
                        <span className="text-tg-textSecondary dark:text-tg-dark-textSecondary">
                          ({message.forwardedFrom.forwardCount}x)
                        </span>
                      )}
                    </div>
                  )}
                  {message.isEdited && (
                    <span className="text-[10px] text-tg-textSecondary dark:text-tg-dark-textSecondary ml-1">
                      изменено
                    </span>
                  )}
                </>
              )}

              {message.isDeleted && (
                <div className="italic text-[10px] text-tg-textSecondary dark:text-tg-dark-textSecondary">
                  Сообщение удалено
                </div>
              )}

              <MessageStatusIcons
                message={message}
                sentByMe={isOwn}
                disappearTimer={disappearTimer}
              />

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div
                  className={`flex gap-1 mt-1 ${isOwn ? 'ml-auto' : 'mr-auto'} max-w-[65%]`}
                  role="group"
                  aria-label="Message reactions"
                >
                  {message.reactions.map(reaction => (
                    <button
                      key={`${reaction.emoji}-${reaction.count}`}
                      type="button"
                      onClick={() => handleReactionClick(reaction.emoji)}
                      className={`
                        bg-tg-reaction-bg dark:bg-tg-dark-reaction-bg
                        rounded-full px-2 py-0.5 text-xs font-medium
                        cursor-pointer hover:bg-tg-reaction-hover
                        transition-colors
                        ${
                          reaction.mine
                            ? 'ring-1 ring-tg-primary bg-tg-primary/10 text-tg-primary'
                            : 'text-tg-text dark:text-tg-dark-text'
                        }
                      `}
                      aria-pressed={reaction.mine}
                      aria-label={`${reaction.emoji} ${reaction.count} ${reaction.mine ? '(ваша реакция)' : ''}`}
                    >
                      {reaction.emoji} {reaction.count > 1 ? reaction.count : ''}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {isOwn && showAvatar && partner && (
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-tg-border dark:border-tg-dark-border">
              <div className="flex items-center justify-center w-full h-full bg-gray-300 dark:bg-gray-600 text-xs font-semibold text-tg-text dark:text-tg-dark-text">
                {partner.name
                  .split(' ')
                  .map(w => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </div>
      {contextMenuContent}
    </div>
  );
};

export default MessageItem;
