
import React, { useState } from 'react';
import { apiService } from '../services/apiService';

interface ExtendBoardModalProps {
    boardId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const tariffs = [
    { label: '1 Day', price: '5 USDT', duration: 86400000 },
    { label: '1 Week', price: '25 USDT', duration: 604800000 },
    { label: '1 Month', price: '80 USDT', duration: 2592000000 },
];

const ExtendBoardModal: React.FC<ExtendBoardModalProps> = ({ boardId, onClose, onSuccess }) => {
    const [selectedTariff, setSelectedTariff] = useState(tariffs[0]);
    const [txid, setTxid] = useState('');
    const [step, setStep] = useState(1); // 1: Selection, 2: Payment

    const handleExtend = async () => {
        if (!txid) return alert('Enter TXID');
        try {
            await apiService.updateBoard(boardId, { 
                leaseDuration: selectedTariff.duration,
                extensionTxid: txid
            });
            alert('Lease extended!');
            onSuccess();
            onClose();
        } catch (e) {
            alert('Extension error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">Extend Lease</h3>

                {step === 1 && (
                    <div className="space-y-2">
                        {tariffs.map(t => (
                            <button 
                                key={t.label}
                                onClick={() => setSelectedTariff(t)}
                                className={`w-full p-3 rounded flex justify-between ${selectedTariff === t ? 'bg-cyan-900 border border-cyan-500' : 'bg-slate-700'}`}
                            >
                                <span className="text-white">{t.label}</span>
                                <span className="text-cyan-400 font-bold">{t.price}</span>
                            </button>
                        ))}
                        <button onClick={() => setStep(2)} className="w-full bg-cyan-600 py-2 rounded text-white mt-4">Next</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 p-3 rounded">
                            <p className="text-xs text-slate-400">Smart Contract Address:</p>
                            <p className="text-xs text-cyan-400 font-mono break-all">0xSmartContractAddressHere...</p>
                        </div>
                        <input 
                            value={txid}
                            onChange={e => setTxid(e.target.value)}
                            placeholder="Paste Transaction ID (TXID)"
                            className="w-full bg-slate-700 p-2 rounded text-white text-sm"
                        />
                         <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-600 rounded text-white">Back</button>
                            <button onClick={handleExtend} className="px-4 py-2 bg-green-600 rounded text-white">Confirm</button>
                        </div>
                    </div>
                )}
                 <button onClick={onClose} className="absolute top-2 right-2 text-slate-400">✕</button>
            </div>
        </div>
    );
};

export default ExtendBoardModal;
