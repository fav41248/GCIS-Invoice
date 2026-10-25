import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { VitePWA } from 'vite-plugin-pwa';

const VALID_SUPABASE_URL = 'https://oztkjwtocktrnkfdfrhk.supabase.co';
const VALID_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dGtqd3RvY2t0cm5rZmRmcmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjUyODAsImV4cCI6MjEwODUwMTI4MH0.LJK89RWpzrc4B1gykEftp2gdJ0ztAvH8me3bBFYjz6s';

if (!process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('oztkjwtocktrnkfdfrhk')) {
  process.env.VITE_SUPABASE_URL = VALID_SUPABASE_URL;
  if (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY.includes('infbltkzxzcyhwhjdupk')) {
    process.env.VITE_SUPABASE_ANON_KEY = VALID_SUPABASE_ANON_KEY;
  }
}

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || VALID_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || VALID_SUPABASE_ANON_KEY),
    },
    plugins: [
      react(), 
      tailwindcss(),
      cssInjectedByJsPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'Green Collar Invoice',
          short_name: 'GCI',
          description: 'Invoice and Price List Management for Green Collar.',
          theme_color: '#198754',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 3500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('jspdf') || id.includes('html2') || id.includes('purify')) return 'pdf-vendor';
              if (id.includes('recharts')) return 'charts';
              return 'vendor';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
