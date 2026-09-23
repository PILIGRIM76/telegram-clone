import { VoiceMessageMetadata, DecryptedVoiceMessage } from '../types';
import { encryptFile, decryptFile } from './cryptoService';

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;
  private onLevelUpdate: ((level: number) => void) | null = null;
  private maxDuration: number = 300; // 5 minutes in seconds
  private durationTimerId: number | null = null;

  // Start recording
  async startRecording(onLevelUpdate?: (level: number) => void): Promise<void> {
    this.onLevelUpdate = onLevelUpdate || null;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Determine supported MIME type
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Set up audio visualization
      this.setupAudioVisualization();

      this.mediaRecorder.start(100); // Collect data every 100ms for smoother visualization

      // Start duration timer
      this.startDurationTimer();
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Stop recording and return audio blob
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        reject(new Error('Recording not started'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        this.stopDurationTimer();
        this.cleanup();
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  // Cancel recording
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.stopDurationTimer();
    this.cleanup();
  }

  // Encrypt voice message
  async encryptVoiceMessage(
    audioBlob: Blob,
    privateKeyHex: string
  ): Promise<{ encryptedBlob: Blob; metadata: VoiceMessageMetadata }> {
    const duration = await this.getAudioDuration(audioBlob);
    
    // Convert Blob to File for encryptFile
    const audioFile = new File([audioBlob], 'voice_message.webm', { 
      type: audioBlob.type || 'audio/webm',
      lastModified: Date.now()
    });
    
    const encryptedData = await encryptFile(audioFile, privateKeyHex);
    
    // Create encrypted blob from the encrypted data
    const encryptedBlob = new Blob(
      [JSON.stringify({
        ciphertext: encryptedData.ciphertext,
        iv: encryptedData.iv,
        key: encryptedData.key,
        name: encryptedData.name,
        type: encryptedData.type,
        size: encryptedData.size
      })],
      { type: 'application/json' }
    );
    
    return {
      encryptedBlob,
      metadata: {
        duration,
        mimeType: audioBlob.type || 'audio/webm',
        size: audioBlob.size,
      },
    };
  }

  // Decrypt voice message for playback
  async decryptVoiceMessage(
    encryptedBlob: Blob,
    privateKeyHex: string,
    metadata: VoiceMessageMetadata
  ): Promise<DecryptedVoiceMessage> {
    // Parse the encrypted data
    const text = await encryptedBlob.text();
    const encryptedData = JSON.parse(text);
    
    const decryptedBlob = await decryptFile(
      encryptedData.ciphertext,
      encryptedData.iv,
      encryptedData.key,
      privateKeyHex,
      encryptedData.type,
      encryptedData.size
    );
    
    const url = URL.createObjectURL(decryptedBlob);
    
    return {
      blob: decryptedBlob,
      url,
      duration: metadata.duration,
    };
  }

  // Get current audio level (0-1) for visualization
  getAudioLevel(): number {
    if (!this.analyser || !this.dataArray) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    
    // Calculate average level
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / this.dataArray.length;
    
    // Normalize to 0-1 range
    return Math.min(average / 128, 1);
  }

  // Set maximum recording duration
  setMaxDuration(seconds: number): void {
    this.maxDuration = seconds;
  }

  // Check if currently recording
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  // Get current recording state
  getState(): 'idle' | 'recording' | 'paused' | 'inactive' {
    if (!this.mediaRecorder) return 'idle';
    return this.mediaRecorder.state as 'idle' | 'recording' | 'paused' | 'inactive';
  }

  // Private: Set up audio visualization
  private setupAudioVisualization(): void {
    if (!this.stream) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    
    const source = this.audioContext.createMediaStreamSource(this.stream);
    source.connect(this.analyser);
    
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    // Start visualization loop
    this.visualize();
  }

  // Private: Visualization loop
  private visualize(): void {
    if (!this.analyser || !this.dataArray || !this.onLevelUpdate) {
      this.animationFrameId = null;
      return;
    }
    
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    
    const sum = this.dataArray.reduce((acc, val) => acc + val, 0);
    const average = sum / this.dataArray.length;
    const level = Math.min(average / 128, 1);
    
    this.onLevelUpdate(level);
    
    this.animationFrameId = requestAnimationFrame(() => this.visualize());
  }

  // Private: Start duration timer
  private startDurationTimer(): void {
    this.durationTimerId = window.setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
    }, this.maxDuration * 1000);
  }

  // Private: Stop duration timer
  private stopDurationTimer(): void {
    if (this.durationTimerId) {
      clearTimeout(this.durationTimerId);
      this.durationTimerId = null;
    }
  }

  // Private: Get supported MIME type
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  // Private: Get audio duration
  private getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(blob);
      
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(url);
      };
      
      audio.src = url;
    });
  }

  // Private: Clean up resources
  private cleanup(): void {
    // Stop visualization
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.onLevelUpdate = null;
    
    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

export const voiceService = new VoiceService();