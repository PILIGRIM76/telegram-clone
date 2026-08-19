
import React, { useState, useEffect } from 'react';
import type { Store, Product, Order, Identity } from '../types';
import { apiService } from '../services/apiService';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import AddProductModal from './AddProductModal';

interface StoreManagementModalProps {
    identity: Identity;
    onClose: () => void;
    onSave: (store: Store) => void;
    orders: Order[];
    updateOrderStatus: (id: string, status: any) => void;
}

const StoreManagementModal: React.FC<StoreManagementModalProps> = ({ identity, onClose, onSave, orders, updateOrderStatus }) => {
    const [tab, setTab] = useState<'info'|'products'|'orders'>('info');
    const [store, setStore] = useState<Store>(identity.store || {
        name: '', description: '', type: 'public', products: []
    });
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const saveInfo = async () => {
        try {
            const res = await apiService.createOrUpdateStore(identity.uid, store);
            if (res.inviteToken) {
                setStore(prev => ({ ...prev, inviteToken: res.inviteToken }));
            }
            onSave(store);
            alert('Store saved!');
        } catch (e) {
            alert('Save error');
        }
    };

    const deleteProduct = (id: string) => {
        if(confirm('Delete product?')) {
            const newProducts = store.products.filter(p => p.id !== id);
            setStore({...store, products: newProducts});
        }
    };

    const saveProduct = (product: Product) => {
        let newProducts;
        if (editingProduct) {
            newProducts = store.products.map(p => p.id === product.id ? product : p);
        } else {
            newProducts = [...store.products, product];
        }
        setStore({...store, products: newProducts});
        setIsProductModalOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Store Management</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="flex border-b border-slate-700">
                    {['info', 'products', 'orders'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTab(t as any)}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide ${tab === t ? 'border-b-2 border-cyan-500 text-cyan-400 bg-slate-700/30' : 'text-slate-400 hover:bg-slate-700/50'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {/* INFO Tab */}
                    {tab === 'info' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm">Store Name</label>
                                <input className="w-full bg-slate-700 p-2 rounded text-white mt-1" value={store.name} onChange={e => setStore({...store, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Description</label>
                                <textarea className="w-full bg-slate-700 p-2 rounded text-white mt-1 h-24" value={store.description} onChange={e => setStore({...store, description: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm">Your Wallet (USDT/BTC) for payments</label>
                                <input className="w-full bg-slate-700 p-2 rounded text-white mt-1 font-mono text-xs" 
                                    value={store.sellerWallet || ''} 
                                    placeholder="Enter wallet address..."
                                    onChange={e => setStore({...store, sellerWallet: e.target.value})} 
                                />
                                <p className="text-xs text-yellow-500 mt-1">System will generate a smart contract based on this address.</p>
                            </div>
                            <div className="flex items-center space-x-4 mt-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={store.type === 'public'} onChange={() => setStore({...store, type: 'public'})} />
                                    <span className="text-white">Public</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" checked={store.type === 'private'} onChange={() => setStore({...store, type: 'private'})} />
                                    <span className="text-white">Private</span>
                                </label>
                            </div>

                            {store.type === 'private' && store.inviteToken && (
                                <div className="bg-indigo-900/30 border border-indigo-500/30 p-3 rounded mt-4">
                                    <p className="text-xs text-indigo-300 mb-1">Invite Link</p>
                                    <div className="flex items-center space-x-2">
                                        <code className="flex-1 bg-black/30 p-2 rounded text-xs text-slate-300 truncate">
                                            {window.location.origin}/invite/{store.inviteToken}
                                        </code>
                                        <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invite/${store.inviteToken}`)}>
                                            <ClipboardIcon className="w-5 h-5 text-indigo-400" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button onClick={saveInfo} className="w-full bg-cyan-600 py-3 rounded text-white font-bold mt-4 hover:bg-cyan-700">Save Changes</button>
                        </div>
                    )}

                    {/* PRODUCTS Tab */}
                    {tab === 'products' && (
                        <div>
                            <button 
                                onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
                                className="w-full border-2 border-dashed border-slate-600 rounded-lg p-4 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-colors mb-4"
                            >
                                <PlusCircleIcon className="w-6 h-6 mr-2" /> Add Product
                            </button>

                            <div className="space-y-3">
                                {store.products.map(product => (
                                    <div key={product.id} className="bg-slate-700 p-3 rounded-lg flex items-center">
                                        <div className="w-12 h-12 bg-slate-600 rounded overflow-hidden mr-3">
                                            {product.image ? <img src={product.image} className="w-full h-full object-cover"/> : null}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-white">{product.name}</p>
                                            <p className="text-sm text-cyan-400">{product.price} {product.currency}</p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }} className="p-2 hover:bg-slate-600 rounded">
                                                <PencilIcon className="w-4 h-4 text-slate-300" />
                                            </button>
                                            <button onClick={() => deleteProduct(product.id)} className="p-2 hover:bg-slate-600 rounded">
                                                <TrashIcon className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ORDERS Tab */}
                    {tab === 'orders' && (
                        <div className="space-y-3">
                            {orders.length === 0 ? <p className="text-center text-slate-500 mt-10">No orders yet</p> : 
                            orders.map(order => (
                                <div key={order.id} className="bg-slate-700 p-4 rounded-lg border-l-4 border-cyan-500">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-xs text-slate-400">ID: {order.id.slice(-6)}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${order.status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-slate-600'}`}>{order.status}</span>
                                    </div>
                                    <p className="font-bold text-white">{order.product.name}</p>
                                    <p className="text-sm text-slate-300 mb-2">{order.product.price} {order.product.currency}</p>
                                    {order.txid && (
                                        <div className="bg-black/20 p-2 rounded mb-2 font-mono text-xs text-green-400 break-all">
                                            TXID: {order.txid}
                                        </div>
                                    )}
                                    <div className="flex space-x-2 mt-2">
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                            className="bg-slate-800 text-xs p-1 rounded text-white border border-slate-600"
                                        >
                                            <option value="new">New</option>
                                            <option value="paid">Paid (Verified)</option>
                                            <option value="processing">Processing</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isProductModalOpen && (
                <AddProductModal
                    product={editingProduct}
                    onClose={() => setIsProductModalOpen(false)}
                    onSave={saveProduct}
                />
            )}
        </div>
    );
};

export default StoreManagementModal;
