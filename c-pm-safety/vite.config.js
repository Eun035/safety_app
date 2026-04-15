import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// Vercel 배포 최적화 설정
// - basicSsl 제거 (Vercel은 HTTPS 기본 제공)
// - base: '/' 로 변경 (SPA rewrites와 호환)
// - 로컬 PWA 아이콘 사용 (외부 CDN 의존성 제거)
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'icon.svg'],
      manifest: {
        name: 'C-Safe: 전동킥보드 안전 가이드',
        short_name: 'C-Safe',
        description: '천안 캠퍼스 PM 안전 주행 및 주차 가이드',
        theme_color: '#0a0f1e',
        background_color: '#0a0f1e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 30 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 8888,
    strictPort: true,
    host: true,
  },
  build: {
    outDir: 'dist_v2',
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    }
  }
})
