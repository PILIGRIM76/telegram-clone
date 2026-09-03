// v3.0 Phase 2C: FavoritesView - С‚РѕР»СЊРєРѕ verified РєРѕРЅС‚Р°РєС‚С‹.
// Р­С‚Рѕ security-С„РёС‡Р°: СЃС‚РёРјСѓР»РёСЂСѓРµС‚ РёСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ Verify (anti-MITM).
// Verified РєРѕРЅС‚Р°РєС‚ = РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃСЂР°РІРЅРёР» fingerprint = Р·Р°С‰РёС‰С‘РЅ РѕС‚ MITM.

import React from 'react';
import { LeftAppBar } from './LeftAppBar';
import { TabletTabBar, type TabView } from './TabletTabBar';
import { AnimatedAvatar } from './AnimatedAvatar';

interface Contact {
  uid: string;
  name: string;
  verified?: boolean;
}

interface FavoritesViewProps {
  contacts: Contact[];
  onSelectContact: (uid: string) => void;
  onViewChange: (view: TabView) => void;
}

const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
};
const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'transparent';
};

export const FavoritesView: React.FC<FavoritesViewProps> = ({ contacts, onSelectContact, onViewChange }) => {
  const favorites = contacts.filter((c) => c.verified);

  return (
    <div data-testid="favorites-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg-primary)' } as React.CSSProperties}>
      <LeftAppBar title="РР·Р±СЂР°РЅРЅРѕРµ" onMenuClick={() => console.log('[PILIGRIM] Drawer (Phase 2D)')} onSearchClick={() => console.log('[PILIGRIM] Search (Phase 2E)')} />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 } as React.CSSProperties}>
        {favorites.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 12, padding: 24, textAlign: 'center' } as React.CSSProperties}>
            <div style={{ fontSize: 48 } as React.CSSProperties}>{'\u2B50'}</div>
            <div style={{ fontSize: 16, fontWeight: 500 } as React.CSSProperties}>РџРѕРєР° РЅРµС‚ РёР·Р±СЂР°РЅРЅС‹С…</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320 } as React.CSSProperties}>Р’РµСЂРёС„РёС†РёСЂСѓР№С‚Рµ РєРѕРЅС‚Р°РєС‚ (CheckCircleIcon РІ С‡Р°С‚Рµ), С‡С‚РѕР±С‹ РґРѕР±Р°РІРёС‚СЊ РµРіРѕ РІ РёР·Р±СЂР°РЅРЅРѕРµ. Р­С‚Рѕ Р·Р°С‰РёС‰Р°РµС‚ РѕС‚ MITM-Р°С‚Р°Рє.</div>
          </div>
        ) : favorites.map((contact) => (
          <div key={contact.uid} data-testid={'favorite-' + contact.uid} onClick={() => onSelectContact(contact.uid)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 150ms ease-out' } as React.CSSProperties} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <AnimatedAvatar name={contact.name} size={44} />
            <div style={{ flex: 1, minWidth: 0 } as React.CSSProperties}>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties}>
                {contact.name}
                <span style={{ fontSize: 14 } as React.CSSProperties}>{'\u2705'}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 } as React.CSSProperties}>Р’РµСЂРёС„РёС†РёСЂРѕРІР°РЅ</div>
            </div>
            <div style={{ fontSize: 18, color: 'var(--color-text-secondary)' } as React.CSSProperties}>{'\u2B50'}</div>
          </div>
        ))}
      </div>
      <TabletTabBar activeView="favorites" onViewChange={onViewChange} />
    </div>
  );
};
