
import React, { useState } from 'react';

interface Пропсы {
    приЗакрытии: () => void;
    приСоздании: (данные: any) => void;
}

const тарифы = [
    { label: '1 день', цена: '5 USDT', срок: 86400000 },
    { label: '1 неделя', цена: '25 USDT', срок: 604800000 },
    { label: '1 месяц', цена: '80 USDT', срок: 2592000000 },
];

const CreateBoardModal: React.FC<Пропсы> = ({ приЗакрытии, приСоздании }) => {
    const [название, установитьНазвание] = useState('');
    const [описание, установитьОписание] = useState('');
    const [выбранныйТариф, установитьВыбранныйТариф] = useState(тарифы[0]);
    const [txid, установитьTxid] = useState('');
    const [этап, установитьЭтап] = useState(1); // 1: Детали, 2: Оплата

    const обработатьСоздание = () => {
        if (!txid) return alert('Введите TXID оплаты');
        приСоздании({
            название,
            описание,
            срокАренды: выбранныйТариф.срок,
            тариф: parseFloat(выбранныйТариф.цена),
            txid
        });
        приЗакрытии();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">Новая доска объявлений</h3>

                {этап === 1 && (
                    <div className="space-y-3">
                         <input className="w-full bg-slate-700 p-2 rounded text-white" placeholder="Название доски" value={название} onChange={e => установитьНазвание(e.target.value)} />
                         <textarea className="w-full bg-slate-700 p-2 rounded text-white h-20" placeholder="Краткое описание" value={описание} onChange={e => установитьОписание(e.target.value)} />
                         
                         <p className="text-sm text-slate-400">Выберите срок аренды:</p>
                         <div className="grid grid-cols-1 gap-2">
                             {тарифы.map(т => (
                                 <button 
                                     key={т.label}
                                     onClick={() => установитьВыбранныйТариф(т)}
                                     className={`p-2 rounded flex justify-between text-sm ${выбранныйТариф === т ? 'bg-cyan-900 border border-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                                 >
                                     <span>{т.label}</span>
                                     <span className="font-bold">{т.цена}</span>
                                 </button>
                             ))}
                         </div>
                         <button onClick={() => { if(название) установитьЭтап(2); }} className="w-full bg-cyan-600 py-2 rounded text-white mt-2">Далее к оплате</button>
                    </div>
                )}

                {этап === 2 && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300">Для создания доски необходимо оплатить аренду места в блокчейне.</p>
                        <div className="bg-slate-900 p-3 rounded">
                            <p className="text-xs text-slate-500">Сумма:</p>
                            <p className="text-xl font-bold text-white">{выбранныйТариф.цена}</p>
                            <p className="text-xs text-slate-500 mt-2">Адрес смарт-контракта:</p>
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
                            <button onClick={обработатьСоздание} className="px-4 py-2 bg-green-600 rounded text-white">Подтвердить</button>
                        </div>
                    </div>
                )}
                 <button onClick={приЗакрытии} className="absolute top-2 right-2 text-slate-400">✕</button>
            </div>
        </div>
    );
};
export default CreateBoardModal;
