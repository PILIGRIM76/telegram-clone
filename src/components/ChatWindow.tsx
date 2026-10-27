// Окно чата в стиле настольного приложения Telegram.
// Все цвета берутся из Tailwind токенов tg-* / tg-dark-*.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListImperativeAPI } from 'react-window';
import { logger } from '../services/logger';
import type { Contact, EncryptedAttachment, Identity, IdentityType, Message } from '../types';
import AnimatedAvatar from './AnimatedAvatar';
import { ContextMenu } from './ContextMenu';
import { type EncryptionType } from './EncryptionBadge';
import { MessageEditModal } from './MessageEditModal';
import MessageItem from './MessageItem';
import {
  CallIcon,
  ClockIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  SearchIcon,
} from './icons';

type ChatPartner = (Contact | { name: string }) & {
  isOnline?: boolean;
  lastSeen?: number;
  uid?: string;
  memberCount?: number;
  onlineCount?: number;
};

interface ChatWindowProps {
  chatId: string;
  messages: Message[];
  onSendMessage: (
    text: string,
    attachments?: { id: string; dataUrl: string; name: string }[],
    replyTo?: string
  ) => void;
  // Дополнительные данные собеседника, включая статус присутствия и сведения о группе.
  partner?: ChatPartner;
  currentUserUid?: string;
  currentIdentity?: Identity;
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

// Форматирует время последнего посещения.
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

const formatLastSeenStatus = (timestamp: number): string => {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'только что';
  if (diff < 3600) return 'был(а) недавно';
  if (diff < 86400) {
    return `был(а) сегодня в ${new Date(timestamp * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return formatLastSeen(timestamp);
};

// Date divider label
const formatDateDivider = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return 'Сегодня';
  if (isYesterday) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

// --- ChatHeader ---
interface ChatHeaderProps {
  partner: ChatPartner | undefined;
  currentUserUid?: string;
  onBack?: () => void;
  onStartCall?: () => void;
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  mutedUntil?: number;
  onVerifyContact?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  partner,
  currentUserUid,
  onBack,
  onStartCall,
  callState = 'idle',
  mutedUntil,
  onVerifyContact,
}) => {
  const partnerName = partner?.name || 'Чат';
  const isOnline = partner?.isOnline ?? false;
  const lastSeen = partner?.lastSeen;
  const isGroup = !partner?.uid;
  const memberCount = partner?.memberCount || 0;
  const onlineCount = partner?.onlineCount || 0;

  let statusText: string;
  let statusColor: string;

  if (isGroup) {
    statusText = `${memberCount} участников, ${onlineCount} в сети`;
    statusColor = 'text-tg-textSecondary dark:text-tg-dark-textSecondary';
  } else if (isOnline) {
    statusText = 'в сети';
    statusColor = 'text-green-500';
  } else if (lastSeen) {
    statusText = formatLastSeenStatus(lastSeen);
    statusColor = 'text-tg-textSecondary dark:text-tg-dark-textSecondary';
  } else {
    statusText = 'был(а) недавно';
    statusColor = 'text-tg-textSecondary dark:text-tg-dark-textSecondary';
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 h-[60px] border-b border-tg-border dark:border-tg-dark-border bg-tg-sidebar dark:bg-tg-dark-sidebar flex-shrink-0">
      <div
        className="flex items-center flex-1 cursor-pointer"
        onClick={onBack ? onBack : undefined}
      >
        {onBack && (
          <SearchIcon className="w-5 h-5 text-tg-textSecondary dark:text-tg-dark-textSecondary mr-2 flex-shrink-0" />
        )}
        <div className="flex items-center flex-1 min-w-0">
          <AnimatedAvatar name={partnerName} size={40} e2eeStatus="verified" isOnline={isOnline} />
          <div className="min-w-0">
            <p className="font-semibold text-tg-text dark:text-tg-dark-text truncate">
              {partnerName}
            </p>
            <p className={`${statusColor} truncate`}>{statusText}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
          title="Поиск"
          aria-label="Search"
        >
          <SearchIcon className="w-4 h-4" />
        </button>
        {onStartCall && (
          <button
            className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
            onClick={onStartCall}
            title="Звонок"
            aria-label="Call"
          >
            <CallIcon className="w-4 h-4" />
          </button>
        )}
        <button
          className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
          title="Ещё"
          aria-label="More"
        >
          <span className="w-4 h-4 flex items-center justify-center text-tg-textSecondary dark:text-tg-dark-textSecondary">
            ⋮
          </span>
        </button>
      </div>
    </header>
  );
};

// --- MessageList ---
interface MessageListProps {
  messages: Message[];
  currentUserUid?: string;
  currentIdentity?: Identity;
  partner?: ChatPartner;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserUid,
  currentIdentity,
  partner,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on mount and when messages change
  useEffect(() => {
    const container = listRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Group messages by date for dividers
  const messagesWithDividers = useMemo(() => {
    const result: Array<{ type: 'message' | 'divider'; message?: Message; dateLabel?: string }> =
      [];
    let prevDate: string | null = null;

    for (const msg of messages) {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (prevDate !== msgDate) {
        result.push({ type: 'divider', dateLabel: formatDateDivider(msg.timestamp) });
        prevDate = msgDate;
      }
      result.push({ type: 'message', message: msg });
    }
    return result;
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 py-4 chat-wallpaper flex flex-col justify-end min-h-full"
    >
      {isLoadingMore && (
        <div className="flex justify-center py-2 text-tg-textSecondary dark:text-tg-dark-textSecondary text-xs">
          Загрузка…
        </div>
      )}

      {messagesWithDividers.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div
              key={`divider-${index}`}
              className="text-center text-xs text-tg-textSecondary dark:text-tg-dark-textSecondary bg-black/10 dark:bg-white/10 rounded-full px-3 py-1 mx-auto my-4 w-fit"
            >
              {item.dateLabel}
            </div>
          );
        }
        const msg = item.message!;
        const isOwn = msg.senderId === currentUserUid;
        const prevItem = messagesWithDividers[index - 1];
        const prevMsg = prevItem?.type === 'message' ? prevItem.message : undefined;
        const showAvatar =
          !prevMsg ||
          prevMsg.senderId !== msg.senderId ||
          new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 60000;

        return (
          <div
            key={`msg-${msg.id}`}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 min-w-0`}
          >
            {!isOwn && showAvatar && partner && (
              <AnimatedAvatar name={partner.name} size={32} e2eeStatus="verified" />
            )}
            <MessageItem
              message={msg}
              currentIdentity={currentIdentity!}
              currentUserUid={currentUserUid}
              showAvatar={!isOwn && showAvatar}
              partner={partner}
            />
            {isOwn && showAvatar && partner && (
              <AnimatedAvatar name={partner.name} size={32} e2eeStatus="verified" />
            )}
          </div>
        );
      })}

      {hasMore && (
        <div
          className="flex justify-center py-2 text-tg-textSecondary dark:text-tg-dark-textSecondary text-xs cursor-pointer hover:text-tg-primary dark:hover:text-tg-dark-primary"
          onClick={onLoadMore}
        >
          Загрузить ещё
        </div>
      )}
    </div>
  );
};

