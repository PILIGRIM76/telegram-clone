
import React, { useState } from 'react';
import type { Магазин, ДоскаОбъявлений, Товар, Объявление } from '../types';
import { сервисАПИ } from '../services/apiService';
import { ShoppingBagIcon } from './icons/ShoppingBagIcon';
import PaymentModal from './PaymentModal';
import AddAnnouncementModal from './AddAnnouncementModal';
import AnnouncementPaymentModal from './AnnouncementPaymentModal';

interface ПропсыAddContactModal {
  приЗакрытии: () => void;
  приДобавленииКонтакта: (имя: string, uid: string) => void;
}

const AddContactModal: React.FC<ПропсыAddContactModal> = ({ приЗакрытии, приДобавленииКонтакта }) => {
  const [поиск, установитьПоиск] = useState('');
  const [результат, установитьРезультат] = useState<{
      uid: string;
      публичныйКлюч: string;
      магазин?: Магазин;
      доски?: ДоскаОбъявлений[];
  } | null>(null);
  const [имяКонтакта, установитьИмяКонтакта] = useState('');
  const [ошибка, установитьОшибку] = useState('');
  const [активнаяДоска, установитьАктивнуюДоска] = useState<ДоскаОбъявлений | null>(null);

  // Состояния для покупок/публикаций
  const [выбранныйТовар, установитьВыбранныйТовар] = useState<Товар | null>(null);
  const [модалОплатыОбъявленияОткрыт, установитьМодалОплатыОбъявленияОткрыт] = useState(false);
  const [модалПубликацииОткрыт, установитьМодалПубликацииОткрыт] = useState(false);
  const [txidОбъявления, установитьTxidОбъявления] = useState<string|undefined>(undefined);

  const выполнитьПоиск = async () => {
      установитьОшибку('');
      установитьРезультат(null);
      try {
          let рез;
          if (поиск.includes('/invite/')) {
              const токен = поиск.split('/invite/').pop();
              if (токен) рез = await сервисАПИ.найтиМагазинПоПриглашению(токен);
          } else {
              рез = await сервисАПИ.найтиПользователяПоUid(поиск.trim());
          }
          установитьРезультат(рез);
          if (рез.доски && рез.доски.length > 0) установитьАктивнуюДоска(рез.доски[0]);
      } catch (e) {
          установитьОшибку('Ничего не найдено');
      }
  };

  const добавитьВКонтакты = () => {
      if (!результат || !имяКонтакта) return;
      приДобавленииКонтакта(имяКонтакта, результат.uid);
      приЗакрытии();
  };

  const заказатьТовар = (txid: string) => {
      if (!выбранныйТовар || !результат) return;
      const сообщение = {
          кому: результат.uid,
          содержимое: `Новый заказ: ${выбранныйТовар.название}`,
          payload: {
              тип: 'заказ',
              товар: выбранныйТовар,
              txid,
              статус: 'новый',
              заказId: crypto.randomUUID(),
              дата: Date.now()
          }
      };
      // Отправляем как системное сообщение через сервисАПИ, которое App.tsx перехватит или 
      // лучше добавить логику отправки заказа в App.tsx. 
      // Для упрощения, предположим, что мы добавим контакт и отправим сообщение в чат
      приДобавленииКонтакта(`Магазин ${результат.магазин?.название || 'Продавец'}`, результат.uid);
      
      // Отправка заказа происходит через WebSocket в App.tsx, здесь мы просто инициируем контакт
      // В реальном приложении здесь нужен callback в App.tsx для отправки заказа
      alert('Контакт добавлен. Пожалуйста, отправьте TXID продавцу в чат для подтверждения.');
      приЗакрытии();
  };
  
  const опубликоватьОбъявление = async (данные: { заголовок: string, содержание: string }) => {
      if (!активнаяДоска || !результат) return;
      try {
          await сервисАПИ.добавитьОбъявление(результат.uid, активнаяДоска.id, данные, txidОбъявления);
          alert('Объявление отправлено на публикацию!');
          установитьМодалПубликацииОткрыт(false);
          выполнитьПоиск(); // Обновить
      } catch (e) { alert('Ошибка публикации'); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={приЗакрытии}>
       <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="p-4 border-b border-slate-700">
               <h2 className="text-xl font-bold text-white mb-2">Поиск людей, магазинов и досок</h2>
               <div className="flex space-x-2">
                   <input 
                        value={поиск}
                        onChange={e => установитьПоиск(e.target.value)}
                        placeholder="Введите UID или ссылку-приглашение"
                        className="flex-1 bg-slate-700 p-2 rounded text-white"
                   />
                   <button onClick={выполнитьПоиск} className="bg-cyan-600 px-4 rounded text-white">Найти</button>
               </div>
               {ошибка && <p className="text-red-400 text-sm mt-2">{ошибка}</p>}
           </div>

           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {результат ? (
                   <div className="space-y-6">
                       {/* Профиль / Добавление */}
                       <div className="bg-slate-700 p-4 rounded flex justify-between items-center">
                           <div>
                               <p className="text-xs text-slate-400">UID найден</p>
                               <p className="font-mono text-cyan-300 text-sm">{результат.uid}</p>
                           </div>
                           <div className="flex space-x-2">
                               <input 
                                    placeholder="Имя для контакта" 
                                    value={имяКонтакта}
                                    onChange={e => установитьИмяКонтакта(e.target.value)}
                                    className="bg-slate-800 p-1 px-2 rounded text-white text-sm"
                               />
                               <button onClick={добавитьВКонтакты} className="bg-green-600 px-3 py-1 rounded text-white text-sm">Добавить</button>
                           </div>
                       </div>

                       {/* Магазин */}
                       {результат.магазин && (
                           <div>
                               <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                                   <ShoppingBagIcon className="w-5 h-5 mr-2 text-cyan-400" />
                                   Магазин: {результат.магазин.название}
                               </h3>
                               <p className="text-slate-300 text-sm mb-4">{результат.магазин.описание}</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {результат.магазин.товары.map(товар => (
                                       <div key={товар.id} className="bg-slate-700 p-3 rounded border border-slate-600">
                                            {товар.изображение && <img src={товар.изображение} className="w-full h-32 object-cover rounded mb-2" />}
                                            <p className="font-bold text-white">{товар.название}</p>
                                            <p className="text-cyan-400 font-bold mb-2">{товар.цена} {товар.валюта}</p>
                                            <button 
                                                onClick={() => установитьВыбранныйТовар(товар)}
                                                className="w-full bg-indigo-600 py-1.5 rounded text-white text-sm hover:bg-indigo-700"
                                            >
                                                Заказать
                                            </button>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* Доски объявлений */}
                       {результат.доски && результат.доски.length > 0 && (
                           <div className="mt-6 border-t border-slate-700 pt-4">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-lg font-bold text-white">Доски объявлений</h3>
                                   <div className="flex space-x-2">
                                       {результат.доски.map(д => (
                                           <button 
                                                key={д.id}
                                                onClick={() => установитьАктивнуюДоска(д)}
                                                className={`px-3 py-1 rounded text-xs ${активнаяДоска?.id === д.id ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                           >
                                               {д.название}
                                           </button>
                                       ))}
                                   </div>
                               </div>

                               {активнаяДоска && (
                                   <div className="bg-slate-700/30 p-4 rounded border border-slate-700">
                                       <div className="flex justify-between mb-4">
                                           <p className="text-sm text-slate-300">{активнаяДоска.описание}</p>
                                           <button 
                                                onClick={() => {
                                                    if (активнаяДоска.ценаЗаОбъявление && активнаяДоска.ценаЗаОбъявление > 0) {
                                                        установитьМодалОплатыОбъявленияОткрыт(true);
                                                    } else {
                                                        установитьМодалПубликацииОткрыт(true);
                                                    }
                                                }}
                                                className="bg-cyan-600 px-3 py-1 rounded text-white text-sm"
                                           >
                                               + Объявление {активнаяДоска.ценаЗаОбъявление ? `(${активнаяДоска.ценаЗаОбъявление} USDT)` : ''}
                                           </button>
                                       </div>
                                       <div className="space-y-3">
                                           {активнаяДоска.объявления.map(об => (
                                               <div key={об.id} className="bg-slate-800 p-3 rounded border-l-2 border-cyan-500">
                                                   <h4 className="font-bold text-white text-sm">{об.заголовок}</h4>
                                                   <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap">{об.содержание}</p>
                                                   <p className="text-slate-500 text-[10px] mt-2 text-right">{new Date(об.датаПубликации).toLocaleDateString()}</p>
                                               </div>
                                           ))}
                                            {активнаяДоска.объявления.length === 0 && <p className="text-center text-slate-500 text-sm">Пока нет объявлений</p>}
                                       </div>
                                   </div>
                               )}
                           </div>
                       )}

                   </div>
               ) : (
                   <div className="text-center text-slate-500 mt-20">
                       Введите UID или ссылку для поиска
                   </div>
               )}
           </div>
       </div>

       {выбранныйТовар && результат?.магазин && (
           <PaymentModal 
                товар={выбранныйТовар}
                магазин={результат.магазин}
                приЗакрытии={() => установитьВыбранныйТовар(null)}
                приПодтверждении={заказатьТовар}
           />
       )}

       {модалОплатыОбъявленияОткрыт && активнаяДоска && (
           <AnnouncementPaymentModal
                цена={активнаяДоска.ценаЗаОбъявление || 0}
                адрес={активнаяДоска.адресСмартКонтрактаДоски || ''}
                приЗакрытии={() => установитьМодалОплатыОбъявленияОткрыт(false)}
                приУспехе={(txid) => {
                    установитьTxidОбъявления(txid);
                    установитьМодалОплатыОбъявленияОткрыт(false);
                    установитьМодалПубликацииОткрыт(true);
                }}
           />
       )}

       {модалПубликацииОткрыт && (
           <AddAnnouncementModal
                объявление={null}
                приЗакрытии={() => установитьМодалПубликацииОткрыт(false)}
                приСохранении={опубликоватьОбъявление}
           />
       )}
    </div>
  );
};

export default AddContactModal;
