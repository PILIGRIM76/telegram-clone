import { logger } from '../services/logger';
import React, { useRef, useEffect } from 'react';
import { webrtcService } from '../services/webrtcService';
import { playRingtone, stopRingtone, playConnectSound, playEndCallSound } from '../utils/callSounds';

interface CallModalProps {
  callState: 'idle' | 'calling' | 'in-call' | 'incoming';
  partnerName: string;
  partnerUid: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onStartCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => void;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  callDuration: number;
}

export const CallModal: React.FC<CallModalProps> = ({
  callState,
  partnerName,
  partnerUid,
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEnd,
  onStartCall,
  onToggleMute,
  onToggleVideo,
  onStartScreenShare,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  callDuration
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    const screenStream = webrtcService.getScreenStream();
    if (screenStream) {
      localVideoRef.current.srcObject = screenStream;
      logger.info('Local preview switched to screen');
    } else if (localStream) {
      localVideoRef.current.srcObject = localStream;
      logger.info('Local preview switched back to camera');
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (callState === 'incoming') {
      playRingtone();
      return () => stopRingtone();
    }
  }, [callState]);

  // Incoming call UI
  if (callState === 'incoming') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <h2 style={{ color: '#FCF9F7', fontSize: 24, marginTop: 16 }}>
          {partnerName}
        </h2>
        <p style={{ color: 'rgba(252,249,247,0.6)', fontSize: 14 }}>
          Входящий звонок...
        </p>
        <div style={{ display: 'flex', gap: 32, marginTop: 32 }}>
          <button
            onClick={onDecline}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#EF4444', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 24 }}>✕</span>
          </button>
          <button
            onClick={onAccept}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#38A169', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <span style={{ fontSize: 24 }}>📞</span>
          </button>
        </div>
      </div>
    );
  }

  // Активный звонок
  if (callState === 'in-call') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#1f2937',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999
      }}>
        {/* Таймер длительности звонка */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 20px',
          borderRadius: '20px',
          color: 'white',
          fontSize: '18px',
          fontWeight: 600,
          zIndex: 10
        }}>
          ⏱️ {callDuration}
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              bottom: '100px',
              right: '20px',
              width: '150px',
              height: '200px',
              borderRadius: '12px',
              border: '3px solid white',
              objectFit: 'cover'
            }}
          />

          {/* Phase 8.3: UX-бейдж "Демонстрация экрана" */}
          {isScreenSharing && (
            <>
              {/* Бейдж над local-видео (показывает, что сейчас экран) */}
              <div style={{
                position: 'absolute',
                bottom: '310px',
                right: '20px',
                background: '#ef4444',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.5)',
                animation: 'pulse 2s infinite',
                zIndex: 20
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  background: 'white',
                  borderRadius: '50%'
                }}></span>
                ВЫ ДЕМОНСТРИРУЕТЕ ЭКРАН
              </div>

              {/* Главный бейдж по центру (на весь экран) */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(239, 68, 68, 0.95)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.6)',
                animation: 'pulse 2s infinite',
                zIndex: 20
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  background: 'white',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px white'
                }}></span>
                🖥️ Демонстрация экрана активна
              </div>
            </>
          )}
        </div>

        <div style={{
          padding: '20px',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <button
            onClick={onToggleMute}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: isMuted ? '#ef4444' : '#6b7280',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>
          <button
            onClick={onToggleVideo}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: isVideoEnabled ? '#6b7280' : '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            {isVideoEnabled ? '📹' : '🚫'}
          </button>
          <button
            onClick={onStartScreenShare}
            title={isScreenSharing ? 'Остановить демонстрацию' : 'Поделиться экраном'}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: isScreenSharing ? '#f97316' : '#6b7280',
              color: 'white',
              border: isScreenSharing ? '2px solid #fbbf24' : 'none',
              fontSize: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isScreenSharing ? '0 0 12px rgba(251, 191, 36, 0.6)' : 'none'
            }}
            aria-label={isScreenSharing ? 'Stop screen sharing' : 'Start screen sharing'}
          >
            {isScreenSharing ? '🛑' : '🖥️'}
          </button>
          <button
            onClick={onEnd}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}>
            📞
          </button>
        </div>
      </div>
    );
  }

  // Исходящий звонок (ожидание ответа)
  if (callState === 'calling') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            📞 Исходящий звонок
          </h2>
          <p style={{ fontSize: '18px', color: '#6b7280' }}>
            Вызов {partnerName}...
          </p>
          <button
            onClick={() => {
              stopRingtone();
              playEndCallSound();
              onEnd();
            }}
            style={{
              marginTop: '20px',
              padding: '12px 32px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // Кнопка "Позвонить" (когда нет активного звонка)
  return (
    <button
      onClick={onStartCall}
      style={{
        padding: '8px 16px',
        background: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px'
      }}
    >
      📞 Позвонить
    </button>
  );
};

export default CallModal;