import React from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { LeftAppBar } from './LeftAppBar';

interface Contact {
  uid: string;
  name: string;
  verified?: boolean;
}

interface FavoritesViewProps {
  contacts: Contact[];
  onSelectContact: (uid: string) => void;
  onSearchClick?: () => void;
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
  onSearchClick,
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
        title="Избранное"
        onMenuClick={() => window.dispatchEvent(new CustomEvent('piligrim:open-drawer'))}
        onSearchClick={() => onSearchClick?.()}
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
            <div style={{ fontSize: 16, fontWeight: 500 }}>Пока нет избранных</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, maxWidth: 320 }}>
              Верифицируйте контакт (значок CheckCircle в чате), чтобы добавить его в избранное. Это
              защищает от MITM-атак.
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
                  Верифицирован
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>{'\u2B50'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
