import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CallModal } from '../src/components/CallModal';

const callProps = {
  callState: 'in-call' as const,
  partnerName: 'Алиса',
  localStream: null,
  remoteStream: null,
  onAccept: jest.fn(),
  onDecline: jest.fn(),
  onEnd: jest.fn(),
  onStartCall: jest.fn(),
  onToggleMute: jest.fn(),
  onToggleVideo: jest.fn(),
  onStartScreenShare: jest.fn(),
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  callDuration: 12,
};

test('exposes accessible labels for in-call icon actions', () => {
  render(<CallModal {...callProps} />);

  expect(screen.getByRole('button', { name: 'Выключить микрофон' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Выключить камеру' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Поделиться экраном' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Завершить звонок' })).toBeInTheDocument();
});
