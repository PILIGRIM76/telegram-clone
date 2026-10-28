import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MessageItem from '../src/components/MessageItem';

jest.mock('../src/components/VoicePlayer', () => ({
  VoicePlayer: ({ encryptedBlob }: { encryptedBlob: Blob }) => (
    <div data-testid="voice-blob">
      {encryptedBlob instanceof Blob ? 'valid blob' : 'invalid blob'}
    </div>
  ),
}));

test('passes voice attachment JSON as a Blob to the voice player', () => {
  const encryptedVoicePayload = JSON.stringify({
    ciphertext: 'encrypted-audio',
    iv: 'initialization-vector',
    key: 'encrypted-key',
    name: 'voice_message.webm',
    type: 'audio/webm',
    size: 1024,
  });

  render(
    <MessageItem
      message={{
        id: 'voice-1',
        senderId: 'user-1',
        text: '',
        timestamp: new Date().toISOString(),
        type: 'voice',
        encryptedAttachments: [
          {
            id: 'audio-1',
            name: 'voice_message.webm',
            type: 'audio/webm',
            size: 1024,
            ciphertext: encryptedVoicePayload,
            iv: 'initialization-vector',
            key: 'encrypted-key',
          },
        ],
        voiceMetadata: { duration: 2, mimeType: 'audio/webm', size: 1024 },
      }}
      currentIdentity={{
        uid: 'user-1',
        publicKeyHex: 'public-key',
        privateKeyHex: 'private-key',
      }}
    />
  );

  expect(screen.getByTestId('voice-blob')).toHaveTextContent('valid blob');
});
