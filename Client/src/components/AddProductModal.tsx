
import React, { useState } from 'react';
import type { Product } from '../types';

interface AddProductModalProps {
    product: Product | null;
    onClose: () => void;
    onSave: (product: Product) => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ product, onClose, onSave }) => {
    const [name, setName] = useState(product?.name || '');
    const [description, setDescription] = useState(product?.description || '');
    const [price, setPrice] = useState(product?.price?.toString() || '');
    const [image, setImage] = useState(product?.image || '');

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const save = () => {
        if (!name || !price) return;
        onSave({
            id: product?.id || crypto.randomUUID(),
            name,
            description,
            price: parseFloat(price),
            currency: 'USDT',
            image
        });
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
            <div className="bg-slate-800 p-6 rounded-lg w-full max-w-sm border border-slate-600">
                <h3 className="text-lg font-bold text-white mb-4">{product ? 'Edit Product' : 'New Product'}</h3>
                
                <input className="w-full bg-slate-700 p-2 rounded mb-3 text-white" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
                <textarea className="w-full bg-slate-700 p-2 rounded mb-3 text-white h-20" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                <input className="w-full bg-slate-700 p-2 rounded mb-3 text-white" type="number" placeholder="Price (USDT)" value={price} onChange={e => setPrice(e.target.value)} />
                
                <div className="mb-4">
                    <label className="block text-sm text-slate-400 mb-1">Image</label>
                    <input type="file" onChange={handleFile} className="text-sm text-slate-400" accept="image/*" />
                    {image && <img src={image} className="mt-2 h-20 rounded object-cover" />}
                </div>

                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded text-white">Cancel</button>
                    <button onClick={save} className="px-4 py-2 bg-cyan-600 rounded text-white">Save</button>
                </div>
            </div>
        </div>
    );
};
export default AddProductModal;
