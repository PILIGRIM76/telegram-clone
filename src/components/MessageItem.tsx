
import React, { useEffect, useState } from 'react';
import type { Message, Identity } from '../types';
import { decrypt } from '../services/cryptoService';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';

interface MessageItemProps {
    message: Message;
    currentIdentity: Identity;
    onTimerExpire: () => void;
}

const statusText = {
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓', // Можно сделать синим цветом
  'received': '⬇', // Phase 7.6.2: входящее сообщение получено
};

const MessageItem: React.FC<MessageItemProps> = ({ message, currentIdentity, onTimerExpire }) => {
    const [visible, setVisible] = useState(true);
    const [decryptedText, setDecryptedText] = useState<string>('');
    const sentByMe = message.senderId === currentIdentity.uid;
    const isSystem = message.type === 'system';

    useEffect(() => {
        if (isSystem) {
            setDecryptedText(message.text);
        } else {
            decrypt(message.text, currentIdentity.privateKey)
                .then(text => setDecryptedText(text))
                .catch(() => setDecryptedText('[Decryption failed]'));
        }
    }, [message, currentIdentity, isSystem]);

    // Логика исчезающих сообщений
    useEffect(() => {
        if (message.disappearIn && message.timerSetAt) {
            const passed = (Date.now() - message.timerSetAt) / 1000;
            const remaining = message.disappearIn - passed;

            if (remaining <= 0) {
                setVisible(false);
                onTimerExpire();
            } else {
                const timer = setTimeout(() => {
                    setVisible(false);
                    setTimeout(onTimerExpire, 500); // Даем время на анимацию
                }, remaining * 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [message, onTimerExpire]);

    if (!visible) return <div className="transition-all duration-500 opacity-0 h-0 overflow-hidden"></div>;

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700">
                    {decryptedText}
                </div>
            </div>
        );
    }

    // Рендер сообщения с заказом (Payload)
    if (message.payload && message.payload.type === 'order') {
        return (
            <div className={`flex ${sentByMe ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-slate-700 border border-indigo-500/50 p-3 rounded-lg max-w-xs">
                     <p className="text-xs text-indigo-300 font-bold mb-1">ORDER #{message.payload.orderId.slice(-4)}</p>
                     <p className="text-sm text-white mb-2">{decryptedText}</p>
                     <div className="text-xs text-slate-400">Status: {message.payload.status}</div>
                </div>
            </div>
        )
    }

    // Рендер подарка
    if (message.payload && message.payload.type === 'gift') {
        const gift = message.payload.gift;
        return (
            <div className={`flex ${sentByMe ? 'justify-end' : 'justify-start'} group mb-2`}>
                <div className={`relative px-4 py-3 rounded-2xl shadow-sm border ${
                    sentByMe
                        ? 'bg-gradient-to-br from-pink-900/50 to-slate-800 border-pink-500/30'
                        : 'bg-gradient-to-br from-slate-800 to-pink-900/20 border-pink-500/30'
                }`}>
                    <div className="flex items-center space-x-3">
                         <div className="text-4xl animate-bounce">{gift.emoji}</div>
                         <div>
                             <p className="text-xs text-pink-300 uppercase font-bold tracking-wider mb-1">
                                 {sentByMe ? 'You sent a gift' : 'You received a gift!'}
                             </p>
                             <p className="text-white font-bold text-lg">{gift.name}</p>
                             {gift.type === 'premium' && (
                                 <p className="text-[10px] text-yellow-400 flex items-center mt-1">
                                     <GiftIcon className="w-3 h-3 mr-1" /> Premium
                                 </p>
                             )}
                         </div>
                    </div>
                    <div className="flex items-center justify-end space-x-1 mt-2 select-none">
                        <span className="text-[10px] opacity-70 text-slate-400">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${sentByMe ? 'justify-end' : 'justify-start'} group`}>
            <div
                className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                    sentByMe
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
            >
                {/* Медиа контент */}
                {message.media && (
                    <div className="mb-2 -mx-2 mt-[-4px]">
                        {message.mediaType === 'image' ? (
                            <img src={message.media} className="rounded-lg max-h-64 object-cover w-full" alt="Attachment" />
                        ) : (
                            <video src={message.media} controls className="rounded-lg max-h-64 w-full bg-black/20" />
                        )}
                    </div>
                )}

                {message.text && <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{decryptedText}</p>}
                
                <div className="flex items-center justify-end space-x-1 mt-1 select-none">
                    {message.disappearIn && (
                         <ClockIcon className="w-3 h-3 opacity-70" />
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
