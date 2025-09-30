// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'buffer': 'buffer/',
      'util': 'util', // Polyfill Node.js util module
    },
  },
  define: {
    'process.env.NODE_DEBUG': JSON.stringify(''),
    'process.env': { NODE_ENV: JSON.stringify('production') }, // Ensure production mode for lit
  },
  build: {
    rollupOptions: {
      external: [
        '@walletconnect/utils',
        '@reown/appkit',
        '@reown/appkit-controllers',
        '@solana/spl-type-length-value', // Externalize to avoid crypto issues
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