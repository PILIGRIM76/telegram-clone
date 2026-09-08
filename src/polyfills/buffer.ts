// Buffer polyfill для браузера (framer-motion/@emotion depend on Node.js Buffer)
// Импортируется ДО React и любых компонентов.
if (typeof window !== 'undefined' && typeof (window as any).Buffer === 'undefined') {
  const BufferPolyfill = function (this: any, data: any, encoding?: string) {
    if (typeof data === 'string') {
      const arr = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
      return arr;
    }
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return new Uint8Array(0);
  };
  BufferPolyfill.from = function (data: any, encoding?: string) {
    if (typeof data === 'string') {
      const arr = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i);
      return arr;
    }
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    return new Uint8Array(0);
  };
  BufferPolyfill.alloc = function (size: number, fill?: number) {
    const arr = new Uint8Array(size);
    if (fill !== undefined) arr.fill(fill);
    return arr;
  };
  BufferPolyfill.isBuffer = function () { return false; };
  (window as any).Buffer = BufferPolyfill;
}