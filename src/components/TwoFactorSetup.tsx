// TwoFactorSetup Component for 2FA UI
import React, { useState } from 'react';
import { generateSecret, generateBackupCodes } from '../services/authService';

interface TwoFactorSetupProps {
  enabled: boolean;
  onEnable: (secret: string, backupCodes: string[]) => void;
  onDisable: () => void;
  username: string;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  enabled,
  onEnable,
  onDisable,
  username
}) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showCodes, setShowCodes] = useState(false);

  const handleEnable = () => {
    const secret = generateSecret(username);
    const codes = generateBackupCodes(10);
    setBackupCodes(codes);
    setShowCodes(true);
    onEnable(secret, codes);
  };

  const handleDisable = () => {
    onDisable();
    setQrCode('');
    setBackupCodes([]);
    setShowCodes(false);
  };

  if (enabled && showCodes) {
    return (
      <div className="p-4 bg-slate-800 rounded">
        <h3 className="text-lg font-bold mb-4 text-yellow-400">2FA Включена</h3>
        <p className="text-sm text-slate-300 mb-3">
          Сохраните резервные коды:
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {backupCodes.map((code, i) => (
            <code key={i} className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">
              {code}
            </code>
          ))}
        </div>
        <button
          onClick={handleDisable}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          Отключить 2FA
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800 rounded">
      <h3 className="text-lg font-bold mb-4">Двухфакторная аутентификация</h3>
      {!enabled && (
        <button
          onClick={handleEnable}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white"
        >
          Включить 2FA
        </button>
      )}
    </div>
  );
};

export default TwoFactorSetup;
