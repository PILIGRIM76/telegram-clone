// v1.5.2 Stage 3: СѓРїСЂРѕС‰С‘РЅРЅС‹Р№ ChatWindow (offline-first, inline styles, Р±РµР· backend)
// Р¦РµР»СЊ: РѕС‚РѕР±СЂР°Р¶Р°С‚СЊ СЃРѕРѕР±С‰РµРЅРёСЏ, РѕС‚РїСЂР°РІР»СЏС‚СЊ С‚РµРєСЃС‚, Р°РІС‚РѕСЃРєСЂРѕР»Р» Рє РїРѕСЃР»РµРґРЅРµРјСѓ СЃРѕРѕР±С‰РµРЅРёСЋ.
// РџРѕР»РЅР°СЏ РІРµСЂСЃРёСЏ СЃ WebRTC/Timer/Export Р±СѓРґРµС‚ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅР° РІ СЃР»РµРґСѓСЋС‰РёС… СЌС‚Р°РїР°С….

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Message, Contact } from '../types';

interface ChatWindowProps {
  chatId: string;
  messages: Message[];
  onSendMessage: (text: string) => void;
  /** РћРїС†РёРѕРЅР°Р»СЊРЅРѕ: РєРѕРЅС‚Р°РєС‚/РёРјСЏ РїР°СЂС‚РЅС‘СЂР° РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ РІ header */
  partner?: Contact | { name: string };
  /** РћРїС†РёРѕРЅР°Р»СЊРЅРѕ: С‚РµРєСѓС‰РёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ (РґР»СЏ СЂР°Р·РґРµР»РµРЅРёСЏ СЃРІРѕРёС…/С‡СѓР¶РёС…) */
  currentUserUid?: string;
  /** РћРїС†РёРѕРЅР°Р»СЊРЅРѕ: РєРЅРѕРїРєР° "РќР°Р·Р°Рґ" (РґР»СЏ РјРѕР±РёР»СЊРЅРѕРіРѕ layout) */
  onBack?: () => void;
  /** Stage 6: РЅР°С‡Р°С‚СЊ Р·РІРѕРЅРѕРє (WebRTC). */
  onStartCall?: () => void;
  /** Stage 6: С‚РµРєСѓС‰РёР№ СЃС‚Р°С‚СѓСЃ Р·РІРѕРЅРєР° РґР»СЏ UI-РёРЅРґРёРєР°С†РёРё. */
  callState?: 'idle' | 'calling' | 'in-call' | 'incoming';
  /** Batch 4: timestamp РґРѕ РєРѕС‚РѕСЂРѕРіРѕ СѓРІРµРґРѕРјР»РµРЅРёСЏ Р·Р°РіР»СѓС€РµРЅС‹ (РґР»СЏ рџ”‡ РёРЅРґРёРєР°С‚РѕСЂР°) */
  mutedUntil?: number;
  /** Batch 4: РїРѕРєР°Р·Р°С‚СЊ РјРѕРґР°Р»РєСѓ РІРµСЂРёС„РёРєР°С†РёРё РєРѕРЅС‚Р°РєС‚Р° */
  onVerifyContact?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  messages,
  onSendMessage,
  partner,
  currentUserUid,
  onBack,
  onStartCall,
  callState = 'idle',
  mutedUntil,
  onVerifyContact
}) => {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stage 3: Р°РІС‚РѕСЃРєСЂРѕР»Р» Рє РїРѕСЃР»РµРґРЅРµРјСѓ СЃРѕРѕР±С‰РµРЅРёСЋ РїСЂРё РёР·РјРµРЅРµРЅРёРё СЃРїРёСЃРєР°
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    console.log(`[PILIGRIM] ChatWindow: send message to chatId=${chatId}, len=${trimmed.length}`);
    onSendMessage(trimmed);
    setDraft('');
    inputRef.current?.focus();
  }, [draft, chatId, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const partnerName = partner?.name ?? 'Р§Р°С‚';
  const initial = partnerName.charAt(0).toUpperCase();

  return (
    <div
      data-testid="chat-window"
      data-chat-id={chatId}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1e293b',
        minWidth: 0
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
          gap: '12px'
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            aria-label="РќР°Р·Р°Рґ"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            вЂ№
          </button>
        )}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#22d3ee',
            fontSize: '18px',
            flexShrink: 0
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#f1f5f9',
              fontSize: '16px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {partnerName}
            {mutedUntil !== undefined && mutedUntil > Date.now() && (
              <span
                title={
                  mutedUntil === Number.MAX_SAFE_INTEGER
                    ? 'РЈРІРµРґРѕРјР»РµРЅРёСЏ Р·Р°РіР»СѓС€РµРЅС‹ РЅР°РІСЃРµРіРґР°'
                    : `РЈРІРµРґРѕРјР»РµРЅРёСЏ Р·Р°РіР»СѓС€РµРЅС‹ РґРѕ ${new Date(mutedUntil).toLocaleTimeString()}`
                }
                data-testid="muted-indicator"
                style={{ marginLeft: '6px', fontSize: '14px' }}
              >
                рџ”‡
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            {messages.length} {messages.length === 1 ? 'СЃРѕРѕР±С‰РµРЅРёРµ' : 'СЃРѕРѕР±С‰РµРЅРёР№'}
          </div>
        </div>
        {onStartCall && (
          <button
            type="button"
            onClick={onStartCall}
            disabled={callState !== 'idle'}
            data-testid="call-button"
            title={callState === 'idle' ? 'РџРѕР·РІРѕРЅРёС‚СЊ' : `Р—РІРѕРЅРѕРє: ${callState}`}
            aria-label="РџРѕР·РІРѕРЅРёС‚СЊ"
            style={{
              padding: '8px 12px',
              backgroundColor: callState === 'in-call' ? '#22c55e' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: callState === 'idle' ? 'pointer' : 'not-allowed',
              opacity: callState === 'idle' ? 1 : 0.6,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {callState === 'in-call' ? 'рџ“ћ Р’ Р·РІРѕРЅРєРµ' : callState === 'calling' ? 'рџ“ћ Р’С‹Р·РѕРІвЂ¦' : 'рџ“ћ'}
          </button>
        )}
        {onVerifyContact && (
          <button
            type="button"
            onClick={onVerifyContact}
            data-testid="verify-button"
            title="Р’РµСЂРёС„РёС†РёСЂРѕРІР°С‚СЊ РєРѕРЅС‚Р°РєС‚"
            aria-label="Р’РµСЂРёС„РёС†РёСЂРѕРІР°С‚СЊ РєРѕРЅС‚Р°РєС‚"
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            рџ”ђ
          </button>
        )}
      </header>

      {/* Messages list (scrollable) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backgroundColor: '#1e293b',
          minHeight: 0
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '14px',
              textAlign: 'center'
            }}
          >
            РќРµС‚ СЃРѕРѕР±С‰РµРЅРёР№. РќР°РїРёС€РёС‚Рµ РїРµСЂРІРѕРµ!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = currentUserUid
              ? msg.senderId === currentUserUid
              : msg.senderId === 'local';
            return (
              <div
                key={msg.id}
                data-testid="message"
                className='piligrim-message-in'
                data-sender={msg.senderId}
                style={{
                  alignSelf: isOwn ? 'flex-end' : 'flex-start',
                  backgroundColor: isOwn ? '#3b82f6' : '#475569',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ fontSize: '14px', lineHeight: 1.4 }}>{msg.text}</div>
                <div
                  style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    marginTop: '4px',
                    textAlign: 'right',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px'
                  }}
                >
                  {msg.isEncrypted && (
                    <span
                      title="Р—Р°С€РёС„СЂРѕРІР°РЅРѕ (E2EE)"
                      aria-label="Р—Р°С€РёС„СЂРѕРІР°РЅРѕ"
                      style={{ fontSize: '10px' }}
                    >
                      рџ”’
                    </span>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          borderTop: '1px solid #334155',
          flexShrink: 0
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Р’РІРµРґРёС‚Рµ СЃРѕРѕР±С‰РµРЅРёРµ..."
          aria-label="РџРѕР»Рµ РІРІРѕРґР° СЃРѕРѕР±С‰РµРЅРёСЏ"
          data-testid="message-input"
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: '#334155',
            color: '#f1f5f9',
            border: '1px solid #475569',
            borderRadius: '20px',
            fontSize: '14px',
            outline: 'none',
            minWidth: 0
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          data-testid="send-button"
          style={{
            padding: '0 20px',
            backgroundColor: draft.trim() ? '#3b82f6' : '#1e293b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: draft.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;