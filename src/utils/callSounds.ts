// Генерация звуков звонка через Web Audio API (без внешних файлов)

let audioContext: AudioContext | null = null;
let currentOscillator: OscillatorNode | null = null;
let currentGain: GainNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

// Мелодия входящего звонка (двойной гудок)
export function playRingtone(): void {
  const ctx = getAudioContext();
  
  const playBeep = (startTime: number, frequency: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
    
    return osc;
  };

  const now = ctx.currentTime;
  playBeep(now, 440, 0.4);        // Первая нота
  playBeep(now + 0.5, 440, 0.4);  // Пауза + вторая нота
  playBeep(now + 1.5, 440, 0.4);  // Пауза + третья нота
  
  // Повторяем каждые 2 секунды
  (window as any).__ringtoneInterval = setInterval(() => {
    const t = ctx.currentTime;
    playBeep(t, 440, 0.4);
    playBeep(t + 0.5, 440, 0.4);
    playBeep(t + 1.5, 440, 0.4);
  }, 3000);
}

export function stopRingtone(): void {
  if ((window as any).__ringtoneInterval) {
    clearInterval((window as any).__ringtoneInterval);
    (window as any).__ringtoneInterval = null;
  }
}

// Звук начала разговора (короткий "бип")
export function playConnectSound(): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.value = 800;
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}

// Звук завершения звонка (понижающийся тон)
export function playEndCallSound(): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}