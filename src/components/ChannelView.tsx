import { logger } from '../services/logger';
// ChannelView — лента постов канала + публикация (для owner/admin),
// отправка подарка и управление создателя. Inline styles (RT9-safe).
import React, { useEffect, useState } from 'react';
import { channelService, type ChannelPost, type PublicChannel } from '../services/channelService';
import { GiftsPanel } from './GiftsPanel';
import { CreatorManagePanel } from './CreatorManagePanel';

interface ChannelViewProps {
  channel: PublicChannel;
  myUid: string;     // текущий пользователь (для проверки прав на пост)
  onBack: () => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({ channel, myUid, onBack }) => {
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const isAdmin = channel.ownerId === myUid; // упрощённо: owner может постить/управлять

  const load = () => channelService.getPosts(channel.id).then(setPosts).catch(() => setPosts([]));
  useEffect(() => { load(); }, [channel.id]);

  const publish = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await channelService.post(channel.id, myUid, text.trim());
      setText('');
      load();
    } catch (e) { logger.warn('[ChannelView] post failed', e); }
    finally { setBusy(false); }
  };

  return (
    <div style={wrap}>
      <div style={appbar}>
        <button onClick={onBack} aria-label="Назад" style={backBtn}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{channel.title}{channel.verified ? ' ✓' : ''}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {channel.subscriberCount} подписчиков · {channel.postCount} постов
          </div>
        </div>
        <button onClick={() => setShowManage(true)} style={iconBtn} aria-label="Управление">⚙️</button>
      </div>

      <div style={feed}>
        {posts.length === 0 ? (
          <div style={empty}>В канале пока нет постов.</div>
        ) : (
          posts.slice().reverse().map((p) => (
            <div key={p.id} style={postCard}>
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{p.text}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {new Date(p.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {isAdmin && (
        <div style={composer}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Написать пост…"
            rows={2}
            style={ta}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={() => setShowGifts(true)} style={ghostBtn}>🎁 Подарок</button>
            <button onClick={publish} disabled={busy || !text.trim()} style={primaryBtn}>Опубликовать</button>
          </div>
        </div>
      )}

      {showGifts && (
        <GiftsPanel fromUid={myUid} toUid={channel.ownerId} onClose={() => setShowGifts(false)} onSent={load} />
      )}
      {showManage && (
        <CreatorManagePanel channelId={channel.id} ownerId={channel.ownerId} onClose={() => setShowManage(false)} />
      )}
    </div>
  );
};

const wrap: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--color-bg-primary)' };
const appbar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.05)' };
const backBtn: React.CSSProperties = { background: 'transparent', border: 'none', fontSize: 26, color: 'var(--color-accent)', cursor: 'pointer', lineHeight: 1 };
const iconBtn: React.CSSProperties = { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' };
const feed: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 };
const empty: React.CSSProperties = { textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 40, fontSize: 14 };
const postCard: React.CSSProperties = { background: 'var(--color-surface)', borderRadius: 12, padding: 12, marginBottom: 10 };
const composer: React.CSSProperties = { borderTop: '1px solid rgba(0,0,0,0.05)', padding: 12, background: 'var(--color-bg-primary)' };
const ta: React.CSSProperties = { width: '100%', resize: 'none', padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'var(--color-surface)', fontSize: 14, fontFamily: 'inherit' };
const ghostBtn: React.CSSProperties = { padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, cursor: 'pointer' };
const primaryBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, cursor: 'pointer' };
