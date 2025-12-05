
import React, { useState } from 'react';

interface Пропсы {
    цена: number;
    адрес: string;
    приЗакрытии: () => void;
    приУспехе: (txid: string) => void;
}

const AnnouncementPaymentModal: React.FC<Пропсы> = ({ цена, адрес, приЗакрытии, приУспехе }) => {
    const [txid, установитьTxid] = useState('');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-2">Оплата размещения</h3>
                <p className="text-sm text-slate-300 mb-4">Цена: <span className="font-bold text-cyan-400">{цена} USDT</span></p>

                <div className="bg-slate-900 p-3 rounded mb-4">
                    <p className="text-xs text-slate-500 mb-1">Адрес:</p>
                    <p className="text-xs text-cyan-400 font-mono break-all">{адрес}</p>
                </div>

                <input 
                    value={txid}
                    onChange={e => установитьTxid(e.target.value)}
                    placeholder="Вставьте TXID..."
                    className="w-full bg-slate-700 p-2 rounded text-white mb-4"
                />

                <div className="flex justify-end space-x-2">
                    <button onClick={приЗакрытии} className="px-4 py-2 bg-slate-600 rounded text-white">Отмена</button>
                    <button onClick={() => { if(txid) приУспехе(txid); }} className="px-4 py-2 bg-green-600 rounded text-white">Подтвердить</button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementPaymentModal;
