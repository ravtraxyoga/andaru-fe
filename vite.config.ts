import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

// IP asli diteruskan lewat X-Real-IP (ditimpa di sini, jadi tidak bisa dipalsukan klien),
// supaya rate limit backend tetap per pengguna.
const apiProxy: Record<string, ProxyOptions> = {
  '/v1': {
    target: process.env.API_TARGET ?? 'http://127.0.0.1:9125',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (req, inc) => req.setHeader('x-real-ip', inc.socket.remoteAddress ?? ''));
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 9126, proxy: apiProxy },
  preview: { port: 9126, proxy: apiProxy },
});
