// Phase 9.5 fix: simple-peer (Node.js-based) не работает в Capacitor WebView.
// Заменяем на stub — WebRTC будет добавлен в Phase 10 через native RTCPeerConnection.
import { apiService } from './apiService';
import { prismaService } from './prismaService';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export interface CallEvents {
  onStream?: (stream: MediaStream) => void;
  onSignal?: (signal: any, to: string) => void;
  onEndCall?: () => void;
  onError?: (error: Error) => void;
  onScreenShareStarted?: () => void;
  onScreenShareStopped?: () => void;
}

class WebRTCService {
  private peer: any = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private isScreenSharing: boolean = false;
  private events: CallEvents = {};
  private callStartTime: number | null = null;
  private callType: 'video' | 'audio' = 'video';
  private callerId: string = '';
  private receiverId: string = '';

  async initCall(to: string, events: CallEvents): Promise<void> {
    this.events = events;
    this.callStartTime = Date.now();
    this.callType = 'video';
    this.callerId = 'current-user';
    this.receiverId = to;
    try {
      console.warn('[PILIGRIM] WebRTC is not yet implemented in this build (Phase 9.5 stub)');
      if (this.events.onError) {
        this.events.onError(new Error('WebRTC calls are not yet supported in this build'));
      }
    } catch (error) {
      if (this.events.onError) {
        this.events.onError(error as Error);
      }
    }
  }

  async answerCall(caller: string, signal: any, events: CallEvents): Promise<void> {
    this.events = events;
    this.callerId = caller;
    this.receiverId = caller;
    console.warn('[PILIGRIM] WebRTC is not yet implemented in this build (Phase 9.5 stub)');
    if (this.events.onError) {
      this.events.onError(new Error('WebRTC calls are not yet supported in this build'));
    }
  }

  endCall(): void {
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.stopScreenShare();
    if (this.events.onEndCall) {
      this.events.onEndCall();
    }
  }

  async startScreenShare(): Promise<boolean> {
    console.warn('[PILIGRIM] Screen sharing is not yet implemented in this build');
    return false;
  }

  stopScreenShare(): void {
    this.isScreenSharing = false;
  }

  isScreenSharingActive(): boolean {
    return this.isScreenSharing;
  }
  isScreenShareActive(): boolean {
    return this.isScreenSharing;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  handleSignal(_signal: any): void {
    console.warn("handleSignal not implemented");
  }

  toggleAudio(_enabled?: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = _enabled !== false);
    }
  }

  toggleVideo(_enabled?: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = _enabled !== false);
    }
  }


  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;

