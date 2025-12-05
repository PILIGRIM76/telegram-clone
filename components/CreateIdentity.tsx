import React from 'react';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface ПропсыCreateIdentity {
  приСозданииЛичности: () => void;
}

const CreateIdentity: React.FC<ПропсыCreateIdentity> = ({ приСозданииЛичности }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="max-w-md w-full p-8 space-y-6 bg-slate-800 rounded-lg shadow-lg text-center">
        <div className="flex justify-center">
          <ShieldCheckIcon className="w-16 h-16 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Добро пожаловать в ШифроСвязь</h1>
        <p className="text-slate-400">
          ШифроСвязь — это безопасный мессенджер, который работает без номера телефона или email. Ваша личность — это уникальный криптографический ключ, хранящийся только на вашем устройстве.
        </p>
        <div className="p-4 bg-yellow-900/50 border border-yellow-600 rounded-md text-yellow-200">
            <strong>Важно:</strong> Вы несете ответственность за резервное копирование вашей личности. Если вы очистите данные браузера или потеряете доступ к этому устройству, ваша личность и контакты будут утеряны навсегда.
        </div>
        <button
          onClick={приСозданииЛичности}
          className="w-full px-4 py-3 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-colors duration-200"
        >
          Создать безопасную личность
        </button>
      </div>
    </div>
  );
};

export default CreateIdentity;
