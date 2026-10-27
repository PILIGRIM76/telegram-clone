import React from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';

interface ProfilePanelProps {
  contactName: string;
  contactUid?: string;
  isOnline?: boolean;
  onCall?: () => void;
  onVideo?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
}

const actionBtn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'var(--color-bubble-incoming, #F0ECE9)',
  border: 'none',
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 150ms ease-out',
};

const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.transform = 'scale(1.08)';
};
const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.transform = 'scale(1)';
};

export const ProfilePanel: React.FC<ProfilePanelProps> = ({
  contactName,
  contactUid,
  isOnline,
  onCall,
  onVideo,
  onSearch,
  onClose,
}) => {
  return (
    <div
      data-testid="profile-panel-inner"
      style={{
        width: 320,
        flexShrink: 0,
        background: 'var(--color-bg-primary)',
        borderLeft: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          height: 200,
          background:
            'linear-gradient(135deg, rgba(232,106,88,0.12) 0%, rgba(179,136,235,0.10) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {onClose && (
          <button
            data-testid="profile-close"
            onClick={onClose}
            aria-label="Close profile"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
        <div
          style={{
            border: '4px solid white',
            borderRadius: '50%',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          <AnimatedAvatar name={contactName} size={88} />
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.3px',
            textAlign: 'center',
            padding: '0 16px',
          }}
        >
          {contactName}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {isOnline && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#38A169',
                display: 'inline-block',
              }}
            />
          )}
          <span>{isOnline ? 'online' : 'recently'}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          padding: '20px 0',
        }}
      >
        <button
          data-testid="profile-action-call"
          style={actionBtn}
          onClick={onCall}
          aria-label="Call"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          📞
        </button>
        <button
          data-testid="profile-action-video"
          style={actionBtn}
          onClick={onVideo}
          aria-label="Video"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          🎥
        </button>
        <button
          data-testid="profile-action-search"
          style={actionBtn}
          onClick={onSearch}
          aria-label="Search"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          🔍
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        <button
          data-testid="profile-media"
          style={{
            width: '100%',
            height: 40,
            borderRadius: 12,
            background: 'var(--color-bubble-incoming, #F0ECE9)',
            border: 'none',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          Media, files, links
        </button>
      </div>

      {contactUid && (
        <div
          data-testid="profile-uid"
          style={{
            margin: 16,
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 10,
            fontSize: 10,
            fontFamily: 'monospace',
            color: 'var(--color-text-secondary)',
            wordBreak: 'break-all',
          }}
        >
          {contactUid}
        </div>
      )}
    </div>
  );
};

export default ProfilePanel;
