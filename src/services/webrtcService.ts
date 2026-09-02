// v1.5.2 Stage 6: Native WebRTC через browser RTCPeerConnection API.
// Без simple-peer (он использует Node.js APIs и не работает в Capacitor WebView).
// Сигналинг через apiService WebSocket (Этап 5).
// Screen sharing через getDisplayMedia() — НЕ работает на Android WebView (только desktop).

import { apiService } from './apiService';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export interface CallEvents {
  onStream?: (stream: MediaStream) => void;
  onLocalStream?: (stream: MediaStream) => void;
  onSignal?: (signal: any, to: string) => void;
  onEndCall?: () => void;
  onError?: (error: Error) => void;
  onScreenShareStarted?: () => void;
  onScreenShareStopped?: () => void;
}

export type SignalPayload =
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

function isRTCAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.RTCPeerConnection !== 'undefined';
}

function isScreenShareSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  if (typeof navigator.mediaDevices.getDisplayMedia !== 'function') return false;
  const ua = navigator.userAgent;
  // getDisplayMedia НЕ работает на Android WebView (только desktop Chrome/Edge/Firefox)
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return false;
  return true;
}

class WebRTCService {
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isScreenSharing = false;
  private events: CallEvents = {};
  private callStartTime: number | null = null;
  private callerId = '';
  private receiverId = '';
  private originalVideoTrack: MediaStreamTrack | null = null;

  canShareScreen(): boolean {
    return isScreenShareSupported();
  }

  private async setupLocalMedia(video = true, audio = true): Promise<MediaStream> {
    if (!navigator.mediaDevices) {
      throw new Error('mediaDevices API недоступно');
    }
    return await navigator.mediaDevices.getUserMedia({ video, audio });
  }

