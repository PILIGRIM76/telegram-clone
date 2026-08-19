
import React, { useState } from 'react';
import type { Announcement } from '../types';

interface AddAnnouncementModalProps {
    announcement: Announcement | null;
    onClose: () => void;
    onSave: (data: { title: string, content: string }) => void;
}

const AddAnnouncementModal: React.FC<AddAnnouncementModalProps> = ({ announcement, onClose, onSave }) => {
    const [title, setTitle] = useState(announcement?.title || '');
    const [content, setContent] = useState(announcement?.content || '');

    const handleSave = () => {
        if (!title.trim() || !content.trim()) return;
        onSave({ title, content });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">{announcement ? 'Edit Announcement' : 'New Announcement'}</h3>
                
                <input 
                    className="w-full bg-slate-700 p-2 rounded mb-3 text-white" 
                    placeholder="Title" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                />
                <textarea 
                    className="w-full bg-slate-700 p-2 rounded mb-3 text-white h-32" 
                    placeholder="Announcement text..." 
                    value={content} 
                    onChange={e => setContent(e.target.value)} 
                />

                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-cyan-600 rounded text-white">
                        {announcement ? 'Save' : 'Publish'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddAnnouncementModal;
