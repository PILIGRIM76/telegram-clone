// PILIGRIM v4.0 — ChatWindow (unified design system)
// Все цвета/радиусы/тени берутся из токенов index.css через var(--...).
// Больше нет хардкода slate/blue; единый визуальный язык с shell-компонентами.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Message, Contact } from '../types';
import { useImagePicker } from '../hooks/useImagePicker';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { AttachmentSheet } from './AttachmentSheet';
import { ContextMenu } from './ContextMenu';
import AnimatedAvatar from './AnimatedAvatar';
import { EncryptionBadge, type EncryptionType } from './EncryptionBadge';
import { logger } from '../services/logger';
import { apiService } from '../services/apiService';
import { List, ListImperativeAPI } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import MessageItem from './MessageItem';
import { MessageEditModal } from './MessageEditModal';

interface ChatWindowProps {
  chatId: string;
  messages: Message[];
  onSendMessage: (text: string, attachments?: { id: string; dataUrl: string; name: string }[], replyTo?: string) => void;
  // v3.11: Partner type extended with presence info
  partner?: (Contact | { name: string }) & { isOnline?: boolean; lastSeen?: number; uid?: string };
  currentUserUid?: string;
  onBack?: () => void;
  onStartCall?: () => void;
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  mutedUntil?: number;
  onVerifyContact?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  encryptionType?: EncryptionType;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

// v3.11: Format last seen timestamp
const formatLastSeen = (timestamp: number): string => {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн. назад`;
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  messages,
  onSendMessage,
  partner,
  currentUserUid,
  onBack,
  onStartCall,
  callState = 'idle',
  mutedUntil,
  onVerifyContact,
  onDeleteMessage,
  onEditMessage,
  encryptionType = 'unknown',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}) => {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [editModalMessage, setEditModalMessage] = useState<Message | null>(null);
  
  // v3.11: Typing indicator
  const { isTyping, onInputChange, onMessageSent } = useTypingIndicator(chatId);

  // v3.11: Partner presence state
  const [partnerIsOnline, setPartnerIsOnline] = useState(partner?.isOnline ?? false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(partner?.lastSeen);

  // v3.11: Listen for presence updates
  useEffect(() => {
    const handlePresenceUpdate = (data: { uid: string; isOnline: boolean; lastSeen: number | null }) => {
      if (data.uid === partner?.uid) {
        setPartnerIsOnline(data.isOnline);
        if (data.lastSeen) {
          setPartnerLastSeen(data.lastSeen);
        }
      }
    };

    const handleReceiptUpdate = (data: { messageId: string; readerUid: string; timestamp: number }) => {
      // The message status will be updated via the readBy array in the message object
      // which gets updated when the message is re-rendered
      // We could trigger a re-render here if needed
    };

    apiService.onPresenceUpdate(handlePresenceUpdate);
    apiService.onReceiptUpdate(handleReceiptUpdate);

    return () => {
      apiService.offPresenceUpdate(handlePresenceUpdate);
      apiService.offReceiptUpdate(handleReceiptUpdate);
    };
  }, [partner?.uid]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<ListImperativeAPI>(null);
  const { inputRef: fileInputRef, pendingImages, openPicker, handleFiles, removeImage, clearImages } = useImagePicker();

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToRow({ index: messages.length - 1 });
    }
  }, [messages.length]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    const atts = pendingImages.length > 0 ? pendingImages : undefined;
    logger.info(`[PILIGRIM] ChatWindow: send to chatId=${chatId}, len=${trimmed.length}, attachments=${pendingImages.length}, replyTo=${replyTo?.id || 'none'}`);
    if (editingId && onEditMessage) {
      onEditMessage(editingId, trimmed);
      setEditingId(null);
    } else {
      onSendMessage(trimmed, atts, replyTo?.id);
      // v3.11: Stop typing indicator immediately on send
      onMessageSent();
    }
    clearImages();
    setDraft('');
    setReplyTo(null);
    inputRef.current?.focus();
  }, [draft, chatId, onSendMessage, onEditMessage, editingId, replyTo, pendingImages, onMessageSent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const partnerName = partner?.name ?? 'Чат';
  const initial = partnerName.charAt(0).toUpperCase();

const handleEditMessage = useCallback((messageId: string, newText: string) => {
    if (onEditMessage) {
      onEditMessage(messageId, newText);
    }
  }, [onEditMessage]);

  const handleDeleteMessage = useCallback((messageId: string) => {
    if (onDeleteMessage) {
      onDeleteMessage(messageId);
    }
  }, [onDeleteMessage]);

  const handleOpenEditModal = useCallback((message: Message) => {
    setEditModalMessage(message);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalMessage(null);
  }, []);

  const handleSaveEdit = useCallback((newContent: string) => {
    if (editModalMessage && onEditMessage) {
      onEditMessage(editModalMessage.id, newContent);
    }
    setEditModalMessage(null);
  }, [editModalMessage, onEditMessage]);
  const MessageRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const message = messages[index];
    
    return (
      <div style={style}>
        <MessageItemWrapper message={message} currentUserUid={currentUserUid} />
      </div>
    );
  }, [messages, currentUserUid]);

  const handleScroll = useCallback((scrollOffset: number) => {
    if (scrollOffset < 100 && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div
      data-testid="chat-window"
      data-chat-id={chatId}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-bg-primary)',
        minWidth: 0,
      } as React.CSSProperties}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
          gap: 'var(--space-3)',
        } as React.CSSProperties}
      >
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Назад"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-button)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            } as React.CSSProperties}
          >
            ‹
          </button>
        )}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-avatar)',
            background: 'var(--color-accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            color: 'var(--color-accent)',
            fontSize: '18px',
            flexShrink: 0,
          } as React.CSSProperties}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            } as React.CSSProperties}
          >
            {partnerName}
            <EncryptionBadge encryptionType={encryptionType} />
          </div>
          {/* v3.11: Typing indicator or last seen status */}
          <div style={{ minHeight: 20 }}>
            {isTyping ? (
              <span style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                печатает...
              </span>
            ) : (!partnerIsOnline && partnerLastSeen ? (
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                был(а) в сети {formatLastSeen(partnerLastSeen)}
              </span>
            ) : null)}
          </div>
          {callState === 'in-call' && (
            <span style={{ color: 'var(--color-success)', fontSize: 'var(--font-size-sm)' }}>🟢 В звонке</span>
          )}
        </div>
        {onStartCall && (
          <button
            onClick={onStartCall}
            disabled={callState !== 'idle'}
            aria-label={callState === 'idle' ? 'Начать звонок' : 'Звонок...'}
            style={{
              background: callState === 'idle' ? 'var(--color-primary)' : 'var(--color-surface-variant)',
              color: callState === 'idle' ? 'var(--color-on-primary)' : 'var(--color-text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              cursor: callState === 'idle' ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              flexShrink: 0,
            } as React.CSSProperties}
          >
            📞
            <span>{callState === 'idle' ? 'Звонок' : callState}</span>
          </button>
        )}
        {onVerifyContact && (
          <button
            onClick={onVerifyContact}
            aria-label="Верифицировать контакт"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 20, cursor: 'pointer', padding: 'var(--space-1) var(--space-2)', flexShrink: 0, borderRadius: 'var(--radius-button)' } as React.CSSProperties}
          >
            🔐
          </button>
        )}
      </header>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <AutoSizer
          ChildComponent={({ height, width }: { height: number | undefined; width: number | undefined }) => {
            if (height === undefined || width === undefined) {
              return null;
            }
            return React.createElement(
              List as React.ComponentType<any>,
              {
                listRef,
                height,
                width,
                itemCount: messages.length,
                itemSize: 80,
                onScroll: handleScroll as unknown as React.UIEventHandler<HTMLDivElement>,
                overscanCount: 10,
                rowComponent: MessageRow,
              }
            );
          }}
        />

        {isLoadingMore && (
          <div style={{
            position: 'absolute',
            top: 'var(--space-4)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-surface)',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10,
          }}>
            Загрузка...
          </div>
        )}

        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-md)',
          }}>
            Сообщений пока нет. Начните диалог!
          </div>
        )}
      </div>

      {isSheetOpen && (
        <AttachmentSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          onPick={openPicker}
        />
      )}

      <form onSubmit={handleSubmit} style={{ flexShrink: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          gap: 'var(--space-2)',
        } as React.CSSProperties}>
          <button
            type="button"
            onClick={() => openPicker('gallery')}
            aria-label="Прикрепить фото"
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 20, cursor: 'pointer', padding: 'var(--space-1) var(--space-2)', flexShrink: 0, borderRadius: 'var(--radius-button)' } as React.CSSProperties}
          >
            📎
          </button>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              // v3.11: Trigger typing indicator
              onInputChange();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение..."
            aria-label="Поле ввода сообщения"
            data-testid="message-input"
            style={{
              flex: 1,
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-input)',
              fontSize: 'var(--font-size-md)',
              outline: 'none',
              minWidth: 0,
            } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            data-testid="send-button"
            style={{
              padding: '0 var(--space-5)',
              backgroundColor: draft.trim() ? 'var(--color-primary)' : 'var(--color-surface-variant)',
              color: draft.trim() ? 'var(--color-on-primary)' : 'var(--color-text-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-input)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 600,
              cursor: draft.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
            } as React.CSSProperties}
          >
            Отправить
          </button>
        </div>
      </form>

      {ctx && (
        <ContextMenu
          isOpen={!!ctx}
          x={ctx.x}
          y={ctx.y}
          items={[
            { id: 'reply', icon: '↩️', label: 'Ответить', onClick: () => {
                const msg = messages.find((m) => m.id === ctx.messageId);
                if (msg) {
                  setReplyTo(msg);
                  setEditingId(null);
                }
                setCtx(null);
            }},
            {
              id: 'copy',
              icon: '📋',
              label: 'Копировать',
              onClick: () => {
                const msg = messages.find((m) => m.id === ctx.messageId);
                if (msg?.text && typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(msg.text).catch((err: unknown) =>
                    logger.warn('[PILIGRIM] Clipboard write failed:', err)
                  );
                }
              }
            },
            { id: 'edit', icon: '✏️', label: 'Редактировать', onClick: () => {
                const msg = messages.find((m) => m.id === ctx.messageId);
                if (msg && onEditMessage) {
                  setEditingId(msg.id);
                  setDraft(msg.text);
                  setReplyTo(null);
                  setCtx(null);
                  inputRef.current?.focus();
                }
            }},
            {
              id: 'delete',
              icon: '🗑️',
              label: 'Удалить',
              dangerous: true,
              onClick: () => {
                logger.info('[PILIGRIM] Delete message:', ctx.messageId);
                if (onDeleteMessage) {
                  onDeleteMessage(ctx.messageId);
                }
                setCtx(null);
              }
            }
          ]}
          onClose={() => setCtx(null)}
        />
      )}

      {editModalMessage && (
        <MessageEditModal
          message={editModalMessage}
          onSave={handleSaveEdit}
          onCancel={handleCloseEditModal}
        />
      )}
    </div>
  );
};

// Wrapper component for MessageItem to avoid circular imports
const MessageItemWrapper: React.FC<{ message: Message; currentUserUid?: string }> = ({ message, currentUserUid }) => {
  return (
    <MessageItem
      message={message}
      currentIdentity={{ uid: currentUserUid || '', publicKeyHex: '', privateKeyHex: '' }}
      currentUserUid={currentUserUid}
      onEdit={undefined}
      onDelete={undefined}
    />
  );

};
export default ChatWindow;