import { logger } from '../services/logger'; // Этап 2C: история звонков для планшетов.
// На следующем этапе здесь появится история звонков из WebRTC через useCallHistory.

import React from 'react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { LeftAppBar } from './LeftAppBar';

interface CallRecord {
  id: string;
  contactName: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  timestamp: string;
  duration?: number;
}

const DEMO_CALLS: CallRecord[] = [
  {
    id: '1',
    contactName: 'Андрей Петров',
    type: 'outgoing',
    isVideo: true,
    timestamp: 'Сегодня, 14:30',
    duration: 320,
  },
  {
    id: '2',
    contactName: 'Мария Козлова',
    type: 'missed',
    isVideo: false,
    timestamp: 'Сегодня, 11:15',
  },
  {
    id: '3',
    contactName: 'Иван Громов',
    type: 'incoming',
    isVideo: true,
    timestamp: 'Вчера, 19:42',
    duration: 1245,
  },
  {
    id: '4',
    contactName: 'Ольга Серова',
    type: 'missed',
    isVideo: true,
    timestamp: 'Вчера, 16:20',
  },
  {
    id: '5',
    contactName: 'Дмитрий Носов',
    type: 'outgoing',
    isVideo: false,
    timestamp: '2 дня назад',
    duration: 67,
  },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + s.toString().padStart(2, '0');
}

const handleEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
};
const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.background = 'transparent';
};

export const CallsHistoryView: React.FC = () => {
  return (
    <div
      data-testid="calls-history-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-bg-primary)',
      }}
    >
      <LeftAppBar
        title="Звонки"
        onMenuClick={() => window.dispatchEvent(new CustomEvent('piligrim:open-drawer'))}
        onSearchClick={() => logger.info('[PILIGRIM] Search (Phase 2E)')}
      />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {DEMO_CALLS.length === 0 ? (
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
            <div style={{ fontSize: 48 }}>{'\u{1F4DE}'}</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Нет звонков</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>Начните первый звонок из чата</div>
          </div>
        ) : (
          DEMO_CALLS.map(call => (
            <div
              key={call.id}
              data-testid={'call-record-' + call.id}
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
              <AnimatedAvatar name={call.contactName} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: call.type === 'missed' ? '#EF4444' : 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {call.contactName}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <span
                    style={{
                      color:
                        call.type === 'missed'
                          ? '#EF4444'
                          : call.type === 'outgoing'
                            ? '#38A169'
                            : 'var(--color-text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {call.type === 'outgoing'
                      ? '\u2197'
                      : call.type === 'incoming'
                        ? '\u2199'
                        : '\u2715'}
                  </span>
                  <span>{call.isVideo ? 'Видео' : 'Аудио'}</span>
                  {call.duration ? <span>{'\u00B7 ' + formatDuration(call.duration)}</span> : null}
                </div>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  flexShrink: 0,
                }}
              >
                {call.timestamp}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
