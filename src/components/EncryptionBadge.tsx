// Phase 1: visual indicator for Signal (PFS) vs legacy (NaCl) encryption.
import React from 'react';
import { Tooltip } from './Tooltip';

export type EncryptionType = 'signal' | 'nacl' | 'unknown';

interface EncryptionBadgeProps {
  encryptionType: EncryptionType;
}

export const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({ encryptionType }) => {
  if (encryptionType === 'unknown') return null;
  const isPFS = encryptionType === 'signal';
  const icon = isPFS ? '\u{1F512}' : '\u{1F513}';
  const label = isPFS ? 'PFS' : 'Legacy';
  const tooltip = isPFS
    ? 'Signal Protocol (Double Ratchet) \u2014 Perfect Forward Secrecy'
    : 'Legacy encryption (NaCl) \u2014 no Perfect Forward Secrecy';
  const color = isPFS ? '#38A169' : '#F59E0B';
  return (
    <Tooltip content={tooltip} position="bottom">
      <div
        data-testid="encryption-badge"
        data-encryption={encryptionType}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          background: color + '15',
          border: '1px solid ' + color + '40',
          fontSize: 11,
          fontWeight: 600,
          color,
          cursor: 'help',
          marginLeft: 8,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
    </Tooltip>
  );
};

export default EncryptionBadge;