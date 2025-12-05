
import React, { useRef, useEffect, useState } from 'react';
import type { Личность, Контакт, Чат, Группа } from '../types';
import MessageInput from './MessageInput';
import MessageItem from './MessageItem';
import MessageTimerSelection from './MessageTimerSelection';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { ShareIcon } from './icons/ShareIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { сервисАПИ } from '../services/apiService';

interface ПропсыChatWindow {
  собеседник: Контакт | Группа;
  чат: Чат;
  приОтправкеСообщения: (текст: string, медиа?: string, типМедиа?: 'image' | 'video', допДанные?: any) => void;
  текущаяЛичностьПользователя: Личность;
  приВозврате: () => void;
  приУстановкеТаймера: (секунды: number | undefined) => void;
  приУдаленииСообщения: (id: string) => void;
  приВерификации: () => void;
}

const ChatWindow: React.FC<ПропсыChatWindow> = ({
  собеседник,
  чат,
  приОтправкеСообщения,
  текущаяЛичностьПользователя,
  приВозврате,
  приУстановкеТаймера,
  приУдаленииСообщения,
  приВерификации
}) => {
  const конецСообщенийRef = useRef<HTMLDivElement>(null);
  const [собеседникНабирает, установитьСобеседникНабирает] = useState(false);
  const [выборТаймераОткрыт, установитьВыборТаймераОткрыт] = useState(false);

  const прокрутитьВниз = () => {
    конецСообщенийRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    прокрутитьВниз();
    // Отправляем сигнал "прочитано" если это личный чат
    if (!('название' in собеседник)) {
       сервисАПИ.отправитьСообщение((собеседник as Контакт).uid, '', { тип: 'прочитано' });
    }
  }, [чат.сообщения, собеседник]);
  
  useEffect(() => {
    установитьСобеседникНабирает(false);
  }, [собеседник.id]);

  const этоГруппа = 'название' in собеседник;
  const имяСобеседника = этоГруппа ? (собеседник as Группа).название : (собеседник as Контакт).имя;
  const проверен = !этоГруппа && (собеседник as Контакт).проверен;

  const копироватьПриглашение = () => {
      if (этоГруппа && (собеседник as Группа).токенПриглашения) {
          const ссылка = `${window.location.origin}/invite/${(собеседник as Группа).токенПриглашения}`;
          navigator.clipboard.writeText(ссылка);
          alert('Ссылка-приглашение скопирована!');
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 relative">
      <header className="flex items-center p-4 bg-slate-900 border-b border-slate-700 flex-shrink-0 z-10">
        <button onClick={приВозврате} className="mr-4 md:hidden text-slate-400 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
        </button>
        
        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-cyan-400 mr-4 relative">
          {имяСобеседника.charAt(0).toUpperCase()}
          {проверен && (
              <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                  <ShieldCheckIcon className="w-3 h-3 text-green-500" />
              </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex items-center">
                <h3 className="font-bold text-lg text-white truncate">{имяСобеседника}</h3>
                {проверен && <ShieldCheckIcon className="w-4 h-4 text-green-500 ml-2" />}
            </div>
            
            {собеседникНабирает ? (
              <p className="text-xs text-cyan-400 animate-pulse">... набирает текст ...</p>
            ) : (
              <div className="flex items-center text-xs text-slate-400">
                  {этоГруппа ? (
                      <span>{ (собеседник as Группа).участники.length } участников</span>
                  ) : (
                      <span className={проверен ? "text-green-400" : "text-slate-500"}>
                          {проверен ? 'Личность верифицирована' : 'Личность не подтверждена'}
                      </span>
                  )}
              </div>
            )}
        </div>

        <div className="flex items-center space-x-3">
            <div className="relative">
                <button 
                    onClick={() => установитьВыборТаймераОткрыт(!выборТаймераОткрыт)}
                    className={`p-2 rounded-full hover:bg-slate-700 ${чат.таймерИсчезновения ? 'text-cyan-400' : 'text-slate-400'}`}
                    title="Исчезающие сообщения"
                >
                    <ClockIcon className="w-5 h-5" />
                </button>
                {выборТаймераОткрыт && (
                    <div className="absolute right-0 top-full mt-2 z-20">
                        <MessageTimerSelection 
                            текущееЗначение={чат.таймерИсчезновения}
                            приВыборе={(сек) => {
                                приУстановкеТаймера(сек);
                                установитьВыборТаймераОткрыт(false);
                            }}
                        />
                    </div>
                )}
            </div>

            {!этоГруппа && !проверен && (
                <button onClick={приВерификации} className="p-2 text-slate-400 hover:text-white" title="Верифицировать">
                    <QrCodeIcon className="w-5 h-5" />
                </button>
            )}

            {этоГруппа && (собеседник as Группа).тип === 'приватная' && (
                 <button onClick={копироватьПриглашение} className="p-2 text-slate-400 hover:text-white" title="Ссылка-приглашение">
                     <ShareIcon className="w-5 h-5" />
                 </button>
            )}
        </div>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto bg-slate-800 custom-scrollbar relative">
         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
         
        <div className="space-y-2 relative z-0">
          {чат.сообщения.map(сообщение => (
              <MessageItem
                key={сообщение.id}
                сообщение={сообщение}
                текущаяЛичность={текущаяЛичностьПользователя}
                приИстеченииТаймера={() => приУдаленииСообщения(сообщение.id)}
              />
          ))}
          <div ref={конецСообщенийRef} />
        </div>
      </div>
      
      <MessageInput 
        приОтправкеСообщения={приОтправкеСообщения}
        приНабореТекста={установитьСобеседникНабирает}
      />
    </div>
  );
};

export default ChatWindow;
