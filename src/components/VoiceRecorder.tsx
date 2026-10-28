import React, { useCallback, useEffect, useRef, useState } from 'react';
import { voiceService } from '../services/voiceService';
import type { VoiceMessageMetadata } from '../types';
import { MicrophoneIcon } from './icons';

interface VoiceRecorderProps {
  onVoiceRecorded: (encryptedBlob: Blob, metadata: VoiceMessageMetadata) => void | Promise<void>;
  onCancel?: () => void;
  privateKeyHex: string;
  maxDuration?: number;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onVoiceRecorded,
  onCancel,
  privateKeyHex,
  maxDuration = 300,
}) => {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'error'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(7).fill(0));
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const levelAnimationRef = useRef<number | null>(null);
  const elapsedSecondsRef = useRef(0);
  const stopRecordingRef = useRef<() => Promise<void>>(async () => {});

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setStatus('recording');
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setAudioLevels(Array(7).fill(0));

    try {
      voiceService.setMaxDuration(maxDuration);
      await voiceService.startRecording(level => {
        setAudioLevels(prev => {
          const newLevels = [...prev.slice(1), level];
          return newLevels;
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      return;
    }

    timerRef.current = window.setInterval(() => {
      const elapsed = elapsedSecondsRef.current + 1;
      elapsedSecondsRef.current = elapsed;
      setElapsedSeconds(elapsed);
      if (elapsed >= maxDuration) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        void stopRecordingRef.current();
      }
    }, 1000);
  }, [maxDuration]);

  const handleStopRecording = useCallback(async () => {
    if (status !== 'recording') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('processing');

    try {
      const audioBlob = await voiceService.stopRecording();
      const { encryptedBlob, metadata } = await voiceService.encryptVoiceMessage(
        audioBlob,
        privateKeyHex
      );
      await onVoiceRecorded(encryptedBlob, metadata);
      setStatus('idle');
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;
      setAudioLevels(Array(7).fill(0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process recording');
      setStatus('error');
    }
  }, [status, privateKeyHex, onVoiceRecorded]);

  useEffect(() => {
    stopRecordingRef.current = handleStopRecording;
  }, [handleStopRecording]);

  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    voiceService.cancelRecording();
    setStatus('idle');
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    setAudioLevels(Array(7).fill(0));
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status === 'recording') {
        handleCancel();
      }
    };

    if (status === 'recording') {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [status, handleCancel]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (voiceService.isRecording()) voiceService.cancelRecording();
    };
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Отображение интерфейса записи.
  if (status === 'recording') {
    return (
      <div className="voice-recorder recording fixed bottom-0 left-0 right-0 z-50 border-t border-tg-border bg-tg-background p-4 shadow-xl dark:border-tg-dark-border dark:bg-tg-dark-background">
        <div className="mx-auto max-w-md text-tg-text dark:text-tg-dark-text">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-tg-danger"></div>
              <span className="font-medium">Идёт запись</span>
              <span className="font-mono text-sm text-tg-textSecondary dark:text-tg-dark-textSecondary">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            <button
              onClick={handleCancel}
              className="rounded-full p-2 text-tg-textSecondary transition-colors hover:bg-tg-hover hover:text-tg-danger dark:text-tg-dark-textSecondary dark:hover:bg-tg-dark-hover"
              aria-label="Отменить запись"
            >
              ✕
            </button>
          </div>

          <div className="flex items-end justify-center gap-1 h-20 mb-4">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="max-w-6 flex-1 rounded bg-tg-primary transition-all duration-75"
                style={{ height: `${Math.max(level * 100, 5)}%` }}
              />
            ))}
          </div>

          <div className="mb-4 h-2 w-full rounded-full bg-tg-hover dark:bg-tg-dark-hover">
            <div
              className="h-2 rounded-full bg-tg-danger transition-all duration-1000"
              style={{ width: `${Math.min((elapsedSeconds / maxDuration) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => void handleStopRecording()}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-tg-danger text-white shadow-lg transition-opacity hover:opacity-80 active:scale-95"
              aria-label="Остановить и отправить"
            >
              <span className="text-2xl" aria-hidden="true">
                ⏹
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Отображение ошибки записи.
  if (status === 'error') {
    return (
      <div className="voice-recorder error fixed bottom-0 left-0 right-0 z-50 border-t border-tg-danger bg-tg-background p-4 shadow-xl dark:bg-tg-dark-background">
        <div className="mx-auto max-w-md text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="mb-4 text-tg-danger">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleCancel}
              className="rounded-lg bg-tg-hover px-4 py-2 text-tg-text transition-colors hover:opacity-80 dark:bg-tg-dark-hover dark:text-tg-dark-text"
            >
              Закрыть
            </button>
            <button
              onClick={() => void handleStartRecording()}
              className="rounded-lg bg-tg-primary px-4 py-2 text-white transition-opacity hover:opacity-80"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <button
        type="button"
        disabled
        className="flex h-9 w-9 flex-shrink-0 cursor-wait items-center justify-center rounded-full text-tg-primary opacity-70 dark:text-tg-dark-primary"
        aria-label="Обработка голосового сообщения"
        title="Обработка голосового сообщения"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleStartRecording()}
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-tg-textSecondary transition-colors hover:bg-tg-hover hover:text-tg-primary dark:text-tg-dark-textSecondary dark:hover:bg-tg-dark-hover dark:hover:text-tg-dark-primary"
      aria-label="Записать голосовое сообщение"
      title="Записать голосовое сообщение"
    >
      <MicrophoneIcon className="h-5 w-5" />
    </button>
  );
};

export default VoiceRecorder;
