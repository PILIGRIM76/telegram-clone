'use client';

import { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface CallProps {
  chatId: string;
  peerId: string;
  onEnd: () => void;
}

export default function Call({ chatId, peerId, onEnd }: CallProps) {
  const [status, setStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [isVideo, setIsVideo] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/call', {
      auth: { token: localStorage.getItem('token') },
    });
    socketRef.current = socket;

    socket.on('incoming-call', ({ callId, from, type }) => {
      setIsVideo(type === 'video');
      setStatus('calling');
    });

    socket.on('call-accepted', async () => {
      setStatus('connected');
      await createPeerConnection(true);
    });

    socket.on('offer', async ({ offer }) => {
      if (!peerConnectionRef.current) {
        await createPeerConnection(false);
      }
      await peerConnectionRef.current?.setRemoteDescription(offer);
      const answer = await peerConnectionRef.current?.createAnswer();
      await peerConnectionRef.current?.localDescription && 
        socket.emit('answer', { answer: peerConnectionRef.current.localDescription });
    });

    socket.on('answer', async ({ answer }) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      await peerConnectionRef.current?.addIceCandidate(candidate);
    });

    socket.on('call-ended', () => {
      endCall();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createPeerConnection = async (initiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (localVideoRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('offer', { offer });
    }

    peerConnectionRef.current = pc;
  };

  const startCall = async (video: boolean) => {
    setIsVideo(video);
    setStatus('calling');
    socketRef.current?.emit('call-user', { to: peerId, type: video ? 'video' : 'voice' });
  };

  const acceptCall = async () => {
    socketRef.current?.emit('accept-call', { callId: chatId });
    setStatus('connected');
  };

  const rejectCall = () => {
    socketRef.current?.emit('reject-call', { callId: chatId });
    setStatus('ended');
  };

  const endCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setStatus('ended');
    onEnd();
  };

  if (status === 'idle') {
    return (
      <div className="flex gap-2">
        <button onClick={() => startCall(false)} className="btn-call">
          📞 Звонок
        </button>
        <button onClick={() => startCall(true)} className="btn-call">
          📹 Видео
        </button>
      </div>
    );
  }

  if (status === 'calling') {
    return (
      <div className="call-modal">
        <p>Звонок...</p>
        <button onClick={acceptCall}>Принять</button>
        <button onClick={rejectCall}>Отклонить</button>
      </div>
    );
  }

  return (
    <div className="call-active">
      <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
      <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
      <button onClick={endCall} className="btn-end">Завершить</button>
    </div>
  );
}