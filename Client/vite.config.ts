
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Внимание: Если вы меняете IP в apiService.ts, поменяйте его и здесь,
    // либо полностью полагайтесь на абсолютный путь в apiService.ts (что мы и сделали).
    proxy: {
      '/api': {
        target: 'http://192.168.1.XX:8080', // ЗАМЕНИТЕ НА IP СЕРВЕРА
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
