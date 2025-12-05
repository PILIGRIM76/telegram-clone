
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { useTranslation } from '../contexts/LanguageContext';

export const WelcomePlaceholder: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-800">
            <ShieldCheckIcon className="w-24 h-24 text-slate-600 mb-6" />
            <h1 className="text-3xl font-bold text-slate-300">{t('select_chat_title')}</h1>
            <p className="mt-2 text-lg text-slate-400 max-w-md">
                {t('select_chat_desc')}
            </p>
            <div className="mt-8 p-4 bg-slate-900/50 border border-slate-700 rounded-lg max-w-md">
                <p className="text-slate-300">
                    <strong className="text-cyan-400">{t('security_note')}</strong>
                </p>
            </div>
        </div>
    );
};
