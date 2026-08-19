
import React, { useState } from 'react';

interface AnnouncementPaymentModalProps {
    price: number;
    address: string;
    onClose: () => void;
    onSuccess: (txid: string) => void;
}

const AnnouncementPaymentModal: React.FC<AnnouncementPaymentModalProps> = ({ price, address, onClose, onSuccess }) => {
    const [txid, setTxid] = useState('');

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-2">Ad Placement Payment</h3>
                <p className="text-sm text-slate-300 mb-4">Price: <span className="font-bold text-cyan-400">{price} USDT</span></p>

                <div className="bg-slate-900 p-3 rounded mb-4">
                    <p className="text-xs text-slate-500 mb-1">Address:</p>
                    <p className="text-xs text-cyan-400 font-mono break-all">{address}</p>
                </div>

                <input 
                    value={txid}
                    onChange={e => setTxid(e.target.value)}
                    placeholder="Paste TXID..."
                    className="w-full bg-slate-700 p-2 rounded text-white mb-4"
                />

                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded text-white">Cancel</button>
                    <button onClick={() => { if(txid) onSuccess(txid); }} className="px-4 py-2 bg-green-600 rounded text-white">Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default AnnouncementPaymentModal;
