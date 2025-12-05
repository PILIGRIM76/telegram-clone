
import React, { useState } from 'react';
import type { Contact, Group } from '../types';
import { UsersIcon } from './icons/UsersIcon';

interface ForwardModalProps {
    contacts: Contact[];
    groups: Group[];
    onClose: () => void;
    onForward: (targetId: string) => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({ contacts, groups, onClose, onForward }) => {
    const [search, setSearch] = useState('');

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && c.uid !== 'system');
    const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-white font-bold">Forward to...</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <div className="p-4 border-b border-slate-700">
                    <input 
                        className="w-full bg-slate-700 p-2 rounded text-white" 
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {filteredGroups.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">Groups</p>
                            {filteredGroups.map(g => (
                                <button key={g.id} onClick={() => onForward(g.id)} className="w-full text-left p-3 hover:bg-slate-700 rounded flex items-center">
                                    <div className="w-10 h-10 bg-indigo-900 rounded-full flex items-center justify-center mr-3">
                                        <UsersIcon className="w-5 h-5 text-indigo-300"/>
                                    </div>
                                    <span className="text-white font-medium">{g.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold px-2 mb-2">Contacts</p>
                        {filteredContacts.map(c => (
                            <button key={c.id} onClick={() => onForward(c.id)} className="w-full text-left p-3 hover:bg-slate-700 rounded flex items-center">
                                <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center mr-3 font-bold text-cyan-400">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-white font-medium">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForwardModal;
