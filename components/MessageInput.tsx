
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { PaperClipIcon } from './icons/PaperClipIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { GiftIcon } from './icons/GiftIcon';
import GiftSelectorModal from './GiftSelectorModal';
import type { Подарок } from '../types';

interface ПропсыMessageInput {
  приОтправкеСообщения: (текст: string, медиа?: string, типМедиа?: 'image' | 'video', допДанные?: any) => void;
  приНабореТекста?: (набирает: boolean) => void;
}

const MessageInput: React.FC<ПропсыMessageInput> = ({ приОтправкеСообщения, приНабореТекста }) => {
  const [текст, установитьТекст] = useState('');
  const [медиаФайл, установитьМедиаФайл] = useState<{base64: string, type: 'image' | 'video'} | null>(null);
  const [ошибкаФайла, установитьОшибкуФайла] = useState('');
  const [модалПодарковОткрыт, установитьМодалПодарковОткрыт] = useState(false);
  
  const таймерНабораRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Автоматическое изменение высоты
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [текст]);

  const обработатьИзменениеВвода = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    установитьТекст(e.target.value);

    if (приНабореТекста) {
      if (таймерНабораRef.current) {
        clearTimeout(таймерНабораRef.current);
      }
      приНабореТекста(true);
      таймерНабораRef.current = window.setTimeout(() => {
        приНабореТекста(false);
      }, 1500);
    }
  };

  const обработатьВыборФайла = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      установитьОшибкуФайла('Файл слишком большой (макс. 5Мб)');
      return;
    }
    установитьОшибкуФайла('');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const type = file.type.startsWith('video') ? 'video' : 'image';
      установитьМедиаФайл({ base64, type });
    };
    reader.readAsDataURL(file);
  };

  const очиститьФайл = () => {
      установитьМедиаФайл(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const обработатьНажатиеКлавиш = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      отправить();
    }
  };

  const отправить = () => {
    if (текст.trim() || медиаФайл) {
      приОтправкеСообщения(текст.trim(), медиаФайл?.base64, медиаФайл?.type);
      установитьТекст('');
      очиститьФайл();
      
      if (приНабореТекста) {
        if (таймерНабораRef.current) clearTimeout(таймерНабораRef.current);
        приНабореТекста(false);
      }
      
      // Сброс высоты
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const отправитьПодарок = (подарок: Подарок) => {
      приОтправкеСообщения('', undefined, undefined, { type: 'gift', gift: подарок });
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-700 flex-shrink-0 flex flex-col">
      {/* Превью файла */}
      {медиаФайл && (
          <div className="mb-2 relative inline-block self-start">
              {медиаФайл.type === 'image' ? (
                  <img src={медиаФайл.base64} alt="Preview" className="h-24 rounded-lg border border-slate-600 object-cover" />
              ) : (
                  <video src={медиаФайл.base64} className="h-24 rounded-lg border border-slate-600 bg-black" />
              )}
              <button 
                onClick={очиститьФайл}
                className="absolute -top-2 -right-2 bg-slate-700 rounded-full p-1 text-slate-300 hover:text-white border border-slate-500 shadow-md"
              >
                  <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
      )}
      {ошибкаФайла && <p className="text-red-400 text-xs mb-2">{ошибкаФайла}</p>}

      <div className="flex items-end space-x-2 bg-slate-700 border border-slate-600 rounded-2xl p-2">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors mb-0.5"
            title="Прикрепить фото/видео"
        >
            <PaperClipIcon className="w-5 h-5" />
        </button>
        <button 
            onClick={() => установитьМодалПодарковОткрыт(true)}
            className="p-2 text-slate-400 hover:text-pink-400 transition-colors mb-0.5"
            title="Отправить подарок"
        >
            <GiftIcon className="w-5 h-5" />
        </button>

        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={обработатьВыборФайла} 
            className="hidden" 
            accept="image/*,video/*"
        />

        <textarea
          ref={textareaRef}
          value={текст}
          onChange={обработатьИзменениеВвода}
          onKeyDown={обработатьНажатиеКлавиш}
          placeholder={медиаФайл ? "Добавить подпись..." : "Введите сообщение..."}
          className="flex-1 w-full bg-transparent border-none focus:ring-0 resize-none text-slate-200 placeholder-slate-400 max-h-32 min-h-[24px] py-1 px-2 custom-scrollbar"
          rows={1}
        />
        <button
          onClick={отправить}
          className="p-2 bg-cyan-600 text-white rounded-full hover:bg-cyan-700 disabled:bg-slate-600 disabled:text-slate-400 transition-colors mb-0.5"
          disabled={!текст.trim() && !медиаФайл}
          aria-label="Отправить"
        >
          <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
        </button>
      </div>
      <div className="text-[10px] text-slate-500 mt-1 text-center hidden md:block">
        Enter — отправить, Shift+Enter — новая строка
      </div>

      {модалПодарковОткрыт && (
          <GiftSelectorModal 
              приЗакрытии={() => установитьМодалПодарковОткрыт(false)}
              приВыборе={отправитьПодарок}
          />
      )}
    </div>
  );
};

export default MessageInput;
