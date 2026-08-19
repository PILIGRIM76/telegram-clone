
import React, { useRef, useEffect, useState } from 'react';
import type { Identity, Contact, Chat, Group, Message } from '../types';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import MessageTimerSelection from './MessageTimerSelection';
import ForwardModal from './ForwardModal';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ShareIcon } from './icons/ShareIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { apiService } from '../services/apiService';

interface ChatWindowProps {
  partner: Contact | Group;
  chat: Chat;
  onSendMessage: (text: string, media?: string, mediaType?: 'image' | 'video' | 'audio', payload?: any) => void;
  currentUserIdentity: Identity;
  onBack: () => void;
  onSetTimer: (seconds: number | undefined) => void;
  onDeleteMessage: (id: string) => void;
  onVerify: () => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
  onForwardMessage: (messageId: string, targetId: string, originalText: string, originalMedia?: string, originalMediaType?: any) => void;
  allContacts: Contact[];
  allGroups: Group[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  partner,
  chat,
  onSendMessage,
  currentUserIdentity,
  onBack,
  onSetTimer,
  onDeleteMessage,
  onVerify,
  onEditMessage,
  onReactMessage,
  onForwardMessage,
  allContacts,
  allGroups
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isTimerSelectionOpen, setIsTimerSelectionOpen] = useState(false);
  
  // Interaction states
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ message: Message, text: string } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<{ message: Message, text: string } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // Send read status for DMs
    if (!('name' in partner)) {
       apiService.sendMessage((partner as Contact).uid, '', { type: 'read' });
    }
  }, [chat.messages, partner]);
  
  useEffect(() => {
    setPartnerTyping(false);
    setReplyingTo(null);
    setEditingMessage(null);
  }, [partner.id]);

  const isGroup = 'name' in partner;
  const partnerName = isGroup ? (partner as Group).name : (partner as Contact).name;
  const verified = !isGroup && (partner as Contact).verified;

  const copyInvite = () => {
      if (isGroup && (partner as Group).inviteToken) {
          const link = `${window.location.origin}/invite/${(partner as Group).inviteToken}`;
          navigator.clipboard.writeText(link);
          alert('Invite link copied!');
      }
  };

  const handleMessageAction = (action: string, message: Message, extra?: any) => {
      if (action === 'reply') setReplyingTo(message);
      if (action === 'edit') setEditingMessage({ message, text: message.text });
      if (action === 'forward') setForwardingMessage({ message, text: message.text });
      if (action === 'delete') onDeleteMessage(message.id);
      if (action === 'react') onReactMessage(message.id, extra);
  };

  const handleSend = (text: string, media?: string, mediaType?: 'image' | 'video' | 'audio', payload?: any) => {
      if (editingMessage) {
          onEditMessage(editingMessage.message.id, text);
          setEditingMessage(null);
      } else {
          // If replying, attach replyTo context
          const finalPayload = replyingTo ? { ...payload, replyTo: { id: replyingTo.id, text: replyingTo.text, senderId: replyingTo.senderId } } : payload;
          onSendMessage(text, media, mediaType, finalPayload);
          setReplyingTo(null);
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 relative">
      <header className="flex items-center p-4 bg-slate-900 border-b border-slate-700 flex-shrink-0 z-10">
        <button onClick={onBack} className="mr-4 md:hidden text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
        </button>
        
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-cyan-400 mr-4 relative">
          {partnerName.charAt(0).toUpperCase()}
          {verified && (
              <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                  <ShieldCheckIcon className="w-3 h-3 text-green-500" />
              </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex items-center">
                <h3 className="font-bold text-lg text-white truncate">{partnerName}</h3>
                {verified && <ShieldCheckIcon className="w-4 h-4 text-green-500 ml-2" />}
            </div>
            
            {partnerTyping ? (
              <p className="text-xs text-cyan-400 animate-pulse">... typing ...</p>
            ) : (
              <div className="flex items-center text-xs text-slate-400">
                  {isGroup ? (
                      <span>{ (partner as Group).members.length } members</span>
                  ) : (
                      <span className={verified ? "text-green-400" : "text-slate-500"}>
                          {verified ? 'Identity verified' : 'Identity not verified'}
                      </span>
                  )}
              </div>
            )}
        </div>

        <div className="flex items-center space-x-3">
            <div className="relative">
                <button 
                    onClick={() => setIsTimerSelectionOpen(!isTimerSelectionOpen)}
                    className={`p-2 rounded-full hover:bg-slate-700 ${chat.disappearTimer ? 'text-cyan-400' : 'text-slate-400'}`}
                    title="Disappearing messages"
                >
                    <ClockIcon className="w-5 h-5" />
                </button>
                {isTimerSelectionOpen && (
                    <div className="absolute right-0 top-full mt-2 z-20">
                        <MessageTimerSelection 
                            currentValue={chat.disappearTimer}
                            onSelect={(sec) => {
                                onSetTimer(sec);
                                setIsTimerSelectionOpen(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {!isGroup && !verified && (
                <button onClick={onVerify} className="p-2 text-slate-400 hover:text-white" title="Verify">
                    <QrCodeIcon className="w-5 h-5" />
                </button>
            )}

            {isGroup && (partner as Group).type === 'private' && (
                 <button onClick={copyInvite} className="p-2 text-slate-400 hover:text-white" title="Invite link">
                     <ShareIcon className="w-5 h-5" />
                 </button>
            )}
        </div>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto bg-slate-800 custom-scrollbar relative">
         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         
        <div className="space-y-2 relative z-0">
          {chat.messages.map(msg => (
              <MessageItem
                key={msg.id}
                message={msg}
                currentIdentity={currentUserIdentity}
                onTimerExpire={() => onDeleteMessage(msg.id)}
                onAction={handleMessageAction}
              />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <MessageInput 
        onSendMessage={handleSend}
        onTyping={setPartnerTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />

      {forwardingMessage && (
          <ForwardModal 
              contacts={allContacts}
              groups={allGroups}
              onClose={() => setForwardingMessage(null)}
              onForward={(targetId) => {
                  onForwardMessage(forwardingMessage.message.id, targetId, forwardingMessage.text, forwardingMessage.message.media, forwardingMessage.message.mediaType);
                  setForwardingMessage(null);
              }}
          />
      )}
    </div>
  );
};

export default ChatWindow;
