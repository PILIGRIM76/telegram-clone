
import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { useTranslation } from '../contexts/LanguageContext';

interface CreateIdentityProps {
  onCreateIdentity: () => void;
}

const CreateIdentity: React.FC<CreateIdentityProps> = ({ onCreateIdentity }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="max-w-md w-full p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg text-center">
        <div className="flex justify-center">
          <ShieldCheckIcon className="w-16 h-16 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">{t('welcome_title')}</h1>
        <p className="text-slate-400">
          {t('welcome_desc')}
        </p>
        <div className="p-4 bg-yellow-900/50 border border-yellow-600 rounded-md text-yellow-200">
            {t('backup_warning')}
        </div>
        <button
          onClick={onCreateIdentity}
          className="w-full px-4 py-3 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-colors duration-200"
        >
          {t('create_identity_btn')}
        </button>
      </div>
    </div>
  );
};

export default CreateIdentity;
