import { logger } from '../services/logger';
// v1.5.2 Stage 6: WebRTC React hook поверх browser-native webrtcService.
// Сигналинг через apiService WebSocket (Этап 5).

import { useState, useEffect, useCallback, useRef } from 'react';
import { webrtcService, SignalPayload } from '../services/webrtcService';
import { apiService } from '../services/apiService';

export interface IncomingCall {
  from: string;
  signal: SignalPayload;
}

export function useWebRTC(_currentUserId: string) {
  const [isInCall, setIsInCall] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [canShareScreen, setCanShareScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentCallUid, setCurrentCallUid] = useState<string>('');
  const lastCallInitiatorRef = useRef<string>('');

  // callDuration timer
  useEffect(() => {
    let interval: number | undefined;
    if (isInCall || isCalling) {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall, isCalling]);

  useEffect(() => {
    setCanShareScreen(webrtcService.canShareScreen());
  }, []);

  useEffect(() => {
    const handleOffer = (data: any) => {
      logger.info('[PILIGRIM] useWebRTC: incoming offer from', data.from);
      setIncomingCall({ from: data.from, signal: { type: 'offer', sdp: data.signal } });
      lastCallInitiatorRef.current = data.from;
      setCurrentCallUid(data.from);
    };
    const handleAnswer = (data: any) => {
      logger.info('[PILIGRIM] useWebRTC: incoming answer from', data.from);
      webrtcService.handleSignal({ type: 'answer', sdp: data.signal });
      setIsCalling(false);
      setIsInCall(true);
    };
    const handleIce = (data: any) => {
      webrtcService.handleSignal({ type: 'ice', candidate: data.signal });
    };
    const handleEnd = () => {
      logger.info('[PILIGRIM] useWebRTC: call ended by remote');
      webrtcService.endCall();
      setIsInCall(false);
      setIsCalling(false);
      setIncomingCall(null);
      setRemoteStream(null);
      setLocalStream(null);
      setIsScreenSharing(false);
      setCurrentCallUid('');
    };

    apiService.onCallEvent('offer', handleOffer);
    apiService.onCallEvent('answer', handleAnswer);
    apiService.onCallEvent('signal', handleIce);
    apiService.onCallEvent('end', handleEnd);
  }, []);

  const startCall = useCallback(async (to: string) => {
    setIsCalling(true);
    setCurrentCallUid(to);
    lastCallInitiatorRef.current = to;
    await webrtcService.initCall(to, {
      onLocalStream: (stream) => setLocalStream(stream),
      onStream: (stream) => {
        setRemoteStream(stream);
        setIsInCall(true);
        setIsCalling(false);
      },
      onSignal: (signal, remoteUserId) => apiService.sendCallOffer(remoteUserId, signal),
      onEndCall: () => {
        setIsInCall(false);
        setIsCalling(false);
        setRemoteStream(null);
        setLocalStream(null);
        setCurrentCallUid('');
      },
      onError: (error) => {
        logger.error('[PILIGRIM] useWebRTC: call error', error);
        setIsCalling(false);
        setIsInCall(false);
        setCurrentCallUid('');
        alert(`Ошибка звонка: ${error.message}`);
      },
      onScreenShareStarted: () => setIsScreenSharing(true),
      onScreenShareStopped: () => setIsScreenSharing(false)
    });
  }, []);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;
    await webrtcService.answerCall(incomingCall.from, incomingCall.signal, {
      onLocalStream: (stream) => setLocalStream(stream),
      onStream: (stream) => {
        setRemoteStream(stream);
        setIsInCall(true);
        setIncomingCall(null);
      },
      onSignal: (signal, remoteUserId) => apiService.sendCallAnswer(remoteUserId, signal),
      onEndCall: () => {
        setIsInCall(false);
        setIncomingCall(null);
        setRemoteStream(null);
        setLocalStream(null);
        setCurrentCallUid('');
      },
      onError: (error) => {
        logger.error('[PILIGRIM] useWebRTC: answer error', error);
        setIncomingCall(null);
        setCurrentCallUid('');
        alert(`Ошибка ответа: ${error.message}`);
      },
      onScreenShareStarted: () => setIsScreenSharing(true),
      onScreenShareStopped: () => setIsScreenSharing(false)
    });
  }, [incomingCall]);

  const rejectCall = useCallback(() => {
    if (incomingCall) {
      apiService.sendCallEnd(incomingCall.from);
      setIncomingCall(null);
      setCurrentCallUid('');
    }
  }, [incomingCall]);

  const endCall = useCallback(() => {
    const remoteUserId = lastCallInitiatorRef.current;
    if (remoteUserId) {
      apiService.sendCallEnd(remoteUserId);
    }
    webrtcService.endCall();
    setIsInCall(false);
    setIsCalling(false);
    setIncomingCall(null);
    setRemoteStream(null);
    setLocalStream(null);
    setIsScreenSharing(false);
    setCurrentCallUid('');
  }, []);

  const toggleAudio = useCallback((): boolean => webrtcService.toggleAudio(), []);
  const toggleVideo = useCallback((): boolean => webrtcService.toggleVideo(), []);
  const isAudioEnabled = useCallback((): boolean => webrtcService.isAudioEnabled(), []);
  const isVideoEnabled = useCallback((): boolean => webrtcService.isVideoEnabled(), []);

  const toggleScreenShare = useCallback(async () => {
    if (!canShareScreen) {
      alert('Screen sharing не поддерживается на этом устройстве (требуется desktop Chrome/Edge)');
      return;
    }
    if (isScreenSharing) {
      await webrtcService.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      const ok = await webrtcService.startScreenShare();
      if (ok) setIsScreenSharing(true);
    }
  }, [isScreenSharing, canShareScreen]);

  return {
    isInCall,
    isCalling,
    incomingCall,
    localStream,
    remoteStream,
    isScreenSharing,
    canShareScreen,
    callDuration,
    currentCallUid,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    toggleScreenShare
  };
}