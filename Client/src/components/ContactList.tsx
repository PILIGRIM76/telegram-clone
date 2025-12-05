
import React, { useState, useRef, useEffect } from 'react';
import type { Identity, Contact, Chat, Group } from '../types';
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
import { useTranslation } from '../contexts/LanguageContext';

interface ContactListProps {
  identity: Identity;
  contacts: Contact[];
  groups: Group[];
  onAddContact: (name: string, uid: string) => void;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
  chats: Record<string, Chat>;
  onOpenProfile: () => void;
  onMuteChat: (contactId: string, duration: number | 'forever' | null) => void;
  onArchiveChat: (contactId: string, archive: boolean) => void;
  onCreateGroup: (name: string, type: 'public' | 'private') => void;
  onOpenStore: () => void;
  onOpenBoards: () => void;
}

const ContactList: React.FC<ContactListProps> = ({
  identity,
  contacts,
  groups,
  onAddContact,
  selectedChatId,
  onSelectChat,
  chats,
  onOpenProfile,
  onMuteChat,
  onArchiveChat,
  onCreateGroup,
  onOpenStore,
  onOpenBoards
}) => {
  const { t } = useTranslation();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, contact: Contact } | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, contact: Contact) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, contact });
  };
  
  const setMute = (duration: number | 'forever' | null) => {
    if (contextMenu) {
      const contactId = contextMenu.contact.id;
      let until: number | 'forever' | null = null;
      if (duration) {
        until = duration === 'forever' ? 'forever' : Date.now() + duration;
      }
      onMuteChat(contactId, until);
      setContextMenu(null);
    }
  };

  const toggleArchive = (contactId: string, toArchive: boolean) => {
      onArchiveChat(contactId, toArchive);
      setContextMenu(null);
  }

  const handleCopyUid = () => {
    navigator.clipboard.writeText(identity.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeContacts = contacts.filter(c => !c.archived && c.uid !== 'system');
  const archivedContacts = contacts.filter(c => c.archived);
  const systemChat = contacts.find(c => c.uid === 'system');

  const displayedContacts = showArchive ? archivedContacts : activeContacts;

  return (
    <>
      <aside className="flex flex-col h-full bg-slate-900 border-r border-slate-700 w-full md:w-80 lg:w-96 flex-shrink-0">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div className="flex items-center space-x-2">
            {showArchive && (
                <button onClick={() => setShowArchive(false)} className="mr-2 text-slate-400 hover:text-white">
                    ←
                </button>
            )}
            <h2 className="text-xl font-bold text-white">{showArchive ? t('archive_title') : t('chats_title')}</h2>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={() => setIsGroupModalOpen(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title={t('create_group')}>
                <UsersIcon className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={() => setIsContactModalOpen(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title={t('add_contact')}>
              <UserPlusIcon className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={onOpenProfile} className="p-2 rounded-full hover:bg-slate-700 transition-colors" title="Settings">
                <SettingsIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!showArchive && systemChat && (
                 <button
                 onClick={() => onSelectChat(systemChat.id)}
                 className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 border-b border-slate-800 ${selectedChatId === systemChat.id ? 'bg-cyan-900/40' : ''}`}
               >
                 <div className="w-12 h-12 bg-red-900/50 rounded-full flex-shrink-0 flex items-center justify-center">
                   <BellSlashIcon className="w-6 h-6 text-red-400" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <p className="font-semibold text-red-300">{t('system_notifications')}</p>
                   <p className="text-sm text-slate-500 truncate">{t('system_desc')}</p>
                 </div>
               </button>
            )}

            {!showArchive && archivedContacts.length > 0 && (
                <button 
                    onClick={() => setShowArchive(true)}
                    className="w-full text-left p-3 flex items-center space-x-3 hover:bg-slate-800 border-b border-slate-800"
                >
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center">
                        <ArchiveBoxIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-slate-300">{t('archive_title')}</p>
                        <p className="text-sm text-slate-500">{archivedContacts.length} chats</p>
                    </div>
                </button>
            )}

            {!showArchive && groups.map(group => {
                const selected = group.id === selectedChatId;
                const lastMessage = chats[group.id]?.messages.slice(-1)[0];
                return (
                    <button
                        key={group.id}
                        onClick={() => onSelectChat(group.id)}
                        className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 ${selected ? 'bg-cyan-900/50' : ''}`}
                    >
                         <div className="w-12 h-12 bg-indigo-900/50 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-indigo-400">
                             <UsersIcon className="w-6 h-6" />
                         </div>
                         <div className="flex-1 overflow-hidden">
                             <div className="flex justify-between">
                                 <p className="font-semibold text-slate-200 truncate">{group.name}</p>
                                 {group.type === 'private' && <span className="text-xs text-yellow-500">🔒</span>}
                             </div>
                             {lastMessage && (
                                <p className="text-sm text-slate-400 truncate">
                                    {lastMessage.text.startsWith('{"') ? 'System message' : 'Message...'}
                                </p>
                             )}
                         </div>
                    </button>
                )
            })}

            {displayedContacts.length === 0 && groups.length === 0 && !systemChat ? (
                 <div className="p-8 text-center text-slate-500 text-sm">
                     {showArchive ? 'Archive is empty' : 'No active chats'}
                 </div>
            ) : (
                <ul>
                    {displayedContacts.map(contact => {
                    const lastMessage = chats[contact.id]?.messages.slice(-1)[0];
                    const selected = contact.id === selectedChatId;
                    const isMuted = contact.mutedUntil === 'forever' || (typeof contact.mutedUntil === 'number' && contact.mutedUntil > Date.now());

                    return (
                        <li key={contact.id} onContextMenu={(e) => handleContextMenu(e, contact)}>
                        <button
                            onClick={() => onSelectChat(contact.id)}
                            className={`w-full text-left p-3 flex items-center space-x-3 transition-colors hover:bg-slate-800 ${
                            selected ? 'bg-cyan-900/50' : ''
                            }`}
                        >
                            <div className="w-12 h-12 bg-slate-700 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-cyan-400 relative">
                                {contact.name.charAt(0).toUpperCase()}
                                {contact.verified && (
                                    <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-slate-200 truncate">{contact.name}</p>
                                {isMuted && <BellSlashIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                            </div>
                            {lastMessage && (
                                <p className="text-sm text-slate-400 truncate">
                                {lastMessage.senderId === identity.uid ? 'You: ' : ''}
                                {lastMessage.text.startsWith('{"') ? 'Hidden data...' : 'Message...'}
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

        <div className="p-3 border-t border-slate-700 bg-slate-800">
            <div className="flex justify-around mb-3">
                <button onClick={onOpenStore} className="flex flex-col items-center text-slate-400 hover:text-cyan-400 transition-colors">
                    <StoreIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{t('store_btn')}</span>
                </button>
                <button onClick={onOpenBoards} className="flex flex-col items-center text-slate-400 hover:text-cyan-400 transition-colors">
                    <ClipboardDocumentListIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{t('boards_btn')}</span>
                </button>
            </div>
            
            <div className="bg-slate-900 rounded-lg p-2 flex items-center">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-cyan-400 mr-2">
                    {identity.avatar || identity.uid.substring(0,2).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden mr-2">
                     <p className="text-xs font-bold text-white truncate">{identity.username || 'Anonymous'}</p>
                     <p className="text-[10px] text-cyan-500 truncate font-mono">{identity.uid}</p>
                </div>
                <button onClick={handleCopyUid} className="text-slate-500 hover:text-white">
                    {copied ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <ClipboardIcon className="w-5 h-5"/>}
                </button>
            </div>
        </div>
      </aside>

      {isContactModalOpen && (
        <AddContactModal
          onClose={() => setIsContactModalOpen(false)}
          onAddContact={onAddContact}
        />
      )}
      {isGroupModalOpen && (
          <CreateGroupModal 
            onClose={() => setIsGroupModalOpen(false)}
            onCreate={onCreateGroup}
          />
      )}

      {contextMenu && (
         <div
            ref={menuRef}
            className="fixed z-50 bg-slate-700 rounded-md shadow-xl py-1 w-52 text-sm border border-slate-600"
            style={{ top: contextMenu.y, left: contextMenu.x }}
         >
            <div className="px-3 py-2 font-bold truncate text-white border-b border-slate-600">{contextMenu.contact.name}</div>
            
            <button onClick={() => toggleArchive(contextMenu.contact.id, !contextMenu.contact.archived)} className="w-full text-left px-3 py-2 hover:bg-slate-600 text-slate-200 flex items-center">
                <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                {contextMenu.contact.archived ? 'Unarchive' : 'Archive'}
            </button>
            
            <div className="border-t border-slate-600 my-1"></div>
            
            {contextMenu.contact.mutedUntil ? (
              <button onClick={() => setMute(null)} className="w-full text-left px-3 py-2 hover:bg-slate-600 text-slate-200">Unmute</button>
            ) : (
              <>
                <div className="px-3 py-1 text-xs text-slate-400 uppercase">Mute notifications</div>
                <button onClick={() => setMute(3600 * 1000)} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">For 1 hour</button>
                <button onClick={() => setMute(8 * 3600 * 1000)} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">For 8 hours</button>
                <button onClick={() => setMute('forever')} className="w-full text-left px-3 py-1.5 hover:bg-slate-600 text-slate-200 pl-6">Forever</button>
              </>
            )}
         </div>
      )}
    </>
  );
};

export default ContactList;
