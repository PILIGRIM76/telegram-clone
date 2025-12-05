
import React, { useState } from 'react';

interface Пропсы {
  приЗакрытии: () => void;
  приСоздании: (название: string, тип: 'публичная' | 'приватная') => void;
}

const CreateGroupModal: React.FC<Пропсы> = ({ приЗакрытии, приСоздании }) => {
  const [название, установитьНазвание] = useState('');
  const [тип, установитьТип] = useState<'публичная' | 'приватная'>('публичная');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={приЗакрытии}>
      <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Создать группу</h2>
        <input 
            type="text" 
            placeholder="Название группы" 
            value={название} 
            onChange={e => установитьНазвание(e.target.value)}
            className="w-full bg-slate-700 p-2 rounded mb-4 text-white"
        />
        <div className="mb-4">
            <label className="flex items-center space-x-2 text-slate-300">
                <input type="radio" checked={тип === 'публичная'} onChange={() => установитьТип('публичная')} />
                <span>Публичная</span>
            </label>
            <label className="flex items-center space-x-2 text-slate-300 mt-2">
                <input type="radio" checked={тип === 'приватная'} onChange={() => установитьТип('приватная')} />
                <span>Приватная (доступ по ссылке)</span>
            </label>
        </div>
        <div className="flex justify-end space-x-2">
            <button onClick={приЗакрытии} className="px-4 py-2 bg-slate-600 rounded text-white">Отмена</button>
            <button onClick={() => { приСоздании(название, тип); приЗакрытии(); }} className="px-4 py-2 bg-cyan-600 rounded text-white">Создать</button>
        </div>
      </div>
    </div>
  );
};
export default CreateGroupModal;
