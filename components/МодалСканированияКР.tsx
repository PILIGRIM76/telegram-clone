
import React, { useState } from 'react';

interface Пропсы {
    приЗакрытии: () => void;
    приУспехе: (uid: string) => void;
}

const МодалСканированияКР: React.FC<Пропсы> = ({ приЗакрытии, приУспехе }) => {
    // В реальном приложении здесь используется jsQR и <video>
    const [mockInput, setMockInput] = useState('');

    const handleSimulate = () => {
        if(mockInput) приУспехе(mockInput);
    };

    return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[90]">
            <h3 className="text-white text-xl mb-4">Сканирование QR...</h3>
            <div className="w-64 h-64 border-2 border-cyan-500 rounded-lg relative overflow-hidden bg-slate-800 flex items-center justify-center">
                 <div className="absolute inset-0 bg-cyan-500/10 animate-pulse"></div>
                 <p className="text-slate-400 text-center px-4">Камера активна (Симуляция)</p>
            </div>
            
            <div className="mt-8 w-64">
                <p className="text-slate-500 text-xs mb-2">Для теста введите UID собеседника:</p>
                <input 
                    className="w-full p-2 rounded bg-slate-800 text-white mb-2" 
                    value={mockInput} 
                    onChange={e => setMockInput(e.target.value)}
                />
                <button onClick={handleSimulate} className="w-full bg-cyan-600 py-2 rounded text-white">Симулировать скан</button>
            </div>
            
            <button onClick={приЗакрытии} className="mt-8 text-slate-400">Отмена</button>
        </div>
    );
};

export default МодалСканированияКР;
