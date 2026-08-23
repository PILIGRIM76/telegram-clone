import { useState, useEffect, useCallback } from 'react';
import { webrtcService } from '../services/webrtcService';
import { apiService } from '../services/apiService';

export interface IncomingCall {
  from: string;
  signal: any;
}

export function useWebRTC(currentUserId: string) {
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Подписка на входящие звонки
    apiService.onCallEvent('offer', (data) => {
      setIncomingCall({ from: data.from, signal: data.signal });
    });

    // Подписка на ответ от собеседника
    apiService.onCallEvent('answer', (data) => {
      webrtcService.handleSignal(data.signal);
      setIsCalling(false);
      setIsInCall(true);
    });

    // Подписка на сигналы (ICE candidates)
    apiService.onCallEvent('signal', (data) => {
      webrtcService.handleSignal(data.signal);
    });

    // Подписка на завершение звонка
    apiService.onCallEvent('end', () => {
      webrtcService.endCall();
      setIsInCall(false);
      setIsCalling(false);
      setIncomingCall(null);
      setRemoteStream(null);
      setLocalStream(null);
    });
  }, []);

  const startCall = useCallback(async (to: string) => {
    setIsCalling(true);
    
    await webrtcService.initCall(to, {
      onStream: (stream) => {
        setRemoteStream(stream);
        setIsInCall(true);
        setIsCalling(false);
      },
      onSignal: (signal, remoteUserId) => {
        apiService.sendCallOffer(remoteUserId, signal);
      },
      onEndCall: () => {
        setIsInCall(false);
        setIsCalling(false);
        setRemoteStream(null)
        setLocalStream(null);
      },
      onError: (error) => {
        console.error('Call error:', error);
        setIsCalling(false);
        alert('Ошибка звонка: ' + error.message);
      }
    });
  }, []);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    await webrtcService.answerCall(incomingCall.from, incomingCall.signal, {
      onStream: (stream) => {
        setRemoteStream(stream);
        setIsInCall(true);
        setIncomingCall(null);
      },
      onSignal: (signal, remoteUserId) => {
        apiService.sendCallAnswer(remoteUserId, signal);
      },
      onEndCall: () => {
        setIsInCall(false);
        setIncomingCall(null);
        setRemoteStream(null);
        setLocalStream(null);
      },
      onError: (error) => {
        console.error('Answer error:', error);
        setIncomingCall(null);
        alert('Ошибка ответа: ' + error.message);
      }
    });
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      apiService.sendCallEnd(incomingCall.from);
      setIncomingCall(null);
    }
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (isInCall && incomingCall) {
      apiService.sendCallEnd(incomingCall.from);
    }
    webrtcService.endCall();
    setIsInCall(false);
    setIsCalling(false);
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
  }, [isInCall, incomingCall]);

  const toggleAudio = useCallback(() => {
    return webrtcService.toggleAudio();
  }, []);

  const toggleVideo = useCallback(() => {
    return webrtcService.toggleVideo();
  }, []);

  return {
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
  };
}