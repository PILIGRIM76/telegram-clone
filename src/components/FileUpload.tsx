import React, { useState, useRef, useCallback } from 'react';
import { logger } from '../services/logger';
import type { EncryptedAttachment } from '../types';
import { encryptFile } from '../services/cryptoService';

interface FileUploadProps {
  onFilesSelected: (encryptedAttachments: EncryptedAttachment[]) => void;
  onClose: () => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  privateKeyHex?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected, onClose, maxFiles = 5, maxSizeMB = 10,
  accept = 'image/*,application/pdf,.doc,.docx,.txt,video/*',
  privateKeyHex,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [encryptedAttachments, setEncryptedAttachments] = useState<EncryptedAttachment[]>([]);
  const [error, setError] = useState('');
  const [encrypting, setEncrypting] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type === 'application/pdf') return '📕';
    if (file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.txt')) return '📄';
    return '📎';
  };

  const encryptSingleFile = useCallback(async (file: File): Promise<EncryptedAttachment | null> => {
    if (!privateKeyHex) return null;
    try {
      const encrypted = await encryptFile(file, privateKeyHex);
      return { id: crypto.randomUUID(), name: encrypted.name, type: encrypted.type, size: encrypted.size, ciphertext: encrypted.ciphertext, iv: encrypted.iv, key: encrypted.key };
    } catch (e) { logger.error('[PILIGRIM] Encrypt failed: ' + file.name, e); return null; }
  }, [privateKeyHex]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError('');
    const fileArray = Array.from(files);
    if (pendingFiles.length + fileArray.length > maxFiles) { setError('Maximum ' + maxFiles + ' files'); return; }
    const oversizedFiles = fileArray.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) { setError('Some files exceed ' + maxSizeMB + 'MB'); return; }
    try {
      setEncrypting(true);
      const newFiles: File[] = [];
      const newEncrypted: EncryptedAttachment[] = [...encryptedAttachments];
      for (const file of fileArray) {
        newFiles.push(file);
        if (privateKeyHex) { const enc = await encryptSingleFile(file); if (enc) newEncrypted.push(enc); }
      }
      setPendingFiles(prev => [...prev, ...newFiles]);
      setEncryptedAttachments(newEncrypted);
    } catch (e) { logger.error('[PILIGRIM] FileUpload error:', e); setError('Error processing files'); }
    finally { setEncrypting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, [pendingFiles.length, maxFiles, maxSizeMB, privateKeyHex, encryptedAttachments, encryptSingleFile]);

  const removeFile = useCallback((index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    setEncryptedAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingFiles.length === 0) { setError('Select a file'); return; }
    onFilesSelected(encryptedAttachments);
    setPendingFiles([]);
    setEncryptedAttachments([]);
    setError('');
  }, [pendingFiles, encryptedAttachments, onFilesSelected]);

  return (
    <div data-testid="file-upload-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 18 }}>📎 Attach File</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 24, cursor: 'pointer', padding: '4px 8px' }} aria-label="Close">✕</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 16, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 8 }}>
          Max {maxFiles} files, each up to {maxSizeMB}MB{privateKeyHex ? ' 🔒 E2EE' : ''}
        </div>
        {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button onClick={() => fileInputRef.current?.click()} disabled={pendingFiles.length >= maxFiles || encrypting} style={{ width: '100%', padding: 16, border: '2px dashed var(--color-border)', borderRadius: 12, background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', cursor: pendingFiles.length >= maxFiles || encrypting ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: pendingFiles.length >= maxFiles || encrypting ? 0.5 : 1 }}>
          <span style={{ fontSize: 32 }}>📁</span>
          <span>Click to select files</span>
          <span style={{ fontSize: 11 }}>({pendingFiles.length}/{maxFiles} selected)</span>
        </button>
        <input ref={fileInputRef} type="file" multiple accept={accept} onChange={handleFileChange} style={{ display: 'none' }} />
        {pendingFiles.length > 0 && <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {pendingFiles.map((file, idx) => (
            <div key={idx} style={{ position: 'relative', width: 72, height: 72, borderRadius: 12, overflow: 'hidden', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              {file.type.startsWith('image/') ? <img src={URL.createObjectURL(file)} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{getFileIcon(file)}</span>}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: 8, padding: '2px 4px', color: 'white', textAlign: 'center' }}>{formatFileSize(file.size)}</div>
              <button onClick={() => removeFile(idx)} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239,68,68,0.9)', border: 'none', color: 'white', fontSize: 10, cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={pendingFiles.length === 0 || encrypting} style={{ flex: 1, padding: 12, background: pendingFiles.length > 0 ? 'var(--color-primary)' : 'var(--color-surface-variant)', border: 'none', borderRadius: 8, color: pendingFiles.length > 0 ? 'var(--color-on-primary)' : 'var(--color-text-tertiary)', cursor: pendingFiles.length > 0 ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600 }}>{encrypting ? '🔒 Encrypting...' : 'Send (' + pendingFiles.length + ')'}</button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
