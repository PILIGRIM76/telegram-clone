import { logger } from '../services/logger';
// GiftsPanel — Telegram-style отправка подарков.
// Inline styles (WebView RT9-friendly). Использует channelService.
import React, { useEffect, useState } from 'react';
import { channelService, type GiftItem } from '../services/channelService';

interface GiftsPanelProps {
  fromUid: string;
  toUid: string;
  onClose: () => void;
  onSent?: () => void;
}

export const GiftsPanel: React.FC<GiftsPanelProps> = ({ fromUid, toUid, onClose, onSent }) => {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { channelService.giftCatalog().then(setGifts).catch(() => setGifts([])); }, []);

  const send = async (g: GiftItem) => {
    setBusy(true);
    try {
      await channelService.sendGift(g.id, fromUid, toUid, msg);
      onSent?.();
      onClose();
    } catch (e) {
      logger.warn('[GiftsPanel] send failed', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={head}>
          <strong style={{ fontSize: 15 }}>🎁 Подарки</strong>
          <button onClick={onClose} aria-label="Закрыть" style={closeBtn}>×</button>
        </div>
        <input
          placeholder="Сообщение (необязательно)"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          style={input}
        />
        <div style={grid}>
          {gifts.map((g) => (
            <button key={g.id} onClick={() => send(g)} disabled={busy} style={giftCard}>
              <div style={{ fontSize: 34 }}>{g.emoji}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{g.name}</div>
              {g.price ? (
                <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {g.price} {g.currency}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: 'var(--color-accent)', marginTop: 2 }}>бесплатно</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
};
const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 480, background: 'var(--color-bg-primary)',
  borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '70vh', overflowY: 'auto',
};
const head: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 };
const closeBtn: React.CSSProperties = { background: 'transparent', border: 'none', fontSize: 22, color: 'var(--color-text-secondary)', cursor: 'pointer' };
const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'var(--color-surface)', fontSize: 14, marginBottom: 12 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 };
const giftCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.06)', background: 'var(--color-surface)', cursor: 'pointer',
};
