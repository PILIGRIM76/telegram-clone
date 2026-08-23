import React, { useRef, useEffect } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

interface CallModalProps {
  currentUserId: string;
  partnerId: string;
  partnerName: string;
  onStartCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ 
  currentUserId, 
  partnerId, 
  partnerName,
  onStartCall 
}) => {
  const {
    isInCall,
    isCalling,
    incomingCall,
    localStream,
    remoteStream,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo
  } = useWebRTC(currentUserId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleStartCall = () => {
    startCall(partnerId);
    onStartCall();
  };

  // Входящий звонок
  if (incomingCall) {
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
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937' }}>
            📞 Входящий звонок
          </h2>
          <p style={{ fontSize: '18px', color: '#6b7280', margin: '0 0 30px 0' }}>
            {partnerName}
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={answerCall}
              style={{
                padding: '12px 32px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ✓ Принять
            </button>
            <button
              onClick={rejectCall}
              style={{
                padding: '12px 32px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ✗ Отклонить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Активный звонок
  if (isInCall) {
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
        </div>

        <div style={{
          padding: '20px',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          gap: '20px'
        }}>
          <button
            onClick={toggleAudio}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            🎤
          </button>
          <button
            onClick={toggleVideo}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            📹
          </button>
          <button
            onClick={endCall}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            📞
          </button>
        </div>
      </div>
    );
  }

  // Исходящий звонок (ожидание ответа)
  if (isCalling) {
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
            onClick={endCall}
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
      onClick={handleStartCall}
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