
import React from 'react';

interface Пропсы {
    текущееЗначение: number | undefined;
    приВыборе: (секунды: number | undefined) => void;
}

const варианты = [
    { label: 'Выкл', value: undefined },
    { label: '5 секунд', value: 5 },
    { label: '30 секунд', value: 30 },
    { label: '1 час', value: 3600 },
    { label: '1 день', value: 86400 },
    { label: '1 неделя', value: 604800 },
];

const ТаймерСообщенияВыбор: React.FC<Пропсы> = ({ текущееЗначение, приВыборе }) => {
    return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden w-48">
            <div className="p-2 bg-slate-900 text-xs text-slate-400 font-bold border-b border-slate-700">
                Исчезающие сообщения
            </div>
            {варианты.map((вариант) => (
                <button
                    key={String(вариант.value)}
                    onClick={() => приВыборе(вариант.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        текущееЗначение === вариант.value ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-200'
                    }`}
                >
                    {вариант.label}
                    {текущееЗначение === вариант.value && ' ✓'}
                </button>
            ))}
        </div>
    );
};

export default ТаймерСообщенияВыбор;
