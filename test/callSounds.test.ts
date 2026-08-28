import { playRingtone, stopRingtone, playConnectSound, playEndCallSound } from '../src/utils/callSounds';

// 1. Создаем стабильные объекты моков ОДИН раз
const mockOscillator = {
  type: '',
  frequency: { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

const mockGain = {
  gain: { value: 0, setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
  connect: jest.fn(),
};

const mockAudioContext = {
  currentTime: 0,
  destination: {},
  createOscillator: jest.fn(() => mockOscillator),
  createGain: jest.fn(() => mockGain),
};

// 2. Глобально подменяем AudioContext в window (для jsdom)
beforeAll(() => {
  (window as any).AudioContext = jest.fn(() => mockAudioContext);
  (window as any).webkitAudioContext = jest.fn(() => mockAudioContext);
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Очищаем интервал, если он остался от предыдущего теста
  if ((window as any).__ringtoneInterval) {
    clearInterval((window as any).__ringtoneInterval);
    (window as any).__ringtoneInterval = null;
  }
});

afterEach(() => {
  jest.useRealTimers();
  if ((window as any).__ringtoneInterval) {
    clearInterval((window as any).__ringtoneInterval);
    (window as any).__ringtoneInterval = null;
  }
});

describe('playRingtone', () => {
  test('должен создавать AudioContext при первом вызове', () => {
    playRingtone();
    expect(window.AudioContext).toHaveBeenCalled();
  });

  test('должен создавать осцилляторы', () => {
    playRingtone();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  test('должен устанавливать частоту 440 Hz', () => {
    playRingtone();
    expect(mockOscillator.frequency.value).toBe(440);
  });

  test('должен создавать интервал для повторения', () => {
    playRingtone();
    expect((window as any).__ringtoneInterval).toBeDefined();
  });

  test('должен устанавливать gain для звука', () => {
    playRingtone();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });
});

describe('stopRingtone', () => {
  test('должен очищать интервал рингтона', () => {
    playRingtone();
    expect((window as any).__ringtoneInterval).toBeDefined();
    
    stopRingtone();
    expect((window as any).__ringtoneInterval).toBeNull();
  });

  test('не должен падать, если интервал не создан', () => {
    expect(() => stopRingtone()).not.toThrow();
  });
});

describe('playConnectSound', () => {
  test('должен создавать короткий звук с частотой 800 Hz', () => {
    playConnectSound();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.frequency.value).toBe(800);
  });

  test('должен подключать осциллятор к gain и destination', () => {
    playConnectSound();
    expect(mockOscillator.connect).toHaveBeenCalled();
    expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  test('должен запускать и останавливать осциллятор', () => {
    playConnectSound();
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });
});

describe('playEndCallSound', () => {
  test('должен создавать понижающийся тон', () => {
    playEndCallSound();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(600, expect.any(Number));
    expect(mockOscillator.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(200, expect.any(Number));
  });

  test('должен запускать и останавливать осциллятор', () => {
    playEndCallSound();
    expect(mockOscillator.start).toHaveBeenCalled();
    expect(mockOscillator.stop).toHaveBeenCalled();
  });
});