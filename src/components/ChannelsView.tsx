import { logger } from '../services/logger';
// Экран каналов в стиле Telegram: лента каналов,
// создание канала и переход к его просмотру. Встроенные стили совместимы с RT9.
import React, { useEffect, useState } from 'react';
import { channelService, type PublicChannel } from '../services/channelService';
import { ChannelView } from './ChannelView';

function getMyUid(): string {
  try {
    const raw = localStorage.getItem('piligrim-identity');
    if (raw) {
      const identity = JSON.parse(raw) as { uid?: unknown };
      return typeof identity.uid === 'string' ? identity.uid : 'local-user';
    }
  } catch (error) {
    logger.warn('[ChannelsView] failed to read local identity', error);
  }
  return 'local-user';
}

interface ChannelsViewProps {
  onBack: () => void;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({ onBack }) => {
  const [channels, setChannels] = useState<PublicChannel[]>([]);
  const [open, setOpen] = useState<PublicChannel | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const myUid = getMyUid();

  const load = async () => {
    try {
      setChannels(await channelService.listChannels());
      setError(null);
    } catch (loadError) {
      logger.warn('[ChannelsView] failed to load channels', loadError);
      setError('Не удалось загрузить каналы. Проверьте подключение и повторите попытку.');
    }
  };
  useEffect(() => {
    void channelService
      .listChannels()
      .then(setChannels)
      .catch(loadError => {
        logger.warn('[ChannelsView] failed to load channels', loadError);
        setError('Не удалось загрузить каналы. Проверьте подключение и повторите попытку.');
      });
  }, []);

  const create = async () => {
    if (!title.trim()) {
      setError('Введите название канала.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await channelService.createChannel(title.trim(), myUid, desc.trim());
      setTitle('');
      setDesc('');
      setCreating(false);
      await load();
    } catch (createError) {
      logger.warn('[ChannelsView] create failed', createError);
      setError('Не удалось создать канал. Проверьте подключение и повторите попытку.');
    } finally {
      setBusy(false);
    }
  };

  if (open)
    return (
      <ChannelView
        channel={open}
        myUid={myUid}
        onBack={() => {
          setOpen(null);
          void load();
        }}
      />
    );

  return (
    <div style={wrap}>
      <div style={appbar}>
        <button onClick={onBack} aria-label="Назад к чатам" style={backBtn}>
          ‹
        </button>
        <strong style={{ flex: 1, fontSize: 16 }}>📺 Каналы</strong>
        <button onClick={() => setCreating(v => !v)} style={createBtn}>
          + Создать
        </button>
      </div>

      {creating && (
        <form
          style={createBox}
          onSubmit={event => {
            event.preventDefault();
            void create();
          }}
        >
          <input
            value={title}
            onChange={event => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Название канала"
            aria-label="Название канала"
            aria-invalid={error === 'Введите название канала.'}
            style={input}
          />
          <input
            value={desc}
            onChange={event => setDesc(event.target.value)}
            placeholder="Описание (необязательно)"
            aria-label="Описание (необязательно)"
            style={input}
          />
          <div style={formActions}>
            <button type="button" onClick={() => setCreating(false)} style={cancelBtn}>
              Отмена
            </button>
            <button type="submit" disabled={busy} style={primaryBtn}>
              {busy ? 'Создание…' : 'Создать канал'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div role="alert" style={errorMessage}>
          {error}
          {!creating && error.startsWith('Не удалось загрузить') && (
            <button onClick={() => void load()} style={retryBtn}>
              Повторить
            </button>
          )}
        </div>
      )}

      <div style={list}>
        {channels.length === 0 ? (
          <div style={empty}>Каналов пока нет. Создайте первый!</div>
        ) : (
          channels.map(c => (
            <button key={c.id} onClick={() => setOpen(c)} style={item}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--color-accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                {c.avatar ? (
                  <img src={c.avatar} alt="" style={{ width: 44, height: 44, borderRadius: 12 }} />
                ) : (
                  c.title[0] || '📺'
                )}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {c.title}
                  {c.verified ? ' ✓' : ''}
                </div>
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

const wrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  background: 'var(--color-bg-primary)',
};
const appbar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '12px 14px',
  borderBottom: '1px solid rgba(0,0,0,0.05)',
};
const backBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--color-accent)',
  cursor: 'pointer',
  fontSize: 26,
  lineHeight: 1,
  padding: '0 4px',
};
const createBtn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer',
};
const createBox: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid rgba(0,0,0,0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};
const formActions: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
};
const input: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'var(--color-surface)',
  fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: 14,
  cursor: 'pointer',
};
const cancelBtn: React.CSSProperties = {
  ...primaryBtn,
  background: 'transparent',
  color: 'var(--color-text-primary)',
};
const retryBtn: React.CSSProperties = {
  ...primaryBtn,
  marginLeft: 8,
};
const errorMessage: React.CSSProperties = {
  color: 'var(--color-danger)',
  fontSize: 13,
  padding: '8px 14px',
};
const list: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: 12, minHeight: 0 };
const empty: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--color-text-secondary)',
  marginTop: 40,
  fontSize: 14,
};
const item: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  width: '100%',
  padding: 10,
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.05)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  textAlign: 'left',
};
