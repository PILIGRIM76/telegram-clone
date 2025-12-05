
import React, { useState } from 'react';
import { сервисАПИ } from '../services/apiService';

interface Пропсы {
    доскаId: string;
    приЗакрытии: () => void;
    приУспехе: () => void;
}

const тарифы = [
    { label: '1 день', цена: '5 USDT', срок: 86400000 },
    { label: '1 неделя', цена: '25 USDT', срок: 604800000 },
    { label: '1 месяц', цена: '80 USDT', срок: 2592000000 },
];

const ModalПродленияДоски: React.FC<Пропсы> = ({ доскаId, приЗакрытии, приУспехе }) => {
    const [выбранныйТариф, установитьВыбранныйТариф] = useState(тарифы[0]);
    const [txid, установитьTxid] = useState('');
    const [этап, установитьЭтап] = useState(1); // 1: Выбор, 2: Оплата

    const обработатьПродление = async () => {
        if (!txid) return alert('Введите TXID');
        try {
            await сервисАПИ.обновитьДоску(доскаId, { 
                срокАренды: выбранныйТариф.срок,
                txidПродления: txid
            });
            alert('Аренда продлена!');
            приУспехе();
            приЗакрытии();
        } catch (e) {
            alert('Ошибка продления');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">Продление аренды</h3>

                {этап === 1 && (
                    <div className="space-y-2">
                        {тарифы.map(т => (
                            <button 
                                key={т.label}
                                onClick={() => установитьВыбранныйТариф(т)}
                                className={`w-full p-3 rounded flex justify-between ${выбранныйТариф === т ? 'bg-cyan-900 border border-cyan-500' : 'bg-slate-700'}`}
                            >
                                <span className="text-white">{т.label}</span>
                                <span className="text-cyan-400 font-bold">{т.цена}</span>
                            </button>
                        ))}
                        <button onClick={() => установитьЭтап(2)} className="w-full bg-cyan-600 py-2 rounded text-white mt-4">Далее</button>
                    </div>
                )}

                {этап === 2 && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 p-3 rounded">
                            <p className="text-xs text-slate-400">Адрес смарт-контракта:</p>
                            <p className="text-xs text-cyan-400 font-mono break-all">0xSmartContractAddressHere...</p>
                        </div>
                        <input 
                            value={txid}
                            onChange={e => установитьTxid(e.target.value)}
                            placeholder="Вставьте ID транзакции (TXID)"
                            className="w-full bg-slate-700 p-2 rounded text-white text-sm"
                        />
                         <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => установитьЭтап(1)} className="px-4 py-2 bg-slate-600 rounded text-white">Назад</button>
                            <button onClick={обработатьПродление} className="px-4 py-2 bg-green-600 rounded text-white">Подтвердить</button>
                        </div>
                    </div>
                )}
                 <button onClick={приЗакрытии} className="absolute top-2 right-2 text-slate-400">✕</button>
            </div>
        </div>
    );
};

export default ModalПродленияДоски;
