import React, { useState, useEffect, useRef, useCallback } from 'react';
import { voiceService } from '../services/voiceService';
import { VoiceMessageMetadata } from '../types';

interface VoiceRecorderProps {
  onVoiceRecorded: (encryptedBlob: Blob, metadata: VoiceMessageMetadata) => void;
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

  // Format time as MM:SS

  // Start recording
  const handleStartRecording = useCallback(async () => {
    setError(null);
    setStatus('recording');
    setElapsedSeconds(0);
    setAudioLevels(Array(7).fill(0));

    try {
      voiceService.setMaxDuration(maxDuration);
      await voiceService.startRecording((level) => {
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
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, [maxDuration]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (status !== 'recording') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setStatus('processing');

    try {
      const audioBlob = await voiceService.stopRecording();
      const { encryptedBlob, metadata } = await voiceService.encryptVoiceMessage(audioBlob, privateKeyHex);
      onVoiceRecorded(encryptedBlob, metadata);
      setStatus('idle');
      setElapsedSeconds(0);
      setAudioLevels(Array(7).fill(0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process recording');
      setStatus('error');
    }
  }, [status, privateKeyHex]);

  // Cancel recording
  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    voiceService.cancelRecording();
    setStatus('idle');
    setElapsedSeconds(0);
    setAudioLevels(Array(7).fill(0));
    onCancel?.();
  }, [onCancel]);

  // Handle keyboard events (Escape to cancel)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Render recording UI
  if (status === 'recording') {
    return (
      <div className="voice-recorder recording fixed bottom-0 left-0 right-0 z-50 bg-white shadow-xl border-t border-gray-200 p-4 animate-slide-up">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-gray-700">Recording...</span>
              <span className="text-sm text-gray-500 font-mono">{formatTime(elapsedSeconds)}</span>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Cancel recording"
            >
              ✕
            </button>
          </div>

          <div className="flex items-end justify-center gap-1 h-20 mb-4">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="flex-1 max-w-6 bg-gradient-to-t from-blue-500 to-blue-200 rounded transition-all duration-75"
                style={{ height: `${Math.max(level * 100, 5)}%` }}
              />
            ))}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(elapsedSeconds / maxDuration) * 100}%` }}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStopRecording}
              className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors active:scale-95"
              aria-label="Stop and send"
            >
              <span className="text-2xl">⏹</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className="voice-recorder error fixed bottom-0 left-0 right-0 z-50 bg-white shadow-xl border-t border-red-200 p-4 animate-slide-up">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStatus('idle')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Idle state - render nothing (parent controls visibility)
  return null;
};

export default VoiceRecorder;