#!/usr/bin/env python3
"""Add BufferPolyfillPlugin to vite.config.ts."""
import io

path = 'F:/AntiPiry/vite.config.ts'
with io.open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { defineConfig, loadEnv } from 'vite';"
new_import = "import { defineConfig, loadEnv, type Plugin } from 'vite';"
content = content.replace(old_import, new_import)

# 2. Insert plugin function before export default
plugin_code = '''
/**
 * BufferPolyfillPlugin: injects inline Buffer polyfill into index.html BEFORE bundle loads.
 * Fixes ReferenceError: Buffer is not defined on Android WebView (RT9).
 * Vite hoisting may reorder imports, so polyfill must be inline-<script>.
 */
function bufferPolyfillPlugin(): Plugin {
  const polyfill = `
<script>
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
  }
</script>`;

  return {
    name: 'buffer-polyfill-plugin',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace('<head>', '<head>' + polyfill);
    },
  };
}

'''

# Insert before "export default defineConfig"
marker = "export default defineConfig"
if marker in content and "bufferPolyfillPlugin" not in content:
    content = content.replace(marker, plugin_code + marker, 1)

# 3. Add plugin to plugins array
old_plugins = "      plugins: [react()],"
new_plugins = "      plugins: [react(), bufferPolyfillPlugin()],"
content = content.replace(old_plugins, new_plugins)

with io.open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("OK: vite.config.ts updated")
print("has Plugin type:", "type Plugin" in content)
print("has bufferPolyfillPlugin:", "bufferPolyfillPlugin" in content)
print("has transformIndexHtml:", "transformIndexHtml" in content)
print("plugins array:", "plugins: [react(), bufferPolyfillPlugin()]" in content)