
import React, { useEffect, useState } from 'react';
import type { Сообщение, Личность } from '../types';
import { расшифровать } from '../services/cryptoService';
import { ClockIcon } from './icons/ClockIcon';
import { GiftIcon } from './icons/GiftIcon';

interface Пропсы {
    сообщение: Сообщение;
    текущаяЛичность: Личность;
    приИстеченииТаймера: () => void;
}

const статусТекст = {
  'отправлено': '✓',
  'доставлено': '✓✓',
  'прочитано': '✓✓', // Можно сделать синим цветом
};

const MessageItem: React.FC<Пропсы> = ({ сообщение, текущаяЛичность, приИстеченииТаймера }) => {
    const [видимо, установитьВидимо] = useState(true);
    const отправленоМной = сообщение.idОтправителя === текущаяЛичность.uid;
    const системное = сообщение.тип === 'системное';

    // Расшифровка
    const текст = системное ? сообщение.текст : расшифровать(сообщение.текст, текущаяЛичность.приватныйКлюч);

    // Логика исчезающих сообщений
    useEffect(() => {
        if (сообщение.времяИсчезновения && сообщение.таймерУстановленВ) {
            const прошло = (Date.now() - сообщение.таймерУстановленВ) / 1000;
            const осталось = сообщение.времяИсчезновения - прошло;

            if (осталось <= 0) {
                установитьВидимо(false);
                приИстеченииТаймера();
            } else {
                const таймер = setTimeout(() => {
                    установитьВидимо(false);
                    setTimeout(приИстеченииТаймера, 500); // Даем время на анимацию
                }, осталось * 1000);
                return () => clearTimeout(таймер);
            }
        }
    }, [сообщение, приИстеченииТаймера]);

    if (!видимо) return <div className="transition-all duration-500 opacity-0 h-0 overflow-hidden"></div>;

    if (системное) {
        return (
            <div className="flex justify-center my-2">
                <div className="bg-slate-700/50 text-slate-400 text-xs px-3 py-1 rounded-full border border-slate-700">
                    {текст}
                </div>
            </div>
        );
    }

    // Рендер сообщения с заказом (Payload)
    if (сообщение.payload && сообщение.payload.тип === 'заказ') {
        return (
            <div className={`flex ${отправленоМной ? 'justify-end' : 'justify-start'}`}>
                <div className="bg-slate-700 border border-indigo-500/50 p-3 rounded-lg max-w-xs">
                     <p className="text-xs text-indigo-300 font-bold mb-1">ЗАКАЗ #{сообщение.payload.заказId.slice(-4)}</p>
                     <p className="text-sm text-white mb-2">{текст}</p>
                     <div className="text-xs text-slate-400">Статус: {сообщение.payload.статус}</div>
                </div>
            </div>
        )
    }

    // Рендер подарка
    if (сообщение.payload && сообщение.payload.type === 'gift') {
        const gift = сообщение.payload.gift;
        return (
            <div className={`flex ${отправленоМной ? 'justify-end' : 'justify-start'} group mb-2`}>
                <div className={`relative px-4 py-3 rounded-2xl shadow-sm border ${
                    отправленоМной
                        ? 'bg-gradient-to-br from-pink-900/50 to-slate-800 border-pink-500/30'
                        : 'bg-gradient-to-br from-slate-800 to-pink-900/20 border-pink-500/30'
                }`}>
                    <div className="flex items-center space-x-3">
                         <div className="text-4xl animate-bounce">{gift.emoji}</div>
                         <div>
                             <p className="text-xs text-pink-300 uppercase font-bold tracking-wider mb-1">
                                 {отправленоМной ? 'Вы отправили подарок' : 'Вам подарок!'}
                             </p>
                             <p className="text-white font-bold text-lg">{gift.название}</p>
                             {gift.тип === 'платный' && (
                                 <p className="text-[10px] text-yellow-400 flex items-center mt-1">
                                     <GiftIcon className="w-3 h-3 mr-1" /> Premium
                                 </p>
                             )}
                         </div>
                    </div>
                    <div className="flex items-center justify-end space-x-1 mt-2 select-none">
                        <span className="text-[10px] opacity-70 text-slate-400">
                            {new Date(сообщение.временнаяМетка).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${отправленоМной ? 'justify-end' : 'justify-start'} group`}>
            <div
                className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm ${
                    отправленоМной
                        ? 'bg-cyan-600 text-white rounded-br-none'
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
            >
                {/* Медиа контент */}
                {сообщение.media && (
                    <div className="mb-2 -mx-2 mt-[-4px]">
                        {сообщение.mediaType === 'image' ? (
                            <img src={сообщение.media} className="rounded-lg max-h-64 object-cover w-full" alt="Вложение" />
                        ) : (
                            <video src={сообщение.media} controls className="rounded-lg max-h-64 w-full bg-black/20" />
                        )}
                    </div>
                )}

                {текст && <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{текст}</p>}
                
                <div className="flex items-center justify-end space-x-1 mt-1 select-none">
                    {сообщение.времяИсчезновения && (
                         <ClockIcon className="w-3 h-3 opacity-70" />
                    )}
                    <span className="text-[10px] opacity-70">
                        {new Date(сообщение.временнаяМетка).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {отправленоМной && сообщение.статус && (
                        <span className={`text-[10px] ${сообщение.статус === 'прочитано' ? 'text-cyan-200' : 'opacity-70'}`}>
                             {статусТекст[сообщение.статус]}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageItem;
