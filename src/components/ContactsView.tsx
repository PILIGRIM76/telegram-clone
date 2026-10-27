import React from 'react';
import type { Contact } from '../types';
import { AnimatedAvatar } from './AnimatedAvatar';

interface ContactsViewProps {
  contacts: Contact[];
  onBack: () => void;
  onSelectContact: (uid: string) => void;
}

const iconButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
};

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onBack,
  onSelectContact,
}) => (
  <main
    data-testid="contacts-view"
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      minHeight: 0,
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
    }}
  >
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 64,
        padding: '0 16px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <button
        type="button"
        aria-label="Назад к чатам"
        data-testid="contacts-back"
        onClick={onBack}
        style={iconButtonStyle}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Контакты</h1>
    </header>

    <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
      {contacts.length === 0 ? (
        <p
          style={{
            padding: 24,
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          Контактов пока нет
        </p>
      ) : (
        contacts.map(contact => (
          <button
            type="button"
            key={contact.id}
            onClick={() => onSelectContact(contact.uid)}
            aria-label={`Открыть чат с ${contact.name}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              minHeight: 64,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 8,
              background: 'transparent',
              color: 'inherit',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <AnimatedAvatar name={contact.name} size={48} isOnline={contact.isOnline} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{contact.name}</span>
              <span
                style={{
                  overflow: 'hidden',
                  color: 'var(--color-text-secondary)',
                  fontSize: 13,
                  textOverflow: 'ellipsis',
                }}
              >
                {contact.isOnline ? 'в сети' : contact.uid}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  </main>
);
