
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { GiftIcon } from './icons/GiftIcon';
import GiftSelectorModal from './GiftSelectorModal';
import type { Gift } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, media?: string, mediaType?: 'image' | 'video', payload?: any) => void;
  onTyping?: (isTyping: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping }) => {
  const [text, setText] = useState('');
  const [mediaFile, setMediaFile] = useState<{base64: string, type: 'image' | 'video'} | null>(null);
  const [fileError, setFileError] = useState('');
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Автоматическое изменение высоты
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (onTyping) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      onTyping(true);
      typingTimerRef.current = window.setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setFileError('File too large (max 5MB)');
      return;
    }
    setFileError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaFile({ base64, type });
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
      setMediaFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const send = () => {
    if (text.trim() || mediaFile) {
      onSendMessage(text.trim(), mediaFile?.base64, mediaFile?.type);
      setText('');
      clearFile();
      
      if (onTyping) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        onTyping(false);
      }
      
      // Сброс высоты
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const sendGift = (gift: Gift) => {
      onSendMessage('', undefined, undefined, { type: 'gift', gift });
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-700 flex-shrink-0 flex flex-col">
      {/* Превью файла */}
      {mediaFile && (
          <div className="mb-2 relative inline-block self-start">
              {mediaFile.type === 'image' ? (
                  <img src={mediaFile.base64} alt="Preview" className="h-24 rounded-lg border border-slate-600 object-cover" />
              ) : (
                  <video src={mediaFile.base64} className="h-24 rounded-lg border border-slate-600 bg-black" />
              )}
              <button 
                onClick={clearFile}
                className="absolute -top-2 -right-2 bg-slate-700 rounded-full p-1 text-slate-300 hover:text-white border border-slate-500 shadow-md"
              >
                  <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
      )}
      {fileError && <p className="text-red-400 text-xs mb-2">{fileError}</p>}

      <div className="flex items-end space-x-2 bg-slate-700 border border-slate-600 rounded-2xl p-2">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors mb-0.5"
            title="Attach photo/video"
        >
            <PaperClipIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={() => setIsGiftModalOpen(true)}
            className="p-2 text-slate-400 hover:text-pink-400 transition-colors mb-0.5"
            title="Send Gift"
        >
            <GiftIcon className="w-5 h-5" />
        </button>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*,video/*"
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={mediaFile ? "Add caption..." : "Type a message..."}
          className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-slate-200 placeholder-slate-400 max-h-32 min-h-[24px] py-1 px-2 custom-scrollbar"
          rows={1}
        />
        <button
          onClick={send}
          className="p-2 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 disabled:bg-slate-600 disabled:text-slate-400 transition-colors mb-0.5"
          disabled={!text.trim() && !mediaFile}
          aria-label="Send"
        >
          <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
        </button>
      </div>
      <div className="text-[10px] text-slate-500 mt-1 text-center hidden md:block">
        Enter — send, Shift+Enter — new line
      </div>

      {isGiftModalOpen && (
          <GiftSelectorModal 
              onClose={() => setIsGiftModalOpen(false)}
              onSelect={sendGift}
          />
      )}
    </div>
  );
};

export default MessageInput;
