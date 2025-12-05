
import React from 'react';

interface MessageTimerSelectionProps {
    currentValue: number | undefined;
    onSelect: (seconds: number | undefined) => void;
}

const options = [
    { label: 'Off', value: undefined },
    { label: '5 seconds', value: 5 },
    { label: '30 seconds', value: 30 },
    { label: '1 hour', value: 3600 },
    { label: '1 day', value: 86400 },
    { label: '1 week', value: 604800 },
];

const MessageTimerSelection: React.FC<MessageTimerSelectionProps> = ({ currentValue, onSelect }) => {
    return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden w-48">
            <div className="p-2 bg-slate-900 text-xs text-slate-400 font-bold border-b border-slate-700">
                Disappearing Messages
            </div>
            {options.map((option) => (
                <button
                    key={String(option.value)}
                    onClick={() => onSelect(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        currentValue === option.value ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'
                    }`}
                >
                    {option.label}
                    {currentValue === option.value && ' ✓'}
                </button>
            ))}
        </div>
    );
};

export default MessageTimerSelection;
