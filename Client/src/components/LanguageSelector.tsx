
import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';

const LanguageSelector: React.FC = () => {
  const { setLanguage } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="max-w-md w-full p-8 space-y-8 bg-slate-800 rounded-lg shadow-lg text-center border border-slate-700">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Select Language</h1>
            <p className="text-slate-400">Выберите язык интерфейса</p>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setLanguage('en')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-700 hover:bg-cyan-900/30 border border-slate-600 hover:border-cyan-500 rounded-lg transition-all group"
            >
              <div className="flex items-center">
                  <span className="text-2xl mr-4">🇬🇧</span>
                  <div className="text-left">
                      <p className="font-bold text-white group-hover:text-cyan-400">English</p>
                      <p className="text-xs text-slate-400">International</p>
                  </div>
              </div>
              <span className="text-slate-500 group-hover:text-cyan-400">→</span>
            </button>

            <button
              onClick={() => setLanguage('ru')}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-700 hover:bg-cyan-900/30 border border-slate-600 hover:border-cyan-500 rounded-lg transition-all group"
            >
              <div className="flex items-center">
                  <span className="text-2xl mr-4">🇷🇺</span>
                  <div className="text-left">
                      <p className="font-bold text-white group-hover:text-cyan-400">Русский</p>
                      <p className="text-xs text-slate-400">Russian</p>
                  </div>
              </div>
              <span className="text-slate-500 group-hover:text-cyan-400">→</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;
