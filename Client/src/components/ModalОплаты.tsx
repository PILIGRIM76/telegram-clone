
import React, { useState } from 'react';
import type { Товар, Магазин } from '../types';
import { QrCodeIcon } from './icons/QrCodeIcon';

interface Пропсы {
    товар: Товар;
    магазин: Магазин;
    приЗакрытии: () => void;
    приПодтверждении: (txid: string) => void;
}

const ModalОплаты: React.FC<Пропсы> = ({ товар, магазин, приЗакрытии, приПодтверждении }) => {
    const [txid, установитьTxid] = useState('');

    const адрес = магазин.адресОплаты || магазин.личныйКошелекПродавца || 'Не указан';

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-cyan-500/50 shadow-2xl shadow-cyan-900/20">
                <h3 className="text-xl font-bold text-white mb-2">Оплата заказа</h3>
                <p className="text-slate-300 mb-4">{товар.название} — <span className="text-cyan-400 font-bold">{товар.цена} {товар.валюта}</span></p>

                <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
                     {/* Заглушка для QR, в реальном проекте использовать qrcode.react */}
                     <QrCodeIcon className="w-32 h-32 text-black" />
                </div>

                <div className="bg-slate-900 p-3 rounded mb-4">
                    <p className="text-xs text-slate-500 mb-1">Адрес для оплаты (Смарт-контракт):</p>
                    <p className="text-xs text-green-400 font-mono break-all">{адрес}</p>
                </div>

                <input 
                    value={txid}
                    onChange={e => установитьTxid(e.target.value)}
                    placeholder="Введите TXID транзакции..."
                    className="w-full bg-slate-700 p-3 rounded text-white mb-4 border border-slate-600 focus:border-cyan-500 outline-none"
                />

                <button 
                    onClick={() => { if(txid) приПодтверждении(txid); }}
                    className="w-full bg-gradient-to-r from-green-600 to-green-500 py-3 rounded text-white font-bold shadow-lg"
                >
                    Я оплатил
                </button>
                <button onClick={приЗакрытии} className="w-full mt-2 py-2 text-slate-400 hover:text-white">Отмена</button>
            </div>
        </div>
    );
};

export default ModalОплаты;
