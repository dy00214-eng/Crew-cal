import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 정적 호스팅 어디에 올려도 되도록 상대 경로 base + HashRouter 를 쓴다.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '임장 노트',
        short_name: '임장노트',
        description: '오프라인에서 동작하는 부동산 임장 기록장',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FAF9F6',
        theme_color: '#FAF9F6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // 네이버 부동산에서 "공유 → 임장 노트" 로 매물 URL 을 받는다.
        share_target: {
          action: './share',
          method: 'GET',
          params: { url: 'url', title: 'title', text: 'text' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // 앱 셸만 프리캐시한다. 데이터는 전부 IndexedDB 라 런타임 캐시가 필요 없다.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
});
