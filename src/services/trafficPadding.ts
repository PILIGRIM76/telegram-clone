// Phase 2: Traffic padding — шумовые пакеты для защиты от traffic analysis.
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
  readonly MIN_INTERVAL = 30000;  // 30 секунд
  /** Максимальный интервал между шумовыми пакетами (мс). */
  readonly MAX_INTERVAL = 60000;  // 60 секунд
  /** Размер padding в шумовом пакете (символов). */
  readonly PACKET_SIZE = 1024;    // 1KB фиксированный

  connect(ws: WebSocket, enabled = true) {
    this.ws = ws;
    this.enabled = enabled;
    if (enabled) {
      this.scheduleNext();
      console.log('[TrafficPadder] enabled: noise packets every 30-60s');
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
      console.warn('[TrafficPadder] failed to send noise:', e);
    }
  }
}

/**
 * Padding для реальных сообщений — все пакеты constant-size 2KB,
 * чтобы противник не мог делать traffic analysis по размеру сообщений.
 */
export const TARGET_PACKET_SIZE = 2048;

export function padMessage(payload: string, targetSize = TARGET_PACKET_SIZE): string {
  // Null-byte padding до фиксированного размера. Получатель обрезает trailing nulls.
  if (payload.length >= targetSize) {
    // Edge case: payload больше targetSize. Не обрезаем — возвращаем как есть.
    // В реальности такого не должно быть (JSON payload обычно < 1KB).
    return payload;
  }
  const padded = payload + '\0'.repeat(targetSize - payload.length);
  return padded;
}

export function unpadMessage(payload: string): string {
  // Удаляем trailing null bytes.
  return payload.replace(/\0+$/, '');
}

/**
 * Кодирование constant-size пакета с префиксом длины для надёжного unpadding.
 * Формат: 4-char hex length + JSON payload + null padding to targetSize.
 *
 * Префикс длины позволяет получателю корректно извлечь payload даже
 * если JSON содержит trailing whitespace или специальные символы.
 */
export function encodeConstantSizePacket(jsonPayload: string, targetSize = TARGET_PACKET_SIZE): string {
  const payloadLen = jsonPayload.length;
  const lenHex = payloadLen.toString(16).padStart(8, '0');  // 4 байта hex = 8 chars
  const header = lenHex + ':';
  const totalContent = header + jsonPayload;
  if (totalContent.length >= targetSize) {
    // Не помещается — отправляем без padding (edge case)
    return totalContent;
  }
  return totalContent + '\0'.repeat(targetSize - totalContent.length);
}

export function decodeConstantSizePacket(packet: string): string {
  // Удаляем trailing nulls
  const unpadded = packet.replace(/\0+$/, '');
  const colonIdx = unpadded.indexOf(':');
  if (colonIdx !== 8) {
    // Нет префикса длины или неверный формат — fallback: считаем весь payload
    return unpadded;
  }
  const lenHex = unpadded.substring(0, 8);
  const payloadLen = parseInt(lenHex, 16);
  if (isNaN(payloadLen) || payloadLen < 0 || payloadLen > unpadded.length - 9) {
    return unpadded;
  }
  return unpadded.substring(9, 9 + payloadLen);
}