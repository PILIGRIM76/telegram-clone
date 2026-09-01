// Phase 9.5 stub: simple-peer заменён на пустой класс.
// Реальный WebRTC будет добавлен в Phase 10 (с использованием нативного RTCPeerConnection).
// Это позволяет bundle собраться для Capacitor WebView без Node.js deps.

class PeerStub {
  constructor() {
    console.warn('[PILIGRIM] simple-peer stub: WebRTC calls are not yet implemented in this build');
  }
  on() { return this; }
  once() { return this; }
  emit() { return this; }
  signal() { return this; }
  send() { return false; }
  destroy() {}
}

export default PeerStub;
