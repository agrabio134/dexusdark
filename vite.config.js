// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'util': 'util',
    },
  },
  define: {
    'process.env.NODE_DEBUG': JSON.stringify(''),
    'process.env': { NODE_ENV: JSON.stringify('production') },
    'util.debuglog': '(() => {})',
    'util.inspect': '(() => {})',
  },
  build: {
    rollupOptions: {
      external: [
        '@walletconnect/utils',
        '@reown/appkit',
        '@reown/appkit-controllers',
        '@solana/spl-type-length-value',
      ],
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' || warning.message.includes('/*#__PURE__*/')) {
          return;
        }
        warn(warning);
      },
    },
  },
});