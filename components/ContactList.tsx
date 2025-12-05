
import React, { useState, useRef, useEffect } from 'react';
import type { Личность, Контакт, Чат, Группа } from '../types';
import AddContactModal from './AddContactModal';
import CreateGroupModal from './CreateGroupModal';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { BellSlashIcon } from './icons/BellSlashIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { UsersIcon } from './icons/UsersIcon';
import { StoreIcon } from './icons/StoreIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';

interface ПропсыContactList {
  личность: Личность;
  контакты: Контакт[];
  группы: Группа[];
  приДобавленииКонтакта: (имя: string, uid: string) => void;
  выбранныйЧатId: string | null;
  приВыбореЧата: (id: string) => void;
  чаты: Record<string, Чат>;
  приОткрытииПрофиля: () => void;
  приБезмолвииЧата: (контактId: string, срок: number | 'навсегда' | null) => void;
  приАрхивацииЧата: (контактId: string, архивировать: boolean) => void;
  приСозданииГруппы: (название: string, тип: 'публичная' | 'приватная') => void;
  приОткрытииМагазина: () => void;
  приОткрытииДосок: () => void;
}

const ContactList: React.FC<ПропсыContactList> = ({
  личность,
  контакты,
  группы,
  приДобавленииКонтакта,
  выбранныйЧатId,
  приВыбореЧата,
  чаты,
  приОткрытииПрофиля,
  приБезмолвииЧата,
  приАрхивацииЧата,
  приСозданииГруппы,
  приОткрытииМагазина,
  приОткрытииДосок
}) => {
  const [модалКонтактаОткрыт, установитьМодалКонтактаОткрыт] = useState(false);
  const [модалГруппыОткрыт, установитьМодалГруппыОткрыт] = useState(false);
  const [скопировано, установитьСкопировано] = useState(false);
  const [контекстноеМеню, установитьКонтекстноеМеню] = useState<{ x: number, y: number, контакт: Контакт } | null>(null);
  const [показыватьАрхив, установитьПоказыватьАрхив] = useState(false);
  
  const менюRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const обработчикКлика = (e: MouseEvent) => {
      if (менюRef.current && !менюRef.current.contains(e.target as Node)) {
        установитьКонтекстноеМеню(null);
      }
    };
    document.addEventListener('mousedown', обработчикКлика);
    return () => document.removeEventListener('mousedown', обработчикКлика);
  }, []);

  const обработатьКонтекстноеМеню = (e: React.MouseEvent, контакт: Контакт) => {
    e.preventDefault();
    установитьКонтекстноеМеню({ x: e.clientX, y: e.clientY, контакт });
  };
  
  const установитьБезмолвие = (длительность: number | 'навсегда' | null) => {
    if (контекстноеМеню) {
      const контактId = контекстноеМеню.контакт.id;
      let срок: number | 'навсегда' | null = null;
      if (длительность) {
        срок = длительность === 'навсегда' ? 'навсегда' : Date.now() + длительность;
      }
      приБезмолвииЧата(контактId, срок);
      установитьКонтекстноеМеню(null);
    }
  };

  const переключитьАрхив = (контактId: string, вАрхив: boolean) => {
      приАрхивацииЧата(контактId, вАрхив);
      установитьКонтекстноеМеню(null);
  }

  const обработатьКопированиеUid = () => {
    navigator.clipboard.writeText(личность.uid);
    установитьСкопировано(true);
    setTimeout(() => установитьСкопировано(false), 2000);
  };

  // Фильтрация списков
  const активныеКонтакты = контакты.filter(к => !к.архивирован && к.uid !== 'system');
  const архивированныеКонтакты = контакты.filter(к => к.архивирован);
  const системныйЧат = контакты.find(к => к.uid === 'system');

  const отображаемыеКонтакты = показыватьАрхив ? архивированныеКонтакты : активныеКонтакты;

  return (
    <>
      <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-700 w-full md:w-80 lg:w-96 flex-shrink-0">
        {/* Заголовок */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div className="flex items-center space-x-2">
            {показыватьАрхив && (
                <button onClick={() => установитьПоказыватьАрхив(false)} className="mr-2 text-slate-400 hover:text-white">
                    ←
                </button>
            )}
            <h2 className="text-xl font-bold text-white">{показыватьАрхив ? 'Архив' : 'Чаты'}</h2>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => установитьМодалГруппыОткрыт(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title="Создать группу">
                <UsersIcon className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={() => установитьМодалКонтактаОткрыт(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title="Добавить контакт">
              <UserPlusIcon className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={приОткрытииПрофиля} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title="Настройки">
                <SettingsIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Системный чат (всегда сверху, если не в архиве) */}
            {!показыватьАрхив && системныйЧат && (
                 <button
                 onClick={() => приВыбореЧата(системныйЧат.id)}
                 className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 border-b border-slate-800 ${выбранныйЧатId === системныйЧат.id ? 'bg-cyan-900/40' : ''}`}
               >
                 <div className="w-12 h-12 bg-red-900/50 rounded-full flex-shrink-0 flex items-center justify-center">
                   <BellSlashIcon className="w-6 h-6 text-red-400" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="font-semibold text-red-300">Системные Уведомления</p>
                   <p className="text-sm text-slate-500 truncate">Важные сообщения от платформы</p>
                 </div>
               </button>
            )}

            {/* Папка Архив */}
            {!показыватьАрхив && архивированныеКонтакты.length > 0 && (
                <button 
                    onClick={() => установитьПоказыватьАрхив(true)}
                    className="w-full text-left p-3 flex items-center space-x-3 hover:bg-slate-800 border-b border-slate-800"
                >
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center">
                        <ArchiveBoxIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-slate-300">Архив</p>
                        <p className="text-sm text-slate-500">{архивированныеКонтакты.length} чатов</p>
                    </div>
                </button>
            )}

            {/* Группы (если мы не в архиве) */}
            {!показыватьАрхив && группы.map(группа => {
                const выбран = группа.id === выбранныйЧатId;
                const последнееСообщение = чаты[группа.id]?.сообщения.slice(-1)[0];
                return (
                    <button
                        key={группа.id}
                        onClick={() => приВыбореЧата(группа.id)}
                        className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 ${выбран ? 'bg-cyan-900/50' : ''}`}
                    >
                         <div className="w-12 h-12 bg-indigo-900/50 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-indigo-400">
                             <UsersIcon className="w-6 h-6" />
                         </div>
                         <div className="flex-1 overflow-hidden">
                             <div className="flex justify-between">
                                 <p className="font-semibold text-slate-200 truncate">{группа.название}</p>
                                 {группа.тип === 'приватная' && <span className="text-xs text-yellow-500">🔒</span>}
                             </div>
                             {последнееСообщение && (
                                <p className="text-sm text-slate-400 truncate">
                                    {последнееСообщение.текст.startsWith('{"') ? 'Системное сообщение' : 'Сообщение...'}
                                </p>
                             )}
                         </div>
                    </button>
                )
            })}

            {/* Контакты */}
            {отображаемыеКонтакты.length === 0 && группы.length === 0 && !системныйЧат ? (
                 <div className="p-8 text-center text-slate-500 text-sm">
                     {показыватьАрхив ? 'Архив пуст' : 'Нет активных чатов'}
                 </div>
            ) : (
                <ul>
                    {отображаемыеКонтакты.map(контакт => {
                    const последнееСообщение = чаты[контакт.id]?.сообщения.slice(-1)[0];
                    const выбран = контакт.id === выбранныйЧатId;
                    const безЗвука = контакт.безЗвукаДо === 'навсегда' || (typeof контакт.безЗвукаДо === 'number' && контакт.безЗвукаДо > Date.now());

                    return (
                        <li key={контакт.id} onContextMenu={(e) => обработатьКонтекстноеМеню(e, контакт)}>
                        <button
                            onClick={() => приВыбореЧата(контакт.id)}
                            className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 ${
                            выбран ? 'bg-cyan-900/50' : ''
                            }`}
                        >
                            <div className="w-12 h-12 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-cyan-400 relative">
                                {контакт.имя.charAt(0).toUpperCase()}
                                {контакт.проверен && (
                                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-slate-200 truncate">{контакт.имя}</p>
                                {безЗвука && <BellSlashIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                            </div>
                            {последнееСообщение && (
                                <p className="text-sm text-slate-400 truncate">
                                {последнееСообщение.idОтправителя === личность.uid ? 'Вы: ' : ''}
                                {последнееСообщение.текст.startsWith('{"') ? 'Скрытые данные...' : 'Сообщение...'}
                                </p>
                            )}
                            </div>
                        </button>
                        </li>
                    );
                    })}
                </ul>
            )}
        </div>

        {/* Футер */}
        <div className="p-3 border-t border-slate-700 bg-slate-800">
            <div className="flex justify-around mb-3">
                <button onClick={приОткрытииМагазина} className="flex flex-col items-center text-slate-400 hover:text-cyan-400 transition-colors">
                    <StoreIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Магазин</span>
                </button>
                <button onClick={приОткрытииДосок} className="flex flex-col items-center text-slate-400 hover:text-cyan-400 transition-colors">
                    <ClipboardDocumentListIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Доски</span>
                </button>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-2 flex items-center">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-cyan-400 mr-2">
                    {личность.аватар || личность.uid.substring(0,2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden mr-2">
                     <p className="text-xs font-bold text-white truncate">{личность.имяПользователя || 'Аноним'}</p>
                     <p className="text-[10px] text-cyan-500 truncate font-mono">{личность.uid}</p>
                </div>
                <button onClick={обработатьКопированиеUid} className="text-slate-500 hover:text-white">
                    {скопировано ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <ClipboardIcon className="w-5 h-5"/>}
                </button>
            </div>
        </div>
      </aside>

      {модалКонтактаОткрыт && (
        <AddContactModal
          приЗакрытии={() => установитьМодалКонтактаОткрыт(false)}
          приДобавленииКонтакта={приДобавленииКонтакта}
        />
      )}
      {модалГруппыОткрыт && (
          <CreateGroupModal 
            приЗакрытии={() => установитьМодалГруппыОткрыт(false)}
            приСоздании={приСозданииГруппы}
          />
      )}

      {контекстноеМеню && (
         <div
            ref={менюRef}
            className="fixed z-50 bg-slate-700 rounded-md shadow-xl py-1 w-52 text-sm border border-slate-600"
            style={{ top: контекстноеМеню.y, left: контекстноеМеню.x }}
         >
            <div className="px-3 py-2 font-bold truncate text-white border-b border-slate-600">{контекстноеМеню.контакт.имя}</div>
            
            <button onClick={() => переключитьАрхив(контекстноеМеню.контакт.id, !контекстноеМеню.контакт.архивирован)} className="w-full text-left px-3 py-2 hover:bg-slate-600 text-slate-200 flex items-center">
                <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                {контекстноеМеню.контакт.архивирован ? 'Вернуть из архива' : 'Архивировать'}
            </button>
            
            <div className="border-t border-slate-600 my-1"></div>
            
            {контекстноеМеню.контакт.безЗвукаДо ? (
              <button onClick={() => установитьБезмолвие(null)} className="w-full text-left px-3 py-2 hover:bg-slate-600 text-slate-200">Включить звук</button>
            ) : (
              <>
                <div className="px-3 py-1 text-xs text-slate-400 uppercase">Отключить уведомления</div>
                <button onClick={() => установитьБезмолвие(3600 * 1000)} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">На 1 час</button>
                <button onClick={() => установитьБезмолвие(8 * 3600 * 1000)} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">На 8 часов</button>
                <button onClick={() => установитьБезмолвие('навсегда')} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">Навсегда</button>
              </>
            )}
         </div>
      )}
    </>
  );
};

export default ContactList;
