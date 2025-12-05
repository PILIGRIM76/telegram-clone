
import React, { useState } from 'react';
import type { Подарок } from '../types';
import { GiftIcon } from './icons/GiftIcon';

interface Пропсы {
    приЗакрытии: () => void;
    приВыборе: (подарок: Подарок) => void;
}

const ПОДАРКИ: Подарок[] = [
    // Бесплатные
    { id: 'g1', название: 'Кофе', emoji: '☕', тип: 'бесплатный' },
    { id: 'g2', название: 'Сердце', emoji: '❤️', тип: 'бесплатный' },
    { id: 'g3', название: 'Пятюня', emoji: '✋', тип: 'бесплатный' },
    { id: 'g4', название: 'Огонь', emoji: '🔥', тип: 'бесплатный' },
    { id: 'g5', название: 'Торт', emoji: '🎂', тип: 'бесплатный' },
    { id: 'g6', название: 'Цветок', emoji: '🌹', тип: 'бесплатный' },
    
    // Платные
    { id: 'p1', название: 'Бриллиант', emoji: '💎', тип: 'платный', цена: 10, валюта: 'USDT' },
    { id: 'p2', название: 'Корона', emoji: '👑', тип: 'платный', цена: 50, валюта: 'USDT' },
    { id: 'p3', название: 'Спорткар', emoji: '🏎️', тип: 'платный', цена: 100, валюта: 'USDT' },
    { id: 'p4', название: 'Ракета', emoji: '🚀', тип: 'платный', цена: 500, валюта: 'USDT' },
    { id: 'p5', название: 'Замок', emoji: '🏰', тип: 'платный', цена: 1000, валюта: 'USDT' },
    { id: 'p6', название: 'Остров', emoji: '🏝️', тип: 'платный', цена: 5000, валюта: 'USDT' },
];

const GiftSelectorModal: React.FC<Пропсы> = ({ приЗакрытии, приВыборе }) => {
    const [вкладка, установитьВкладку] = useState<'бесплатный' | 'платный'>('бесплатный');

    const отфильтрованныеПодарки = ПОДАРКИ.filter(п => п.тип === вкладка);

    const обработатьВыбор = (подарок: Подарок) => {
        if (подарок.тип === 'платный') {
            if (confirm(`Отправить подарок "${подарок.название}" за ${подарок.цена} ${подарок.валюта}? (Симуляция списания)`)) {
                приВыборе(подарок);
                приЗакрытии();
            }
        } else {
            приВыборе(подарок);
            приЗакрытии();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={приЗакрытии}>
            <div className="bg-slate-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-700">
                    <h3 className="text-white font-bold flex items-center">
                        <GiftIcon className="w-5 h-5 mr-2 text-cyan-400" />
                        Отправить подарок
                    </h3>
                    <button onClick={приЗакрытии} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="flex border-b border-slate-700">
                    <button 
                        onClick={() => установитьВкладку('бесплатный')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${вкладка === 'бесплатный' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-400 bg-slate-800/50'}`}
                    >
                        Бесплатные
                    </button>
                    <button 
                        onClick={() => установитьВкладку('платный')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${вкладка === 'платный' ? 'text-yellow-400 border-b-2 border-yellow-500 bg-slate-800' : 'text-slate-400 bg-slate-800/50'}`}
                    >
                        Premium
                    </button>
                </div>

                <div className="p-4 grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {отфильтрованныеПодарки.map(подарок => (
                        <button 
                            key={подарок.id}
                            onClick={() => обработатьВыбор(подарок)}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg hover:bg-slate-700 transition-all transform hover:scale-105 border ${подарок.тип === 'платный' ? 'border-yellow-900/30 bg-yellow-900/10' : 'border-slate-700 bg-slate-700/30'}`}
                        >
                            <span className="text-4xl mb-2">{подарок.emoji}</span>
                            <span className="text-xs text-white font-medium">{подарок.название}</span>
                            {подарок.тип === 'платный' && (
                                <span className="text-[10px] text-yellow-400 mt-1 font-bold">{подарок.цена} {подарок.валюта}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GiftSelectorModal;
