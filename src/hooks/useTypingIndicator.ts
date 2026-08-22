import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "../services/apiService";

export function useTypingIndicator(chatId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current > 2000) {
      apiService.sendTypingEvent(chatId);
      lastSentRef.current = now;
    }
  }, [chatId]);

  useEffect(() => {
    const handleTyping = (incomingChatId: string) => {
      if (incomingChatId === chatId) {
        setIsTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 5000);
      }
    };

    apiService.onTypingEvent(handleTyping);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatId]);

  return { isTyping, sendTyping };
}