  private createPeer(): RTCPeerConnection {
    if (!isRTCAvailable()) {
      throw new Error('RTCPeerConnection не поддерживается');
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.receiverId) {
        const signal: SignalPayload = { type: 'ice', candidate: event.candidate.toJSON() };
        if (this.events.onSignal) {
          this.events.onSignal(signal, this.receiverId);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log('[PILIGRIM] WebRTC: ontrack', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      if (this.events.onStream) {
        this.events.onStream(this.remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[PILIGRIM] WebRTC: connection state =', pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.events.onError?.(new Error(`WebRTC connection ${pc.connectionState}`));
      }
      if (pc.connectionState === 'closed') {
        this.endCall();
      }
    };

    return pc;
  }

  private addLocalTracks(pc: RTCPeerConnection, stream: MediaStream): void {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }

  async initCall(to: string, events: CallEvents): Promise<void> {
    if (!isRTCAvailable()) {
      events.onError?.(new Error('WebRTC не поддерживается в этом окружении'));
      return;
    }
    this.events = events;
    this.receiverId = to;
    this.callerId = 'current-user';
    this.callStartTime = Date.now();

    try {
      console.log('[PILIGRIM] WebRTC: init call to', to);
      this.localStream = await this.setupLocalMedia(true, true);
      events.onLocalStream?.(this.localStream);

      this.peer = this.createPeer();
      this.addLocalTracks(this.peer, this.localStream);

      const offer = await this.peer.createOffer();
      await this.peer.setLocalDescription(offer);
      const signal: SignalPayload = { type: 'offer', sdp: offer };
      events.onSignal?.(signal, to);
    } catch (error) {
      console.error('[PILIGRIM] WebRTC: initCall error', error);
      events.onError?.(error as Error);
      this.cleanup();
    }
  }

  async answerCall(caller: string, incomingSignal: SignalPayload, events: CallEvents): Promise<void> {
    if (!isRTCAvailable()) {
      events.onError?.(new Error('WebRTC не поддерживается'));
      return;
    }
    this.events = events;
    this.callerId = caller;
    this.receiverId = caller;

    try {
      console.log('[PILIGRIM] WebRTC: answering call from', caller);
      this.localStream = await this.setupLocalMedia(true, true);
      events.onLocalStream?.(this.localStream);

      this.peer = this.createPeer();
      this.addLocalTracks(this.peer, this.localStream);

      if (incomingSignal.type === 'offer') {
        await this.peer.setRemoteDescription(new RTCSessionDescription(incomingSignal.sdp));
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
        const signal: SignalPayload = { type: 'answer', sdp: answer };
        events.onSignal?.(signal, caller);
      } else {
        throw new Error('Первый сигнал должен быть offer');
      }
    } catch (error) {
      console.error('[PILIGRIM] WebRTC: answerCall error', error);
      events.onError?.(error as Error);
      this.cleanup();
    }
  }

  async handleSignal(signal: SignalPayload): Promise<void> {
    if (!this.peer) {
      console.warn('[PILIGRIM] WebRTC: handleSignal called without active peer');
      return;
    }
    try {
      if (signal.type === 'answer') {
        await this.peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice') {
        if (signal.candidate) {
          await this.peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (error) {
      console.error('[PILIGRIM] WebRTC: handleSignal error', error);
      this.events.onError?.(error as Error);
    }
  }

  endCall(): void {
    console.log('[PILIGRIM] WebRTC: endCall');
    this.cleanup();
    if (this.events.onEndCall) {
      this.events.onEndCall();
    }
  }

  private cleanup(): void {
    if (this.peer) {
      try { this.peer.close(); } catch { /* noop */ }
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.stopScreenShare();
    this.remoteStream = null;
    this.callStartTime = null;
  }

  async startScreenShare(): Promise<boolean> {
    if (!isScreenShareSupported()) {
      console.warn('[PILIGRIM] Screen sharing не поддерживается на этом устройстве');
      return false;
    }
    if (!this.peer || !this.localStream) {
      console.warn('[PILIGRIM] startScreenShare: нет активного звонка');
      return false;
    }
    try {
      console.log('[PILIGRIM] WebRTC: requesting screen share…');
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as MediaTrackConstraints,
        audio: false
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('Не получен screen track');
      }

      // Заменяем video-трек в peer connection (sender.replaceTrack)
      const sender = this.peer.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && this.originalVideoTrack === null) {
        this.originalVideoTrack = sender.track;
      }
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // Когда пользователь нажимает "Stop" в системном диалоге
      screenTrack.onended = () => {
        console.log('[PILIGRIM] WebRTC: screen track ended by user');
        this.stopScreenShare();
      };

      this.isScreenSharing = true;
      this.events.onScreenShareStarted?.();
      return true;
    } catch (error: any) {
      // Пользователь отменил диалог — не ошибка
      if (error.name === 'NotAllowedError') {
        console.log('[PILIGRIM] Screen share cancelled by user');
        return false;
      }
      console.error('[PILIGRIM] WebRTC: startScreenShare error', error);
      this.events.onError?.(error);
      return false;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.isScreenSharing && !this.screenStream) {
      this.isScreenSharing = false;
      return;
    }
    console.log('[PILIGRIM] WebRTC: stopping screen share');

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    // Восстанавливаем оригинальный камерный трек
    if (this.peer && this.originalVideoTrack) {
      const sender = this.peer.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        try {
          await sender.replaceTrack(this.originalVideoTrack);
        } catch (e) {
          console.warn('[PILIGRIM] Не удалось восстановить video трек', e);
        }
      }
    }
    this.originalVideoTrack = null;
    this.isScreenSharing = false;
    this.events.onScreenShareStopped?.();
  }

  isScreenShareActive(): boolean {
    return this.isScreenSharing;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    const newState = enabled !== undefined ? enabled : !audioTracks[0].enabled;
    audioTracks.forEach((track) => { track.enabled = newState; });
    return newState;
  }

  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;
    const newState = enabled !== undefined ? enabled : !videoTracks[0].enabled;
    videoTracks.forEach((track) => { track.enabled = newState; });
    return newState;
  }

  isAudioEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    return audioTracks.length > 0 && audioTracks[0].enabled;
  }

  isVideoEnabled(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    return videoTracks.length > 0 && videoTracks[0].enabled;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;