
import React, { useState } from 'react';
import type { Gift } from '../types';
import { GiftIcon } from './icons/GiftIcon';

interface GiftSelectorModalProps {
    onClose: () => void;
    onSelect: (gift: Gift) => void;
}

const GIFTS: Gift[] = [
    // Free
    { id: 'g1', name: 'Coffee', emoji: '☕', type: 'free' },
    { id: 'g2', name: 'Heart', emoji: '❤️', type: 'free' },
    { id: 'g3', name: 'High Five', emoji: '✋', type: 'free' },
    { id: 'g4', name: 'Fire', emoji: '🔥', type: 'free' },
    { id: 'g5', name: 'Cake', emoji: '🎂', type: 'free' },
    { id: 'g6', name: 'Rose', emoji: '🌹', type: 'free' },
    
    // Paid
    { id: 'p1', name: 'Diamond', emoji: '💎', type: 'premium', price: 10, currency: 'USDT' },
    { id: 'p2', name: 'Crown', emoji: '👑', type: 'premium', price: 50, currency: 'USDT' },
    { id: 'p3', name: 'Sports Car', emoji: '🏎️', type: 'premium', price: 100, currency: 'USDT' },
    { id: 'p4', name: 'Rocket', emoji: '🚀', type: 'premium', price: 500, currency: 'USDT' },
    { id: 'p5', name: 'Castle', emoji: '🏰', type: 'premium', price: 1000, currency: 'USDT' },
    { id: 'p6', name: 'Island', emoji: '🏝️', type: 'premium', price: 5000, currency: 'USDT' },
];

const GiftSelectorModal: React.FC<GiftSelectorModalProps> = ({ onClose, onSelect }) => {
    const [tab, setTab] = useState<'free' | 'premium'>('free');

    const filteredGifts = GIFTS.filter(g => g.type === tab);

    const handleSelect = (gift: Gift) => {
        if (gift.type === 'premium') {
            if (confirm(`Send gift "${gift.name}" for ${gift.price} ${gift.currency}? (Simulated charge)`)) {
                onSelect(gift);
                onClose();
            }
        } else {
            onSelect(gift);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-4 flex items-center justify-between border-b border-slate-700">
                    <h3 className="text-white font-bold flex items-center">
                        <GiftIcon className="w-5 h-5 mr-2 text-cyan-400" />
                        Send Gift
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="flex border-b border-slate-700">
                    <button 
                        onClick={() => setTab('free')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'free' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800' : 'text-slate-400 bg-slate-800/50'}`}
                    >
                        Free
                    </button>
                    <button 
                        onClick={() => setTab('premium')}
                        className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === 'premium' ? 'text-yellow-400 border-b-2 border-yellow-500 bg-slate-800' : 'text-slate-400 bg-slate-800/50'}`}
                    >
                        Premium
                    </button>
                </div>

                <div className="p-4 grid grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {filteredGifts.map(gift => (
                        <button 
                            key={gift.id}
                            onClick={() => handleSelect(gift)}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg hover:bg-slate-700 transition-all transform hover:scale-105 border ${gift.type === 'premium' ? 'border-yellow-900/30 bg-yellow-900/10' : 'border-slate-700 bg-slate-700/30'}`}
                        >
                            <span className="text-4xl mb-2">{gift.emoji}</span>
                            <span className="text-xs text-white font-medium">{gift.name}</span>
                            {gift.type === 'premium' && (
                                <span className="text-[10px] text-yellow-400 mt-1 font-bold">{gift.price} {gift.currency}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GiftSelectorModal;
