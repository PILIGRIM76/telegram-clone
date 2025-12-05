
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { GiftIcon } from './icons/GiftIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import GiftSelectorModal from './GiftSelectorModal';
import type { Gift, Message } from '../types';

interface MessageInputProps {
  onSendMessage: (text: string, media?: string, mediaType?: 'image' | 'video' | 'audio', payload?: any) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  editingMessage?: { message: Message, text: string } | null;
  onCancelEdit?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
    onSendMessage, 
    onTyping, 
    replyingTo, 
    onCancelReply,
    editingMessage,
    onCancelEdit
}) => {
  const [text, setText] = useState('');
  const [mediaFile, setMediaFile] = useState<{base64: string, type: 'image' | 'video' | 'audio'} | null>(null);
  const [fileError, setFileError] = useState('');
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  
  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const typingTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  // Load editing text
  useEffect(() => {
      if (editingMessage) {
          setText(editingMessage.text);
          textareaRef.current?.focus();
      } else {
          setText('');
      }
  }, [editingMessage]);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (onTyping && !editingMessage) {
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

    if (file.size > 10 * 1024 * 1024) { 
      setFileError('File too large (max 10MB)');
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

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setMediaFile({ base64, type: 'audio' });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setFileError("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      
      if (onTyping && !editingMessage) {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        onTyping(false);
      }
      
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const sendGift = (gift: Gift) => {
      onSendMessage('', undefined, undefined, { type: 'gift', gift });
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-700 flex-shrink-0 flex flex-col">
      {/* Edit Banner */}
      {editingMessage && (
          <div className="flex items-center justify-between bg-slate-800 p-2 rounded-t-lg border-l-4 border-green-500 mb-1">
              <div className="flex-1">
                  <p className="text-xs text-green-400 font-bold mb-0.5">Editing message</p>
              </div>
              <button onClick={onCancelEdit} className="p-1 hover:bg-slate-700 rounded-full text-slate-400">
                  <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
      )}

      {/* Reply Banner */}
      {replyingTo && !editingMessage && (
          <div className="flex items-center justify-between bg-slate-800 p-2 rounded-t-lg border-l-4 border-cyan-500 mb-1">
              <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-cyan-400 font-bold mb-0.5">Replying to...</p>
                  <p className="text-xs text-slate-300 truncate">
                      {replyingTo.mediaType ? `[${replyingTo.mediaType}]` : replyingTo.text.substring(0, 50)}
                  </p>
              </div>
              <button onClick={onCancelReply} className="p-1 hover:bg-slate-700 rounded-full text-slate-400">
                  <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
      )}

      {/* File Preview */}
      {mediaFile && (
          <div className="mb-2 relative inline-block self-start">
              {mediaFile.type === 'image' ? (
                  <img src={mediaFile.base64} alt="Preview" className="h-24 rounded-lg border border-slate-600 object-cover" />
              ) : mediaFile.type === 'video' ? (
                  <video src={mediaFile.base64} className="h-24 rounded-lg border border-slate-600 bg-black" />
              ) : (
                  <div className="h-12 w-48 bg-slate-700 rounded-full flex items-center justify-center border border-cyan-500/50">
                      <MicrophoneIcon className="w-5 h-5 text-cyan-400 mr-2" />
                      <span className="text-sm text-cyan-200">Audio Recorded</span>
                  </div>
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

      <div className={`flex items-end space-x-2 bg-slate-700 border border-slate-600 ${replyingTo || editingMessage ? 'rounded-b-2xl rounded-t-none' : 'rounded-2xl'} p-2 relative`}>
        {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-2 py-1.5 animate-pulse">
                <div className="flex items-center text-red-400 font-mono font-bold">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-ping"></div>
                    Recording: {formatTime(recordingTime)}
                </div>
                <button 
                    onClick={stopRecording}
                    className="p-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
                >
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                </button>
            </div>
        ) : (
            <>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 text-slate-400 hover:text-cyan-400 transition-colors mb-0.5 ${editingMessage ? 'hidden' : ''}`}
                    title="Attach"
                >
                    <PaperClipIcon className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setIsGiftModalOpen(true)}
                    className={`p-2 text-slate-400 hover:text-pink-400 transition-colors mb-0.5 ${editingMessage ? 'hidden' : ''}`}
                    title="Gift"
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
                
                {text.trim() || mediaFile ? (
                    <button
                        onClick={send}
                        className={`p-2 rounded-full transition-colors mb-0.5 ${editingMessage ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
                        aria-label="Send"
                    >
                        {editingMessage ? <span className="text-xs font-bold px-1">OK</span> : <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />}
                    </button>
                ) : (
                    <button
                        onClick={startRecording}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors mb-0.5"
                        title="Record Voice"
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                )}
            </>
        )}
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
