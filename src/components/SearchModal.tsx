// v3.0 Phase 2E: SearchModal - command palette (Linear/VS Code inspired).
// Keyboard-first: Ctrl+K toggle, Esc close, arrows navigate, Enter select.
// Fuzzy: substring + subsequence (case-insensitive).
// Searches: contact names, last messages, UIDs.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedAvatar } from './AnimatedAvatar';

interface SearchableContact {
  uid: string;
  name: string;
  lastMessage?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: SearchableContact[];
  onSelect: (uid: string) => void;
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();
  if (!q) return true;
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, contacts, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return contacts.slice(0, 8);
    return contacts.filter((c) => fuzzyMatch(query, c.name) || fuzzyMatch(query, c.lastMessage || '') || fuzzyMatch(query, c.uid)).slice(0, 12);
  }, [query, contacts]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results[activeIndex]) {
        onSelect(results[activeIndex].uid);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, results, activeIndex, onSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="search-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        data-testid="search-modal"
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 105, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '15vh 24px 24px' } as React.CSSProperties}
      >
        <motion.div
          key="search-panel"
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          style={{ width: '100%', maxWidth: 560, background: 'var(--color-surface)', borderRadius: 20, boxShadow: 'var(--shadow-floating)', border: '0.5px solid rgba(255,255,255,0.3)', overflow: 'hidden' } as React.CSSProperties}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', height: 56, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              placeholder="Search contacts and chats..."
              data-testid="search-input"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, color: 'var(--color-text-primary)', fontFamily: 'inherit' } as React.CSSProperties}
            />
            <kbd style={{ fontSize: 11, color: 'var(--color-text-secondary)', background: 'rgba(0,0,0,0.05)', padding: '4px 8px', borderRadius: 6, fontFamily: 'monospace' } as React.CSSProperties}>ESC</kbd>
          </div>

          <div ref={listRef} data-testid="search-results" style={{ maxHeight: 380, overflowY: 'auto', padding: 8 }}>
            {results.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 } as React.CSSProperties}>
                Nothing found for "{query}"
              </div>
            ) : (
              results.map((contact, i) => (
                <div
                  key={contact.uid}
                  data-testid={'search-result-' + contact.uid}
                  onClick={() => { onSelect(contact.uid); onClose(); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', background: i === activeIndex ? 'rgba(0,0,0,0.05)' : 'transparent', transition: 'background 100ms ease-out' } as React.CSSProperties}
                >
                  <AnimatedAvatar name={contact.name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties}>{contact.name}</div>
                    {contact.lastMessage && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties}>{contact.lastMessage}</div>
                    )}
                  </div>
                  {i === activeIndex && <kbd style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontFamily: 'monospace' } as React.CSSProperties}>Enter</kbd>}
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '8px 20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--color-text-secondary)' } as React.CSSProperties}>
            <span>up/down navigate</span>
            <span>enter open chat</span>
            <span>esc close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
