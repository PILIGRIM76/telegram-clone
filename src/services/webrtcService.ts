import Peer from 'simple-peer';
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
}

class WebRTCService {
  private peer: Peer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private events: CallEvents = {};
  
  private callStartTime: number | null = null;
  private callType: 'video' | 'audio' = 'video';
  private callerId: string = '';
  private receiverId: string = '';

  async initCall(to: string, events: CallEvents): Promise<void> {
    this.events = events;
    
    this.callStartTime = Date.now();
    this.callType = 'video';
    this.callerId = 'current-user'; // Временно, позже заменим на реальный ID
    this.receiverId = to;
    
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
    
    this.callStartTime = Date.now();
    this.callType = 'video';
    this.callerId = from;
    this.receiverId = 'current-user'; // Временно

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
    this.saveCallToDatabase();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.peer = null;
  }

  private async saveCallToDatabase(): Promise<void> {
    if (!this.callStartTime) return;

    const duration = Math.floor((Date.now() - this.callStartTime) / 1000);
    
    try {
      await prismaService.saveCall({
        callerId: this.callerId,
        receiverId: this.receiverId,
        callType: this.callType,
        status: duration > 0 ? 'completed' : 'missed',
        duration: duration
      });
      console.log('Call saved to database');
    } catch (error) {
      console.error('Failed to save call to database:', error);
    }
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

  setCallType(type: 'video' | 'audio'): void {
    this.callType = type;
  }

  setCallerId(id: string): void {
    this.callerId = id;
  }

  setReceiverId(id: string): void {
    this.receiverId = id;
  }
}

export const webrtcService = new WebRTCService();
export default webrtcService;