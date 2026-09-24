/**
 * Tests for MessageStatus component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageStatus } from '../src/components/MessageStatus';
import type { Message } from '../src/types';

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-123',
  senderId: 'user-1',
  text: 'Test message',
  timestamp: new Date().toISOString(),
  status: 'sent',
  ...overrides,
});

describe('MessageStatus', () => {
  test('renders nothing for received messages (not sent by me)', () => {
    const message = createMockMessage({ senderId: 'other-user' });
    const { container } = render(
      <MessageStatus message={message} sentByMe={false} currentUserUid="current-user" />
    );
    expect(container.firstChild).toBeNull();
  });

  test('shows single gray checkmark for sent status (no readBy)', () => {
    const message = createMockMessage({ 
      senderId: 'current-user',
      status: 'sent',
      readBy: [],
    });
    render(
      <MessageStatus message={message} sentByMe={true} currentUserUid="current-user" />
    );
    expect(screen.getByText('✓')).toHaveClass('text-slate-500');
  });

  test('shows double gray checkmark for delivered status', () => {
    const message = createMockMessage({ 
      senderId: 'current-user',
      status: 'delivered',
      readBy: [],
    });
    render(
      <MessageStatus message={message} sentByMe={true} currentUserUid="current-user" />
    );
    expect(screen.getByText('✓✓')).toHaveClass('text-slate-500');
  });

  test('shows double cyan checkmark for read status (readBy includes current user)', () => {
    const message = createMockMessage({ 
      senderId: 'current-user',
      status: 'sent',
      readBy: [{ uid: 'current-user', timestamp: Date.now() }],
    });
    render(
      <MessageStatus message={message} sentByMe={true} currentUserUid="current-user" />
    );
    expect(screen.getByText('✓✓')).toHaveClass('text-cyan-400');
  });

  test('shows double gray checkmark when readBy has other users but not current user', () => {
    const message = createMockMessage({ 
      senderId: 'current-user',
      status: 'sent',
      readBy: [{ uid: 'other-user', timestamp: Date.now() }],
    });
    render(
      <MessageStatus message={message} sentByMe={true} currentUserUid="current-user" />
    );
    expect(screen.getByText('✓✓')).toHaveClass('text-slate-500');
  });

  test('falls back to status field when readBy is empty', () => {
    const message = createMockMessage({ 
      senderId: 'current-user',
      status: 'read',
      readBy: [],
    });
    render(
      <MessageStatus message={message} sentByMe={true} currentUserUid="current-user" />
    );
    expect(screen.getByText('✓✓')).toHaveClass('text-cyan-400');
  });
});