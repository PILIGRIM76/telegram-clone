import { logger } from '../services/logger';

import React, { useEffect, useState } from 'react';
import type { Message, Identity } from '../types';
import { decryptAESGCM, getPrivateKey, decryptFile } from '../services/cryptoService';
import type { EncryptedAttachment } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';
import { VoicePlayer } from './VoicePlayer';
import { VoiceMessageMetadata } from '../types';

interface MessageItemProps {
    message: Message;
    currentIdentity: Identity;
    onDelete?: (messageId: string) => void;
    disappearTimer?: number;
}

const statusText = {
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓',
  'received': '⬇',
};

const MessageItem: React.FC<MessageItemProps> = ({ message, currentIdentity, onDelete, disappearTimer }) => {
    const [visible, setVisible] = useState(true);
    const [decryptedText, setDecryptedText] = useState<string>('');
    const [decryptedBlobs, setDecryptedBlobs] = useState<{ [key: string]: Blob }>({});
    const sentByMe = message.senderId === currentIdentity.uid;
    const isSystem = message.type === 'system';

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

    return (
        <div className={`message ${sentByMe ? 'sent' : 'received'} animate-fade-in ${(message as any).highlighted ? 'bg-yellow-100 animate-pulse' : ''}`}>
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
                    <div className="message-text whitespace-pre-wrap break-words">
                        {decryptedText}
                    </div>
                )}

                <div className="flex items-center justify-end space-x-1 mt-1 select-none">
                    {(() => {
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
                            </>
                        );
                    })()}

                    {(message.disappearIn || disappearTimer) && (
                         <span title={disappearTimer ? `Исчезнет через ${disappearTimer} сек` : 'Исчезающее сообщение'}>
                            <ClockIcon className="w-3 h-3 opacity-70 text-yellow-300" />
                         </span>
                    )}
                    <span className="text-[10px] opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {sentByMe && message.status && (
                        <span className={`text-[10px] ${message.status === 'read' ? 'text-cyan-200' : 'opacity-70'}`}>
                             {statusText[message.status]}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
