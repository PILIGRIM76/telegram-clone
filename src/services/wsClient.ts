// src/services/wsClient.ts
// WebSocket client with JWT authentication
// Handles token refresh on 1008 (Unauthorized) and auto-reconnect

import { authClient } from './authClient';

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;
let currentOnMessage: (data: any) => void = () => {};

export function connectWebSocket(onMessage: (data: any) => void): void {
  // Clear any pending reconnect
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  currentOnMessage = onMessage;

  const token = authClient.getAccessToken();
  if (!token) {
    console.error('[WS] No access token - redirect to login');
    window.location.href = '/login';
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;
  const wsUrl = `${protocol}://${host}/ws?token=${token}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[WS] Connected');
    reconnectAttempts = 0;
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('[WS] Parse error:', e);
    }
  };

  ws.onclose = (event) => {
    console.log('[WS] Closed:', event.code);
    if (event.code === 1008) {
      // Unauthorized - try token refresh
      authClient.refresh()
        .then(() => {
          reconnectAttempts = 0;
          connectWebSocket(currentOnMessage);
        })
        .catch(() => {
          authClient.clearTokens();
          window.location.href = '/login';
        });
    } else if (reconnectAttempts < MAX_RECONNECT) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      console.log('[WS] Reconnecting in', delay, 'ms (attempt', reconnectAttempts, ')');
      reconnectTimeout = setTimeout(() => connectWebSocket(currentOnMessage), delay);
    } else {
      console.error('[WS] Max reconnect attempts reached');
    }
  };

  ws.onerror = (err) => {
    console.error('[WS] Error:', err);
  };
}

export function disconnectWebSocket(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function sendWebSocketMessage(type: string, payload: any): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  } else {
    console.error('[WS] Not connected');
  }
}
