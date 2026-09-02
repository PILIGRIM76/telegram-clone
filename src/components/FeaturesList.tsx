// v2.0 Batch 5: FeaturesList — показывает пользователю все 11 работающих фич PILIGRIM.
// Inline styles (WebView-friendly), без зависимостей.

import React from 'react';

type Lang = 'en' | 'ru';

interface FeaturesListProps {
  lang: Lang;
}

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

const FEATURES_RU: Feature[] = [
  { icon: '🔐', title: 'Создание личности', desc: 'Генерация ключей + 12-словная seed-phrase' },
  { icon: '👥', title: 'Добавление контактов', desc: 'По UID + публичному ключу (E2EE-ready)' },
  { icon: '💬', title: 'Чат с историей', desc: 'Сообщения сохраняются локально (offline-first)' },
  { icon: '🔒', title: 'E2EE шифрование', desc: 'RSA-OAEP для localStorage + NaCl box для транспорта' },
  { icon: '🟢', title: 'Real-time WebSocket', desc: 'TLS-защищённый канал (wss://) с auto-register' },
  { icon: '📞', title: 'Видеозвонки (WebRTC)', desc: 'Камера + микрофон через нативный RTCPeerConnection' },
  { icon: '🖥️', title: 'Демонстрация экрана', desc: 'Во время звонка (только desktop Chrome/Edge)' },
  { icon: '🔇', title: 'Заглушить чат', desc: 'На 1 час / 8 часов / навсегда' },
  { icon: '📁', title: 'Архивировать чат', desc: 'Скрыть из основного списка' },
  { icon: '✅', title: 'Верификация контакта', desc: 'Fingerprint (защита от MITM-атак)' },
  { icon: '🌐', title: 'Два языка', desc: 'Русский (по умолчанию) и English' }
];

const FEATURES_EN: Feature[] = [
  { icon: '🔐', title: 'Create Identity', desc: 'Generate keys + 12-word seed phrase' },
  { icon: '👥', title: 'Add Contacts', desc: 'By UID + public key (E2EE-ready)' },
  { icon: '💬', title: 'Chat with History', desc: 'Messages stored locally (offline-first)' },
  { icon: '🔒', title: 'E2EE Encryption', desc: 'RSA-OAEP for localStorage + NaCl box for transport' },
  { icon: '🟢', title: 'Real-time WebSocket', desc: 'TLS-protected channel (wss://) with auto-register' },
  { icon: '📞', title: 'Video Calls (WebRTC)', desc: 'Camera + microphone via native RTCPeerConnection' },
  { icon: '🖥️', title: 'Screen Sharing', desc: 'During calls (desktop Chrome/Edge only)' },
  { icon: '🔇', title: 'Mute Chat', desc: 'For 1 hour / 8 hours / forever' },
  { icon: '📁', title: 'Archive Chat', desc: 'Hide from main list' },
  { icon: '✅', title: 'Verify Contact', desc: 'Fingerprint (MITM attack protection)' },
  { icon: '🌐', title: 'Two Languages', desc: 'Russian (default) and English' }
];

export const FeaturesList: React.FC<FeaturesListProps> = ({ lang }) => {
  const features = lang === 'ru' ? FEATURES_RU : FEATURES_EN;
  const title = lang === 'ru' ? '✨ Работающие функции PILIGRIM' : '✨ Available PILIGRIM Features';

  return (
    <div
      data-testid="features-list"
      style={{
        padding: '16px',
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        marginTop: '16px',
        maxWidth: '560px',
        width: '100%'
      }}
    >
      <h3
        style={{
          color: '#e2e8f0',
          marginBottom: '12px',
          fontSize: '16px',
          fontWeight: 600,
          textAlign: 'center'
        }}
      >
        {title}
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '8px'
        }}
      >
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '10px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              border: '1px solid #334155'
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0 }} aria-hidden="true">
              {f.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: '#e2e8f0',
                  fontWeight: 500,
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {f.title}
              </div>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: '11px',
                  marginTop: '2px',
                  lineHeight: 1.4
                }}
              >
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturesList;