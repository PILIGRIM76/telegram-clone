import React from 'react';
import { ContextMenu, MenuItem } from './ContextMenu';
import type { Message } from '../types';

interface MessageContextMenuProps {
  message: Message;
  currentUserUid: string;
  isAdmin?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForAll: () => void;
  onCopy: () => void;
  onReply: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  currentUserUid,
  isAdmin = false,
  onClose,
  onEdit,
  onDeleteForMe,
  onDeleteForAll,
  onCopy,
  onReply
}) => {
  const isOwn = message.senderId === currentUserUid;
  const canEdit = isOwn && message.type === 'user' && !message.isDeleted;
  const canDelete = isOwn || isAdmin;

  const items: MenuItem[] = [
    { id: 'reply', icon: '↩️', label: 'Ответить', onClick: onReply },
    { id: 'copy', icon: '📋', label: 'Копировать', onClick: onCopy },
  ];

  if (canEdit) {
    items.splice(1, 0, { id: 'edit', icon: '✏️', label: 'Редактировать', onClick: onEdit });
  }

  if (canDelete) {
    items.push({ id: 'delete_me', icon: '🗑️', label: 'Удалить для себя', dangerous: true, onClick: onDeleteForMe });
    if (isOwn) {
      items.push({ id: 'delete_all', icon: '🗑️', label: 'Удалить для всех', dangerous: true, onClick: onDeleteForAll });
    }
  }

  return (
    <ContextMenu
      isOpen={true}
      x={0}
      y={0}
      items={items}
      onClose={onClose}
    />
  );
};