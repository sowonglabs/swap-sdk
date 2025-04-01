import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@wongcoin/swap-sdk': path.resolve(__dirname, '../../dist'),
    },
  },
  optimizeDeps: {
    include: ['@wongcoin/swap-sdk']
  }
}); 