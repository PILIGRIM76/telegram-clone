import React, { useState, useEffect, useRef, useCallback } from 'react';
import { voiceService } from '../services/voiceService';
import { VoiceMessageMetadata } from '../types';

interface VoicePlayerProps {
  encryptedBlob: Blob;
  metadata: VoiceMessageMetadata;
  privateKeyHex: string;
  isOwn: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  encryptedBlob,
  metadata,
  privateKeyHex,
  isOwn
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(metadata.duration);
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Decrypt and play
  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (!decryptedUrl) {
      setIsDecrypting(true);
      setError(null);
      try {
        const decrypted = await voiceService.decryptVoiceMessage(
          encryptedBlob,
          privateKeyHex,
          metadata
        );
        setDecryptedUrl(decrypted.url);
        setDuration(decrypted.duration);
      } catch (err) {
        setError('Failed to decrypt voice message');
        setIsDecrypting(false);
        return;
      }
    }

    setIsDecrypting(false);
    audioRef.current?.play().catch(() => {
      setError('Failed to play audio');
      setIsPlaying(false);
    });
    setIsPlaying(true);
  }, [isPlaying, decryptedUrl, encryptedBlob, privateKeyHex, metadata]);

  // Handle audio time update
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Handle audio ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  // Handle audio loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (decryptedUrl) {
        URL.revokeObjectURL(decryptedUrl);
      }
    };
  }, [decryptedUrl]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`voice-player flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isOwn
          ? 'bg-blue-100 dark:bg-blue-900/30'
          : 'bg-gray-100 dark:bg-gray-800/30'
      }`}
      style={{ maxWidth: '100%', minWidth: 280 }}
    >
      <audio
        ref={audioRef}
        src={decryptedUrl || ''}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        preload="metadata"
      />
      <button
        onClick={handlePlay}
        disabled={isDecrypting}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-500'
        } disabled:opacity-50`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isDecrypting ? (
          <span className="animate-spin">⏳</span>
        ) : isPlaying ? (
          <span>⏸</span>
        ) : (
          <span>▶️</span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="relative flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
            onClick={(e) => {
              if (audioRef.current && duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                audioRef.current.currentTime = percent * duration;
                setCurrentTime(percent * duration);
              }
            }}
          >
            <div
              className={`h-2 rounded-full transition-all duration-100 ${
                isOwn ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10 text-right">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};

export default VoicePlayer;