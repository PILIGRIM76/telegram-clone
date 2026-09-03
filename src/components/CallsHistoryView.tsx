// v3.0 Phase 2C: CallsHistoryView - РёСЃС‚РѕСЂРёСЏ Р·РІРѕРЅРєРѕРІ (tablet).
// Phase 4+ РїРѕРґРєР»СЋС‡РёС‚ СЂРµР°Р»СЊРЅСѓСЋ РёСЃС‚РѕСЂРёСЋ РёР· WebRTC (useCallHistory hook).

import React from 'react';
import { LeftAppBar } from './LeftAppBar';
import { TabletTabBar, type TabView } from './TabletTabBar';
import { AnimatedAvatar } from './AnimatedAvatar';

interface CallRecord {
  id: string;
  contactName: string;
  type: 'incoming' | 'outgoing' | 'missed';
  isVideo: boolean;
  timestamp: string;
  duration?: number;
}

interface CallsHistoryViewProps {
  onViewChange: (view: TabView) => void;
}

const DEMO_CALLS: CallRecord[] = [
  { id: '1', contactName: 'РђРЅРґСЂРµР№ РџРµС‚СЂРѕРІ', type: 'outgoing', isVideo: true, timestamp: 'РЎРµРіРѕРґРЅСЏ, 14:30', duration: 320 },
  { id: '2', contactName: 'РњР°СЂРёСЏ РљРѕР·Р»РѕРІР°', type: 'missed', isVideo: false, timestamp: 'РЎРµРіРѕРґРЅСЏ, 11:15' },
  { id: '3', contactName: 'РРІР°РЅ Р“СЂРѕРјРѕРІ', type: 'incoming', isVideo: true, timestamp: 'Р’С‡РµСЂР°, 19:42', duration: 1245 },
  { id: '4', contactName: 'РћР»СЊРіР° РЎРµСЂРѕРІР°', type: 'missed', isVideo: true, timestamp: 'Р’С‡РµСЂР°, 16:20' },
  { id: '5', contactName: 'Р”РјРёС‚СЂРёР№ РќРѕСЃРѕРІ', type: 'outgoing', isVideo: false, timestamp: '2 РґРЅСЏ РЅР°Р·Р°Рґ', duration: 67 },
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

export const CallsHistoryView: React.FC<CallsHistoryViewProps> = ({ onViewChange }) => {
  return (
    <div data-testid="calls-history-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg-primary)' } as React.CSSProperties}>
      <LeftAppBar title="Р—РІРѕРЅРєРё" onMenuClick={() => window.dispatchEvent(new CustomEvent('piligrim:open-drawer'))} onSearchClick={() => console.log('[PILIGRIM] Search (Phase 2E)')} />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 } as React.CSSProperties}>
        {DEMO_CALLS.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', gap: 12, padding: 24, textAlign: 'center' } as React.CSSProperties}>
            <div style={{ fontSize: 48 } as React.CSSProperties}>{'\u{1F4DE}'}</div>
            <div style={{ fontSize: 16, fontWeight: 500 } as React.CSSProperties}>РќРµС‚ Р·РІРѕРЅРєРѕРІ</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 } as React.CSSProperties}>РќР°С‡РЅРёС‚Рµ РїРµСЂРІС‹Р№ Р·РІРѕРЅРѕРє РёР· С‡Р°С‚Р°</div>
          </div>
        ) : DEMO_CALLS.map((call) => (
          <div key={call.id} data-testid={'call-record-' + call.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'background 150ms ease-out' } as React.CSSProperties} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
            <AnimatedAvatar name={call.contactName} size={44} />
            <div style={{ flex: 1, minWidth: 0 } as React.CSSProperties}>
              <div style={{ fontSize: 16, fontWeight: 500, color: call.type === 'missed' ? '#EF4444' : 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties}>{call.contactName}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 } as React.CSSProperties}>
                <span style={{ color: call.type === 'missed' ? '#EF4444' : call.type === 'outgoing' ? '#38A169' : 'var(--color-text-secondary)', fontWeight: 600 } as React.CSSProperties}>{call.type === 'outgoing' ? '\u2197' : call.type === 'incoming' ? '\u2199' : '\u2715'}</span>
                <span>{call.isVideo ? 'Р’РёРґРµРѕ' : 'РђСѓРґРёРѕ'}</span>
                {call.duration ? <span>{'\u00B7 ' + formatDuration(call.duration)}</span> : null}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 } as React.CSSProperties}>{call.timestamp}</div>
          </div>
        ))}
      </div>
      <TabletTabBar activeView="calls" onViewChange={onViewChange} />
    </div>
  );
};
