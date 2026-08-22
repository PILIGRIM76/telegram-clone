import { useState, useEffect, useCallback } from 'react';
import { sqliteStorage } from '../services/sqliteStorage';
import type { Message } from '../types';

export function useMessageHistory(chatId: string, initialLimit: number = 50) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);

  // Загрузка первой порции сообщений
  useEffect(() => {
    if (!chatId) return;
    
    setLoading(true);
    sqliteStorage.loadMessages(chatId, initialLimit, 0)
      .then(msgs => {
        setMessages(msgs);
        setOffset(initialLimit);
        setHasMore(msgs.length === initialLimit);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        setLoading(false);
      });
  }, [chatId, initialLimit]);

  // Загрузка следующей порции (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    try {
      const moreMessages = await sqliteStorage.loadMessages(chatId, initialLimit, offset);
      if (moreMessages.length < initialLimit) {
        setHasMore(false);
      }
      setMessages(prev => [...moreMessages, ...prev]); // Новые сообщения сверху
      setOffset(prev => prev + initialLimit);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoading(false);
    }
  }, [chatId, initialLimit, offset, hasMore, loading]);

  return { messages, hasMore, loading, loadMore };
}
