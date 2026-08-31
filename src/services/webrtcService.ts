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
  // Phase 8: события для screen sharing
  onScreenShareStarted?: () => void;
  onScreenShareStopped?: () => void;
}

class WebRTCService {
  private peer: Peer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;       // Phase 8: поток демонстрации экрана
  private isScreenSharing: boolean = false;               // Phase 8: флаг активного показа
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
    // Phase 8: останавливаем screenStream (если активен)
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.onended = null;
        track.stop();
      });
      this.screenStream = null;
    }
    this.isScreenSharing = false;

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

  // === Phase 8: Screen Sharing (демонстрация экрана) ===

  /**
   * Начинает демонстрацию экрана через getDisplayMedia().
   * Требует активного звонка (peer должен быть инициализирован).
   * Использует simple-peer.replaceTrack() для замены видеотрека камеры
   * на видеотрек экрана без разрыва соединения.
   */
  async startScreenShare(): Promise<boolean> {
    if (!this.peer || !this.localStream) {
      console.warn('startScreenShare: нет активного звонка');
      return false;
    }

    if (this.isScreenSharing) {
      console.warn('startScreenShare: уже идёт показ экрана');
      return true;
    }

    try {
      // 1. Запрашиваем у пользователя разрешение на демонстрацию экрана
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });

      // 2. Берём оригинальный видеотрек камеры
      const cameraTrack = this.localStream.getVideoTracks()[0];
      const screenTrack = this.screenStream.getVideoTracks()[0];

      if (!cameraTrack || !screenTrack) {
        console.error('startScreenShare: не найдены треки');
        this.screenStream.getTracks().forEach(t => t.stop());
        this.screenStream = null;
        return false;
      }

      // 3. Заменяем трек камеры на трек экрана через simple-peer API
      // (peer.replaceTrack автоматически обновит RTCPeerConnection внутри)
      this.peer.replaceTrack(cameraTrack, screenTrack, this.screenStream);

      // 4. Обновляем флаг и уведомляем UI
      this.isScreenSharing = true;
      this.events.onScreenShareStarted?.();

      // 5. Если пользователь остановил демонстрацию через UI браузера
      // (нажал "Stop Sharing" в системном диалоге), автоматически
      // вызываем наш stopScreenShare
      screenTrack.onended = () => {
        console.log('Screen track ended by user');
        this.stopScreenShare();
      };

      console.log('Screen sharing started');
      return true;
    } catch (error) {
      // Типичная ошибка: пользователь отменил диалог выбора экрана
      if ((error as Error).name === 'NotAllowedError') {
        console.log('Пользователь отменил демонстрацию экрана');
      } else {
        console.error('startScreenShare error:', error);
        this.events.onError?.(error as Error);
      }
      // Очищаем partial state
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(t => t.stop());
        this.screenStream = null;
      }
      this.isScreenSharing = false;
      return false;
    }
  }

  /**
   * Останавливает демонстрацию экрана и возвращает камеру.
   * Безопасно вызывать, даже если screen sharing не активен.
   */
  stopScreenShare(): boolean {
    if (!this.isScreenSharing && !this.screenStream) {
      return false;
    }

    // 1. Останавливаем все треки демонстрации
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        track.onended = null; // убираем listener
        track.stop();
      });
      this.screenStream = null;
    }

    // 2. Возвращаем камеру в peer (если peer ещё жив)
    if (this.peer && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) {
        try {
          // simple-peer.replaceTrack: простая замена camera -> camera
          // (внутри simple-peer заменит активный video-трек в peer обратно на камеру)
          this.peer.replaceTrack(cameraTrack, cameraTrack, this.localStream);
        } catch (err) {
          console.warn('stopScreenShare: не удалось вернуть камеру в peer:', err);
        }
      }
    }

    this.isScreenSharing = false;
    this.events.onScreenShareStopped?.();
    console.log('Screen sharing stopped');
    return true;
  }

  /** Проверяет, активна ли демонстрация экрана */
  isScreenShareActive(): boolean {
    return this.isScreenSharing;
  }

  // Phase 8.3: геттеры для UI-компонентов (превью в CallModal)
  /** Возвращает локальный MediaStream (камера/микрофон), или null */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /** Возвращает screen MediaStream (демонстрация экрана), или null */
  getScreenStream(): MediaStream | null {
    return this.screenStream;
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