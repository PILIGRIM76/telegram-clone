
import React, { useState } from 'react';

interface CreateBoardModalProps {
    onClose: () => void;
    onCreate: (data: any) => void;
}

const tariffs = [
    { label: '1 Day', price: '5 USDT', duration: 86400000 },
    { label: '1 Week', price: '25 USDT', duration: 604800000 },
    { label: '1 Month', price: '80 USDT', duration: 2592000000 },
];

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedTariff, setSelectedTariff] = useState(tariffs[0]);
    const [txid, setTxid] = useState('');
    const [step, setStep] = useState(1); // 1: Details, 2: Payment

    const handleCreate = () => {
        if (!txid) return alert('Enter Payment TXID');
        onCreate({
            name,
            description,
            leaseDuration: selectedTariff.duration,
            tariff: parseFloat(selectedTariff.price),
            txid
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">New Notice Board</h3>

                {step === 1 && (
                    <div className="space-y-3">
                         <input className="w-full bg-slate-700 p-2 rounded text-white" placeholder="Board Name" value={name} onChange={e => setName(e.target.value)} />
                         <textarea className="w-full bg-slate-700 p-2 rounded text-white h-20" placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
                         
                         <p className="text-sm text-slate-400">Select lease term:</p>
                         <div className="grid grid-cols-1 gap-2">
                             {tariffs.map(t => (
                                 <button 
                                     key={t.label}
                                     onClick={() => setSelectedTariff(t)}
                                     className={`p-2 rounded flex justify-between text-sm ${selectedTariff === t ? 'bg-cyan-900 border border-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                                 >
                                     <span>{t.label}</span>
                                     <span className="font-bold">{t.price}</span>
                                 </button>
                             ))}
                         </div>
                         <button onClick={() => { if(name) setStep(2); }} className="w-full bg-cyan-600 py-2 rounded text-white mt-2">Next to Payment</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-300">To create a board, you need to pay for blockchain space lease.</p>
                        <div className="bg-slate-900 p-3 rounded">
                            <p className="text-xs text-slate-500">Amount:</p>
                            <p className="text-xl font-bold text-white">{selectedTariff.price}</p>
                            <p className="text-xs text-slate-500 mt-2">Smart Contract Address:</p>
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
                            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 rounded text-white">Confirm</button>
                        </div>
                    </div>
                )}
                 <button onClick={onClose} className="absolute top-2 right-2 text-slate-400">✕</button>
            </div>
        </div>
    );
};
export default CreateBoardModal;
