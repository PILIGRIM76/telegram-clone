// Окно чата в стиле настольного приложения Telegram.
// Все цвета берутся из Tailwind токенов tg-* / tg-dark-*.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ListImperativeAPI } from 'react-window';
import { getPrivateKey } from '../services/cryptoService';
import type {
  Contact,
  EncryptedAttachment,
  IdentityType,
  Message,
  VoiceMessageMetadata,
} from '../types';
import AnimatedAvatar from './AnimatedAvatar';
import { type EncryptionType } from './EncryptionBadge';
import MessageItem from './MessageItem';
import MessageTimerSelection from './MessageTimerSelection';
import VoiceRecorder from './VoiceRecorder';
import {
  ArrowLeftIcon,
  CallIcon,
  ClockIcon,
  EmojiIcon,
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
    options?: {
      replyTo?: string;
      messageType?: Message['type'];
      editingMessageId?: string;
      encryptedAttachments?: EncryptedAttachment[];
      voiceMetadata?: VoiceMessageMetadata;
      attachments?: { id: string; dataUrl: string; name: string }[];
      ttl?: number;
    }
  ) => void;
  // Дополнительные данные собеседника, включая статус присутствия и сведения о группе.
  partner?: ChatPartner;
  currentUserUid?: string;
  currentIdentity?: IdentityType;
  showHeader?: boolean;
  onBack?: () => void;
  onSearchClick?: () => void;
  onMenuClick?: () => void;
  onStartCall?: () => void;
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  mutedUntil?: number;
  onVerifyContact?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onForwardMessage?: (message: Message) => void;
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
  onSearchClick?: () => void;
  onMenuClick?: () => void;
  onStartCall?: () => void;
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  mutedUntil?: number;
  onVerifyContact?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  partner,
  currentUserUid,
  onBack,
  onSearchClick,
  onMenuClick,
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
      <button
        type="button"
        className="flex items-center flex-1 min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left"
        onClick={onBack}
        aria-label={onBack ? 'Назад к списку чатов' : undefined}
        disabled={!onBack}
      >
        {onBack && (
          <ArrowLeftIcon className="w-5 h-5 text-tg-textSecondary dark:text-tg-dark-textSecondary mr-2 flex-shrink-0" />
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
      </button>

      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
          title="Поиск"
          aria-label="Поиск в чате"
          onClick={onSearchClick}
        >
          <SearchIcon className="w-4 h-4" />
        </button>
        {onStartCall && (
          <button
            className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
            onClick={onStartCall}
            title="Звонок"
            aria-label="Аудиозвонок"
          >
            <CallIcon className="w-4 h-4" />
          </button>
        )}
        <button
          className="w-6 h-6 rounded-full p-2 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:bg-tg-hover dark:hover:bg-tg-dark-hover transition-colors duration-200 flex items-center justify-center"
          title="Ещё"
          aria-label="Дополнительные действия чата"
          onClick={onMenuClick}
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
  currentIdentity?: IdentityType;
  partner?: ChatPartner;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onReplyMessage?: (message: Message) => void;
  onForwardMessage?: (message: Message) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserUid,
  currentIdentity,
  partner,
  onLoadMore,
  hasMore,
  isLoadingMore,
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onForwardMessage,
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
              onDelete={onDeleteMessage}
              onEdit={onEditMessage}
              onReply={onReplyMessage}
              onForward={onForwardMessage}
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
    options?: {
      replyTo?: string;
      messageType?: Message['type'];
      editingMessageId?: string;
      encryptedAttachments?: EncryptedAttachment[];
      voiceMetadata?: VoiceMessageMetadata;
      ttl?: number;
    }
  ) => void;
  identity: IdentityType | null;
  draft: string;
  setDraft: (text: string) => void;
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
  onInputChange: (isTyping: boolean) => void;
  editingMessageId?: string | null;
  onCancelEdit?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  identity,
  draft,
  setDraft,
  replyTo,
  setReplyTo,
  onInputChange,
  editingMessageId,
  onCancelEdit,
}) => {
  const [mediaFile, setMediaFile] = useState<{ base64: string; type: 'image' | 'video' } | null>(
    null
  );
  const [fileError, setFileError] = useState('');
  const [encryptedAttachments, setEncryptedAttachments] = useState<EncryptedAttachment[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // v3.17: Disappearing messages timer selection
  const [selectedTtl, setSelectedTtl] = useState<number | undefined>(undefined);
  const [showTimerSelection, setShowTimerSelection] = useState(false);
  const timerButtonRef = useRef<HTMLButtonElement>(null);
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
      onSendMessage(draft.trim(), {
        replyTo: replyTo?.id,
        encryptedAttachments,
        editingMessageId: editingMessageId ?? undefined,
        ttl: selectedTtl,
      });
      setDraft('');
      setEncryptedAttachments([]);
      setMediaFile(null);
      setReplyTo(null);
      // v3.17: Clear timer selection after sending
      setSelectedTtl(undefined);
      setShowTimerSelection(false);
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

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    setDraft(nextDraft);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleVoiceRecorded = async (encryptedBlob: Blob, voiceMetadata: VoiceMessageMetadata) => {
    const encryptedContent = await encryptedBlob.text();
    const payload: unknown = JSON.parse(encryptedContent);
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Не удалось подготовить голосовое сообщение');
    }

    const voice = payload as Record<string, unknown>;
    if (
      typeof voice.ciphertext !== 'string' ||
      typeof voice.iv !== 'string' ||
      typeof voice.key !== 'string' ||
      typeof voice.name !== 'string' ||
      typeof voice.type !== 'string' ||
      typeof voice.size !== 'number'
    ) {
      throw new Error('Данные голосового сообщения повреждены');
    }

    const attachment: EncryptedAttachment = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `voice-${Date.now()}`,
      name: voice.name,
      type: voice.type,
      size: voice.size,
      ciphertext: encryptedContent,
      iv: voice.iv,
      key: voice.key,
    };

    onSendMessage('', {
      replyTo: replyTo?.id,
      encryptedAttachments: [attachment],
      voiceMetadata,
      messageType: 'voice',
    });
    setReplyTo(null);
  };

  const hasContent = draft.trim() || mediaFile || encryptedAttachments.length > 0;
  const emojis = ['😀', '😂', '😊', '😍', '👍', '🙏', '🎉', '❤️', '🤔', '😢', '🔥', '👋'];

  return (
    <div className="relative flex items-end px-4 py-3 border-t border-tg-border dark:border-tg-dark-border bg-tg-sidebar dark:bg-tg-dark-sidebar mt-auto flex-shrink-0">
      <div className="flex items-center space-x-2 mr-3 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-6 h-6 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-primary dark:hover:text-tg-dark-primary transition-colors duration-200 flex items-center justify-center"
          title="Прикрепить файл"
          aria-label="Attach file"
        >
          <PaperClipIcon className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(open => !open)}
            className="w-6 h-6 text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-tg-primary dark:hover:text-tg-dark-primary transition-colors duration-200 flex items-center justify-center"
            title="Эмодзи"
            aria-label="Эмодзи"
            aria-expanded={showEmojiPicker}
          >
            <EmojiIcon className="w-4 h-4" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-30 grid grid-cols-6 gap-1 rounded-lg bg-tg-menuBg p-2 text-tg-menuText shadow-xl dark:bg-tg-dark-menuBg dark:text-tg-dark-menuText">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded hover:bg-tg-menuHover dark:hover:bg-tg-dark-menuHover"
                  aria-label={`Вставить эмодзи ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative min-w-0 flex-1 rounded-2xl bg-tg-background dark:bg-tg-dark-background focus-within:ring-2 focus-within:ring-tg-primary">
        {replyTo && (
          <div className="bg-tg-hover dark:bg-tg-dark-hover text-tg-text dark:text-tg-dark-text rounded-lg px-2 py-1 text-xs mb-2 flex justify-between items-center">
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

        <div className="flex items-end">
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
            className="min-w-0 flex-1 bg-transparent outline-none text-tg-text dark:text-tg-dark-text placeholder:text-tg-textSecondary dark:placeholder:text-tg-dark-textSecondary resize-none py-2 px-2 max-h-[200px] overflow-y-auto"
            rows={1}
          />
          {hasContent ? (
            <button
              onClick={send}
              className="m-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-tg-primary text-white transition-opacity duration-200 hover:opacity-80 dark:bg-tg-dark-primary"
              aria-label="Отправить"
              title="Отправить"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          ) : identity ? (
            <VoiceRecorder
              privateKeyHex={getPrivateKey(identity)}
              onVoiceRecorded={handleVoiceRecorded}
              onCancel={() => setFileError('')}
            />
          ) : (
            <button
              type="button"
              disabled
              className="m-1 flex h-9 w-9 flex-shrink-0 cursor-not-allowed items-center justify-center rounded-full text-tg-textSecondary opacity-50 dark:text-tg-dark-textSecondary"
              aria-label="Войдите, чтобы записать голосовое сообщение"
              title="Войдите, чтобы записать голосовое сообщение"
            >
              <MicrophoneIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* v3.17: Disappearing messages timer selection */}
        <div className="relative ml-1">
          <button
            ref={timerButtonRef}
            onClick={() => setShowTimerSelection(!showTimerSelection)}
            className={`p-2 transition-colors ${selectedTtl ? 'text-cyan-400' : 'text-tg-textSecondary dark:text-tg-dark-textSecondary hover:text-cyan-400'}`}
            title={selectedTtl ? `Timer: ${selectedTtl}s` : 'Set disappearing timer'}
          >
            <ClockIcon className="w-5 h-5" />
          </button>
          {showTimerSelection && (
            <MessageTimerSelection
              currentValue={selectedTtl}
              onSelect={seconds => {
                setSelectedTtl(seconds);
                setShowTimerSelection(false);
              }}
            />
          )}
        </div>

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

        {/* Editing mode indicator */}
        {editingMessageId && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-tg-primary/10 dark:bg-tg-dark-primary/10 border border-tg-primary/30 dark:border-tg-dark-primary/30 rounded-lg">
            <span className="text-xs font-medium text-tg-primary dark:text-tg-dark-primary">
              ✏️ Редактирование сообщения...
            </span>
            <button
              onClick={onCancelEdit}
              className="ml-auto px-3 py-1 text-xs font-medium text-tg-primary dark:text-tg-dark-primary bg-tg-primary/10 dark:bg-tg-dark-primary/10 rounded hover:bg-tg-primary/20 dark:hover:bg-tg-dark-primary/20 transition-colors"
              aria-label="Отменить редактирование"
            >
              Отмена
            </button>
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
  showHeader = true,
  onBack,
  onSearchClick,
  onMenuClick,
  onStartCall,
  callState = 'idle',
  mutedUntil,
  onVerifyContact,
  onDeleteMessage,
  onEditMessage,
  onForwardMessage,
  encryptionType,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  const [draft, setDraft] = useState<string>('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<ListImperativeAPI>(null);

  const handleSend = useCallback(
    (
      text: string,
      options?: {
        replyToId?: string;
        encryptedAttachments?: EncryptedAttachment[];
        voiceMetadata?: VoiceMessageMetadata;
        messageType?: Message['type'];
        editingMessageId?: string;
      }
    ) => {
      const { replyToId, encryptedAttachments, voiceMetadata, messageType, editingMessageId } =
        options || {};
      onSendMessage(text, {
        replyTo: replyToId,
        encryptedAttachments,
        voiceMetadata,
        messageType,
        editingMessageId,
      });
      // Clear editing mode after sending
      if (editingMessageId) {
        setEditingMessageId(null);
      }
    },
    [onSendMessage]
  );

  // Handle starting edit mode from MessageList
  const handleStartEdit = useCallback(
    (messageId: string, newText?: string) => {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        setEditingMessageId(message.id);
        setDraft(message.text || '');
      }
    },
    [messages]
  );

  return (
    <div className="flex flex-col h-full bg-tg-background dark:bg-tg-dark-background">
      {showHeader && (
        <ChatHeader
          partner={partner}
          currentUserUid={currentUserUid}
          onBack={onBack}
          onSearchClick={onSearchClick}
          onMenuClick={onMenuClick}
          onStartCall={onStartCall}
          callState={callState}
          mutedUntil={mutedUntil}
          onVerifyContact={onVerifyContact}
        />
      )}

      <MessageList
        messages={messages}
        currentIdentity={currentIdentity}
        currentUserUid={currentUserUid}
        partner={partner}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onDeleteMessage={onDeleteMessage}
        onEditMessage={handleStartEdit}
        onReplyMessage={setReplyTo}
        onForwardMessage={onForwardMessage}
      />

      <MessageInput
        onSendMessage={handleSend}
        identity={currentIdentity ?? null}
        draft={draft}
        setDraft={setDraft}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        onInputChange={() => {}}
        editingMessageId={editingMessageId}
        onCancelEdit={() => {
          setEditingMessageId(null);
          setDraft('');
        }}
      />
    </div>
  );
};

export default ChatWindow;
