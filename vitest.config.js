import { defineConfig } from 'vitest/config';

// 순수 함수 단위 테스트용 최소 설정.
// 앱 빌드의 PWA/obfuscator/terser 플러그인은 테스트에 불필요하므로
// vite.config.js를 상속하지 않고 별도 config로 둔다. DOM 비의존이라 node 환경.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
});
