
import React, { useState } from 'react';
import type { Товар } from '../types';

interface Пропсы {
    товар: Товар | null;
    приЗакрытии: () => void;
    приСохранении: (товар: Товар) => void;
}

const ModalДобавленияТовара: React.FC<Пропсы> = ({ товар, приЗакрытии, приСохранении }) => {
    const [название, установитьНазвание] = useState(товар?.название || '');
    const [описание, установитьОписание] = useState(товар?.описание || '');
    const [цена, установитьЦену] = useState(товар?.цена?.toString() || '');
    const [изображение, установитьИзображение] = useState(товар?.изображение || '');

    const обработатьФайл = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => установитьИзображение(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const сохранить = () => {
        if (!название || !цена) return;
        приСохранении({
            id: товар?.id || crypto.randomUUID(),
            название,
            описание,
            цена: parseFloat(цена),
            валюта: 'USDT',
            изображение
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">{товар ? 'Редактировать товар' : 'Новый товар'}</h3>
                
                <input className="w-full bg-slate-700 p-2 rounded mb-3 text-white" placeholder="Название" value={название} onChange={e => установитьНазвание(e.target.value)} />
                <textarea className="w-full bg-slate-700 p-2 rounded mb-3 text-white h-20" placeholder="Описание" value={описание} onChange={e => установитьОписание(e.target.value)} />
                <input className="w-full bg-slate-700 p-2 rounded mb-3 text-white" type="number" placeholder="Цена (USDT)" value={цена} onChange={e => установитьЦену(e.target.value)} />
                
                <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-1">Изображение</label>
                    <input type="file" onChange={обработатьФайл} className="text-sm text-slate-400" accept="image/*" />
                    {изображение && <img src={изображение} className="mt-2 h-20 rounded object-cover" />}
                </div>

                <div className="flex justify-end space-x-2">
                    <button onClick={приЗакрытии} className="px-4 py-2 bg-slate-600 rounded text-white">Отмена</button>
                    <button onClick={сохранить} className="px-4 py-2 bg-cyan-600 rounded text-white">Сохранить</button>
                </div>
            </div>
        </div>
    );
};
export default ModalДобавленияТовара;
