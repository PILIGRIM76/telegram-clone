import { logger } from '../services/logger'; // Этап 2C: отображаются только проверенные контакты.
// Это security-фича: стимулирует использование Verify (anti-MITM).
// Контакт считается проверенным после сравнения отпечатков; это защищает от атак посредника.

import React from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { LeftAppBar } from './LeftAppBar';
import { TabletTabBar, type TabView } from './TabletTabBar';

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

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  contacts,
  onSelectContact,
  onViewChange,
}) => {
  const favorites = contacts.filter(c => c.verified);

  return (
    <div
      data-testid="favorites-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-bg-primary)',
      }}
    >
      <LeftAppBar
        title="РР·Р±СЂР°РЅРЅРѕРµ"
        onMenuClick={() => window.dispatchEvent(new CustomEvent('piligrim:open-drawer'))}
        onSearchClick={() => logger.info('[PILIGRIM] Search (Phase 2E)')}
      />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {favorites.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
              gap: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48 }}>{'\u2B50'}</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>РџРѕРєР° РЅРµС‚ РёР·Р±СЂР°РЅРЅС‹С…</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320 }}>
              Р’РµСЂРёС„РёС†РёСЂСѓР№С‚Рµ РєРѕРЅС‚Р°РєС‚ (CheckCircleIcon РІ С‡Р°С‚Рµ), С‡С‚РѕР±С‹
              РґРѕР±Р°РІРёС‚СЊ РµРіРѕ РІ РёР·Р±СЂР°РЅРЅРѕРµ. Р­С‚Рѕ Р·Р°С‰РёС‰Р°РµС‚ РѕС‚
              MITM-Р°С‚Р°Рє.
            </div>
          </div>
        ) : (
          favorites.map(contact => (
            <div
              key={contact.uid}
              data-testid={'favorite-' + contact.uid}
              onClick={() => onSelectContact(contact.uid)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'background 150ms ease-out',
              }}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              <AnimatedAvatar name={contact.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--color-text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {contact.name}
                  <span style={{ fontSize: 14 }}>{'\u2705'}</span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    marginTop: 2,
                  }}
                >
                  Р’РµСЂРёС„РёС†РёСЂРѕРІР°РЅ
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>{'\u2B50'}</div>
            </div>
          ))
        )}
      </div>
      <TabletTabBar activeView="favorites" onViewChange={onViewChange} />
    </div>
  );
};
