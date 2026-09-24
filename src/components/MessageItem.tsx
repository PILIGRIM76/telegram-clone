import { logger } from '../services/logger';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { Message, Identity } from '../types';
import { decryptAESGCM, getPrivateKey, decryptFile } from '../services/cryptoService';
import type { EncryptedAttachment } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';
import { VoicePlayer } from './VoicePlayer';
import { VoiceMessageMetadata } from '../types';
import { ContextMenu } from './ContextMenu';
import type { MenuItem } from './ContextMenu';
import { apiService } from '../services/apiService';
import { MessageStatus } from './MessageStatus';

interface MessageItemProps {
    message: Message;
    currentIdentity: Identity;
    onDelete?: (messageId: string) => void;
    disappearTimer?: number;
    currentUserUid?: string;
    isAdmin?: boolean;
    onEdit?: (messageId: string, newText: string) => void;
}

const statusText = {
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓',
  'received': '⬇',
};

// Helper component for message status icons to avoid IIFE in main component
const MessageStatusIcons: React.FC<{ message: Message; sentByMe: boolean }> = ({ message, sentByMe }) => {
  const incomingPayload = message.payload as any;
  const hasEncryptedPayload = !!incomingPayload?.encryptedPayload;
  const isPlaintextFallback = incomingPayload?.encryptedPayload?.startsWith?.('PLAINTEXT_FALLBACK:');
  const isDecrypted = !hasEncryptedPayload || !isPlaintextFallback;

  return (
    <>
      {hasEncryptedPayload && isPlaintextFallback && (
        <span title="Не зашифровано (fallback)" className="text-[10px] opacity-60" aria-label="not-encrypted">
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
      {(message.disappearIn || (message as any).disappearTimer) && (
        <span title={(message as any).disappearTimer ? `Исчезнет через ${(message as any).disappearTimer} сек` : 'Исчезающее сообщение'}>
          <ClockIcon className="w-3 h-3 opacity-70 text-yellow-300" />
        </span>
      )}
      <span className="text-[10px] opacity-70">
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      {sentByMe && message.status && (
        <span className={`text-[10px] ${message.status === 'read' ? 'text-cyan-200' : 'opacity-70'}`}>
          {statusText[message.status as keyof typeof statusText]}
        </span>
      )}
    </>
  );
};

const MessageItem: React.FC<MessageItemProps> = ({ message, currentIdentity, onDelete, disappearTimer, currentUserUid, isAdmin = false, onEdit }) => {
    const [visible, setVisible] = useState(true);
    const [decryptedText, setDecryptedText] = useState<string>('');
    const [decryptedBlobs, setDecryptedBlobs] = useState<{ [key: string]: Blob }>({});
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
    const sentByMe = message.senderId === currentIdentity.uid;
    const isSystem = message.type === 'system';
    const currentUid = currentUserUid || currentIdentity.uid;
    
    // v3.11: IntersectionObserver for read receipts
    const messageRef = useRef<HTMLDivElement>(null);
    const readReceiptSentRef = useRef<Set<string>>(new Set());

    const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !sentByMe && message.id) {
          // Message is visible and it's an incoming message
          const receiptKey = message.id;
          if (!readReceiptSentRef.current.has(receiptKey)) {
            readReceiptSentRef.current.add(receiptKey);
            apiService.sendMessageRead(message.id);
          }
        }
      });
    }, [message.id, sentByMe]);

    useEffect(() => {
      const observer = new IntersectionObserver(handleIntersection, {
        root: null, // viewport
        rootMargin: '50px', // Trigger slightly before message is fully visible
        threshold: 0.1 // Trigger when 10% visible
      });

      if (messageRef.current) {
        observer.observe(messageRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, [handleIntersection]);

    useEffect(() => {
        if (isSystem) {
            setDecryptedText(message.text);
            return;
        }

        const incomingPayload = message.payload as any;
        const encryptedPayload: string | undefined = incomingPayload?.encryptedPayload;
        const isPlaintextFallback = encryptedPayload?.startsWith?.('PLAINTEXT_FALLBACK:');

        const alreadyDecrypted = message.text && message.text.length > 0
            && (!encryptedPayload || isPlaintextFallback);

        if (alreadyDecrypted) {
            setDecryptedText(message.text);
            return;
        }

        if (encryptedPayload && !isPlaintextFallback && getPrivateKey(currentIdentity)) {
            decryptAESGCM(encryptedPayload, getPrivateKey(currentIdentity))
                .then(text => setDecryptedText(text))
                .catch(error => {
                    logger.error('MessageItem: Ошибка расшифровки:', error);
                    setDecryptedText('[Не удалось расшифровать]');
                });
        } else {
            setDecryptedText(message.text);
        }
    }, [message, currentIdentity, isSystem]);

    useEffect(() => {
        if (!message.encryptedAttachments || message.encryptedAttachments.length === 0) return;
        const decrypt = async () => {
            const privateKey = getPrivateKey(currentIdentity);
            if (!privateKey) return;
            const blobs: { [key: string]: Blob } = {};
            for (const att of message.encryptedAttachments!) {
                try {
                    const blob = await decryptFile(att.ciphertext, att.iv, att.key, privateKey, att.type, att.size);
                    blobs[att.id] = blob;
                } catch (e) {
                    logger.error('[PILIGRIM] Failed to decrypt attachment:', att.name, e);
                }
            }
            setDecryptedBlobs(blobs);
        };
        decrypt();
    }, [message.encryptedAttachments, currentIdentity]);

    useEffect(() => {
        if (isSystem) return;

        let timeUntilExpiry: number | null = null;

        const timerSetAt = (message as any).timerSetAt;
        const disappearIn = (message as any).disappearIn;

        if (disappearIn && timerSetAt) {
            const elapsed = (Date.now() - timerSetAt) / 1000;
            timeUntilExpiry = Math.max(0, disappearIn - elapsed);
        } else if (disappearTimer) {
            timeUntilExpiry = disappearTimer;
        }

        if (timeUntilExpiry !== null && timeUntilExpiry <= 0) {
            setVisible(false);
            return;
        }

        if (timeUntilExpiry !== null) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, timeUntilExpiry * 1000);
            return () => clearTimeout(timer);
        }
    }, [message, disappearTimer, isSystem]);

    if (!visible) return null;

    const privateKey = getPrivateKey(currentIdentity);

    // Context menu handlers
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId: message.id });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(message.id, decryptedText);
        }
        handleCloseContextMenu();
    };

    const handleDeleteForMe = () => {
        if (onDelete) {
            onDelete(message.id);
        }
        handleCloseContextMenu();
    };

    const handleDeleteForAll = () => {
        // For now, use the same delete function but the server will handle deleteForAll
        if (onDelete) {
            onDelete(message.id);
        }
        handleCloseContextMenu();
    };

    const handleCopy = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(decryptedText).catch((err: unknown) =>
                logger.warn('[PILIGRIM] Clipboard write failed:', err)
            );
        }
        handleCloseContextMenu();
    };

    const handleReply = () => {
        // Reply is handled by parent ChatWindow
        handleCloseContextMenu();
    };

    const isOwn = message.senderId === currentUid;
    const canEdit = isOwn && message.type === 'user' && !message.isDeleted;
    const canDelete = isOwn || isAdmin;

    const contextMenuItems: MenuItem[] = [
        { id: 'reply', icon: '↩️', label: 'Ответить', onClick: handleReply },
        { id: 'copy', icon: '📋', label: 'Копировать', onClick: handleCopy },
    ];

    if (canEdit) {
        contextMenuItems.splice(1, 0, { id: 'edit', icon: '✏️', label: 'Редактировать', onClick: handleEdit });
    }

    if (canDelete) {
        contextMenuItems.push({ id: 'delete_me', icon: '🗑️', label: 'Удалить для себя', dangerous: true, onClick: handleDeleteForMe });
        if (isOwn) {
            contextMenuItems.push({ id: 'delete_all', icon: '🗑️', label: 'Удалить для всех', dangerous: true, onClick: handleDeleteForAll });
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
            className={`message ${sentByMe ? 'sent' : 'received'} animate-fade-in ${(message as any).highlighted ? 'bg-yellow-100 animate-pulse' : ''}`}
            onContextMenu={handleContextMenu}
        >
            <div className={`message-bubble ${sentByMe ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'}`}>
                {message.type === 'voice' && message.encryptedAttachments && message.encryptedAttachments.length > 0 && message.voiceMetadata && (
                    <VoicePlayer
                        encryptedBlob={message.encryptedAttachments[0].ciphertext as unknown as Blob}
                        metadata={message.voiceMetadata}
                        privateKeyHex={privateKey || ''}
                        isOwn={sentByMe}
                    />
                )}

                {decryptedText && (
                    <>
                      <div className="message-text whitespace-pre-wrap break-words">
                          {decryptedText}
                      </div>
                      {message.isEdited && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">изменено</span>
                      )}
                    </>
                )}

                {message.isDeleted && (
                  <div className="italic text-gray-400 dark:text-gray-500 text-sm">Сообщение удалено</div>
                )}

                <div className="flex items-center justify-end space-x-1 mt-1 select-none">
                    <MessageStatus message={message} sentByMe={sentByMe} currentUserUid={currentUid} />
                </div>
            {contextMenuContent}
            </div>
        </div>
    );
};

export default MessageItem;
