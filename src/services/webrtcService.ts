import Peer from 'simple-peer';
import { apiService } from './apiService';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export interface CallEvents {
  onStream?: (stream: MediaStream) => void;
  onSignal?: (signal: any, to: string) => void;
  onEndCall?: () => void;
  onError?: (error: Error) => void;
}

class WebRTCService {
  private peer: Peer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private events: CallEvents = {};

  async initCall(to: string, events: CallEvents): Promise<void> {
    this.events = events;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      this.peer = new Peer({ 
        initiator: true, 
        stream: this.localStream,
        config: { iceServers: ICE_SERVERS }
      });

      this.setupPeerHandlers(to);
    } catch (error) {
      events.onError?.(error as Error);
    }
  }

  async answerCall(from: string, signal: any, events: CallEvents): Promise<void> {
    this.events = events;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      this.peer = new Peer({ 
        initiator: false, 
        stream: this.localStream,
        config: { iceServers: ICE_SERVERS }
      });

      this.setupPeerHandlers(from);
      this.peer.signal(signal);
    } catch (error) {
      events.onError?.(error as Error);
    }
  }

  private setupPeerHandlers(remoteUserId: string): void {
    if (!this.peer) return;

    this.peer.on('signal', (signal) => {
      this.events.onSignal?.(signal, remoteUserId);
    });

    this.peer.on('stream', (stream) => {
      this.events.onStream?.(stream);
    });

    this.peer.on('close', () => {
      this.cleanup();
      this.events.onEndCall?.();
    });

    this.peer.on('error', (error) => {
      this.events.onError?.(error);
    });
  }

  handleSignal(signal: any): void {
    if (this.peer) {
      this.peer.signal(signal);
    }
  }

  endCall(): void {
    if (this.peer) {
      this.peer.destroy();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.peer = null;
  }

  toggleAudio(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;