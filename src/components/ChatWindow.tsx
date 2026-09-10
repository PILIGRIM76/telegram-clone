// PILIGRIM v4.0 — ChatWindow (unified design system)
// Все цвета/радиусы/тени берутся из токенов index.css через var(--...).
// Больше нет хардкода slate/blue; единый визуальный язык со shell-компонентами.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Message, Contact } from '../types';
import { useImagePicker } from '../hooks/useImagePicker';
import { AttachmentSheet } from './AttachmentSheet';
import { ContextMenu } from './ContextMenu';
import AnimatedAvatar from './AnimatedAvatar';
import { EncryptionBadge, type EncryptionType } from './EncryptionBadge';
import { logger } from '../services/logger';

interface ChatWindowProps {
  chatId: string;
  messages: Message[];
  onSendMessage: (text: string, attachments?: { id: string; dataUrl: string; name: string }[], replyTo?: string) => void;
  partner?: Contact | { name: string };
  currentUserUid?: string;
  onBack?: () => void;
  onStartCall?: () => void;
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  mutedUntil?: number;
  onVerifyContact?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  encryptionType?: EncryptionType;
}

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
}) => {
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { inputRef: fileInputRef, pendingImages, openPicker, handleFiles, removeImage, clearImages } = useImagePicker();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    }
    clearImages();
    setDraft('');
    setReplyTo(null);
    inputRef.current?.focus();
  }, [draft, chatId, onSendMessage, onEditMessage, editingId, replyTo, pendingImages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const partnerName = partner?.name ?? 'Чат';
  const initial = partnerName.charAt(0).toUpperCase();

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
      {/* Header */}
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{partnerName}</span>
            <EncryptionBadge encryptionType={encryptionType} />
            {mutedUntil !== undefined && mutedUntil > Date.now() && (
              <span
                title={
                  mutedUntil === Number.MAX_SAFE_INTEGER
                    ? 'Уведомления заглушены навсегда'
                    : `Уведомления заглушены до ${new Date(mutedUntil).toLocaleTimeString()}`
                }
                data-testid="muted-indicator"
                style={{ fontSize: '14px', flexShrink: 0 }}
              >
                🔇
              </span>
            )}
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            {messages.length} {messages.length === 1 ? 'сообщение' : 'сообщений'}
          </div>
        </div>
        {onStartCall && (
          <button
            type="button"
            onClick={onStartCall}
            disabled={callState !== 'idle'}
            data-testid="call-button"
            title={callState === 'idle' ? 'Позвонить' : `Звонок: ${callState}`}
            aria-label="Позвонить"
            style={{
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: callState === 'in-call' ? 'var(--color-success)' : 'var(--color-accent)',
              color: 'var(--color-accent-contrast)',
              border: 'none',
              borderRadius: 'var(--radius-button)',
              fontSize: 'var(--font-size-md)',
              cursor: callState === 'idle' ? 'pointer' : 'not-allowed',
              opacity: callState === 'idle' ? 1 : 0.7,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
            } as React.CSSProperties}
          >
            {callState === 'in-call' ? '📞 В звонке' : callState === 'calling' ? '📞 Вызов…' : '📞'}
          </button>
        )}
        {onVerifyContact && (
          <button
            type="button"
            onClick={onVerifyContact}
            data-testid="verify-button"
            title="Верифицировать контакт"
            aria-label="Верифицировать контакт"
            style={{
              padding: 'var(--space-2) var(--space-3)',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-button)',
              fontSize: 'var(--font-size-md)',
              cursor: 'pointer',
              flexShrink: 0,
            } as React.CSSProperties}
          >
            🔐
          </button>
        )}
      </header>

      {/* Messages list (scrollable) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          backgroundColor: 'var(--color-bg-primary)',
          minHeight: 0,
        } as React.CSSProperties}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-md)',
              textAlign: 'center',
              padding: 'var(--space-6)',
            } as React.CSSProperties}
          >
            Нет сообщений. Напишите первое!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = currentUserUid
              ? msg.senderId === currentUserUid
              : msg.senderId === 'local';
            return (
              <div
                key={msg.id}
                data-testid="message"
                className="piligrim-message-in"
                data-sender={msg.senderId}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setCtx({ x: e.clientX, y: e.clientY, messageId: msg.id });
                }}
                onTouchStart={(e) => {
                  const t = window.setTimeout(() => {
                    const touch = e.touches[0];
                    if (touch) setCtx({ x: touch.clientX, y: touch.clientY, messageId: msg.id });
                  }, 600);
                  (e.currentTarget as unknown as { __longpress: number }).__longpress = t;
                }}
                onTouchEnd={(e) => {
                  window.clearTimeout((e.currentTarget as unknown as { __longpress: number }).__longpress);
                }}
                onTouchMove={(e) => {
                  window.clearTimeout((e.currentTarget as unknown as { __longpress: number }).__longpress);
                }}
                style={{
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  background: isOwn ? 'var(--color-bubble-own)' : 'var(--color-bubble-other)',
                  color: isOwn ? 'var(--color-bubble-own-text)' : 'var(--color-bubble-other-text)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: isOwn ? 'var(--radius-chat-own)' : 'var(--radius-chat-other)',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                  boxShadow: 'var(--shadow-1)',
                  border: isOwn ? 'none' : '1px solid var(--color-bubble-other-border)',
                } as React.CSSProperties}
              >
                <div style={{ fontSize: 'var(--font-size-md)', lineHeight: 'var(--line-height-normal)' }}>{msg.text}</div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: msg.text ? 6 : 0 } as React.CSSProperties}>
                    {msg.attachments.map((att) => (
                      <img
                        key={att.id}
                        src={att.dataUrl}
                        alt={att.name || 'attachment'}
                        data-testid={'attachment-' + att.id}
                        style={{ maxWidth: 180, maxHeight: 200, borderRadius: 12, display: 'block', objectFit: 'cover' } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    opacity: 0.7,
                    marginTop: 'var(--space-1)',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-1)',
                  } as React.CSSProperties}
                >
                  {msg.isEncrypted && (
                    <span
                      title="Зашифровано (E2EE)"
                      aria-label="Зашифровано"
                      style={{ fontSize: 'var(--font-size-xs)', color: msg.e2eeStatus === 'verified' ? 'var(--color-success)' : msg.e2eeStatus === 'pending' ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}
                    >
                      🔒
                    </span>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment carousel над полем ввода */}
      {pendingImages.length > 0 && (
        <div data-testid="attachment-carousel" style={{ display: 'flex', gap: 8, padding: 'var(--space-2) var(--space-4)', borderTop: '1px solid var(--color-divider)', background: 'var(--color-surface)', overflowX: 'auto' } as React.CSSProperties}>
          {pendingImages.map((img) => (
            <div key={img.id} style={{ position: 'relative', flexShrink: 0 } as React.CSSProperties}>
              <img src={img.dataUrl} alt={img.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' } as React.CSSProperties} />
              <button onClick={() => removeImage(img.id)} aria-label="Remove attachment" data-testid={'remove-attachment-' + img.id} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}>
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <AttachmentSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} onPick={openPicker} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        data-testid="file-input"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' } as React.CSSProperties}
      />

      {/* Reply banner (single, token-based) */}
      {replyTo && (
        <div
          data-testid="reply-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-4)',
            margin: '0 var(--space-4)',
            background: 'var(--color-surface-2)',
            borderLeft: '3px solid var(--color-accent)',
            borderRadius: 'var(--radius-xs)',
            fontSize: 'var(--font-size-sm)',
          } as React.CSSProperties}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>↩</span>
          <span style={{ flex: 1, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ответ на: {replyTo.text?.slice(0, 50)}{replyTo.text?.length > 50 && '…'}</span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Отменить ответ" style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: 2, color: 'var(--color-text-secondary)' } as React.CSSProperties}>✕</button>
        </div>
      )}

      {/* Edit banner (single, token-based) */}
      {editingId && (
        <div
          data-testid="edit-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-4)',
            margin: '0 var(--space-4)',
            background: 'var(--color-warning-soft)',
            borderLeft: '3px solid var(--color-warning)',
            borderRadius: 'var(--radius-xs)',
            fontSize: 'var(--font-size-sm)',
          } as React.CSSProperties}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>✏</span>
          <span style={{ flex: 1, color: 'var(--color-text-primary)' }}>Редактирование сообщения</span>
          <button type="button" onClick={() => { setEditingId(null); setDraft(''); }} aria-label="Отменить редактирование" style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', padding: 2, color: 'var(--color-text-secondary)' } as React.CSSProperties}>✕</button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
        } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          aria-label="Прикрепить фото"
          data-testid="attach-button"
          title="Прикрепить фото"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 20, cursor: 'pointer', padding: 'var(--space-1) var(--space-2)', flexShrink: 0, borderRadius: 'var(--radius-button)' } as React.CSSProperties}
        >
          📎
        </button>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
      </form>

      {/* Context menu для сообщений (right-click / long-press) */}
      {ctx && (
        <ContextMenu
          isOpen={!!ctx}
          x={ctx.x}
          y={ctx.y}
          items={[
            { id: 'reply', icon: '↩\uFE0F', label: 'Ответить', onClick: () => {
                const msg = messages.find((m) => m.id === ctx.messageId);
                if (msg) {
                  setReplyTo(msg);
                  setEditingId(null);
                }
                setCtx(null);
            }},
            {
              id: 'copy',
              icon: '\u{1F4CB}',
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
            { id: 'edit', icon: '✏\uFE0F', label: 'Редактировать', onClick: () => {
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
              icon: '\u{1F5D1}\uFE0F',
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
    </div>
  );
};

export default ChatWindow;