// --- MessageInput ---
interface MessageInputProps {
  onSendMessage: (
    text: string,
    attachments?: { id: string; dataUrl: string; name: string }[],
    replyTo?: string
  ) => void;
  identity: IdentityType | null;
  draft: string;
  setDraft: (text: string) => void;
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
  onInputChange: (isTyping: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  identity,
  draft,
  setDraft,
  replyTo,
  setReplyTo,
  onInputChange,
}) => {
  const [mediaFile, setMediaFile] = useState<{ base64: string; type: 'image' | 'video' } | null>(
    null
  );
  const [fileError, setFileError] = useState('');
  const [encryptedAttachments, setEncryptedAttachments] = useState<EncryptedAttachment[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [draft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    if (onInputChange) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onInputChange(true);
      typingTimerRef.current = window.setTimeout(() => {
        onInputChange(false);
      }, 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const send = () => {
    if (draft.trim() || mediaFile || encryptedAttachments.length > 0) {
      const attachments =
        encryptedAttachments.length > 0
          ? encryptedAttachments.map(enc => ({
              id: enc.id,
              dataUrl: enc.ciphertext,
              name: enc.name,
            }))
          : undefined;
      onSendMessage(draft.trim(), attachments, replyTo?.id);
      setDraft('');
      setEncryptedAttachments([]);
      setMediaFile(null);
      setReplyTo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onInputChange(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File too large (max 5MB)');
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaFile({ base64, type });
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setMediaFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeEncryptedFile = (index: number) => {
    setEncryptedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const hasContent = draft.trim() || mediaFile || encryptedAttachments.length > 0;

  return (
    <div className="flex items-center px-4 py-3 border-t border-tg-border dark:border-tg-dark-border bg-tg-sidebar dark:bg-tg-dark-sidebar mt-auto flex-shrink-0">
      <div className="flex items-center space-x-2 mr-3 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-6 h-6 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-primary dark:hover:text-tg-dark-primary transition-colors duration-200 flex items-center justify-center"
          title="Прикрепить файл"
          aria-label="Attach file"
        >
          <PaperClipIcon className="w-4 h-4" />
        </button>
        <button
          className="w-6 h-6 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-primary dark:hover:text-tg-dark-primary transition-colors duration-200 flex items-center justify-center"
          title="Эмодзи"
          aria-label="Emoji"
        >
          <ClockIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-w-0 relative">
        {replyTo && (
          <div className="bg-tg-textSecondary dark:bg-tg-dark-textSecondary text-tg-text dark:text-tg-dark-text rounded-lg px-2 py-1 text-xs mb-2 flex justify-between items-center">
            <span className="truncate">Ответ: {replyTo.text}</span>
            <button
              onClick={() => setReplyTo(null)}
              className="ml-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-primary dark:hover:text-tg-dark-primary"
              title="Отменить ответ"
            >
              ×
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            encryptedAttachments.length > 0
              ? `${encryptedAttachments.length} зашифрованных файла(ов) прикреплено`
              : mediaFile
                ? 'Добавить подпись…'
                : 'Написать сообщение…'
          }
          className="flex-1 w-full bg-transparent outline-none text-tg-text dark:text-tg-dark-text placeholder:text-tg-textSecondary dark:placeholder:text-tg-dark-textSecondary resize-none py-1 px-2 max-h-[200px] overflow-y-auto"
          rows={1}
        />

        {fileError && <p className="text-[10px] text-red-400 mt-1">{fileError}</p>}

        {encryptedAttachments.length > 0 && (
          <div className="flex gap-2 mt-2">
            {encryptedAttachments.map((enc, idx) => (
              <div
                key={idx}
                className="relative flex items-center bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1"
              >
                <div className="w-6 h-6 rounded flex-shrink-0">
                  {enc.name.toLowerCase().endsWith('.jpg') ||
                  enc.name.toLowerCase().endsWith('.jpeg') ||
                  enc.name.toLowerCase().endsWith('.png') ? (
                    <img
                      src={enc.ciphertext}
                      alt={enc.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded flex items-center justify-center text-[10px]">
                      📄
                    </div>
                  )}
                </div>
                <div className="ml-1.5 text-[10px] truncate flex-1">{enc.name}</div>
                <button
                  onClick={() => removeEncryptedFile(idx)}
                  className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[10px] flex items-center justify-center ml-1"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*"
        />
      </div>

      <button
        onClick={send}
        disabled={!hasContent}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-opacity duration-200 flex-shrink-0 ml-2
          ${
            hasContent
              ? 'bg-tg-primary dark:bg-tg-dark-primary text-white hover:opacity-80'
              : 'bg-tg-textSecondary dark:bg-tg-dark-textSecondary text-tg-textSecondary dark:text-tg-dark-textSecondary opacity-50 cursor-not-allowed'
          }`}
        aria-label="Send"
        title="Отправить"
      >
        {hasContent ? (
          <PaperAirplaneIcon className="w-5 h-5" />
        ) : (
          <MicrophoneIcon className="w-5 h-5" />
        )}
      </button>

      <div className="text-[10px] text-tg-textSecondary dark:text-tg-dark-textSecondary mt-1 text-center hidden md:block ml-4">
        Enter — отправить, Shift+Enter — новая строка
      </div>

      {showFilePicker && identity && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-20">
          {/* FileUpload модалка будет здесь через состояние из App */}
        </div>
      )}
    </div>
  );
};

// --- Main ChatWindow ---
const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  messages,
  onSendMessage,
  partner,
  currentUserUid,
  currentIdentity,
  onBack,
  onStartCall,
  callState = 'idle',
  mutedUntil,
  onVerifyContact,
  onDeleteMessage,
  onEditMessage,
  encryptionType,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  const [draft, setDraft] = useState<string>('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModalMessage, setEditModalMessage] = useState<Message | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; messageId: string } | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [encryptedAttachments, setEncryptedAttachments] = useState<
    {
      id: string;
      ciphertext: string;
      iv: string;
      key: string;
      type: string;
      size: number;
      name: string;
    }[]
  >([]);
  const [fileError, setFileError] = useState<string>('');
  const [hasContent, setHasContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<ListImperativeAPI>(null);

  const handleSend = useCallback(
    (
      text: string,
      attachments?: { id: string; dataUrl: string; name: string }[],
      replyToId?: string
    ) => {
      onSendMessage(text, attachments, replyToId);
    },
    [onSendMessage]
  );

  const handleSaveEdit = useCallback(
    (newText: string) => {
      if (editingId && onEditMessage) {
        onEditMessage(editingId, newText);
      }
      setEditingId(null);
      setEditModalMessage(null);
    },
    [editingId, onEditMessage]
  );

  const handleCloseEditModal = useCallback(() => {
    setEditModalMessage(null);
    setEditingId(null);
  }, []);

  const isOwn = (msg: Message) => msg.senderId === currentUserUid;

  return (
    <div className="flex flex-col h-full bg-tg-background dark:bg-tg-dark-background">
      <ChatHeader
        partner={partner}
        currentUserUid={currentUserUid}
        onBack={onBack}
        onStartCall={onStartCall}
        callState={callState}
        mutedUntil={mutedUntil}
        onVerifyContact={onVerifyContact}
      />

      <MessageList
        messages={messages}
        currentIdentity={currentIdentity}
        currentUserUid={currentUserUid}
        partner={partner}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      <MessageInput
        onSendMessage={handleSend}
        identity={null}
        draft={draft}
        setDraft={setDraft}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        onInputChange={() => {}}
      />

      {ctx && (
        <ContextMenu
          isOpen={!!ctx}
          x={ctx.x}
          y={ctx.y}
          items={[
            {
              id: 'reply',
              icon: '↩️',
              label: 'Ответить',
              onClick: () => {
                const msg = messages.find(m => m.id === ctx.messageId);
                if (msg) {
                  setReplyTo(msg);
                  setEditingId(null);
                }
                setCtx(null);
              },
            },
            {
              id: 'copy',
              icon: '📋',
              label: 'Копировать',
              onClick: () => {
                const msg = messages.find(m => m.id === ctx.messageId);
                if (msg?.text && typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard
                    .writeText(msg.text)
                    .catch((err: unknown) =>
                      logger.warn('[PILIGRIM] Clipboard write failed:', err)
                    );
                }
              },
            },
            {
              id: 'edit',
              icon: '✏️',
              label: 'Редактировать',
              onClick: () => {
                const msg = messages.find(m => m.id === ctx.messageId);
                if (msg && onEditMessage) {
                  setEditingId(msg.id);
                  setDraft(msg.text);
                  setReplyTo(null);
                  setCtx(null);
                }
              },
            },
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
              },
            },
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

export default ChatWindow;
