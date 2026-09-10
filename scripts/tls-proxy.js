#!/usr/bin/env node
/**
 * tls-proxy.js — лёгкий TLS-терминатор для PILIGRIM (замена nginx, когда его нет).
 *
 * Слушает HTTPS/WSS на TLS_PORT (по умолчанию 4443) с сертификатом из certs/,
 * и прозрачно пробрасывает WebSocket-апгрейды на бэкенд TARGET_HOST:TARGET_PORT
 * (по умолчанию 127.0.0.1:4000). Так приложение на планшете может использовать
 * основной путь wss://192.168.100.4:4443 (без опоры на plaintext-фолбэк).
 *
 * Запуск: node scripts/tls-proxy.js
 * env: TLS_CERT, TLS_KEY, TLS_PORT, TARGET_HOST, TARGET_PORT
 */
const fs = require('fs');
const https = require('https');
const net = require('net');
const path = require('path');

const CERT = process.env.TLS_CERT || path.join(__dirname, '..', 'certs', 'piligrim-server.crt');
const KEY = process.env.TLS_KEY || path.join(__dirname, '..', 'certs', 'piligrim-server.key');
const LISTEN_PORT = parseInt(process.env.TLS_PORT || '4443', 10);
const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '4000', 10);

if (!fs.existsSync(CERT) || !fs.existsSync(KEY)) {
  console.error(`[TLS-PROXY] Cert or key missing: ${CERT} / ${KEY}`);
  process.exit(1);
}

const options = {
  cert: fs.readFileSync(CERT),
  key: fs.readFileSync(KEY),
};

const server = https.createServer((req, res) => {
  // Прямой HTTPS здесь не нужен — только WSS-прокси.
  res.writeHead(426, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('PILIGRIM TLS terminator: используйте WSS (порт 4443) для WebSocket.');
});

server.on('upgrade', (req, clientSocket, head) => {
  const targetSocket = net.connect(TARGET_PORT, TARGET_HOST, () => {
    let reqLine = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() === 'proxy-connection') continue;
      reqLine += `${k}: ${v}\r\n`;
    }
    reqLine += '\r\n';
    targetSocket.write(reqLine);
    if (head && head.length) targetSocket.write(head);

    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    clientSocket.on('error', () => targetSocket.destroy());
    targetSocket.on('error', () => clientSocket.destroy());
  });

  targetSocket.on('error', (err) => {
    console.error('[TLS-PROXY] target connect error:', err.message);
    clientSocket.destroy();
  });
});

server.listen(LISTEN_PORT, () => {
  console.log(`[TLS-PROXY] WSS terminator слушает :${LISTEN_PORT} → ${TARGET_HOST}:${TARGET_PORT}`);
  console.log(`[TLS-PROXY] Cert: ${CERT}`);
});

server.on('error', (err) => {
  console.error('[TLS-PROXY] server error:', err.message);
});
