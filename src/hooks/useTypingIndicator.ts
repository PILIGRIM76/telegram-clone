import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "../services/apiService";

export function useTypingIndicator(chatId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTypingStart = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current > 2000) {
      apiService.sendTypingStart(chatId);
      lastSentRef.current = now;
    }
  }, [chatId]);

  const sendTypingStop = useCallback(() => {
    apiService.sendTypingStop(chatId);
  }, [chatId]);

  // Debounced typing stop
  const debouncedTypingStop = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 2000); // 2 second debounce
  }, [sendTypingStop]);

  useEffect(() => {
    const handleTypingUpdate = (data: { uid: string; chatId: string; isTyping: boolean }) => {
      if (data.chatId === chatId && data.uid !== apiService.getCurrentUid?.()) {
        setIsTyping(data.isTyping);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 5000); // Auto-clear after 5 seconds if no typing_stop received
        }
      }
    };

    apiService.onTypingUpdate(handleTypingUpdate);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [chatId]);

  // Call this when user starts typing
  const onInputChange = useCallback(() => {
    sendTypingStart();
    debouncedTypingStop();
  }, [sendTypingStart, debouncedTypingStop]);

  // Call this when message is sent (immediately stop typing indicator)
  const onMessageSent = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    sendTypingStop();
  }, [sendTypingStop]);

  return { isTyping, onInputChange, onMessageSent };
}
