
import React, { useState } from 'react';
import type { ДоскаОбъявлений, Объявление, Личность } from '../types';
import { сервисАПИ } from '../services/apiService';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import AddAnnouncementModal from './AddAnnouncementModal';
import ExtendBoardModal from './ExtendBoardModal';

interface Пропсы {
    доска: ДоскаОбъявлений;
    приЗакрытии: () => void;
    приОбновлении: () => void; // Вызывается после продления или изменения
}

const BoardManagementModal: React.FC<Пропсы> = ({ доска, приЗакрытии, приОбновлении }) => {
    const [вкладка, установитьВкладку] = useState<'объявления'|'настройки'>('объявления');
    const [модалОбъявленияОткрыт, установитьМодалОбъявленияОткрыт] = useState(false);
    const [модалПродленияОткрыт, установитьМодалПродленияОткрыт] = useState(false);
    const [редактируемое, установитьРедактируемое] = useState<Объявление|null>(null);

    const [цена, установитьЦену] = useState(доска.ценаЗаОбъявление?.toString() || '0');
    const [кошелек, установитьКошелек] = useState(доска.кошелекВладельцаДоски || '');

    const сохранитьНастройки = async () => {
        try {
            await сервисАПИ.обновитьДоску(доска.id, {
                ценаЗаОбъявление: parseFloat(цена),
                кошелекВладельцаДоски: кошелек
            });
            alert('Настройки сохранены');
            приОбновлении();
        } catch (e) { alert('Ошибка'); }
    };

    const удалитьОбъявление = async (id: string) => {
        if(confirm('Удалить?')) {
            await сервисАПИ.удалитьОбъявление(доска.id, id);
            приОбновлении();
        }
    };

    const срокИстек = доска.срокИстекаетВ && доска.срокИстекаетВ < Date.now();

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={приЗакрытии}>
             <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">{доска.название}</h2>
                        {срокИстек ? 
                            <span className="text-xs bg-red-900 text-red-200 px-2 rounded">Срок истек</span> : 
                            <span className="text-xs text-green-400">Активна до {new Date(доска.срокИстекаетВ!).toLocaleDateString()}</span>
                        }
                    </div>
                    <button onClick={приЗакрытии}>✕</button>
                </div>

                <div className="flex border-b border-slate-700">
                    <button onClick={() => установитьВкладку('объявления')} className={`flex-1 py-3 ${вкладка === 'объявления' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400'}`}>Объявления</button>
                    <button onClick={() => установитьВкладку('настройки')} className={`flex-1 py-3 ${вкладка === 'настройки' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400'}`}>Настройки / Продление</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {вкладка === 'объявления' && (
                        <>
                             <button onClick={() => { установитьРедактируемое(null); установитьМодалОбъявленияОткрыт(true); }} className="w-full bg-slate-700 p-3 rounded text-slate-300 hover:text-white mb-4">+ Добавить объявление</button>
                             <div className="space-y-3">
                                {доска.объявления.map(об => (
                                    <div key={об.id} className="bg-slate-700 p-3 rounded">
                                        <div className="flex justify-between">
                                            <h4 className="font-bold text-white">{об.заголовок}</h4>
                                            <div className="flex space-x-2">
                                                 <button onClick={() => { установитьРедактируемое(об); установитьМодалОбъявленияОткрыт(true); }}><PencilIcon className="w-4 h-4 text-slate-300"/></button>
                                                 <button onClick={() => удалитьОбъявление(об.id)}><TrashIcon className="w-4 h-4 text-red-400"/></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-300 mt-1">{об.содержание}</p>
                                    </div>
                                ))}
                             </div>
                        </>
                    )}

                    {вкладка === 'настройки' && (
                        <div className="space-y-6">
                            <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
                                <h3 className="font-bold text-white mb-2">Статус аренды</h3>
                                {срокИстек ? <p className="text-red-400 mb-2">Ваша доска скрыта из поиска.</p> : <p className="text-slate-300 mb-2">Все отлично, доска работает.</p>}
                                <button onClick={() => установитьМодалПродленияОткрыт(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                    {срокИстек ? 'Возобновить аренду' : 'Продлить аренду'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-white">Монетизация</h3>
                                <p className="text-xs text-slate-400">Вы можете брать плату с других пользователей за размещение объявлений на вашей доске.</p>
                                
                                <div>
                                    <label className="text-sm text-slate-400">Цена за объявление (USDT)</label>
                                    <input type="number" value={цена} onChange={e => установитьЦену(e.target.value)} className="w-full bg-slate-700 p-2 rounded text-white mt-1"/>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400">Ваш кошелек</label>
                                    <input value={кошелек} onChange={e => установитьКошелек(e.target.value)} className="w-full bg-slate-700 p-2 rounded text-white mt-1" placeholder="Адрес кошелька..."/>
                                </div>
                                <button onClick={сохранитьНастройки} className="w-full bg-cyan-600 py-2 rounded text-white">Сохранить настройки</button>
                            </div>
                        </div>
                    )}
                </div>
             </div>

             {модалОбъявленияОткрыт && (
                 <AddAnnouncementModal 
                    объявление={редактируемое}
                    приЗакрытии={() => установитьМодалОбъявленияОткрыт(false)}
                    приСохранении={async (данные) => {
                        if (редактируемое) await сервисАПИ.редактироватьОбъявление(доска.id, данные);
                        else await сервисАПИ.добавитьОбъявление(доска.владелецUid, доска.id, данные); // Для владельца бесплатно
                        приОбновлении();
                        установитьМодалОбъявленияОткрыт(false);
                    }}
                 />
             )}

             {модалПродленияОткрыт && (
                 <ExtendBoardModal 
                    доскаId={доска.id}
                    приЗакрытии={() => установитьМодалПродленияОткрыт(false)}
                    приУспехе={приОбновлении}
                 />
             )}
        </div>
    );
};
export default BoardManagementModal;
