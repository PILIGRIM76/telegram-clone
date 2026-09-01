import React, { useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { useCallTimer } from '../hooks/useCallTimer';
import { playRingtone, stopRingtone, playConnectSound, playEndCallSound } from '../utils/callSounds';

interface AudioCallModalProps {
  currentUserId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AudioCallModal: React.FC<AudioCallModalProps> = ({
  currentUserId,
  partnerId,
  partnerName,
  partnerAvatar,
  isOpen,
  onClose
}) => {
  const {
    isInCall,
    isCalling,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio
  } = useWebRTC(currentUserId);

  const { formatted: callDuration, reset: resetTimer } = useCallTimer(isInCall);

  useEffect(() => {
    if (incomingCall) {
      playRingtone();
      return () => stopRingtone();
    }
  }, [incomingCall]);

  useEffect(() => {
    if (!isInCall && !isCalling && !incomingCall) {
      resetTimer();
      onClose();
    }
  }, [isInCall, isCalling, incomingCall, onClose, resetTimer]);

  const handleStartCall = () => {
    playConnectSound();
    startCall(partnerId);
  };

  const handleAnswer = () => {
    stopRingtone();
    playConnectSound();
    answerCall();
  };

  const handleReject = () => {
    stopRingtone();
    playEndCallSound();
    rejectCall();
    onClose();
  };

  const handleEnd = () => {
    playEndCallSound();
    resetTimer();
    endCall();
    onClose();
  };

  const handleToggleAudio = () => {
    toggleAudio();
    console.log('Audio: toggled');
  };

  if (!isOpen && !incomingCall && !isInCall && !isCalling) {
    return null;
  }

  const initials = partnerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white'
    }}>
      <div style={{ position: 'relative', marginBottom: '30px' }}>
        {(isCalling || incomingCall) && (
          <>
            <div style={{
              position: 'absolute',
              top: '-20px',
              left: '-20px',
              right: '-20px',
              bottom: '-20px',
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              top: '-40px',
              left: '-40px',
              right: '-40px',
              bottom: '-40px',
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.2)',
              animation: 'pulse 1.5s ease-in-out infinite 0.5s'
            }} />
          </>
        )}
        <div style={{
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: partnerAvatar ? `url(${partnerAvatar}) center/cover` : '#7c3aed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          fontWeight: 'bold',
          border: '4px solid white',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}>
          {!partnerAvatar && initials}
        </div>
      </div>

      <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: 600 }}>
        {partnerName}
      </h2>

      <p style={{ margin: '0 0 40px 0', fontSize: '16px', opacity: 0.9 }}>
        {isInCall && `⏱️ ${callDuration}`}
        {isCalling && 'Вызов...'}
        {incomingCall && '📞 Входящий звонок'}
        {!isInCall && !isCalling && !incomingCall && 'Аудио-звонок'}
      </p>

      <div style={{ display: 'flex', gap: '20px' }}>
        {isInCall && (
          <button
            onClick={handleToggleAudio}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)'
            }}
            title="Микрофон"
          >
            🎤
          </button>
        )}

        {incomingCall && (
          <button
            onClick={handleAnswer}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#10b981',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(16,185,129,0.5)'
            }}
            title="Принять"
          >
            ✓
          </button>
        )}

        {(isInCall || isCalling) && (
          <button
            onClick={handleEnd}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(239,68,68,0.5)'
            }}
            title="Завершить"
          >
            📞
          </button>
        )}

        {incomingCall && (
          <button
            onClick={handleReject}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(239,68,68,0.5)'
            }}
            title="Отклонить"
          >
            ✗
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default AudioCallModal;