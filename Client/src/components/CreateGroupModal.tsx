
import React, { useState } from 'react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreate: (name: string, type: 'public' | 'private') => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Create Group</h2>
        <input 
            type="text" 
            placeholder="Group Name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="w-full bg-slate-700 p-2 rounded mb-4 text-white"
        />
        <div className="mb-4">
            <label className="flex items-center space-x-2 text-slate-300">
                <input type="radio" checked={type === 'public'} onChange={() => setType('public')} />
                <span>Public</span>
            </label>
            <label className="flex items-center space-x-2 text-slate-300 mt-2">
                <input type="radio" checked={type === 'private'} onChange={() => setType('private')} />
                <span>Private (invite link)</span>
            </label>
        </div>
        <div className="flex justify-end space-x-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded text-white">Cancel</button>
            <button onClick={() => { onCreate(name, type); onClose(); }} className="px-4 py-2 bg-cyan-600 rounded text-white">Create</button>
        </div>
      </div>
    </div>
  );
};
export default CreateGroupModal;
