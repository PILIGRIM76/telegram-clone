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
  currentUserUid,
}) => {
  if (!sentByMe) {
    return null; // Показываем статус только у отправленных текущим пользователем сообщений.
  }

  // Определяем статус по списку прочитавших сообщение.
  let status: 'sent' | 'delivered' | 'read' = 'sent';

  if (message.readBy && message.readBy.length > 0) {
    // Проверяем, прочитал ли сообщение текущий пользователь.
    const hasCurrentUserRead = currentUserUid
      ? message.readBy.some(r => r.uid === currentUserUid)
      : message.readBy.length > 0;

    if (hasCurrentUserRead) {
      status = 'read';
    } else {
      status = 'delivered';
    }
  } else if (message.status === 'delivered' || message.status === 'read') {
    // Если списка прочитавших нет, используем устаревшее поле status.
    status = message.status;
  }

  const statusConfig = {
    sent: {
      icon: '✓',
      color: 'text-slate-500',
      title: 'Отправлено',
      count: 1,
    },
    delivered: {
      icon: '✓✓',
      color: 'text-slate-500',
      title: 'Доставлено',
      count: 2,
    },
    read: {
      icon: '✓✓',
      color: 'text-cyan-400',
      title: 'Прочитано',
      count: 2,
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`text-[10px] ${config.color}`} title={config.title} aria-label={config.title}>
      {config.icon}
    </span>
  );
};
