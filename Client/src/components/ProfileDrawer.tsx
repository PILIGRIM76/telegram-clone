
import React, { useState } from 'react';
import type { Личность } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { PencilIcon } from './icons/PencilIcon';

interface ПропсыProfileDrawer {
  личность: Личность;
  приЗакрытии: () => void;
  глобальноеБезмолвиеДо: number | 'навсегда' | null;
  установитьГлобальноеБезмолвиеДо: (срок: number | 'навсегда' | null) => void;
  приСбросе: () => void;
  приОбновленииПрофиля: (имя: string, аватар: string) => void;
  тема: 'dark' | 'light';
  установитьТему: (тема: 'dark' | 'light') => void;
}

const ProfileDrawer: React.FC<ПропсыProfileDrawer> = ({
  личность,
  приЗакрытии,
  глобальноеБезмолвиеДо,
  установитьГлобальноеБезмолвиеДо,
  приСбросе,
  приОбновленииПрофиля,
  тема,
  установитьТему
}) => {
  const [активнаяВкладка, установитьАктивнуюВкладку] = useState('профиль');
  const [скопировано, установитьСкопировано] = useState(false);
  const [имя, установитьИмя] = useState(личность.имяПользователя || '');

  const обработатьКопирование = (текст: string) => {
    navigator.clipboard.writeText(текст);
    установитьСкопировано(true);
    setTimeout(() => установитьСкопировано(false), 2000);
  };

  const установитьБезмолвие = (длительность: number | 'навсегда' | null) => {
    let срок: number | 'навсегда' | null = null;
    if (длительность) {
      срок = длительность === 'навсегда' ? 'навсегда' : Date.now() + длительность;
    }
    установитьГлобальноеБезмолвиеДо(срок);
  };

  const сохранитьПрофиль = () => {
    приОбновленииПрофиля(имя, личность.аватар || '');
    alert('Профиль обновлен');
  }

  const сейчас = Date.now();
  const глобальноБезЗвука = глобальноеБезмолвиеДо === 'навсегда' || (typeof глобальноеБезмолвиеДо === 'number' && глобальноеБезмолвиеДо > сейчас);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={приЗакрытии}></div>
      <div className="fixed top-0 left-0 right-0 bg-slate-800 shadow-2xl rounded-b-2xl z-50 animate-slide-down border-b border-slate-700">
        <div className="p-4 max-w-md mx-auto">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-4xl font-bold text-cyan-400 relative">
              {личность.аватар || личность.uid.charAt(4).toUpperCase()}
              <label htmlFor="avatar-input" className="absolute bottom-0 right-0 bg-cyan-600 p-1 rounded-full cursor-pointer">
                <PencilIcon className="w-4 h-4 text-white" />
              </label>
              <input type="file" id="avatar-input" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    // TODO: Implement avatar upload logic here
                    alert('Avatar upload is not implemented yet');
                  };
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </div>

          <div className="flex justify-between border-b border-slate-700 mb-4 overflow-x-auto">
            <button onClick={() => установитьАктивнуюВкладку('профиль')} className={`px-3 py-2 text-xs font-medium ${активнаяВкладка === 'профиль' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
              <UserCircleIcon className="w-4 h-4 mx-auto mb-1" /> Профиль
            </button>
            <button onClick={() => установитьАктивнуюВкладку('вид')} className={`px-3 py-2 text-xs font-medium ${активнаяВкладка === 'вид' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
              <PaintBrushIcon className="w-4 h-4 mx-auto mb-1" /> Вид
            </button>
            <button onClick={() => установитьАктивнуюВкладку('уведомления')} className={`px-3 py-2 text-xs font-medium ${активнаяВкладка === 'уведомления' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
              <BellIcon className="w-4 h-4 mx-auto mb-1" /> Уведомления
            </button>
            <button onClick={() => установитьАктивнуюВкладку('безопасность')} className={`px-3 py-2 text-xs font-medium ${активнаяВкладка === 'безопасность' ? 'border-b-2 border-cyan-500 text-cyan-400' : 'text-slate-400'}`}>
              <ExclamationTriangleIcon className="w-4 h-4 mx-auto mb-1" /> Безопасность
            </button>
          </div>

          {активнаяВкладка === 'профиль' && (
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-slate-500">Ваше имя (видно вам)</label>
                <div className="flex space-x-2 mt-1">
                  <input className="flex-1 bg-slate-700 p-2 rounded text-white" value={имя} onChange={e => установитьИмя(e.target.value)} placeholder="Аноним" />
                  <button onClick={сохранитьПрофиль} className="bg-cyan-600 px-3 rounded text-white">Сохранить</button>
                </div>
              </div>
              <div>
                <label className="text-slate-500">Ваш UID</label>
                <div className="relative flex items-center bg-slate-700 p-2 rounded-md mt-1">
                  <p className="text-xs text-cyan-300 truncate font-mono flex-1 pr-10">{личность.uid}</p>
                  <button onClick={() => обработатьКопирование(личность.uid)} className="absolute right-1 p-2 rounded-md hover:bg-slate-600">
                    {скопировано ? <CheckCircleIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {активнаяВкладка === 'вид' && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm text-center">Выберите тему оформления</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => установитьТему('light')} className={`p-4 rounded border flex flex-col items-center ${тема === 'light' ? 'bg-slate-200 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                  <SunIcon className={`w-8 h-8 mb-2 ${тема === 'light' ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span className={тема === 'light' ? 'text-slate-900' : 'text-slate-300'}>Светлая</span>
                </button>
                <button onClick={() => установитьТему('dark')} className={`p-4 rounded border flex flex-col items-center ${тема === 'dark' ? 'bg-slate-900 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}>
                  <MoonIcon className={`w-8 h-8 mb-2 ${тема === 'dark' ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="text-white">Темная</span>
                </button>
              </div>
            </div>
          )}

          {активнаяВкладка === 'уведомления' && (
            <div className="space-y-3 text-sm">
              {глобальноБезЗвука ? (
                <div className="text-center p-3 bg-slate-700 rounded-md">
                  <p className="text-yellow-300">Уведомления отключены</p>
                  <button onClick={() => установитьБезмолвие(null)} className="mt-2 text-cyan-400 font-semibold hover:underline">Включить</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => установитьБезмолвие(3600 * 1000)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">1 час</button>
                  <button onClick={() => установитьБезмолвие(8 * 3600 * 1000)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">8 часов</button>
                  <button onClick={() => установитьБезмолвие('навсегда')} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-slate-200">Навсегда</button>
                </div>
              )}
            </div>
          )}

          {активнаяВкладка === 'безопасность' && (
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-md text-yellow-200">
                Храните ключ восстановления в безопасности.
              </div>
              <div className="relative flex items-center bg-slate-700 p-2 rounded-md">
                <p className="text-xs text-red-400 truncate font-mono flex-1">********************</p>
                <button onClick={() => обработатьКопирование(личность.приватныйКлюч)} className="ml-2">
                  <ClipboardIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <button onClick={приСбросе} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded font-bold">
                Сбросить приложение (Удалить все)
              </button>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default ProfileDrawer;
