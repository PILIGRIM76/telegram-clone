

import React, { useState, useEffect } from 'react';
import type { Магазин, Товар, Заказ, Личность } from '../types';
import { сервисАПИ } from '../services/apiService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import ModalДобавленияТовара from './ModalДобавленияТовара';

interface Пропсы {
    личность: Личность;
    приЗакрытии: () => void;
    приСохранении: (магазин: Магазин) => void;
    заказы: Заказ[];
    обновитьСтатусЗаказа: (id: string, статус: any) => void;
}

const ModalУправленияМагазином: React.FC<Пропсы> = ({ личность, приЗакрытии, приСохранении, заказы, обновитьСтатусЗаказа }) => {
    const [вкладка, установитьВкладку] = useState<'инфо'|'товары'|'заказы'>('инфо');
    const [магазин, установитьМагазин] = useState<Магазин>(личность.магазин || {
        название: '', описание: '', тип: 'публичный', товары: []
    });
    const [модалТовараОткрыт, установитьМодалТовараОткрыт] = useState(false);
    const [редактируемыйТовар, установитьРедактируемыйТовар] = useState<Товар | null>(null);

    const сохранитьИнфо = async () => {
        try {
            const рез = await сервисАПИ.создатьИлиОбновитьМагазин(личность.uid, магазин);
            if (рез.токенПриглашения) {
                установитьМагазин(prev => ({ ...prev, токенПриглашения: рез.токенПриглашения }));
            }
            приСохранении(магазин);
            alert('Магазин сохранен!');
        } catch (e) {
            alert('Ошибка сохранения');
        }
    };

    const удалитьТовар = (id: string) => {
        if(confirm('Удалить товар?')) {
            const новыеТовары = магазин.товары.filter(т => т.id !== id);
            установитьМагазин({...магазин, товары: новыеТовары});
        }
    };

    const сохранитьТовар = (товар: Товар) => {
        let новыеТовары;
        if (редактируемыйТовар) {
            новыеТовары = магазин.товары.map(т => т.id === товар.id ? товар : т);
        } else {
            новыеТовары = [...магазин.товары, товар];
        }
        установитьМагазин({...магазин, товары: новыеТовары});
        установитьМодалТовараОткрыт(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={приЗакрытии}>
            <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Управление магазином</h2>
                    <button onClick={приЗакрытии} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex border-b border-slate-700">
                    {['инфо', 'товары', 'заказы'].map(t => (
                        <button 
                            key={t}
                            onClick={() => установитьВкладку(t as any)}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide ${вкладка === t ? 'border-b-2 border-cyan-500 text-cyan-400 bg-slate-700/30' : 'text-slate-400 hover:bg-slate-700/50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* Вкладка ИНФО */}
                    {вкладка === 'инфо' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm">Название магазина</label>
                                <input className="w-full bg-slate-700 p-2 rounded text-white mt-1" value={магазин.название} onChange={e => установитьМагазин({...магазин, название: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Описание</label>
                                <textarea className="w-full bg-slate-700 p-2 rounded text-white mt-1 h-24" value={магазин.описание} onChange={e => установитьМагазин({...магазин, описание: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Ваш кошелек (USDT/BTC) для получения средств</label>
                                <input className="w-full bg-slate-700 p-2 rounded text-white mt-1 font-mono text-xs" 
                                    value={магазин.личныйКошелекПродавца || ''} 
                                    placeholder="Введите адрес кошелька..."
                                    onChange={e => установитьМагазин({...магазин, личныйКошелекПродавца: e.target.value})} 
                                />
                                <p className="text-xs text-yellow-500 mt-1">Система сгенерирует смарт-контракт на основе этого адреса.</p>
                            </div>
                            <div className="flex items-center space-x-4 mt-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={магазин.тип === 'публичный'} onChange={() => установитьМагазин({...магазин, тип: 'публичный'})} />
                                    <span className="text-white">Публичный</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={магазин.тип === 'приватная'} onChange={() => установитьМагазин({...магазин, тип: 'приватная'})} />
                                    <span className="text-white">Приватный</span>
                                </label>
                            </div>

                            {магазин.тип === 'приватная' && магазин.токенПриглашения && (
                                <div className="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded mt-4">
                                    <p className="text-xs text-indigo-300 mb-1">Ссылка-приглашение</p>
                                    <div className="flex items-center space-x-2">
                                        <code className="flex-1 bg-black/30 p-2 rounded text-xs text-slate-300 truncate">
                                            {window.location.origin}/invite/{магазин.токенПриглашения}
                                        </code>
                                        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${магазин.токенПриглашения}`)}>
                                            <ClipboardIcon className="w-5 h-5 text-indigo-400" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button onClick={сохранитьИнфо} className="w-full bg-cyan-600 py-3 rounded text-white font-bold mt-4 hover:bg-cyan-700">Сохранить изменения</button>
                        </div>
                    )}

                    {/* Вкладка ТОВАРЫ */}
                    {вкладка === 'товары' && (
                        <div>
                            <button 
                                onClick={() => { установитьРедактируемыйТовар(null); установитьМодалТовараОткрыт(true); }}
                                className="w-full border-2 border-dashed border-slate-600 rounded-lg p-4 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors mb-4"
                            >
                                <PlusCircleIcon className="w-6 h-6 mr-2" /> Добавить товар
                            </button>

                            <div className="space-y-3">
                                {магазин.товары.map(товар => (
                                    <div key={товар.id} className="bg-slate-700 p-3 rounded-lg flex items-center">
                                        <div className="w-12 h-12 bg-slate-600 rounded overflow-hidden mr-3">
                                            {товар.изображение ? <img src={товар.изображение} className="w-full h-full object-cover"/> : null}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-white">{товар.название}</p>
                                            <p className="text-sm text-cyan-400">{товар.цена} {товар.валюта}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => { установитьРедактируемыйТовар(товар); установитьМодалТовараОткрыт(true); }} className="p-2 hover:bg-slate-600 rounded">
                                                <PencilIcon className="w-4 h-4 text-slate-300" />
                                            </button>
                                            <button onClick={() => удалитьТовар(товар.id)} className="p-2 hover:bg-slate-600 rounded">
                                                <TrashIcon className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Вкладка ЗАКАЗЫ */}
                    {вкладка === 'заказы' && (
                        <div className="space-y-3">
                            {заказы.length === 0 ? <p className="text-center text-slate-500 mt-10">Заказов пока нет</p> : 
                            заказы.map(заказ => (
                                <div key={заказ.id} className="bg-slate-700 p-4 rounded-lg border-l-4 border-cyan-500">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-400">ID: {заказ.id.slice(-6)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${заказ.статус === 'оплачен' ? 'bg-green-900 text-green-300' : 'bg-slate-600'}`}>{заказ.статус}</span>
                                    </div>
                                    <p className="font-bold text-white">{заказ.товар.название}</p>
                                    <p className="text-sm text-slate-300 mb-2">{заказ.товар.цена} {заказ.товар.валюта}</p>
                                    {заказ.txid && (
                                        <div className="bg-black/20 p-2 rounded mb-2 font-mono text-xs text-green-400 break-all">
                                            TXID: {заказ.txid}
                                        </div>
                                    )}
                                    <div className="flex space-x-2 mt-2">
                                        <select 
                                            value={заказ.статус} 
                                            onChange={(e) => обновитьСтатусЗаказа(заказ.id, e.target.value)}
                                            className="bg-slate-800 text-xs p-1 rounded text-white border border-slate-600"
                                        >
                                            <option value="новый">Новый</option>
                                            <option value="оплачен">Оплачен (Проверено)</option>
                                            <option value="в_обработке">В обработке</option>
                                            <option value="отправлен">Отправлен</option>
                                            <option value="завершен">Завершен</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {модалТовараОткрыт && (
                <ModalДобавленияТовара
                    товар={редактируемыйТовар}
                    приЗакрытии={() => установитьМодалТовараОткрыт(false)}
                    приСохранении={сохранитьТовар}
                />
            )}
        </div>
    );
};

export default ModalУправленияМагазином;
