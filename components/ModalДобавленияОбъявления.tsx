
import React, { useState } from 'react';
import type { Объявление } from '../types';

interface Пропсы {
    объявление: Объявление | null;
    приЗакрытии: () => void;
    приСохранении: (данные: { заголовок: string, содержание: string }) => void;
}

const ModalДобавленияОбъявления: React.FC<Пропсы> = ({ объявление, приЗакрытии, приСохранении }) => {
    const [заголовок, установитьЗаголовок] = useState(объявление?.заголовок || '');
    const [содержание, установитьСодержание] = useState(объявление?.содержание || '');

    const обработатьСохранение = () => {
        if (!заголовок.trim() || !содержание.trim()) return;
        приСохранении({ заголовок, содержание });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">{объявление ? 'Редактировать объявление' : 'Новое объявление'}</h3>
                
                <input 
                    className="w-full bg-slate-700 p-2 rounded mb-3 text-white" 
                    placeholder="Заголовок" 
                    value={заголовок} 
                    onChange={e => установитьЗаголовок(e.target.value)} 
                />
                <textarea 
                    className="w-full bg-slate-700 p-2 rounded mb-3 text-white h-32" 
                    placeholder="Текст объявления..." 
                    value={содержание} 
                    onChange={e => установитьСодержание(e.target.value)} 
                />

                <div className="flex justify-end space-x-2">
                    <button onClick={приЗакрытии} className="px-4 py-2 bg-slate-600 rounded text-white">Отмена</button>
                    <button onClick={обработатьСохранение} className="px-4 py-2 bg-cyan-600 rounded text-white">
                        {объявление ? 'Сохранить' : 'Опубликовать'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalДобавленияОбъявления;
