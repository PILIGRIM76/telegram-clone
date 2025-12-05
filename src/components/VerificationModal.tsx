
import React from 'react';
import { QrCodeIcon } from './icons/QrCodeIcon';

interface VerificationModalProps {
    uid: string;
    fingerprint: string;
    onClose: () => void;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ uid, fingerprint, onClose }) => {
    // В реальном приложении здесь генерируется QR код из JSON { uid, fingerprint }
    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[90]" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4 text-black">Your Verification Code</h3>
                <div className="flex justify-center mb-4">
                    <QrCodeIcon className="w-48 h-48 text-black" />
                </div>
                <p className="text-xs text-gray-500 mb-2 font-mono">{uid}</p>
                <p className="text-sm font-bold text-gray-800">Fingerprint: {fingerprint}</p>
                <p className="text-xs text-gray-400 mt-4">Show this code to your partner to scan</p>
            </div>
        </div>
    );
};

export default VerificationModal;
