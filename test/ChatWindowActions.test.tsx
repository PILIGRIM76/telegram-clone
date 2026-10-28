import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatWindow from '../src/components/ChatWindow';
import VoiceRecorder from '../src/components/VoiceRecorder';

const voiceMetadata = { duration: 2, mimeType: 'audio/webm', size: 1024 };
const encryptedVoice = {
  ciphertext: 'encrypted-audio',
  iv: 'initialization-vector',
  key: 'encrypted-key',
  name: 'voice_message.webm',
  type: 'audio/webm',
  size: 1024,
};

jest.mock('../src/services/voiceService', () => ({
  voiceService: {
    setMaxDuration: jest.fn(),
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue(new Blob()),
    encryptVoiceMessage: jest.fn().mockResolvedValue({
      encryptedBlob: {
        text: jest.fn().mockResolvedValue(
          JSON.stringify({
            ciphertext: 'encrypted-audio',
            iv: 'initialization-vector',
            key: 'encrypted-key',
            name: 'voice_message.webm',
            type: 'audio/webm',
            size: 1024,
          })
        ),
      },
      metadata: { duration: 2, mimeType: 'audio/webm', size: 1024 },
    }),
    cancelRecording: jest.fn(),
    isRecording: jest.fn().mockReturnValue(false),
  },
}));

test('chat header search and menu controls invoke their callbacks', () => {
  const onSearchClick = jest.fn();
  const onMenuClick = jest.fn();

  render(
    <ChatWindow
      chatId="chat-1"
      messages={[]}
      onSendMessage={jest.fn()}
      onSearchClick={onSearchClick}
      onMenuClick={onMenuClick}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Поиск в чате' }));
  fireEvent.click(screen.getByRole('button', { name: 'Дополнительные действия чата' }));

  expect(onSearchClick).toHaveBeenCalledTimes(1);
  expect(onMenuClick).toHaveBeenCalledTimes(1);
});

test('allows an external app bar to replace the embedded chat header', () => {
  render(<ChatWindow chatId="chat-1" messages={[]} onSendMessage={jest.fn()} showHeader={false} />);

  expect(screen.queryByRole('button', { name: 'Поиск в чате' })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Дополнительные действия чата' })
  ).not.toBeInTheDocument();
});

test('opens the emoji picker and inserts a selected emoji into the message', () => {
  render(<ChatWindow chatId="chat-1" messages={[]} onSendMessage={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Эмодзи' }));
  fireEvent.click(screen.getByRole('button', { name: 'Вставить эмодзи 😀' }));

  expect(screen.getByPlaceholderText('Написать сообщение…')).toHaveValue('😀');
});

test('shows a disabled microphone action when there is no identity', () => {
  render(<ChatWindow chatId="chat-1" messages={[]} onSendMessage={jest.fn()} />);

  expect(
    screen.getByRole('button', { name: 'Войдите, чтобы записать голосовое сообщение' })
  ).toBeDisabled();
});

test('records, encrypts, and sends a voice message from the microphone action', async () => {
  const onSendMessage = jest.fn();
  render(
    <ChatWindow
      chatId="chat-1"
      messages={[]}
      onSendMessage={onSendMessage}
      currentIdentity={{ uid: 'user-1', privateKeyHex: 'private-key', publicKeyHex: 'public-key' }}
      partner={{ name: 'Contact 1', uid: 'contact-1', publicKeyHex: 'contact-public-key' }}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Записать голосовое сообщение' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Остановить и отправить' }));

  await waitFor(() => {
    expect(onSendMessage).toHaveBeenCalledWith(
      '',
      undefined,
      undefined,
      [
        expect.objectContaining({
          name: 'voice_message.webm',
          type: 'audio/webm',
          ciphertext: JSON.stringify(encryptedVoice),
        }),
      ],
      voiceMetadata,
      'voice'
    );
  });
});

test('automatically stops and sends a recording when it reaches the duration limit', async () => {
  jest.useFakeTimers();
  const onVoiceRecorded = jest.fn();
  render(
    <VoiceRecorder onVoiceRecorded={onVoiceRecorded} privateKeyHex="private-key" maxDuration={1} />
  );

  try {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Записать голосовое сообщение' }));
      await Promise.resolve();
    });

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onVoiceRecorded).toHaveBeenCalledTimes(1);
    expect(onVoiceRecorded).toHaveBeenCalledWith(expect.anything(), voiceMetadata);
  } finally {
    jest.useRealTimers();
  }
}, 10000);
