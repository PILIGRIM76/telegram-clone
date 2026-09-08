#!/usr/bin/env python3
"""Inject Buffer polyfill into public/index.html before bundle loads."""
import io

path = 'F:/AntiPiry/public/index.html'
with io.open(path, 'r', encoding='utf-8') as f:
    content = f.read()

marker = """      window.global = window.global || window;
      if (typeof window.require !== 'function') {
        window.require = function (name) {
          console.warn('[PILIGRIM] require("' + name + '") called in browser \u2014 returning empty stub');
          return {};
        };
      }"""

inject = """
      // CRITICAL: Buffer polyfill BEFORE bundle loads (RT9 white screen fix)
      // Vite hoisting may reorder imports, so polyfill must be inline.
      if (typeof window.Buffer === 'undefined') {
        console.log('[PILIGRIM] Installing inline Buffer polyfill');
        window.Buffer = function(data, encoding) {
          if (typeof data === 'string') {
            const arr = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i) & 0xff;
            return arr;
          }
          if (data instanceof ArrayBuffer) return new Uint8Array(data);
          if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          return new Uint8Array(0);
        };
        window.Buffer.from = function(data, encoding) {
          if (typeof data === 'string') {
            const arr = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) arr[i] = data.charCodeAt(i) & 0xff;
            return arr;
          }
          if (data instanceof ArrayBuffer) return new Uint8Array(data);
          if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
          return new Uint8Array(0);
        };
        window.Buffer.alloc = function(size, fill) {
          const arr = new Uint8Array(size);
          if (fill !== undefined) arr.fill(fill);
          return arr;
        };
        window.Buffer.isBuffer = function() { return false; };
        window.Buffer.isView = ArrayBuffer.isView;
        window.Buffer.byteLength = function(str) {
          if (typeof str === 'string') return str.length;
          if (str instanceof ArrayBuffer) return str.byteLength;
          if (ArrayBuffer.isView(str)) return str.byteLength;
          return 0;
        };
        window.Buffer.concat = function(list, totalLength) {
          if (!list.length) return new Uint8Array(0);
          const len = totalLength || list.reduce((s, b) => s + b.length, 0);
          const result = new Uint8Array(len);
          let pos = 0;
          for (const b of list) { result.set(b, pos); pos += b.length; }
          return result;
        };
        window.Buffer.prototype = Uint8Array.prototype;
      }"""

if marker in content:
    content = content.replace(marker, marker + inject)
    with io.open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: injected Buffer polyfill')
else:
    print('ERROR: marker not found')
    # find the require stub block
    idx = content.find('window.require = function')
    if idx > 0:
        print('Found window.require at index', idx)
        print(repr(content[idx-100:idx+200]))
    else:
        print('window.require not found at all')