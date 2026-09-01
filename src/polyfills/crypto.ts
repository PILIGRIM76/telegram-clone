// Полифилл для crypto.randomUUID() в Android WebView (HTTP, не Secure Context)
if (typeof window !== 'undefined' && window.crypto && !window.crypto.randomUUID) {
  console.log('[PILIGRIM] crypto.randomUUID not available, using polyfill');
  (window.crypto as any).randomUUID = function(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}