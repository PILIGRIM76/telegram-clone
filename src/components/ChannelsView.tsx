import { logger } from '../services/logger';
// ChannelsView — экран каналов (Telegram-style): лента каналов,
// создание своего канала, переход к просмотру. Inline styles (RT9-safe).
import React, { useEffect, useState } from 'react';
import { channelService, type PublicChannel } from '../services/channelService';
import { ChannelView } from './ChannelView';

function getMyUid(): string {
  try {
    const raw = localStorage.getItem('piligrim-identity');
    if (raw) return JSON.parse(raw).uid || 'local-user';
  } catch { /* ignore */ }
  return 'local-user';
}

export const ChannelsView: React.FC = () => {
  const [channels, setChannels] = useState<PublicChannel[]>([]);
  const [open, setOpen] = useState<PublicChannel | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const myUid = getMyUid();

  const load = () => channelService.listChannels().then(setChannels).catch(() => setChannels([]));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await channelService.createChannel(title.trim(), myUid, desc.trim());
      setTitle(''); setDesc(''); setCreating(false);
      load();
    } catch (e) { logger.warn('[ChannelsView] create failed', e); }
    finally { setBusy(false); }
  };

  if (open) return <ChannelView channel={open} myUid={myUid} onBack={() => { setOpen(null); load(); }} />;

  return (
    <div style={wrap}>
      <div style={appbar}>
        <strong style={{ fontSize: 16 }}>📺 Каналы</strong>
        <button onClick={() => setCreating((v) => !v)} style={createBtn}>+ Создать</button>
      </div>

      {creating && (
        <div style={createBox}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название канала" style={input} />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Описание (необязательно)" style={input} />
          <button onClick={create} disabled={busy || !title.trim()} style={primaryBtn}>Создать канал</button>
        </div>
      )}

      <div style={list}>
        {channels.length === 0 ? (
          <div style={empty}>Каналов пока нет. Создайте первый!</div>
        ) : (
          channels.map((c) => (
            <button key={c.id} onClick={() => setOpen(c)} style={item}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {c.avatar ? <img src={c.avatar} alt="" style={{ width: 44, height: 44, borderRadius: 12 }} /> : (c.title[0] || '📺')}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}{c.verified ? ' ✓' : ''}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {c.subscriberCount} подписчиков · {c.postCount} постов
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg-primary)' };
const appbar: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.05)' };
const createBtn: React.CSSProperties = { padding: '6px 12px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 13, cursor: 'pointer' };
const createBox: React.CSSProperties = { padding: 12, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 };
const input: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'var(--color-surface)', fontSize: 14 };
const primaryBtn: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, cursor: 'pointer' };
const list: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 };
const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40, fontSize: 14 };
const item: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', width: '100%', padding: 10, borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)', background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left' };
