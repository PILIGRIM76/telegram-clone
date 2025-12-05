
import React, { useEffect, useState } from 'react';
import type { Message, Identity, Reaction } from '../types';
import { decrypt } from '../services/cryptoService';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';
import { ReplyIcon } from './icons/ReplyIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ShareIcon } from './icons/ShareIcon';

interface MessageItemProps {
    message: Message;
    currentIdentity: Identity;
    onTimerExpire: () => void;
    onReply: (message: Message, decryptedText: string) => void;
    onEdit: (message: Message, decryptedText: string) => void;
    onForward: (message: Message, decryptedText: string) => void;
    onReact: (messageId: string, emoji: string) => void;
}

const statusText = {
  'sent': '✓',
  'delivered': '✓✓',
  'read': '✓✓',
};

const REACTIONS_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageItem: React.FC<MessageItemProps> = ({ message, currentIdentity, onTimerExpire, onReply, onEdit, onForward, onReact }) => {
    const [visible, setVisible] = useState(true);
    const [showReactions, setShowReactions] = useState(false);
    
    const sentByMe = message.senderId === currentIdentity.uid;
    const isSystem = message.type === 'system';

    // Decrypt
    const text = isSystem ? message.text : decrypt(message.text, currentIdentity.privateKey);

    // Disappearing logic
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

    // Group reactions
    const reactionCounts = (message.reactions || []).reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Order Logic
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

    // Gift Logic
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
            className={`flex ${sentByMe ? 'justify-end' : 'justify-start'} group mb-1 relative`}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div className="flex flex-col max-w-[85%] md:max-w-[70%]">
                
                {/* Actions Toolbar */}
                <div className={`flex ${sentByMe ? 'flex-row-reverse' : 'flex-row'} items-center mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-1`}>
                    <div className="relative">
                        <button 
                            onClick={() => setShowReactions(!showReactions)}
                            className="bg-slate-700/50 hover:bg-slate-600 p-1 rounded-full text-slate-300 mx-1"
                            title="React"
                        >
                            <span className="text-xs">😀</span>
                        </button>
                        {showReactions && (
                            <div className={`absolute bottom-full ${sentByMe ? 'right-0' : 'left-0'} mb-2 bg-slate-800 border border-slate-600 rounded-full p-1 flex shadow-lg z-10`}>
                                {REACTIONS_LIST.map(emoji => (
                                    <button 
                                        key={emoji}
                                        onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}
                                        className="hover:bg-slate-700 p-1 rounded-full text-lg transition-transform hover:scale-125"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => onReply(message, text)}
                        className="bg-slate-700/50 hover:bg-slate-600 p-1 rounded-full text-slate-300"
                        title="Reply"
                    >
                        <ReplyIcon className="w-4 h-4" />
                    </button>
                    
                    <button 
                        onClick={() => onForward(message, text)}
                        className="bg-slate-700/50 hover:bg-slate-600 p-1 rounded-full text-slate-300"
                        title="Forward"
                    >
                        <ShareIcon className="w-4 h-4" />
                    </button>

                    {sentByMe && !message.media && (
                        <button 
                            onClick={() => onEdit(message, text)}
                            className="bg-slate-700/50 hover:bg-slate-600 p-1 rounded-full text-slate-300"
                            title="Edit"
                        >
                            <PencilIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <div
                    className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                        sentByMe
                            ? 'bg-cyan-600 text-white rounded-br-none'
                            : 'bg-slate-700 text-slate-200 rounded-bl-none'
                    }`}
                >
                    {/* Forwarded Label */}
                    {message.isForwarded && (
                        <p className="text-[10px] italic opacity-70 mb-1 flex items-center">
                            <ShareIcon className="w-3 h-3 mr-1" /> Forwarded
                        </p>
                    )}

                    {/* Reply Context */}
                    {message.replyTo && (
                        <div className={`text-xs mb-2 p-2 rounded border-l-4 ${sentByMe ? 'bg-cyan-700 border-cyan-300' : 'bg-slate-800 border-cyan-500'} bg-opacity-30`}>
                            <p className="font-bold opacity-80 mb-0.5 truncate">{message.replyTo.senderId === currentIdentity.uid ? 'You' : 'User ' + message.replyTo.senderId.slice(0,6)}</p>
                            <p className="opacity-70 truncate">{message.replyTo.text}</p>
                        </div>
                    )}

                    {/* Media */}
                    {message.media && (
                        <div className="mb-2 -mx-2 mt-[-4px]">
                            {message.mediaType === 'image' ? (
                                <img src={message.media} className="rounded-lg max-h-64 object-cover w-full" alt="Attachment" />
                            ) : message.mediaType === 'video' ? (
                                <video src={message.media} controls className="rounded-lg max-h-64 w-full bg-black/20" />
                            ) : message.mediaType === 'audio' ? (
                                <audio src={message.media} controls className="w-full mt-2" />
                            ) : null}
                        </div>
                    )}

                    {text && <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{text}</p>}
                    
                    {/* Metadata: Time, Edited, Status */}
                    <div className="flex items-center justify-end space-x-1 mt-1 select-none">
                        {message.isEdited && <span className="text-[10px] opacity-60 mr-1">(edited)</span>}
                        
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

                    {/* Reactions Display */}
                    {Object.keys(reactionCounts).length > 0 && (
                        <div className="absolute -bottom-3 left-2 flex space-x-1">
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                                <div key={emoji} className="bg-slate-800 border border-slate-600 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex items-center text-slate-300">
                                    <span>{emoji}</span>
                                    {count > 1 && <span className="ml-1 font-bold">{count}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
