import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

export const WelcomePlaceholder: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-800">
            <ShieldCheckIcon className="w-24 h-24 text-slate-600 mb-6" />
            <h1 className="text-3xl font-bold text-slate-300">Добро пожаловать в ШифроСвязь</h1>
            <p className="mt-2 text-lg text-slate-400 max-w-md">
                Ваш безопасный и анонимный мессенджер. Выберите контакт, чтобы начать беседу, или добавьте новый, используя его безопасный UID.
            </p>
            <div className="mt-8 p-4 bg-slate-900/50 border border-slate-700 rounded-lg max-w-md">
                <p className="text-slate-300">
                    <strong className="text-cyan-400">Примечание о безопасности:</strong> Все сообщения защищены сквозным шифрованием. Никто за пределами этого чата, даже ШифроСвязь, не может их прочитать.
                </p>
            </div>
        </div>
    );
};
