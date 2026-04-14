import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import JavaScriptObfuscator from 'javascript-obfuscator';
import { VitePWA } from 'vite-plugin-pwa';



// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'C-Safe: 전동킥보드 안전 가이드',
        short_name: 'C-Safe',
        description: '천안 캠퍼스 PM 안전 주행 및 주차 가이드',
        theme_color: '#0A0E14',
        background_color: '#0A0E14',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB 제한
      }
    }),
    /*
    {
      name: 'obfuscator',
      apply: 'build',
      enforce: 'post',
      generateBundle(options, bundle) {
        for (const [fileName, chunk] of Object.entries(bundle)) {
          if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
            const obfuscationResult = JavaScriptObfuscator.obfuscate(chunk.code, {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 1,
              numbersToExpressions: true,
              simplify: true,
              stringArrayShuffle: true,
              splitStrings: true,
              stringArrayThreshold: 1,
              identifierNamesGenerator: 'hexadecimal'
            });
            chunk.code = obfuscationResult.getObfuscatedCode();
          }
        }
      }
    }
    */
  ],
  server: {
    port: 8888,
    strictPort: true,
    host: true, // 로컬 네트워크(휴대폰) 접속 허용
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
