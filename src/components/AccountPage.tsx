import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccentColor } from '../hooks/useAccentColor';
import AnimatedAvatar from './AnimatedAvatar';
import {
  ArrowLeftIcon, ShieldIcon, KeyIcon, CopyIcon,
  DatabaseIcon, LogoutIcon, CheckIcon
} from './icons';

interface AccountPageProps {
  user: {
    name: string;
    uid: string;
    e2eeStatus: 'verified' | 'pending' | 'unverified';
  };
  onBack: () => void;
  onLogout: () => void;
  onBackupSeed: () => void;
}

const AccountPage: React.FC<AccountPageProps> = ({
  user, onBack, onLogout, onBackupSeed,
}) => {
  const theme = useAccentColor();
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch (e) {
      console.error('[PILIGRIM] Clipboard failed:', e);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '20px', marginBottom: 16,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <h3 style={{
        margin: '0 0 16px', fontSize: 12, fontWeight: 600,
        color: 'rgba(252,249,247,0.5)', fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase', letterSpacing: 1,
      }}>{title}</h3>
      {children}
    </div>
  );

  const MenuItem = ({ icon, label, subLabel, onClick, danger, toggle, isOn }: any) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 0', cursor: onClick ? 'pointer' : 'default',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      transition: 'opacity 0.2s ease',
    }}
    onMouseEnter={(e) => { if (onClick) e.currentTarget.style.opacity = '0.7'; }}
    onMouseLeave={(e) => { if (onClick) e.currentTarget.style.opacity = '1'; }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: danger ? 'rgba(239,68,68,0.1)' : theme.color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#EF4444' : theme.color, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: danger ? '#EF4444' : '#FCF9F7',
          fontFamily: 'Inter, sans-serif',
        }}>{label}</div>
        {subLabel && (
          <div style={{
            fontSize: 12, color: 'rgba(252,249,247,0.5)',
            fontFamily: 'Inter, sans-serif', marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{subLabel}</div>
        )}
      </div>
      {toggle && (
        <div style={{
          width: 44, height: 24, borderRadius: 12,
          background: isOn ? theme.color : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.3s ease', flexShrink: 0,
        }}>
          <div style={{
            position: 'absolute', top: 2, left: isOn ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
            transition: 'left 0.3s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }} />
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, overflowY: 'auto',
        padding: '24px 16px', background: '#0D0C0F',
        boxSizing: 'border-box', zIndex: 100,
      }}
      data-testid="account-page"
    >
      <button onClick={onBack} style={{
        background: 'none', border: 'none',
        color: 'rgba(252,249,247,0.6)', display: 'flex',
        alignItems: 'center', gap: 8, fontSize: 14,
        fontFamily: 'Inter, sans-serif', cursor: 'pointer',
        padding: '0 0 24px 0',
      }}>
        <ArrowLeftIcon className="w-5 h-5" /> Назад
      </button>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'inline-block', marginBottom: 16 }}>
          <AnimatedAvatar
            name={user.name}
            e2eeStatus={user.e2eeStatus}
            size={80}
            accentColor={theme.color}
          />
        </div>
        <h1 style={{
          margin: '0 0 8px', fontSize: 24, fontWeight: 600,
          color: '#FCF9F7', fontFamily: 'Inter, sans-serif',
        }}>{user.name}</h1>
        <div onClick={handleCopyUid} data-testid="account-uid-copy" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer', transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.color + '50'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}>
          <span style={{
            fontSize: 12, color: 'rgba(252,249,247,0.6)',
            fontFamily: 'JetBrains Mono, monospace',
          }}>{user.uid.slice(0, 16)}...</span>
          {copiedUid ? (
            <CheckIcon size={14} color="#4CAF50" />
          ) : (
            <CopyIcon size={14} color="rgba(252,249,247,0.4)" />
          )}
        </div>
      </div>

      <Section title="Криптография">
        <MenuItem icon={<KeyIcon size={20} />}
          label="Резервная копия Seed-фразы"
          subLabel="Необходимо для восстановления"
          onClick={onBackupSeed} />
        <MenuItem icon={<ShieldIcon size={20} />}
          label="Двухфакторная аутентификация"
          subLabel="Включена"
          toggle isOn={true} />
        <MenuItem icon={<ShieldIcon size={20} />}
          label="Статус TOFU"
          subLabel={'Ключи ' + (user.e2eeStatus === 'verified' ? 'верифицированы' : 'ожидают проверки')} />
      </Section>

      <Section title="Второй мозг">
        <MenuItem icon={<DatabaseIcon size={20} />}
          label="Obsidian Quick-Capture"
          subLabel="Автосохранение важных сообщений"
          toggle isOn={true} />
      </Section>

      <Section title="Система">
        <MenuItem icon={<DatabaseIcon size={20} />}
          label="Версия протокола"
          subLabel="v3.0-phase4 (E2EE + WebRTC)" />
      </Section>

      <div style={{ marginTop: 32, paddingBottom: 32 }}>
        <button onClick={onLogout} data-testid="account-logout" style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#EF4444', fontSize: 14, fontWeight: 600,
          fontFamily: 'Inter, sans-serif', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}>
          <LogoutIcon size={18} /> Выйти из аккаунта
        </button>
        <p style={{
          textAlign: 'center', fontSize: 11,
          color: 'rgba(252,249,247,0.3)',
          fontFamily: 'Inter, sans-serif', marginTop: 12, lineHeight: 1.4,
        }}>
          При выходе локальные ключи будут удалены.<br />
          Убедитесь, что вы сохранили Seed-фразу.
        </p>
      </div>
    </motion.div>
  );
};

export default AccountPage;

