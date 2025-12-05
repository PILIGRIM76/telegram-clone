
import React, { useState } from 'react';
import type { NoticeBoard, Announcement } from '../types';
import { apiService } from '../services/apiService';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import AddAnnouncementModal from './AddAnnouncementModal';
import ExtendBoardModal from './ExtendBoardModal';

interface BoardManagementModalProps {
    board: NoticeBoard;
    onClose: () => void;
    onUpdate: () => void;
}

const BoardManagementModal: React.FC<BoardManagementModalProps> = ({ board, onClose, onUpdate }) => {
    const [tab, setTab] = useState<'announcements'|'settings'>('announcements');
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement|null>(null);

    const [price, setPrice] = useState(board.pricePerAd?.toString() || '0');
    const [wallet, setWallet] = useState(board.ownerWallet || '');

    const saveSettings = async () => {
        try {
            await apiService.updateBoard(board.id, {
                pricePerAd: parseFloat(price),
                ownerWallet: wallet
            });
            alert('Settings saved');
            onUpdate();
        } catch (e) { alert('Error'); }
    };

    const deleteAnnouncement = async (id: string) => {
        if(confirm('Delete?')) {
            await apiService.deleteAnnouncement(board.id, id);
            onUpdate();
        }
    };

    const expired = board.expiresAt && board.expiresAt < Date.now();

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
             <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">{board.name}</h2>
                        {expired ? 
                            <span className="text-xs bg-red-900 text-red-200 px-2 rounded">Expired</span> : 
                            <span className="text-xs text-green-400">Active until {new Date(board.expiresAt!).toLocaleDateString()}</span>
                        }
                    </div>
                    <button onClick={onClose}>✕</button>
                </div>

                <div className="flex border-b border-slate-700">
                    <button onClick={() => setTab('announcements')} className={`flex-1 py-3 ${tab === 'announcements' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400'}`}>Announcements</button>
                    <button onClick={() => setTab('settings')} className={`flex-1 py-3 ${tab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-400'}`}>Settings / Extend</button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                    {tab === 'announcements' && (
                        <>
                             <button onClick={() => { setEditingAnnouncement(null); setIsAnnouncementModalOpen(true); }} className="w-full bg-slate-700 p-3 rounded text-slate-300 hover:text-white mb-4">+ Add Announcement</button>
                             <div className="space-y-3">
                                {board.announcements.map(ann => (
                                    <div key={ann.id} className="bg-slate-700 p-3 rounded">
                                        <div className="flex justify-between">
                                            <h4 className="font-bold text-white">{ann.title}</h4>
                                            <div className="flex space-x-2">
                                                 <button onClick={() => { setEditingAnnouncement(ann); setIsAnnouncementModalOpen(true); }}><PencilIcon className="w-4 h-4 text-slate-300"/></button>
                                                 <button onClick={() => deleteAnnouncement(ann.id)}><TrashIcon className="w-4 h-4 text-red-400"/></button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-300 mt-1">{ann.content}</p>
                                    </div>
                                ))}
                             </div>
                        </>
                    )}

                    {tab === 'settings' && (
                        <div className="space-y-6">
                            <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
                                <h3 className="font-bold text-white mb-2">Rental Status</h3>
                                {expired ? <p className="text-red-400 mb-2">Your board is hidden from search.</p> : <p className="text-slate-300 mb-2">Everything looks good, board is active.</p>}
                                <button onClick={() => setIsExtendModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                                    {expired ? 'Renew Rental' : 'Extend Rental'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-white">Monetization</h3>
                                <p className="text-xs text-slate-400">You can charge other users for posting ads on your board.</p>
                                
                                <div>
                                    <label className="text-sm text-slate-400">Price per Ad (USDT)</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-700 p-2 rounded text-white mt-1"/>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400">Your Wallet</label>
                                    <input value={wallet} onChange={e => setWallet(e.target.value)} className="w-full bg-slate-700 p-2 rounded text-white mt-1" placeholder="Wallet address..."/>
                                </div>
                                <button onClick={saveSettings} className="w-full bg-cyan-600 py-2 rounded text-white">Save Settings</button>
                            </div>
                        </div>
                    )}
                </div>
             </div>

             {isAnnouncementModalOpen && (
                 <AddAnnouncementModal 
                    announcement={editingAnnouncement}
                    onClose={() => setIsAnnouncementModalOpen(false)}
                    onSave={async (data) => {
                        if (editingAnnouncement) await apiService.editAnnouncement(board.id, data);
                        else await apiService.addAnnouncement(board.ownerUid, board.id, data); // Free for owner
                        onUpdate();
                        setIsAnnouncementModalOpen(false);
                    }}
                 />
             )}

             {isExtendModalOpen && (
                 <ExtendBoardModal 
                    boardId={board.id}
                    onClose={() => setIsExtendModalOpen(false)}
                    onSuccess={onUpdate}
                 />
             )}
        </div>
    );
};
export default BoardManagementModal;
    