// v1.6 Batch 4: Verify Modal — защита от MITM через визуальное сравнение fingerprint.
import React from 'react';

interface VerifyModalProps {
  partnerName: string;
  partnerPublicKey?: string;
  myPublicKey?: string;
  partnerFingerprint?: string;
  myFingerprint?: string;
  isVerified: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function fingerprintFromKey(publicKey?: string): string {
  if (!publicKey) return '—';
  const cleaned = publicKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < 32 && i < cleaned.length; i += 4) {
    groups.push(cleaned.slice(i, i + 4));
  }
  return (groups.join(' ') || '—');
}

export default function VerifyModal({
  partnerName,
  partnerPublicKey,
  myPublicKey,
  partnerFingerprint,
  myFingerprint,
  isVerified,
  onConfirm,
  onClose
}: VerifyModalProps) {
  const myCode = myFingerprint || fingerprintFromKey(myPublicKey);
  const partnerCode = partnerFingerprint || fingerprintFromKey(partnerPublicKey);

  return (
    <div
      data-testid='verify-modal'
      role='dialog'
      aria-labelledby='verify-title'
      aria-modal='true'
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          maxWidth: '420px',
          width: '100%',
          padding: '24px',
          color: '#f1f5f9',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid #334155'
        }}
      >
        <h2 id='verify-title' style={{ margin: '0 0 8px', fontSize: '20px' }}>
          🔐 Верификация контакта
        </h2>
        <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '13px', lineHeight: 1.5 }}>
          Сравните коды с <strong>{partnerName}</strong> по защищённому каналу
          (звонок, лично). Если совпадают — соединение безопасно.
        </p>
        {isVerified && (
          <div role='status' style={{
            padding: '10px 14px', marginBottom: '16px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e', borderRadius: '8px',
            color: '#22c55e', fontSize: '13px'
          }}>✅ Контакт подтверждён</div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Ваш код:</div>
          <div data-testid='my-fingerprint' style={{
            padding: '12px', background: '#0f172a', borderRadius: '8px',
            fontFamily: 'monospace', fontSize: '16px', letterSpacing: '1px',
            color: '#22d3ee', fontWeight: 'bold', textAlign: 'center',
            border: '1px solid #334155'
          }}>{myCode}</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Код {partnerName}:</div>
          <div data-testid='partner-fingerprint' style={{
            padding: '12px', background: '#0f172a', borderRadius: '8px',
            fontFamily: 'monospace', fontSize: '16px', letterSpacing: '1px',
            color: '#fbbf24', fontWeight: 'bold', textAlign: 'center',
            border: '1px solid #334155'
          }}>{partnerCode}</div>
        </div>
        <div role='note' style={{
          padding: '10px', background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px',
          color: '#fca5a5', fontSize: '11px', lineHeight: 1.4, marginBottom: '20px'
        }}>⚠️ Если коды НЕ совпадают — возможна MITM-атака. Не отправляйте секреты.</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type='button' onClick={onClose} aria-label='Закрыть' style={{
            padding: '8px 16px', background: 'transparent', color: '#94a3b8',
            border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
          }}>Закрыть</button>
          <button type='button' onClick={onConfirm} disabled={isVerified}
            data-testid='verify-confirm'
            aria-label={isVerified ? 'Уже подтверждён' : 'Подтвердить'} style={{
            padding: '8px 16px',
            background: isVerified ? '#475569' : '#22c55e',
            color: '#ffffff', border: 'none', borderRadius: '6px',
            cursor: isVerified ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600
          }}>{isVerified ? '✓ Подтверждён' : '✓ Подтвердить'}</button>
        </div>
      </div>
    </div>
  );
}

