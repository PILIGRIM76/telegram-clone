
import React, { useEffect, useState, useRef } from 'react';
import type { Message, Identity } from '../types';
import { decrypt } from '../services/cryptoService';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';
import { ReplyIcon } from './icons/ReplyIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ShareIcon } from './icons/ShareIcon';

interface MessageItemProps {
    message: Message;
    currentIdentity: Identity;
    onTimerExpire: () => void;
    onAction?: (action: string, message: Message, extra?: any) => void;
}

const statusText = {
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓',
};

const reactionsList = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageItem: React.FC<MessageItemProps> = ({ message, currentIdentity, onTimerExpire, onAction }) => {
    const [visible, setVisible] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const sentByMe = message.senderId === currentIdentity.uid;
    const isSystem = message.type === 'system';

    const text = isSystem ? message.text : decrypt(message.text, currentIdentity.privateKey);

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
                    setTimeout(onTimerExpire, 500); 
                }, remaining * 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [message, onTimerExpire]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showMenu]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onAction && !isSystem) setShowMenu(true);
    };

    const handleActionClick = (action: string, extra?: any) => {
        if (onAction) {
            onAction(action, { ...message, text }, extra);
        }
        setShowMenu(false);
    };

    if (!visible) return <div className="transition-all duration-500 opacity-0 h-0 overflow-hidden"></div>;

    if (isSystem) {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700">
                    {text}
                </div>
            </div>
        );
    }

    if (message.payload && message.payload.type === 'order') {
        return (
            <div className={`flex ${sentByMe ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-slate-700 border border-indigo-500/50 p-3 rounded-lg max-w-xs">
                     <p className="text-xs text-indigo-300 font-bold mb-1">ORDER #{message.payload.orderId.slice(-4)}</p>
                     <p className="text-sm text-white mb-2">{text}</p>
                     <div className="text-xs text-slate-400">Status: {message.payload.status}</div>
                </div>
            </div>
        )
    }

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
        <div 
            className={`flex ${sentByMe ? 'justify-end' : 'justify-start'} group relative`}
            onContextMenu={handleContextMenu}
        >
            <div
                className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                    sentByMe
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
            >
                {message.replyTo && (
                    <div className={`text-xs mb-1 p-1 border-l-2 border-slate-300/50 ${sentByMe ? 'bg-black/10' : 'bg-black/20'} rounded-r`}>
                        <p className="font-bold opacity-70">Reply to:</p>
                        <p className="truncate opacity-70">{message.replyTo.text}</p>
                    </div>
                )}

                {message.isForwarded && (
                    <div className="text-[10px] italic opacity-70 mb-1 flex items-center">
                        <ShareIcon className="w-3 h-3 mr-1" /> Forwarded
                    </div>
                )}

                {message.media && (
                    <div className="mb-2 -mx-2 mt-[-4px]">
                        {message.mediaType === 'image' ? (
                            <img src={message.media} className="rounded-lg max-h-64 object-cover w-full" alt="Attachment" />
                        ) : message.mediaType === 'audio' ? (
                            <audio src={message.media} controls className="w-full mt-2" />
                        ) : (
                            <video src={message.media} controls className="rounded-lg max-h-64 w-full bg-black/20" />
                        )}
                    </div>
                )}

                {text && <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{text}</p>}
                
                {message.isEdited && <span className="text-[10px] opacity-60 italic ml-1">(edited)</span>}

                {message.reactions && message.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {message.reactions.map((r, i) => (
                            <span key={i} className="bg-black/20 text-xs px-1 rounded-full">{r.emoji}</span>
                        ))}
                    </div>
                )}

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

            {showMenu && (
                <div 
                    ref={menuRef}
                    className={`absolute z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 w-40 text-sm ${sentByMe ? 'right-0 mr-10' : 'left-0 ml-10'} top-0`}
                >
                    <div className="grid grid-cols-6 gap-1 p-2 border-b border-slate-700">
                        {reactionsList.map(emoji => (
                            <button key={emoji} onClick={() => handleActionClick('react', emoji)} className="hover:bg-slate-700 rounded p-1 text-center">
                                {emoji}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => handleActionClick('reply')} className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 flex items-center">
                        <ReplyIcon className="w-4 h-4 mr-2" /> Reply
                    </button>
                    <button onClick={() => handleActionClick('forward')} className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 flex items-center">
                        <ShareIcon className="w-4 h-4 mr-2" /> Forward
                    </button>
                    {sentByMe && (
                        <>
                            <button onClick={() => handleActionClick('edit')} className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-200 flex items-center">
                                <PencilIcon className="w-4 h-4 mr-2" /> Edit
                            </button>
                            <button onClick={() => handleActionClick('delete')} className="w-full text-left px-3 py-2 hover:bg-slate-700 text-red-400 flex items-center">
                                <TrashIcon className="w-4 h-4 mr-2" /> Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageItem;
