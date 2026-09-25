import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';

interface MessageEditModalProps {
  message: Message;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  message,
  onSave,
  onCancel
}) => {
  const [editedContent, setEditedContent] = useState(message.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editedContent.trim()) {
        onSave(editedContent.trim());
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 shadow-xl">
        <h2 id="edit-modal-title" className="text-lg font-bold mb-4">Редактировать сообщение</h2>

        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white"
          rows={4}
          placeholder="Введите новый текст сообщения..."
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(editedContent.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!editedContent.trim()}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};