import React from 'react';
import type { Message } from '../types';

interface MessageStatusProps {
  message: Message;
  sentByMe: boolean;
  currentUserUid?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ 
  message, 
  sentByMe, 
  currentUserUid 
}) => {
  if (!sentByMe) {
    return null; // Only show status for sent messages
  }

  // Determine status based on readBy array
  let status: 'sent' | 'delivered' | 'read' = 'sent';
  
  if (message.readBy && message.readBy.length > 0) {
    // Check if current user has read it
    const hasCurrentUserRead = currentUserUid 
      ? message.readBy.some(r => r.uid === currentUserUid)
      : message.readBy.length > 0;
    
    if (hasCurrentUserRead) {
      status = 'read';
    } else {
      status = 'delivered';
    }
  } else if (message.status === 'delivered' || message.status === 'read') {
    // Fallback to legacy status field
    status = message.status;
  }

  const statusConfig = {
    sent: { 
      icon: '✓', 
      color: 'text-slate-500', 
      title: 'Отправлено',
      count: 1 
    },
    delivered: { 
      icon: '✓✓', 
      color: 'text-slate-500', 
      title: 'Доставлено',
      count: 2 
    },
    read: { 
      icon: '✓✓', 
      color: 'text-cyan-400', 
      title: 'Прочитано',
      count: 2 
    }
  };

  const config = statusConfig[status];

  return (
    <span 
      className={`text-[10px] ${config.color}`}
      title={config.title}
      aria-label={config.title}
    >
      {config.icon}
    </span>
  );
};