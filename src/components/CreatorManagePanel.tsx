// CreatorManagePanel — управление каналом создателем:
// назначение/снятие админов, передача владения. Inline styles (RT9-safe).
import React, { useState } from 'react';

interface CreatorManagePanelProps {
  channelId: string;
  ownerId: string;
  onClose: () => void;
  onChanged?: () => void;
}

const API_BASE = 'http://192.168.100.4:4000';

export const CreatorManagePanel: React.FC<CreatorManagePanelProps> = ({ channelId, ownerId, onClose, onChanged }) => {
  const [adminUid, setAdminUid] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const call = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.ошибка || j.error || 'Ошибка');
      setInfo('✅ ' + (j.ok ? 'Выполнено' : 'Готово'));
      onChanged?.();
    } catch (e: any) {
      setInfo('❌ ' + (e?.message || 'Ошибка'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={head}>
          <strong style={{ fontSize: 15 }}>⚙️ Управление каналом</strong>
          <button onClick={onClose} aria-label="Закрыть" style={closeBtn}>×</button>
        </div>

        <div style={sectionLabel}>Назначить администратора</div>
        <div style={row}>
          <input value={adminUid} onChange={(e) => setAdminUid(e.target.value)} placeholder="UID админа" style={input} />
          <button disabled={busy} onClick={() => call('/channels/admin/add', { channelId, ownerId, adminUid })} style={btn}>Назначить</button>
        </div>

        <div style={sectionLabel}>Передать владение</div>
        <div style={row}>
          <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} placeholder="UID нового владельца" style={input} />
          <button disabled={busy} onClick={() => call('/channels/transfer', { channelId, ownerId, newOwnerUid: newOwner })} style={btn}>Передать</button>
        </div>

        {info ? <div style={{ marginTop: 12, fontSize: 13 }}>{info}</div> : null}
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
};
const sheet: React.CSSProperties = { width: '100%', maxWidth: 420, background: 'var(--color-bg-primary)', borderRadius: 16, padding: 18 };
const head: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 };
const closeBtn: React.CSSProperties = { background: 'transparent', border: 'none', fontSize: 22, color: 'var(--color-text-secondary)', cursor: 'pointer' };
const sectionLabel: React.CSSProperties = { fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 10, marginBottom: 6 };
const row: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' };
const input: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'var(--color-surface)', fontSize: 14 };
const btn: React.CSSProperties = { padding: '10px 14px', borderRadius: 10, border: 'none', background: 'var(--color-accent)', color: '#fff', fontSize: 14, cursor: 'pointer' };
