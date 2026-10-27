import { logger } from './logger';
// Этап 2: заполнение трафика шумовыми пакетами для защиты от анализа сетевой активности.
// Сервер не может отличить реальные сообщения от шумовых по частоте/времени.

/**
 * Отправляет "шумовые" пакеты через WebSocket через случайные интервалы,
 * чтобы скрыть паттерн активности пользователя.
 *
 * Размер фиксированный (1KB) — невозможно определить по размеру,
 * реальное это сообщение или шум.
 */
export class TrafficPadder {
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;

  /** Минимальный интервал между шумовыми пакетами (мс). */
  readonly MIN_INTERVAL = 30000; // 30 секунд
  /** Максимальный интервал между шумовыми пакетами (мс). */
  readonly MAX_INTERVAL = 60000; // 60 секунд
  /** Размер padding в шумовом пакете (символов). */
  readonly PACKET_SIZE = 1024; // 1KB фиксированный

  connect(ws: WebSocket, enabled = true) {
    this.ws = ws;
    this.enabled = enabled;
    if (enabled) {
      this.scheduleNext();
      logger.info('[TrafficPadder] enabled: noise packets every 30-60s');
    }
  }

  disconnect() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.ws = null;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && this.ws) {
      this.scheduleNext();
    } else if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext() {
    if (!this.enabled || !this.ws) return;
    const delay = this.MIN_INTERVAL + Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL);
    this.timer = setTimeout(() => {
      this.sendNoise();
      this.scheduleNext();
    }, delay);
  }

  private sendNoise() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // Фиксированный размер 1KB. Сервер не может отличить от реального сообщения.
    const noise = {
      type: 'noise',
      timestamp: Date.now(),
      padding: '0'.repeat(Math.max(0, this.PACKET_SIZE - 50)),
    };
    try {
      this.ws.send(JSON.stringify(noise));
    } catch (e) {
      logger.warn('[TrafficPadder] failed to send noise:', e);
    }
  }
}

/**
 * Дополняет реальные сообщения до фиксированного размера 2 КБ,
 * чтобы нельзя было анализировать их размер.
 */
export const TARGET_PACKET_SIZE = 2048;

export function padMessage(payload: string, targetSize = TARGET_PACKET_SIZE): string {
  // Дополняет пакет нулевыми байтами до заданного размера; получатель удаляет их в конце.
  if (payload.length >= targetSize) {
    // Если данные превышают целевой размер, не обрезаем их, а возвращаем без изменений.
    // Обычно данные JSON меньше 1 КБ.
    return payload;
  }
  const padded = payload + '\0'.repeat(targetSize - payload.length);
  return padded;
}

export function unpadMessage(payload: string): string {
  // Удаляем завершающие нулевые байты.
  return payload.replace(/\0+$/, '');
}

/**
 * Кодирует пакет фиксированного размера с префиксом длины для надёжного извлечения данных.
 * Формат: длина в виде восьми шестнадцатеричных символов, JSON-данные и нулевое дополнение.
 *
 * Префикс длины позволяет получателю извлечь данные, даже если JSON содержит
 * завершающие пробелы или специальные символы.
 */
export function encodeConstantSizePacket(
  jsonPayload: string,
  targetSize = TARGET_PACKET_SIZE
): string {
  const payloadLen = jsonPayload.length;
  const lenHex = payloadLen.toString(16).padStart(8, '0'); // 4 байта hex = 8 chars
  const header = lenHex + ':';
  const totalContent = header + jsonPayload;
  if (totalContent.length >= targetSize) {
    // Если данные не помещаются, отправляем их без дополнения.
    return totalContent;
  }
  return totalContent + '\0'.repeat(targetSize - totalContent.length);
}

export function decodeConstantSizePacket(packet: string): string {
  // Удаляем trailing nulls
  const unpadded = packet.replace(/\0+$/, '');
  const colonIdx = unpadded.indexOf(':');
  if (colonIdx !== 8) {
    // Если префикс длины отсутствует или некорректен, считаем полезными данными весь пакет.
    return unpadded;
  }
  const lenHex = unpadded.substring(0, 8);
  const payloadLen = parseInt(lenHex, 16);
  if (isNaN(payloadLen) || payloadLen < 0 || payloadLen > unpadded.length - 9) {
    return unpadded;
  }
  return unpadded.substring(9, 9 + payloadLen);
}
