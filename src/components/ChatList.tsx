// v3.0 Phase 4: ChatList — список чатов с memo-оптимизацией и динамической темой
import React, { useState, useMemo, memo } from 'react';
import AnimatedAvatar from './AnimatedAvatar';
import { useAccentColor } from '../hooks/useAccentColor';
import { SearchIcon, PlusCircleIcon } from './icons';
import { E2EEStatus } from '../types';

/**
 * Локальный интерфейс для элемента списка чатов.
 */
export interface ChatListItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isOnline: boolean;
  isTyping: boolean;
  e2eeStatus: E2EEStatus;
}

interface ChatListProps {
  chats: ChatListItem[];
  activeChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

const ChatRow = memo(function ChatRow({
  chat,
  isActive,
  onSelect,
  accentColor,
}: {
  chat: ChatListItem;
  isActive: boolean;
  onSelect: () => void;
  accentColor: string;
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && onSelect()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        background: isActive ? accentColor + '15' : 'transparent',
        borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
        transition: 'background 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <AnimatedAvatar
        name={chat.name}
        isOnline={chat.isOnline}
        isTyping={chat.isTyping}
        e2eeStatus={chat.e2eeStatus}
        size={48}
        accentColor={accentColor}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#FCF9F7', fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chat.name}
          </h3>
          <span style={{ fontSize: 12, color: 'rgba(252, 249, 247, 0.4)', fontFamily: 'Inter, sans-serif' }}>
            {chat.timestamp}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: chat.isTyping ? accentColor : 'rgba(252, 249, 247, 0.6)', fontFamily: 'Inter, sans-serif', fontStyle: chat.isTyping ? 'italic' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {chat.isTyping ? 'печатает...' : chat.lastMessage}
          </p>
          {chat.unread > 0 && (
            <div style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: accentColor, color: '#0D0C0B', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              {chat.unread}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ChatRow.displayName = 'ChatRow';

const ChatList: React.FC<ChatListProps> = ({ chats, activeChatId, onChatSelect, onNewChat }) => {
  const theme = useAccentColor();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.name.toLowerCase().includes(query) ||
        chat.lastMessage.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(255, 255, 255, 0.01)', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 600, color: '#FCF9F7', fontFamily: 'Inter, sans-serif' }}>Chats</h2>
          <button
            onClick={onNewChat}
            aria-label="New chat"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: theme.color + '20',
              border: '1px solid ' + theme.color + '50',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.color + '30';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.color + '20';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color }}>
              <PlusCircleIcon />
            </span>
          </button>
        </div>
        <div style={{ position: 'relative' }}>
                              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <SearchIcon size={18} color="rgba(252, 249, 247, 0.4)" />
          </div>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 40,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FCF9F7',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.color + '80';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              isActive={activeChatId === chat.id}
              onSelect={() => onChatSelect(chat.id)}
              accentColor={theme.color}
            />
          ))
        ) : (
          <div style={{ padding: '16px', color: 'rgba(252, 249, 247, 0.4)', fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
            No chats found
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;

