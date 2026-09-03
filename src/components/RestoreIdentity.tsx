// v3.0 Restore Identity: восстановление identity из 12-словной seed-phrase.
// Aurora design system. Inline styles (WebView on RT9). 3x4 grid input layout.

import React, { useState, useRef, useEffect } from 'react';
import { restoreIdentityFromSeed } from '../services/cryptoService';

interface RestoreIdentityProps {
  onRestore: (identity: any) => void;
  onBack: () => void;
}

export const RestoreIdentity: React.FC<RestoreIdentityProps> = ({ onRestore, onBack }) => {
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [error, setError] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    if (value.includes(' ')) {
      const parts = value.split(/\s+/).filter(p => p.length > 0);
      newWords[index] = (parts[0] || '').toLowerCase();
      let cursor = index + 1;
      for (let i = 1; i < parts.length && cursor < 12; i++, cursor++) {
        newWords[cursor] = parts[i].toLowerCase();
      }
      setWords(newWords);
      setError('');
      const nextEmpty = newWords.findIndex((w, i) => i > index && w === '');
      const targetIdx = nextEmpty !== -1 ? nextEmpty : Math.min(cursor, 11);
      setTimeout(() => inputRefs.current[targetIdx]?.focus(), 0);
      return;
    }
    newWords[index] = value.toLowerCase();
    setWords(newWords);
    setError('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && index < 11) { e.preventDefault(); inputRefs.current[index + 1]?.focus(); }
    if (e.key === 'Backspace' && words[index] === '' && index > 0) { e.preventDefault(); inputRefs.current[index - 1]?.focus(); }
    if (e.key === 'ArrowRight' && index < 11) { e.preventDefault(); inputRefs.current[index + 1]?.focus(); }
    if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); inputRefs.current[index - 1]?.focus(); }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedWords = pastedText.trim().split(/\s+/).slice(0, 12);
    const newWords = [...words];
    pastedWords.forEach((word, i) => { if (i < 12) newWords[i] = word.toLowerCase(); });
    setWords(newWords);
    const nextEmptyIndex = newWords.findIndex(w => w === '');
    if (nextEmptyIndex !== -1) inputRefs.current[nextEmptyIndex]?.focus();
    else inputRefs.current[11]?.focus();
  };

  const handleRestore = async () => {
    const emptyIndices = words.reduce((acc: number[], word, i) => {
      if (!word || word.length === 0) acc.push(i + 1);
      return acc;
    }, []);
    if (emptyIndices.length > 0) { setError('Заполните слова: ' + emptyIndices.join(', ')); return; }
    setIsRestoring(true); setError('');
    try {
      const identity = await restoreIdentityFromSeed(words);
      onRestore(identity);
    } catch (err) {
      console.error('[PILIGRIM] Restore identity failed:', err);
      setError(err instanceof Error ? err.message : 'Неверная seed-phrase. Проверьте слова.');
    } finally { setIsRestoring(false); }
  };

  const allWordsFilled = words.every(w => w && w.length > 0);

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '8px 12px',
    border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12,
    fontSize: 14, fontFamily: 'inherit',
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    outline: 'none',
    transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
    boxSizing: 'border-box',
  };

  return (
    <div data-testid="restore-identity-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-bg-primary)' } as React.CSSProperties}>
      <div style={{ width: '100%', maxWidth: 500, background: 'var(--color-surface)', borderRadius: 24, padding: 32, boxShadow: 'var(--shadow-floating, 0px 12px 40px rgba(0,0,0,0.15))' } as React.CSSProperties}>
        <button onClick={onBack} data-testid="restore-back" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 } as React.CSSProperties}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Назад
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8, letterSpacing: '-0.3px' } as React.CSSProperties}>Восстановление личности</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 } as React.CSSProperties}>Введите 12 слов seed-phrase, которые вы сохранили при создании личности.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 } as React.CSSProperties}>
          {words.map((word, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600, pointerEvents: 'none', zIndex: 1 } as React.CSSProperties}>{index + 1}</div>
              <input ref={(el) => { inputRefs.current[index] = el; }} type="text" value={word} onChange={(e) => handleWordChange(index, e.target.value)} onKeyDown={(e) => handleKeyDown(index, e)} onPaste={index === 0 ? handlePaste : undefined} placeholder="слово" data-testid={'restore-word-' + (index + 1)} style={{ ...inputStyle, paddingLeft: 32 } as React.CSSProperties} onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-glow, rgba(232, 106, 88, 0.5))'; }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            </div>
          ))}
        </div>
        {error && (<div data-testid="restore-error" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#EF4444', fontSize: 14, marginBottom: 16 } as React.CSSProperties}>{error}</div>)}
        <button onClick={handleRestore} disabled={!allWordsFilled || isRestoring} data-testid="restore-submit" style={{ width: '100%', height: 48, background: allWordsFilled && !isRestoring ? 'linear-gradient(135deg, var(--color-primary-start, #E86A58), var(--color-primary-end, #B388EB))' : 'rgba(0,0,0,0.1)', color: allWordsFilled ? 'white' : 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: allWordsFilled && !isRestoring ? 'pointer' : 'not-allowed', transition: 'all 200ms ease-out', boxShadow: allWordsFilled ? 'var(--shadow-floating, 0px 12px 40px rgba(232, 106, 88, 0.15))' : 'none' } as React.CSSProperties}>{isRestoring ? 'Восстановление...' : 'Восстановить личность'}</button>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 } as React.CSSProperties}>Совет: вы можете вставить все 12 слов сразу в первое поле</p>
      </div>
    </div>
  );
};
