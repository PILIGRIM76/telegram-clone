
import React, { useState } from 'react';
import type { Store, NoticeBoard, Product } from '../types';
import { apiService } from '../services/apiService';
import { ShoppingBagIcon } from './icons/ShoppingBagIcon';
import PaymentModal from './PaymentModal';
import AddAnnouncementModal from './AddAnnouncementModal';
import AnnouncementPaymentModal from './AnnouncementPaymentModal';

interface AddContactModalProps {
  onClose: () => void;
  onAddContact: (name: string, uid: string, publicKey?: string) => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onAddContact }) => {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{
      uid: string;
      publicKey: string;
      store?: Store;
      boards?: NoticeBoard[];
  } | null>(null);
  const [contactName, setContactName] = useState('');
  const [publicKeyInput, setPublicKeyInput] = useState(''); // Phase 7.6.4: РѕРїС†РёРѕРЅР°Р»СЊРЅС‹Р№ РІРІРѕРґ JWK
  const [showAdvanced, setShowAdvanced] = useState(false); // Phase 7.6.4: РїРѕРєР°Р·Р°С‚СЊ/СЃРєСЂС‹С‚СЊ СЂР°СЃС€РёСЂРµРЅРЅС‹Рµ РїРѕР»СЏ
  const [error, setError] = useState('');
  const [activeBoard, setActiveBoard] = useState<NoticeBoard | null>(null);

  // РЎРѕСЃС‚РѕСЏРЅРёСЏ РґР»СЏ РїРѕРєСѓРїРѕРє/РїСѓР±Р»РёРєР°С†РёР№
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdPaymentModalOpen, setIsAdPaymentModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [adTxid, setAdTxid] = useState<string|undefined>(undefined);

  const performSearch = async () => {
      setError('');
      setResult(null);
      try {
          let res;
          if (search.includes('/invite/')) {
              const token = search.split('/invite/').pop();
              if (token) res = await apiService.findStoreByInvite(token);
          } else {
              res = await apiService.findUserByUid(search.trim());
          }
          setResult(res);
          if (res.boards && res.boards.length > 0) setActiveBoard(res.boards[0]);
      } catch (e) {
          setError('Nothing found');
      }
  };

  const addToContacts = () => {
      if (!result || !contactName) return;
      // Phase 7.6.4: РёСЃРїРѕР»СЊР·СѓРµРј РІРІРµРґС‘РЅРЅС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»РµРј publicKey, РёРЅР°С‡Рµ РёР· result (РµСЃР»Рё СЃРµСЂРІРµСЂ РІРµСЂРЅСѓР»)
      const finalPublicKey = publicKeyInput.trim() || result.publicKey || undefined;
      onAddContact(contactName, result.uid, finalPublicKey);
      onClose();
  };

  const orderProduct = (txid: string) => {
      if (!selectedProduct || !result) return;
      // Р’ СЂРµР°Р»СЊРЅРѕРј РїСЂРёР»РѕР¶РµРЅРёРё Р·РґРµСЃСЊ РЅСѓР¶РµРЅ callback РІ App.tsx РґР»СЏ РѕС‚РїСЂР°РІРєРё Р·Р°РєР°Р·Р°
      const finalPublicKey = publicKeyInput.trim() || result.publicKey || undefined;
      onAddContact(`Store ${result.store?.name || 'Seller'}`, result.uid, finalPublicKey);

      alert('Contact added. Please send TXID to the seller in chat to confirm order.');
      onClose();
  };
  
  const publishAnnouncement = async (data: { title: string, content: string }) => {
      if (!activeBoard || !result) return;
      try {
          await apiService.addAnnouncement(result.uid, activeBoard.id, data, adTxid);
          alert('Announcement submitted!');
          setIsPublishModalOpen(false);
          performSearch(); // Refresh
      } catch (e) { alert('Publication error'); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
       <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
           <div className="p-4 border-b border-slate-700">
               <h2 className="text-xl font-bold text-white mb-2">Search People, Stores, Boards</h2>
               <div className="flex space-x-2">
                   <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Enter UID or invite link"
                        className="flex-1 bg-slate-700 p-2 rounded text-white"
                   />
                   <button onClick={performSearch} className="bg-cyan-600 px-4 rounded text-white">Search</button>
               </div>
               {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
           </div>

           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               {result ? (
                   <div className="space-y-6">
                       {/* РџСЂРѕС„РёР»СЊ / Р”РѕР±Р°РІР»РµРЅРёРµ */}
                       <div className="bg-slate-700 p-4 rounded flex justify-between items-center">
                           <div>
                               <p className="text-xs text-slate-400">UID found</p>
                               <p className="font-mono text-cyan-300 text-sm">{result.uid}</p>
                           </div>
                           <div className="flex space-x-2">
                               <input 
                                    placeholder="Name for contact" 
                                    value={contactName}
                                    onChange={e => setContactName(e.target.value)}
                                    className="bg-slate-800 p-1 px-2 rounded text-white text-sm"
                               />
                               <button onClick={addToContacts} className="bg-green-600 px-3 py-1 rounded text-white text-sm">Add</button>
                            </div>
                        </div>

                        {/* Phase 7.6.4: РћРїС†РёРѕРЅР°Р»СЊРЅС‹Р№ РІРІРѕРґ РїСѓР±Р»РёС‡РЅРѕРіРѕ РєР»СЋС‡Р° (E2EE) */}
                        <div className="bg-slate-700/40 p-3 rounded border border-slate-600/50">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center w-full"
                            >
                                <span>{showAdvanced ? 'в–ј' : 'в–¶'}</span>
                                <span className="ml-2">
                                    Р Р°СЃС€РёСЂРµРЅРЅС‹Рµ РЅР°СЃС‚СЂРѕР№РєРё (E2EE РїСѓР±Р»РёС‡РЅС‹Р№ РєР»СЋС‡)
                                </span>
                            </button>
                            {showAdvanced && (
                                <div className="mt-2 space-y-2">
                                    <label className="block text-xs text-slate-400">
                                        РџСѓР±Р»РёС‡РЅС‹Р№ РєР»СЋС‡ (JWK, РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)
                                        {result.publicKey && (
                                            <span className="ml-2 text-green-400">
                                                вњ“ РїРѕР»СѓС‡РµРЅ СЃ СЃРµСЂРІРµСЂР°
                                            </span>
                                        )}
                                    </label>
                                    <textarea
                                        value={publicKeyInput}
                                        onChange={e => setPublicKeyInput(e.target.value)}
                                        placeholder='{"kty":"RSA","n":"...","e":"AQAB"} (РѕСЃС‚Р°РІСЊС‚Рµ РїСѓСЃС‚С‹Рј, РµСЃР»Рё СЃРµСЂРІРµСЂ РІРµСЂРЅСѓР» РєР»СЋС‡)'
                                        className="w-full bg-slate-800 p-2 rounded text-white text-xs font-mono resize-none"
                                        rows={3}
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        рџ”’ Р•СЃР»Рё СѓРєР°Р·Р°РЅ вЂ” Р±СѓРґРµС‚ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊСЃСЏ РґР»СЏ E2EE С€РёС„СЂРѕРІР°РЅРёСЏ СЃРѕРѕР±С‰РµРЅРёР№ СЌС‚РѕРјСѓ РєРѕРЅС‚Р°РєС‚Сѓ.
                                        РЎРµСЂРІРµСЂ СѓР¶Рµ РјРѕРі РІРµСЂРЅСѓС‚СЊ РєР»СЋС‡ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.
                                    </p>
                                </div>
                            )}
                        </div>

                       {/* РњР°РіР°Р·РёРЅ */}
                       {result.store && (
                           <div>
                               <h3 className="text-lg font-bold text-white mb-3 flex items-center">
                                   <ShoppingBagIcon className="w-5 h-5 mr-2 text-cyan-400" />
                                   Store: {result.store.name}
                               </h3>
                               <p className="text-slate-300 text-sm mb-4">{result.store.description}</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   {result.store.products.map(product => (
                                       <div key={product.id} className="bg-slate-700 p-3 rounded border border-slate-600">
                                            {product.image && <img src={product.image} className="w-full h-32 object-cover rounded mb-2" />}
                                            <p className="font-bold text-white">{product.name}</p>
                                            <p className="text-cyan-400 font-bold mb-2">{product.price} {product.currency}</p>
                                            <button 
                                                onClick={() => setSelectedProduct(product)}
                                                className="w-full bg-indigo-600 py-1.5 rounded text-white text-sm hover:bg-indigo-700"
                                            >
                                                Order
                                            </button>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       {/* Р”РѕСЃРєРё РѕР±СЉСЏРІР»РµРЅРёР№ */}
                       {result.boards && result.boards.length > 0 && (
                           <div className="mt-6 border-t border-slate-700 pt-4">
                               <div className="flex justify-between items-center mb-4">
                                   <h3 className="text-lg font-bold text-white">Notice Boards</h3>
                                   <div className="flex space-x-2">
                                       {result.boards.map(b => (
                                           <button 
                                                key={b.id}
                                                onClick={() => setActiveBoard(b)}
                                                className={`px-3 py-1 rounded text-xs ${activeBoard?.id === b.id ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                                           >
                                               {b.name}
                                           </button>
                                       ))}
                                   </div>
                               </div>

                               {activeBoard && (
                                   <div className="bg-slate-700/30 p-4 rounded border border-slate-700">
                                       <div className="flex justify-between mb-4">
                                           <p className="text-sm text-slate-300">{activeBoard.description}</p>
                                           <button 
                                                onClick={() => {
                                                    if (activeBoard.pricePerAd && activeBoard.pricePerAd > 0) {
                                                        setIsAdPaymentModalOpen(true);
                                                    } else {
                                                        setIsPublishModalOpen(true);
                                                    }
                                                }}
                                                className="bg-cyan-600 px-3 py-1 rounded text-white text-sm"
                                           >
                                               + Post Ad {activeBoard.pricePerAd ? `(${activeBoard.pricePerAd} USDT)` : ''}
                                           </button>
                                       </div>
                                       <div className="space-y-3">
                                           {activeBoard.announcements.map(ann => (
                                               <div key={ann.id} className="bg-slate-800 p-3 rounded border-l-2 border-cyan-500">
                                                   <h4 className="font-bold text-white text-sm">{ann.title}</h4>
                                                   <p className="text-slate-300 text-xs mt-1 whitespace-pre-wrap">{ann.content}</p>
                                                   <p className="text-slate-500 text-[10px] mt-2 text-right">{new Date(ann.publishedAt).toLocaleDateString()}</p>
                                               </div>
                                           ))}
                                            {activeBoard.announcements.length === 0 && <p className="text-center text-slate-500 text-sm">No announcements yet</p>}
                                       </div>
                                   </div>
                               )}
                           </div>
                       )}

                   </div>
               ) : (
                   <div className="text-center text-slate-500 mt-20">
                       Enter UID or link to search
                   </div>
               )}
           </div>
       </div>

       {selectedProduct && result?.store && (
           <PaymentModal 
                product={selectedProduct}
                store={result.store}
                onClose={() => setSelectedProduct(null)}
                onConfirm={orderProduct}
           />
       )}

       {isAdPaymentModalOpen && activeBoard && (
           <AnnouncementPaymentModal
                price={activeBoard.pricePerAd || 0}
                address={activeBoard.contractAddress || ''}
                onClose={() => setIsAdPaymentModalOpen(false)}
                onSuccess={(txid) => {
                    setAdTxid(txid);
                    setIsAdPaymentModalOpen(false);
                    setIsPublishModalOpen(true);
                }}
           />
       )}

       {isPublishModalOpen && (
           <AddAnnouncementModal
                announcement={null}
                onClose={() => setIsPublishModalOpen(false)}
                onSave={publishAnnouncement}
           />
       )}
    </div>
  );
};

export default AddContactModal;
